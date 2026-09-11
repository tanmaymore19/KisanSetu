import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Product, FarmVisitSlot, CartItem, Order, FarmVisitBooking, FarmPartnership } from '../types.js';
import { api, calculateDistanceKm } from '../lib/api.js';
import { LocationModal } from './LocationModal.js';
import { FarmDetailModal } from './FarmDetailModal.js';
import { SlotBookingModal } from './SlotBookingModal.js';
import { FarmLiveDirectionMap } from './FarmLiveDirectionMap.js';
import { ConsumerDashboardView } from './ConsumerDashboardView.js';
import { getAccurateLocationWithAddress } from '../lib/geo.js';
import {
  Sprout,
  ShoppingBag,
  Calendar,
  Search,
  MapPin,
  Star,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  Navigation,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  User as UserIcon,
  Package,
  Heart,
  TrendingDown,
  Filter,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  AlertTriangle,
  Compass,
  LogOut,
  Handshake,
  LayoutDashboard,
} from 'lucide-react';
import { ConsumerPartnershipsView } from './partnership/ConsumerPartnershipsView.js';

export const ConsumerHome: React.FC = () => {
  const { user, logout, switchRole, updateUser } = useAuth();

  // Navigation tab
  const [navTab, setNavTab] = useState<'home' | 'dashboard' | 'partnerships' | 'search' | 'cart' | 'orders' | 'profile'>('home');

  // Three Main Options on Consumer Home (Requirement 7.2)
  const [mainOption, setMainOption] = useState<'fruits' | 'vegetables' | 'slots'>('fruits');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price_low' | 'rating'>('distance');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [slots, setSlots] = useState<FarmVisitSlot[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<FarmVisitBooking[]>([]);
  const [partnerships, setPartnerships] = useState<FarmPartnership[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isQuickDetecting, setIsQuickDetecting] = useState(false);

  const showNotification = (message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleQuickGPS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsQuickDetecting(true);
    try {
      showNotification('Locking device GPS satellites with multi-sample convergence...');
      const accurate = await getAccurateLocationWithAddress({
        targetAccuracy: 15,
        maxWaitMs: 7000,
        fallbackToIp: true,
        onProgress: (p) => {
          if (p.accuracy) {
            showNotification(`GPS signal locked (±${p.accuracy}m)...`);
          }
        },
      });
      const newLoc = {
        label: accurate.label,
        lat: accurate.lat,
        lng: accurate.lng,
      };
      if (user) {
        try {
          const updated = await api.updateConsumerLocation(user.id, {
            currentBrowsingLocation: newLoc,
          });
          updateUser(updated);
        } catch {
          updateUser({ ...user, currentBrowsingLocation: newLoc });
        }
      }
      showNotification(
        `📍 Location locked: ${accurate.label} (±${accurate.accuracy}m satellite precision)`
      );
    } catch (err: any) {
      showNotification(err.message || 'Could not acquire GPS location', true);
    } finally {
      setIsQuickDetecting(false);
    }
  };

  // Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedFarmIdForModal, setSelectedFarmIdForModal] = useState<string | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<FarmVisitSlot | null>(null);
  const [activeDirectionFarm, setActiveDirectionFarm] = useState<{
    farmName: string;
    farmLocation: string;
    farmLat: number;
    farmLng: number;
    farmerName?: string;
    farmerPhone?: string;
    bookingCode?: string;
    slotDate?: string;
    slotTime?: string;
  } | null>(null);

  // Load products & slots
  useEffect(() => {
    setLoading(true);
    Promise.all([api.getProducts(), api.getSlots()])
      .then(([prodRes, slotRes]) => {
        setProducts(prodRes);
        setSlots(slotRes);
      })
      .catch((err) => console.error('Error fetching data:', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Load user orders & bookings & partnerships strictly for the logged-in user
  useEffect(() => {
    if (user?.id) {
      // Clear previous user's cached arrays to ensure absolute isolation
      setOrders([]);
      setBookings([]);
      setPartnerships([]);

      api.getOrders({ consumerId: user.id })
        .then((res) => {
          // Strictly keep only orders belonging to this logged-in person
          const userOnly = Array.isArray(res) ? res.filter((o) => o.consumerId === user.id) : [];
          setOrders(userOnly);
        })
        .catch((err) => console.error('Error loading orders:', err));

      api.getBookings({ consumerId: user.id })
        .then((res) => {
          // Strictly keep only bookings belonging to this logged-in person
          const userOnly = Array.isArray(res) ? res.filter((b) => b.consumerId === user.id) : [];
          setBookings(userOnly);
        })
        .catch((err) => console.error('Error loading bookings:', err));

      api.getPartnerships({ consumerId: user.id })
        .then((res) => {
          // Strictly keep only partnerships belonging to this logged-in person
          const userOnly = Array.isArray(res) ? res.filter((p) => p.consumerId === user.id) : [];
          setPartnerships(userOnly);
        })
        .catch((err) => console.error('Error loading partnerships:', err));
    } else {
      setOrders([]);
      setBookings([]);
      setPartnerships([]);
    }
  }, [user?.id, refreshKey]);

  // Current Coordinates
  const userLat = user?.currentBrowsingLocation?.lat || 18.5590;
  const userLng = user?.currentBrowsingLocation?.lng || 73.7868;

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const getProductCartCount = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (acc, item) => acc + item.product.pricePerUnit * item.quantity,
    0
  );
  const deliveryFee = cartSubtotal > 400 ? 0 : cart.length > 0 ? 40 : 0;
  const grandTotal = cartSubtotal + deliveryFee;

  // Checkout order
  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;
    try {
      // Group items by farmer if multiple suppliers
      const farmerMap: Record<string, CartItem[]> = {};
      for (const item of cart) {
        const fId = item.product.farmerId;
        if (!farmerMap[fId]) farmerMap[fId] = [];
        farmerMap[fId].push(item);
      }

      for (const fId of Object.keys(farmerMap)) {
        const items = farmerMap[fId];
        await api.createOrder({
          consumerId: user.id,
          farmerId: fId,
          items: items.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            category: i.product.category,
            unit: i.product.unit,
            quantity: i.quantity,
            pricePerUnit: i.product.pricePerUnit,
            image: i.product.image,
          })),
          deliveryAddress: user.deliveryAddresses?.[0] || {
            label: 'Home',
            street: '12 Lotus Lane',
            city: 'Pune',
            pincode: '411045',
          },
        });
      }

      setCart([]);
      setRefreshKey((k) => k + 1);
      setNavTab('orders');
      showNotification('Order placed successfully! Farmer notified.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to place order.', true);
    }
  };

  // Filtered produce list
  const filteredProducts = products.filter((p) => {
    if (mainOption === 'fruits' && p.category !== 'Fruit') return false;
    if (mainOption === 'vegetables' && p.category !== 'Vegetable') return false;
    if (organicOnly && !p.organic) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.farmName.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort produce
  filteredProducts.sort((a, b) => {
    const distA = calculateDistanceKm(userLat, userLng, a.farmLat, a.farmLng);
    const distB = calculateDistanceKm(userLat, userLng, b.farmLat, b.farmLng);
    if (sortBy === 'distance') return distA - distB;
    if (sortBy === 'price_low') return a.pricePerUnit - b.pricePerUnit;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  // Filtered slots list
  const filteredSlots = slots.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.farmName.toLowerCase().includes(q) ||
        s.farmerName.toLowerCase().includes(q) ||
        s.activities.some((act) => act.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Find crops that appear in multiple farms to demonstrate multi-farmer comparison (Requirement 7.3)
  const duplicateCrops = products.filter(
    (p, idx, arr) => arr.findIndex((x) => x.name === p.name && x.farmerId !== p.farmerId) !== -1
  );

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col font-sans text-[#2D3A26] pb-20">
      {/* In-app Notification Banner */}
      {notification && (
        <div
          id="consumer-notification-banner"
          className={`fixed top-3 right-3 z-50 p-3 rounded-2xl text-white text-xs font-semibold shadow-xl border flex items-center gap-2 animate-bounce ${
            notification.isError
              ? 'bg-red-600 border-red-700'
              : 'bg-[#5D7A4F] border-[#4B633F]'
          }`}
        >
          {notification.isError ? (
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#A8C398] shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E5E0D5] shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand & Browsing Location Pill */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[#5D7A4F] flex items-center justify-center text-white shadow-2xs">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="hidden sm:flex flex-col pr-2 border-r border-[#E5E0D5]">
                <span className="text-xs font-extrabold text-[#2D3A26] font-serif leading-none tracking-tight">
                  KisanSetu
                </span>
                <span className="text-[8.5px] font-bold text-[#5D7A4F] uppercase tracking-wider leading-tight mt-0.5">
                  Farm2Home
                </span>
              </div>
            </div>
            <div
              onClick={() => setLocationModalOpen(true)}
              className="cursor-pointer group flex flex-col"
            >
              <span className="text-[10px] font-bold text-[#8C9886] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#5D7A4F]">
                <MapPin className="w-3 h-3 text-[#5D7A4F]" />
                Produce Around
              </span>
              <span className="text-xs font-extrabold text-[#2D3A26] truncate max-w-[140px] sm:max-w-xs group-hover:text-[#5D7A4F] flex items-center gap-1">
                {user?.currentBrowsingLocation?.label || 'Baner, Pune'}
                <span className="text-[10px] font-normal text-[#5D7A4F] bg-[#EBF1E8] px-1.5 py-0.2 rounded-md">
                  Change
                </span>
              </span>
            </div>

            {/* Quick 1-tap Accurate GPS Lock */}
            <button
              id="quick-gps-detect-btn"
              type="button"
              onClick={handleQuickGPS}
              disabled={isQuickDetecting}
              title="Lock exact device GPS coordinates"
              className="p-1.5 rounded-xl bg-[#EBF1E8] hover:bg-[#dbe6d7] text-[#5D7A4F] border border-[#D4CDBC] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
            >
              <Compass className={`w-3.5 h-3.5 ${isQuickDetecting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline text-[10px]">Auto GPS</span>
            </button>
          </div>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Cart Icon */}
            <button
              id="cart-nav-btn"
              type="button"
              onClick={() => setNavTab('cart')}
              className="relative p-2 rounded-full bg-[#F1EDE4] hover:bg-[#E5E0D5] text-[#2D3A26] transition-colors"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#D97706] text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* User Profile & Logout Button */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-[#E5E0D5]">
              <button
                type="button"
                onClick={() => setNavTab('profile')}
                title={`Profile: ${user?.fullName} (@${user?.username})`}
                className="flex items-center gap-1 text-xs font-semibold text-[#2D3A26] hover:text-[#5D7A4F] px-2 py-1 rounded-lg hover:bg-[#F1EDE4] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#EBF1E8] border border-[#D4CDBC] text-[#5D7A4F] flex items-center justify-center font-bold text-[11px]">
                  {user?.fullName?.charAt(0) || 'C'}
                </div>
                <span className="hidden md:inline max-w-24 truncate">{user?.fullName?.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={logout}
                title="Log out of this account"
                className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-rose-50 text-[#5D6D56] hover:text-rose-600 border border-[#E5E0D5] hover:border-rose-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Four Main Options Bar with Direct Farm Land Rental & Farm Fund */}
        {navTab === 'home' && (
          <div className="max-w-4xl mx-auto px-4 pb-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#F1EDE4] rounded-2xl border border-[#E5E0D5]">
              <button
                id="tab-fruits"
                type="button"
                onClick={() => setMainOption('fruits')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mainOption === 'fruits'
                    ? 'bg-white text-[#2D3A26] shadow-xs border border-[#E5E0D5]'
                    : 'text-[#5D6D56] hover:text-[#2D3A26]'
                }`}
              >
                <span>🍎</span> Fruits
              </button>

              <button
                id="tab-vegetables"
                type="button"
                onClick={() => setMainOption('vegetables')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mainOption === 'vegetables'
                    ? 'bg-white text-[#2D3A26] shadow-xs border border-[#E5E0D5]'
                    : 'text-[#5D6D56] hover:text-[#2D3A26]'
                }`}
              >
                <span>🥦</span> Vegetables
              </button>

              <button
                id="tab-slots"
                type="button"
                onClick={() => setMainOption('slots')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mainOption === 'slots'
                    ? 'bg-white text-[#2D3A26] shadow-xs border border-[#E5E0D5]'
                    : 'text-[#5D6D56] hover:text-[#2D3A26]'
                }`}
              >
                <span>🚜</span> Farm Visit Slots
              </button>

              <button
                id="tab-rent-land"
                type="button"
                onClick={() => setNavTab('partnerships')}
                className="py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-[#EBF1E8] text-[#1A331E] border border-[#C5D8C1] hover:bg-[#dce7d8]"
                title="Rent available farm land, book an organic crop plan, and receive 100% of the harvest"
              >
                <span>🌾</span>
                <span className="truncate">Rent/Fund Land</span>
                <span className="text-[9px] bg-amber-400 text-[#1A331E] px-1 rounded font-black shrink-0">HOT</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-4 w-full flex-1">
        {/* Global Back Navigation Bar for sub-features */}
        {navTab !== 'home' && (
          <div className="mb-4 flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => setNavTab('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#D4CDBC] text-xs font-bold transition-all shadow-2xs cursor-pointer group"
              id="btn-back-to-explore"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Explore Produce</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#5D6D56]">
              <span>Feature:</span>
              <span className="font-bold text-[#2D3A26] capitalize">
                {navTab === 'dashboard'
                  ? 'Buyer Dashboard'
                  : navTab === 'partnerships'
                  ? 'Farm Plot Partnerships'
                  : navTab === 'cart'
                  ? 'Harvest Cart'
                  : navTab === 'orders'
                  ? 'My Orders'
                  : navTab === 'profile'
                  ? 'Consumer Profile'
                  : navTab}
              </span>
            </div>
          </div>
        )}

        {/* ================= TAB 0: CONSUMER DASHBOARD ================= */}
        {navTab === 'dashboard' && user && (
          <ConsumerDashboardView
            user={user}
            orders={orders}
            bookings={bookings}
            partnerships={partnerships}
            onNavigate={(tab, option) => {
              setNavTab(tab);
              if (option) setMainOption(option);
            }}
            onOpenLiveDirections={(booking) => {
              setActiveDirectionFarm({
                farmName: booking.farmName,
                farmLocation: (booking as any).farmLocation || 'Direct Farm Location',
                farmLat: (booking as any).farmLat || 18.5204,
                farmLng: (booking as any).farmLng || 73.8567,
                farmerName: booking.farmerName,
                farmerPhone: booking.farmerPhone,
                bookingCode: booking.bookingCode,
                slotDate: booking.slotDate,
                slotTime: booking.slotTime,
              });
            }}
            onSwitchRole={(role) => switchRole(role, true)}
          />
        )}

        {/* ================= TAB 1: HOME ================= */}
        {navTab === 'home' && (
          <div className="space-y-4">
            {/* Direct Land Rental & Farm Fund Interactive Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#1A331E] via-[#244729] to-[#2E5C35] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-emerald-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                  <Sprout className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-400 text-[#1A331E]">
                      Farm Fund & Land Rental
                    </span>
                    <span className="text-[11px] text-emerald-200">Rent a specific farm plot & own the harvest</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Rent Verified Farm Land & Book an Organic Crop Plan
                  </h3>
                  <p className="text-[11px] text-emerald-100/80">
                    Sponsor full seasonal farming (organic seeds, drip water, and farmer labor) on available plots, and receive 100% of fresh harvest produce delivered to you!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNavTab('partnerships')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1A331E] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <span>Book Plan / Rent Land</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative grow">
                <Search className="w-4 h-4 text-[#8C9886] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    mainOption === 'slots'
                      ? 'Search farms, activities, or farmers...'
                      : `Search fresh ${mainOption} (e.g. Tomatoes, Mangoes)...`
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F]"
                />
              </div>

              {mainOption !== 'slots' && (
                <div className="flex items-center gap-1.5 text-xs shrink-0 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setOrganicOnly(!organicOnly)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                      organicOnly
                        ? 'bg-[#5D7A4F] text-white border-[#4B633F]'
                        : 'bg-white text-[#2D3A26] border-[#E5E0D5] hover:border-[#5D7A4F]'
                    }`}
                  >
                    🌱 Organic Only
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] font-semibold text-xs focus:outline-hidden"
                  >
                    <option value="distance">Nearest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              )}
            </div>

            {/* Produce Listing (Fruits or Vegetables) */}
            {mainOption !== 'slots' && (
              <div>
                {/* Multi-Farmer Comparison Highlight Banner (Requirement 7.3) */}
                <div className="p-3 bg-[#EBF1E8] border border-[#D4CDBC] rounded-2xl text-xs text-[#2D3A26] flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#5D7A4F] shrink-0" />
                    <span>
                      <strong>Direct Farm Comparison:</strong> Compare the same crops across
                      different local growers by price, real GPS distance, and organic certification.
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#5D7A4F] shrink-0">
                    {filteredProducts.length} varieties available
                  </span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center text-[#8C9886] text-xs">
                    No produce matches your current filters. Try changing your search or location.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {filteredProducts.map((p) => {
                      const distKm = calculateDistanceKm(
                        userLat,
                        userLng,
                        p.farmLat,
                        p.farmLng
                      );
                      const isOutOfStock =
                        p.quantity <= 0 || p.status === 'out_of_stock';
                      const inCartCount = getProductCartCount(p.id);

                      return (
                        <div
                          key={p.id}
                          className="bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Image with badges */}
                            <div className="relative h-40 bg-[#F1EDE4] overflow-hidden">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {p.organic && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#5D7A4F]/90 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-0.5">
                                    🌱 Organic
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#A8C398]" />
                                  {distKm} km away
                                </span>
                              </div>

                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-0.5 rounded-full bg-[#D97706] text-white text-[10px] font-extrabold flex items-center gap-0.5 shadow-xs">
                                  <Star className="w-3 h-3 fill-white" />
                                  {p.rating}
                                </span>
                              </div>

                              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg">
                                <span className="truncate">{p.harvestDate}</span>
                                <span className="font-semibold shrink-0">
                                  {p.quantity} {p.unit} left
                                </span>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-3">
                              <h3 className="text-sm font-bold text-[#2D3A26] font-serif line-clamp-1">
                                {p.name}
                              </h3>

                              {/* Farmer / Farm link */}
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-[#5D6D56] font-medium truncate">
                                  🏡 {p.farmName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFarmIdForModal(p.farmerId)}
                                  className="text-[11px] font-bold text-[#5D7A4F] hover:underline shrink-0"
                                >
                                  View Farm
                                </button>
                              </div>

                              <p className="text-[11px] text-[#5D6D56] line-clamp-2 mt-1 leading-relaxed">
                                {p.description}
                              </p>
                            </div>
                          </div>

                          {/* Price & Add to Cart footer */}
                          <div className="p-3 pt-0 flex items-center justify-between border-t border-[#E5E0D5] mt-2">
                            <div>
                              <span className="text-base font-extrabold text-[#2D3A26] font-serif">
                                ₹{p.pricePerUnit}
                              </span>
                              <span className="text-xs text-[#8C9886] font-medium">
                                /{p.unit}
                              </span>
                            </div>

                            {isOutOfStock ? (
                              <span className="px-3 py-1.5 rounded-xl bg-[#F1EDE4] text-[#8C9886] text-xs font-semibold">
                                Out of Stock
                              </span>
                            ) : inCartCount > 0 ? (
                              <div className="flex items-center gap-2 bg-[#EBF1E8] border border-[#D4CDBC] rounded-xl p-0.5">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(p.id)}
                                  className="w-7 h-7 rounded-lg bg-white text-[#2D3A26] font-bold hover:bg-[#F1EDE4] flex items-center justify-center shadow-2xs"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold text-[#2D3A26] px-1">
                                  {inCartCount}
                                </span>
                                <button
                                  type="button"
                                  disabled={inCartCount >= p.quantity}
                                  onClick={() => addToCart(p)}
                                  className="w-7 h-7 rounded-lg bg-[#5D7A4F] text-white font-bold hover:bg-[#4B633F] disabled:opacity-40 flex items-center justify-center shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(p)}
                                className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Farm Visit Slots Listing (Requirement 7.4) */}
            {mainOption === 'slots' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#F1EDE4] border border-[#E5E0D5] rounded-2xl text-xs text-[#2D3A26] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#5D7A4F] shrink-0" />
                  <span>
                    <strong>Weekend Agro-Tourism:</strong> Book a direct slot to visit
                    participating farms, pick fruits, meet growers, and enjoy farm-fresh meals.
                  </span>
                </div>

                {filteredSlots.length === 0 ? (
                  <div className="py-16 text-center text-[#8C9886] text-xs">
                    No visit slots found for this search.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredSlots.map((slot) => {
                      const distKm = calculateDistanceKm(
                        userLat,
                        userLng,
                        slot.farmLat,
                        slot.farmLng
                      );
                      const isVisitsPaused =
                        slot.visitorsEnabled === false || slot.status === 'closed' || slot.status === 'cancelled';
                      const isWeeklyActive =
                        slot.isWeeklyActive || (slot.endDate && slot.endDate !== slot.date);
                      const isFull =
                        slot.bookedCount >= slot.maxVisitors || slot.status === 'full';
                      const remaining = Math.max(0, slot.maxVisitors - slot.bookedCount);

                      return (
                        <div
                          key={slot.id}
                          className="bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                        >
                          <div>
                            {/* Slot Experience Photos Banner (if available) */}
                            {slot.images && slot.images.length > 0 && (
                              <div className="relative -mx-4 -mt-4 mb-3 h-36 bg-[#E5E0D5] overflow-hidden group">
                                <img
                                  src={slot.images[0]}
                                  alt={slot.farmName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#5D7A4F]/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                                    {distKm} km away
                                  </span>
                                  {isVisitsPaused && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-red-600/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                                      Visits Paused
                                    </span>
                                  )}
                                </div>
                                {slot.images.length > 1 && (
                                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                                    +{slot.images.length - 1} more photos
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                {(!slot.images || slot.images.length === 0) && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                                      {distKm} km away
                                    </span>
                                    {isVisitsPaused && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                                        Visits Paused
                                      </span>
                                    )}
                                  </div>
                                )}
                                <h3 className="text-sm font-bold text-[#2D3A26] font-serif mt-1">
                                  {slot.farmName}
                                </h3>
                                <p className="text-xs text-[#5D6D56]">
                                  Host: {slot.farmerName}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedFarmIdForModal(slot.farmerId)}
                                className="text-[11px] font-bold text-[#5D7A4F] hover:underline cursor-pointer shrink-0"
                              >
                                View Farm
                              </button>
                            </div>

                            {/* Slot Date and Time */}
                            <div className="p-2.5 bg-[#F1EDE4]/70 rounded-xl text-xs space-y-1.5 my-2 border border-[#E5E0D5]/60">
                              <div className="flex items-center justify-between font-semibold text-[#2D3A26]">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#5D7A4F]" />
                                  {isWeeklyActive ? `${slot.date} to ${slot.endDate || slot.date}` : slot.date}
                                </span>
                                <span className="flex items-center gap-1 text-[#5D6D56]">
                                  <Clock className="w-3.5 h-3.5 text-[#8C9886]" />
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>

                              {isWeeklyActive && (
                                <div className="text-[10px] text-[#92400E] font-medium bg-[#FAF4EB] border border-[#E8DFC8] px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-[#B45309]" />
                                  <span>Open all week • Flexible visitor booking</span>
                                </div>
                              )}

                              {isVisitsPaused && (
                                <div className="text-[10px] text-red-700 font-medium bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                  {slot.disableReason
                                    ? `Visits stopped: ${slot.disableReason}`
                                    : 'Visits currently paused by farmer'}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-[#5D6D56] pt-0.5">
                                <span>Capacity:</span>
                                <span className="font-bold text-[#5D7A4F]">
                                  {remaining} spots available of {slot.maxVisitors}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#5D6D56] pt-0.5 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#5D7A4F] shrink-0" />
                                <span className="truncate">{slot.farmLocation}</span>
                              </div>
                            </div>

                            {/* Activities */}
                            <div className="text-[11px] text-[#5D6D56] space-y-1 mb-3">
                              <strong className="text-[#2D3A26] block">Experiences:</strong>
                              <div className="flex flex-wrap gap-1">
                                {slot.activities.map((act) => (
                                  <span
                                    key={act}
                                    className="bg-[#EBF1E8] text-[#5D7A4F] px-2 py-0.5 rounded-md text-[10px]"
                                  >
                                    ✓ {act}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Price, Directions & Book button */}
                          <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between gap-2">
                            <div>
                              <span className="text-sm font-extrabold text-[#2D3A26] font-serif">
                                {slot.pricePerPerson > 0
                                  ? `₹${slot.pricePerPerson}`
                                  : 'Free'}
                              </span>
                              <span className="text-[11px] text-[#8C9886] font-medium">
                                {slot.pricePerPerson > 0 ? ' / person' : ' entry'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveDirectionFarm({
                                    farmName: slot.farmName,
                                    farmLocation: slot.farmLocation,
                                    farmLat: slot.farmLat,
                                    farmLng: slot.farmLng,
                                    farmerName: slot.farmerName,
                                    slotDate: slot.date,
                                    slotTime: `${slot.startTime} - ${slot.endTime}`,
                                  })
                                }
                                className="py-2 px-2.5 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#D4CDBC] text-[#5D7A4F] font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="View live direction from your GPS location"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Directions</span>
                              </button>

                              <button
                                type="button"
                                disabled={isFull || isVisitsPaused}
                                onClick={() => setSelectedSlotForBooking(slot)}
                                className="px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] disabled:bg-[#E5E0D5] disabled:text-[#8C9886] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                              >
                                {isVisitsPaused
                                  ? 'Visits Paused'
                                  : isFull
                                  ? 'Slot Full'
                                  : 'Book Visit →'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: FARM PARTNERSHIPS / CONSUMER-FUNDED FARMING ================= */}
        {navTab === 'partnerships' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <ConsumerPartnershipsView
              user={user!}
              onNavigateToMarket={() => setNavTab('home')}
            />
          </div>
        )}

        {/* ================= TAB 2: CART & CHECKOUT ================= */}
        {navTab === 'cart' && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-3">
              <h2 className="text-lg font-bold text-[#2D3A26] font-serif flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#5D7A4F]" />
                Your Harvest Basket ({totalCartCount} items)
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear Basket
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center text-[#8C9886] space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-[#D4CDBC]" />
                <p className="text-sm">Your basket is empty.</p>
                <button
                  type="button"
                  onClick={() => setNavTab('home')}
                  className="px-4 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F]"
                >
                  Browse Fresh Produce
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items List */}
                <div className="space-y-2.5">
                  {cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] flex items-center gap-3 shadow-2xs"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#2D3A26] font-serif truncate">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-[#5D6D56] truncate">
                          Farm: {product.farmName}
                        </p>
                        <div className="text-xs font-bold text-[#5D7A4F] mt-0.5">
                          ₹{product.pricePerUnit * quantity}{' '}
                          <span className="text-[10px] font-normal text-[#8C9886]">
                            (₹{product.pricePerUnit}/{product.unit})
                          </span>
                        </div>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-[#F1EDE4] p-1 rounded-xl border border-[#E5E0D5]">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="w-6 h-6 rounded-lg bg-white text-[#2D3A26] flex items-center justify-center shadow-2xs hover:bg-[#FAF8F5]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#2D3A26]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          disabled={quantity >= product.quantity}
                          onClick={() => addToCart(product)}
                          className="w-6 h-6 rounded-lg bg-[#5D7A4F] text-white flex items-center justify-center shadow-2xs hover:bg-[#4B633F] disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Address selection (Requirement 7.1 separation) */}
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D3A26] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#5D7A4F]" />
                      Delivery Address
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocationModalOpen(true)}
                      className="text-xs text-[#5D7A4F] font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-xs text-[#5D6D56]">
                    {user?.deliveryAddresses?.[0]?.street || '12 Lotus Lane, Sunrise Meadows'},{' '}
                    {user?.deliveryAddresses?.[0]?.city || 'Pune'} -{' '}
                    {user?.deliveryAddresses?.[0]?.pincode || '411045'}
                  </p>
                </div>

                {/* Bill Breakdown */}
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] space-y-2 text-xs shadow-2xs">
                  <div className="flex justify-between text-[#5D6D56]">
                    <span>Produce Subtotal:</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-[#5D6D56]">
                    <span>Farm Direct Delivery:</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-[#5D7A4F] font-semibold">FREE (Order ₹400+)</span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#E5E0D5] flex justify-between text-sm font-extrabold text-[#2D3A26]">
                    <span>Total Amount:</span>
                    <span className="text-[#5D7A4F] font-serif">₹{grandTotal}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="w-full py-3.5 rounded-2xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Place Harvest Order (₹{grandTotal}) →
                </button>

                <button
                  type="button"
                  onClick={() => setNavTab('home')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" />
                  <span>Continue Shopping / Back to Farm Market</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ORDERS ================= */}
        {navTab === 'orders' && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2">
              <h2 className="text-lg font-bold text-[#2D3A26] font-serif flex items-center gap-2">
                <Package className="w-5 h-5 text-[#5D7A4F]" />
                Your Farm Produce Orders ({orders.length})
              </h2>
              <button
                type="button"
                onClick={() => setNavTab('home')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#5D7A4F] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Market
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center text-[#8C9886] text-xs">
                No orders placed yet. Fresh harvest orders will appear here.
              </div>
            ) : (
              <div className="space-y-3.5">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#2D3A26]">
                          {ord.orderCode}
                        </span>
                        <span className="text-[11px] text-[#5D6D56] block">
                          Farm: {ord.farmName}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          ord.status === 'Delivered'
                            ? 'bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]'
                            : ord.status === 'Out for Delivery'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5]'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Stepper */}
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                      {['Placed', 'Accepted', 'Packing', 'Delivered'].map((step, idx) => {
                        const isDone =
                          (step === 'Placed' && ['Placed', 'Accepted', 'Packing', 'Out for Delivery', 'Delivered'].includes(ord.status)) ||
                          (step === 'Accepted' && ['Accepted', 'Packing', 'Out for Delivery', 'Delivered'].includes(ord.status)) ||
                          (step === 'Packing' && ['Packing', 'Out for Delivery', 'Delivered'].includes(ord.status)) ||
                          (step === 'Delivered' && ord.status === 'Delivered');

                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                                isDone
                                  ? 'bg-[#5D7A4F] text-white'
                                  : 'bg-[#F1EDE4] text-[#8C9886]'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span className={isDone ? 'font-bold text-[#5D7A4F]' : 'text-[#8C9886]'}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Items */}
                    <div className="space-y-1.5 text-xs text-[#2D3A26] pt-1">
                      {ord.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {i.quantity} {i.unit} × {i.productName}
                          </span>
                          <span className="font-semibold">
                            ₹{i.pricePerUnit * i.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between text-xs">
                      <span className="text-[#8C9886]">
                        {ord.estimatedDelivery || 'Morning harvest delivery'}
                      </span>
                      <span className="font-bold text-[#2D3A26]">
                        Total: ₹{ord.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PROFILE & BOOKED VISITS ================= */}
        {navTab === 'profile' && (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => setNavTab('home')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" /> Back to Explore Produce
              </button>
            </div>

            {/* User details */}
            <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] flex items-center justify-center font-bold text-base font-serif">
                  {user?.fullName.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3A26] font-serif">{user?.fullName}</h3>
                  <p className="text-xs text-[#5D6D56]">@{user?.username} • Consumer</p>
                  <p className="text-xs text-[#8C9886]">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] text-xs font-semibold text-[#5D6D56] hover:bg-[#F1EDE4] transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Booked Farm Visit Passes (Requirement 7.4) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#2D3A26] font-serif flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5D7A4F]" />
                Booked Farm Visit Passes ({bookings.length})
              </h3>

              {bookings.length === 0 ? (
                <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] text-center text-xs text-[#8C9886]">
                  You haven't booked any farm visits yet. Explore the "Farm Slots" tab to book one!
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((bk) => {
                    const matchingSlot = slots.find((s) => s.id === bk.slotId);
                    const farmLat = bk.farmLat || matchingSlot?.farmLat || 18.5204;
                    const farmLng = bk.farmLng || matchingSlot?.farmLng || 73.8567;
                    const farmLocation = bk.farmLocation || matchingSlot?.farmLocation || 'Farm Grounds';
                    const passImages = (bk.images && bk.images.length > 0) ? bk.images : (matchingSlot?.images || []);

                    return (
                      <div
                        key={bk.id}
                        className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#D4CDBC] shadow-2xs space-y-2.5 overflow-hidden"
                      >
                        {passImages.length > 0 && (
                          <div className="relative -mx-4 -mt-4 mb-2.5 h-28 bg-[#E5E0D5] overflow-hidden">
                            <img
                              src={passImages[0]}
                              alt={bk.farmName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-3 text-white">
                              <span className="text-[10px] font-mono font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded">
                                {bk.bookingCode}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2">
                          <div>
                            {!passImages.length && (
                              <span className="text-xs font-mono font-extrabold text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                                {bk.bookingCode}
                              </span>
                            )}
                            <h4 className="text-sm font-bold text-[#2D3A26] font-serif mt-0.5">
                              {bk.farmName}
                            </h4>
                            <p className="text-[11px] text-[#5D6D56] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#5D7A4F] shrink-0" />
                              <span className="truncate">{farmLocation}</span>
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] shrink-0">
                            {bk.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-[#2D3A26]">
                          <div>
                            <span className="text-[10px] text-[#8C9886] block">Date & Time</span>
                            <span className="font-semibold">{bk.date}</span>
                            <span className="block text-[11px] text-[#5D6D56]">
                              {bk.startTime} - {bk.endTime}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8C9886] block">Visitors</span>
                            <span className="font-semibold">{bk.visitorCount} Person(s)</span>
                            <span className="block text-[11px] text-[#5D6D56]">
                              {bk.totalAmount > 0 ? `Paid ₹${bk.totalAmount}` : 'Free Entry'}
                            </span>
                          </div>
                        </div>

                        {/* Directions Button for Consumer (Requirement) */}
                        <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#5D6D56] italic">
                            Show pass at entrance
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDirectionFarm({
                                farmName: bk.farmName,
                                farmLocation,
                                farmLat,
                                farmLng,
                                farmerName: bk.farmerName || matchingSlot?.farmerName,
                                farmerPhone: bk.farmerPhone,
                                bookingCode: bk.bookingCode,
                                slotDate: bk.date,
                                slotTime: `${bk.startTime} - ${bk.endTime}`,
                              })
                            }
                            className="py-1.5 px-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 animate-pulse" />
                            <span>🗺️ Live Directions & Map</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Role Switch Shortcut */}
            <div className="p-4 bg-[#EBF1E8] rounded-2xl border border-[#D4CDBC] flex items-center justify-between shadow-2xs">
              <div>
                <h4 className="text-xs font-bold text-[#2D3A26]">
                  Want to sell crops or host visits?
                </h4>
                <p className="text-[11px] text-[#5D7A4F]">
                  Switch to Farmer mode to manage inventory and slots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchRole('farmer')}
                className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F] shadow-2xs transition-colors"
              >
                Farmer Mode →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Requirement 14) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#E5E0D5] py-1 px-3 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-6 gap-1 text-center">
          <button
            type="button"
            onClick={() => setNavTab('home')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'home' ? 'text-[#5D7A4F] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Explore</span>
          </button>

          <button
            id="bottom-nav-dashboard"
            type="button"
            onClick={() => setNavTab('dashboard')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'dashboard' ? 'text-[#5D7A4F] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setNavTab('partnerships')}
            className={`relative py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'partnerships' ? 'text-[#1A331E] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Rent Land</span>
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => setNavTab('cart')}
            className={`relative py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'cart' ? 'text-[#5D7A4F] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {totalCartCount > 0 && (
              <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#D97706] text-white font-bold text-[8px] flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
            <span className="text-[10px] mt-0.5">Basket</span>
          </button>

          <button
            type="button"
            onClick={() => setNavTab('orders')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'orders' ? 'text-[#5D7A4F] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Orders</span>
          </button>

          <button
            type="button"
            onClick={() => setNavTab('profile')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
              navTab === 'profile' ? 'text-[#5D7A4F] font-bold' : 'text-[#8C9886] hover:text-[#2D3A26]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => {
          setLocationModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />

      {selectedFarmIdForModal && (
        <FarmDetailModal
          farmerId={selectedFarmIdForModal}
          isOpen={!!selectedFarmIdForModal}
          onClose={() => setSelectedFarmIdForModal(null)}
          onAddToCart={(product) => addToCart(product)}
          onBookSlot={(slot) => setSelectedSlotForBooking(slot)}
        />
      )}

      {selectedSlotForBooking && (
        <SlotBookingModal
          slot={selectedSlotForBooking}
          isOpen={!!selectedSlotForBooking}
          onClose={() => setSelectedSlotForBooking(null)}
          onBookingComplete={(booking) => {
            setBookings((prev) => [booking, ...prev]);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Interactive Consumer Live Directions to Farm Map Modal */}
      {activeDirectionFarm && (
        <FarmLiveDirectionMap
          isModal={true}
          farmName={activeDirectionFarm.farmName}
          farmLocation={activeDirectionFarm.farmLocation}
          farmLat={activeDirectionFarm.farmLat}
          farmLng={activeDirectionFarm.farmLng}
          farmerName={activeDirectionFarm.farmerName}
          farmerPhone={activeDirectionFarm.farmerPhone}
          consumerLat={userLat}
          consumerLng={userLng}
          consumerAddress={user?.currentBrowsingLocation?.label || 'Your Current Location'}
          bookingCode={activeDirectionFarm.bookingCode}
          slotDate={activeDirectionFarm.slotDate}
          slotTime={activeDirectionFarm.slotTime}
          onClose={() => setActiveDirectionFarm(null)}
        />
      )}
    </div>
  );
};
