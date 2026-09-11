import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  Coins,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Utensils,
  Truck,
  Home,
  Briefcase,
  ShieldCheck,
  Star,
  X,
  Phone,
  Filter,
  Check,
  Building,
  UserCheck,
} from 'lucide-react';
import {
  FarmWorkerRequest,
  LocalLaborGroup,
  WorkerJobCategory,
  WorkerWageType,
  WorkerRequestUrgency,
  User,
} from '../types.js';
import { api } from '../lib/api.js';

interface FarmerWorkerRequestSectionProps {
  user: User | null;
  farmerId: string;
  onShowNotice: (message: string, isError?: boolean) => void;
}

const JOB_CATEGORIES: { category: WorkerJobCategory; icon: string; desc: string }[] = [
  {
    category: 'Harvesting & Picking',
    icon: '🌾',
    desc: 'Crop picking, fruit plucking, manual grading & basket loading',
  },
  {
    category: 'Sowing & Transplantation',
    icon: '🌱',
    desc: 'Nursery seedling shifting, paddy transplanting & furrow sowing',
  },
  {
    category: 'Weeding & De-stoning',
    icon: '🌿',
    desc: 'Manual hoeing, grass removal, raised-bed clearing',
  },
  {
    category: 'Pesticide & Fertilizer Spraying',
    icon: '🧪',
    desc: 'Backpack knapsack spraying, organic manure & neem oil application',
  },
  {
    category: 'Irrigation & Canal Trenching',
    icon: '💧',
    desc: 'Drip pipe repairs, water channel clearing & bund shaping',
  },
  {
    category: 'Tractor & Power Tiller Operation',
    icon: '🚜',
    desc: 'Rotavator tillage, plowing, harrowing & laser leveling',
  },
  {
    category: 'Post-Harvest Sorting & Packing',
    icon: '📦',
    desc: 'Cleaning, crate packing, weighing & dispatch loading',
  },
  {
    category: 'General Farm Maintenance & Fencing',
    icon: '🛠️',
    desc: 'Barbed wire fence repair, shed cleaning, composting & animal feed',
  },
];

