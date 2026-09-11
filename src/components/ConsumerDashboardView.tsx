import React from 'react';
import { User, Order, FarmVisitBooking, FarmPartnership } from '../types.js';
import {
  ShoppingBag,
  Package,
  Calendar,
  Layers,
  ArrowLeft,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Truck,
  Navigation,
  User as UserIcon,
  Phone,
  Mail,
  Home,
  CheckCircle2,
} from 'lucide-react';

interface ConsumerDashboardViewProps {
  user: User;
  orders: Order[];
  bookings: FarmVisitBooking[];
  partnerships: FarmPartnership[];
  onNavigate: (
    tab: 'home' | 'dashboard' | 'partnerships' | 'cart' | 'orders' | 'profile',
    option?: 'fruits' | 'vegetables' | 'slots'
  ) => void;
  onOpenLiveDirections?: (booking: FarmVisitBooking) => void;
  onSwitchRole: (role: 'farmer' | 'consumer') => void;
}

export const ConsumerDashboardView: React.FC<ConsumerDashboardViewProps> = ({
  user,
  orders,
  bookings,
  partnerships,
  onNavigate,
  onOpenLiveDirections,
}) => {
  // Strict isolation: filter only records belonging directly to this logged-in person
  const userOrders = orders.filter((o) => !o.consumerId || o.consumerId === user.id);
  const userBookings = bookings.filter((b) => !b.consumerId || b.consumerId === user.id);
  const userPartnerships = partnerships.filter((p) => !p.consumerId || p.consumerId === user.id);

  // Calculations for THIS user only
  const activeOrders = userOrders.filter((o) => o.status !== 'Delivered');
  const activePartnerships = userPartnerships.filter(
    (p) => p.status === 'Active' || p.status === 'active'
  );
  const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalPartnershipFunding = userPartnerships.reduce(
    (sum, p) => sum + (Number(p.costBreakdown?.totalEstimatedCost) || 0),
    0
  );
  // Estimated direct savings (calculated strictly from user's actual total spend, 0 if no orders yet)
  const estimatedSavings = totalSpent > 0 ? Math.round(totalSpent * 0.28) : 0;

  const latestOrder = userOrders.length > 0 ? userOrders[0] : null;
  const nextBooking = userBookings.length > 0 ? userBookings[0] : null;

  const primaryAddress = user.deliveryAddresses?.[0];

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] text-xs font-bold transition-all shadow-2xs cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F] group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Explore Fresh Produce</span>
        </button>
        <span className="text-xs text-[#8C9886] font-medium hidden sm:inline">
          Personal Consumer Dashboard
        </span>
      </div>

      {/* Logged-in Person Identity & Specific Account Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#5D7A4F] text-white flex items-center justify-center font-serif font-black text-2xl shadow-xs shrink-0">
              {user.fullName?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className="text-lg sm:text-xl font-bold font-serif text-[#2D3A26]">
                  {user.fullName}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#5D7A4F]" />
                  Active Consumer Account
                </span>
              </div>
              <p className="text-xs text-[#5D6D56]">
                Username: <span className="font-semibold text-[#2D3A26]">@{user.username}</span> • Member ID: <span className="font-mono text-[#2D3A26]">{user.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] hover:bg-[#FAF8F5] text-xs font-semibold text-[#5D6D56] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5 text-[#5D7A4F]" />
            <span>Manage Profile</span>
          </button>
        </div>

        {/* Specific Person Contact & Address Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#E5E0D5]">
          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5]/70 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#8C9886] tracking-wider">Registered Phone</div>
              <div className="text-xs font-semibold text-[#2D3A26] truncate">{user.phone || 'Not provided'}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5]/70 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#8C9886] tracking-wider">Email Address</div>
              <div className="text-xs font-semibold text-[#2D3A26] truncate">{user.email || 'Not provided'}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5]/70 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#8C9886] tracking-wider">Delivery Location</div>
              <div className="text-xs font-semibold text-[#2D3A26] truncate">
                {primaryAddress
                  ? `${primaryAddress.city} - ${primaryAddress.pincode}`
                  : user.currentBrowsingLocation?.city || 'Pune Region'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards - Filtered Strictly to This Person */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Active Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] hover:border-[#5D7A4F] transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#5D6D56] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Orders</span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#2D3A26]">
            {userOrders.length}
          </div>
          <div className="text-[11px] text-[#5D6D56] mt-0.5 flex items-center gap-1">
            <span className="font-semibold text-[#5D7A4F]">{activeOrders.length}</span> active shipment{activeOrders.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Card 2: Farm Tour Passes */}
        <div
          onClick={() => onNavigate('home', 'slots')}
          className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] hover:border-[#5D7A4F] transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#5D6D56] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Farm Passes</span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#2D3A26]">
            {userBookings.length}
          </div>
          <div className="text-[11px] text-[#5D6D56] mt-0.5">
            Confirmed visit passes
          </div>
        </div>

        {/* Card 3: Funded Farm Plots */}
        <div
          onClick={() => onNavigate('partnerships')}
          className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] hover:border-emerald-600 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[#5D6D56] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Rented Plots</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#2D3A26]">
            {userPartnerships.length}
          </div>
          <div className="text-[11px] text-[#5D6D56] mt-0.5 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">{activePartnerships.length}</span> growing plots
          </div>
        </div>

        {/* Card 4: Direct Savings */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] shadow-2xs">
          <div className="flex items-center justify-between text-[#5D6D56] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Direct Savings</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#2D3A26]">
            ₹{estimatedSavings}
          </div>
          <div className="text-[11px] text-[#5D6D56] mt-0.5">
            Saved vs supermarket MRP
          </div>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onNavigate('home', 'fruits')}
          className="p-3 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] hover:bg-[#FAF8F5] transition-all text-left flex items-center gap-2.5 shadow-2xs"
        >
          <span className="text-xl">🍎</span>
          <div>
            <div className="text-xs font-bold text-[#2D3A26]">Buy Fresh Fruits</div>
            <div className="text-[10px] text-[#5D6D56]">Straight from orchards</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('home', 'vegetables')}
          className="p-3 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] hover:bg-[#FAF8F5] transition-all text-left flex items-center gap-2.5 shadow-2xs"
        >
          <span className="text-xl">🥦</span>
          <div>
            <div className="text-xs font-bold text-[#2D3A26]">Buy Vegetables</div>
            <div className="text-[10px] text-[#5D6D56]">Harvested this morning</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('partnerships')}
          className="p-3 rounded-xl bg-[#1A331E] hover:bg-[#142617] text-white transition-all text-left flex items-center gap-2.5 shadow-2xs"
        >
          <span className="text-xl">🤝</span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1">
              Rent Farm Land
              <span className="text-[9px] bg-amber-400 text-[#1A331E] px-1 rounded font-black">FUND</span>
            </div>
            <div className="text-[10px] text-emerald-200">Rent a specific crop plot</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('home', 'slots')}
          className="p-3 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] hover:bg-[#FAF8F5] transition-all text-left flex items-center gap-2.5 shadow-2xs"
        >
          <span className="text-xl">🚜</span>
          <div>
            <div className="text-xs font-bold text-[#2D3A26]">Book Farm Tour</div>
            <div className="text-[10px] text-[#5D6D56]">Weekend agro-tourism</div>
          </div>
        </button>
      </div>

      {/* Main Grid: Left Column = Active Order Tracker, Right Column = Upcoming Passes & Plots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Latest / Active Shipment Tracker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#5D7A4F]" />
              My Latest Harvest Shipment
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-[#5D7A4F] hover:underline flex items-center gap-0.5"
            >
              All Orders ({userOrders.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {latestOrder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#2D3A26]">
                    {latestOrder.orderCode}
                  </span>
                  <p className="text-[11px] text-[#5D6D56]">
                    Farm: <span className="font-semibold text-[#2D3A26]">{latestOrder.farmName}</span>
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    latestOrder.status === 'Delivered'
                      ? 'bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]'
                      : latestOrder.status === 'Out for Delivery'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : 'bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5]'
                  }`}
                >
                  {latestOrder.status}
                </span>
              </div>

              {/* Delivery recipient badge confirming specific person */}
              <div className="text-[11px] bg-[#FAF8F5] text-[#5D6D56] p-2 rounded-xl border border-[#E5E0D5] flex items-center justify-between">
                <span>Recipient: <strong className="text-[#2D3A26]">{user.fullName}</strong></span>
                <span>Phone: <strong className="text-[#2D3A26]">{user.phone}</strong></span>
              </div>

              {/* Stepper */}
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] bg-white p-2.5 rounded-xl border border-[#E5E0D5]">
                {['Placed', 'Accepted', 'Packing', 'Delivered'].map((step, idx) => {
                  const isDone =
                    (step === 'Placed' &&
                      ['Placed', 'Accepted', 'Packing', 'Out for Delivery', 'Delivered'].includes(
                        latestOrder.status
                      )) ||
                    (step === 'Accepted' &&
                      ['Accepted', 'Packing', 'Out for Delivery', 'Delivered'].includes(
                        latestOrder.status
                      )) ||
                    (step === 'Packing' &&
                      ['Packing', 'Out for Delivery', 'Delivered'].includes(latestOrder.status)) ||
                    (step === 'Delivered' && latestOrder.status === 'Delivered');

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

              {/* Items Summary */}
              <div className="space-y-1 text-xs text-[#2D3A26] bg-white p-2.5 rounded-xl border border-[#E5E0D5]">
                {latestOrder.items &&
                  latestOrder.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span>
                        {item.quantity} {item.unit || 'kg'} × {item.productName || 'Produce'}
                      </span>
                      <span className="font-semibold">
                        ₹{(Number(item.pricePerUnit) || 0) * (Number(item.quantity) || 1)}
                      </span>
                    </div>
                  ))}
                {latestOrder.items && latestOrder.items.length > 3 && (
                  <div className="text-[10px] text-[#5D6D56] text-right">
                    +{latestOrder.items.length - 3} more item(s)
                  </div>
                )}
                <div className="pt-1.5 border-t border-[#E5E0D5] flex justify-between font-bold text-xs text-[#2D3A26]">
                  <span>Total Paid:</span>
                  <span>₹{Number(latestOrder.total) || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-white rounded-xl border border-dashed border-[#D4CDBC] space-y-2">
              <ShoppingBag className="w-8 h-8 text-[#8C9886] mx-auto" />
              <p className="text-xs font-semibold text-[#2D3A26]">No orders placed by {user.fullName} yet</p>
              <p className="text-[11px] text-[#5D6D56]">
                Order crisp fruits and fresh vegetables straight from local farms directly to your address!
              </p>
              <button
                type="button"
                onClick={() => onNavigate('home', 'vegetables')}
                className="mt-1 px-3 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F]"
              >
                Start Shopping →
              </button>
            </div>
          )}
        </div>

        {/* Right: Upcoming Farm Visits & Active Partnerships */}
        <div className="space-y-4">
          {/* Farm Visit Passes */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#5D7A4F]" />
                My Farm Visit Pass
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('home', 'slots')}
                className="text-xs font-bold text-[#5D7A4F] hover:underline flex items-center gap-0.5"
              >
                Book Slot <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {nextBooking ? (
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E0D5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#5D7A4F]">
                    PASS: {nextBooking.bookingCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Confirmed
                  </span>
                </div>
                <div className="text-xs font-bold text-[#2D3A26]">
                  {nextBooking.farmName}
                </div>
                <div className="text-[11px] text-[#5D6D56] flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#5D7A4F]" />
                    {nextBooking.slotDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#5D7A4F]" />
                    {nextBooking.slotTime}
                  </span>
                  <span>•</span>
                  <span>{nextBooking.visitorCount} visitor(s)</span>
                </div>
                <div className="text-[10px] text-[#8C9886]">
                  Pass issued to: <strong className="text-[#2D3A26]">{user.fullName}</strong> ({user.phone})
                </div>

                {onOpenLiveDirections && (
                  <button
                    type="button"
                    onClick={() => onOpenLiveDirections(nextBooking)}
                    className="w-full mt-2 py-1.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Open Live GPS Directions & Map
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-center bg-white rounded-xl border border-dashed border-[#D4CDBC] space-y-1.5">
                <Calendar className="w-6 h-6 text-[#8C9886] mx-auto" />
                <p className="text-xs font-semibold text-[#2D3A26]">No upcoming farm tours for {user.fullName}</p>
                <p className="text-[11px] text-[#5D6D56]">
                  Take your family to visit partner farms, pick organic fruit, and meet the grower.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'slots')}
                  className="mt-1 px-3 py-1 rounded-xl bg-[#FAF8F5] text-[#5D7A4F] border border-[#D4CDBC] hover:bg-[#EBF1E8] text-xs font-bold"
                >
                  Explore Farm Slots →
                </button>
              </div>
            )}
          </div>

          {/* Active Farm Plots & Partnerships */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-700" />
                My Rented Farm Plots & Funds
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('partnerships')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                View Plots ({userPartnerships.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {userPartnerships.length > 0 ? (
              <div className="space-y-2">
                {userPartnerships.slice(0, 2).map((part) => (
                  <div
                    key={part.id}
                    onClick={() => onNavigate('partnerships')}
                    className="p-3 bg-white rounded-xl border border-[#E5E0D5] hover:border-emerald-600 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D3A26] flex items-center gap-1">
                        🌱 {part.cropName} Plot ({part.plotName})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {part.currentStage}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5D6D56]">
                      Grower: <span className="font-semibold text-[#2D3A26]">{part.farmerName}</span> • {part.farmName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E5E0D5]">
                      <span>Funded: ₹{part.costBreakdown?.totalEstimatedCost || 0}</span>
                      <span className="font-bold text-emerald-700">
                        Est. Yield: ~{part.costBreakdown?.estimatedYieldKg || 120} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center bg-white rounded-xl border border-dashed border-[#D4CDBC] space-y-1.5">
                <Layers className="w-6 h-6 text-[#8C9886] mx-auto" />
                <p className="text-xs font-semibold text-[#2D3A26]">No active farm plots rented by {user.fullName} yet</p>
                <p className="text-[11px] text-[#5D6D56]">
                  Rent your own dedicated organic crop plot and receive the fresh harvest at wholesale rates!
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('partnerships')}
                  className="mt-1 px-3 py-1 rounded-xl bg-[#1A331E] text-white hover:bg-[#142617] text-xs font-bold"
                >
                  Explore Available Farm Plots →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
