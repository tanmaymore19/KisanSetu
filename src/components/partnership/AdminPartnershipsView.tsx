import React, { useState, useEffect } from 'react';
import { FarmPlotListing, FarmPartnership, AdminOverviewData } from '../../types.js';
import { api } from '../../lib/api.js';
import {
  Sprout,
  Layers,
  CheckCircle2,
  Calendar,
  Lock,
  Search,
  Filter,
  Eye,
  Camera,
  DollarSign,
  TrendingUp,
  Truck,
  ShieldCheck,
} from 'lucide-react';

interface AdminPartnershipsViewProps {
  overviewData?: AdminOverviewData | null;
}

export const AdminPartnershipsView: React.FC<AdminPartnershipsViewProps> = ({ overviewData }) => {
  const [plots, setPlots] = useState<FarmPlotListing[]>([]);
  const [partnerships, setPartnerships] = useState<FarmPartnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'partnerships' | 'plots'>('partnerships');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedPlots, fetchedPartnerships] = await Promise.all([
        api.getPlots(),
        api.getPartnerships(),
      ]);
      setPlots(fetchedPlots);
      setPartnerships(fetchedPartnerships);
    } catch (e) {
      console.error('Failed to load admin partnerships data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalFunded = partnerships.reduce((sum, p) => sum + (p.totalFundingAmount || 0), 0);
  const totalLabourFees = partnerships.reduce(
    (sum, p) => sum + (p.costBreakdown?.farmerCultivationServiceFee || 0),
    0
  );

  const filteredPartnerships = partnerships.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.partnershipCode.toLowerCase().includes(q) ||
      p.cropName.toLowerCase().includes(q) ||
      p.consumerName.toLowerCase().includes(q) ||
      p.farmerName.toLowerCase().includes(q) ||
      p.farmName.toLowerCase().includes(q)
    );
  });

  const filteredPlots = plots.filter((plot) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      plot.plotName.toLowerCase().includes(q) ||
      plot.plotIdentifier?.toLowerCase().includes(q) ||
      plot.farmerName.toLowerCase().includes(q) ||
      plot.farmName.toLowerCase().includes(q) ||
      plot.farmLocation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Farm Plots</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{plots.length}</div>
          <span className="text-[11px] text-gray-500">
            {plots.filter((p) => p.status === 'available').length} Available for Funding
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Partnerships</span>
            <Sprout className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{partnerships.length}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Funded & Cultivating</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Capital in Escrow</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">₹{totalFunded.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-blue-700 font-semibold">100% Escrow Protected</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Farmer Labour Payouts</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-900">₹{totalLabourFees.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-gray-500">Direct Farmer Service Fees</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('partnerships')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === 'partnerships'
                ? 'bg-[#1A331E] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Funded Farming Partnerships ({partnerships.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('plots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === 'plots'
                ? 'bg-[#1A331E] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Available Land Plots ({plots.length})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search code, crop, farmer, or consumer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* TAB 1: ALL PARTNERSHIPS */}
      {activeSubTab === 'partnerships' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Partnership</th>
                  <th className="py-3 px-4">Crop & Land Area</th>
                  <th className="py-3 px-4">Consumer (Funder)</th>
                  <th className="py-3 px-4">Farmer (Cultivator)</th>
                  <th className="py-3 px-4">Escrow Capital</th>
                  <th className="py-3 px-4">Stage & Progress</th>
                  <th className="py-3 px-4">Harvest / Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Loading partnerships...
                    </td>
                  </tr>
                ) : filteredPartnerships.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No partnerships found
                    </td>
                  </tr>
                ) : (
                  filteredPartnerships.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        #{p.partnershipCode}
                        <span className="block text-[10px] text-gray-400 font-sans font-normal">
                          {p.startDate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{p.cropName}</span>
                        <span className="text-[11px] text-gray-500">
                          {p.areaSize} {p.areaUnit} • {p.plotName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{p.consumerName}</span>
                        <span className="text-[11px] text-gray-500">{p.consumerPhone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-800 block">{p.farmerName}</span>
                        <span className="text-[11px] text-gray-500">{p.farmName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-gray-900 block">
                          ₹{p.totalFundingAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 block w-fit mb-1">
                          {p.currentStage}
                        </span>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${p.progressPercentage || 25}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.status === 'settled' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            Settled ({p.settlement?.choice === 'sell_in_marketplace' ? 'Market Sale' : 'Produce Delivery'})
                          </span>
                        ) : p.status === 'harvested' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            Harvested ({p.harvestRecord?.harvestedQuantity} {p.harvestRecord?.harvestUnit})
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Cultivation In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL PLOTS */}
      {activeSubTab === 'plots' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tag / Plot Name</th>
                  <th className="py-3 px-4">Farmer & Location</th>
                  <th className="py-3 px-4">Area & Soil</th>
                  <th className="py-3 px-4">Irrigation</th>
                  <th className="py-3 px-4">Supported Crops</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlots.map((plot) => (
                  <tr key={plot.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] text-gray-400 block">{plot.plotIdentifier}</span>
                      <span className="font-bold text-gray-900">{plot.plotName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-900 block">{plot.farmerName}</span>
                      <span className="text-[11px] text-gray-500">
                        {plot.farmName} ({plot.farmLocation})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-900 block">
                        {plot.areaSize} {plot.areaUnit}
                      </span>
                      <span className="text-[11px] text-gray-500">{plot.soilType}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-gray-600">{plot.waterSource}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {plot.supportedCrops.map((c, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          plot.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {plot.status === 'available' ? 'Available' : 'Partnered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
