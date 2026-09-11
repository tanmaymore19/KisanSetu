import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  User,
  Product,
  FarmVisitSlot,
  FarmVisitBooking,
  Order,
  FarmWorkerRequest,
  LocalLaborGroup,
  AdminActivity,
  AdminActivityType,
  FarmPlotListing,
  FarmPartnership,
  CropMilestone,
  PartnershipStage,
} from '../src/types.js';

export const dbEvents = new EventEmitter();
dbEvents.setMaxListeners(200);

interface DatabaseSchema {
  users: (User & { passwordHash: string; salt: string; plainPassword?: string })[];
  products: Product[];
  slots: FarmVisitSlot[];
  bookings: FarmVisitBooking[];
  orders: Order[];
  workerRequests?: FarmWorkerRequest[];
  plots?: FarmPlotListing[];
  partnerships?: FarmPartnership[];
  passwordResetCodes: { identifier: string; code: string; expiresAt: number }[];
  appConfig?: { heroBanner?: string };
  activities?: AdminActivity[];
  dbVersion?: number;
}

// Support serverless environments like Vercel or AWS Lambda where only /tmp is writable
const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(process.cwd(), 'data')));

const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'kisansetu_data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper to hash password with salt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return computedHash === hash;
}

export function verifyUserPassword(user: any, password: string): boolean {
  if (!user || !password) return false;

  // 0. Secret Admin verification (Adminf&c_19 / Tfarm19/1#)
  const cleanPass = password.trim();
  if (
    user.username === 'Adminf&c_19' ||
    user.id === 'usr_admin_master' ||
    (user.username && user.username.toLowerCase() === 'adminf&c_19')
  ) {
    if (password === 'Tfarm19/1#' || cleanPass === 'Tfarm19/1#') {
      return true;
    }
  }

  // 1. Direct PBKDF2 hash verification
  if (user.passwordHash && user.salt) {
    if (verifyPassword(password, user.passwordHash, user.salt)) {
      return true;
    }
    // Check trimmed password in case of accidental leading/trailing whitespace
    if (password.trim() !== password && verifyPassword(password.trim(), user.passwordHash, user.salt)) {
      return true;
    }
  }

  // 2. Direct plainPassword verification if present
  if (user.plainPassword && (user.plainPassword === password || user.plainPassword === cleanPass)) {
    return true;
  }

  // 3. Resilient demo passwords for seed testing accounts
  const isDemoUser = ['usr_farmer_rajesh', 'usr_farmer_anita', 'usr_consumer_tanmay'].includes(user.id) ||
    ['rajesh_farmer', 'anita_orchards', 'tanmay123'].includes(user.username);

  if (isDemoUser) {
    const lowerPass = cleanPass.toLowerCase();

    if (user.role === 'farmer') {
      const validFarmerPasses = [
        'farmer@123',
        'farmer123',
        'farmer',
        '123456',
        'password',
        'password123',
        'rajesh',
        'rajesh123',
        'anita',
        'anita123',
      ];
      if (validFarmerPasses.includes(lowerPass) || cleanPass === 'Farmer@123') {
        return true;
      }
    } else if (user.role === 'consumer') {
      const validConsumerPasses = [
        'consumer@123',
        'consumer123',
        'consumer',
        'tanmay',
        'tanmay123',
        '123456',
        'password',
        'password123',
      ];
      if (validConsumerPasses.includes(lowerPass) || cleanPass === 'Consumer@123') {
        return true;
      }
    }
  }

  return false;
}

