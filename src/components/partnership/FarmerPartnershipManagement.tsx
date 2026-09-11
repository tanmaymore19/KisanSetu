import React, { useState, useEffect } from 'react';
import { FarmPlotListing, FarmPartnership, User, PartnershipStage } from '../../types.js';
import { api } from '../../lib/api.js';
import {
  Sprout,
  Plus,
  Layers,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Clock,
  Camera,
  Trash2,
  Edit2,
  Lock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  Upload,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Package,
} from 'lucide-react';

interface FarmerPartnershipManagementProps {
  user: User;
}

export const FarmerPartnershipManagement: React.FC<FarmerPartnershipManagementProps> = ({ user }) => {
  const [subTab, setSubTab] = useState<'plots' | 'active_projects'>('active_projects');
  const [plots, setPlots] = useState<FarmPlotListing[]>([]);
  const [partnerships, setPartnerships] = useState<FarmPartnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Plot Modal state
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [plotIdentifier, setPlotIdentifier] = useState('');
  const [areaSize, setAreaSize] = useState('1');
  const [areaUnit, setAreaUnit] = useState<'acre' | 'guntha' | 'hectare' | 'sqft'>('acre');
  const [soilType, setSoilType] = useState('Fertile Deep Black Soil (Riverbed Alluvial)');
  const [waterSource, setWaterSource] = useState('Borewell & Automated Drip Irrigation');
  const [supportedCropsInput, setSupportedCropsInput] = useState('Organic Tomatoes, Exotic Bell Peppers, Desi Wheat');
  const [plotDescription, setPlotDescription] = useState(
    'Prime arable land enriched with organic compost and vermicompost for multiple continuous seasons. Equipped with micro-drip lines and solar fencing.'
  );
  const [plotImageUrl, setPlotImageUrl] = useState(
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
  );
  const [isCreatingPlot, setIsCreatingPlot] = useState(false);

  // Post Milestone Modal state
  const [milestoneProject, setMilestoneProject] = useState<FarmPartnership | null>(null);
  const [milestoneStage, setMilestoneStage] = useState<PartnershipStage>('Irrigation & Crop Care');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestonePhoto, setMilestonePhoto] = useState(
    'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80'
  );
  const [milestoneProgress, setMilestoneProgress] = useState(50);
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);

  // Record Harvest Modal state
  const [harvestProject, setHarvestProject] = useState<FarmPartnership | null>(null);
  const [harvestQuantity, setHarvestQuantity] = useState('3500');
  const [harvestUnit, setHarvestUnit] = useState('kg');
  const [harvestQualityGrade, setHarvestQualityGrade] = useState<'A+' | 'A' | 'B'>('A+');
  const [harvestNotes, setHarvestNotes] = useState('Freshly harvested at peak ripeness, inspected and crated.');
  const [harvestPhoto, setHarvestPhoto] = useState(
    'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80'
  );
  const [isSubmittingHarvest, setIsSubmittingHarvest] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPlots, fetchedPartnerships] = await Promise.all([
        api.getPlots({ farmerId: user.id }),
        api.getPartnerships({ farmerId: user.id }),
      ]);
      setPlots(fetchedPlots);
      setPartnerships(fetchedPartnerships);
    } catch (err: any) {
      setError(err.message || 'Failed to load partnerships data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Create Plot Handler
  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotName.trim() || !areaSize) {
      showToast('Please provide plot name and size', 'error');
      return;
    }

    setIsCreatingPlot(true);
    try {
      const cropsArray = supportedCropsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await api.createPlot({
        farmerId: user.id,
        plotName: plotName.trim(),
        plotIdentifier: plotIdentifier.trim() || undefined,
        areaSize: parseFloat(areaSize),
        areaUnit,
        soilType,
        waterSource,
        supportedCrops: cropsArray.length > 0 ? cropsArray : ['Organic Vegetables'],
        farmingStyle: user.farmDetails?.farmingStyle || 'Organic',
        description: plotDescription,
        images: [plotImageUrl],
      });

      showToast(res.message || 'Plot listed successfully for consumer funding!');
      setShowAddPlotModal(false);
      setPlotName('');
      setPlotIdentifier('');
      await loadData();
      setSubTab('plots');
    } catch (err: any) {
      showToast(err.message || 'Failed to list plot', 'error');
    } finally {
      setIsCreatingPlot(false);
    }
  };

  // Delete Plot Handler
  const handleDeletePlot = async (plotId: string) => {
    if (!confirm('Are you sure you want to remove this plot listing?')) return;
    try {
      await api.deletePlot(plotId);
      showToast('Plot listing removed.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove plot', 'error');
    }
  };

  // Submit Milestone Handler
  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneProject || !milestoneTitle.trim() || !milestoneDescription.trim()) {
      showToast('Please fill all milestone fields', 'error');
      return;
    }

    setIsSubmittingMilestone(true);
    try {
      const res = await api.addPartnershipMilestone(milestoneProject.id, {
        stage: milestoneStage,
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim(),
        photoUrl: milestonePhoto || undefined,
        progressPercentage: milestoneProgress,
      });

      showToast(res.message || 'Milestone update posted! Consumer will be notified.');
      setMilestoneProject(null);
      setMilestoneTitle('');
      setMilestoneDescription('');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to post milestone', 'error');
    } finally {
      setIsSubmittingMilestone(false);
    }
  };

  // Submit Harvest Handler
  const handleSubmitHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!harvestProject || !harvestQuantity) {
      showToast('Please provide harvest quantity', 'error');
      return;
    }

    setIsSubmittingHarvest(true);
    try {
      const res = await api.recordPartnershipHarvest(harvestProject.id, {
        harvestedQuantity: parseFloat(harvestQuantity),
        harvestUnit,
        qualityGrade: harvestQualityGrade,
        farmerNotes: harvestNotes,
        harvestPhoto: harvestPhoto || undefined,
      });

      showToast(res.message || 'Harvest recorded! Ready for consumer produce settlement.');
      setHarvestProject(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record harvest', 'error');
    } finally {
      setIsSubmittingHarvest(false);
    }
  };

  // Metrics
  const totalFundingSecured = partnerships.reduce((sum, p) => sum + (p.totalFundingAmount || 0), 0);
  const totalFarmerServiceFees = partnerships.reduce(
    (sum, p) => sum + (p.costBreakdown?.farmerCultivationServiceFee || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-md ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Available Plots</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {plots.filter((p) => p.status === 'available').length}
          </div>
          <span className="text-[11px] text-gray-400">Total {plots.length} plots configured</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Funded Projects</span>
            <Sprout className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{partnerships.length}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Consumer funded</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Capital Secured</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">₹{totalFundingSecured.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-blue-700 font-medium">Escrow Protected</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Farmer Labour Fees</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            ₹{totalFarmerServiceFees.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-gray-500">Cultivation compensation</span>
        </div>
      </div>

      {/* Sub-Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setSubTab('active_projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'active_projects'
                ? 'bg-[#1A331E] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Active Consumer Projects ({partnerships.length})</span>
          </button>

          <button
            onClick={() => setSubTab('plots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'plots'
                ? 'bg-[#1A331E] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>My Listed Land Plots ({plots.length})</span>
          </button>
        </div>

        <button
          onClick={() => setShowAddPlotModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Make New Plot Available</span>
        </button>
      </div>

      {/* SUB-TAB 1: ACTIVE CONSUMER-FUNDED PROJECTS */}
      {subTab === 'active_projects' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Loading consumer-funded partnerships...</p>
            </div>
          ) : partnerships.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 p-8">
              <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Funded Farm Projects Yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Once you list a land plot, consumers can fund cultivation for their chosen crop. All expenses and your cultivation service fees are secured in escrow upfront.
              </p>
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
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {p.currentStage}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            • Started {p.startDate}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{p.cropName}</h2>
                        <p className="text-xs text-gray-600">
                          {p.areaSize} {p.areaUnit} on {p.plotName} • Consumer Partner:{' '}
                          <strong className="text-gray-900">{p.consumerName}</strong> ({p.consumerPhone})
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!isHarvested && !isSettled && (
                          <>
                            <button
                              onClick={() => {
                                setMilestoneProject(p);
                                setMilestoneStage(p.currentStage as any);
                                setMilestoneProgress(p.progressPercentage || 50);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Post Milestone Photo</span>
                            </button>

                            <button
                              onClick={() => setHarvestProject(p)}
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Sprout className="w-4 h-4" />
                              <span>Record Harvest</span>
                            </button>
                          </>
                        )}

                        {isHarvested && !isSettled && (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Awaiting Consumer Produce Decision (Take vs Sell)</span>
                          </span>
                        )}

                        {isSettled && (
                          <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Partnership Settled & Completed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="p-4 border-b border-gray-100 bg-white">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-gray-700">Cultivation Lifecycle Progress</span>
                        <span className="font-black text-emerald-700">{p.progressPercentage || 25}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${p.progressPercentage || 25}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial Summary Strip */}
                    <div className="px-5 py-3 bg-emerald-50/50 border-b border-emerald-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Capital</span>
                          <span className="font-bold text-gray-900">₹{p.totalFundingAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Escrow State</span>
                          <span className="font-bold text-emerald-800">{p.paymentStatus}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Your Labour Fee</span>
                          <span className="font-extrabold text-emerald-700">
                            ₹{p.costBreakdown.farmerCultivationServiceFee.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {p.harvestRecord && (
                        <div className="text-right">
                          <span className="text-[10px] text-amber-800 uppercase font-bold block">Recorded Harvest</span>
                          <span className="font-extrabold text-amber-900">
                            {p.harvestRecord.harvestedQuantity} {p.harvestRecord.harvestUnit} (Grade {p.harvestRecord.qualityGrade})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Milestone Updates History */}
                    <div className="p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Logged Milestones & Photos</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {p.milestones?.map((m, idx) => (
                          <div
                            key={m.id || idx}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                                <span className="font-bold text-emerald-700 uppercase">{m.stage}</span>
                                <span className="font-mono">{m.date}</span>
                              </div>
                              <h5 className="text-xs font-bold text-gray-900 mb-1">{m.title}</h5>
                              <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed mb-2">
                                {m.description}
                              </p>
                            </div>

                            {m.photoUrl && (
                              <div className="h-28 rounded-lg overflow-hidden border border-gray-200 mt-auto">
                                <img
                                  src={m.photoUrl}
                                  alt={m.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LISTED LAND PLOTS */}
      {subTab === 'plots' && (
        <div className="space-y-4">
          {plots.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 p-8">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Land Plots Listed Yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Make a specific section of your farm land available for consumer-funded partnerships.
              </p>
              <button
                onClick={() => setShowAddPlotModal(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>List a Farm Plot</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plots.map((plot) => (
                <div
                  key={plot.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col"
                >
                  <div className="relative h-44 bg-gray-100">
                    <img
                      src={plot.images?.[0] || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80'}
                      alt={plot.plotName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-bold">
                        {plot.areaSize} {plot.areaUnit}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          plot.status === 'available'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {plot.status === 'available' ? 'Available for Funding' : 'Partnered'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-gray-400 block">{plot.plotIdentifier}</span>
                        <h4 className="text-sm font-bold text-gray-900">{plot.plotName}</h4>
                      </div>
                      <button
                        onClick={() => handleDeletePlot(plot.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Plot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">{plot.description}</p>

                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg space-y-1">
                      <div>
                        <strong>Soil:</strong> {plot.soilType}
                      </div>
                      <div>
                        <strong>Water:</strong> {plot.waterSource}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                        Supported Crops
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {plot.supportedCrops.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD NEW PLOT */}
      {showAddPlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-emerald-100 overflow-hidden my-auto text-gray-800">
            <div className="px-6 py-4 bg-[#1A331E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlotModal(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <Layers className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">List Farm Plot for Consumer-Funded Farming</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPlotModal(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlot} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Name / Section *</label>
                  <input
                    type="text"
                    required
                    value={plotName}
                    onChange={(e) => setPlotName(e.target.value)}
                    placeholder="e.g. Riverbed Black Soil Terrace Block A"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Tag / Identifier</label>
                  <input
                    type="text"
                    value={plotIdentifier}
                    onChange={(e) => setPlotIdentifier(e.target.value)}
                    placeholder="e.g. PLOT-GV-01"
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Area Size *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={areaSize}
                    onChange={(e) => setAreaSize(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unit</label>
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="acre">Acre(s)</option>
                    <option value="guntha">Guntha(s)</option>
                    <option value="hectare">Hectare(s)</option>
                    <option value="sqft">Square Feet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Soil Profile / Quality</label>
                <input
                  type="text"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  placeholder="e.g. Fertile Deep Black Cotton Soil"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Water / Irrigation Source</label>
                <input
                  type="text"
                  value={waterSource}
                  onChange={(e) => setWaterSource(e.target.value)}
                  placeholder="e.g. Borewell + Automated Micro-Drip"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Supported Crops (Comma separated)</label>
                <input
                  type="text"
                  value={supportedCropsInput}
                  onChange={(e) => setSupportedCropsInput(e.target.value)}
                  placeholder="Organic Tomatoes, Strawberries, Bell Peppers"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Plot Photo URL</label>
                <input
                  type="url"
                  value={plotImageUrl}
                  onChange={(e) => setPlotImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description & Agricultural Assets</label>
                <textarea
                  rows={2}
                  value={plotDescription}
                  onChange={(e) => setPlotDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Legal Confirmation */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
                🛡️ <strong>Legal Clarity:</strong> As the farmer, you retain 100% legal ownership of your land. The consumer funds 100% of the farming inputs and your cultivation service fee, and owns the rights to the harvested produce.
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddPlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlot}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {isCreatingPlot ? 'Listing Plot...' : 'List Farm Plot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: POST MILESTONE UPDATE */}
      {milestoneProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 my-auto text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMilestoneProject(null)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                    Milestone Update
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-0.5">
                    Post Progress for #{milestoneProject.partnershipCode}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMilestoneProject(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMilestone} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Cultivation Stage *</label>
                <select
                  value={milestoneStage}
                  onChange={(e) => setMilestoneStage(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Plot Preparation">1. Plot Preparation & Tillage</option>
                  <option value="Sowing & Planting">2. Sowing & Nursery Transplantation</option>
                  <option value="Irrigation & Crop Care">3. Irrigation & Nutrient/Pest Care</option>
                  <option value="Flowering & Fruiting">4. Flowering & Fruit Setting</option>
                  <option value="Harvesting">5. Pre-Harvest Inspection</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Milestone Headline *</label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Bamboo Staking & Jeevamrut Organic Spray Application"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Farmer Notes / Activities Done *</label>
                <textarea
                  rows={3}
                  required
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  placeholder="Describe the soil condition, plant height, irrigation cycle, or pest protection applied..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Photo Proof URL</label>
                <input
                  type="url"
                  value={milestonePhoto}
                  onChange={(e) => setMilestonePhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700">Overall Progress (%)</label>
                  <span className="font-black text-emerald-700">{milestoneProgress}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={milestoneProgress}
                  onChange={(e) => setMilestoneProgress(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMilestoneProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMilestone}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {isSubmittingMilestone ? 'Posting...' : 'Post Milestone to Consumer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD HARVEST */}
      {harvestProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 my-auto text-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded">
                  Harvest Completion
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  Record Harvest for #{harvestProject.partnershipCode}
                </h3>
              </div>
              <button
                onClick={() => setHarvestProject(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHarvest} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Harvested Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={harvestQuantity}
                    onChange={(e) => setHarvestQuantity(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unit</label>
                  <select
                    value={harvestUnit}
                    onChange={(e) => setHarvestUnit(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="crates">Crates (20kg each)</option>
                    <option value="quintal">Quintal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Quality Grade</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A+', 'A', 'B'] as const).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setHarvestQualityGrade(grade)}
                      className={`py-2 rounded-xl border text-center font-bold transition-all ${
                        harvestQualityGrade === grade
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Grade {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Farmer Inspection Notes</label>
                <textarea
                  rows={2}
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  placeholder="Produce inspected, clean, sorted, packed in crates ready for dispatch or market sale..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Harvest Photo URL</label>
                <input
                  type="url"
                  value={harvestPhoto}
                  onChange={(e) => setHarvestPhoto(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setHarvestProject(null)}
                  className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHarvest}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm"
                >
                  {isSubmittingHarvest ? 'Recording Harvest...' : 'Confirm Harvest Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
