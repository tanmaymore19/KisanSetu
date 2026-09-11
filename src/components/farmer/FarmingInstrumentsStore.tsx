import React, { useState, useMemo } from 'react';
import {
  Search,
  Wrench,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ChevronRight,
  Star,
  Info,
  Tag,
  Zap,
  ShoppingBag,
  Package,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  Sparkles,
  CreditCard,
  Banknote,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  Download,
  AlertCircle,
} from 'lucide-react';
import { FarmingInstrument, InstrumentOrder, InstrumentCategory, User } from '../../types';
import { FARMING_INSTRUMENTS } from '../../data/farmingInstrumentsData';

interface FarmingInstrumentsStoreProps {
  currentUser?: User | null;
  onViewSchemes?: () => void;
}

export const FarmingInstrumentsStore: React.FC<FarmingInstrumentsStoreProps> = ({
  currentUser,
  onViewSchemes,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-orders'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [subsidyOnly, setSubsidyOnly] = useState(false);

  // Selected Instrument for Quick Specs
  const [specsModalInstrument, setSpecsModalInstrument] = useState<FarmingInstrument | null>(
    null
  );

  // Purchase Modal State
  const [orderingInstrument, setOrderingInstrument] = useState<FarmingInstrument | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState(
    currentUser?.farmDetails?.locationAddress ||
      'Survey No. 42, Dindori Road, Nashik, Maharashtra'
  );
  const [contactPhone, setContactPhone] = useState(
    currentUser?.phone || '+91 98220 14567'
  );
  const [farmerName, setFarmerName] = useState(
    currentUser?.fullName || 'Rajesh Kumar Patil'
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery' | 'UPI / Online' | 'Government Subsidy Direct Claim'
  >('Cash on Delivery');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<InstrumentOrder | null>(null);

  // Stored orders in local storage
  const [myOrders, setMyOrders] = useState<InstrumentOrder[]>(() => {
    try {
      const saved = localStorage.getItem('kisansetu_instrument_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default seed order for demonstration
    return [
      {
        id: 'ord-inst-demo-1',
        orderCode: 'EQ-2026-9812',
        farmerId: currentUser?.id || 'usr_farmer_rajesh',
        farmerName: currentUser?.fullName || 'Rajesh Kumar Patil',
        farmerPhone: currentUser?.phone || '+91 98220 14567',
        farmAddress:
          currentUser?.farmDetails?.locationAddress ||
          'Survey No. 42, Dindori Road, Nashik, Maharashtra',
        items: [
          {
            instrument: FARMING_INSTRUMENTS[1], // AgroMax Dual-Motor 16L Battery Knapsack Agro Sprayer
            quantity: 1,
          },
        ],
        subtotal: 2850,
        subsidyDiscount: 1000,
        deliveryFee: 0,
        totalAmount: 1850,
        paymentMethod: 'Cash on Delivery',
        status: 'Dispatched',
        orderDate: '2026-09-07T14:20:00.000Z',
        estimatedDelivery: 'Tomorrow by 4:00 PM',
        trackingId: 'TRK-AGRI-847291',
      },
    ];
  });

  const categories: { label: string; value: string }[] = [
    { label: 'All Equipment', value: 'All' },
    { label: 'Tillers & Machinery', value: 'Powered Machinery' },
    { label: 'Battery Sprayers & Mulch', value: 'Sprayers & Protection' },
    { label: 'Drip & Solar Pumps', value: 'Irrigation & Pumps' },
    { label: 'Seeders & Harvesters', value: 'Hand & Harvesting Tools' },
    { label: 'Soil Testers & Animal Guards', value: 'Soil Testing & Monitoring' },
  ];

  const filteredInstruments = useMemo(() => {
    return FARMING_INSTRUMENTS.filter((item) => {
      const matchesCat =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSubsidy = !subsidyOnly || item.subsidyEligible;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.features.some((f) => f.toLowerCase().includes(q));
      return matchesCat && matchesSubsidy && matchesSearch;
    });
  }, [searchQuery, selectedCategory, subsidyOnly]);

  const openOrderModal = (instrument: FarmingInstrument) => {
    setOrderingInstrument(instrument);
    setOrderQuantity(1);
    setConfirmedOrder(null);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderingInstrument) return;

    setIsSubmittingOrder(true);

    setTimeout(() => {
      const unitPrice = orderingInstrument.price;
      const subtotal = unitPrice * orderQuantity;
      // If subsidy claim is selected or applicable, provide estimated subsidy discount
      const subsidyPerUnit = orderingInstrument.subsidyEligible ? 500 : 0;
      const totalSubsidy = subsidyPerUnit * orderQuantity;
      const totalAmount = subtotal - totalSubsidy;

      const newOrder: InstrumentOrder = {
        id: `ord-inst-${Date.now()}`,
        orderCode: `EQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        farmerId: currentUser?.id || 'usr_farmer',
        farmerName,
        farmerPhone: contactPhone,
        farmAddress: deliveryAddress,
        items: [
          {
            instrument: orderingInstrument,
            quantity: orderQuantity,
          },
        ],
        subtotal,
        subsidyDiscount: totalSubsidy,
        deliveryFee: 0,
        totalAmount,
        paymentMethod,
        status: 'Confirmed',
        orderDate: new Date().toISOString(),
        estimatedDelivery: 'Within 3-4 Working Days',
        trackingId: `TRK-AGRI-${Math.floor(100000 + Math.random() * 900000)}`,
      };

      const updatedOrders = [newOrder, ...myOrders];
      setMyOrders(updatedOrders);
      try {
        localStorage.setItem(
          'kisansetu_instrument_orders',
          JSON.stringify(updatedOrders)
        );
      } catch (err) {
        console.error(err);
      }

      setIsSubmittingOrder(false);
      setConfirmedOrder(newOrder);
      setOrderingInstrument(null);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2A4426] to-[#3E6135] text-white p-5 sm:p-7 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#EBF1E8] border border-white/20 text-xs font-semibold mb-3">
            <Wrench className="w-3.5 h-3.5 text-[#A2BA95]" />
            Direct Manufacturer Agri-Tools & Machinery Marketplace
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight leading-tight">
            Buy Farming Instruments & Tools
          </h2>
          <p className="text-xs sm:text-sm text-[#D5DFD1] mt-2 leading-relaxed">
            Order commercial power tillers, solar pumps, battery knapsack sprayers, drip irrigation
            kits, and soil testing meters directly with doorstep farm delivery & government subsidy
            assistance.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex bg-black/20 p-1 rounded-2xl border border-white/20 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-white text-[#2D3A26] shadow-xs'
                    : 'text-white hover:text-[#EBF1E8]'
                }`}
              >
                Browse Instruments ({FARMING_INSTRUMENTS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my-orders')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my-orders'
                    ? 'bg-white text-[#2D3A26] shadow-xs'
                    : 'text-white hover:text-[#EBF1E8]'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> My Equipment Orders ({myOrders.length})
              </button>
            </div>

            {onViewSchemes && (
              <button
                type="button"
                onClick={onViewSchemes}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                🌾 View SMAM Subsidy Schemes
              </button>
            )}
          </div>
        </div>

        <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 opacity-15">
          <Wrench className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* VIEW 1: CATALOG TAB */}
      {activeTab === 'catalog' && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C9886] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (e.g. power tiller, sprayer, drip kit, solar pump, seed drill)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-xs text-[#2D3A26] placeholder-[#8C9886] focus:outline-none focus:border-[#5D7A4F] shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C9886] hover:text-[#2D3A26]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Subsidy Filter Toggle */}
            <button
              type="button"
              onClick={() => setSubsidyOnly(!subsidyOnly)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                subsidyOnly
                  ? 'bg-[#EBF1E8] border-[#5D7A4F] text-[#5D7A4F] shadow-2xs'
                  : 'bg-white border-[#E5E0D5] text-[#5D6D56] hover:border-[#5D7A4F]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#5D7A4F]" />
              <span>Government Subsidy Eligible Only</span>
              {subsidyOnly && <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7A4F]" />}
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-[#5D7A4F] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#5D6D56] border border-[#E5E0D5] hover:border-[#5D7A4F] hover:text-[#2D3A26]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Instruments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstruments.map((item) => {
              const discountPercent = Math.round(
                ((item.originalPrice - item.price) / item.originalPrice) * 100
              );
              return (
                <div
                  key={item.id}
                  className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#5D7A4F] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Box */}
                    <div className="relative h-44 bg-[#F1EDE4] overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#2D3A26] text-[10px] font-extrabold shadow-xs">
                          {item.brand}
                        </span>
                        {item.subsidyEligible && (
                          <span className="px-2 py-0.5 rounded-full bg-[#5D7A4F] text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Subsidy Eligible
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#D97706] text-white text-[10px] font-bold shadow-xs">
                          {discountPercent}% OFF
                        </span>
                      </div>

                      {/* Power Source pill */}
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#A2BA95]" /> {item.powerSource}
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#8C9886]">
                        <span className="font-semibold text-[#5D7A4F]">{item.category}</span>
                        <div className="flex items-center gap-1 text-[#D97706] font-bold">
                          <Star className="w-3.5 h-3.5 fill-[#D97706]" />
                          <span>{item.rating}</span>
                          <span className="text-[#8C9886] font-normal">
                            ({item.reviewsCount})
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-[#2D3A26] font-serif leading-snug line-clamp-2">
                        {item.name}
                      </h3>

                      {/* Subsidy Highlight Note if applicable */}
                      {item.estimatedSubsidy && (
                        <div className="p-1.5 rounded-xl bg-[#EBF1E8] border border-[#D4CDBC] text-[11px] font-semibold text-[#5D7A4F] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>{item.estimatedSubsidy}</span>
                        </div>
                      )}

                      {/* Key features preview */}
                      <ul className="space-y-1 text-[11px] text-[#5D6D56] pt-1">
                        {item.features.slice(0, 2).map((f, i) => (
                          <li key={i} className="flex items-start gap-1 line-clamp-1">
                            <span className="text-[#5D7A4F] font-bold">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Pricing Block */}
                      <div className="pt-2 border-t border-[#E5E0D5] flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-[#2D3A26] font-serif">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[#8C9886] line-through">
                          ₹{item.originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#5D7A4F] font-semibold ml-auto">
                          {item.warrantyYears} Yr Warranty
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSpecsModalInstrument(item)}
                      className="px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] hover:border-[#5D7A4F] text-[#5D6D56] hover:text-[#2D3A26] text-xs font-semibold transition-colors cursor-pointer"
                      title="View full specs"
                    >
                      Specs
                    </button>
                    <button
                      type="button"
                      onClick={() => openOrderModal(item)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Buy / Order Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredInstruments.length === 0 && (
            <div className="p-8 text-center bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5]">
              <AlertCircle className="w-8 h-8 text-[#8C9886] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#2D3A26]">No instruments found</h4>
              <p className="text-xs text-[#5D6D56] mt-1">
                Try clearing search terms or removing the subsidy filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSubsidyOnly(false);
                }}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold"
              >
                Reset Catalog
              </button>
            </div>
          )}

          {/* Delivery & Warranty Assurance Guarantee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center gap-3">
              <Truck className="w-7 h-7 text-[#5D7A4F] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#2D3A26] block">Direct Farm Gate Delivery</span>
                <span className="text-[#8C9886]">Safe heavy cargo delivery across all rural pincodes</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-[#5D7A4F] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#2D3A26] block">Official Warranty & Spares</span>
                <span className="text-[#8C9886]">1 to 5 years manufacturer on-field repair warranty</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-[#5D7A4F] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#2D3A26] block">DBT Subsidy Assistance</span>
                <span className="text-[#8C9886]">Official GST invoice provided for SMAM DBT claims</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MY EQUIPMENT ORDERS TAB */}
      {activeTab === 'my-orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#2D3A26] font-serif">
              My Equipment Purchases & Delivery Status
            </h3>
            <span className="text-xs text-[#5D6D56]">
              Total Orders: <strong className="text-[#2D3A26]">{myOrders.length}</strong>
            </span>
          </div>

          {myOrders.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5]">
              <Package className="w-10 h-10 text-[#8C9886] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#2D3A26]">No equipment orders yet</h4>
              <p className="text-xs text-[#5D6D56] mt-1">
                Explore our catalog to order power tillers, sprayers, solar pumps and irrigation kits.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-bold"
              >
                Browse Equipment Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#FAF8F5] rounded-3xl border border-[#E5E0D5] p-5 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E0D5] gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#2D3A26]">
                          Order {order.orderCode}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#5D7A4F] text-[10px] font-bold border border-[#D4CDBC]">
                          {order.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8C9886] block mt-0.5">
                        Placed on {new Date(order.orderDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })} • Tracking: <strong className="text-[#2D3A26]">{order.trackingId}</strong>
                      </span>
                    </div>

                    <div className="text-right sm:text-right">
                      <span className="text-base font-extrabold text-[#2D3A26] font-serif block">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#5D6D56]">
                        Pay mode: {order.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {order.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-[#E5E0D5]"
                      >
                        <img
                          src={it.instrument.image}
                          alt={it.instrument.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <h4 className="font-bold text-[#2D3A26] truncate">
                            {it.instrument.name}
                          </h4>
                          <span className="text-[11px] text-[#8C9886]">
                            Qty: {it.quantity} • Brand: {it.instrument.brand}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#2D3A26] shrink-0">
                          ₹{(it.instrument.price * it.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Info */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#5D6D56] gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0" />
                      <span className="truncate">Delivering to: {order.farmAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#2D3A26] font-semibold shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[#5D7A4F]" />
                      <span>ETA: {order.estimatedDelivery}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: QUICK TECHNICAL SPECS MODAL */}
      {specsModalInstrument && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E5E0D5] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E0D5] flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5D7A4F]">
                  {specsModalInstrument.brand} • {specsModalInstrument.category}
                </span>
                <h3 className="text-base font-bold text-[#2D3A26] font-serif mt-0.5">
                  {specsModalInstrument.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSpecsModalInstrument(null)}
                className="p-1.5 rounded-lg text-[#8C9886] hover:text-[#2D3A26] hover:bg-[#E5E0D5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="flex gap-3">
                <img
                  src={specsModalInstrument.image}
                  alt={specsModalInstrument.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover shrink-0"
                />
                <div>
                  <span className="text-base font-extrabold text-[#2D3A26] font-serif block">
                    ₹{specsModalInstrument.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-[#8C9886] line-through block">
                    MRP: ₹{specsModalInstrument.originalPrice.toLocaleString('en-IN')}
                  </span>
                  {specsModalInstrument.estimatedSubsidy && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#EBF1E8] text-[#5D7A4F] text-[10px] font-bold">
                      {specsModalInstrument.estimatedSubsidy}
                    </span>
                  )}
                  <p className="text-[11px] text-[#5D6D56] mt-1 line-clamp-2">
                    {specsModalInstrument.description}
                  </p>
                </div>
              </div>

              {/* Specs Table */}
              <div>
                <h4 className="font-bold text-[#2D3A26] uppercase text-[11px] tracking-wider mb-2">
                  Technical Specifications
                </h4>
                <div className="border border-[#E5E0D5] rounded-2xl overflow-hidden divide-y divide-[#E5E0D5]">
                  {Object.entries(specsModalInstrument.specifications).map(([key, val]) => (
                    <div key={key} className="p-2.5 flex items-center justify-between text-xs bg-white">
                      <span className="text-[#8C9886] font-medium">{key}</span>
                      <span className="font-bold text-[#2D3A26] text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              <div>
                <h4 className="font-bold text-[#2D3A26] uppercase text-[11px] tracking-wider mb-2">
                  Key Features & Included Attachments
                </h4>
                <div className="space-y-1.5">
                  {specsModalInstrument.features.map((feat, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-start gap-2 text-[#2D3A26]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7A4F] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E0D5] flex gap-2">
              <button
                type="button"
                onClick={() => setSpecsModalInstrument(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-[#E5E0D5] text-[#2D3A26] text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = specsModalInstrument;
                  setSpecsModalInstrument(null);
                  openOrderModal(item);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-bold"
              >
                Proceed to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IN-APP ORDER BOOKING & CHECKOUT MODAL */}
      {orderingInstrument && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E0D5] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#FAF8F5] border-b border-[#E5E0D5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#5D7A4F]" />
                <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                  Order Farming Equipment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderingInstrument(null)}
                className="p-1.5 rounded-lg text-[#8C9886] hover:text-[#2D3A26] hover:bg-[#E5E0D5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Product item summary */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center gap-3">
                <img
                  src={orderingInstrument.image}
                  alt={orderingInstrument.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-[#5D7A4F] font-bold uppercase">
                    {orderingInstrument.brand}
                  </span>
                  <h4 className="font-bold text-[#2D3A26] text-xs line-clamp-1">
                    {orderingInstrument.name}
                  </h4>
                  <span className="text-sm font-extrabold text-[#2D3A26] font-serif block mt-0.5">
                    ₹{orderingInstrument.price.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#E5E0D5]">
                  <button
                    type="button"
                    disabled={orderQuantity <= 1}
                    onClick={() => setOrderQuantity(orderQuantity - 1)}
                    className="p-1 rounded text-[#5D6D56] hover:text-[#2D3A26] disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-xs w-4 text-center">{orderQuantity}</span>
                  <button
                    type="button"
                    disabled={orderQuantity >= orderingInstrument.stockCount}
                    onClick={() => setOrderQuantity(orderQuantity + 1)}
                    className="p-1 rounded text-[#5D6D56] hover:text-[#2D3A26] disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#2D3A26] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#5D7A4F]" /> Farm Delivery Address
                </h4>

                <div>
                  <label className="font-semibold text-[#5D6D56] block mb-1">
                    Farmer Contact Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-[#2D3A26] font-semibold focus:outline-none focus:border-[#5D7A4F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#5D6D56] block mb-1">
                    Mobile Phone (For Delivery Driver):
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-[#2D3A26] font-semibold focus:outline-none focus:border-[#5D7A4F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#5D6D56] block mb-1">
                    Farm Location / Village / Tehsil Address:
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-[#2D3A26] font-semibold focus:outline-none focus:border-[#5D7A4F]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#2D3A26] uppercase text-[11px] tracking-wider">
                  Payment Method
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      paymentMethod === 'Cash on Delivery'
                        ? 'border-[#5D7A4F] bg-[#EBF1E8]'
                        : 'border-[#E5E0D5] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'Cash on Delivery'}
                      onChange={() => setPaymentMethod('Cash on Delivery')}
                      className="text-[#5D7A4F] focus:ring-[#5D7A4F]"
                    />
                    <Banknote className="w-4 h-4 text-[#5D7A4F]" />
                    <div>
                      <span className="font-bold text-[#2D3A26] block">
                        Cash on Delivery at Farm Gate
                      </span>
                      <span className="text-[10px] text-[#5D6D56]">
                        Inspect equipment upon delivery before cash payment
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      paymentMethod === 'UPI / Online'
                        ? 'border-[#5D7A4F] bg-[#EBF1E8]'
                        : 'border-[#E5E0D5] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'UPI / Online'}
                      onChange={() => setPaymentMethod('UPI / Online')}
                      className="text-[#5D7A4F] focus:ring-[#5D7A4F]"
                    />
                    <CreditCard className="w-4 h-4 text-[#5D7A4F]" />
                    <div>
                      <span className="font-bold text-[#2D3A26] block">
                        UPI / QR Code / NetBanking
                      </span>
                      <span className="text-[10px] text-[#5D6D56]">
                        Instant digital payment with official tax invoice
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      paymentMethod === 'Government Subsidy Direct Claim'
                        ? 'border-[#5D7A4F] bg-[#EBF1E8]'
                        : 'border-[#E5E0D5] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'Government Subsidy Direct Claim'}
                      onChange={() => setPaymentMethod('Government Subsidy Direct Claim')}
                      className="text-[#5D7A4F] focus:ring-[#5D7A4F]"
                    />
                    <ShieldCheck className="w-4 h-4 text-[#5D7A4F]" />
                    <div>
                      <span className="font-bold text-[#2D3A26] block">
                        Direct Subsidy Verification Mode
                      </span>
                      <span className="text-[10px] text-[#5D6D56]">
                        Dealer forwards invoice directly to Taluka Agriculture Office
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#5D6D56]">
                  <span>Equipment Cost ({orderQuantity} unit)</span>
                  <span className="font-semibold text-[#2D3A26]">
                    ₹{(orderingInstrument.price * orderQuantity).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#5D6D56]">
                  <span>Rural Farm Freight & Handling</span>
                  <span className="font-bold text-[#5D7A4F]">FREE (Promotional)</span>
                </div>
                {orderingInstrument.subsidyEligible && (
                  <div className="flex justify-between text-[#5D7A4F] font-semibold">
                    <span>DBT Subsidy Claim Assistance</span>
                    <span>Included</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E5E0D5] flex justify-between font-bold text-[#2D3A26] text-sm">
                  <span>Total Amount Payable:</span>
                  <span className="text-base text-[#5D7A4F] font-serif">
                    ₹{(orderingInstrument.price * orderQuantity).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOrder ? (
                    'Confirming Order...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirm Order (₹
                      {(orderingInstrument.price * orderQuantity).toLocaleString('en-IN')})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMED ORDER SUCCESS DIALOG */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E0D5] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#EBF1E8] text-[#5D7A4F] flex items-center justify-center mx-auto ring-8 ring-[#FAF8F5]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#5D7A4F] uppercase tracking-wider">
                Order Placed Successfully!
              </span>
              <h3 className="text-xl font-bold text-[#2D3A26] font-serif mt-1">
                Equipment Booking Confirmed
              </h3>
              <p className="text-xs text-[#5D6D56] mt-1">
                Your order code is{' '}
                <strong className="text-[#2D3A26]">{confirmedOrder.orderCode}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#8C9886]">Total Paid / COD:</span>
                <span className="font-bold text-[#2D3A26]">
                  ₹{confirmedOrder.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C9886]">Tracking Code:</span>
                <span className="font-bold text-[#5D7A4F]">
                  {confirmedOrder.trackingId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C9886]">Estimated Farm Arrival:</span>
                <span className="font-semibold text-[#2D3A26]">
                  {confirmedOrder.estimatedDelivery}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8C9886]">
              A GST tax invoice copy and warranty registration certificate have been dispatched to
              your registered contact.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  setActiveTab('my-orders');
                }}
                className="w-full py-2.5 rounded-xl bg-[#5D7A4F] text-white text-xs font-bold shadow-2xs cursor-pointer"
              >
                Track in My Equipment Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
