import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Product, FarmVisitSlot, FarmVisitBooking, Order } from '../types.js';
import { api } from '../lib/api.js';
import { getAccurateLocationWithAddress, AccurateLocation } from '../lib/geo.js';
import { FarmPhotoUpload } from './FarmPhotoUpload.js';
import { PortalRoleSwitcher } from './PortalRoleSwitcher.js';
import {
  Sprout,
  Package,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Trees,
  User as UserIcon,
  LogOut,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Eye,
  Check,
  X,
  Phone,
  Layers,
  ChevronRight,
  Camera,
  Upload,
  Compass,
  Navigation,
  Landmark,
  Wrench,
  Power,
  AlertCircle,
  Home,
  ShieldCheck,
  Users,
  UserPlus,
  Coins,
  ArrowLeft,
} from 'lucide-react';
import { GovtSchemesHub } from './farmer/GovtSchemesHub.js';
import { FarmingInstrumentsStore } from './farmer/FarmingInstrumentsStore.js';
import { FarmerWorkerRequestSection } from './FarmerWorkerRequestSection.js';
import { FarmerPartnershipManagement } from './partnership/FarmerPartnershipManagement.js';
import { GOVT_SCHEMES } from '../data/govtSchemesData.js';
import { FARMING_INSTRUMENTS } from '../data/farmingInstrumentsData.js';

