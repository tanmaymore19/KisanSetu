import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import { AdminOverviewData, AdminUserData, Order, FarmWorkerRequest, FarmVisitBooking } from '../types.js';
import {
  ShieldAlert,
  Users,
  Tractor,
  ShoppingBag,
  IndianRupee,
  Calendar,
  Hammer,
  Search,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  RefreshCw,
  LogOut,
  Download,
  Filter,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  X,
  Sprout,
  Radio,
  ArrowLeft,
} from 'lucide-react';
import { AdminPartnershipsView } from './partnership/AdminPartnershipsView.js';
import { PortalRoleSwitcher } from './PortalRoleSwitcher.js';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'vault' | 'farmers' | 'consumers' | 'orders' | 'labor' | 'visits' | 'partnerships'
  >('vault');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected user for detailed inspector modal
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);

  // Edit password modal state
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateMsg, setPasswordUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Orders filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOverview();
      setData(res);
      setIsLiveActive(true);
    } catch (err: any) {
      if (showLoading) setError(err.message || 'Failed to load master admin data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData(true);

    // 1. Establish SSE stream for instant push updates (accounts registered, actions performed)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/stream');
      eventSource.onopen = () => {
        setIsLiveActive(true);
      };
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'activity' || payload.type === 'connected') {
            setIsLiveActive(true);
            fetchData(false);
          }
        } catch {
          // ignore keepalive comments
        }
      };
      eventSource.onerror = () => {
        setIsLiveActive(false);
      };
    } catch {
      // fallback to polling
    }

    // 2. High-Frequency Real-Time Sync Polling (every 2.5 seconds)
    // Ensures instant real-time synchronization under all network/proxy configurations
    let lastKnownVersion = 0;
    const interval = setInterval(async () => {
      try {
        const sync = await api.getAdminSync(lastKnownVersion);
        if (sync.hasUpdates || sync.version > lastKnownVersion) {
          lastKnownVersion = sync.version;
          setIsLiveActive(true);
          await fetchData(false);
        }
      } catch {
        // silent error during background sync
      }
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !newPasswordInput.trim()) return;
    setIsUpdatingPassword(true);
    setPasswordUpdateMsg(null);
    try {
      await api.updateUserPasswordAsAdmin(editingUser.id, newPasswordInput.trim());
      setPasswordUpdateMsg({ type: 'success', text: `Password for ${editingUser.fullName} updated successfully!` });
      await fetchData();
      setTimeout(() => {
        setEditingUser(null);
        setNewPasswordInput('');
        setPasswordUpdateMsg(null);
      }, 1500);
    } catch (err: any) {
      setPasswordUpdateMsg({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await api.updateOrderStatusAsAdmin(orderId, newStatus);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleUpdateWorkerRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      await api.updateWorkerRequestStatusAsAdmin(requestId, newStatus);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update labor request');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.farmDetails?.farmName && u.farmDetails.farmName.toLowerCase().includes(q)) ||
        (u.currentBrowsingLocation?.label && u.currentBrowsingLocation.label.toLowerCase().includes(q))
      );
    });
  }, [data?.users, searchQuery]);

  const farmersList = useMemo(() => filteredUsers.filter((u) => u.role === 'farmer'), [filteredUsers]);
  const consumersList = useMemo(() => filteredUsers.filter((u) => u.role === 'consumer'), [filteredUsers]);

  // Export full credentials ledger to JSON
  const handleExportCredentials = () => {
    if (!data?.users) return;
    const ledger = data.users.map((u) => ({
      ID: u.id,
      Role: u.role,
      FullName: u.fullName,
      LoginID_Username: u.username,
      LoginPassword: u.plainPassword,
      Email: u.email,
      Phone: u.phone,
      RegisteredAt: u.createdAt,
      FarmName: u.farmDetails?.farmName || 'N/A',
      Location: u.farmDetails?.locationAddress || u.currentBrowsingLocation?.label || 'N/A',
    }));

    const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kisansetu_admin_credentials_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F0] text-[#1E2B1E] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#1A331E] text-white sticky top-0 z-40 shadow-md border-b border-[#2D4D32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E2B714] text-[#1A331E] flex items-center justify-center font-black text-lg shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">KisanSetu Admin Oversight</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#E2B714] text-[#1A331E] px-2 py-0.5 rounded">
                  Secret Admin ID: Adminf&c_19
                </span>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                  <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{isLiveActive ? 'Real-Time Sync Active' : 'Connecting...'}</span>
                </div>
              </div>
              <p className="text-xs text-emerald-200">
                Central Master Controller & Credential Vault for Farmers & Consumers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PortalRoleSwitcher currentRole="admin" />

            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              title="Refresh Data"
              className="px-3 py-1.5 rounded-lg bg-[#2D4D32] hover:bg-[#3B6341] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCredentials}
              className="px-3 py-1.5 rounded-lg bg-[#E2B714] hover:bg-[#D4A808] text-[#1A331E] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Credentials</span>
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 border-t border-[#2D4D32]/60 scrollbar-none">
          <button
            onClick={() => setActiveTab('vault')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'vault'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Master Credential Vault (ID & Passwords)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-amber-400/20 text-amber-300 text-[10px] rounded-full">
              {data?.users.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('farmers')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'farmers'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Tractor className="w-4 h-4" />
            <span>All Farmers ({data?.metrics.totalFarmers || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('consumers')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'consumers'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Consumers ({data?.metrics.totalConsumers || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders & GMV ({data?.metrics.totalOrders || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('labor')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'labor'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Farmer Labor Requests ({data?.metrics.totalWorkerRequests || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'visits'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agro-Tourism Visits ({data?.metrics.totalBookings || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('partnerships')}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'partnerships'
                ? 'border-[#E2B714] text-[#E2B714] bg-[#224027]'
                : 'border-transparent text-emerald-100 hover:text-white hover:bg-[#224027]/50'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Farm Partnerships & Plots ({data?.metrics.totalPartnerships || 0})</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Global Back Navigation Bar for Admin Modules */}
        {activeTab !== 'overview' && (
          <div className="mb-5 flex items-center justify-between pb-3 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold transition-all shadow-xs cursor-pointer group"
              id="btn-admin-back-to-overview"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2D5A27] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Platform Overview</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Admin Section:</span>
              <span className="font-bold text-gray-800 capitalize">
                {activeTab === 'vault'
                  ? 'Master Credential Vault'
                  : activeTab === 'farmers'
                  ? 'Registered Farmers'
                  : activeTab === 'consumers'
                  ? 'Active Consumers'
                  : activeTab === 'orders'
                  ? 'All Platform Orders'
                  : activeTab === 'visits'
                  ? 'Agro-Tourism Visits'
                  : activeTab === 'workers'
                  ? 'Farm Labor Requests'
                  : activeTab === 'partnerships'
                  ? 'Crop Sponsorships'
                  : activeTab}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Global Key Metrics Ribbon */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Farmers</p>
              <p className="text-2xl font-black text-[#2D5A27] mt-1">{data.metrics.totalFarmers}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Farms Verified</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Consumers</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{data.metrics.totalConsumers}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Active Buyers</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total GMV</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{data.metrics.totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{data.metrics.totalOrders} total orders</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Live Products</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{data.metrics.totalProducts}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Fruits & Vegetables</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Labor Requests</p>
              <p className="text-2xl font-black text-purple-700 mt-1">{data.metrics.totalWorkerRequests}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{data.metrics.activeLaborers} Workers Deployed</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Farm Visits</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{data.metrics.totalBookings}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Agro-Tourism slots</p>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, login ID, phone, farm, location..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Showing:</span>
            <span className="font-bold text-[#1E2B1E]">
              {activeTab === 'farmers'
                ? `${farmersList.length} Farmers`
                : activeTab === 'consumers'
                ? `${consumersList.length} Consumers`
                : `${filteredUsers.length} Users Total`}
            </span>
          </div>
        </div>

        {/* ----------------- TAB 1: MASTER CREDENTIAL VAULT ----------------- */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold text-sm">Secret Master Credential Vault</p>
                <p className="mt-0.5 text-amber-800">
                  As requested, this view shows the full authentication credentials (Login ID / Username and Password)
                  for all farmers and consumers in the KisanSetu ecosystem. Passwords can be viewed, copied, or directly
                  reset/updated with administrative authority.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF6] text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Full Name / Entity</th>
                      <th className="py-3 px-4">Login ID (Username)</th>
                      <th className="py-3 px-4">Password</th>
                      <th className="py-3 px-4">Phone / Email</th>
                      <th className="py-3 px-4">Location / Address</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isRevealed = !!revealedPasswords[u.id];
                      return (
                        <tr key={u.id} className="hover:bg-[#F9FAF7] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : u.role === 'farmer'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{u.fullName}</div>
                            {u.farmDetails?.farmName && (
                              <div className="text-[11px] text-emerald-700 font-medium">
                                🌾 {u.farmDetails.farmName}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400">ID: {u.id}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono font-bold bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs border border-gray-200">
                                {u.username}
                              </code>
                              <button
                                onClick={() => copyToClipboard(u.username, `user_${u.id}`)}
                                title="Copy Login ID"
                                className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                              >
                                {copiedId === `user_${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono font-bold bg-amber-50 text-amber-900 px-2 py-1 rounded text-xs border border-amber-200 min-w-[110px]">
                                {isRevealed ? u.plainPassword : '••••••••••••'}
                              </code>
                              <button
                                onClick={() => togglePasswordReveal(u.id)}
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                                className="p-1 rounded hover:bg-amber-100 text-amber-700 transition-colors"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(u.plainPassword || '', `pass_${u.id}`)}
                                title="Copy Password"
                                className="p-1 rounded hover:bg-amber-100 text-amber-700 transition-colors"
                              >
                                {copiedId === `pass_${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{u.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 text-[11px] mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{u.email}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600 max-w-[200px] truncate">
                            {u.farmDetails?.locationAddress ||
                              u.deliveryAddresses?.[0]?.street ||
                              u.currentBrowsingLocation?.label ||
                              'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setNewPasswordInput(u.plainPassword || '');
                                }}
                                className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Change Pass</span>
                              </button>
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2.5 py-1 rounded bg-[#2D5A27] hover:bg-[#23471F] text-white font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: PLATFORM OVERVIEW ----------------- */}
        {activeTab === 'overview' && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Farmer Summary Box */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tractor className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-bold text-gray-900">Farmer Directory Overview</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('farmers')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    View All Farmers →
                  </button>
                </div>

                <div className="space-y-3">
                  {data.users
                    .filter((u) => u.role === 'farmer')
                    .slice(0, 4)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-lg border border-gray-100 bg-[#FBFDFB] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{f.fullName}</p>
                          <p className="text-xs text-emerald-700 font-medium">{f.farmDetails?.farmName}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                            <span>ID: <strong className="text-gray-700 font-mono">{f.username}</strong></span>
                            <span>Pass: <strong className="text-amber-800 font-mono">{f.plainPassword}</strong></span>
                            <span>Products: {f.productsCount}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedUser(f)}
                          className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100"
                        >
                          Details
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Consumer Summary Box */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-700" />
                    <h3 className="font-bold text-gray-900">Consumer Directory Overview</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('consumers')}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800"
                  >
                    View All Consumers →
                  </button>
                </div>

                <div className="space-y-3">
                  {data.users
                    .filter((u) => u.role === 'consumer')
                    .slice(0, 4)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg border border-gray-100 bg-[#FAFCFF] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{c.fullName}</p>
                          <p className="text-xs text-gray-500">{c.phone || c.email}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                            <span>ID: <strong className="text-gray-700 font-mono">{c.username}</strong></span>
                            <span>Pass: <strong className="text-amber-800 font-mono">{c.plainPassword}</strong></span>
                            <span>Orders: {c.ordersCount}</span>
                            <span>Spent: ₹{c.totalSpent.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedUser(c)}
                          className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                        >
                          Details
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#2D5A27]" />
                  <h3 className="font-bold text-gray-900">Recent Platform Transactions</h3>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#2D5A27] hover:text-[#23471F]"
                >
                  View All Orders →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Consumer</th>
                      <th className="py-2.5 px-3">Farmer / Farm</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allOrders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{o.id}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">{o.consumerName}</td>
                        <td className="py-2.5 px-3 text-emerald-800 font-medium">{o.farmName}</td>
                        <td className="py-2.5 px-3 text-gray-600">{o.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">₹{o.total}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: ALL FARMERS ----------------- */}
        {activeTab === 'farmers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {farmersList.map((farmer) => (
                <div key={farmer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                          Farmer
                        </span>
                        <h4 className="font-bold text-base text-gray-900">{farmer.fullName}</h4>
                      </div>
                      <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                        🌾 {farmer.farmDetails?.farmName || 'Farm Registered'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingUser(farmer);
                        setNewPasswordInput(farmer.plainPassword || '');
                      }}
                      className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change Pass</span>
                    </button>
                  </div>

                  {/* Login Credentials Box */}
                  <div className="mt-3.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Login ID (Username)</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-amber-200 text-xs">
                          {farmer.username}
                        </code>
                        <button
                          onClick={() => copyToClipboard(farmer.username, `f_u_${farmer.id}`)}
                          className="p-1 hover:bg-amber-200/50 rounded"
                        >
                          {copiedId === `f_u_${farmer.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-800" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Login Password</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="font-mono font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-200 text-xs">
                          {farmer.plainPassword}
                        </code>
                        <button
                          onClick={() => copyToClipboard(farmer.plainPassword || '', `f_p_${farmer.id}`)}
                          className="p-1 hover:bg-amber-200/50 rounded"
                        >
                          {copiedId === `f_p_${farmer.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-800" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Farm Details Info */}
                  <div className="mt-3 text-xs text-gray-600 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{farmer.farmDetails?.locationAddress || 'No location set'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                      <span>Phone: <strong className="text-gray-800">{farmer.phone || 'N/A'}</strong></span>
                      <span>Email: <strong className="text-gray-800">{farmer.email}</strong></span>
                      <span>Style: <strong className="text-emerald-700">{farmer.farmDetails?.farmingStyle}</strong></span>
                      <span>Acreage: <strong className="text-gray-800">{farmer.farmDetails?.farmSize} {farmer.farmDetails?.farmSizeUnit}</strong></span>
                    </div>
                  </div>

                  {/* Crops Grown */}
                  {farmer.farmDetails?.cropsGrown && farmer.farmDetails.cropsGrown.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {farmer.farmDetails.cropsGrown.map((crop) => (
                        <span key={crop} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium">
                          {crop}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Activity Stats & Inspect */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                      <span><strong>{farmer.productsCount}</strong> Produce Listed</span>
                      <span><strong>{farmer.ordersCount}</strong> Orders</span>
                      <span><strong>₹{farmer.totalRevenue}</strong> GMV</span>
                    </div>

                    <button
                      onClick={() => setSelectedUser(farmer)}
                      className="px-3 py-1 bg-[#2D5A27] hover:bg-[#23471F] text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <span>Full Data</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: ALL CONSUMERS ----------------- */}
        {activeTab === 'consumers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {consumersList.map((consumer) => (
                <div key={consumer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                          Consumer
                        </span>
                        <h4 className="font-bold text-base text-gray-900">{consumer.fullName}</h4>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        📍 {consumer.currentBrowsingLocation?.label || consumer.deliveryAddresses?.[0]?.city || 'Baner, Pune'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingUser(consumer);
                        setNewPasswordInput(consumer.plainPassword || '');
                      }}
                      className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change Pass</span>
                    </button>
                  </div>

                  {/* Login Credentials Box */}
                  <div className="mt-3.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Login ID (Username)</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-amber-200 text-xs">
                          {consumer.username}
                        </code>
                        <button
                          onClick={() => copyToClipboard(consumer.username, `c_u_${consumer.id}`)}
                          className="p-1 hover:bg-amber-200/50 rounded"
                        >
                          {copiedId === `c_u_${consumer.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-800" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Login Password</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="font-mono font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-200 text-xs">
                          {consumer.plainPassword}
                        </code>
                        <button
                          onClick={() => copyToClipboard(consumer.plainPassword || '', `c_p_${consumer.id}`)}
                          className="p-1 hover:bg-amber-200/50 rounded"
                        >
                          {copiedId === `c_p_${consumer.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-800" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Addresses */}
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                      <span>Phone: <strong className="text-gray-800">{consumer.phone || 'N/A'}</strong></span>
                      <span>Email: <strong className="text-gray-800">{consumer.email}</strong></span>
                    </div>
                    {consumer.deliveryAddresses && consumer.deliveryAddresses.length > 0 && (
                      <div className="text-[11px] text-gray-600 mt-1">
                        <strong>Addresses: </strong>
                        {consumer.deliveryAddresses.map((a) => `${a.label} (${a.street}, ${a.city})`).join('; ')}
                      </div>
                    )}
                  </div>

                  {/* Activity Stats & Inspect */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                      <span><strong>{consumer.ordersCount}</strong> Orders Placed</span>
                      <span><strong>₹{consumer.totalSpent}</strong> Spent</span>
                      <span><strong>{consumer.bookingsCount}</strong> Farm Visits</span>
                    </div>

                    <button
                      onClick={() => setSelectedUser(consumer)}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <span>Full Data</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: ALL ORDERS & GMV ----------------- */}
        {activeTab === 'orders' && data && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">All Platform Orders ({data.allOrders.length})</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Status Filter:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Order Placed">Order Placed</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF6] text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Consumer</th>
                      <th className="py-3 px-4">Farmer / Farm</th>
                      <th className="py-3 px-4">Items Breakdown</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Delivery Address</th>
                      <th className="py-3 px-4">Status & Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allOrders
                      .filter((o) => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{o.id}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{o.consumerName}</div>
                            <div className="text-[10px] text-gray-400">ID: {o.consumerId}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-emerald-800">{o.farmName}</div>
                            <div className="text-[10px] text-gray-400">Farmer ID: {o.farmerId}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <ul className="space-y-0.5">
                              {o.items.map((it, idx) => (
                                <li key={idx} className="text-gray-700">
                                  {it.productName}: <strong>{it.quantity} {it.unit}</strong> @ ₹{it.pricePerUnit}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">
                            ₹{o.total}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 max-w-[180px] truncate text-[11px]">
                            {o.deliveryAddress?.street || 'Local Address'}, {o.deliveryAddress?.city}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as Order['status'])}
                              className="text-xs font-bold border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
                            >
                              <option value="Order Placed">Order Placed</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 6: FARMER LABOR REQUESTS ----------------- */}
        {activeTab === 'labor' && data && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Farmer Worker & Labor Requests</h3>
                  <p className="text-xs text-gray-500">Live requests raised by farmers seeking farmhand teams</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF6] text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Req ID</th>
                      <th className="py-3 px-4">Farm & Farmer</th>
                      <th className="py-3 px-4">Task Type & Details</th>
                      <th className="py-3 px-4">Workers Needed</th>
                      <th className="py-3 px-4">Daily Wage Offer</th>
                      <th className="py-3 px-4">Assigned Team</th>
                      <th className="py-3 px-4">Admin Status Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allWorkerRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{req.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{req.farmName}</div>
                          <div className="text-[11px] text-gray-500">{req.location}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                            {req.taskType}
                          </span>
                          <p className="text-gray-600 mt-1 text-[11px]">{req.description}</p>
                          <p className="text-gray-400 text-[10px]">Dates: {req.startDate} to {req.endDate}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800 text-sm">
                          {req.workersNeeded} workers
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          ₹{req.dailyWageOffer} / day
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {req.assignedContractorName ? (
                            <div className="text-emerald-800 font-medium">
                              <p className="font-bold">{req.assignedContractorName}</p>
                              <p className="text-[11px] text-gray-500">{req.assignedContractorPhone}</p>
                              <p className="text-[10px] text-emerald-600">({req.assignedWorkersCount || req.workersNeeded} laborers assigned)</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No contractor assigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={req.status}
                            onChange={(e) => handleUpdateWorkerRequestStatus(req.id, e.target.value)}
                            className="text-xs font-bold border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
                          >
                            <option value="Open / Seeking Workers">Open / Seeking Workers</option>
                            <option value="Labor Team Assigned">Labor Team Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Fulfilled / Completed">Fulfilled / Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 7: AGRO-TOURISM VISITS ----------------- */}
        {activeTab === 'visits' && data && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Agro-Tourism & Farm Visit Bookings</h3>
                  <p className="text-xs text-gray-500">Consumers booking farm tours, fruit-picking, and meals</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF6] text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Visitor / Consumer</th>
                      <th className="py-3 px-4">Host Farm</th>
                      <th className="py-3 px-4">Visit Date & Slot</th>
                      <th className="py-3 px-4">Visitors</th>
                      <th className="py-3 px-4">Activities</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{b.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{b.visitorName}</div>
                          <div className="text-[11px] text-gray-500">{b.visitorPhone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-emerald-800">{b.farmName}</div>
                          <div className="text-[11px] text-gray-500">{b.farmLocation}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {b.slotDate} ({b.slotStartTime} - {b.slotEndTime})
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {b.visitorCount} people
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-gray-600">
                          {b.activitiesSelected?.join(', ') || 'General Farm Tour'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'Confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 8: FARM PARTNERSHIPS & LAND PLOTS ----------------- */}
        {activeTab === 'partnerships' && (
          <AdminPartnershipsView overviewData={data} />
        )}
      </main>

      {/* ----------------- INSPECT USER MODAL ----------------- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    selectedUser.role === 'farmer'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedUser.role}
                </span>
                <h3 className="font-extrabold text-gray-900 text-base">{selectedUser.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Credentials Box */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <h4 className="text-xs font-bold uppercase text-amber-900 tracking-wider mb-2 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-700" />
                  <span>Authentication Credentials</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-amber-700 font-semibold uppercase">Login ID / Username</span>
                    <p className="font-mono font-bold text-gray-900 text-sm">{selectedUser.username}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-700 font-semibold uppercase">Password</span>
                    <p className="font-mono font-bold text-amber-900 text-sm">{selectedUser.plainPassword}</p>
                  </div>
                </div>
              </div>

              {/* General Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">User ID</span>
                  <p className="font-mono font-bold text-gray-800">{selectedUser.id}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Registration Date</span>
                  <p className="font-semibold text-gray-800">{new Date(selectedUser.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Phone</span>
                  <p className="font-semibold text-gray-800">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Email</span>
                  <p className="font-semibold text-gray-800">{selectedUser.email}</p>
                </div>
              </div>

              {/* Role specific: Farm details or Consumer Addresses */}
              {selectedUser.role === 'farmer' && selectedUser.farmDetails && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                  <h4 className="font-bold text-emerald-900 text-sm">🌾 Farm Profile</h4>
                  <p><strong>Farm Name:</strong> {selectedUser.farmDetails.farmName}</p>
                  <p><strong>Address:</strong> {selectedUser.farmDetails.locationAddress}</p>
                  <p><strong>Coordinates:</strong> Lat {selectedUser.farmDetails.lat}, Lng {selectedUser.farmDetails.lng}</p>
                  <p><strong>Acreage:</strong> {selectedUser.farmDetails.farmSize} {selectedUser.farmDetails.farmSizeUnit}</p>
                  <p><strong>Experience:</strong> {selectedUser.farmDetails.experienceYears} years</p>
                  <p><strong>Farming Style:</strong> {selectedUser.farmDetails.farmingStyle}</p>
                  {selectedUser.farmDetails.cropsGrown && (
                    <p><strong>Crops:</strong> {selectedUser.farmDetails.cropsGrown.join(', ')}</p>
                  )}
                  {selectedUser.farmDetails.bio && (
                    <p className="text-gray-600 italic mt-1">"{selectedUser.farmDetails.bio}"</p>
                  )}
                </div>
              )}

              {/* Products Listed (if Farmer) */}
              {selectedUser.role === 'farmer' && selectedUser.products && selectedUser.products.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-gray-700 tracking-wider mb-2">
                    Live Produce Listed ({selectedUser.products.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedUser.products.map((p) => (
                      <div key={p.id} className="p-2 rounded bg-gray-50 border border-gray-200 text-xs flex justify-between">
                        <span><strong>{p.name}</strong> ({p.category})</span>
                        <span className="font-bold text-emerald-700">₹{p.price}/{p.unit} ({p.quantity} {p.unit} in stock)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Made / Received */}
              {selectedUser.orders && selectedUser.orders.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-gray-700 tracking-wider mb-2">
                    {selectedUser.role === 'farmer' ? 'Orders Received' : 'Orders Placed'} ({selectedUser.orders.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedUser.orders.map((o) => (
                      <div key={o.id} className="p-2 rounded bg-gray-50 border border-gray-200 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-gray-800">{o.id}</span>
                          <span className="text-gray-500 ml-2">Total ₹{o.total}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worker Requests raised (if farmer) */}
              {selectedUser.role === 'farmer' && selectedUser.workerRequests && selectedUser.workerRequests.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-gray-700 tracking-wider mb-2">
                    Farm Labor Requests ({selectedUser.workerRequests.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedUser.workerRequests.map((w) => (
                      <div key={w.id} className="p-2 rounded bg-purple-50 border border-purple-200 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-purple-900">{w.taskType}</span>
                          <span className="text-gray-600 ml-2">({w.workersNeeded} workers @ ₹{w.dailyWageOffer}/day)</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800">
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Go Back */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between sticky bottom-0">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-800" />
                <span>Go Back to User List</span>
              </button>
              <span className="text-xs text-gray-500 font-mono">ID: {selectedUser.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- EDIT PASSWORD MODAL ----------------- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setPasswordUpdateMsg(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <Edit2 className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-gray-900">Change Password (Admin Authority)</h3>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setPasswordUpdateMsg(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Directly assign a new password for <strong className="text-gray-900">{editingUser.fullName}</strong> (
              {editingUser.role} / username: <code className="font-mono text-emerald-800 font-bold">{editingUser.username}</code>).
            </p>

            {passwordUpdateMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs font-medium ${
                  passwordUpdateMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {passwordUpdateMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setPasswordUpdateMsg(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Go Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPasswordInput.trim()}
                  className="px-4 py-1.5 bg-[#2D5A27] hover:bg-[#23471F] text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