export const FarmerWorkerRequestSection: React.FC<FarmerWorkerRequestSectionProps> = ({
  user,
  farmerId,
  onShowNotice,
}) => {
  const [requests, setRequests] = useState<FarmWorkerRequest[]>([]);
  const [laborGroups, setLaborGroups] = useState<LocalLaborGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'my_requests' | 'labor_pools'>('my_requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<FarmWorkerRequest | null>(null);

  // Form Fields
  const [jobCategory, setJobCategory] = useState<WorkerJobCategory>('Harvesting & Picking');
  const [cropName, setCropName] = useState('');
  const [workersNeeded, setWorkersNeeded] = useState<number>(4);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [durationDays, setDurationDays] = useState<number>(2);
  const [workingHours, setWorkingHours] = useState('08:00 AM - 05:00 PM');
  const [wagePerWorker, setWagePerWorker] = useState<number>(550);
  const [wageType, setWageType] = useState<WorkerWageType>('Daily');
  const [urgency, setUrgency] = useState<WorkerRequestUrgency>('Next 2-3 Days');
  const [mealsProvided, setMealsProvided] = useState(true);
  const [transportProvided, setTransportProvided] = useState(false);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Assign Labor Modal
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqData, groupData] = await Promise.all([
        api.getWorkerRequests(farmerId),
        api.getLocalLaborGroups(),
      ]);
      setRequests(reqData);
      setLaborGroups(groupData);
    } catch (err: any) {
      onShowNotice(err.message || 'Failed to load worker requests', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farmerId]);

  // Open modal for new request
  const handleOpenCreateModal = (preselectedCategory?: WorkerJobCategory) => {
    setEditingRequest(null);
    setJobCategory(preselectedCategory || 'Harvesting & Picking');
    setCropName('');
    setWorkersNeeded(4);
    setStartDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setDurationDays(2);
    setWorkingHours('08:00 AM - 05:00 PM');
    setWagePerWorker(550);
    setWageType('Daily');
    setUrgency('Next 2-3 Days');
    setMealsProvided(true);
    setTransportProvided(false);
    setAccommodationProvided(false);
    setSpecialInstructions('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing request
  const handleOpenEditModal = (req: FarmWorkerRequest) => {
    setEditingRequest(req);
    setJobCategory(req.jobCategory);
    setCropName(req.cropName);
    setWorkersNeeded(req.workersNeeded);
    setStartDate(req.startDate);
    setDurationDays(req.durationDays);
    setWorkingHours(req.workingHours);
    setWagePerWorker(req.wagePerWorker);
    setWageType(req.wageType);
    setUrgency(req.urgency);
    setMealsProvided(req.mealsProvided);
    setTransportProvided(req.transportProvided);
    setAccommodationProvided(req.accommodationProvided);
    setSpecialInstructions(req.specialInstructions || '');
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim()) {
      onShowNotice('Please enter the crop or specific task name.', true);
      return;
    }

    const calcEndDate = () => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (durationDays - 1));
      return d.toISOString().split('T')[0];
    };

    try {
      if (editingRequest) {
        // Update
        const res = await api.updateWorkerRequest(editingRequest.id, {
          jobCategory,
          cropName: cropName.trim(),
          workersNeeded: Number(workersNeeded),
          startDate,
          endDate: calcEndDate(),
          durationDays: Number(durationDays),
          workingHours,
          wagePerWorker: Number(wagePerWorker),
          wageType,
          urgency,
          mealsProvided,
          transportProvided,
          accommodationProvided,
          specialInstructions,
        });
        setRequests((prev) =>
          prev.map((r) => (r.id === editingRequest.id ? res.request : r))
        );
        onShowNotice(`Worker request ${res.request.requestCode} updated successfully!`);
      } else {
        // Create new
        const res = await api.createWorkerRequest({
          farmerId,
          farmerName: user?.fullName || 'Farmer',
          farmerPhone: user?.phone || '+91 98220 00000',
          farmName: user?.farmDetails?.farmName || 'My Farm',
          farmLocation: user?.farmDetails?.locationAddress || 'District Farm',
          jobCategory,
          cropName: cropName.trim(),
          workersNeeded: Number(workersNeeded),
          startDate,
          endDate: calcEndDate(),
          durationDays: Number(durationDays),
          workingHours,
          wagePerWorker: Number(wagePerWorker),
          wageType,
          urgency,
          mealsProvided,
          transportProvided,
          accommodationProvided,
          specialInstructions,
        });
        setRequests((prev) => [res.request, ...prev]);
        onShowNotice(res.message);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      onShowNotice(err.message || 'Error saving worker request', true);
    }
  };

  // Quick Status update
  const handleUpdateStatus = async (
    reqId: string,
    newStatus: FarmWorkerRequest['status']
  ) => {
    try {
      const res = await api.updateWorkerRequest(reqId, { status: newStatus });
      setRequests((prev) => prev.map((r) => (r.id === reqId ? res.request : r)));
      onShowNotice(`Request status updated to "${newStatus}".`);
    } catch (err: any) {
      onShowNotice(err.message || 'Failed to update status', true);
    }
  };

  // Assign labor group to a request
  const handleAssignGroup = async (group: LocalLaborGroup) => {
    if (!assigningRequestId) return;
    try {
      const req = requests.find((r) => r.id === assigningRequestId);
      const count = Math.min(req?.workersNeeded || 4, group.availableWorkers);

      const res = await api.assignWorkerContractor(assigningRequestId, {
        contractor: {
          groupName: group.groupName,
          contactPerson: group.leaderName,
          phone: group.phone,
          workersConfirmed: count,
          rating: group.rating,
        },
        assignedCount: count,
      });

      setRequests((prev) =>
        prev.map((r) => (r.id === assigningRequestId ? res.request : r))
      );
      onShowNotice(
        `✅ Assigned ${count} workers from "${group.groupName}" to ${res.request.requestCode}!`
      );
      setAssigningRequestId(null);
    } catch (err: any) {
      onShowNotice(err.message || 'Failed to assign labor team', true);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to cancel and remove request ${code}?`)) {
      return;
    }
    try {
      await api.deleteWorkerRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onShowNotice(`Worker request ${code} has been cancelled.`);
    } catch (err: any) {
      onShowNotice(err.message || 'Failed to delete request', true);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return r.status === 'Open / Seeking Workers';
    if (statusFilter === 'assigned')
      return r.status === 'Workers Assigned' || r.status === 'Partially Matched';
    if (statusFilter === 'completed') return r.status === 'Completed';
    return true;
  });

  // Metrics
  const openRequestsCount = requests.filter(
    (r) => r.status === 'Open / Seeking Workers'
  ).length;
  const assignedWorkersTotal = requests.reduce(
    (sum, r) => sum + (r.assignedWorkersCount || 0),
    0
  );
  const totalLaborPoolAvailable = laborGroups.reduce(
    (sum, g) => sum + g.availableWorkers,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-[#2D3A26] to-[#455A38] text-white p-6 rounded-3xl shadow-sm border border-[#5D7A4F]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-[#5D7A4F]/50 px-3 py-1 rounded-full text-xs font-semibold text-[#D4E2CC] border border-[#A8C398]/30">
            <Users className="w-3.5 h-3.5" />
            <span>Agricultural Labor Network</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-serif tracking-tight">
            Need Workers for Your Farm?
          </h2>
          <p className="text-xs sm:text-sm text-[#D4CDBC] leading-relaxed">
            Post worker requirements for harvesting, sowing, weeding, or machinery operations.
            Connect instantly with verified local agricultural labor cooperatives in your taluka.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-5 py-3 rounded-2xl bg-[#E8DFC8] hover:bg-white text-[#2D3A26] text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#5D7A4F]" />
            Request Workers Now
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E5E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8C9886] uppercase tracking-wider block">
            Active Seeking Help
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#2D3A26] font-serif mt-0.5">
            {openRequestsCount}{' '}
            <span className="text-xs font-normal text-[#5D6D56]">requests</span>
          </div>
        </div>

        <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E5E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8C9886] uppercase tracking-wider block">
            Workers Mobilized
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5D7A4F] font-serif mt-0.5">
            {assignedWorkersTotal}{' '}
            <span className="text-xs font-normal text-[#5D6D56]">helpers</span>
          </div>
        </div>

        <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E5E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8C9886] uppercase tracking-wider block">
            Local Labor Pool
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#B45309] font-serif mt-0.5">
            {totalLaborPoolAvailable}{' '}
            <span className="text-xs font-normal text-[#5D6D56]">in {laborGroups.length} teams</span>
          </div>
        </div>

        <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E5E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8C9886] uppercase tracking-wider block">
            District Daily Rate
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#2D3A26] font-serif mt-0.5">
            ₹500 - ₹650
            <span className="text-xs font-normal text-[#5D6D56]"> / day</span>
          </div>
        </div>
      </div>

      {/* Quick Category Launcher Presets */}
      <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D5]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5D6D56] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F]" />
            Quick Request by Work Type
          </h3>
          <span className="text-[11px] text-[#8C9886]">Click any task to pre-fill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {JOB_CATEGORIES.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => handleOpenCreateModal(item.category)}
              className="text-left p-2.5 rounded-xl border border-[#E5E0D5] bg-white hover:border-[#5D7A4F] hover:bg-[#F1EDE4]/50 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 font-bold text-[#2D3A26] group-hover:text-[#5D7A4F]">
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.category}</span>
              </div>
              <p className="text-[10px] text-[#8C9886] mt-1 line-clamp-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tabs: My Requests vs Verified Labor Groups */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E0D5] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('my_requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'my_requests'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'bg-[#F1EDE4] text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            My Labor Requests ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('labor_pools')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'labor_pools'
                ? 'bg-[#5D7A4F] text-white shadow-2xs'
                : 'bg-[#F1EDE4] text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Local Labor Teams & Contractors ({laborGroups.length})
          </button>
        </div>

        {activeSubTab === 'my_requests' && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8C9886]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter requests by status"
              className="px-2.5 py-1.5 rounded-xl border border-[#D4CDBC] bg-white text-xs font-medium text-[#2D3A26]"
            >
              <option value="all">All Statuses ({requests.length})</option>
              <option value="open">Seeking Workers</option>
              <option value="assigned">Workers Assigned</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: MY REQUESTS LIST */}
      {activeSubTab === 'my_requests' && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="py-16 text-center bg-[#FAF8F5] rounded-3xl border border-dashed border-[#D4CDBC] p-8 space-y-3">
              <Users className="w-12 h-12 text-[#D4CDBC] mx-auto" />
              <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                No Worker Requests Found
              </h3>
              <p className="text-xs text-[#8C9886] max-w-md mx-auto">
                Need extra hands for harvesting, transplanting, weeding, or farm work? Post a request
                and our regional network of farm labor cooperatives will connect with you.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-bold hover:bg-[#4B633F] transition-colors"
              >
                + Post Your First Worker Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const isAssigned =
                  req.status === 'Workers Assigned' || req.status === 'Partially Matched';
                const isOpen = req.status === 'Open / Seeking Workers';
                const isCompleted = req.status === 'Completed';

                return (
                  <div
                    key={req.id}
                    className="bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Code & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold bg-[#E5E0D5] px-2 py-0.5 rounded-md text-[#2D3A26]">
                              {req.requestCode}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                req.urgency.includes('Immediate')
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : 'bg-[#FAF4EB] text-[#92400E] border border-[#E8DFC8]'
                              }`}
                            >
                              ⚡ {req.urgency}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-[#2D3A26] font-serif mt-1">
                            {req.cropName} • {req.jobCategory}
                          </h4>
                          <p className="text-[11px] text-[#5D6D56]">
                            Farm: {req.farmName} ({req.farmLocation.split(',')[0]})
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                            isOpen
                              ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                              : isAssigned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isCompleted
                              ? 'bg-gray-100 text-gray-700 border-gray-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div className="p-3 bg-[#F1EDE4]/70 rounded-xl text-xs space-y-1.5 border border-[#E5E0D5]/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5D6D56] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#5D7A4F]" /> Workers Needed:
                          </span>
                          <span className="font-extrabold text-[#2D3A26]">
                            {req.workersNeeded} Workers{' '}
                            {req.assignedWorkersCount > 0 && (
                              <span className="text-emerald-700 font-semibold">
                                ({req.assignedWorkersCount} Assigned)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#5D6D56] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#5D7A4F]" /> Schedule:
                          </span>
                          <span className="font-semibold text-[#2D3A26]">
                            {req.startDate}{' '}
                            {req.durationDays > 1 && `(${req.durationDays} Days)`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#5D6D56] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#8C9886]" /> Working Hours:
                          </span>
                          <span className="text-[#2D3A26] font-medium">{req.workingHours}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#E5E0D5]">
                          <span className="text-[#5D6D56] flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-[#B45309]" /> Wage Rate:
                          </span>
                          <span className="font-extrabold text-[#5D7A4F] text-xs">
                            ₹{req.wagePerWorker}{' '}
                            <span className="font-normal text-[10px] text-[#8C9886]">
                              / worker / {req.wageType.toLowerCase()}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Amenities Badges */}
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {req.mealsProvided && (
                          <span className="bg-[#EBF1E8] text-[#5D7A4F] px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Utensils className="w-3 h-3" /> Lunch/Meals Provided
                          </span>
                        )}
                        {req.transportProvided && (
                          <span className="bg-[#FAF4EB] text-[#92400E] px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Pickup/Transport Provided
                          </span>
                        )}
                        {req.accommodationProvided && (
                          <span className="bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Home className="w-3 h-3" /> Stay Provided
                          </span>
                        )}
                      </div>

                      {/* Special Instructions */}
                      {req.specialInstructions && (
                        <p className="text-[11px] text-[#5D6D56] italic bg-white p-2 rounded-lg border border-[#E5E0D5]">
                          "{req.specialInstructions}"
                        </p>
                      )}

                      {/* Assigned Contractor Card */}
                      {req.assignedContractor && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {req.assignedContractor.groupName}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold">
                              ★ {req.assignedContractor.rating}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-emerald-800">
                            <span>
                              Team Lead: {req.assignedContractor.contactPerson} (
                              {req.assignedContractor.workersConfirmed} Workers)
                            </span>
                            <a
                              href={`tel:${req.assignedContractor.phone}`}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Phone className="w-2.5 h-2.5" /> Call Lead
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 mt-3 border-t border-[#E5E0D5] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => setAssigningRequestId(req.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" /> Match Labor Team
                          </button>
                        )}

                        {isAssigned && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'Completed')}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Mark Completed
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(req)}
                          className="p-1.5 rounded-lg border border-[#D4CDBC] text-[#5D6D56] hover:bg-[#F1EDE4] transition-colors"
                          title="Edit request details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(req.id, req.requestCode)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Cancel request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* VIEW 2: VERIFIED LOCAL LABOR GROUPS & TEAMS */}
      {activeSubTab === 'labor_pools' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EBF1E8] rounded-2xl border border-[#D4CDBC] text-xs text-[#2D3A26] flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#5D7A4F] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[#2D3A26]">
                District Verified Agricultural Labor Collectives
              </strong>
              <p className="text-[#5D6D56] mt-0.5">
                These labor groups operate within 10 km of your farm. Every team lead is verified with
                local agricultural extension offices, has insurance coverage, and provides skilled farm
                laborers on daily or contract rates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {laborGroups.map((grp) => (
              <div
                key={grp.id}
                className="bg-[#FAF8F5] rounded-2xl border border-[#E5E0D5] p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7A4F] bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                          {grp.distanceKm} km away
                        </span>
                        {grp.verified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Verified Group
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#2D3A26] font-serif mt-1">
                        {grp.groupName}
                      </h4>
                      <p className="text-xs text-[#5D6D56]">
                        Leader: <span className="font-semibold text-[#2D3A26]">{grp.leaderName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-bold text-[#B45309]">
                        <Star className="w-3.5 h-3.5 fill-[#B45309]" />
                        {grp.rating} / 5
                      </div>
                      <span className="text-[10px] text-[#8C9886]">
                        {grp.availableWorkers} Active Workers
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F1EDE4]/70 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5D6D56]">Typical Wage:</span>
                      <span className="font-bold text-[#5D7A4F]">{grp.dailyRateEstimate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5D6D56]">Area Covered:</span>
                      <span className="text-[#2D3A26] font-medium">{grp.location}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-[#8C9886] uppercase tracking-wider block mb-1">
                      Key Specialties:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {grp.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="bg-white text-[#5D7A4F] border border-[#E5E0D5] px-2 py-0.5 rounded-md text-[10px] font-medium"
                        >
                          ✓ {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[#E5E0D5] flex items-center justify-between gap-2">
                  <a
                    href={`tel:${grp.phone}`}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-[#F1EDE4] border border-[#D4CDBC] text-[#2D3A26] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#5D7A4F]" />
                    <span>{grp.phone}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCreateModal(grp.specialties[0] as WorkerJobCategory);
                    }}
                    className="py-2 px-3.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Request This Team →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: POST / EDIT WORKER REQUEST */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#D4CDBC] max-w-xl w-full p-5 sm:p-6 shadow-2xl my-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3A26] font-serif flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#5D7A4F]" />
                  {editingRequest ? 'Edit Farm Worker Request' : 'Post Farm Worker Request'}
                </h3>
                <p className="text-xs text-[#5D6D56]">
                  Broadcast to regional agricultural laborer cooperatives & contractors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#8C9886] hover:bg-[#F1EDE4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Job Category */}
              <div>
                <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                  Type of Work / Job Category <span className="text-red-600">*</span>
                </label>
                <select
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value as WorkerJobCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D4CDBC] bg-white text-xs font-semibold text-[#2D3A26] focus:outline-[#5D7A4F]"
                >
                  {JOB_CATEGORIES.map((item) => (
                    <option key={item.category} value={item.category}>
                      {item.icon} {item.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Crop / Task Name */}
              <div>
                <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                  Crop Name or Specific Task <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Desi Tomatoes, Alphonso Mango, Paddy Shifting, Sugarcane"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs text-[#2D3A26] focus:outline-[#5D7A4F]"
                />
              </div>

              {/* Workers Needed & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Workers Needed <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={workersNeeded}
                      onChange={(e) => setWorkersNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs font-bold text-[#2D3A26]"
                    />
                    <span className="text-xs text-[#5D6D56] shrink-0">helpers</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Duration (Days) <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={durationDays}
                      onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs font-bold text-[#2D3A26]"
                    />
                    <span className="text-xs text-[#5D6D56] shrink-0">days</span>
                  </div>
                </div>
              </div>

              {/* Start Date & Working Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Starting Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs text-[#2D3A26]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Working Hours
                  </label>
                  <select
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs text-[#2D3A26]"
                  >
                    <option value="08:00 AM - 05:00 PM">08:00 AM - 05:00 PM (Standard Day)</option>
                    <option value="07:00 AM - 02:00 PM">07:00 AM - 02:00 PM (Morning Shift)</option>
                    <option value="06:30 AM - 04:30 PM">06:30 AM - 04:30 PM (Harvest Shift)</option>
                    <option value="02:00 PM - 07:00 PM">02:00 PM - 07:00 PM (Evening Shift)</option>
                  </select>
                </div>
              </div>

              {/* Wage and Urgency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Daily Wage Rate (₹ / Worker) <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#5D6D56]">₹</span>
                    <input
                      type="number"
                      min="200"
                      max="2000"
                      step="25"
                      required
                      value={wagePerWorker}
                      onChange={(e) => setWagePerWorker(parseInt(e.target.value) || 500)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs font-bold text-[#5D7A4F]"
                    />
                  </div>
                  <span className="text-[10px] text-[#8C9886] mt-0.5 block">
                    Market avg: ₹450 - ₹650 / day
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as WorkerRequestUrgency)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs text-[#2D3A26]"
                  >
                    <option value="Immediate (Within 24 Hours)">Immediate (Within 24 Hours)</option>
                    <option value="Next 2-3 Days">Next 2-3 Days</option>
                    <option value="Planned / Upcoming Week">Planned / Upcoming Week</option>
                  </select>
                </div>
              </div>

              {/* Amenities Provided by Farmer */}
              <div>
                <label className="block text-xs font-bold text-[#2D3A26] mb-1.5">
                  Amenities Provided for Laborers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-[#D4CDBC] bg-white text-xs cursor-pointer hover:bg-[#F1EDE4]/40">
                    <input
                      type="checkbox"
                      checked={mealsProvided}
                      onChange={(e) => setMealsProvided(e.target.checked)}
                      className="rounded accent-[#5D7A4F]"
                    />
                    <span className="text-[11px] font-medium text-[#2D3A26]">Lunch / Tea</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl border border-[#D4CDBC] bg-white text-xs cursor-pointer hover:bg-[#F1EDE4]/40">
                    <input
                      type="checkbox"
                      checked={transportProvided}
                      onChange={(e) => setTransportProvided(e.target.checked)}
                      className="rounded accent-[#5D7A4F]"
                    />
                    <span className="text-[11px] font-medium text-[#2D3A26]">Pickup/Van</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl border border-[#D4CDBC] bg-white text-xs cursor-pointer hover:bg-[#F1EDE4]/40">
                    <input
                      type="checkbox"
                      checked={accommodationProvided}
                      onChange={(e) => setAccommodationProvided(e.target.checked)}
                      className="rounded accent-[#5D7A4F]"
                    />
                    <span className="text-[11px] font-medium text-[#2D3A26]">Farm Stay</span>
                  </label>
                </div>
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#2D3A26] mb-1">
                  Special Instructions or Requirements (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bring your own sickle; manual weeding between drip pipes; gloves provided."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CDBC] bg-white text-xs text-[#2D3A26]"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D4CDBC] text-[#5D6D56] text-xs font-semibold hover:bg-[#F1EDE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingRequest ? 'Save Changes' : 'Submit & Notify Labor Teams →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN MODAL */}
      {assigningRequestId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#D4CDBC] max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-3">
              <h3 className="text-sm font-bold text-[#2D3A26] font-serif flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#5D7A4F]" />
                Select Local Labor Group to Assign
              </h3>
              <button
                type="button"
                onClick={() => setAssigningRequestId(null)}
                className="p-1 rounded-lg text-[#8C9886] hover:bg-[#F1EDE4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {laborGroups.map((grp) => (
                <div
                  key={grp.id}
                  className="p-3 rounded-2xl border border-[#E5E0D5] bg-white hover:border-[#5D7A4F] transition-all flex items-center justify-between gap-2"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3A26]">{grp.groupName}</h4>
                    <p className="text-[11px] text-[#5D6D56]">
                      Lead: {grp.leaderName} • {grp.availableWorkers} workers available
                    </p>
                    <span className="text-[10px] text-[#5D7A4F] font-semibold">
                      {grp.dailyRateEstimate} • {grp.distanceKm} km away
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAssignGroup(grp)}
                    className="px-3 py-1.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-[11px] font-bold shrink-0 shadow-2xs cursor-pointer"
                  >
                    Assign →
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#E5E0D5] text-right">
              <button
                type="button"
                onClick={() => setAssigningRequestId(null)}
                className="px-3 py-1.5 rounded-xl border border-[#D4CDBC] text-xs font-semibold text-[#5D6D56]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