export const FarmerDashboard: React.FC = () => {
  const { user, logout, switchRole, refreshUser } = useAuth();

  // Active section
  const [activeTab, setActiveTab] = useState<
    'summary' | 'partnerships' | 'products' | 'orders' | 'slots' | 'workers' | 'schemes' | 'instruments' | 'profile'
  >('summary');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [slots, setSlots] = useState<FarmVisitSlot[]>([]);
  const [bookings, setBookings] = useState<FarmVisitBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  // Delete Product Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Add/Edit Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<'Fruit' | 'Vegetable'>('Vegetable');
  const [prodQuantity, setProdQuantity] = useState('50');
  const [prodUnit, setProdUnit] = useState<'kg' | 'dozen' | 'bunch' | 'box' | 'piece'>('kg');
  const [prodPrice, setProdPrice] = useState('35');
  const [prodOrganic, setProdOrganic] = useState(true);
  const [prodDescription, setProdDescription] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process direct device upload into optimized base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setImageUploadError(null);
    setIsUploadingImage(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            setProdImage(optimizedBase64);
          } else {
            setProdImage(event.target?.result as string);
          }
        } catch {
          setProdImage(event.target?.result as string);
        } finally {
          setIsUploadingImage(false);
        }
      };
      img.onerror = () => {
        setImageUploadError('Could not process this image. Please choose another one.');
        setIsUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setImageUploadError('Failed to read image from device.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProdImage('');
    setImageUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Slot Modal (Create / Edit with Photos, Farm Name/Location, Weekly Duration, and Visitor Access Controls)
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotFarmName, setSlotFarmName] = useState('');
  const [slotFarmLocation, setSlotFarmLocation] = useState('');
  const [slotDate, setSlotDate] = useState('2026-09-19');
  const [slotEndDate, setSlotEndDate] = useState('2026-09-26');
  const [slotActiveDuration, setSlotActiveDuration] = useState<'1_day' | '1_week' | '2_weeks' | '1_month' | 'custom'>('1_week');
  const [slotIsWeeklyActive, setSlotIsWeeklyActive] = useState(true);
  const [slotVisitorsEnabled, setSlotVisitorsEnabled] = useState(true);
  const [slotDisableReason, setSlotDisableReason] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00 AM');
  const [slotEndTime, setSlotEndTime] = useState('12:00 PM');
  const [slotMaxVisitors, setSlotMaxVisitors] = useState('20');
  const [slotPrice, setSlotPrice] = useState('150');
  const [slotActivities, setSlotActivities] = useState('Fruit Picking, Tractor Ride, Organic Tour');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotStatus, setSlotStatus] = useState<'open' | 'full' | 'closed' | 'completed' | 'cancelled'>('open');
  const [slotImages, setSlotImages] = useState<string[]>([]);

  const calculateSlotEndDate = (startDate: string, duration: '1_day' | '1_week' | '2_weeks' | '1_month' | 'custom', customEnd?: string) => {
    if (duration === '1_day') return startDate;
    if (duration === 'custom') return customEnd || startDate;
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return startDate;
    const daysToAdd = duration === '1_week' ? 7 : duration === '2_weeks' ? 14 : 30;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const handleDurationChange = (newDuration: '1_day' | '1_week' | '2_weeks' | '1_month' | 'custom') => {
    setSlotActiveDuration(newDuration);
    if (newDuration === '1_day') {
      setSlotEndDate(slotDate);
      setSlotIsWeeklyActive(false);
    } else {
      setSlotIsWeeklyActive(true);
      setSlotEndDate(calculateSlotEndDate(slotDate, newDuration));
    }
  };

  const openCreateSlotModal = () => {
    const todayStr = '2026-09-19';
    const computedEnd = calculateSlotEndDate(todayStr, '1_week');
    setEditingSlotId(null);
    setSlotFarmName(user?.farmDetails?.farmName || `${user?.fullName || 'My'} Organic Farm`);
    setSlotFarmLocation(user?.farmDetails?.locationAddress || 'Maharashtra, India');
    setSlotDate(todayStr);
    setSlotEndDate(computedEnd);
    setSlotActiveDuration('1_week');
    setSlotIsWeeklyActive(true);
    setSlotVisitorsEnabled(true);
    setSlotDisableReason('');
    setSlotStartTime('09:00 AM');
    setSlotEndTime('12:00 PM');
    setSlotMaxVisitors('20');
    setSlotPrice('150');
    setSlotActivities('Fruit Picking, Tractor Ride, Organic Tour');
    setSlotNotes('Visitors welcome! Active all week without needing daily updates.');
    setSlotStatus('open');
    // Pre-populate with farm photos if available
    const existingPhotos = user?.farmDetails?.farmPhotos || [];
    setSlotImages(existingPhotos.length > 0 ? [existingPhotos[0]] : []);
    setSlotModalOpen(true);
  };

  const openEditSlotModal = (slot: FarmVisitSlot) => {
    setEditingSlotId(slot.id);
    setSlotFarmName(slot.farmName || user?.farmDetails?.farmName || 'My Farm');
    setSlotFarmLocation(slot.farmLocation || user?.farmDetails?.locationAddress || 'Maharashtra');
    setSlotDate(slot.date);
    const end = slot.endDate || slot.date;
    setSlotEndDate(end);
    const isMulti = slot.isWeeklyActive ?? (end !== slot.date);
    setSlotIsWeeklyActive(isMulti);
    setSlotActiveDuration(slot.activeDuration || (isMulti ? '1_week' : '1_day'));
    const isVisEnabled = slot.visitorsEnabled !== false && slot.status !== 'closed' && slot.status !== 'cancelled';
    setSlotVisitorsEnabled(isVisEnabled);
    setSlotDisableReason(slot.disableReason || '');
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotMaxVisitors(String(slot.maxVisitors));
    setSlotPrice(String(slot.pricePerPerson));
    setSlotActivities(slot.activities.join(', '));
    setSlotNotes(slot.notes || '');
    setSlotStatus(slot.status);
    setSlotImages(slot.images || []);
    setSlotModalOpen(true);
  };

  // Edit Farm Profile
  const [farmName, setFarmName] = useState(user?.farmDetails?.farmName || '');
  const [farmAddress, setFarmAddress] = useState(user?.farmDetails?.locationAddress || '');
  const [farmSize, setFarmSize] = useState(String(user?.farmDetails?.farmSize || 10));
  const [farmBio, setFarmBio] = useState(user?.farmDetails?.bio || '');
  const [farmLat, setFarmLat] = useState(String(user?.farmDetails?.lat || 18.5204));
  const [farmLng, setFarmLng] = useState(String(user?.farmDetails?.lng || 73.8567));
  const [farmPhotos, setFarmPhotos] = useState<string[]>(
    user?.farmDetails?.farmPhotos || (user?.farmDetails?.bannerImage ? [user.farmDetails.bannerImage] : [])
  );
  const [isDetectingFarmGps, setIsDetectingFarmGps] = useState(false);
  const [farmGpsAccuracy, setFarmGpsAccuracy] = useState<number | null>(null);

  const farmerId = user?.id;

  const handleDetectFarmGPS = async () => {
    setIsDetectingFarmGps(true);
    showSyncNotification('Connecting to satellite GPS with multi-sample convergence...');
    try {
      const accurate = await getAccurateLocationWithAddress({
        targetAccuracy: 15,
        maxWaitMs: 8000,
        fallbackToIp: true,
        onProgress: (p) => {
          if (p.accuracy) {
            showSyncNotification(`GPS signal locked (±${p.accuracy}m)...`);
          }
        },
      });
      setFarmLat(String(accurate.lat));
      setFarmLng(String(accurate.lng));
      if (accurate.formattedAddress) {
        setFarmAddress(accurate.formattedAddress);
      }
      setFarmGpsAccuracy(accurate.accuracy);
      showSyncNotification(
        `Farm GPS locked (±${accurate.accuracy}m satellite precision)! Address & coordinates updated.`
      );
    } catch (err: any) {
      showSyncNotification(err.message || 'Could not acquire farm GPS location.', true);
    } finally {
      setIsDetectingFarmGps(false);
    }
  };

  const loadFarmerData = async () => {
    if (!farmerId) return;
    setLoading(true);
    try {
      const [prodRes, ordRes, slotRes, bookRes] = await Promise.all([
        api.getProducts({ farmerId }),
        api.getOrders({ farmerId }),
        api.getSlots({ farmerId }),
        api.getBookings({ farmerId }), // Strict isolation: only this farmer's bookings
      ]);
      setProducts(prodRes);
      setOrders(ordRes);
      setSlots(slotRes);
      setBookings(bookRes);
    } catch (err) {
      console.error('Error fetching farmer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, [farmerId]);

  const showSyncNotification = (msg: string, isError = false) => {
    setSyncNotice({ message: msg, isError });
    setTimeout(() => setSyncNotice(null), 4500);
  };

  // Fast stock updates (+ / - stock per requirement 9.1 & 9.2)
  const handleStockAdjust = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta);
    try {
      const res = await api.updateProduct(product.id, { quantity: newQty });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      showSyncNotification(
        `Updated "${product.name}" stock to ${newQty} ${product.unit}. Marketplace synced instantly.`
      );
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to update stock', true);
    }
  };

  const handleToggleStockStatus = async (product: Product) => {
    const isOutOfStock = product.status === 'out_of_stock' || product.quantity <= 0;
    const newQty = isOutOfStock ? 25 : 0;
    try {
      const res = await api.updateProduct(product.id, { quantity: newQty });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      showSyncNotification(
        `"${product.name}" marked as ${isOutOfStock ? 'Available' : 'Out of Stock'}. Synced to consumer app.`
      );
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to toggle status', true);
    }
  };

  // In-app Delete Confirmation (no iframe window.confirm blocking)
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const targetId = productToDelete.id;
    const targetName = productToDelete.name;
    setIsDeletingProduct(true);
    try {
      await api.deleteProduct(targetId);
      setProducts((prev) => prev.filter((p) => String(p.id).trim() !== String(targetId).trim()));
      showSyncNotification(`"${targetName}" permanently removed from farm inventory & marketplace.`);
      setProductToDelete(null);
      if (editingProduct?.id === targetId) {
        setProductModalOpen(false);
        setEditingProduct(null);
      }
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to delete product', true);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Add / Edit Product
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('Vegetable');
    setProdQuantity('50');
    setProdUnit('kg');
    setProdPrice('35');
    setProdOrganic(true);
    setProdDescription('');
    setProdImage('');
    setImageUploadError(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdQuantity(String(product.quantity));
    setProdUnit(product.unit);
    setProdPrice(String(product.pricePerUnit));
    setProdOrganic(product.organic);
    setProdDescription(product.description);
    setProdImage(product.image);
    setImageUploadError(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId) return;

    try {
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.id, {
          name: prodName,
          category: prodCategory,
          quantity: Number(prodQuantity),
          unit: prodUnit,
          pricePerUnit: Number(prodPrice),
          organic: prodOrganic,
          description: prodDescription,
          image: prodImage || undefined,
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? res.product : p))
        );
        showSyncNotification(`Updated "${prodName}" details.`);
      } else {
        const res = await api.createProduct({
          farmerId,
          name: prodName,
          category: prodCategory,
          quantity: Number(prodQuantity),
          unit: prodUnit,
          pricePerUnit: Number(prodPrice),
          organic: prodOrganic,
          description: prodDescription,
          image: prodImage || undefined,
        });
        setProducts((prev) => [res.product, ...prev]);
        showSyncNotification(`Published new produce "${prodName}" to marketplace!`);
      }
      setProductModalOpen(false);
    } catch (err: any) {
      showSyncNotification(err.message || 'Error saving product', true);
    }
  };

  // Create or Update Visit Slot (with farm photos upload/edit, farm details, weekly validity, and visitor controls)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId) return;

    try {
      const activitiesArray = slotActivities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const effectiveStatus = slotVisitorsEnabled ? slotStatus : 'closed';

      if (editingSlotId) {
        const res = await api.updateSlot(editingSlotId, {
          farmName: slotFarmName,
          farmLocation: slotFarmLocation,
          date: slotDate,
          endDate: slotEndDate,
          isWeeklyActive: slotIsWeeklyActive,
          activeDuration: slotActiveDuration,
          visitorsEnabled: slotVisitorsEnabled,
          disableReason: slotDisableReason,
          startTime: slotStartTime,
          endTime: slotEndTime,
          maxVisitors: Number(slotMaxVisitors),
          pricePerPerson: Number(slotPrice),
          activities: activitiesArray,
          notes: slotNotes,
          status: effectiveStatus,
          images: slotImages,
        });

        setSlots((prev) => prev.map((s) => (s.id === editingSlotId ? res.slot : s)));
        setSlotModalOpen(false);
        showSyncNotification(
          slotIsWeeklyActive
            ? `Farm tour updated! Kept active until ${slotEndDate} (no daily updates needed).`
            : 'Farm visit slot details updated successfully!'
        );
      } else {
        const res = await api.createSlot({
          farmerId,
          farmName: slotFarmName,
          farmLocation: slotFarmLocation,
          date: slotDate,
          endDate: slotEndDate,
          isWeeklyActive: slotIsWeeklyActive,
          activeDuration: slotActiveDuration,
          visitorsEnabled: slotVisitorsEnabled,
          disableReason: slotDisableReason,
          startTime: slotStartTime,
          endTime: slotEndTime,
          maxVisitors: Number(slotMaxVisitors),
          pricePerPerson: Number(slotPrice),
          activities: activitiesArray,
          notes: slotNotes,
          status: effectiveStatus,
          images: slotImages,
        });

        setSlots((prev) => [res.slot, ...prev]);
        setSlotModalOpen(false);
        showSyncNotification(
          slotIsWeeklyActive
            ? `New farm slot active for 1 week (until ${slotEndDate})! Accepting visitors all week without daily updates.`
            : 'New farm visit slot published to marketplace!'
        );
      }
    } catch (err: any) {
      showSyncNotification(err.message || 'Error saving visit slot', true);
    }
  };

  // Quick 1-click toggle to stop/disable or enable visitors directly from slot card
  const handleQuickToggleVisitors = async (slot: FarmVisitSlot) => {
    const isCurrentlyOpen = slot.visitorsEnabled !== false && slot.status === 'open';
    const nextEnabled = !isCurrentlyOpen;
    const nextStatus = nextEnabled ? 'open' : 'closed';

    try {
      const res = await api.updateSlot(slot.id, {
        visitorsEnabled: nextEnabled,
        status: nextStatus,
      });

      setSlots((prev) => prev.map((s) => (s.id === slot.id ? res.slot : s)));
      if (nextEnabled) {
        showSyncNotification(`🟢 Visitors enabled for "${slot.farmName}". New bookings are now accepted.`);
      } else {
        showSyncNotification(`🛑 Visitors stopped for "${slot.farmName}". Bookings are paused.`);
      }
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to update visitor access status', true);
    }
  };

  // Quick 1-click button to extend slot active duration by 1 week without daily updates
  const handleQuickExtendSlot = async (slot: FarmVisitSlot) => {
    try {
      const currentEnd = slot.endDate || slot.date || '2026-09-19';
      const d = new Date(currentEnd);
      d.setDate(d.getDate() + 7);
      const newEndDate = d.toISOString().split('T')[0];

      const res = await api.updateSlot(slot.id, {
        endDate: newEndDate,
        isWeeklyActive: true,
        activeDuration: '1_week',
        status: 'open',
        visitorsEnabled: true,
      });

      setSlots((prev) => prev.map((s) => (s.id === slot.id ? res.slot : s)));
      showSyncNotification(`📅 Extended! Slot remains active until ${newEndDate}. No daily updates required.`);
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to extend slot validity', true);
    }
  };

  // Update Order Status (Requirement 10 & 13)
  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: Order['status']
  ) => {
    try {
      const res = await api.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? res.order : o))
      );
      showSyncNotification(`Order status changed to ${nextStatus}.`);
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to update order status', true);
    }
  };

  // Update Farm Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId) return;

    try {
      await api.updateFarmerProfile(farmerId, {
        farmDetails: {
          farmName,
          locationAddress: farmAddress,
          farmSize: Number(farmSize),
          lat: Number(farmLat),
          lng: Number(farmLng),
          bio: farmBio,
          bannerImage: farmPhotos[0] || user?.farmDetails?.bannerImage || '',
          farmPhotos: farmPhotos,
        },
      });
      await refreshUser();
      showSyncNotification('Farm profile and pictures saved successfully.');
    } catch (err: any) {
      showSyncNotification(err.message || 'Failed to update profile', true);
    }
  };

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length;
  const totalProduceCount = products.length;
  const totalVisitorsBooked = bookings.reduce((sum, b) => sum + b.visitorCount, 0);

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col font-sans text-[#2D3A26] pb-16">
      {/* Synchronization Notification Alert */}
      {syncNotice && (
        <div
          id="farmer-sync-notification"
          className={`fixed top-3 right-3 z-50 p-3 rounded-2xl text-white text-xs font-semibold shadow-xl border flex items-center gap-2 animate-bounce ${
            syncNotice.isError
              ? 'bg-red-600 border-red-700'
              : 'bg-[#5D7A4F] border-[#4B633F]'
          }`}
        >
          {syncNotice.isError ? (
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#A8C398] shrink-0" />
          )}
          <span>{syncNotice.message}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E5E0D5] shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5D7A4F] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-[#2D3A26] font-serif leading-tight">
                  {user?.farmDetails?.farmName || 'My Farm Dashboard'}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]">
                  {user?.farmDetails?.farmingStyle || 'Organic'}
                </span>
              </div>
              <p className="text-[11px] text-[#5D6D56] flex items-center gap-1">
                Grower: <span className="font-semibold text-[#2D3A26]">{user?.fullName}</span> •{' '}
                <MapPin className="w-3 h-3 text-[#5D7A4F] inline" />{' '}
                {user?.farmDetails?.locationAddress?.split(',')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Instant Role Switcher Dropdown */}
            <PortalRoleSwitcher currentRole="farmer" />

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl bg-[#F1EDE4] hover:bg-[#E5E0D5] text-[#5D6D56] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Farmer Dashboard Tab Navigation (Requirement 13) */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'summary'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Farm Summary
          </button>

          <button
            id="tab-farmer-partnerships"
            type="button"
            onClick={() => setActiveTab('partnerships')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 font-bold ${
              activeTab === 'partnerships'
                ? 'bg-[#1A331E] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Farm Plots & Partnerships</span>
            <span className="text-[9px] bg-amber-400 text-[#1A331E] px-1 rounded font-black">NEW</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'products'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" /> My Products & Stock ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === 'orders'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Orders ({orders.length})
            {activeOrdersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#D97706] absolute top-1.5 right-1.5"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'slots'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Visit Slots & Bookings ({bookings.length})
          </button>

          <button
            id="tab-farmer-workers"
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'workers'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Request Workers
          </button>

          <button
            id="tab-farmer-schemes"
            type="button"
            onClick={() => setActiveTab('schemes')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'schemes'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> Govt Schemes
          </button>

          <button
            id="tab-farmer-instruments"
            type="button"
            onClick={() => setActiveTab('instruments')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'instruments'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Buy Instruments
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'text-[#5D6D56] hover:text-[#2D3A26] hover:bg-[#F1EDE4]'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Farm Profile
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-5 w-full flex-1">
        {/* Global Back Navigation Bar for Farmer Features */}
        {activeTab !== 'summary' && (
          <div className="mb-4 flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#D4CDBC] text-xs font-bold transition-all shadow-2xs cursor-pointer group"
              id="btn-farmer-back-to-summary"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Farm Summary</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#5D6D56]">
              <span>Feature:</span>
              <span className="font-bold text-[#2D3A26] capitalize">
                {activeTab === 'partnerships'
                  ? 'Farm Plot Sponsorships'
                  : activeTab === 'products'
                  ? 'Produce Inventory & Harvest'
                  : activeTab === 'orders'
                  ? 'Dispatch & Farm Orders'
                  : activeTab === 'slots'
                  ? 'Agro-Tourism Visit Passes'
                  : activeTab === 'workers'
                  ? 'Labor Assistance'
                  : activeTab === 'schemes'
                  ? 'Govt Subsidies & Schemes'
                  : activeTab === 'instruments'
                  ? 'Farm Machinery Store'
                  : activeTab === 'profile'
                  ? 'Farm Bio & Coordinates'
                  : activeTab}
              </span>
            </div>
          </div>
        )}

        {/* ================= SECTION 1: SUMMARY / STATS ================= */}
        {activeTab === 'summary' && (
          <div className="space-y-5">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C9886] block uppercase">
                  Harvest Revenue
                </span>
                <span className="text-xl font-extrabold text-[#5D7A4F] font-serif mt-1 block">
                  ₹{totalRevenue}
                </span>
                <span className="text-[10px] text-[#8C9886]">Direct from buyers</span>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C9886] block uppercase">
                  Active Orders
                </span>
                <span className="text-xl font-extrabold text-[#2D3A26] font-serif mt-1 block">
                  {activeOrdersCount}
                </span>
                <span className="text-[10px] text-[#D97706] font-semibold">
                  Pending dispatch
                </span>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C9886] block uppercase">
                  Listed Produce
                </span>
                <span className="text-xl font-extrabold text-[#2D3A26] font-serif mt-1 block">
                  {totalProduceCount}
                </span>
                <span className="text-[10px] text-[#5D7A4F]">Syncing live</span>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs">
                <span className="text-[11px] font-bold text-[#8C9886] block uppercase">
                  Farm Visitors
                </span>
                <span className="text-xl font-extrabold text-[#2D3A26] font-serif mt-1 block">
                  {totalVisitorsBooked}
                </span>
                <span className="text-[10px] text-[#8C9886]">Agro-tourism guests</span>
              </div>
            </div>

            {/* Consumer-Funded Farming Opportunity Card */}
            <div
              onClick={() => setActiveTab('partnerships')}
              className="p-4 rounded-2xl bg-gradient-to-r from-[#1A331E] via-[#224427] to-[#2D5A34] text-white cursor-pointer shadow-sm hover:shadow-md transition-all border border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                  <Layers className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-[#1A331E] px-2 py-0.5 rounded">
                      New Feature
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                      Consumer-Funded Farming & Farm Partnerships
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Make dedicated plots of your farm available. Consumers fund 100% of seeds, water, fertilizer, and your cultivation service fees upfront!
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1A331E] text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <span>Manage Plots & Partnerships</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Card */}
            <div className="p-4 bg-[#5D7A4F] text-white rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-serif">Manage Farm Operations</h3>
                <p className="text-xs text-[#EBF1E8] mt-0.5">
                  Publish fresh fruit & vegetable harvest or open new weekend visit slots.
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white text-[#2D3A26] text-xs font-bold hover:bg-[#FAF8F5] transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Produce
                </button>
                <button
                  type="button"
                  onClick={openCreateSlotModal}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#4B633F] hover:bg-[#3d5233] text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" /> Create Slot
                </button>
                <button
                  id="btn-quick-request-workers"
                  type="button"
                  onClick={() => setActiveTab('workers')}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#E8DFC8] hover:bg-white text-[#2D3A26] text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#5D7A4F]" /> Request Workers
                </button>
              </div>
            </div>

            {/* Recent Orders & Bookings Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Orders */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D5] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-[#5D7A4F]" /> Recent Consumer Orders
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#5D7A4F] hover:underline font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-[#8C9886] italic py-4 text-center">
                    No orders placed yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 3).map((o) => (
                      <div
                        key={o.id}
                        className="p-2.5 rounded-xl border border-[#E5E0D5] bg-[#F1EDE4] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#2D3A26] block">
                            {o.consumerName} ({o.orderCode})
                          </span>
                          <span className="text-[11px] text-[#5D6D56]">
                            {o.items.length} item(s) • ₹{o.total}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]">
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bookings */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D5] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-[#5D7A4F]" /> Farm Visit Bookings
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('slots')}
                    className="text-xs text-[#5D7A4F] hover:underline font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <p className="text-xs text-[#8C9886] italic py-4 text-center">
                    No farm visit bookings yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bookings.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl border border-[#E5E0D5] bg-[#F1EDE4] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#2D3A26] block">
                            {b.consumerName} ({b.visitorCount} visitors)
                          </span>
                          <span className="text-[11px] text-[#5D6D56]">
                            📅 {b.date} • {b.startTime}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-[#D4CDBC] text-[#5D7A4F]">
                          {b.bookingCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ================= HOME PAGE FEATURE 1: GOVT SCHEMES SPOTLIGHT ================= */}
            <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E0D5] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                      Government Farming Schemes & Subsidies
                    </h3>
                    <p className="text-xs text-[#5D6D56]">
                      Access up to 60% solar pump subsidies, SMAM mechanization grants, and direct income aid.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-view-all-schemes-home"
                  type="button"
                  onClick={() => setActiveTab('schemes')}
                  className="px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Explore All Schemes ({GOVT_SCHEMES.length}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Featured Schemes Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {GOVT_SCHEMES.slice(0, 3).map((scheme) => (
                  <div
                    key={scheme.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#5D7A4F] font-bold mb-1">
                        <span className="truncate">{scheme.badge}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-[#EBF1E8] shrink-0">
                          {scheme.category.split('&')[0]}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#2D3A26] line-clamp-1 font-serif">
                        {scheme.name}
                      </h4>
                      <p className="text-[11px] text-[#5D6D56] mt-1 line-clamp-2">
                        {scheme.summary}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E5E0D5] flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#2D3A26]">
                        {scheme.subsidyPercentage}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('schemes')}
                        className="text-[11px] font-bold text-[#5D7A4F] hover:text-[#4B633F] flex items-center gap-1 cursor-pointer"
                      >
                        View & Apply <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= HOME PAGE FEATURE 2: FARMING INSTRUMENTS STORE SPOTLIGHT ================= */}
            <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E0D5] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                      Buy Farming Instruments & Machinery
                    </h3>
                    <p className="text-xs text-[#5D6D56]">
                      Order power tillers, battery sprayers, solar pumps & drip kits with farm-gate delivery.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-view-all-instruments-home"
                  type="button"
                  onClick={() => setActiveTab('instruments')}
                  className="px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Shop Equipment Store ({FARMING_INSTRUMENTS.length}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Featured Instruments Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {FARMING_INSTRUMENTS.slice(0, 3).map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-28 rounded-xl bg-[#F1EDE4] overflow-hidden mb-2 relative">
                        <img
                          src={inst.image}
                          alt={inst.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {inst.subsidyEligible && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#5D7A4F] text-white text-[9px] font-bold shadow-xs">
                            Subsidy Eligible
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-[#8C9886] font-semibold uppercase block">
                        {inst.brand}
                      </span>
                      <h4 className="text-xs font-bold text-[#2D3A26] line-clamp-1 font-serif">
                        {inst.name}
                      </h4>
                      <p className="text-[11px] text-[#5D6D56] mt-0.5 line-clamp-1">
                        {inst.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E5E0D5] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#2D3A26] font-serif block">
                          ₹{inst.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#8C9886] line-through">
                          ₹{inst.originalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('instruments')}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EBF1E8] hover:bg-[#5D7A4F] text-[#5D7A4F] hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= HOME PAGE FEATURE 3: FARM WORKER & LABOR REQUEST SPOTLIGHT ================= */}
            <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E0D5] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                      Farm Labor & Agricultural Worker Requests
                    </h3>
                    <p className="text-xs text-[#5D6D56]">
                      Need extra hands for harvesting, sowing, weeding, or machinery? Request local verified labor groups with daily wage assistance.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-view-all-workers-home"
                  type="button"
                  onClick={() => setActiveTab('workers')}
                  className="px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Post Worker Request <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-[#EBF1E8] text-[#5D7A4F] shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3A26]">On-Demand Farm Labor</h4>
                    <p className="text-[11px] text-[#8C9886] mt-0.5">
                      Specify crop type, worker count (1-50), and schedule duration in 1 click.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FAF4EB] text-[#B45309] shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3A26]">Fair Daily Wages & Amenities</h4>
                    <p className="text-[11px] text-[#8C9886] mt-0.5">
                      Set daily rates (avg ₹500-₹650) and indicate lunch, transport, or stay support.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3A26]">Verified Labor Cooperatives</h4>
                    <p className="text-[11px] text-[#8C9886] mt-0.5">
                      Direct phone access to regional team leads & contract cooperative heads.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: CONSUMER-FUNDED FARMING & PLOTS ================= */}
        {activeTab === 'partnerships' && (
          <div className="space-y-4">
            <FarmerPartnershipManagement user={user!} />
          </div>
        )}

        {/* ================= SECTION 2: PRODUCTS & INVENTORY ================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#2D3A26] font-serif">
                  Inventory & Produce Management
                </h2>
                <p className="text-xs text-[#5D6D56]">
                  Real-time stock synchronization: any stock adjustment is instantly reflected
                  in consumer listings.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddProductModal}
                className="px-4 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Publish New Produce
              </button>
            </div>

            {/* Products Table/Cards */}
            {products.length === 0 ? (
              <div className="py-16 text-center text-[#8C9886] text-xs bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5]">
                You haven't listed any produce yet. Click "Publish New Produce" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => {
                  const isOutOfStock = p.quantity <= 0 || p.status === 'out_of_stock';

                  return (
                    <div
                      key={p.id}
                      className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.category === 'Fruit'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-[#EBF1E8] text-[#5D7A4F]'
                              }`}
                            >
                              {p.category}
                            </span>
                            {p.organic && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]">
                                Organic
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isOutOfStock
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-[#EBF1E8] text-[#5D7A4F]'
                              }`}
                            >
                              {isOutOfStock ? 'Out of Stock' : 'Active'}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[#2D3A26] font-serif truncate mt-0.5">
                            {p.name}
                          </h3>

                          <div className="flex items-center gap-3 text-xs mt-1">
                            <span className="font-extrabold text-[#5D7A4F] font-serif">
                              ₹{p.pricePerUnit} /{p.unit}
                            </span>
                            <span className="text-[#5D6D56] font-semibold">
                              Available Stock:{' '}
                              <span className={isOutOfStock ? 'text-red-600 font-bold' : 'text-[#2D3A26]'}>
                                {p.quantity} {p.unit}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Fast Stock Adjusters (Requirement 9.1 & 9.2) */}
                      <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                        {/* Quick stock +/- 5 */}
                        <div className="flex items-center bg-[#F1EDE4] border border-[#E5E0D5] rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => handleStockAdjust(p, -5)}
                            className="px-2 py-1 text-xs font-bold text-[#2D3A26] hover:bg-[#E5E0D5] rounded-lg"
                            title="Decrease stock by 5"
                          >
                            -5
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-[#2D3A26]">
                            {p.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStockAdjust(p, 5)}
                            className="px-2 py-1 text-xs font-bold text-[#2D3A26] hover:bg-[#E5E0D5] rounded-lg"
                            title="Increase stock by 5"
                          >
                            +5
                          </button>
                        </div>

                        {/* Toggle Out of Stock */}
                        <button
                          type="button"
                          onClick={() => handleToggleStockStatus(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isOutOfStock
                              ? 'bg-[#EBF1E8] text-[#5D7A4F] border-[#D4CDBC]'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {isOutOfStock ? 'Set Available' : 'Set Out of Stock'}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditProductModal(p)}
                          className="p-1.5 rounded-xl border border-[#E5E0D5] hover:bg-[#F1EDE4] text-[#5D6D56]"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`delete-product-btn-${p.id}`}
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center cursor-pointer"
                          title="Delete Produce"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 3: ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#2D3A26] font-serif">
                Incoming Consumer Orders ({orders.length})
              </h2>
              <p className="text-xs text-[#5D6D56]">
                Requirement 10: Orders containing products supplied by your farm appear here
                for fulfillment.
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center text-[#8C9886] text-xs bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5]">
                No orders received yet. Consumer purchases will route directly to this dashboard.
              </div>
            ) : (
              <div className="space-y-3.5">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E5E0D5] pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                            {order.orderCode}
                          </span>
                          <span className="text-xs font-semibold text-[#2D3A26]">
                            Buyer: {order.consumerName} ({order.consumerPhone})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8C9886] mt-0.5">
                          Delivery Address: {order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5]">
                          Status: {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className="space-y-1.5 text-xs text-[#2D3A26]">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <img
                              src={i.image}
                              alt={i.productName}
                              className="w-7 h-7 rounded-lg object-cover"
                            />
                            <span>
                              {i.quantity} {i.unit} × {i.productName}
                            </span>
                          </div>
                          <span className="font-semibold text-[#2D3A26]">
                            ₹{i.pricePerUnit * i.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Status Workflow Action Buttons */}
                    <div className="pt-2 border-t border-[#E5E0D5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#2D3A26]">
                        Order Total: ₹{order.total}
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {order.status === 'Placed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'Accepted')}
                            className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F]"
                          >
                            Accept Order →
                          </button>
                        )}
                        {order.status === 'Accepted' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'Packing')}
                            className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F]"
                          >
                            Start Packing Harvest →
                          </button>
                        )}
                        {order.status === 'Packing' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'Out for Delivery')}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                          >
                            Mark Out for Delivery →
                          </button>
                        )}
                        {order.status === 'Out for Delivery' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                            className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F]"
                          >
                            ✓ Mark Delivered
                          </button>
                        )}
                        {order.status === 'Delivered' && (
                          <span className="text-xs font-bold text-[#5D7A4F] flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-[#5D7A4F]" /> Completed & Delivered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 4: VISIT SLOTS & BOOKINGS ================= */}
        {activeTab === 'slots' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#2D3A26] font-serif">
                  Farm Visit Slots & Guest Bookings
                </h2>
                <p className="text-xs text-[#5D6D56]">
                  Requirement 11 & 12: Create your own visit slots. Only consumers who booked YOUR farm appear here.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateSlotModal}
                className="px-4 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create New Visit Slot
              </button>
            </div>

            {/* Slots List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56]">
                Published Visit Slots ({slots.length})
              </h3>

              {slots.length === 0 ? (
                <div className="py-8 text-center text-[#8C9886] text-xs bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5]">
                  No slots created yet. Create a slot so visitors can book weekend tours.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((s) => {
                    const remaining = Math.max(0, s.maxVisitors - s.bookedCount);
                    const slotPhotos = s.images || [];
                    const isVisitorsActive = s.visitorsEnabled !== false && s.status === 'open';
                    const isWeekly = s.isWeeklyActive || (s.endDate && s.endDate !== s.date);

                    return (
                      <div
                        key={s.id}
                        className="bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs space-y-2.5 overflow-hidden flex flex-col justify-between"
                      >
                        {/* Slot Images Strip if available */}
                        {slotPhotos.length > 0 && (
                          <div className="relative h-32 bg-[#E5E0D5] overflow-hidden group">
                            <img
                              src={slotPhotos[0]}
                              alt={`${s.farmName || 'Slot'} Experience`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-[10px]">
                              <span className="font-semibold bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded">
                                {slotPhotos.length} photo{slotPhotos.length > 1 ? 's' : ''} uploaded
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                                  isVisitorsActive
                                    ? 'bg-[#5D7A4F] text-white'
                                    : 'bg-red-600 text-white'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isVisitorsActive ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                                {isVisitorsActive ? 'Visitors Open' : 'Visitors Stopped'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="p-4 space-y-2.5">
                          {/* Farm Name & Location Header */}
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E5E0D5]">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[#2D3A26] flex items-center gap-1 truncate">
                                <Home className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0" />
                                <span className="truncate">{s.farmName || 'My Farm Experience'}</span>
                              </h4>
                              <p className="text-[10px] text-[#8C9886] flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-[#5D7A4F]" />
                                <span className="truncate">{s.farmLocation || 'Farm Location'}</span>
                              </p>
                            </div>

                            {!slotPhotos.length && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 flex items-center gap-1 ${
                                  isVisitorsActive
                                    ? 'bg-[#EBF1E8] text-[#5D7A4F] border border-[#C8DAC0]'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isVisitorsActive ? 'bg-[#5D7A4F]' : 'bg-red-500'}`} />
                                {isVisitorsActive ? 'Open' : 'Stopped'}
                              </span>
                            )}
                          </div>

                          {/* Weekly Active Status Banner */}
                          <div className="bg-[#FAF4EB] border border-[#E8DFC8] rounded-xl p-2 flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Calendar className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                              <div className="min-w-0">
                                <div className="font-bold text-[#92400E] truncate">
                                  {isWeekly
                                    ? 'Active for 1 Week • No daily updates needed'
                                    : 'Single Day Slot'}
                                </div>
                                <div className="text-[10px] text-[#78350F] flex items-center gap-1">
                                  <span>
                                    {s.endDate && s.endDate !== s.date
                                      ? `${s.date} to ${s.endDate}`
                                      : s.date}
                                  </span>
                                  <span>•</span>
                                  <span>{s.startTime} - {s.endTime}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleQuickExtendSlot(s)}
                              className="px-2 py-1 bg-white hover:bg-[#F3ECE0] text-[#92400E] border border-[#D9CEBA] font-bold text-[10px] rounded-lg cursor-pointer transition-colors shadow-2xs whitespace-nowrap shrink-0"
                              title="Extend this slot for another week without daily updates"
                            >
                              +1 Week
                            </button>
                          </div>

                          {/* Capacity & Activities */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#8C9886]">Capacity & Booked:</span>
                            <span className="font-bold text-[#5D7A4F]">
                              {s.bookedCount} / {s.maxVisitors} visitors ({remaining} open)
                            </span>
                          </div>

                          <p className="text-[11px] text-[#5D6D56]">
                            <strong>Activities:</strong> {s.activities.join(', ')}
                          </p>

                          {s.notes && (
                            <p className="text-[10px] text-[#8C9886] italic">
                              Note: {s.notes}
                            </p>
                          )}

                          {/* Warning if visitors are stopped/disabled */}
                          {!isVisitorsActive && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-[11px] text-red-700 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                              <span>
                                {s.disableReason
                                  ? `Visitors paused: ${s.disableReason}`
                                  : 'Visitors currently stopped. Consumers cannot book this slot.'}
                              </span>
                            </div>
                          )}

                          {/* Quick Actions Footer */}
                          <div className="pt-2 border-t border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-extrabold text-[#2D3A26] font-serif text-xs">
                                {s.pricePerPerson > 0 ? `₹${s.pricePerPerson} / visitor` : 'Free Entry'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Quick 1-Click Stop / Enable Visitors Button */}
                              <button
                                type="button"
                                onClick={() => handleQuickToggleVisitors(s)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                                  isVisitorsActive
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                    : 'bg-[#EBF1E8] hover:bg-[#DFEAD8] text-[#5D7A4F] border-[#C8DAC0]'
                                }`}
                                title={isVisitorsActive ? 'Click to stop visitors and pause bookings' : 'Click to enable visitors and start taking bookings'}
                              >
                                <Power className="w-3 h-3" />
                                <span>{isVisitorsActive ? 'Stop Visitors' : 'Enable Visitors'}</span>
                              </button>

                              {/* Edit Farm & Slot Button */}
                              <button
                                type="button"
                                onClick={() => openEditSlotModal(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#D4CDBC] text-[#5D7A4F] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Farm & Slot</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bookings Received (Strict Isolation - Requirement 12) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56]">
                Visitor Bookings Received ({bookings.length})
              </h3>

              {bookings.length === 0 ? (
                <div className="py-8 text-center text-[#8C9886] text-xs bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5]">
                  No guest bookings received yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2D3A26]">
                            {b.consumerName}
                          </span>
                          <span className="text-xs font-mono font-semibold text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                            {b.bookingCode}
                          </span>
                        </div>
                        <p className="text-xs text-[#5D6D56] mt-0.5">
                          📞 {b.consumerPhone} • 📅 {b.date} ({b.startTime} - {b.endTime})
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-[#2D3A26]">
                          {b.visitorCount} Guests • {b.totalAmount > 0 ? `₹${b.totalAmount}` : 'Free'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] font-bold text-[11px]">
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SECTION 5: PROFILE & LOCATION ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-5 max-w-xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[#2D3A26] font-serif">My Farm Profile</h2>
              <p className="text-xs text-[#5D6D56]">
                Update farm location coordinates, size, and farming bio for consumers.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] space-y-3.5 shadow-2xs">
              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Farm Name
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Location Address
                </label>
                <input
                  type="text"
                  required
                  value={farmAddress}
                  onChange={(e) => setFarmAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Farm Size ({user?.farmDetails?.farmSizeUnit || 'acre'}s)
                  </label>
                  <input
                    type="number"
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Farming Style
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.farmDetails?.farmingStyle || 'Organic'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-[#F1EDE4] text-[#5D6D56]"
                  />
                </div>
              </div>

              {/* Coordinates for discovery */}
              <div className="p-3 bg-[#EBF1E8]/60 rounded-xl border border-[#D4CDBC] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#2D3A26] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#5D7A4F]" /> Farm Coordinates (Satellite GPS)
                  </span>
                  <button
                    id="detect-farm-gps-btn"
                    type="button"
                    onClick={handleDetectFarmGPS}
                    disabled={isDetectingFarmGps}
                    className="py-1.5 px-3 rounded-lg bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-75 shrink-0"
                  >
                    <Compass className={`w-3.5 h-3.5 ${isDetectingFarmGps ? 'animate-spin' : ''}`} />
                    {isDetectingFarmGps ? 'Locking GPS...' : 'Detect Device GPS Location'}
                  </button>
                </div>

                <p className="text-[11px] text-[#5D6D56]">
                  Locks high-accuracy device coordinates and automatically fills your farm address so consumers can see precise road distance.
                </p>

                {farmGpsAccuracy !== null && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5D7A4F] bg-white p-2 rounded-lg border border-[#D4CDBC]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>GPS locked with ±{farmGpsAccuracy}m accuracy</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#5D6D56] font-medium">Latitude</label>
                    <input
                      type="text"
                      value={farmLat}
                      onChange={(e) => setFarmLat(e.target.value)}
                      placeholder="e.g. 19.9975"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[#D4CDBC] bg-white text-[#2D3A26]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#5D6D56] font-medium">Longitude</label>
                    <input
                      type="text"
                      value={farmLng}
                      onChange={(e) => setFarmLng(e.target.value)}
                      placeholder="e.g. 73.7898"
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[#D4CDBC] bg-white text-[#2D3A26]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Farm Story / Bio
                </label>
                <textarea
                  rows={3}
                  value={farmBio}
                  onChange={(e) => setFarmBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                />
              </div>

              {/* Farm Pictures Upload & Gallery */}
              <div className="pt-2 border-t border-[#E5E0D5]">
                <FarmPhotoUpload
                  photos={farmPhotos}
                  onChange={(newPhotos) => setFarmPhotos(newPhotos)}
                  maxPhotos={6}
                  isMandatory={false}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save Farm Profile & Pictures
              </button>
            </form>
          </div>
        )}

        {/* ================= SECTION 5: GOVT SCHEMES & SUBSIDIES ================= */}
        {activeTab === 'schemes' && (
          <GovtSchemesHub
            currentUser={user}
            onNavigateToInstruments={() => setActiveTab('instruments')}
          />
        )}

        {/* ================= SECTION 6: BUY FARMING INSTRUMENTS STORE ================= */}
        {activeTab === 'instruments' && (
          <FarmingInstrumentsStore
            currentUser={user}
            onViewSchemes={() => setActiveTab('schemes')}
          />
        )}

        {/* ================= SECTION 7: FARM WORKER & LABOR REQUESTS ================= */}
        {activeTab === 'workers' && (
          <FarmerWorkerRequestSection
            user={user}
            farmerId={farmerId || ''}
            onShowNotice={showSyncNotification}
          />
        )}
      </main>

      {/* ================= MODAL: ADD / EDIT PRODUCT ================= */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E5E0D5] animate-in fade-in">
            <div className="bg-[#5D7A4F] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <h3 className="text-sm font-bold font-serif">
                  {editingProduct ? 'Edit Produce' : 'Add New Produce to Marketplace'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Produce Name
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Fresh Red Tomatoes"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Category (Requirement 7.2)
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  >
                    <option value="Vegetable">Vegetable 🥦</option>
                    <option value="Fruit">Fruit 🍎</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Unit
                  </label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="dozen">Dozen</option>
                    <option value="bunch">Bunch</option>
                    <option value="box">Box / Punnet</option>
                    <option value="piece">Piece</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Quantity in Stock
                  </label>
                  <input
                    type="number"
                    required
                    value={prodQuantity}
                    onChange={(e) => setProdQuantity(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Price Per Unit (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="organic-check"
                  checked={prodOrganic}
                  onChange={(e) => setProdOrganic(e.target.checked)}
                  className="rounded-md border-[#E5E0D5] text-[#5D7A4F] focus:ring-[#5D7A4F]"
                />
                <label htmlFor="organic-check" className="text-xs font-semibold text-[#2D3A26]">
                  Certified Organic Produce 🌱
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="e.g. Hand-harvested this morning from chemical-free loam soil."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1.5 flex items-center justify-between">
                  <span>Product Photo</span>
                  <span className="text-[10px] font-normal text-[#5D6D56]">Direct upload from device</span>
                </label>

                {/* Hidden File Input for Device Upload / Camera */}
                <input
                  ref={fileInputRef}
                  id="product-device-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {prodImage ? (
                  /* Uploaded Photo Preview Card */
                  <div id="product-photo-preview-card" className="rounded-2xl overflow-hidden border border-[#D4CDBC] bg-white p-2.5 space-y-2 shadow-2xs">
                    <div className="relative h-40 w-full rounded-xl overflow-hidden bg-[#F1EDE4]">
                      <img
                        src={prodImage}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#2D3A26]/85 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-[#A8C398]" />
                        Device Photo Ready
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <button
                        id="change-product-photo-btn"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#EBF1E8] hover:bg-[#dce7d7] text-[#5D7A4F] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#D4CDBC]"
                      >
                        <Camera className="w-3.5 h-3.5" /> Change Photo
                      </button>
                      <button
                        id="remove-product-photo-btn"
                        type="button"
                        onClick={handleRemoveImage}
                        className="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop or Click to Select File from Device */
                  <div
                    id="product-photo-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all text-center flex flex-col items-center justify-center gap-2 ${
                      isDragOver
                        ? 'border-[#5D7A4F] bg-[#EBF1E8] scale-[0.99]'
                        : 'border-[#D4CDBC] bg-white hover:bg-[#FAF8F5] hover:border-[#5D7A4F]'
                    }`}
                  >
                    {isUploadingImage ? (
                      <div className="py-3 flex flex-col items-center gap-2">
                        <div className="w-7 h-7 border-2 border-[#5D7A4F] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium text-[#5D6D56]">
                          Processing photo from device...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[#EBF1E8] border border-[#D4CDBC] text-[#5D7A4F] flex items-center justify-center shadow-inner">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2D3A26]">
                            Click to upload photo or drag & drop
                          </p>
                          <p className="text-[11px] text-[#5D6D56] mt-0.5">
                            Select from your phone gallery, take a photo with camera, or pick a file
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F1EDE4] border border-[#E5E0D5] text-[10px] font-medium text-[#5D6D56]">
                          <Upload className="w-3 h-3 text-[#5D7A4F]" /> Supports JPG, PNG, WEBP
                        </span>
                      </>
                    )}
                  </div>
                )}

                {imageUploadError && (
                  <p className="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {imageUploadError}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  id="save-produce-btn"
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Save Updates' : 'Publish Produce to Consumers'}
                </button>

                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
                  <span>Cancel / Go Back</span>
                </button>

                {editingProduct && (
                  <button
                    id="modal-delete-product-btn"
                    type="button"
                    onClick={() => setProductToDelete(editingProduct)}
                    className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete this Produce
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETE PRODUCT ================= */}
      {productToDelete && (
        <div
          id="delete-product-confirmation-modal"
          className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-serif text-[#2D3A26]">
                Delete Produce?
              </h3>
              <p className="text-xs text-[#5D6D56] mt-1">
                Are you sure you want to permanently remove this produce from your farm inventory and the consumer marketplace?
              </p>

              {/* Product Preview Snippet */}
              <div className="mt-3.5 p-3 rounded-2xl bg-white border border-[#E5E0D5] flex items-center gap-3 text-left">
                {productToDelete.image ? (
                  <img
                    src={productToDelete.image}
                    alt={productToDelete.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E5E0D5] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
                    <Sprout className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#2D3A26] truncate">
                    {productToDelete.name}
                  </h4>
                  <p className="text-[11px] text-[#5D6D56]">
                    {productToDelete.category} • ₹{productToDelete.pricePerUnit}/{productToDelete.unit}
                  </p>
                  <p className="text-[10px] text-[#8C9886]">
                    Stock: {productToDelete.quantity} {productToDelete.unit}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  id="cancel-delete-product-btn"
                  type="button"
                  disabled={isDeletingProduct}
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#D4CDBC] bg-white hover:bg-[#F1EDE4] text-[#2D3A26] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-product-btn"
                  type="button"
                  disabled={isDeletingProduct}
                  onClick={confirmDeleteProduct}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Produce
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE OR EDIT VISIT SLOT WITH PHOTOS ================= */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5E0D5] animate-in fade-in my-auto">
            <div className="bg-[#5D7A4F] p-4 text-white flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <Calendar className="w-4 h-4 text-[#EBF1E8]" />
                <h3 className="text-sm font-bold font-serif">
                  {editingSlotId ? 'Edit Farm Visit Slot & Pictures' : 'Create Farm Visit Slot'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-4 sm:p-5 space-y-4">
              {/* Farm Name & Location (Editable under Farm Slot Option) */}
              <div className="bg-[#FAF4EB] border border-[#E8DFC8] rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D3A26]">
                  <Home className="w-3.5 h-3.5 text-[#5D7A4F]" />
                  <span>Farm Details for this Slot</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3A26] mb-1">
                      Farm / Tour Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={slotFarmName}
                      onChange={(e) => setSlotFarmName(e.target.value)}
                      placeholder="e.g. Green Valley Agro Farm"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9CEBA] bg-white text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3A26] mb-1">
                      Farm Location / Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={slotFarmLocation}
                      onChange={(e) => setSlotFarmLocation(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9CEBA] bg-white text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Duration & Validity (Keep Active for a Week - No daily updates required) */}
              <div className="bg-white border border-[#E5E0D5] rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D3A26] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#5D7A4F]" />
                    <span>Active Duration (No Daily Updates Needed)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-full">
                    Recommended: 1 Week
                  </span>
                </div>

                {/* Preset Duration Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDurationChange('1_week')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      slotActiveDuration === '1_week'
                        ? 'bg-[#5D7A4F] text-white border-[#5D7A4F] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5D6D56] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    1 Week (7 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDurationChange('2_weeks')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      slotActiveDuration === '2_weeks'
                        ? 'bg-[#5D7A4F] text-white border-[#5D7A4F] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5D6D56] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    2 Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDurationChange('1_month')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      slotActiveDuration === '1_month'
                        ? 'bg-[#5D7A4F] text-white border-[#5D7A4F] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5D6D56] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDurationChange('1_day')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      slotActiveDuration === '1_day'
                        ? 'bg-[#5D7A4F] text-white border-[#5D7A4F] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5D6D56] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    Single Day
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3A26] mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={slotDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setSlotDate(newStart);
                        if (slotActiveDuration !== '1_day') {
                          setSlotEndDate(calculateSlotEndDate(newStart, slotActiveDuration));
                        } else {
                          setSlotEndDate(newStart);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3A26] mb-1">
                      Active Until (End Date) *
                    </label>
                    <input
                      type="date"
                      required
                      min={slotDate}
                      value={slotEndDate}
                      onChange={(e) => {
                        setSlotEndDate(e.target.value);
                        setSlotActiveDuration('custom');
                        setSlotIsWeeklyActive(e.target.value !== slotDate);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-[#5D6D56] bg-[#FAF8F5] p-2 rounded-xl flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0" />
                  <span>
                    Once enabled, this slot stays live from <strong>{slotDate}</strong> until <strong>{slotEndDate}</strong>. Visitors can book on any day in this window without daily re-listing!
                  </span>
                </div>
              </div>

              {/* Visitor Access Control (Stop / Disable Visitors Easily) */}
              <div className="bg-white border border-[#E5E0D5] rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D3A26] flex items-center gap-1.5">
                    <Power className="w-3.5 h-3.5 text-[#5D7A4F]" />
                    <span>Visitor Booking Access</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    slotVisitorsEnabled
                      ? 'bg-[#EBF1E8] text-[#5D7A4F]'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {slotVisitorsEnabled ? 'Active (Open)' : 'Disabled (Paused)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSlotVisitorsEnabled(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      slotVisitorsEnabled
                        ? 'bg-[#EBF1E8] text-[#5D7A4F] border-[#C8DAC0] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#8C9886] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#5D7A4F]" />
                    Accept Visitors
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlotVisitorsEnabled(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !slotVisitorsEnabled
                        ? 'bg-red-100 text-red-700 border-red-300 shadow-xs'
                        : 'bg-[#FAF8F5] text-[#8C9886] border-[#E5E0D5] hover:bg-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Stop Visitors
                  </button>
                </div>

                {!slotVisitorsEnabled && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-red-700 mb-1">
                      Reason for Stopping Visitors (Shown to Consumers)
                    </label>
                    <input
                      type="text"
                      value={slotDisableReason}
                      onChange={(e) => setSlotDisableReason(e.target.value)}
                      placeholder="e.g. Farm maintenance, rain forecast, or harvesting operations in progress"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-red-200 bg-red-50/50 text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Daily Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Daily End Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Capacity and Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Max Visitors Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={slotMaxVisitors}
                    onChange={(e) => setSlotMaxVisitors(e.target.value)}
                    placeholder="25"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Entry Fee (₹ / person)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(e.target.value)}
                    placeholder="0 for free"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Activities */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Activities Offered (comma-separated)
                </label>
                <input
                  type="text"
                  value={slotActivities}
                  onChange={(e) => setSlotActivities(e.target.value)}
                  placeholder="Fruit Picking, Tractor Ride, Herbal Tea"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                />
              </div>

              {/* Farm Slot Experience Photos (Requirement: Farmer can upload/edit farm pictures) */}
              <div className="pt-2 border-t border-[#E5E0D5]">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2D3A26] flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#5D7A4F]" />
                      Farm Visit Photos ({slotImages.length}/6)
                    </label>
                    <span className="text-[11px] text-[#5D6D56]">
                      Upload photos from your device camera or gallery to showcase this tour.
                    </span>
                  </div>
                  {farmPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSlotImages(Array.from(new Set([...slotImages, ...farmPhotos])).slice(0, 6))
                      }
                      className="text-[10px] font-bold text-[#5D7A4F] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      title="Import pictures from your registered farm profile"
                    >
                      <Sparkles className="w-3 h-3" />
                      Add Profile Pics
                    </button>
                  )}
                </div>

                <FarmPhotoUpload
                  photos={slotImages}
                  onChange={setSlotImages}
                  maxPhotos={6}
                  isMandatory={false}
                />
              </div>

              {/* Additional Guidelines / Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                  Visitor Guidelines / Special Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  placeholder="e.g. Please wear walking shoes and sun hats; refreshments provided at the gazebo."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-1 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {editingSlotId ? 'Save Changes & Update Farm Slot' : 'Publish Farm Slot with Photos'}
                </button>

                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
                  <span>Cancel / Go Back</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