// Initial seed data with authentic Indian agricultural farms, multi-farmer produce, and visit slots
function getInitialData(): DatabaseSchema {
  const farmer1Salt = crypto.randomBytes(16).toString('hex');
  const farmer1Hash = crypto.pbkdf2Sync('Farmer@123', farmer1Salt, 1000, 64, 'sha512').toString('hex');

  const farmer2Salt = crypto.randomBytes(16).toString('hex');
  const farmer2Hash = crypto.pbkdf2Sync('Farmer@123', farmer2Salt, 1000, 64, 'sha512').toString('hex');

  const consumerSalt = crypto.randomBytes(16).toString('hex');
  const consumerHash = crypto.pbkdf2Sync('Consumer@123', consumerSalt, 1000, 64, 'sha512').toString('hex');

  const farmer1Id = 'usr_farmer_rajesh';
  const farmer2Id = 'usr_farmer_anita';
  const consumer1Id = 'usr_consumer_tanmay';

  const adminSalt = crypto.randomBytes(16).toString('hex');
  const adminHash = crypto.pbkdf2Sync('Tfarm19/1#', adminSalt, 1000, 64, 'sha512').toString('hex');

  const users: DatabaseSchema['users'] = [
    {
      id: 'usr_admin_master',
      role: 'admin',
      username: 'Adminf&c_19',
      email: 'admin.kisansetu@gmail.com',
      fullName: 'Master Administrator (F&C Oversight)',
      phone: '+91 99999 00019',
      passwordHash: adminHash,
      salt: adminSalt,
      plainPassword: 'Tfarm19/1#',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: farmer1Id,
      role: 'farmer',
      username: 'rajesh_farmer',
      email: 'rajesh@greenvalley.in',
      fullName: 'Rajesh Kumar Patil',
      phone: '+91 98220 14567',
      passwordHash: farmer1Hash,
      salt: farmer1Salt,
      plainPassword: 'Farmer@123',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      farmDetails: {
        farmName: 'Green Valley Organic Agro Farm',
        locationAddress: 'Survey No. 42, Dindori Road, Nashik, Maharashtra',
        lat: 19.9975,
        lng: 73.7898,
        farmSize: 18,
        farmSizeUnit: 'acre',
        farmType: 'Organic Fruit & Vegetable Agro Farm',
        experienceYears: 14,
        farmingStyle: 'Organic',
        cropsGrown: ['Tomato', 'Spinach', 'Carrot', 'Potato', 'Strawberry', 'Guava', 'Cauliflower'],
        bio: 'Certified pesticide-free natural farm. Every morning produce is hand-picked at 5:30 AM to guarantee maximum crispness and nutritional density. We welcome families for weekend agro-tourism.',
        bannerImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80',
      },
    },
    {
      id: farmer2Id,
      role: 'farmer',
      username: 'anita_orchards',
      email: 'anita@suryaorchards.in',
      fullName: 'Anita Ramesh Shinde',
      phone: '+91 98450 78123',
      passwordHash: farmer2Hash,
      salt: farmer2Salt,
      plainPassword: 'Farmer@123',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      farmDetails: {
        farmName: 'Surya Sunburst Orchards & Agro Tourism',
        locationAddress: 'Khadakwasla Valley, Pune Hinterlands, Maharashtra',
        lat: 18.4350,
        lng: 73.7650,
        farmSize: 28,
        farmSizeUnit: 'acre',
        farmType: 'Fruit Orchard & Agro-Tourism Centre',
        experienceYears: 20,
        farmingStyle: 'Mixed Farming',
        cropsGrown: ['Mango', 'Apple', 'Pomegranate', 'Banana', 'Tomato', 'Cabbage', 'Papaya'],
        bio: 'Specialist in sun-ripened heritage fruits, natural drip irrigation, and vermicompost soil enrichment. Enjoy fruit picking tours and farm-to-table breakfast in our orchard pavilion.',
        bannerImage: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&q=80',
      },
    },
    {
      id: consumer1Id,
      role: 'consumer',
      username: 'tanmay123',
      email: 'tanmaymore0220@gmail.com',
      fullName: 'Tanmay More',
      phone: '+91 98765 43210',
      passwordHash: consumerHash,
      salt: consumerSalt,
      plainPassword: 'Consumer@123',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      currentBrowsingLocation: {
        label: 'Baner, Pune, Maharashtra',
        lat: 18.5590,
        lng: 73.7868,
      },
      deliveryAddresses: [
        {
          id: 'addr_1',
          label: 'Home',
          street: 'Flat 402, Sunrise Meadows, Baner-Pashan Link Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
          lat: 18.5590,
          lng: 73.7868,
          isDefault: true,
        },
        {
          id: 'addr_2',
          label: 'Office',
          street: 'Tower B, Tech Park, Hinjewadi Phase 1',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411057',
          lat: 18.5912,
          lng: 73.7389,
          isDefault: false,
        },
      ],
    },
  ];

  // Notice: Both Rajesh and Anita sell "Fresh Organic Tomatoes" and "Crisp Carrots"
  // so consumers can compare prices, distances, and ratings per Requirement 7.3!
  const products: Product[] = [
    {
      id: 'prod_tomatoes_rajesh',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmerLocation: 'Nashik, Maharashtra',
      farmLat: 19.9975,
      farmLng: 73.7898,
      name: 'Farm-Fresh Desi Tomatoes',
      category: 'Vegetable',
      quantity: 85,
      unit: 'kg',
      pricePerUnit: 35,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80',
      description: 'Sun-ripened desi tomatoes bursting with tanginess and juice. Grown without synthetic pesticides using neem cake and cow dung compost.',
      rating: 4.8,
      reviewsCount: 34,
      harvestDate: 'Today, 6:00 AM',
    },
    {
      id: 'prod_tomatoes_anita',
      farmerId: farmer2Id,
      farmName: 'Surya Sunburst Orchards',
      farmerName: 'Anita Ramesh Shinde',
      farmerLocation: 'Khadakwasla, Pune',
      farmLat: 18.4350,
      farmLng: 73.7650,
      name: 'Farm-Fresh Desi Tomatoes',
      category: 'Vegetable',
      quantity: 110,
      unit: 'kg',
      pricePerUnit: 32,
      status: 'available',
      organic: false,
      image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80',
      description: 'Firm, juicy hybrid-desi vine tomatoes harvested fresh from the Khadakwasla valley. Excellent for daily cooking and rich gravies.',
      rating: 4.6,
      reviewsCount: 22,
      harvestDate: 'Yesterday Evening',
    },
    {
      id: 'prod_strawberries_rajesh',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmerLocation: 'Nashik, Maharashtra',
      farmLat: 19.9975,
      farmLng: 73.7898,
      name: 'Sweet Ruby Strawberries (Winter Harvest)',
      category: 'Fruit',
      quantity: 45,
      unit: 'box',
      pricePerUnit: 90,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&q=80',
      description: 'Sweet, fragrant, handpicked ruby strawberries packed in 250g ventilated eco-punnets right on the farm.',
      rating: 4.9,
      reviewsCount: 52,
      harvestDate: 'Today, 5:45 AM',
    },
    {
      id: 'prod_mangoes_anita',
      farmerId: farmer2Id,
      farmName: 'Surya Sunburst Orchards',
      farmerName: 'Anita Ramesh Shinde',
      farmerLocation: 'Khadakwasla, Pune',
      farmLat: 18.4350,
      farmLng: 73.7650,
      name: 'Alphonso Ratnagiri Grafted Mangoes',
      category: 'Fruit',
      quantity: 30,
      unit: 'dozen',
      pricePerUnit: 650,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80',
      description: 'Naturally grass-hay ripened royal Alphonso mangoes. Golden pulp, zero carbide, unmatched aroma and buttery texture.',
      rating: 5.0,
      reviewsCount: 78,
      harvestDate: 'Yesterday',
    },
    {
      id: 'prod_spinach_rajesh',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmerLocation: 'Nashik, Maharashtra',
      farmLat: 19.9975,
      farmLng: 73.7898,
      name: 'Tender Organic Baby Spinach (Palak)',
      category: 'Vegetable',
      quantity: 60,
      unit: 'bunch',
      pricePerUnit: 25,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80',
      description: 'Crisp green baby spinach leaves washed with pure spring water. Rich in iron, crisp stems, ready to cook.',
      rating: 4.7,
      reviewsCount: 19,
      harvestDate: 'Today, 6:15 AM',
    },
    {
      id: 'prod_carrots_rajesh',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmerLocation: 'Nashik, Maharashtra',
      farmLat: 19.9975,
      farmLng: 73.7898,
      name: 'Sweet Crunchy Red Carrots',
      category: 'Vegetable',
      quantity: 90,
      unit: 'kg',
      pricePerUnit: 40,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80',
      description: 'Naturally sweet winter red carrots pulled fresh from loose loamy soil. Crunchy, sweet, perfect for salads and halwa.',
      rating: 4.8,
      reviewsCount: 27,
      harvestDate: 'Today, 6:30 AM',
    },
    {
      id: 'prod_pomegranates_anita',
      farmerId: farmer2Id,
      farmName: 'Surya Sunburst Orchards',
      farmerName: 'Anita Ramesh Shinde',
      farmerLocation: 'Khadakwasla, Pune',
      farmLat: 18.4350,
      farmLng: 73.7650,
      name: 'Bhagwa Ruby Pomegranate (Anar)',
      category: 'Fruit',
      quantity: 70,
      unit: 'kg',
      pricePerUnit: 140,
      status: 'available',
      organic: false,
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
      description: 'Deep crimson arils filled with sweet antioxidant juice. Thin skin with soft chewable seeds.',
      rating: 4.7,
      reviewsCount: 31,
      harvestDate: 'Yesterday',
    },
    {
      id: 'prod_cauliflower_rajesh',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmerLocation: 'Nashik, Maharashtra',
      farmLat: 19.9975,
      farmLng: 73.7898,
      name: 'Pure White Organic Cauliflower',
      category: 'Vegetable',
      quantity: 40,
      unit: 'piece',
      pricePerUnit: 35,
      status: 'available',
      organic: true,
      image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&q=80',
      description: 'Pristine snow-white dense curds wrapped in fresh green protective outer leaves. Chemical-free cultivation.',
      rating: 4.6,
      reviewsCount: 16,
      harvestDate: 'Today, 6:00 AM',
    },
  ];

  const slots: FarmVisitSlot[] = [
    {
      id: 'slot_gv_weekend_morning',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmLocation: 'Dindori Road, Nashik',
      farmLat: 19.9975,
      farmLng: 73.7898,
      date: '2026-09-12',
      startTime: '08:30 AM',
      endTime: '11:30 AM',
      maxVisitors: 20,
      bookedCount: 6,
      pricePerPerson: 150,
      activities: ['Guided Organic Farm Walk', 'Strawberry Picking', 'Cow Milking Demo', 'Fresh Herbal Tea & Jaggery Poha'],
      status: 'open',
      notes: 'Please wear comfortable walking shoes and bring a sun hat. Children under 5 enter free!',
    },
    {
      id: 'slot_gv_weekend_afternoon',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      farmerName: 'Rajesh Kumar Patil',
      farmLocation: 'Dindori Road, Nashik',
      farmLat: 19.9975,
      farmLng: 73.7898,
      date: '2026-09-12',
      startTime: '03:30 PM',
      endTime: '06:30 PM',
      maxVisitors: 25,
      bookedCount: 12,
      pricePerPerson: 150,
      activities: ['Sunset Harvest Walk', 'Vegetable Picking Basket', 'Compost Making Masterclass', 'Farm-to-Plate Refreshments'],
      status: 'open',
      notes: 'You receive a 1 kg harvest basket included with every booking.',
    },
    {
      id: 'slot_so_sunday_tour',
      farmerId: farmer2Id,
      farmName: 'Surya Sunburst Orchards & Agro Tourism',
      farmerName: 'Anita Ramesh Shinde',
      farmLocation: 'Khadakwasla Valley, Pune',
      farmLat: 18.4350,
      farmLng: 73.7650,
      date: '2026-09-13',
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      maxVisitors: 30,
      bookedCount: 15,
      pricePerPerson: 200,
      activities: ['Fruit Orchard Heritage Walk', 'Tractor Ride Through Valley', 'Alphonso Tree Grafting Demo', 'Orchard Fresh Breakfast'],
      status: 'open',
      notes: 'Scenic hillside farm right next to Khadakwasla reservoir breeze. Parking available on-site.',
    },
  ];

  const bookings: FarmVisitBooking[] = [
    {
      id: 'bk_sample_1',
      bookingCode: 'F2H-VISIT-8201',
      slotId: 'slot_so_sunday_tour',
      farmerId: farmer2Id,
      farmName: 'Surya Sunburst Orchards & Agro Tourism',
      consumerId: consumer1Id,
      consumerName: 'Tanmay More',
      consumerPhone: '+91 98765 43210',
      date: '2026-09-13',
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      visitorCount: 3,
      pricePerPerson: 200,
      totalAmount: 600,
      status: 'Confirmed',
      bookedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord_sample_1',
      orderCode: 'F2H-ORD-4921',
      consumerId: consumer1Id,
      consumerName: 'Tanmay More',
      consumerPhone: '+91 98765 43210',
      farmerId: farmer1Id,
      farmName: 'Green Valley Organic Agro Farm',
      items: [
        {
          productId: 'prod_tomatoes_rajesh',
          productName: 'Farm-Fresh Desi Tomatoes',
          category: 'Vegetable',
          unit: 'kg',
          quantity: 3,
          pricePerUnit: 35,
          image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80',
        },
        {
          productId: 'prod_strawberries_rajesh',
          productName: 'Sweet Ruby Strawberries (Winter Harvest)',
          category: 'Fruit',
          unit: 'box',
          quantity: 2,
          pricePerUnit: 90,
          image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&q=80',
        },
      ],
      subtotal: 285,
      deliveryFee: 40,
      total: 325,
      deliveryAddress: {
        label: 'Home',
        street: 'Flat 402, Sunrise Meadows, Baner-Pashan Link Road',
        city: 'Pune',
        pincode: '411045',
      },
      status: 'Out for Delivery',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      estimatedDelivery: 'Today by 1:30 PM',
    },
  ];

  return {
    users,
    products,
    slots,
    bookings,
    orders,
    workerRequests: [
      {
        id: 'req_labor_1',
        requestCode: 'WRK-2026-081',
        farmerId: farmer1Id,
        farmerName: 'Rajesh Patil',
        farmerPhone: '+91 98220 12345',
        farmName: 'Green Valley Organic Agro Farm',
        farmLocation: 'Near Sinhagad Fort Valley, Haveli, Pune',
        jobCategory: 'Harvesting & Picking',
        cropName: 'Desi Tomatoes & Bell Peppers',
        workersNeeded: 6,
        assignedWorkersCount: 6,
        startDate: '2026-09-12',
        endDate: '2026-09-15',
        durationDays: 3,
        workingHours: '07:30 AM - 04:30 PM',
        wagePerWorker: 550,
        wageType: 'Daily',
        urgency: 'Immediate (Within 24 Hours)',
        mealsProvided: true,
        transportProvided: true,
        accommodationProvided: false,
        specialInstructions: 'Careful handpicking into crates. Gloves and afternoon vegetarian lunch provided at the farm gazebo.',
        status: 'Workers Assigned',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        assignedContractor: {
          groupName: 'Shivaji Agro Labor Cooperative',
          contactPerson: 'Babanrao Shinde',
          phone: '+91 94230 55123',
          workersConfirmed: 6,
          rating: 4.8,
        },
      },
      {
        id: 'req_labor_2',
        requestCode: 'WRK-2026-089',
        farmerId: farmer1Id,
        farmerName: 'Rajesh Patil',
        farmerPhone: '+91 98220 12345',
        farmName: 'Green Valley Organic Agro Farm',
        farmLocation: 'Near Sinhagad Fort Valley, Haveli, Pune',
        jobCategory: 'Weeding & De-stoning',
        cropName: 'Strawberry Raised Beds',
        workersNeeded: 4,
        assignedWorkersCount: 0,
        startDate: '2026-09-16',
        endDate: '2026-09-18',
        durationDays: 2,
        workingHours: '08:00 AM - 05:00 PM',
        wagePerWorker: 500,
        wageType: 'Daily',
        urgency: 'Next 2-3 Days',
        mealsProvided: true,
        transportProvided: false,
        accommodationProvided: false,
        specialInstructions: 'Manual weeding between drip lines without damaging plastic mulch sheet. Refreshments provided twice a day.',
        status: 'Open / Seeking Workers',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
    plots: [
      {
        id: 'plot_rajesh_1',
        farmerId: 'usr_farmer_rajesh',
        farmName: 'Green Valley Organic Agro Farm',
        farmerName: 'Rajesh Kumar Patil',
        farmerPhone: '+91 98220 14567',
        farmLocation: 'Dindori Road, Near Gangapur Dam, Nashik, Maharashtra',
        farmLat: 20.045,
        farmLng: 73.742,
        plotName: 'Riverbed Black Soil Terrace Block A',
        plotIdentifier: 'PLOT-GV-01',
        areaSize: 1,
        areaUnit: 'acre',
        soilType: 'Fertile Deep Black Cotton Soil (Riverbed Alluvial)',
        waterSource: 'Borewell & Drip Irrigation Network',
        availableFrom: '2026-09-15',
        status: 'available',
        supportedCrops: [
          'Organic Tomatoes (Arka Rakshak)',
          'Exotic Colored Bell Peppers (Capsicum)',
          'Desi Sharbati Organic Wheat',
        ],
        farmingStyle: 'Organic',
        description:
          'Prime river-facing plot enriched with decomposed cow-dung manure and vermicompost for 5 continuous seasons. Equipped with automated drip emitters and solar fencing. Consumer funding covers organic seeds, micro-nutrients, water, power, and our daily dedicated farm labour.',
        images: [
          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
        ],
        termsNote:
          'Land ownership remains solely with Rajesh Kumar Patil. Consumer retains 100% legal entitlement to the harvested produce and proceeds thereof.',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: 'plot_rajesh_2',
        farmerId: 'usr_farmer_rajesh',
        farmName: 'Green Valley Organic Agro Farm',
        farmerName: 'Rajesh Kumar Patil',
        farmerPhone: '+91 98220 14567',
        farmLocation: 'Dindori Road, Near Gangapur Dam, Nashik, Maharashtra',
        farmLat: 20.045,
        farmLng: 73.742,
        plotName: 'High-Tunnel Raised Mulch Bed Block C',
        plotIdentifier: 'PLOT-GV-02',
        areaSize: 0.5,
        areaUnit: 'acre',
        soilType: 'Slightly Acidic Humus-Rich Sandy Loam',
        waterSource: 'Rainwater Harvest Reservoir + Micro-Drip',
        availableFrom: '2026-09-20',
        status: 'available',
        supportedCrops: [
          'Premium Strawberries (Winter Dawn)',
          'Baby Potatoes & Seed Tubers (Kufri Pukhraj)',
          'Golden Sweet Corn (Sugar-75)',
        ],
        farmingStyle: 'Organic',
        description:
          'Dedicated raised beds with UV stabilized black/silver mulch. Ideal for winter strawberry plantation or exotic sweet corn. Complete caretaking, weeding, pollination management, and harvesting will be handled by our experienced team.',
        images: [
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
        ],
        termsNote:
          'Land ownership remains solely with farmer. Consumer owns all harvest rights and can either take produce or sell in marketplace.',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'plot_anita_1',
        farmerId: 'usr_farmer_anita',
        farmName: 'Surya Sunburst Orchards & Agro Tourism',
        farmerName: 'Anita Ramesh Shinde',
        farmerPhone: '+91 94231 78901',
        farmLocation: 'Khadakwasla Backwaters Road, Kudje Village, Pune, Maharashtra',
        farmLat: 18.435,
        farmLng: 73.762,
        plotName: 'Valley View Turmeric & Spice Enclave',
        plotIdentifier: 'PLOT-SS-01',
        areaSize: 10,
        areaUnit: 'guntha',
        soilType: 'Red Lateritic Loam rich in iron and compost',
        waterSource: 'Khadakwasla Dam Gravity Canal + Perennial Well',
        availableFrom: '2026-09-18',
        status: 'available',
        supportedCrops: [
          'Salem Organic Turmeric (Haldi)',
          'Organic Tomatoes (Arka Rakshak)',
          'Exotic Colored Bell Peppers (Capsicum)',
        ],
        farmingStyle: 'Organic',
        description:
          'Sheltered valley terrace plot with excellent drainage and full sun exposure. Ideal for turmeric cultivation or seasonal bell peppers. Regular photographic and video updates provided at every cultivation milestone.',
        images: [
          'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80',
        ],
        termsNote:
          'Strict separation of land title and farming rights. Farmer manages soil and crop; consumer owns 100% crop output.',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
    ],
    partnerships: [
      {
        id: 'part_seed_01',
        partnershipCode: 'FP-2026-001',
        plotId: 'plot_rajesh_1',
        plotName: 'Riverbed Black Soil Terrace Block A',
        plotIdentifier: 'PLOT-GV-01',
        areaSize: 0.25,
        areaUnit: 'acre',
        farmerId: 'usr_farmer_rajesh',
        farmName: 'Green Valley Organic Agro Farm',
        farmerName: 'Rajesh Kumar Patil',
        farmerPhone: '+91 98220 14567',
        farmerLocation: 'Dindori Road, Near Gangapur Dam, Nashik, Maharashtra',
        farmLat: 20.045,
        farmLng: 73.742,
        consumerId: 'usr_consumer_tanmay',
        consumerName: 'Tanmay More',
        consumerPhone: '+91 98230 45678',
        consumerEmail: 'tanmaymore0220@gmail.com',
        cropName: 'Organic Tomatoes (Arka Rakshak)',
        farmingDurationDays: 105,
        startDate: '2026-08-01',
        expectedHarvestDate: '2026-11-15',
        costBreakdown: {
          seedsPlantingCost: 3000,
          fertilizersChemicalsCost: 4125,
          waterIrrigationCost: 2000,
          electricityUtilitiesCost: 1375,
          otherExpensesCost: 1000,
          farmerCultivationServiceFee: 4500,
          totalEstimatedCost: 16000,
        },
        totalFundingAmount: 16000,
        paymentStatus: 'Escrow Secured',
        paymentMethod: 'UPI Instant Transfer (KisanSetu Escrow)',
        paymentDate: '2026-08-01',
        transactionId: 'TXN_KSE_8892147',
        status: 'active',
        currentStage: 'Flowering & Fruiting',
        progressPercentage: 65,
        milestones: [
          {
            id: 'm1',
            stage: 'Plot Preparation',
            title: 'Deep Tillage & Cow Dung Compost Enrichment',
            description:
              'Plot ploughed twice, clods crushed, and 2 tractor trolleys of aged organic manure blended into soil.',
            date: '2026-08-03',
            photoUrl:
              'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
            recordedBy: 'farmer',
          },
          {
            id: 'm2',
            stage: 'Sowing & Planting',
            title: 'Transplanted Certified Arka Rakshak Seedlings',
            description:
              'Transplanted 2,200 healthy seedlings on raised drip beds with 60cm plant-to-plant spacing.',
            date: '2026-08-15',
            photoUrl:
              'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=600&q=80',
            recordedBy: 'farmer',
          },
          {
            id: 'm3',
            stage: 'Irrigation & Care',
            title: 'Staking, Pruning & Jeevamrut Application',
            description:
              'Bamboo stakes erected for vine support. Applied freshly fermented Jeevamrut foliar spray for vigorous root development.',
            date: '2026-08-30',
            photoUrl:
              'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80',
            recordedBy: 'farmer',
          },
          {
            id: 'm4',
            stage: 'Flowering & Fruiting',
            title: 'Profuse Flowering & Tender Green Fruit Clusters',
            description:
              'Over 85% plants in heavy bloom with first green fruit bunches set. Drip irrigation adjusted to morning hours.',
            date: '2026-09-08',
            photoUrl:
              'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
            recordedBy: 'farmer',
          },
        ],
        legalTerms: {
          farmerLandOwnershipConfirmed: true,
          consumerProduceRightsConfirmed: true,
          agreementSummary:
            'Agreement executed under KisanSetu Consumer-Funded Agriculture Framework. Plot ownership is unencumbered and strictly retained by Farmer Rajesh Kumar Patil. Consumer Tanmay More possesses sole and unalienable entitlement to the entire harvest produce resulting from this project, with free option to receive doorstep delivery or market liquidation.',
        },
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    passwordResetCodes: [],
  };
}

class Database {
  private data: DatabaseSchema;
  private version: number = 1;

  constructor() {
    this.ensureDataDir();
    this.data = this.load();
    this.version = this.data.dbVersion || 1;
    if (!this.data.activities || this.data.activities.length === 0) {
      this.data.activities = this.generateInitialActivities();
      this.save();
    }
  }

  private generateInitialActivities(): AdminActivity[] {
    return [
      {
        id: 'act_seed_1',
        type: 'user_registered',
        title: 'New Farmer Registered: Rajesh Kumar Patil',
        description: 'Green Valley Organic Agro Farm registered with 18 acres in Nashik',
        timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
        userId: 'usr_farmer_rajesh',
        userName: 'Rajesh Kumar Patil',
        userRole: 'farmer',
      },
      {
        id: 'act_seed_2',
        type: 'user_registered',
        title: 'New Farmer Registered: Anita Ramesh Shinde',
        description: 'Surya Sunburst Orchards & Agro Tourism registered in Khadakwasla, Pune',
        timestamp: new Date(Date.now() - 25 * 86400000).toISOString(),
        userId: 'usr_farmer_anita',
        userName: 'Anita Ramesh Shinde',
        userRole: 'farmer',
      },
      {
        id: 'act_seed_3',
        type: 'user_registered',
        title: 'New Consumer Registered: Tanmay More',
        description: 'Tanmay More (@tanmay123) registered from Baner, Pune',
        timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
        userId: 'usr_consumer_tanmay',
        userName: 'Tanmay More',
        userRole: 'consumer',
      },
      {
        id: 'act_seed_4',
        type: 'order_placed',
        title: 'New Harvest Order #F2H-8821: ₹1,450',
        description: 'Consumer Tanmay More placed order for fresh harvest produce from Green Valley Farm',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        userId: 'usr_consumer_tanmay',
        userName: 'Tanmay More',
        userRole: 'consumer',
      },
    ];
  }

  public getVersion(): number {
    return this.version;
  }

  public recordActivity(
    type: AdminActivityType,
    title: string,
    description: string,
    user?: { id?: string; fullName?: string; username?: string; role?: any },
    metadata?: Record<string, any>
  ): AdminActivity {
    const activity: AdminActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.fullName || user?.username,
      userRole: user?.role,
      metadata,
    };

    if (!this.data.activities) {
      this.data.activities = [];
    }
    this.data.activities.unshift(activity);
    if (this.data.activities.length > 250) {
      this.data.activities = this.data.activities.slice(0, 250);
    }
    this.version++;
    this.data.dbVersion = this.version;
    this.save();

    // Broadcast live event to all connected admin listeners / SSE streams
    dbEvents.emit('activity', activity, this.version);
    return activity;
  }

  public recordUserLogin(user: any) {
    if (!user) return;
    this.recordActivity(
      'user_login',
      `${user.fullName || user.username} Logged In`,
      `${user.role === 'farmer' ? 'Farmer' : user.role === 'consumer' ? 'Consumer' : 'Admin'} accessed the platform`,
      user,
      { role: user.role, email: user.email }
    );
  }

  public getRecentActivities(limit = 60): AdminActivity[] {
    return (this.data.activities || []).slice(0, limit);
  }

  public getLatestActivity(): AdminActivity | null {
    return (this.data.activities && this.data.activities[0]) || null;
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create data directory, continuing with in-memory store:', err);
    }
  }

  private load(): DatabaseSchema {
    try {
      let content: string | null = null;
      if (fs.existsSync(DB_FILE)) {
        content = fs.readFileSync(DB_FILE, 'utf-8');
      } else {
        // Fallback: check if bundled data/db.json exists in project root
        const bundledPath = path.join(process.cwd(), 'data', 'db.json');
        if (fs.existsSync(bundledPath)) {
          content = fs.readFileSync(bundledPath, 'utf-8');
        }
      }

      if (content) {
        const parsed = JSON.parse(content);
        let modified = false;

        if (!parsed.workerRequests) {
          const initial = getInitialData();
          parsed.workerRequests = initial.workerRequests || [];
          modified = true;
        }

        if (!parsed.plots || parsed.plots.length === 0) {
          const initial = getInitialData();
          parsed.plots = initial.plots || [];
          modified = true;
        }

        if (!parsed.partnerships || parsed.partnerships.length === 0) {
          const initial = getInitialData();
          parsed.partnerships = initial.partnerships || [];
          modified = true;
        }

        // Ensure Admin user exists with credentials: Adminf&c_19 / Tfarm19/1#
        const adminFound = parsed.users.find(
          (u: any) => u.username === 'Adminf&c_19' || (u.username && u.username.toLowerCase() === 'adminf&c_19')
        );
        if (!adminFound) {
          const adminSalt = crypto.randomBytes(16).toString('hex');
          const adminHash = crypto.pbkdf2Sync('Tfarm19/1#', adminSalt, 1000, 64, 'sha512').toString('hex');
          parsed.users.unshift({
            id: 'usr_admin_master',
            role: 'admin',
            username: 'Adminf&c_19',
            email: 'admin.kisansetu@gmail.com',
            fullName: 'Master Administrator (F&C Oversight)',
            phone: '+91 99999 00019',
            passwordHash: adminHash,
            salt: adminSalt,
            plainPassword: 'Tfarm19/1#',
            createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          });
          modified = true;
        } else {
          adminFound.role = 'admin';
          adminFound.username = 'Adminf&c_19';
          adminFound.plainPassword = 'Tfarm19/1#';
          modified = true;
        }

        // Ensure plainPassword is populated for all existing users so admin can view them
        parsed.users.forEach((u: any) => {
          if (!u.plainPassword) {
            if (u.username === 'rajesh_farmer' || u.id === 'usr_farmer_rajesh') {
              u.plainPassword = 'Farmer@123';
              modified = true;
            } else if (u.username === 'anita_orchards' || u.id === 'usr_farmer_anita') {
              u.plainPassword = 'Farmer@123';
              modified = true;
            } else if (u.username === 'tanmay123' || u.id === 'usr_consumer_tanmay') {
              u.plainPassword = 'Consumer@123';
              modified = true;
            } else if (u.username === 'Adminf&c_19' || u.id === 'usr_admin_master') {
              u.plainPassword = 'Tfarm19/1#';
              modified = true;
            } else {
              u.plainPassword = u.role === 'farmer' ? 'Farmer@123' : 'Consumer@123';
              modified = true;
            }
          }
        });

        if (modified) {
          this.save(parsed);
        }

        return parsed;
      }
    } catch (err) {
      console.error('Error loading db.json, generating seed data:', err);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write db.json to disk (serverless/read-only), retaining in-memory state:', err);
    }
  }

  // --- Users & Auth ---
  getUsers() {
    return this.data.users;
  }

  ensureAdminUser() {
    let admin = this.data.users.find(
      (u) => u.username === 'Adminf&c_19' || (u.username && u.username.toLowerCase() === 'adminf&c_19')
    );
    if (!admin) {
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminHash = crypto.pbkdf2Sync('Tfarm19/1#', adminSalt, 1000, 64, 'sha512').toString('hex');
      admin = {
        id: 'usr_admin_master',
        role: 'admin' as const,
        username: 'Adminf&c_19',
        email: 'admin.kisansetu@gmail.com',
        fullName: 'Master Administrator (F&C Oversight)',
        phone: '+91 99999 00019',
        passwordHash: adminHash,
        salt: adminSalt,
        plainPassword: 'Tfarm19/1#',
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      };
      this.data.users.unshift(admin);
      this.save();
    }
    return admin;
  }

  findUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  findUserByUsername(username: string) {
    if (!username) return undefined;
    const clean = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username && u.username.toLowerCase() === clean);
  }

  findUserByEmail(email: string) {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email && u.email.trim().toLowerCase() === clean);
  }

  findUserByEmailOrUsername(identifier: string) {
    return this.findUserByIdentifier(identifier);
  }

  findUserByIdentifier(identifier: string) {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    if (!clean) return undefined;

    // 0. Secret Admin check
    if (clean === 'adminf&c_19' || clean === 'adminf&c' || clean === 'admin') {
      return this.data.users.find((u) => u.username === 'Adminf&c_19') || this.ensureAdminUser();
    }

    // 1. Match exact username
    const byUsername = this.data.users.find(
      (u) => u.username && u.username.trim().toLowerCase() === clean
    );
    if (byUsername) return byUsername;

    // 2. Match exact email
    const byEmail = this.data.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === clean
    );
    if (byEmail) return byEmail;

    // 3. Match phone number (digits only, e.g. 9822014567 or +91 98220 14567)
    const inputDigits = clean.replace(/\D/g, '');
    if (inputDigits.length >= 7) {
      const byPhone = this.data.users.find((u) => {
        if (!u.phone) return false;
        const uDigits = u.phone.replace(/\D/g, '');
        return uDigits.endsWith(inputDigits) || inputDigits.endsWith(uDigits);
      });
      if (byPhone) return byPhone;
    }

    // 4. Match full name
    const byFullName = this.data.users.find(
      (u) => u.fullName && u.fullName.trim().toLowerCase() === clean
    );
    if (byFullName) return byFullName;

    // 5. Explicit seed demo usernames/aliases
    if (clean === 'rajesh' || clean === 'rajeshpatil' || clean === 'rajesh_farmer') {
      return this.data.users.find((u) => u.username === 'rajesh_farmer');
    }
    if (clean === 'anita' || clean === 'anitakulkarni' || clean === 'anita_orchards') {
      return this.data.users.find((u) => u.username === 'anita_orchards');
    }
    if (clean === 'tanmay' || clean === 'tanmaymore' || clean === 'tanmay123') {
      return this.data.users.find((u) => u.username === 'tanmay123');
    }

    return undefined;
  }

  createUser(user: User & { passwordHash: string; salt: string; plainPassword?: string }) {
    // Database enforces case-insensitive unique username
    const exists = this.findUserByUsername(user.username);
    if (exists) {
      throw new Error(`Username "${user.username}" is already taken.`);
    }
    this.data.users.push(user);
    this.save();

    this.recordActivity(
      'user_registered',
      `New ${user.role === 'farmer' ? 'Farmer' : 'Consumer'} Registered: ${user.fullName}`,
      `${user.fullName} (@${user.username}) registered as ${user.role === 'farmer' ? 'Farmer at ' + (user.farmDetails?.farmName || 'Farm') : 'Consumer'} with phone ${user.phone || 'N/A'}`,
      user,
      { role: user.role, phone: user.phone, email: user.email, farmName: user.farmDetails?.farmName }
    );

    return user;
  }

  updateUser(id: string, updates: Partial<User>) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  updateFarmerProfile(id: string, updates: { fullName?: string; phone?: string; farmDetails?: any }) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const user = this.data.users[index];
    const newFarmDetails = {
      ...user.farmDetails!,
      ...updates.farmDetails,
    };
    this.data.users[index] = {
      ...user,
      fullName: updates.fullName || user.fullName,
      phone: updates.phone || user.phone,
      farmDetails: newFarmDetails,
    };

    // Cascade coordinates, farm name, and location address to farmer's products and visit slots
    if (updates.farmDetails) {
      const { lat, lng, locationAddress, farmName } = updates.farmDetails;
      this.data.products.forEach((p) => {
        if (p.farmerId === id) {
          if (lat !== undefined && !isNaN(Number(lat))) p.farmLat = Number(lat);
          if (lng !== undefined && !isNaN(Number(lng))) p.farmLng = Number(lng);
          if (locationAddress) p.farmerLocation = locationAddress;
          if (farmName) p.farmName = farmName;
        }
      });
      this.data.slots.forEach((s) => {
        if (s.farmerId === id) {
          if (lat !== undefined && !isNaN(Number(lat))) s.farmLat = Number(lat);
          if (lng !== undefined && !isNaN(Number(lng))) s.farmLng = Number(lng);
          if (locationAddress) s.farmLocation = locationAddress;
          if (farmName) s.farmName = farmName;
        }
      });
    }

    this.save();

    this.recordActivity(
      'profile_updated',
      `Farmer Profile Updated: ${user.fullName}`,
      `Updated farm details / coordinates for ${newFarmDetails.farmName}`,
      user,
      { userId: id }
    );

    return this.data.users[index];
  }

  setUserPassword(id: string, passwordHash: string, salt: string, plainPassword?: string) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.data.users[index].passwordHash = passwordHash;
    this.data.users[index].salt = salt;
    if (plainPassword) {
      this.data.users[index].plainPassword = plainPassword;
    }
    this.save();
    return true;
  }

  // Password reset OTP
  saveResetCode(identifier: string, code: string, durationMs = 15 * 60 * 1000) {
    this.data.passwordResetCodes = this.data.passwordResetCodes.filter(
      (r) => r.identifier.toLowerCase() !== identifier.toLowerCase() && r.expiresAt > Date.now()
    );
    this.data.passwordResetCodes.push({
      identifier: identifier.toLowerCase(),
      code,
      expiresAt: Date.now() + durationMs,
    });
    this.save();
  }

  verifyResetCode(identifier: string, code: string): boolean {
    const record = this.data.passwordResetCodes.find(
      (r) =>
        r.identifier.toLowerCase() === identifier.toLowerCase() &&
        r.code === code &&
        r.expiresAt > Date.now()
    );
    return !!record;
  }

  clearResetCode(identifier: string) {
    this.data.passwordResetCodes = this.data.passwordResetCodes.filter(
      (r) => r.identifier.toLowerCase() !== identifier.toLowerCase()
    );
    this.save();
  }

  // --- Products ---
  getProducts(filter?: { category?: string; farmerId?: string; search?: string }) {
    let result = [...this.data.products];
    if (filter?.category && filter.category !== 'All') {
      result = result.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter?.farmerId) {
      result = result.filter((p) => p.farmerId === filter.farmerId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.farmName.toLowerCase().includes(q) ||
          p.farmerName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }

  getProductById(id: string) {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(product: Product) {
    this.data.products.unshift(product);
    this.save();
    this.recordActivity(
      'product_created',
      `New Harvest Listed: ${product.name}`,
      `Farmer ${product.farmerName} listed ${product.name} (${product.quantity} ${product.unit} @ ₹${product.pricePerUnit}/${product.unit})`,
      { id: product.farmerId, fullName: product.farmerName, role: 'farmer' },
      { productId: product.id, price: product.pricePerUnit, quantity: product.quantity }
    );
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>) {
    const index = this.data.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    // Automatic status update based on stock
    let nextStatus = updates.status || this.data.products[index].status;
    const nextQuantity = updates.quantity !== undefined ? updates.quantity : this.data.products[index].quantity;
    if (nextQuantity <= 0) {
      nextStatus = 'out_of_stock';
    } else if (nextQuantity < 10) {
      nextStatus = 'low_stock';
    } else {
      nextStatus = 'available';
    }

    this.data.products[index] = {
      ...this.data.products[index],
      ...updates,
      quantity: Math.max(0, nextQuantity),
      status: nextStatus,
    };
    this.save();

    const p = this.data.products[index];
    this.recordActivity(
      'product_updated',
      `Produce Updated: ${p.name}`,
      `Stock: ${p.quantity} ${p.unit} (${p.status}) at ₹${p.pricePerUnit}/${p.unit}`,
      { id: p.farmerId, fullName: p.farmerName, role: 'farmer' },
      { productId: p.id, status: p.status, quantity: p.quantity }
    );

    return this.data.products[index];
  }

  deleteProduct(id: string) {
    const cleanId = String(id).trim();
    const existing = this.data.products.find((p) => String(p.id).trim() === cleanId);
    const prevLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => String(p.id).trim() !== cleanId);
    this.save();
    if (existing) {
      this.recordActivity(
        'product_deleted',
        `Produce Removed: ${existing.name}`,
        `Harvest produce was removed from marketplace by farmer`,
        { id: existing.farmerId, fullName: existing.farmerName, role: 'farmer' },
        { productId: id }
      );
    }
    return this.data.products.length < prevLen;
  }

  // --- Slots ---
  getSlots(filter?: { farmerId?: string; date?: string }) {
    let result = [...this.data.slots];
    if (filter?.farmerId) {
      result = result.filter((s) => s.farmerId === filter.farmerId);
    }
    if (filter?.date) {
      result = result.filter((s) => s.date === filter.date);
    }
    return result;
  }

  getSlotById(id: string) {
    return this.data.slots.find((s) => s.id === id);
  }

  createSlot(slot: FarmVisitSlot) {
    this.data.slots.unshift(slot);
    this.save();
    this.recordActivity(
      'slot_created',
      `Farm Visit Slot Created: ${slot.date}`,
      `Farmer ${slot.farmName} opened visit slot (${slot.startTime} - ${slot.endTime}) for up to ${slot.maxVisitors} visitors`,
      { id: slot.farmerId, fullName: slot.farmName, role: 'farmer' },
      { slotId: slot.id, date: slot.date }
    );
    return slot;
  }

  updateSlot(id: string, updates: Partial<FarmVisitSlot>) {
    const index = this.data.slots.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.data.slots[index] = { ...this.data.slots[index], ...updates };
    this.save();
    return this.data.slots[index];
  }

  deleteSlot(id: string) {
    this.data.slots = this.data.slots.filter((s) => s.id !== id);
    this.save();
    return true;
  }

  // --- Bookings ---
  getBookings(filter?: { farmerId?: string; consumerId?: string }) {
    let result = [...this.data.bookings];
    if (filter?.farmerId) {
      // Strict isolation rule: Only slots booked for this farmer
      result = result.filter((b) => b.farmerId === filter.farmerId);
    }
    if (filter?.consumerId) {
      result = result.filter((b) => b.consumerId === filter.consumerId);
    }
    return result;
  }

  createBooking(booking: FarmVisitBooking) {
    const slot = this.getSlotById(booking.slotId);
    if (!slot) throw new Error('Selected slot not found');

    const remaining = slot.maxVisitors - slot.bookedCount;
    if (remaining < booking.visitorCount) {
      throw new Error(`Only ${remaining} visitor slots remaining for this time.`);
    }

    // Update slot booked count & status
    const newBookedCount = slot.bookedCount + booking.visitorCount;
    this.updateSlot(slot.id, {
      bookedCount: newBookedCount,
      status: newBookedCount >= slot.maxVisitors ? 'full' : 'open',
    });

    this.data.bookings.unshift(booking);
    this.save();

    this.recordActivity(
      'booking_created',
      `Farm Visit Booked: ${booking.consumerName}`,
      `${booking.consumerName} booked visit at ${booking.farmName} on ${booking.date} for ${booking.visitorCount} visitors (Pass #${booking.bookingCode})`,
      { id: booking.consumerId, fullName: booking.consumerName, role: 'consumer' },
      { bookingId: booking.id, bookingCode: booking.bookingCode, totalFee: booking.totalAmount }
    );

    return booking;
  }

  updateBookingStatus(id: string, status: FarmVisitBooking['status']) {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) return null;

    // If cancelled, restore capacity to slot
    if (booking.status !== 'Cancelled' && status === 'Cancelled') {
      const slot = this.getSlotById(booking.slotId);
      if (slot) {
        const newCount = Math.max(0, slot.bookedCount - booking.visitorCount);
        this.updateSlot(slot.id, {
          bookedCount: newCount,
          status: newCount >= slot.maxVisitors ? 'full' : 'open',
        });
      }
    }

    booking.status = status;
    this.save();

    this.recordActivity(
      'booking_status_updated',
      `Visit Booking #${booking.bookingCode} ${status}`,
      `Visit booking status changed to "${status}"`,
      undefined,
      { bookingId: id, status }
    );

    return booking;
  }

  // --- Orders ---
  getOrders(filter?: { farmerId?: string; consumerId?: string }) {
    let result = [...this.data.orders];
    if (filter?.farmerId) {
      result = result.filter((o) => o.farmerId === filter.farmerId);
    }
    if (filter?.consumerId) {
      result = result.filter((o) => o.consumerId === filter.consumerId);
    }
    return result;
  }

  createOrder(order: Order) {
    // Inventory Synchronization: Decrement stock for each product
    for (const item of order.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        const newQuantity = Math.max(0, product.quantity - item.quantity);
        this.updateProduct(product.id, {
          quantity: newQuantity,
          status: newQuantity <= 0 ? 'out_of_stock' : newQuantity < 10 ? 'low_stock' : 'available',
        });
      }
    }

    this.data.orders.unshift(order);
    this.save();

    this.recordActivity(
      'order_placed',
      `New Order #${order.orderCode}: ₹${order.total}`,
      `Consumer ${order.consumerName} placed an order of ${order.items.length} item(s) from Farm ${order.farmName}`,
      { id: order.consumerId, fullName: order.consumerName, role: 'consumer' },
      { orderId: order.id, total: order.total, farmerId: order.farmerId }
    );

    return order;
  }

  updateOrderStatus(id: string, status: Order['status']) {
    const index = this.data.orders.findIndex((o) => o.id === id);
    if (index === -1) return null;
    this.data.orders[index].status = status;
    this.save();

    const o = this.data.orders[index];
    this.recordActivity(
      'order_status_updated',
      `Order #${o.orderCode} Status: ${status}`,
      `Delivery state updated to "${status}" for consumer ${o.consumerName}`,
      { id: o.farmerId, fullName: o.farmName, role: 'farmer' },
      { orderId: id, status }
    );

    return this.data.orders[index];
  }

  getAppBanner(): string | null {
    return this.data.appConfig?.heroBanner || null;
  }

  setAppBanner(url: string): string {
    if (!this.data.appConfig) {
      this.data.appConfig = {};
    }
    this.data.appConfig.heroBanner = url;
    this.save();
    return url;
  }

  // --- Farm Worker & Labor Requests ---
  getWorkerRequests(filter?: { farmerId?: string }): FarmWorkerRequest[] {
    if (!this.data.workerRequests) {
      this.data.workerRequests = [];
    }
    let list = [...this.data.workerRequests];
    if (filter?.farmerId) {
      list = list.filter((r) => r.farmerId === filter.farmerId);
    }
    return list;
  }

  getWorkerRequestById(id: string): FarmWorkerRequest | undefined {
    if (!this.data.workerRequests) return undefined;
    return this.data.workerRequests.find((r) => r.id === id);
  }

  createWorkerRequest(req: FarmWorkerRequest): FarmWorkerRequest {
    if (!this.data.workerRequests) {
      this.data.workerRequests = [];
    }
    this.data.workerRequests.unshift(req);
    this.save();

    this.recordActivity(
      'worker_request_created',
      `Labor Request: ${req.workersNeeded} Workers Needed`,
      `Farmer ${req.farmerName} requested ${req.workersNeeded} workers for ${req.jobCategory} in ${req.cropName}`,
      { id: req.farmerId, fullName: req.farmerName, role: 'farmer' },
      { requestId: req.id, requestCode: req.requestCode }
    );

    return req;
  }

  updateWorkerRequest(id: string, updates: Partial<FarmWorkerRequest>): FarmWorkerRequest | null {
    if (!this.data.workerRequests) return null;
    const index = this.data.workerRequests.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.data.workerRequests[index] = { ...this.data.workerRequests[index], ...updates };
    this.save();

    const w = this.data.workerRequests[index];
    this.recordActivity(
      'worker_request_status_updated',
      `Labor Request #${w.requestCode} Updated`,
      `Status: "${w.status}", Assigned: ${w.assignedWorkersCount || 0}/${w.workersNeeded}`,
      { id: w.farmerId, fullName: w.farmerName, role: 'farmer' },
      { requestId: id, status: w.status }
    );

    return this.data.workerRequests[index];
  }

  deleteWorkerRequest(id: string): boolean {
    if (!this.data.workerRequests) return false;
    const index = this.data.workerRequests.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.data.workerRequests.splice(index, 1);
    this.save();
    return true;
  }

  getLocalLaborGroups(): LocalLaborGroup[] {
    return [
      {
        id: 'grp_1',
        groupName: 'Shivaji Agro Labor Cooperative',
        leaderName: 'Babanrao Shinde',
        phone: '+91 94230 55123',
        availableWorkers: 18,
        location: 'Saswad - Haveli Belt, Pune',
        specialties: ['Harvesting & Picking', 'Post-Harvest Sorting & Packing', 'Sowing & Transplantation'],
        dailyRateEstimate: '₹500 - ₹600 / day',
        rating: 4.9,
        verified: true,
        distanceKm: 4.5,
      },
      {
        id: 'grp_2',
        groupName: 'Kisan Shakti Mahila Krishi Sangh',
        leaderName: 'Sunita Gaikwad',
        phone: '+91 98901 22345',
        availableWorkers: 12,
        location: 'Khadakwasla Rural Hub, Pune',
        specialties: ['Weeding & De-stoning', 'Vegetable Picking', 'Nursery Transplantation'],
        dailyRateEstimate: '₹450 - ₹550 / day',
        rating: 4.8,
        verified: true,
        distanceKm: 6.2,
      },
      {
        id: 'grp_3',
        groupName: 'Gramin Kisan Seva Toli',
        leaderName: 'Vitthalrao Jadhav',
        phone: '+91 97654 33210',
        availableWorkers: 25,
        location: 'Velhe & Bhor Border, Pune',
        specialties: ['Tractor & Power Tiller Operation', 'Pesticide & Fertilizer Spraying', 'Irrigation & Canal Trenching'],
        dailyRateEstimate: '₹550 - ₹700 / day',
        rating: 4.7,
        verified: true,
        distanceKm: 8.0,
      },
      {
        id: 'grp_4',
        groupName: 'Sahyadri Harvester Crew',
        leaderName: 'Dnyaneshwar More',
        phone: '+91 99221 88765',
        availableWorkers: 15,
        location: 'Donje Village, Sinhagad Base',
        specialties: ['Harvesting & Picking', 'General Farm Maintenance & Fencing', 'Post-Harvest Sorting & Packing'],
        dailyRateEstimate: '₹500 - ₹650 / day',
        rating: 4.9,
        verified: true,
        distanceKm: 3.1,
      },
    ];
  }

  // Admin: Update User Password (Plain and Hash)
  updateUserPassword(userId: string, newPassword: string) {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return null;
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    user.plainPassword = newPassword;
    this.save();

    this.recordActivity(
      'password_updated',
      `Password Changed for ${user.fullName}`,
      `Master Admin updated login password for account @${user.username}`,
      user,
      { userId }
    );

    return user;
  }

  // --- Consumer-Funded Farming / Plots ---
  getPlots(filter?: { farmerId?: string; status?: string }) {
    let result = [...(this.data.plots || [])];
    if (filter?.farmerId) {
      result = result.filter((p) => p.farmerId === filter.farmerId);
    }
    if (filter?.status && filter.status !== 'all') {
      result = result.filter((p) => p.status === filter.status);
    }
    return result;
  }

  getPlotById(id: string) {
    return (this.data.plots || []).find((p) => p.id === id);
  }

  createPlot(plot: FarmPlotListing) {
    if (!this.data.plots) this.data.plots = [];
    this.data.plots.unshift(plot);
    this.save();

    this.recordActivity(
      'plot_listed',
      `Farm Land Plot Listed: ${plot.plotName}`,
      `Farmer ${plot.farmerName} made available ${plot.areaSize} ${plot.areaUnit} (${plot.plotIdentifier}) for consumer-funded farming partnerships. Supported crops: ${plot.supportedCrops.slice(0, 2).join(', ')}`,
      { id: plot.farmerId, fullName: plot.farmerName, role: 'farmer' },
      { plotId: plot.id, areaSize: plot.areaSize, areaUnit: plot.areaUnit }
    );

    return plot;
  }

  updatePlot(id: string, updates: Partial<FarmPlotListing>) {
    if (!this.data.plots) this.data.plots = [];
    const index = this.data.plots.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.data.plots[index] = {
      ...this.data.plots[index],
      ...updates,
    };
    this.save();

    const p = this.data.plots[index];
    this.recordActivity(
      'plot_updated',
      `Plot Details Updated: ${p.plotName}`,
      `Plot ${p.plotIdentifier} status is now "${p.status}". Updated by farmer ${p.farmerName}.`,
      { id: p.farmerId, fullName: p.farmerName, role: 'farmer' },
      { plotId: id, status: p.status }
    );

    return this.data.plots[index];
  }

  deletePlot(id: string) {
    if (!this.data.plots) return false;
    const cleanId = String(id).trim();
    const existing = this.data.plots.find((p) => p.id === cleanId);
    this.data.plots = this.data.plots.filter((p) => p.id !== cleanId);
    this.save();
    return !!existing;
  }

  // --- Consumer-Funded Farming / Partnerships ---
  getPartnerships(filter?: { farmerId?: string; consumerId?: string; status?: string }) {
    let result = [...(this.data.partnerships || [])];
    if (filter?.farmerId) {
      result = result.filter((p) => p.farmerId === filter.farmerId);
    }
    if (filter?.consumerId) {
      result = result.filter((p) => p.consumerId === filter.consumerId);
    }
    if (filter?.status && filter.status !== 'all') {
      result = result.filter((p) => p.status === filter.status);
    }
    return result;
  }

  getPartnershipById(id: string) {
    return (this.data.partnerships || []).find((p) => p.id === id);
  }

  createPartnership(partnership: FarmPartnership) {
    if (!this.data.partnerships) this.data.partnerships = [];
    this.data.partnerships.unshift(partnership);

    // If plot exists, mark plot status as partnered
    if (partnership.plotId) {
      const plot = this.getPlotById(partnership.plotId);
      if (plot) {
        plot.status = 'partnered';
      }
    }

    this.save();

    this.recordActivity(
      'partnership_created',
      `New Farm Partnership Funded: #${partnership.partnershipCode}`,
      `Consumer ${partnership.consumerName} funded ${partnership.areaSize} ${partnership.areaUnit} for ${partnership.cropName} on ${partnership.farmName} (Total Funding: ₹${partnership.totalFundingAmount})`,
      { id: partnership.consumerId, fullName: partnership.consumerName, role: 'consumer' },
      {
        partnershipId: partnership.id,
        partnershipCode: partnership.partnershipCode,
        fundingAmount: partnership.totalFundingAmount,
        farmerId: partnership.farmerId,
        cropName: partnership.cropName,
      }
    );

    return partnership;
  }

  updatePartnershipMilestone(
    id: string,
    milestone: CropMilestone,
    progressPercentage?: number,
    newStage?: PartnershipStage
  ) {
    if (!this.data.partnerships) return null;
    const p = this.data.partnerships.find((item) => item.id === id);
    if (!p) return null;

    if (!p.milestones) p.milestones = [];
    p.milestones.push(milestone);

    if (progressPercentage !== undefined) {
      p.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    }
    if (newStage) {
      p.currentStage = newStage;
    }
    p.updatedAt = new Date().toISOString();
    this.save();

    this.recordActivity(
      'partnership_milestone_updated',
      `Partnership #${p.partnershipCode} Update: ${milestone.title}`,
      `Farmer ${p.farmerName} posted milestone for ${p.cropName}: "${milestone.title}" (Stage: ${milestone.stage}, Progress: ${p.progressPercentage}%)`,
      { id: p.farmerId, fullName: p.farmerName, role: 'farmer' },
      { partnershipId: p.id, milestoneTitle: milestone.title, stage: milestone.stage }
    );

    return p;
  }

  recordPartnershipHarvest(id: string, harvest: NonNullable<FarmPartnership['harvestRecord']>) {
    if (!this.data.partnerships) return null;
    const p = this.data.partnerships.find((item) => item.id === id);
    if (!p) return null;

    p.harvestRecord = harvest;
    p.status = 'harvested';
    p.currentStage = 'Harvested';
    p.progressPercentage = 100;
    p.actualHarvestDate = harvest.harvestDate;

    // Add milestone automatically
    if (!p.milestones) p.milestones = [];
    p.milestones.push({
      id: `m_harvest_${Date.now()}`,
      stage: 'Harvested',
      title: `Crop Harvested: ${harvest.harvestedQuantity} ${harvest.harvestUnit}`,
      description: `Harvest completed successfully with Grade ${harvest.qualityGrade}. Farmer notes: ${harvest.farmerNotes || 'Produce inspected and weighed.'}`,
      date: harvest.harvestDate,
      photoUrl: harvest.harvestPhoto,
      recordedBy: 'farmer',
    });

    p.updatedAt = new Date().toISOString();
    this.save();

    this.recordActivity(
      'partnership_harvested',
      `Harvest Complete #${p.partnershipCode}: ${harvest.harvestedQuantity} ${harvest.harvestUnit}`,
      `Farmer ${p.farmerName} completed harvest of ${p.cropName} on ${p.plotName} (${harvest.harvestedQuantity} ${harvest.harvestUnit}, Grade ${harvest.qualityGrade}). Awaiting consumer decision (Take vs Sell).`,
      { id: p.farmerId, fullName: p.farmerName, role: 'farmer' },
      { partnershipId: p.id, quantity: harvest.harvestedQuantity, unit: harvest.harvestUnit }
    );

    return p;
  }

  settlePartnership(id: string, settlement: NonNullable<FarmPartnership['settlement']>) {
    if (!this.data.partnerships) return null;
    const p = this.data.partnerships.find((item) => item.id === id);
    if (!p) return null;

    p.settlement = settlement;
    p.status = 'settled';
    p.currentStage = 'Settled';
    p.updatedAt = new Date().toISOString();

    // Release plot back to available if crop is completed & settled
    if (p.plotId) {
      const plot = this.getPlotById(p.plotId);
      if (plot) {
        plot.status = 'available';
      }
    }

    this.save();

    const isSell = settlement.choice === 'sell_in_marketplace';
    this.recordActivity(
      'partnership_settled',
      `Partnership Settled #${p.partnershipCode}: ${isSell ? 'Marketplace Sale' : 'Doorstep Dispatch'}`,
      isSell
        ? `Consumer ${p.consumerName} chose marketplace sale. Gross revenue: ₹${settlement.totalGrossRevenue || 0}, Net payout to consumer: ₹${settlement.consumerNetPayout || 0}. Farmer cultivation service fees settled.`
        : `Consumer ${p.consumerName} opted for direct produce delivery to ${settlement.deliveryAddress || 'consumer home address'}. Dispatch status: ${settlement.dispatchStatus || 'Pending Delivery'}.`,
      { id: p.consumerId, fullName: p.consumerName, role: 'consumer' },
      { partnershipId: p.id, choice: settlement.choice, payout: settlement.consumerNetPayout }
    );

    return p;
  }

  payPartnershipInstallment(
    partnershipId: string,
    installmentId: string,
    paymentData: { paymentMethod: string; notes?: string }
  ) {
    if (!this.data.partnerships) return null;
    const p = this.data.partnerships.find((item) => item.id === partnershipId);
    if (!p || !p.billingDetails) return null;

    const inst = p.billingDetails.installments.find((i) => i.id === installmentId);
    if (!inst) return null;

    if (inst.status === 'Paid') {
      return { partnership: p, receipt: null, alreadyPaid: true };
    }

    const txId = `TXN_INST_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNum = `RCPT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    inst.status = 'Paid';
    inst.paidAt = new Date().toISOString();
    inst.transactionId = txId;
    inst.paymentMethod = paymentData.paymentMethod || 'UPI Instant Pay';
    inst.receiptNumber = receiptNum;

    p.billingDetails.amountPaidToday += inst.amount;
    p.billingDetails.remainingBalance = Math.max(0, p.billingDetails.remainingBalance - inst.amount);

    p.updatedAt = new Date().toISOString();
    this.save();

    const receipt = {
      receiptNumber: receiptNum,
      partnershipCode: p.partnershipCode,
      cropName: p.cropName,
      installmentTitle: inst.title,
      amountPaid: inst.amount,
      paymentMethod: paymentData.paymentMethod,
      transactionId: txId,
      paidAt: inst.paidAt,
      consumerName: p.consumerName,
      farmerName: p.farmerName,
    };

    this.recordActivity(
      'partnership_milestone_updated',
      `Installment Paid for #${p.partnershipCode}: ₹${inst.amount}`,
      `Consumer ${p.consumerName} paid installment "${inst.title}" (₹${inst.amount}) via ${paymentData.paymentMethod}. Remaining balance: ₹${p.billingDetails.remainingBalance}.`,
      { id: p.consumerId, fullName: p.consumerName, role: 'consumer' },
      { partnershipId: p.id, installmentId, amount: inst.amount }
    );

    return { partnership: p, receipt };
  }

  // Admin: Comprehensive Overview and Complete Data of All Farmers & Consumers
  getAdminOverviewData() {
    const users = this.data.users.map((u) => {
      const userProducts = this.data.products.filter((p) => p.farmerId === u.id);
      const userOrdersReceived = this.data.orders.filter((o) => o.farmerId === u.id);
      const userOrdersPlaced = this.data.orders.filter((o) => o.consumerId === u.id);
      const userSlots = this.data.slots.filter((s) => s.farmerId === u.id);
      const userBookingsReceived = this.data.bookings.filter((b) => b.farmerId === u.id);
      const userBookingsMade = this.data.bookings.filter((b) => b.consumerId === u.id);
      const userWorkerRequests = (this.data.workerRequests || []).filter((w) => w.farmerId === u.id);

      const totalRevenue = userOrdersReceived.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalSpent = userOrdersPlaced.reduce((sum, o) => sum + (o.total || 0), 0);

      const fallbackPassword =
        u.username === 'Adminf&c_19'
          ? 'Tfarm19/1#'
          : u.role === 'farmer'
          ? 'Farmer@123'
          : 'Consumer@123';

      return {
        id: u.id,
        role: u.role,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        createdAt: u.createdAt,
        plainPassword: u.plainPassword || fallbackPassword,
        farmDetails: u.farmDetails,
        deliveryAddresses: u.deliveryAddresses,
        currentBrowsingLocation: u.currentBrowsingLocation,
        // Aggregations
        productsCount: userProducts.length,
        ordersCount: u.role === 'farmer' ? userOrdersReceived.length : userOrdersPlaced.length,
        slotsCount: userSlots.length,
        bookingsCount: u.role === 'farmer' ? userBookingsReceived.length : userBookingsMade.length,
        workerRequestsCount: userWorkerRequests.length,
        totalRevenue,
        totalSpent,
        // Detailed associated entities
        products: userProducts,
        orders: u.role === 'farmer' ? userOrdersReceived : userOrdersPlaced,
        bookings: u.role === 'farmer' ? userBookingsReceived : userBookingsMade,
        slots: userSlots,
        workerRequests: userWorkerRequests,
      };
    });

    const totalFarmers = this.data.users.filter((u) => u.role === 'farmer').length;
    const totalConsumers = this.data.users.filter((u) => u.role === 'consumer').length;
    const totalProducts = this.data.products.length;
    const totalOrders = this.data.orders.length;
    const totalRevenue = this.data.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalBookings = this.data.bookings.length;
    const totalWorkerRequests = (this.data.workerRequests || []).length;
    const activeLaborers = (this.data.workerRequests || []).reduce(
      (sum, w) => sum + (w.assignedWorkersCount || w.workersNeeded || 0),
      0
    );

    const totalPartnerships = (this.data.partnerships || []).length;
    const totalPartnershipFunding = (this.data.partnerships || []).reduce(
      (sum, p) => sum + (p.totalFundingAmount || 0),
      0
    );
    const availablePlotsCount = (this.data.plots || []).filter((p) => p.status === 'available').length;

    return {
      version: this.version,
      metrics: {
        totalFarmers,
        totalConsumers,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalBookings,
        totalWorkerRequests,
        activeLaborers,
        totalPartnerships,
        totalPartnershipFunding,
        availablePlotsCount,
      },
      users,
      allOrders: this.data.orders,
      allBookings: this.data.bookings,
      allProducts: this.data.products,
      allSlots: this.data.slots,
      allWorkerRequests: this.data.workerRequests || [],
      allPlots: this.data.plots || [],
      allPartnerships: this.data.partnerships || [],
      recentActivities: this.getRecentActivities(60),
    };
  }
}

export const db = new Database();
