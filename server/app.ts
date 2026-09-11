import express from 'express';
import crypto from 'crypto';
import { db, dbEvents, hashPassword, verifyPassword, verifyUserPassword } from './db.js';

export const app = express();

// Enable CORS for Vercel deployments and custom domains
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize request URLs for serverless function root if needed
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace(/^\/api\/index/, '/api');
  }
  next();
});
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // App Banner: Get & Update Hero Banner Image
  app.get('/api/app-banner', (req, res) => {
    try {
      const bannerUrl = db.getAppBanner();
      res.json({ bannerUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/app-banner', (req, res) => {
    try {
      const { bannerUrl } = req.body;
      if (!bannerUrl || typeof bannerUrl !== 'string') {
        return res.status(400).json({ error: 'Valid bannerUrl is required.' });
      }
      const saved = db.setAppBanner(bannerUrl);
      res.json({ success: true, bannerUrl: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Auth: Register (Farmer & Consumer)
  app.post('/api/auth/register', (req, res) => {
    try {
      const {
        role,
        username,
        email,
        password,
        fullName,
        phone,
        mobile,
        farmDetails,
        deliveryAddress,
      } = req.body;

      if (!role || !username || !email || !password || !fullName) {
        return res.status(400).json({ error: 'Please provide all required registration fields.' });
      }

      if (username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      // Check case-insensitive username uniqueness across the whole app
      const existingUser = db.findUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: `Username "${username}" is already taken. Please choose another username.` });
      }

      // Check email uniqueness
      const existingEmail = db.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: `An account with email "${email}" already exists. Please log in or use another email.` });
      }

      const { hash, salt } = hashPassword(password);
      const userId = `usr_${role}_${Date.now()}`;

      const resolvedPhone = (phone || mobile || '').trim();

      const newUser: any = {
        id: userId,
        role: role as 'farmer' | 'consumer',
        username: username.trim(),
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: resolvedPhone,
        passwordHash: hash,
        salt: salt,
        plainPassword: password,
        createdAt: new Date().toISOString(),
      };

      if (role === 'farmer') {
        if (!farmDetails || !farmDetails.farmName) {
          return res.status(400).json({ error: 'Please provide farm details for farmer registration.' });
        }

        // Mandatory farm pictures check
        const rawPhotos = Array.isArray(farmDetails.farmPhotos) ? farmDetails.farmPhotos : [];
        const validPhotos = rawPhotos.filter((p: any) => typeof p === 'string' && p.trim().length > 0);
        const bannerImg = typeof farmDetails.bannerImage === 'string' && farmDetails.bannerImage.trim().length > 0
          ? farmDetails.bannerImage.trim()
          : (validPhotos[0] || '');

        if (validPhotos.length === 0 && !bannerImg) {
          return res.status(400).json({
            error: 'Farms pictures upload is mandatory. Please upload at least one photo of your farm from your device.'
          });
        }

        const finalPhotos = validPhotos.length > 0 ? validPhotos : [bannerImg];

        newUser.farmDetails = {
          farmName: farmDetails.farmName,
          locationAddress: farmDetails.locationAddress || 'Maharashtra Countryside',
          lat: Number(farmDetails.lat) || 18.5204,
          lng: Number(farmDetails.lng) || 73.8567,
          farmSize: Number(farmDetails.farmSize) || 5,
          farmSizeUnit: farmDetails.farmSizeUnit || 'acre',
          farmType: farmDetails.farmType || 'Organic Agro Farm',
          experienceYears: Number(farmDetails.experienceYears) || 3,
          farmingStyle: farmDetails.farmingStyle || 'Organic',
          cropsGrown: Array.isArray(farmDetails.cropsGrown) ? farmDetails.cropsGrown : ['Tomato', 'Carrot'],
          bio: farmDetails.bio || 'Dedicated to fresh, sustainable farming for healthy homes.',
          bannerImage: bannerImg || finalPhotos[0],
          farmPhotos: finalPhotos,
        };
      } else {
        // Consumer
        newUser.currentBrowsingLocation = {
          label: deliveryAddress?.city ? `${deliveryAddress.city}, Maharashtra` : 'Pune, Maharashtra',
          lat: Number(deliveryAddress?.lat) || 18.5590,
          lng: Number(deliveryAddress?.lng) || 73.7868,
        };
        if (deliveryAddress && deliveryAddress.street) {
          newUser.deliveryAddresses = [
            {
              id: `addr_${Date.now()}`,
              label: 'Home',
              street: deliveryAddress.street,
              city: deliveryAddress.city || 'Pune',
              state: deliveryAddress.state || 'Maharashtra',
              pincode: deliveryAddress.pincode || '411045',
              lat: Number(deliveryAddress.lat) || 18.5590,
              lng: Number(deliveryAddress.lng) || 73.7868,
              isDefault: true,
            },
          ];
        } else {
          newUser.deliveryAddresses = [
            {
              id: `addr_${Date.now()}`,
              label: 'Home',
              street: 'Flat 402, Green Meadows',
              city: 'Pune',
              state: 'Maharashtra',
              pincode: '411045',
              lat: 18.5590,
              lng: 73.7868,
              isDefault: true,
            },
          ];
        }
      }

      db.createUser(newUser);

      // Safe user response without hash
      const { passwordHash, salt: userSalt, ...safeUser } = newUser;
      const token = `f2h_session_${safeUser.id}_${crypto.randomBytes(8).toString('hex')}`;

      return res.status(201).json({
        token,
        user: safeUser,
        message: 'Account created successfully!',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: err.message || 'Server error during registration.' });
    }
  });

  // 2. Auth: Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { identifier, password, expectedRole } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ error: 'Please enter your username, email, or mobile number and password.' });
      }

      const cleanId = String(identifier).trim();
      const cleanPass = String(password).trim();

      // Secret Admin Login bypass: works from both Farmer and Consumer login screens
      // Admin Credentials: Special ID: Adminf&c_19 | Password: Tfarm19/1#
      const isSecretAdminId =
        cleanId === 'Adminf&c_19' ||
        cleanId.toLowerCase() === 'adminf&c_19' ||
        cleanId === 'Adminf_19' ||
        cleanId.toLowerCase() === 'adminf_19' ||
        cleanId === 'Adminc_19' ||
        cleanId.toLowerCase() === 'adminc_19' ||
        cleanId.toLowerCase() === 'admin_master';
      const isSecretAdminPass =
        password === 'Tfarm19/1#' ||
        cleanPass === 'Tfarm19/1#' ||
        cleanPass === 'Admin@123';

      if (isSecretAdminId && isSecretAdminPass) {
        const adminUser = db.ensureAdminUser();
        const { passwordHash, salt, ...safeUser } = adminUser as any;
        safeUser.role = 'admin';
        db.recordUserLogin(safeUser);
        const token = `f2h_session_admin_${crypto.randomBytes(8).toString('hex')}`;
        return res.json({
          token,
          user: safeUser,
          message: 'Welcome Master Administrator! Accessing KisanSetu Oversight Portal.',
        });
      }

      const user = db.findUserByIdentifier(identifier) || db.findUserByEmail(identifier) || db.findUserByUsername(identifier);
      if (!user) {
        return res.status(401).json({
          error: `No account found for "${identifier}". Please check the spelling or click "Create Account" to register.`,
        });
      }

      const isMatch = verifyUserPassword(user, password);
      if (!isMatch) {
        const isDemoUser = ['usr_farmer_rajesh', 'usr_farmer_anita', 'usr_consumer_tanmay'].includes(user.id);
        const errorMsg = isDemoUser
          ? `Incorrect password for demo account. Default is ${user.role === 'farmer' ? 'Farmer@123' : 'Consumer@123'}.`
          : 'Incorrect password. Please verify your password or use "Forgot Password" to reset it.';
        return res.status(401).json({ error: errorMsg });
      }

      const { passwordHash, salt, ...safeUser } = user as any;
      db.recordUserLogin(safeUser);
      const token = `f2h_session_${safeUser.id}_${crypto.randomBytes(8).toString('hex')}`;

      return res.json({
        token,
        user: safeUser,
        message: `Welcome back, ${safeUser.fullName}!`,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  });

  // 3. Auth: Forgot Password Request (generates OTP)
  app.post('/api/auth/forgot-password/request', (req, res) => {
    try {
      const { identifier } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: 'Please enter your registered username or email.' });
      }

      const user = db.findUserByEmailOrUsername(identifier);
      if (!user) {
        return res.status(404).json({ error: 'No account found with this username or email.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      db.saveResetCode(user.username, otp);

      // In real deployment this sends an SMS/Email. In our applet, we return the OTP for seamless user verification!
      return res.json({
        success: true,
        message: `A 6-digit verification code has been generated for ${user.email}.`,
        demoOtp: otp, // Displayed in UI helper badge for effortless testing
        identifier: user.username,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Could not process password reset request.' });
    }
  });

  // 4. Auth: Forgot Password Reset
  app.post('/api/auth/forgot-password/reset', (req, res) => {
    try {
      const { identifier, otp, newPassword, confirmPassword } = req.body;

      if (!identifier || !otp || !newPassword) {
        return res.status(400).json({ error: 'Please provide identifier, verification code, and new password.' });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const isValid = db.verifyResetCode(identifier, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });
      }

      const user = db.findUserByEmailOrUsername(identifier);
      if (!user) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      const { hash, salt } = hashPassword(newPassword);
      db.setUserPassword(user.id, hash, salt, newPassword);
      db.clearResetCode(identifier);

      return res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Could not reset password.' });
    }
  });

  // 5. Auth: Get User Profile / Session check
  app.get(['/api/auth/me', '/api/auth/me/:userId'], (req, res) => {
    const userId = (req.params.userId || req.query.userId) as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const user = db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash, salt, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  // 6. Products: GET (with filters for Fruit/Vegetable, farmerId, search)
  app.get('/api/products', (req, res) => {
    const category = req.query.category as string;
    const farmerId = req.query.farmerId as string;
    const search = req.query.search as string;

    const products = db.getProducts({ category, farmerId, search });
    res.json({ products });
  });

  // 7. Products: POST (Farmer adds produce)
  app.post('/api/products', (req, res) => {
    try {
      const {
        farmerId,
        name,
        category,
        quantity,
        unit,
        pricePerUnit,
        image,
        description,
        organic,
        harvestDate,
      } = req.body;

      const farmer = db.findUserById(farmerId);
      if (!farmer || farmer.role !== 'farmer') {
        return res.status(403).json({ error: 'Only registered farmers can publish produce.' });
      }

      if (!name || !category || quantity === undefined || !unit || !pricePerUnit) {
        return res.status(400).json({ error: 'Please provide all required product details.' });
      }

      const numQuantity = Number(quantity);
      const newProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        farmerId,
        farmName: farmer.farmDetails?.farmName || 'Local Farm',
        farmerName: farmer.fullName,
        farmerLocation: farmer.farmDetails?.locationAddress || 'Maharashtra',
        farmLat: farmer.farmDetails?.lat || 18.5204,
        farmLng: farmer.farmDetails?.lng || 73.8567,
        name: name.trim(),
        category: category as 'Fruit' | 'Vegetable',
        quantity: numQuantity,
        unit: unit as any,
        pricePerUnit: Number(pricePerUnit),
        status: numQuantity <= 0 ? ('out_of_stock' as const) : numQuantity < 10 ? ('low_stock' as const) : ('available' as const),
        organic: Boolean(organic),
        image: image || (category === 'Fruit'
          ? 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80'
          : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80'),
        description: description || 'Fresh farm-harvested produce direct from our fields.',
        rating: 4.8,
        reviewsCount: 1,
        harvestDate: harvestDate || 'Today, Fresh Harvest',
      };

      const created = db.createProduct(newProduct);
      return res.status(201).json({ product: created, message: 'Produce added successfully!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error creating product' });
    }
  });

  // 8. Products: PUT (Farmer edits inventory/price/status)
  app.put('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = db.updateProduct(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.json({ product: updated, message: 'Product updated successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error updating product' });
    }
  });

  // 9. Products: DELETE
  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const deleted = db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ success: true, message: 'Product deleted from inventory.' });
  });

  // 10. Slots: GET
  app.get('/api/slots', (req, res) => {
    const farmerId = req.query.farmerId as string;
    const date = req.query.date as string;
    const slots = db.getSlots({ farmerId, date });
    res.json({ slots });
  });

  // 11. Slots: POST (Farmer creates visit slot)
  app.post('/api/slots', (req, res) => {
    try {
      const {
        farmerId,
        farmName,
        farmLocation,
        farmLat,
        farmLng,
        date,
        endDate,
        isWeeklyActive,
        activeDuration,
        startTime,
        endTime,
        maxVisitors,
        pricePerPerson,
        activities,
        notes,
        status,
        visitorsEnabled,
        disableReason,
        images,
      } = req.body;

      const farmer = db.findUserById(farmerId);
      if (!farmer || farmer.role !== 'farmer') {
        return res.status(403).json({ error: 'Only registered farmers can create visit slots.' });
      }

      if (!date || !startTime || !endTime || !maxVisitors) {
        return res.status(400).json({ error: 'Please provide slot date, times, and maximum visitor capacity.' });
      }

      const slotImages = Array.isArray(images) && images.length > 0
        ? images
        : (farmer.farmDetails?.farmPhotos?.length ? farmer.farmDetails.farmPhotos : (farmer.farmDetails?.bannerImage ? [farmer.farmDetails.bannerImage] : []));

      const isVisitorsAllowed = visitorsEnabled !== undefined ? Boolean(visitorsEnabled) : true;
      const slotStatus = status || (isVisitorsAllowed ? 'open' : 'closed');

      const newSlot = {
        id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        farmerId,
        farmName: farmName || farmer.farmDetails?.farmName || 'Participating Farm',
        farmerName: farmer.fullName,
        farmLocation: farmLocation || farmer.farmDetails?.locationAddress || 'Maharashtra',
        farmLat: farmLat ? Number(farmLat) : (farmer.farmDetails?.lat || 18.5204),
        farmLng: farmLng ? Number(farmLng) : (farmer.farmDetails?.lng || 73.8567),
        date,
        endDate: endDate || date,
        isWeeklyActive: isWeeklyActive !== undefined ? Boolean(isWeeklyActive) : true,
        activeDuration: activeDuration || '1_week',
        startTime,
        endTime,
        maxVisitors: Number(maxVisitors),
        bookedCount: 0,
        pricePerPerson: Number(pricePerPerson) || 0,
        activities: Array.isArray(activities) && activities.length > 0
          ? activities
          : ['Farm Walk', 'Produce Tasting', 'Agricultural Demo'],
        status: slotStatus as any,
        visitorsEnabled: isVisitorsAllowed,
        disableReason: disableReason || '',
        notes: notes || 'Entry includes farm guided tour and fresh welcome drink.',
        images: slotImages,
      };

      const created = db.createSlot(newSlot);
      return res.status(201).json({ slot: created, message: 'Farm visit slot created!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error creating slot' });
    }
  });

  // 12. Slots: PUT (Farmer edits visit slot)
  app.put('/api/slots/:id', (req, res) => {
    try {
      const { id } = req.params;
      const {
        farmName,
        farmLocation,
        farmLat,
        farmLng,
        date,
        endDate,
        isWeeklyActive,
        activeDuration,
        startTime,
        endTime,
        maxVisitors,
        pricePerPerson,
        activities,
        notes,
        status,
        visitorsEnabled,
        disableReason,
        images,
      } = req.body;

      const existingSlot = db.getSlotById(id);
      if (!existingSlot) {
        return res.status(404).json({ error: 'Visit slot not found' });
      }

      let updatedStatus = status;
      if (visitorsEnabled !== undefined) {
        if (!visitorsEnabled && (updatedStatus === 'open' || !updatedStatus)) {
          updatedStatus = 'closed';
        } else if (visitorsEnabled && (updatedStatus === 'closed' || existingSlot.status === 'closed')) {
          updatedStatus = 'open';
        }
      }

      const updated = db.updateSlot(id, {
        ...(farmName !== undefined ? { farmName } : {}),
        ...(farmLocation !== undefined ? { farmLocation } : {}),
        ...(farmLat !== undefined ? { farmLat: Number(farmLat) } : {}),
        ...(farmLng !== undefined ? { farmLng: Number(farmLng) } : {}),
        ...(date ? { date } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(isWeeklyActive !== undefined ? { isWeeklyActive: Boolean(isWeeklyActive) } : {}),
        ...(activeDuration !== undefined ? { activeDuration } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(maxVisitors !== undefined ? { maxVisitors: Number(maxVisitors) } : {}),
        ...(pricePerPerson !== undefined ? { pricePerPerson: Number(pricePerPerson) } : {}),
        ...(activities !== undefined ? { activities } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(updatedStatus ? { status: updatedStatus } : {}),
        ...(visitorsEnabled !== undefined ? { visitorsEnabled: Boolean(visitorsEnabled) } : {}),
        ...(disableReason !== undefined ? { disableReason } : {}),
        ...(images !== undefined ? { images } : {}),
      });

      return res.json({ slot: updated, message: 'Farm visit slot updated successfully!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error updating visit slot' });
    }
  });

  // 13. Slots: DELETE
  app.delete('/api/slots/:id', (req, res) => {
    const { id } = req.params;
    db.deleteSlot(id);
    return res.json({ success: true, message: 'Visit slot removed.' });
  });

  // 13. Bookings: GET (Strict Farmer vs Consumer routing rule)
  app.get('/api/bookings', (req, res) => {
    const farmerId = req.query.farmerId as string;
    const consumerId = req.query.consumerId as string;

    // Requirement 12: "If a consumer books Farm A, only Farm A's farmer account receives and sees the booking. Other farmers must not receive it."
    const bookings = db.getBookings({ farmerId, consumerId });
    res.json({ bookings });
  });

  // 14. Bookings: POST (Consumer books visit slot)
  app.post('/api/bookings', (req, res) => {
    try {
      const {
        slotId,
        consumerId,
        visitorCount,
        visitDate,
        date: clientDate,
        specialNotes,
      } = req.body;

      const slot = db.getSlotById(slotId);
      if (!slot) {
        return res.status(404).json({ error: 'Selected visit slot was not found.' });
      }

      if (slot.status === 'closed' || slot.status === 'cancelled' || slot.visitorsEnabled === false) {
        return res.status(400).json({
          error: slot.disableReason
            ? `Visits are currently paused by the farmer: ${slot.disableReason}`
            : 'Visitor bookings are currently stopped or paused for this farm slot.',
        });
      }

      if (slot.status !== 'open') {
        return res.status(400).json({ error: 'This visit slot is currently not accepting bookings or full.' });
      }

      const consumer = db.findUserById(consumerId);
      if (!consumer) {
        return res.status(404).json({ error: 'Consumer account not found.' });
      }

      const count = Number(visitorCount) || 1;
      const remaining = slot.maxVisitors - slot.bookedCount;
      if (remaining < count) {
        return res.status(400).json({
          error: `Not enough capacity. Only ${remaining} visitor spot(s) remaining for this time slot.`,
        });
      }

      const totalAmount = count * slot.pricePerPerson;
      const bookingCode = `F2H-VISIT-${Math.floor(1000 + Math.random() * 9000)}`;

      const farmer = db.findUserById(slot.farmerId);
      const chosenDate = visitDate || clientDate || slot.date;

      const newBooking = {
        id: `bk_${Date.now()}`,
        bookingCode,
        slotId: slot.id,
        farmerId: slot.farmerId, // strictly routes to supplying farmer!
        farmName: slot.farmName,
        farmerName: slot.farmerName,
        farmLocation: slot.farmLocation,
        farmLat: slot.farmLat,
        farmLng: slot.farmLng,
        farmerPhone: farmer?.phone || '',
        images: slot.images || (farmer?.farmDetails?.farmPhotos || []),
        consumerId,
        consumerName: consumer.fullName,
        consumerPhone: consumer.phone || '+91 98765 00000',
        date: chosenDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        visitorCount: count,
        pricePerPerson: slot.pricePerPerson,
        totalAmount,
        status: 'Confirmed' as const,
        bookedAt: new Date().toISOString(),
      };

      const created = db.createBooking(newBooking);
      return res.status(201).json({
        booking: created,
        message: `Visit booked successfully! Booking Code: ${bookingCode}`,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error processing visit booking' });
    }
  });

  // 15. Bookings: PUT status
  app.put('/api/bookings/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = db.updateBookingStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    return res.json({ booking: updated, message: `Booking status updated to ${status}` });
  });

  // 16. Orders: POST (Consumer places order -> stock decrements)
  app.post('/api/orders', (req, res) => {
    try {
      const {
        consumerId,
        farmerId,
        items,
        deliveryAddress,
      } = req.body;

      if (!consumerId || !farmerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order request: missing items or supplier.' });
      }

      const consumer = db.findUserById(consumerId);
      if (!consumer) {
        return res.status(404).json({ error: 'Consumer account not found.' });
      }

      const farmer = db.findUserById(farmerId);
      if (!farmer) {
        return res.status(404).json({ error: 'Supplying farmer not found.' });
      }

      // Check stock availability for each item
      for (const item of items) {
        const prod = db.getProductById(item.productId);
        if (!prod) {
          return res.status(400).json({ error: `Product "${item.productName}" is no longer available.` });
        }
        if (prod.quantity < item.quantity) {
          return res.status(400).json({
            error: `Only ${prod.quantity} ${prod.unit} of "${prod.name}" available in stock.`,
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = items.map((item) => {
        const lineTotal = item.pricePerUnit * item.quantity;
        subtotal += lineTotal;
        return {
          productId: item.productId,
          productName: item.productName,
          category: item.category,
          unit: item.unit,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          image: item.image,
        };
      });

      const deliveryFee = subtotal > 400 ? 0 : 40;
      const total = subtotal + deliveryFee;
      const orderCode = `F2H-ORD-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        id: `ord_${Date.now()}`,
        orderCode,
        consumerId,
        consumerName: consumer.fullName,
        consumerPhone: consumer.phone,
        farmerId, // strictly routes to this farmer
        farmName: farmer.farmDetails?.farmName || 'Local Farm',
        items: orderItems,
        subtotal,
        deliveryFee,
        total,
        deliveryAddress: deliveryAddress || {
          label: 'Home',
          street: 'Flat 402, Sunrise Meadows',
          city: 'Pune',
          pincode: '411045',
        },
        status: 'Placed' as const,
        createdAt: new Date().toISOString(),
        estimatedDelivery: 'Tomorrow, morning harvest delivery (7:00 AM - 10:00 AM)',
      };

      const created = db.createOrder(newOrder);
      return res.status(201).json({
        order: created,
        message: `Order ${orderCode} placed successfully! The farmer has received your harvest order.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error creating order' });
    }
  });

  // 17. Orders: GET
  app.get('/api/orders', (req, res) => {
    const farmerId = req.query.farmerId as string;
    const consumerId = req.query.consumerId as string;
    const orders = db.getOrders({ farmerId, consumerId });
    res.json({ orders });
  });

  // 18. Orders: PUT status (Farmer advances status)
  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = db.updateOrderStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ order: updated, message: `Order status changed to ${status}` });
  });

  // 19. Farms / Farmers Directory
  app.get('/api/farmers', (req, res) => {
    const farmers = db.getUsers().filter((u) => u.role === 'farmer');
    const safeList = farmers.map((f) => ({
      id: f.id,
      farmerName: f.fullName,
      phone: f.phone,
      email: f.email,
      farmDetails: f.farmDetails,
      totalProducts: db.getProducts({ farmerId: f.id }).length,
      availableSlots: db.getSlots({ farmerId: f.id }).filter((s) => s.status === 'open').length,
    }));
    res.json({ farmers: safeList });
  });

  // 20. Update Farmer Profile
  app.put('/api/farmers/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, phone, farmDetails } = req.body;
    const user = db.findUserById(id);
    if (!user || user.role !== 'farmer') {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    const updated = db.updateFarmerProfile(id, {
      fullName: fullName || user.fullName,
      phone: phone || user.phone,
      farmDetails,
    });

    const { passwordHash, salt, ...safeUser } = updated!;
    res.json({ user: safeUser, message: 'Farm profile updated successfully.' });
  });

  // 21. Update Consumer Profile / Address
  app.put('/api/consumers/:id/location', (req, res) => {
    const { id } = req.params;
    const { currentBrowsingLocation, deliveryAddresses } = req.body;
    const user = db.findUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates: any = {};
    if (currentBrowsingLocation) updates.currentBrowsingLocation = currentBrowsingLocation;
    if (deliveryAddresses) updates.deliveryAddresses = deliveryAddresses;

    const updated = db.updateUser(id, updates);
    const { passwordHash, salt, ...safeUser } = updated!;
    res.json({ user: safeUser, message: 'Location updated.' });
  });

  // 22. Farm Worker Requests: GET
  app.get('/api/worker-requests', (req, res) => {
    try {
      const farmerId = req.query.farmerId as string;
      const requests = db.getWorkerRequests({ farmerId });
      res.json({ requests });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 23. Farm Worker Requests: POST (Create Request)
  app.post('/api/worker-requests', (req, res) => {
    try {
      const {
        farmerId,
        farmerName,
        farmerPhone,
        farmName,
        farmLocation,
        jobCategory,
        cropName,
        workersNeeded,
        startDate,
        endDate,
        durationDays,
        workingHours,
        wagePerWorker,
        wageType,
        urgency,
        mealsProvided,
        transportProvided,
        accommodationProvided,
        specialInstructions,
      } = req.body;

      if (!farmerId || !jobCategory || !cropName || !workersNeeded || !startDate) {
        return res.status(400).json({
          error: 'Please fill all required fields: Job Category, Crop Name, Workers Needed, and Start Date.',
        });
      }

      const farmer = db.findUserById(farmerId);
      const requestCode = `WRK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const newRequest = {
        id: `req_labor_${Date.now()}`,
        requestCode,
        farmerId,
        farmerName: farmerName || farmer?.fullName || 'Farmer',
        farmerPhone: farmerPhone || farmer?.phone || '+91 98220 00000',
        farmName: farmName || farmer?.farmDetails?.farmName || 'My Farm',
        farmLocation: farmLocation || farmer?.farmDetails?.locationAddress || 'Farm Location',
        jobCategory,
        cropName,
        workersNeeded: Number(workersNeeded) || 1,
        assignedWorkersCount: 0,
        startDate,
        endDate: endDate || startDate,
        durationDays: Number(durationDays) || 1,
        workingHours: workingHours || '08:00 AM - 05:00 PM',
        wagePerWorker: Number(wagePerWorker) || 500,
        wageType: wageType || 'Daily',
        urgency: urgency || 'Next 2-3 Days',
        mealsProvided: Boolean(mealsProvided),
        transportProvided: Boolean(transportProvided),
        accommodationProvided: Boolean(accommodationProvided),
        specialInstructions: specialInstructions || '',
        status: 'Open / Seeking Workers' as const,
        createdAt: new Date().toISOString(),
      };

      const created = db.createWorkerRequest(newRequest);
      res.status(201).json({
        request: created,
        message: `Worker request ${requestCode} submitted successfully! Matching local labor groups in your district.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 24. Farm Worker Requests: PUT (Update Request / Status)
  app.put('/api/worker-requests/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = db.updateWorkerRequest(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Worker request not found' });
      }
      res.json({ request: updated, message: 'Worker request updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 25. Farm Worker Requests: Quick Assign Contractor / Labor Group
  app.post('/api/worker-requests/:id/assign', (req, res) => {
    try {
      const { id } = req.params;
      const { contractor, assignedCount } = req.body;
      const existing = db.getWorkerRequestById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Worker request not found' });
      }

      const count = Number(assignedCount) || existing.workersNeeded;
      const updated = db.updateWorkerRequest(id, {
        assignedWorkersCount: count,
        status: count >= existing.workersNeeded ? 'Workers Assigned' : 'Partially Matched',
        assignedContractor: contractor || {
          groupName: 'Shivaji Agro Labor Cooperative',
          contactPerson: 'Babanrao Shinde',
          phone: '+91 94230 55123',
          workersConfirmed: count,
          rating: 4.8,
        },
      });

      res.json({
        request: updated,
        message: `${count} workers successfully assigned from ${contractor?.groupName || 'labor group'}!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 26. Farm Worker Requests: DELETE
  app.delete('/api/worker-requests/:id', (req, res) => {
    try {
      const { id } = req.params;
      const success = db.deleteWorkerRequest(id);
      if (!success) {
        return res.status(404).json({ error: 'Worker request not found' });
      }
      res.json({ success: true, message: 'Worker request removed.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 27. Verified Local Agricultural Labor Groups / Contractors Pool
  app.get('/api/local-labor-groups', (req, res) => {
    try {
      const groups = db.getLocalLaborGroups();
      res.json({ groups });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Consumer-Funded Farming / Farm Partnership Routes ---

  // 28. Farm Plots: GET (Available plots for partnership)
  app.get('/api/plots', (req, res) => {
    try {
      const farmerId = req.query.farmerId as string;
      const status = req.query.status as string;
      const plots = db.getPlots({ farmerId, status });
      res.json({ plots });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 29. Farm Plots: GET by ID
  app.get('/api/plots/:id', (req, res) => {
    try {
      const plot = db.getPlotById(req.params.id);
      if (!plot) return res.status(404).json({ error: 'Plot not found' });
      res.json({ plot });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 30. Farm Plots: POST (Farmer lists plot for partnership)
  app.post('/api/plots', (req, res) => {
    try {
      const {
        farmerId,
        plotName,
        plotIdentifier,
        areaSize,
        areaUnit,
        soilType,
        waterSource,
        availableFrom,
        supportedCrops,
        farmingStyle,
        description,
        images,
        estimatedBaseCostPerUnit,
        standardFarmerServiceFee,
        termsNote,
      } = req.body;

      if (!farmerId || !plotName || !areaSize || !areaUnit) {
        return res.status(400).json({
          error: 'Please provide farmer ID, plot name, area size, and area unit.',
        });
      }

      const farmer = db.findUserById(farmerId);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found.' });
      }

      const cleanCode =
        plotIdentifier?.trim() ||
        `PLOT-${(farmer.farmDetails?.farmName || 'FARM').substring(0, 3).toUpperCase()}-${Math.floor(
          100 + Math.random() * 900
        )}`;

      const newPlot = {
        id: `plot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        farmerId,
        farmName: farmer.farmDetails?.farmName || `${farmer.fullName}'s Farm`,
        farmerName: farmer.fullName,
        farmerPhone: farmer.phone || '',
        farmLocation: farmer.farmDetails?.locationAddress || 'Maharashtra, India',
        farmLat: farmer.farmDetails?.lat || 18.5204,
        farmLng: farmer.farmDetails?.lng || 73.8567,
        plotName,
        plotIdentifier: cleanCode,
        areaSize: Number(areaSize),
        areaUnit: areaUnit || 'acre',
        soilType: soilType || 'Alluvial / Loam Soil',
        waterSource: waterSource || 'Borewell & Drip Irrigation',
        availableFrom: availableFrom || new Date().toISOString().split('T')[0],
        status: 'available' as const,
        supportedCrops: Array.isArray(supportedCrops) && supportedCrops.length > 0 ? supportedCrops : ['Organic Vegetables'],
        farmingStyle: farmingStyle || farmer.farmDetails?.farmingStyle || 'Organic',
        description: description || 'Prime arable land available for consumer-funded farming partnership.',
        images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'],
        estimatedBaseCostPerUnit: estimatedBaseCostPerUnit ? Number(estimatedBaseCostPerUnit) : undefined,
        standardFarmerServiceFee: standardFarmerServiceFee ? Number(standardFarmerServiceFee) : undefined,
        termsNote:
          termsNote ||
          'The farmer retains complete, unencumbered land ownership. The consumer receives full and exclusive rights to the harvest produce and revenue generated from this partnership.',
        createdAt: new Date().toISOString(),
      };

      const created = db.createPlot(newPlot);
      res.status(201).json({ plot: created, message: `Plot "${created.plotName}" is now available for partnerships!` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 31. Farm Plots: PUT (Update plot)
  app.put('/api/plots/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updated = db.updatePlot(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Plot not found' });
      res.json({ plot: updated, message: 'Plot details updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 32. Farm Plots: DELETE
  app.delete('/api/plots/:id', (req, res) => {
    try {
      const { id } = req.params;
      const success = db.deletePlot(id);
      if (!success) return res.status(404).json({ error: 'Plot not found' });
      res.json({ success: true, message: 'Plot listing removed.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 33. Partnerships: GET
  app.get('/api/partnerships', (req, res) => {
    try {
      const farmerId = req.query.farmerId as string;
      const consumerId = req.query.consumerId as string;
      const status = req.query.status as string;
      const partnerships = db.getPartnerships({ farmerId, consumerId, status });
      res.json({ partnerships });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 34. Partnerships: GET by ID
  app.get('/api/partnerships/:id', (req, res) => {
    try {
      const partnership = db.getPartnershipById(req.params.id);
      if (!partnership) return res.status(404).json({ error: 'Partnership not found' });
      res.json({ partnership });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 35. Partnerships: POST (Consumer funds a farming partnership)
  app.post('/api/partnerships', (req, res) => {
    try {
      const {
        plotId,
        farmerId,
        consumerId,
        cropName,
        areaSize,
        areaUnit,
        costBreakdown,
        totalFundingAmount,
        farmingDurationDays,
        paymentMethod,
        billingPlan,
        discountCode,
        discountAmount,
        billingDetails: clientBillingDetails,
      } = req.body;

      if (!plotId || !farmerId || !consumerId || !cropName || !totalFundingAmount || !costBreakdown) {
        return res.status(400).json({
          error: 'Missing required partnership parameters (plot, farmer, consumer, crop, or funding).',
        });
      }

      const farmer = db.findUserById(farmerId);
      const consumer = db.findUserById(consumerId);
      const plot = db.getPlotById(plotId);

      if (!farmer) return res.status(404).json({ error: 'Farmer not found.' });
      if (!consumer) return res.status(404).json({ error: 'Consumer not found.' });

      const duration = Number(farmingDurationDays) || 105;
      const startDate = new Date().toISOString().split('T')[0];
      const expHarvest = new Date(Date.now() + duration * 86400000).toISOString().split('T')[0];
      const partnershipCode = `FP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const invoiceNumber = `INV-RENT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const txnId = `TXN_FP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const rcptNum = `RCPT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const chosenPlan = (billingPlan || clientBillingDetails?.planType || 'full') as 'full' | 'milestone' | 'monthly';
      const discAmt = Number(discountAmount || clientBillingDetails?.discountAmount || 0);
      const netTotal = Math.max(1, Number(totalFundingAmount) - discAmt);

      let initialPaidToday = netTotal;
      let remainingBal = 0;
      let installmentsList: any[] = [];

      if (clientBillingDetails?.installments && clientBillingDetails.installments.length > 0) {
        installmentsList = clientBillingDetails.installments;
        initialPaidToday = Number(clientBillingDetails.amountPaidToday || installmentsList[0]?.amount || netTotal);
        remainingBal = Math.max(0, netTotal - initialPaidToday);
      } else if (chosenPlan === 'milestone') {
        const inst1 = Math.round(netTotal * 0.30);
        const inst2 = Math.round(netTotal * 0.30);
        const inst3 = Math.round(netTotal * 0.30);
        const inst4 = Math.max(0, netTotal - (inst1 + inst2 + inst3));

        initialPaidToday = inst1;
        remainingBal = netTotal - inst1;

        const due2 = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];
        const due3 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
        const due4 = expHarvest;

        installmentsList = [
          {
            id: `inst_${Date.now()}_1`,
            installmentNumber: 1,
            title: 'Stage 1: Plot Booking & Land Preparation Deposit',
            stageName: 'Plot Preparation',
            percentage: 30,
            amount: inst1,
            dueDate: startDate,
            status: 'Paid',
            paidAt: new Date().toISOString(),
            transactionId: txnId,
            paymentMethod: paymentMethod || 'UPI Instant Transfer',
            receiptNumber: rcptNum,
          },
          {
            id: `inst_${Date.now()}_2`,
            installmentNumber: 2,
            title: 'Stage 2: Sowing & Certified Organic Seeds',
            stageName: 'Sowing & Planting',
            percentage: 30,
            amount: inst2,
            dueDate: due2,
            status: 'Scheduled',
          },
          {
            id: `inst_${Date.now()}_3`,
            installmentNumber: 3,
            title: 'Stage 3: Drip Irrigation, Solar Power & Farmer Care',
            stageName: 'Irrigation & Care',
            percentage: 30,
            amount: inst3,
            dueDate: due3,
            status: 'Scheduled',
          },
          {
            id: `inst_${Date.now()}_4`,
            installmentNumber: 4,
            title: 'Stage 4: Harvest, Grading & Produce Dispatch',
            stageName: 'Ready for Harvest',
            percentage: 10,
            amount: inst4,
            dueDate: due4,
            status: 'Scheduled',
          },
        ];
      } else if (chosenPlan === 'monthly') {
        const monthCount = Math.max(2, Math.round(duration / 30));
        const eachMonth = Math.round(netTotal / monthCount);
        installmentsList = [];
        for (let i = 1; i <= monthCount; i++) {
          const isFirst = i === 1;
          const amt = i === monthCount ? Math.max(0, netTotal - eachMonth * (monthCount - 1)) : eachMonth;
          const due = new Date(Date.now() + (i - 1) * 30 * 86400000).toISOString().split('T')[0];
          installmentsList.push({
            id: `inst_${Date.now()}_${i}`,
            installmentNumber: i,
            title: `Month ${i} Land Rental & Care Installment`,
            stageName: i === 1 ? 'Plot Preparation' : i === 2 ? 'Active Cultivation' : 'Final Maturation',
            percentage: Math.round((amt / netTotal) * 100),
            amount: amt,
            dueDate: due,
            status: isFirst ? 'Paid' : 'Scheduled',
            paidAt: isFirst ? new Date().toISOString() : undefined,
            transactionId: isFirst ? txnId : undefined,
            paymentMethod: isFirst ? paymentMethod || 'UPI Auto-Mandate' : undefined,
            receiptNumber: isFirst ? rcptNum : undefined,
          });
        }
        initialPaidToday = installmentsList[0].amount;
        remainingBal = netTotal - initialPaidToday;
      } else {
        // Full upfront
        initialPaidToday = netTotal;
        remainingBal = 0;
        installmentsList = [
          {
            id: `inst_${Date.now()}_1`,
            installmentNumber: 1,
            title: '100% Full Cultivation Sponsorship (One-Time)',
            stageName: 'Complete Crop Cycle',
            percentage: 100,
            amount: netTotal,
            dueDate: startDate,
            status: 'Paid',
            paidAt: new Date().toISOString(),
            transactionId: txnId,
            paymentMethod: paymentMethod || 'UPI Instant Transfer',
            receiptNumber: rcptNum,
          },
        ];
      }

      const billingDetails = clientBillingDetails || {
        invoiceNumber,
        invoiceDate: startDate,
        planType: chosenPlan,
        baseCost: Number(totalFundingAmount),
        discountAmount: discAmt,
        discountCode: discountCode || (discAmt > 0 ? 'SAVINGS' : undefined),
        netPayableAmount: netTotal,
        amountPaidToday: initialPaidToday,
        remainingBalance: remainingBal,
        installments: installmentsList,
        taxBreakdown: {
          landRentPortion: Math.round(netTotal * 0.20),
          seedsInputsPortion: Math.round(netTotal * 0.35),
          irrigationPowerPortion: Math.round(netTotal * 0.20),
          farmerServicePortion: Math.round(netTotal * 0.25),
          gstRate: 0,
          gstAmount: 0,
          escrowFee: 0,
        },
        paymentReceipt: {
          receiptNumber: rcptNum,
          paidBy: consumer.fullName,
          paymentMethod: paymentMethod || 'UPI Transfer',
          transactionRef: txnId,
          paidAmount: initialPaidToday,
          paymentDate: new Date().toISOString(),
          escrowLockStatus: 'Secured in Escrow',
        },
      };

      const newPartnership = {
        id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        partnershipCode,
        plotId,
        plotName: plot?.plotName || 'Dedicated Farm Block',
        plotIdentifier: plot?.plotIdentifier || 'PLOT-PART',
        areaSize: Number(areaSize) || (plot ? plot.areaSize : 1),
        areaUnit: (areaUnit || (plot ? plot.areaUnit : 'acre')) as any,

        farmerId,
        farmName: farmer.farmDetails?.farmName || `${farmer.fullName}'s Farm`,
        farmerName: farmer.fullName,
        farmerPhone: farmer.phone || '',
        farmerLocation: farmer.farmDetails?.locationAddress || 'Maharashtra, India',
        farmLat: farmer.farmDetails?.lat || 18.5204,
        farmLng: farmer.farmDetails?.lng || 73.8567,

        consumerId,
        consumerName: consumer.fullName,
        consumerPhone: consumer.phone || '',
        consumerEmail: consumer.email || '',

        cropName,
        farmingDurationDays: duration,
        startDate,
        expectedHarvestDate: expHarvest,

        costBreakdown,
        totalFundingAmount: netTotal,
        billingPlan: chosenPlan,
        billingDetails,
        paymentStatus: 'Escrow Secured' as const,
        paymentMethod: paymentMethod || 'UPI Instant Transfer (KisanSetu Escrow)',
        paymentDate: new Date().toISOString(),
        transactionId: txnId,

        status: 'active' as const,
        currentStage: 'Plot Preparation' as const,
        progressPercentage: 10,
        milestones: [
          {
            id: `m_${Date.now()}_1`,
            stage: 'Plot Preparation' as const,
            title: 'Partnership Agreement Executed & Escrow Funded',
            description: `Consumer ${consumer.fullName} funded land rent under ${chosenPlan === 'milestone' ? 'Milestone Billing Plan (30% Deposit)' : chosenPlan === 'monthly' ? 'Monthly Flexible Subscription' : 'Full Upfront Escrow Lock'}. Farmer ${farmer.fullName} is preparing ${areaSize || plot?.areaSize} ${areaUnit || plot?.areaUnit} on plot ${plot?.plotIdentifier} for ${cropName}.`,
            date: startDate,
            recordedBy: 'system' as const,
          },
        ],

        legalTerms: {
          farmerLandOwnershipConfirmed: true,
          consumerProduceRightsConfirmed: true,
          agreementSummary: `Legal Agreement: Farmer ${farmer.fullName} retains sole, unencumbered ownership of the land. Consumer ${consumer.fullName} provides 100% operational farming capital and receives sole entitlement to the harvested produce and proceeds thereof.`,
        },

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = db.createPartnership(newPartnership);
      res.status(201).json({
        partnership: created,
        message: `Farming partnership #${created.partnershipCode} successfully funded and active!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 35b. Partnerships: Pay Milestone Installment
  app.post('/api/partnerships/:id/pay-installment', (req, res) => {
    try {
      const { id } = req.params;
      const { installmentId, paymentMethod, notes } = req.body;

      if (!installmentId) {
        return res.status(400).json({ error: 'installmentId is required.' });
      }

      const result = db.payPartnershipInstallment(id, installmentId, {
        paymentMethod: paymentMethod || 'UPI Instant Transfer',
        notes,
      });

      if (!result) {
        return res.status(404).json({ error: 'Partnership or installment not found.' });
      }

      if (result.alreadyPaid) {
        return res.status(200).json({
          partnership: result.partnership,
          message: 'This installment is already paid.',
        });
      }

      res.json({
        partnership: result.partnership,
        receipt: result.receipt,
        message: `Milestone installment successfully paid and locked in escrow!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 36. Partnerships: POST Milestone update (Farmer posts progress photo/notes)
  app.post('/api/partnerships/:id/milestones', (req, res) => {
    try {
      const { id } = req.params;
      const { stage, title, description, date, photoUrl, progressPercentage } = req.body;

      if (!stage || !title || !description) {
        return res.status(400).json({ error: 'Milestone stage, title, and description are required.' });
      }

      const milestone = {
        id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        stage,
        title,
        description,
        date: date || new Date().toISOString().split('T')[0],
        photoUrl,
        recordedBy: 'farmer' as const,
      };

      const updated = db.updatePartnershipMilestone(
        id,
        milestone,
        progressPercentage !== undefined ? Number(progressPercentage) : undefined,
        stage
      );

      if (!updated) return res.status(404).json({ error: 'Partnership not found' });
      res.json({ partnership: updated, message: 'Milestone progress posted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 37. Partnerships: POST Harvest (Farmer documents harvested yield)
  app.post('/api/partnerships/:id/harvest', (req, res) => {
    try {
      const { id } = req.params;
      const { harvestedQuantity, harvestUnit, harvestDate, qualityGrade, farmerNotes, harvestPhoto } = req.body;

      if (!harvestedQuantity || !harvestUnit) {
        return res.status(400).json({ error: 'Harvested quantity and unit are required.' });
      }

      const harvestRecord = {
        harvestedQuantity: Number(harvestedQuantity),
        harvestUnit: harvestUnit || 'kg',
        harvestDate: harvestDate || new Date().toISOString().split('T')[0],
        qualityGrade: qualityGrade || 'A+',
        farmerNotes: farmerNotes || 'Harvested at peak freshness and quality tested.',
        harvestPhoto,
      };

      const updated = db.recordPartnershipHarvest(id, harvestRecord);
      if (!updated) return res.status(404).json({ error: 'Partnership not found' });
      res.json({
        partnership: updated,
        message: `Harvest recorded: ${harvestRecord.harvestedQuantity} ${harvestRecord.harvestUnit}. Consumer can now choose produce delivery or marketplace liquidation.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 38. Partnerships: POST Settlement (Consumer chooses Take Produce OR Sell in Marketplace)
  app.post('/api/partnerships/:id/settle', (req, res) => {
    try {
      const { id } = req.params;
      const { choice, deliveryAddress, sellingPricePerUnit, notes } = req.body;

      if (choice !== 'take_produce' && choice !== 'sell_in_marketplace') {
        return res.status(400).json({ error: 'Invalid settlement choice. Must be "take_produce" or "sell_in_marketplace".' });
      }

      const partnership = db.getPartnershipById(id);
      if (!partnership) return res.status(404).json({ error: 'Partnership not found' });

      let settlementData: any = {
        choice,
        settledAt: new Date().toISOString(),
        payoutRef: `PAYOUT_SETTLE_${Date.now()}`,
        farmerLaborPaid: partnership.costBreakdown.farmerCultivationServiceFee,
        notes: notes || '',
      };

      if (choice === 'take_produce') {
        settlementData.deliveryAddress =
          deliveryAddress ||
          'Consumer Registered Delivery Address (Doorstep Farm Direct Dispatch)';
        settlementData.dispatchStatus = 'Pending Delivery';
      } else {
        // Selling in marketplace
        const harvestQty = partnership.harvestRecord?.harvestedQuantity || 500;
        const pricePerUnit = Number(sellingPricePerUnit) || 35;
        const totalGross = harvestQty * pricePerUnit;
        const netPayout = Math.max(0, totalGross);

        settlementData.sellingPricePerUnit = pricePerUnit;
        settlementData.totalGrossRevenue = totalGross;
        settlementData.consumerNetPayout = netPayout;
      }

      const updated = db.settlePartnership(id, settlementData);
      res.json({
        partnership: updated,
        message:
          choice === 'take_produce'
            ? 'Produce dispatch order created. Harvest will be delivered to your address!'
            : `Marketplace liquidation complete! Gross revenue ₹${settlementData.totalGrossRevenue} settled to consumer.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- GPS Geocoding, Search & IP Fallback Systems ---
  const geoReverseCache = new Map<string, { data: any; expiry: number }>();
  const geoSearchCache = new Map<string, { data: any; expiry: number }>();

  // Known Maharashtra / India agricultural regions for offline centroid proximity fallback
  const REGIONAL_CENTROIDS = [
    { name: 'Pune (Baner/Pashan)', lat: 18.559, lng: 73.7868, city: 'Pune', state: 'Maharashtra', pincode: '411045' },
    { name: 'Pune (Hinjewadi IT & Agri Belt)', lat: 18.5913, lng: 73.7389, city: 'Pune', state: 'Maharashtra', pincode: '411057' },
    { name: 'Pune (Central / Kasba Peth)', lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    { name: 'Baramati Agricultural Hub', lat: 18.1521, lng: 74.577, city: 'Baramati', state: 'Maharashtra', pincode: '413102' },
    { name: 'Narayangaon Tomato Belt', lat: 19.1177, lng: 73.9785, city: 'Narayangaon', state: 'Maharashtra', pincode: '410504' },
    { name: 'Satara Strawberry & Organic Farms', lat: 17.6805, lng: 74.0183, city: 'Satara', state: 'Maharashtra', pincode: '415001' },
    { name: 'Nashik Grape & Vegetable Valley', lat: 19.9975, lng: 73.7898, city: 'Nashik', state: 'Maharashtra', pincode: '422001' },
    { name: 'Kolhapur Sugarcane & Jaggery Belt', lat: 16.705, lng: 74.2433, city: 'Kolhapur', state: 'Maharashtra', pincode: '416003' },
    { name: 'Ahmednagar Grain & Onion Belt', lat: 19.0952, lng: 74.7496, city: 'Ahmednagar', state: 'Maharashtra', pincode: '414001' },
    { name: 'Solapur Pomegranate & Millet Belt', lat: 17.6599, lng: 75.9064, city: 'Solapur', state: 'Maharashtra', pincode: '413001' },
    { name: 'Mumbai Metropolitan Area', lat: 19.076, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  ];

  // 28. Reverse Geocode Coordinates to Accurate Real-World Address
  app.get('/api/reverse-geocode', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
      }

      // Check in-memory cache (approx 10-meter precision)
      const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const now = Date.now();
      const cached = geoReverseCache.get(cacheKey);
      if (cached && cached.expiry > now) {
        return res.json(cached.data);
      }

      let resolvedData: any = null;

      // --- Provider 1: OpenStreetMap Nominatim with strict timeout ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'KisanSetuAgriPlatform/2.0 (contact: support@kisansetu.in)',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          const addr = data.address || {};

          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.village ||
            addr.hamlet ||
            addr.residential ||
            addr.town ||
            '';
          const road = addr.road || addr.pedestrian || addr.footway || '';
          const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.county || '';
          const state = addr.state || '';
          const pincode = addr.postcode || '';

          const labelParts: string[] = [];
          if (locality) labelParts.push(locality);
          else if (road) labelParts.push(road);
          if (city && !labelParts.includes(city)) labelParts.push(city);
          if (labelParts.length === 0 && state) labelParts.push(state);

          const label = labelParts.length > 0 ? labelParts.join(', ') : `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const formattedAddress =
            data.display_name ||
            [road, locality, city, state, pincode].filter(Boolean).join(', ') ||
            `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

          resolvedData = {
            lat,
            lng,
            label,
            formattedAddress,
            city: city || state || 'Local Region',
            state: state || 'Maharashtra',
            pincode,
            provider: 'OpenStreetMap',
            rawAddress: addr,
          };
        }
      } catch (nomErr: any) {
        // Fallback to Provider 2
      }

      // --- Provider 2: Photon Komoot Geocoder (Reliable fallback) ---
      if (!resolvedData) {
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 3500);

          const photonUrl = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(
            lat
          )}&lon=${encodeURIComponent(lng)}`;

          const photonRes = await fetch(photonUrl, {
            headers: {
              'User-Agent': 'KisanSetuAgriPlatform/2.0',
              'Accept-Language': 'en',
            },
            signal: controller2.signal,
          });
          clearTimeout(timeoutId2);

          if (photonRes.ok) {
            const photonJson: any = await photonRes.json();
            const feature = photonJson.features?.[0];
            if (feature && feature.properties) {
              const p = feature.properties;
              const placeName = p.name || p.district || p.street || '';
              const city = p.city || p.county || p.district || '';
              const state = p.state || 'Maharashtra';
              const pincode = p.postcode || '';

              const parts: string[] = [];
              if (placeName) parts.push(placeName);
              if (city && !parts.includes(city)) parts.push(city);
              if (state && parts.length === 0) parts.push(state);

              const label = parts.length > 0 ? parts.join(', ') : `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
              const formattedAddress = [placeName, p.street, city, state, pincode, p.country]
                .filter(Boolean)
                .join(', ');

              resolvedData = {
                lat,
                lng,
                label,
                formattedAddress: formattedAddress || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                city: city || state || 'Local Region',
                state,
                pincode,
                provider: 'Photon-OSM',
                rawAddress: p,
              };
            }
          }
        } catch (photonErr) {
          // Fallback to offline centroid
        }
      }

      // --- Provider 3: Proximity to nearest agricultural region centroid ---
      if (!resolvedData) {
        let nearest = REGIONAL_CENTROIDS[0];
        let minDistSq = Infinity;
        for (const c of REGIONAL_CENTROIDS) {
          const dSq = Math.pow(c.lat - lat, 2) + Math.pow(c.lng - lng, 2);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearest = c;
          }
        }
        resolvedData = {
          lat,
          lng,
          label: `${nearest.name} (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          formattedAddress: `Near ${nearest.name}, ${nearest.city}, ${nearest.state} ${nearest.pincode}`,
          city: nearest.city,
          state: nearest.state,
          pincode: nearest.pincode,
          provider: 'Regional-Centroid',
          rawAddress: {},
        };
      }

      // Cache for 2 hours
      geoReverseCache.set(cacheKey, { data: resolvedData, expiry: Date.now() + 2 * 60 * 60 * 1000 });
      return res.json(resolvedData);
    } catch (err: any) {
      const fallbackLat = parseFloat(req.query.lat as string) || 18.5204;
      const fallbackLng = parseFloat(req.query.lng as string) || 73.8567;
      return res.json({
        lat: fallbackLat,
        lng: fallbackLng,
        label: `GPS (${fallbackLat.toFixed(4)}, ${fallbackLng.toFixed(4)})`,
        formattedAddress: `Coordinates: ${fallbackLat.toFixed(5)}, ${fallbackLng.toFixed(5)}`,
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        provider: 'Fallback',
      });
    }
  });

  // 29. Forward Geocode / Search Any Village, Town, or Landmark
  app.get('/api/geocode', async (req, res) => {
    try {
      const query = ((req.query.q as string) || '').trim();
      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      const cacheKey = query.toLowerCase();
      const cached = geoSearchCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return res.json({ results: cached.data });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Query Photon biased around Maharashtra (lat: 18.52, lon: 73.85)
      const searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&limit=6&lat=18.5204&lon=73.8567`;

      const resp = await fetch(searchUrl, {
        headers: { 'User-Agent': 'KisanSetuAgriPlatform/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        return res.json({ results: [] });
      }

      const json: any = await resp.json();
      const features = json.features || [];

      const results = features.map((f: any) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [73.8567, 18.5204];
        const lng = coords[0];
        const lat = coords[1];

        const title = p.name || p.district || p.city || query;
        const city = p.city || p.county || p.district || '';
        const state = p.state || '';
        const pincode = p.postcode || '';

        const addressParts = [title, p.street, city, state, pincode, p.country].filter(Boolean);
        const uniqueParts = addressParts.filter((v, i, a) => a.indexOf(v) === i);

        return {
          label: `${title}${city && city !== title ? `, ${city}` : ''}`,
          formattedAddress: uniqueParts.join(', '),
          lat,
          lng,
          city: city || state || 'Local Region',
          state: state || 'India',
          pincode,
        };
      });

      geoSearchCache.set(cacheKey, { data: results, expiry: Date.now() + 1000 * 60 * 60 });
      return res.json({ results });
    } catch (err: any) {
      return res.json({ results: [] });
    }
  });

  // 30. IP-Based Approximate Geolocation Fallback (for devices without GPS hardware)
  app.get('/api/ip-location', async (req, res) => {
    try {
      // Extract IP address
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '';

      const isPrivateOrLocal =
        !rawIp ||
        rawIp === '127.0.0.1' ||
        rawIp === '::1' ||
        rawIp.startsWith('10.') ||
        rawIp.startsWith('192.168.') ||
        rawIp.startsWith('172.16.');

      const lookupUrl = isPrivateOrLocal
        ? 'http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon'
        : `http://ip-api.com/json/${rawIp}?fields=status,country,regionName,city,zip,lat,lon`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(lookupUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data: any = await resp.json();
        if (data.status === 'success' && data.lat && data.lon) {
          return res.json({
            lat: data.lat,
            lng: data.lon,
            city: data.city || 'Pune',
            state: data.regionName || 'Maharashtra',
            pincode: data.zip || '411001',
            label: `${data.city || 'Pune'}, ${data.regionName || 'Maharashtra'}`,
            formattedAddress: `${data.city || 'Pune'}, ${data.regionName || 'Maharashtra'}, ${data.country || 'India'}`,
            isIpFallback: true,
          });
        }
      }
    } catch {
      // Ignore
    }

    // Default Maharashtra fallback
    return res.json({
      lat: 18.5204,
      lng: 73.8567,
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      label: 'Pune, Maharashtra',
      formattedAddress: 'Pune, Maharashtra, India',
      isIpFallback: true,
    });
  });

  // --- Admin Endpoints (Oversight & Master Control) ---
  app.get('/api/admin/overview', (req, res) => {
    try {
      const data = db.getAdminOverviewData();
      return res.json({ success: true, ...data });
    } catch (err: any) {
      console.error('Admin overview error:', err);
      return res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  });

  // Real-Time Server-Sent Events (SSE) stream for instant push updates to Admin Dashboard
  app.get('/api/admin/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial handshake
    const initialData = JSON.stringify({
      type: 'connected',
      version: db.getVersion(),
      timestamp: new Date().toISOString(),
      latestActivity: db.getLatestActivity(),
    });
    res.write(`data: ${initialData}\n\n`);

    const onActivity = (activity: any, version: number) => {
      try {
        const payload = JSON.stringify({
          type: 'activity',
          version,
          activity,
        });
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        console.error('SSE send error:', err);
      }
    };

    dbEvents.on('activity', onActivity);

    // Keep connection alive with periodic comment heartbeat
    const pingInterval = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch {
        clearInterval(pingInterval);
      }
    }, 12000);

    req.on('close', () => {
      clearInterval(pingInterval);
      dbEvents.off('activity', onActivity);
    });
  });

  // Real-Time Sync & Fast Polling fallback endpoint
  app.get('/api/admin/sync', (req, res) => {
    try {
      const sinceVersion = req.query.since ? parseInt(req.query.since as string, 10) : 0;
      const currentVersion = db.getVersion();
      return res.json({
        success: true,
        version: currentVersion,
        hasUpdates: currentVersion > sinceVersion,
        latestActivity: db.getLatestActivity(),
        recentActivities: db.getRecentActivities(25),
      });
    } catch (err: any) {
      console.error('Admin sync error:', err);
      return res.status(500).json({ error: 'Failed to sync admin status' });
    }
  });

  // Real-Time Activities log endpoint
  app.get('/api/admin/activities', (req, res) => {
    try {
      const limit = req.query.limit ? Math.min(100, parseInt(req.query.limit as string, 10)) : 60;
      const activities = db.getRecentActivities(limit);
      return res.json({
        success: true,
        version: db.getVersion(),
        activities,
      });
    } catch (err: any) {
      console.error('Admin activities error:', err);
      return res.status(500).json({ error: 'Failed to fetch admin activities' });
    }
  });

  app.put('/api/admin/users/:id/password', (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long' });
      }
      const updated = db.updateUserPassword(id, newPassword.trim());
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { passwordHash, salt, ...safeUser } = updated;
      return res.json({ success: true, user: safeUser, message: 'Password updated successfully' });
    } catch (err: any) {
      console.error('Admin update password error:', err);
      return res.status(500).json({ error: 'Failed to update user password' });
    }
  });

  app.put('/api/admin/orders/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = db.updateOrderStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json({ success: true, order: updated });
    } catch (err: any) {
      console.error('Admin update order status error:', err);
      return res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  app.put('/api/admin/worker-requests/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedWorkersCount } = req.body;
      const updated = db.updateWorkerRequest(id, { status, assignedWorkersCount });
      if (!updated) {
        return res.status(404).json({ error: 'Worker request not found' });
      }
      return res.json({ success: true, workerRequest: updated });
    } catch (err: any) {
      console.error('Admin update worker request error:', err);
      return res.status(500).json({ error: 'Failed to update worker request' });
    }
  });
export default app;
