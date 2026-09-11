import React, { useState, useEffect } from 'react';
import { FarmPlotListing, FarmPartnership, User, PartnershipInstallment } from '../../types.js';
import { api, calculateDistanceKm } from '../../lib/api.js';
import { PartnershipCalculatorModal } from './PartnershipCalculatorModal.js';
import { PartnershipInvoiceModal } from './PartnershipInvoiceModal.js';
import { PayInstallmentModal } from './PayInstallmentModal.js';
import {
  Sprout,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Truck,
  DollarSign,
  Package,
  Droplets,
  Zap,
  Lock,
  ChevronRight,
  Filter,
  Search,
  ExternalLink,
  AlertCircle,
  Camera,
  Check,
  Building,
  ArrowLeft,
  FileText,
  Printer,
  Receipt,
  CreditCard,
} from 'lucide-react';

interface ConsumerPartnershipsViewProps {
  user: User;
  onNavigateToMarket?: () => void;
}

export const ConsumerPartnershipsView: React.FC<ConsumerPartnershipsViewProps> = ({
  user,
  onNavigateToMarket,
}) => {
  const [subTab, setSubTab] = useState<'explore' | 'my_projects'>('explore');
  const [plots, setPlots] = useState<FarmPlotListing[]>([]);
  const [partnerships, setPartnerships] = useState<FarmPartnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter for Plots
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('all');

  // Calculator modal state
  const [selectedPlotForFunding, setSelectedPlotForFunding] = useState<FarmPlotListing | null>(null);

  // Settlement modal / state for harvested project
  const [settlementProject, setSettlementProject] = useState<FarmPartnership | null>(null);
  const [settleChoice, setSettleChoice] = useState<'take_produce' | 'sell_in_marketplace'>('take_produce');
  const [deliveryAddressInput, setDeliveryAddressInput] = useState(
    user.deliveryAddresses?.[0]?.streetAddress ||
      user.currentBrowsingLocation?.label ||
      'Baner Road, Pune, Maharashtra'
  );
  const [marketPricePerUnit, setMarketPricePerUnit] = useState<number>(38);
  const [isSettling, setIsSettling] = useState(false);
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState<string | null>(null);

  // Notification / Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Billing & Invoices
  const [viewingInvoiceProject, setViewingInvoiceProject] = useState<FarmPartnership | null>(null);
  const [payingInstallmentState, setPayingInstallmentState] = useState<{
    partnership: FarmPartnership;
    installment: PartnershipInstallment;
  } | null>(null);

  const handleInstallmentPaid = (updated: FarmPartnership) => {
    setPartnerships((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (viewingInvoiceProject && viewingInvoiceProject.id === updated.id) {
      setViewingInvoiceProject(updated);
    }
    showToast(`Installment successfully paid and secured in escrow!`);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPlots, fetchedPartnerships] = await Promise.all([
        api.getPlots({ status: 'available' }),
        api.getPartnerships({ consumerId: user.id }),
      ]);
      setPlots(fetchedPlots);
      setPartnerships(fetchedPartnerships);
      // If consumer has active projects, default to my_projects or keep explore
      if (fetchedPartnerships.length > 0 && subTab === 'explore' && fetchedPlots.length === 0) {
        setSubTab('my_projects');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load farming partnerships data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Filtered plots
  const filteredPlots = plots.filter((plot) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      plot.plotName.toLowerCase().includes(q) ||
      plot.farmName.toLowerCase().includes(q) ||
      plot.farmerName.toLowerCase().includes(q) ||
      plot.farmLocation.toLowerCase().includes(q) ||
      plot.supportedCrops.some((c) => c.toLowerCase().includes(q));

    const matchesCrop =
      cropFilter === 'all' ||
      plot.supportedCrops.some((c) => c.toLowerCase().includes(cropFilter.toLowerCase()));

    return matchesSearch && matchesCrop;
  });

  // Handle successful partnership creation from modal
  const handlePartnershipCreated = async (partnershipData: any) => {
    try {
      const res = await api.createPartnership(partnershipData);
      setSelectedPlotForFunding(null);
      showToast(res.message || 'Farming project successfully funded and launched!');
      await loadData();
      setSubTab('my_projects');
    } catch (err: any) {
      throw err;
    }
  };

  // Handle settlement submission
  const handleExecuteSettlement = async () => {
    if (!settlementProject) return;
    setIsSettling(true);
    try {
      const res = await api.settlePartnership(settlementProject.id, {
        choice: settleChoice,
        deliveryAddress: settleChoice === 'take_produce' ? deliveryAddressInput : undefined,
        sellingPricePerUnit: settleChoice === 'sell_in_marketplace' ? marketPricePerUnit : undefined,
      });
      setSettlementProject(null);
      showToast(res.message || 'Partnership settled successfully!');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Settlement failed', 'error');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        {onNavigateToMarket && (
          <button
            type="button"
            onClick={onNavigateToMarket}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5] text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Fresh Produce Market</span>
          </button>
        )}
        {subTab === 'my_projects' && (
          <button
            type="button"
            onClick={() => setSubTab('explore')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC] text-xs font-semibold"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Explore Plots</span>
          </button>
        )}
      </div>

      {/* Toast Notice */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-md ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Hero Explainer Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1A331E] via-[#224527] to-[#2E5C35] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Farm Land Booking & Consumer-Funded Agriculture (Farm Fund)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Rent Available Farm Land. Book a Crop Plan. Own 100% of the Harvest.
          </h1>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Choose verified farmer land plots (0.1 to multiple acres), book your seasonal organic crop plan, and fund farming expenses (certified seeds, drip irrigation, electricity, and skilled farmer labor). The farmer cultivates your designated plot, and you receive the fresh harvested produce delivered to your doorstep or sold in the marketplace for direct revenue.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-300 flex-shrink-0" />
              <div>
                <span className="font-bold block text-white">Land Ownership Stays with Farmer</span>
                <span className="text-[10px] text-emerald-200">Zero legal encumbrances</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-300 flex-shrink-0" />
              <div>
                <span className="font-bold block text-white">100% Harvest Entitlement</span>
                <span className="text-[10px] text-emerald-200">Consumer owns produce rights</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-300 flex-shrink-0" />
              <div>
                <span className="font-bold block text-white">Escrow-Secured Funds</span>
                <span className="text-[10px] text-emerald-200">Released as milestones progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setSubTab('explore')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'explore'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Available Farm Land to Rent / Fund</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
            {plots.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('my_projects')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'my_projects'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Rented & Funded Farm Projects</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold">
            {partnerships.length}
          </span>
        </button>
      </div>

      {/* TAB 1: EXPLORE AVAILABLE PLOTS */}
      {subTab === 'explore' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by farm, plot name, crop, soil, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Crop Categories</option>
                <option value="Tomatoes">Tomatoes</option>
                <option value="Strawberries">Strawberries</option>
                <option value="Bell Peppers">Bell Peppers</option>
                <option value="Turmeric">Turmeric</option>
                <option value="Corn">Sweet Corn</option>
                <option value="Wheat">Organic Wheat</option>
              </select>
            </div>
          </div>

          {/* Plots Grid */}
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Scanning verified available farm plots...</p>
            </div>
          ) : filteredPlots.length === 0 ? (
            <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-200 p-8">
              <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Farm Plots Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                No land plots match your search criteria. Try clearing filters or check back shortly as farmers list new seasonal acreage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlots.map((plot) => {
                const distance = calculateDistanceKm(
                  user.currentBrowsingLocation?.lat,
                  user.currentBrowsingLocation?.lng,
                  plot.farmLat,
                  plot.farmLng
                );

                return (
                  <div
                    key={plot.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Plot Image / Header */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={plot.images?.[0] || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80'}
                        alt={plot.plotName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-extrabold shadow-sm flex items-center gap-1">
                          <span>📍</span> {plot.areaSize} {plot.areaUnit} Land to Rent
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-[#1A331E] font-black text-[10px] tracking-wide uppercase shadow-xs">
                          Farm Fund Plan
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-semibold">
                          {plot.farmingStyle || 'Organic'}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 text-emerald-300 font-mono text-[10px] border border-white/10">
                          {plot.plotIdentifier}
                        </span>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="text-base font-bold leading-snug drop-shadow-sm">{plot.plotName}</h3>
                        <p className="text-xs text-emerald-200 flex items-center gap-1 mt-0.5">
                          <span>{plot.farmName}</span>
                          {distance && (
                            <span className="bg-black/40 px-1.5 py-0.2 rounded text-[10px] text-white">
                              {distance.toFixed(1)} km away
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Plot Body */}
                    <div className="p-4 flex-1 flex flex-col space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Soil Profile</span>
                          <span className="font-semibold text-gray-800 line-clamp-1">{plot.soilType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Irrigation</span>
                          <span className="font-semibold text-gray-800 line-clamp-1">{plot.waterSource}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {plot.description}
                      </p>

                      {/* Supported Crops */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                          Supported Crops
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {plot.supportedCrops.map((crop, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-medium"
                            >
                              🌱 {crop}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Rental Plan Package Feature Highlights */}
                      <div className="p-2 rounded-xl bg-[#F8FAF7] border border-[#E3ECE0] text-[11px] text-gray-700 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-emerald-900">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>100% Harvest Rights to Consumer</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Included</span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          Full package covers seeds, drip irrigation, electricity & dedicated farmer labor.
                        </p>
                      </div>

                      {/* Farmer info */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Managing Farmer</span>
                          <span className="font-bold text-gray-800">{plot.farmerName}</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                          Available for Rent
                        </span>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 mt-auto">
                        <button
                          onClick={() => setSelectedPlotForFunding(plot)}
                          className="w-full py-2.5 rounded-xl bg-[#1A331E] hover:bg-[#25492b] active:bg-[#122415] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Sprout className="w-4 h-4 text-amber-300" />
                          <span>Book Plan / Rent This Land</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
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

      {/* TAB 2: MY FUNDED FARM PROJECTS */}
      {subTab === 'my_projects' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Loading your funded farm projects...</p>
            </div>
          ) : partnerships.length === 0 ? (
            <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-200 p-8">
              <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Active Farm Partnerships Yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                You haven't funded any farm plots yet. Browse available plots to sponsor a dedicated farming project and receive 100% of the harvest!
              </p>
              <button
                onClick={() => setSubTab('explore')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <span>Browse Available Farm Plots</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {partnerships.map((p) => {
                const isHarvested = p.status === 'harvested';
                const isSettled = p.status === 'settled';

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Project Header */}
                    <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#1A331E] text-white">
                            #{p.partnershipCode}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isSettled
                                ? 'bg-purple-100 text-purple-800'
                                : isHarvested
                                ? 'bg-amber-100 text-amber-900 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Stage: {p.currentStage || 'Cultivation Active'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            • Started {p.startDate}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{p.cropName}</h2>
                        <p className="text-xs text-gray-600">
                          {p.areaSize} {p.areaUnit} on {p.plotName} ({p.farmName}) • Managing Farmer: <strong>{p.farmerName}</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-right mr-2">
                          <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Capital Funded</span>
                          <span className="text-lg font-black text-gray-900">₹{p.totalFundingAmount.toLocaleString('en-IN')}</span>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                              {p.paymentStatus}
                            </span>
                            {p.billingPlan && (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-semibold capitalize">
                                {p.billingPlan} plan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Button: View Tax Invoice & Deed */}
                        <button
                          type="button"
                          onClick={() => setViewingInvoiceProject(p)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-1.5 border border-gray-300 shadow-2xs transition-all cursor-pointer"
                          title="View Official Tax Invoice & Land Rental Deed"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Invoice & Deed</span>
                        </button>

                        {/* If harvested and not settled, show Action Button */}
                        {isHarvested && !isSettled && (
                          <button
                            onClick={() => setSettlementProject(p)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-100" />
                            <span>Claim Produce / Sell in Market</span>
                          </button>
                        )}

                        {isSettled && (
                          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-purple-600" />
                            <span>
                              {p.settlement?.choice === 'sell_in_marketplace'
                                ? `Market Sale Settled (₹${p.settlement.consumerNetPayout?.toLocaleString('en-IN')} Payout)`
                                : 'Produce Dispatched to Doorstep'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Stages */}
                    <div className="p-5 border-b border-gray-100 bg-white">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-gray-700">Farming Lifecycle Progress</span>
                        <span className="font-black text-emerald-700">{p.progressPercentage || 25}% Completed</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                          style={{ width: `${p.progressPercentage || 25}%` }}
                        />
                      </div>

                      {/* Stage Milestones Breadcrumb */}
                      <div className="grid grid-cols-5 gap-1 pt-3 text-center text-[10px] text-gray-500 font-medium">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mb-1" />
                          <span>1. Plot Prep</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mb-1 ${(p.progressPercentage || 0) >= 30 ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                          <span>2. Sowing</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mb-1 ${(p.progressPercentage || 0) >= 55 ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                          <span>3. Crop Care</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mb-1 ${(p.progressPercentage || 0) >= 80 ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                          <span>4. Flowering</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mb-1 ${(p.progressPercentage || 0) >= 100 ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                          <span className="font-bold">5. Harvest</span>
                        </div>
                      </div>
                    </div>

                    {/* Harvest Announcement Banner if ready */}
                    {isHarvested && p.harvestRecord && (
                      <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                            🌾
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                              Harvest Complete & Inspected!
                            </span>
                            <h4 className="text-sm font-bold text-amber-950">
                              Yield: {p.harvestRecord.harvestedQuantity} {p.harvestRecord.harvestUnit} (Grade {p.harvestRecord.qualityGrade})
                            </h4>
                            <p className="text-xs text-amber-800/80">
                              Farmer Note: "{p.harvestRecord.farmerNotes || 'Fresh harvest ready for dispatch or marketplace auction.'}"
                            </p>
                          </div>
                        </div>

                        {!isSettled && (
                          <button
                            onClick={() => setSettlementProject(p)}
                            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
                          >
                            Decide: Take Produce vs Sell for Cash
                          </button>
                        )}
                      </div>
                    )}

                    {/* Photographic Milestone Feed & Cost Transparency */}
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Milestones timeline (2 Cols) */}
                      <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>Farmer Milestone Updates & Photo Proof</span>
                        </h4>

                        {p.milestones && p.milestones.length > 0 ? (
                          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                            {p.milestones.map((m, index) => (
                              <div key={m.id || index} className="relative pl-8">
                                <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-bold text-gray-900">{m.title}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{m.date}</span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed mb-2">{m.description}</p>
                                  {m.photoUrl && (
                                    <div className="rounded-lg overflow-hidden border border-gray-200 max-w-sm">
                                      <img
                                        src={m.photoUrl}
                                        alt={m.title}
                                        className="w-full h-36 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  )}
                                  <div className="mt-2 text-[10px] text-gray-400">
                                    Stage: <span className="font-semibold text-emerald-700">{m.stage}</span> • Logged by: {m.recordedBy || 'Farmer'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No milestone updates posted yet.</p>
                        )}
                      </div>

                      {/* Transparent Cost Breakdown (1 Col) */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-fit space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span>Funded Expense Breakdown</span>
                        </h4>

                        <div className="space-y-2 text-xs divide-y divide-gray-200">
                          <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Seeds & Saplings</span>
                            <span className="font-bold text-gray-800">₹{p.costBreakdown.seedsPlantingCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Fertilizers & Nutrients</span>
                            <span className="font-bold text-gray-800">₹{p.costBreakdown.fertilizersChemicalsCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Water & Irrigation</span>
                            <span className="font-bold text-gray-800">₹{p.costBreakdown.waterIrrigationCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Electricity & Utilities</span>
                            <span className="font-bold text-gray-800">₹{p.costBreakdown.electricityUtilitiesCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Packaging & Operations</span>
                            <span className="font-bold text-gray-800">₹{p.costBreakdown.otherExpensesCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-1 text-emerald-800 font-bold bg-emerald-100/50 p-1 rounded">
                            <span>Farmer Cultivation Fee</span>
                            <span>₹{p.costBreakdown.farmerCultivationServiceFee.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between pt-2 text-sm font-black text-gray-900">
                            <span>Total Capital Funded</span>
                            <span>₹{p.totalFundingAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Billing Schedule & Installments */}
                        {p.billingDetails?.installments && p.billingDetails.installments.length > 0 && (
                          <div className="pt-3 border-t border-gray-200 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-800 flex items-center gap-1">
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Milestone Billing Schedule</span>
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                Paid: ₹{p.billingDetails.amountPaidToday.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {p.billingDetails.installments.map((inst, idx) => (
                                <div
                                  key={inst.id || idx}
                                  className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                                    inst.status === 'Paid'
                                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                      : 'bg-white border-gray-200 text-gray-800'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold">
                                        #{inst.installmentNumber} {inst.stageName || inst.title}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {inst.status === 'Paid' ? (
                                        <span className="text-emerald-700 font-medium">
                                          Paid on {inst.paidAt ? inst.paidAt.split('T')[0] : 'Today'}
                                        </span>
                                      ) : (
                                        <span>Due: {inst.dueDate}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right flex items-center gap-2">
                                    <span className="font-bold text-gray-900">
                                      ₹{inst.amount.toLocaleString('en-IN')}
                                    </span>
                                    {inst.status === 'Paid' ? (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Paid</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPayingInstallmentState({ partnership: p, installment: inst })}
                                        className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                      >
                                        <Lock className="w-3 h-3" />
                                        <span>Pay</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* View / Print Tax Invoice & Deed Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setViewingInvoiceProject(p)}
                            className="w-full py-2 px-3 rounded-xl bg-[#1A331E] hover:bg-[#25492b] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-300" />
                            <span>View / Print Land Rental Deed & Bill</span>
                          </button>
                        </div>

                        {/* Legal terms reminder */}
                        <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed">
                          🛡️ <strong>Ownership Guarantee:</strong> Farmer maintains 100% land title. Consumer maintains 100% produce ownership.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* POPUP: Partnership Calculator & Escrow Funding Modal */}
      {selectedPlotForFunding && (
        <PartnershipCalculatorModal
          plot={selectedPlotForFunding}
          consumerId={user.id}
          consumerName={user.fullName}
          consumerPhone={user.phone || ''}
          consumerEmail={user.email}
          onClose={() => setSelectedPlotForFunding(null)}
          onSuccess={handlePartnershipCreated}
        />
      )}

      {/* POPUP: Harvest Settlement Decision Modal (Take Produce vs Sell in Marketplace) */}
      {settlementProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-emerald-100 space-y-5 my-auto text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Harvest Settlement
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  Exercise Your Crop Produce Rights
                </h3>
                <p className="text-xs text-gray-500">
                  Project #{settlementProject.partnershipCode} • {settlementProject.cropName}
                </p>
              </div>
              <button
                onClick={() => setSettlementProject(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Harvest Summary */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-900 block font-bold">Total Harvested Produce</span>
                <span className="text-2xl font-black text-emerald-800">
                  {settlementProject.harvestRecord?.harvestedQuantity || 500} {settlementProject.harvestRecord?.harvestUnit || 'kg'}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                Grade {settlementProject.harvestRecord?.qualityGrade || 'A+'} Peak Quality
              </span>
            </div>

            {/* Choose Settlement Path */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Select What You Wish to Do With Your Harvest:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Doorstep Delivery */}
                <div
                  onClick={() => setSettleChoice('take_produce')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settleChoice === 'take_produce'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className="w-5 h-5 text-emerald-700" />
                    {settleChoice === 'take_produce' && (
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Doorstep Delivery</h4>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Receive 100% of your freshly harvested farm produce packed in crates delivered directly to your home.
                  </p>
                </div>

                {/* Option 2: Sell in Marketplace */}
                <div
                  onClick={() => setSettleChoice('sell_in_marketplace')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    settleChoice === 'sell_in_marketplace'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 text-amber-700" />
                    {settleChoice === 'sell_in_marketplace' && (
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Sell in Marketplace</h4>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Liquidate your harvest to KisanSetu verified buyers at current market prices and receive cash payout.
                  </p>
                </div>
              </div>
            </div>

            {/* Details for Choice */}
            {settleChoice === 'take_produce' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Delivery Address for Farm Dispatch:</label>
                <textarea
                  rows={2}
                  value={deliveryAddressInput}
                  onChange={(e) => setDeliveryAddressInput(e.target.value)}
                  placeholder="Enter full street address, flat number, city, pincode..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-amber-900 font-medium">Market Benchmark Price:</span>
                  <div className="flex items-center gap-1 font-bold">
                    <span>₹</span>
                    <input
                      type="number"
                      value={marketPricePerUnit}
                      onChange={(e) => setMarketPricePerUnit(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded border border-amber-300 text-right font-bold"
                    />
                    <span>/ kg</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-amber-200/80 font-black text-sm text-gray-900">
                  <span>Gross Payout Credited to Consumer:</span>
                  <span className="text-emerald-800 text-base">
                    ₹
                    {(
                      (settlementProject.harvestRecord?.harvestedQuantity || 500) *
                      marketPricePerUnit
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSettlementProject(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSettlement}
                disabled={isSettling}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20"
              >
                {isSettling ? (
                  <span>Processing Settlement...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Execute Settlement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Land Rental Tax Invoice & Deed Modal */}
      {viewingInvoiceProject && (
        <PartnershipInvoiceModal
          partnership={viewingInvoiceProject}
          onClose={() => setViewingInvoiceProject(null)}
        />
      )}

      {/* POPUP: Pay Milestone Installment Modal */}
      {payingInstallmentState && (
        <PayInstallmentModal
          partnership={payingInstallmentState.partnership}
          installment={payingInstallmentState.installment}
          onClose={() => setPayingInstallmentState(null)}
          onSuccess={handleInstallmentPaid}
        />
      )}
    </div>
  );
};
