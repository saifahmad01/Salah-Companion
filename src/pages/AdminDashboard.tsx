import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Smartphone,
  Activity,
  Bell,
  Shield,
  Search,
  RefreshCw,
  ArrowLeft,
  Trash2,
  UserCheck,
  UserX,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Moon,
  X,
  Edit3,
  History,
} from 'lucide-react';
import {
  adminApi,
  salahApi,
  type AdminOverviewData,
  type AdminUserData,
  type QuranResourceItem,
  type AdminPrayerLogItem,
  type AdminPrayerCorrectionItem,
  type AdminSalahAnalyticsData,
} from '../services/backendApi';
import { useAuth } from '../context/AuthContext';
import { SignOutConfirmationModal } from '../components/SignOutConfirmationModal';
import { AppReleaseManagementView } from '../components/admin/AppReleaseManagementView';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout, banner, setBanner } = useAuth();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'salah' | 'broadcast' | 'resources' | 'releases'>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [quranResources, setQuranResources] = useState<QuranResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null);

  // User management filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Broadcast form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastType, setBroadcastType] = useState('announcement');
  const [broadcasting, setBroadcasting] = useState(false);

  // Admin Salah Management & Analytics state
  const [salahAnalytics, setSalahAnalytics] = useState<AdminSalahAnalyticsData | null>(null);
  const [adminPrayers, setAdminPrayers] = useState<AdminPrayerLogItem[]>([]);
  const [prayerCorrections, setPrayerCorrections] = useState<AdminPrayerCorrectionItem[]>([]);
  const [salahViewMode, setSalahViewMode] = useState<'records' | 'corrections'>('records');
  const [salahSearch, setSalahSearch] = useState('');
  const [salahPrayerFilter, setSalahPrayerFilter] = useState('');
  const [salahStatusFilter, setSalahStatusFilter] = useState('');
  const [salahStartDate, setSalahStartDate] = useState('');
  const [salahEndDate, setSalahEndDate] = useState('');
  const [salahPage, setSalahPage] = useState(1);
  const [salahTotalPages, setSalahTotalPages] = useState(1);

  // Modal for modifying Salah record
  const [correctingRecord, setCorrectingRecord] = useState<AdminPrayerLogItem | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<'on_time' | 'late' | 'qada' | 'missed' | 'delete'>('on_time');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await adminApi.getOverview();
      if (res?.data) {
        setOverview(res.data);
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch overview metrics.' });
    }
  };

  const fetchSalahAnalytics = async () => {
    try {
      const res = await adminApi.getAdminSalahAnalytics();
      if (res?.analytics) {
        setSalahAnalytics(res.analytics);
      }
    } catch (err: any) {
      console.warn('[AdminDashboard] Could not fetch salah analytics:', err);
    }
  };

  const fetchAdminPrayers = async () => {
    try {
      const res = await adminApi.getAdminPrayers({
        q: salahSearch,
        prayer: salahPrayerFilter,
        status: salahStatusFilter,
        startDate: salahStartDate,
        endDate: salahEndDate,
        page: salahPage,
        limit: 15,
      });
      if (res?.data) {
        setAdminPrayers(res.data);
        if (res.pagination) {
          setSalahTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch user prayer records.' });
    }
  };

  const fetchPrayerCorrections = async () => {
    try {
      const res = await adminApi.getPrayerCorrections({ page: salahPage, limit: 15 });
      if (res?.data) {
        setPrayerCorrections(res.data);
        if (res.pagination) {
          setSalahTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.warn('[AdminDashboard] Could not fetch prayer corrections audit trail:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers({
        q: searchQuery,
        role: roleFilter,
        verified: verifiedFilter,
        page,
        limit: 15,
      });
      if (res?.data) {
        setUsers(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch user directory.' });
    }
  };

  const fetchQuranResources = async () => {
    try {
      const res = await salahApi.getAdminQuranResources();
      if (res?.data) {
        setQuranResources(res.data);
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to fetch Quran PDF resources.' });
    }
  };

  const handleToggleResourceStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await salahApi.toggleQuranResourceStatus(id, !currentStatus);
      if (res?.success) {
        setBanner({ type: 'success', message: 'PDF resource status toggled.' });
        fetchQuranResources();
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update resource status.' });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchOverview(),
      fetchSalahAnalytics(),
      fetchUsers(),
      fetchQuranResources(),
      activeTab === 'salah' ? (salahViewMode === 'records' ? fetchAdminPrayers() : fetchPrayerCorrections()) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchSalahAnalytics(), fetchUsers(), fetchQuranResources()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'salah') {
      if (salahViewMode === 'records') {
        fetchAdminPrayers();
      } else {
        fetchPrayerCorrections();
      }
    }
  }, [activeTab, page, salahPage, salahViewMode, salahPrayerFilter, salahStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSalahFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSalahPage(1);
    fetchAdminPrayers();
  };

  const handleToggleRole = async (targetUser: AdminUserData) => {
    const nextRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change ${targetUser.name}'s role to ${nextRole}?`)) return;

    try {
      const res = await adminApi.updateUserRole(targetUser.id, nextRole);
      if (res?.success) {
        setBanner({ type: 'success', message: `User role updated to ${nextRole}.` });
        fetchUsers();
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update role.' });
    }
  };

  const handleDeleteUser = async (targetUser: AdminUserData) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${targetUser.name} (${targetUser.email})?`)) return;

    try {
      const res = await adminApi.deleteUser(targetUser.id);
      if (res?.success) {
        setBanner({ type: 'success', message: 'User deleted successfully.' });
        fetchUsers();
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete user.' });
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;

    setBroadcasting(true);
    try {
      const res = await adminApi.broadcastNotification({
        title: broadcastTitle,
        body: broadcastBody,
        type: broadcastType,
      });
      if (res?.success) {
        setBanner({ type: 'success', message: res.message || 'Broadcast dispatched successfully!' });
        setBroadcastTitle('');
        setBroadcastBody('');
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to send broadcast.' });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleOpenCorrectionModal = (record: AdminPrayerLogItem) => {
    setCorrectingRecord(record);
    setCorrectionNewStatus(record.status || 'on_time');
    setCorrectionReason('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    if (!correctionReason.trim()) {
      setBanner({ type: 'error', message: 'A mandatory explanation reason is required for administrative Salah corrections.' });
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await adminApi.correctUserPrayer({
        userId: correctingRecord.userId,
        prayerName: correctingRecord.prayerName,
        date: correctingRecord.date,
        status: correctionNewStatus,
        reason: correctionReason.trim(),
      });

      if (res?.success) {
        setBanner({ type: 'success', message: res.message || 'Prayer status updated and audit logged.' });
        setCorrectingRecord(null);
        fetchAdminPrayers();
        fetchSalahAnalytics();
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to apply prayer correction.' });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#072118] text-[#FAF8F3] flex flex-col font-sans select-none">
      {/* Alert Banner */}
      {banner && (
        <aside
          role="status"
          aria-label="Notification"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border animate-in slide-in-from-top-3 ${
            banner.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-500/40'
              : 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
          }`}
        >
          {banner.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{banner.message}</span>
        </aside>
      )}

      {/* Top Navbar */}
      <header className="border-b border-emerald-900/60 bg-[#0A3023]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="p-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Return to Prayer Tracker"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to App</span>
          </button>
          <div className="flex items-center gap-2 border-l border-emerald-800/60 pl-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="font-serif font-bold text-base sm:text-lg text-white tracking-wide">
              Salah Companion <span className="text-amber-400 font-sans text-xs px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30">Admin</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-white">{currentUser?.name || 'Administrator'}</p>
            <p className="text-[10px] text-emerald-300/70">{currentUser?.email}</p>
          </div>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-200 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <nav aria-label="Admin Navigation" className="border-b border-emerald-900/40 bg-[#08281D] px-4 sm:px-8 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('salah')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'salah'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4 text-amber-400" />
          <span>Salah Management</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Push Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'resources'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Quran Resources</span>
        </button>

        <button
          onClick={() => setActiveTab('releases')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'releases'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>App Releases</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
            <p className="text-xs text-emerald-200/70">Loading administrative dashboard...</p>
          </div>
        ) : activeTab === 'overview' ? (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">Total Users</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  {overview?.kpis.totalUsers ?? 0}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">
                  {overview?.kpis.verifiedUsers ?? 0} verified accounts
                </p>
              </div>

              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">Prayers Logged</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  {overview?.kpis.totalPrayersLogged ?? 0}
                </p>
                <p className="text-[10px] text-amber-300 mt-1">
                  {overview?.kpis.prayersLoggedToday ?? 0} logged today
                </p>
              </div>

              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">Salah Completion</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  {salahAnalytics?.overview.completionRate ?? 0}%
                </p>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  {salahAnalytics?.overview.completedCount ?? 0} completed prayers
                </p>
              </div>

              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">Cloud Latency</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  {overview?.system.databaseLatencyMs ?? 0}<span className="text-xs font-sans font-normal text-emerald-300/60 ml-1">ms</span>
                </p>
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {overview?.system.status.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Salah Analytics & Notification Performance Grid */}
            {salahAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Ratios */}
                <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-serif font-bold text-sm text-white flex items-center justify-between">
                    <span>Quality Breakdown</span>
                    <span className="text-[10px] text-amber-400 font-sans">Live Logs</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-emerald-300">On Time</span>
                      <span className="font-bold text-white">{salahAnalytics.overview.onTimeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-300">Late</span>
                      <span className="font-bold text-white">{salahAnalytics.overview.lateCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Qada Ratio</span>
                      <span className="font-bold text-white">{salahAnalytics.overview.qadaRatio}% ({salahAnalytics.overview.qadaCount})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-300">Missed Ratio</span>
                      <span className="font-bold text-white">{salahAnalytics.overview.missedRatio}% ({salahAnalytics.overview.missedCount})</span>
                    </div>
                  </div>
                </div>

                {/* Notifications Performance */}
                <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-serif font-bold text-sm text-white flex items-center justify-between">
                    <span>Notification Engine</span>
                    <span className="text-[10px] text-emerald-400 font-sans">30s Loop</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-emerald-300/80">Delivered Alerts</span>
                      <span className="font-bold text-white">{salahAnalytics.notifications.totalDelivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300/80">Web Push Dispatched</span>
                      <span className="font-bold text-white">{salahAnalytics.notifications.pushSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300/80">Delivery Success</span>
                      <span className="font-bold text-emerald-300">{salahAnalytics.notifications.deliveryRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-300/80">User Read Rate</span>
                      <span className="font-bold text-amber-300">{salahAnalytics.notifications.readRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Recent Corrections Audit Summary */}
                <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-serif font-bold text-sm text-white flex items-center justify-between">
                    <span>Admin Audit Trail</span>
                    <button
                      onClick={() => {
                        setActiveTab('salah');
                        setSalahViewMode('corrections');
                      }}
                      className="text-[10px] text-amber-400 hover:underline font-sans cursor-pointer"
                    >
                      View All →
                    </button>
                  </h3>
                  {salahAnalytics.recentCorrections.length === 0 ? (
                    <p className="text-xs text-emerald-300/60 py-3">No administrative corrections logged yet.</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {salahAnalytics.recentCorrections.slice(0, 3).map((c) => (
                        <div key={c.id} className="p-2 rounded-xl bg-[#07241A] border border-emerald-900/60">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold capitalize text-amber-300">{c.prayerName} ({c.date})</span>
                            <span className="text-emerald-400/80 uppercase text-[9px]">{c.oldStatus || 'none'} → {c.newStatus}</span>
                          </div>
                          <p className="text-[10px] text-stone-300 truncate mt-0.5">"{c.reason}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prayer Breakdown & System Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Today's Prayer Completion Breakdown */}
              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
                  <h2 className="font-serif font-bold text-sm text-white">Today's Prayer Activity</h2>
                  <span className="text-[11px] text-emerald-300/70">Status metrics</span>
                </div>
                {overview?.todayBreakdown && (
                  <div className="space-y-3">
                    {Object.entries(overview.todayBreakdown).map(([name, count]) => {
                      const max = Math.max(...Object.values(overview.todayBreakdown), 1);
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize font-medium text-emerald-100">{name}</span>
                            <span className="font-bold text-amber-300">{count} logged</span>
                          </div>
                          <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* System Health & Cloud Architecture */}
              <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
                  <h2 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>System Architecture &amp; Health</span>
                  </h2>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/40">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#07241A] p-3 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400/80 uppercase">Database Provider</span>
                    <p className="font-bold text-white mt-0.5">{overview?.system.databaseProvider.toUpperCase()}</p>
                    <span className="text-[10px] text-emerald-300/60">Supabase AWS ap-south-1</span>
                  </div>
                  <div className="bg-[#07241A] p-3 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400/80 uppercase">Environment</span>
                    <p className="font-bold text-white mt-0.5">{overview?.system.environment.toUpperCase()}</p>
                    <span className="text-[10px] text-emerald-300/60">Node {overview?.system.nodeVersion}</span>
                  </div>
                  <div className="bg-[#07241A] p-3 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400/80 uppercase">Pending Registrations</span>
                    <p className="font-bold text-amber-300 mt-0.5">{overview?.kpis.pendingRegistrations ?? 0}</p>
                    <span className="text-[10px] text-emerald-300/60">Awaiting email verification</span>
                  </div>
                  <div className="bg-[#07241A] p-3 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400/80 uppercase">Server Uptime</span>
                    <p className="font-bold text-white mt-0.5">{Math.floor((overview?.system.serverUptimeSec ?? 0) / 60)} min</p>
                    <span className="text-[10px] text-emerald-300/60">Continuous operation</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'users' ? (
          /* User Management Screen */
          <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-base text-white">Registered User Directory</h2>
                <p className="text-xs text-emerald-300/70 mt-0.5">Manage accounts, elevation of roles, and email statuses</p>
              </div>

              {/* Filters & Search */}
              <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-400 w-48 sm:w-60"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={verifiedFilter}
                  onChange={(e) => {
                    setVerifiedFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </form>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-emerald-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07241A] text-emerald-300/70 border-b border-emerald-900/60">
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Email Status</th>
                    <th className="py-3 px-4 font-semibold">Calculation</th>
                    <th className="py-3 px-4 font-semibold">Logs</th>
                    <th className="py-3 px-4 font-semibold">Joined</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-emerald-300/60">
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-emerald-900/20 transition">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{u.name}</p>
                          <p className="text-[11px] text-emerald-300/60">{u.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-emerald-200/80">{u.prayerCalculationMethod}</td>
                        <td className="py-3 px-4 font-mono text-amber-300">{u._count.prayerLogs}</td>
                        <td className="py-3 px-4 text-emerald-300/70">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleRole(u)}
                            className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 transition cursor-pointer"
                            title={u.role === 'ADMIN' ? 'Demote to User' : 'Elevate to Admin'}
                          >
                            {u.role === 'ADMIN' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-emerald-300/60">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded bg-emerald-900/40 text-xs text-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-emerald-900/40 text-xs text-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'salah' ? (
          /* ======================================================== */
          /* SALAH MANAGEMENT & AUDIT TRAIL TAB                       */
          /* ======================================================== */
          <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Sub-navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-900/60 pb-4">
              <div>
                <h2 className="font-serif font-bold text-base text-white flex items-center gap-2">
                  <Moon className="w-5 h-5 text-amber-400" />
                  <span>Admin Salah Habit Management</span>
                </h2>
                <p className="text-xs text-emerald-300/70 mt-0.5">
                  Verify, correct, and audit prayer records for any user across historical dates.
                </p>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center bg-[#07241A] p-1 rounded-xl border border-emerald-800/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSalahViewMode('records');
                    setSalahPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    salahViewMode === 'records'
                      ? 'bg-amber-400 text-[#072118] shadow-xs'
                      : 'text-emerald-300/70 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Prayer Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSalahViewMode('corrections');
                    setSalahPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    salahViewMode === 'corrections'
                      ? 'bg-amber-400 text-[#072118] shadow-xs'
                      : 'text-emerald-300/70 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail</span>
                </button>
              </div>
            </div>

            {salahViewMode === 'records' ? (
              <>
                {/* Search & Filters Bar */}
                <form onSubmit={handleSalahFilterSubmit} className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search user name or email..."
                      value={salahSearch}
                      onChange={(e) => setSalahSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-400 w-48 sm:w-56"
                    />
                  </div>

                  <select
                    value={salahPrayerFilter}
                    onChange={(e) => {
                      setSalahPrayerFilter(e.target.value);
                      setSalahPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="">All Prayers</option>
                    <option value="fajr">Fajr</option>
                    <option value="dhuhr">Dhuhr / Jumu'ah</option>
                    <option value="asr">Asr</option>
                    <option value="maghrib">Maghrib</option>
                    <option value="isha">Isha</option>
                  </select>

                  <select
                    value={salahStatusFilter}
                    onChange={(e) => {
                      setSalahStatusFilter(e.target.value);
                      setSalahPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-[#07241A] border border-emerald-800/60 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                    <option value="qada">Qada</option>
                    <option value="missed">Missed</option>
                  </select>

                  <div className="flex items-center gap-1.5 bg-[#07241A] px-2 py-1 rounded-xl border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-300/70">From:</span>
                    <input
                      type="date"
                      value={salahStartDate}
                      onChange={(e) => setSalahStartDate(e.target.value)}
                      className="bg-transparent text-white focus:outline-none text-xs"
                    />
                    <span className="text-[10px] text-emerald-300/70">To:</span>
                    <input
                      type="date"
                      value={salahEndDate}
                      onChange={(e) => setSalahEndDate(e.target.value)}
                      className="bg-transparent text-white focus:outline-none text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-[#072118] font-bold hover:brightness-105 transition cursor-pointer"
                  >
                    Filter
                  </button>
                </form>

                {/* Table of Prayer Records */}
                <div className="overflow-x-auto rounded-xl border border-emerald-900/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#07241A] text-emerald-300/70 border-b border-emerald-900/60">
                        <th className="py-3 px-4 font-semibold">User</th>
                        <th className="py-3 px-4 font-semibold">Prayer</th>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Logged Status</th>
                        <th className="py-3 px-4 font-semibold">Completion Time</th>
                        <th className="py-3 px-4 font-semibold text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/40">
                      {adminPrayers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-emerald-300/60">
                            No prayer records found matching filters.
                          </td>
                        </tr>
                      ) : (
                        adminPrayers.map((p) => {
                          const statusBg =
                            p.status === 'on_time'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : p.status === 'late'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : p.status === 'qada'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                          return (
                            <tr key={p.id} className="hover:bg-emerald-900/20 transition">
                              <td className="py-3 px-4">
                                <p className="font-semibold text-white">{p.userName}</p>
                                <p className="text-[11px] text-emerald-300/60">{p.userEmail}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-amber-300 capitalize">{p.prayerName}</span>
                              </td>
                              <td className="py-3 px-4 font-mono text-emerald-200/90">{p.date}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusBg}`}>
                                  {p.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-emerald-300/70">
                                {p.time || (p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCorrectionModal(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-amber-300 font-semibold border border-emerald-700/60 transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Correct Status</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {salahTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-emerald-300/60">
                      Page {salahPage} of {salahTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={salahPage <= 1}
                        onClick={() => setSalahPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded bg-emerald-900/40 text-xs text-white disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        disabled={salahPage >= salahTotalPages}
                        onClick={() => setSalahPage((p) => p + 1)}
                        className="px-3 py-1 rounded bg-emerald-900/40 text-xs text-white disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Audit Trail View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-300/80 font-semibold">
                    Permanent administrative audit log for user prayer adjustments
                  </span>
                  <button
                    type="button"
                    onClick={fetchPrayerCorrections}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-emerald-900/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#07241A] text-emerald-300/70 border-b border-emerald-900/60">
                        <th className="py-3 px-4 font-semibold">Timestamp</th>
                        <th className="py-3 px-4 font-semibold">Admin</th>
                        <th className="py-3 px-4 font-semibold">User Account</th>
                        <th className="py-3 px-4 font-semibold">Prayer & Date</th>
                        <th className="py-3 px-4 font-semibold">Status Change</th>
                        <th className="py-3 px-4 font-semibold">Explanation Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/40">
                      {prayerCorrections.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-emerald-300/60">
                            No administrative corrections recorded in audit log.
                          </td>
                        </tr>
                      ) : (
                        prayerCorrections.map((c) => (
                          <tr key={c.id} className="hover:bg-emerald-900/20 transition">
                            <td className="py-3 px-4 text-stone-300 whitespace-nowrap">
                              {new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-amber-300">{c.adminEmail || c.adminId}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-white">{c.userName || 'User'}</p>
                              <p className="text-[11px] text-emerald-300/60">{c.userEmail || c.userId}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-amber-300 capitalize">{c.prayerName}</span>
                              <span className="text-emerald-200/70 ml-1.5 font-mono">({c.date})</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-stone-400 uppercase text-[10px]">{c.oldStatus || 'none'}</span>
                              <span className="text-emerald-400 mx-1">→</span>
                              <span className="font-bold text-amber-300 uppercase text-[10px]">{c.newStatus}</span>
                            </td>
                            <td className="py-3 px-4 text-emerald-100 max-w-xs truncate" title={c.reason}>
                              "{c.reason}"
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'broadcast' ? (
          /* Push Notifications & Broadcast Screen */
          <div className="bg-[#0A3326] border border-emerald-800/40 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="font-serif font-bold text-lg text-white">Broadcast Announcement</h2>
              <p className="text-xs text-emerald-300/70 mt-1">
                Dispatch an immediate reminder, reflection, or prayer announcement to subscribed devices.
              </p>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-200/80 mb-1 font-semibold">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jumu'ah Mubarak • Special Reminder"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#07241A] rounded-xl border border-emerald-800/60 text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-emerald-200/80 mb-1 font-semibold">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the reflection or announcement message..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#07241A] rounded-xl border border-emerald-800/60 text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-emerald-200/80 mb-1 font-semibold">Notification Type</label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#07241A] rounded-xl border border-emerald-800/60 text-white focus:outline-none"
                >
                  <option value="announcement">Announcement / Notice</option>
                  <option value="reflection">Daily Reflection / Ayah</option>
                  <option value="reminder">Prayer Reminder</option>
                  <option value="special">Special Occasion (Ramadan / Eid)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="w-full py-3 px-4 rounded-xl font-bold text-[#07241A] bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${broadcasting ? 'animate-spin' : ''}`} />
                <span>{broadcasting ? 'Dispatching Broadcast...' : 'Dispatch Broadcast to Users'}</span>
              </button>
            </form>
          </div>
        ) : activeTab === 'resources' ? (
          /* ======================================================== */
          /* QURAN PDF RESOURCES TAB (SUPABASE STORAGE INTEGRATION)    */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="bg-[#08281D] rounded-2xl border border-emerald-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>Quran & Vocabulary PDF Storage</span>
                </h3>
                <p className="text-xs text-emerald-200/70 mt-1">
                  Master PDF resources hosted on Supabase Storage bucket <code className="bg-emerald-950 px-2 py-0.5 rounded text-amber-300 font-mono">quran-resources</code> with byte-range streaming.
                </p>
              </div>
              <button
                onClick={fetchQuranResources}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-700/60 text-xs font-semibold text-emerald-100 transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Refresh Resources</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {quranResources.map((res) => {
                const sizeMb = (res.fileSize / (1024 * 1024)).toFixed(2);
                const isCopied = copiedUrlKey === res.resourceKey;

                return (
                  <div
                    key={res.id}
                    className="bg-[#08281D] rounded-2xl border border-emerald-900/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-amber-400 border border-emerald-800">
                            {res.resourceKey}
                          </span>
                          <h4 className="font-bold text-base text-white mt-1.5">{res.title}</h4>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            res.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {res.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 border-y border-emerald-900/40 text-xs">
                        <div>
                          <span className="text-[10px] text-emerald-400/70 uppercase">File Name</span>
                          <p className="font-mono text-emerald-100 truncate mt-0.5">{res.fileName}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-400/70 uppercase">Storage Size</span>
                          <p className="font-bold text-amber-300 mt-0.5">{sizeMb} MB</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-400/70 uppercase">Version</span>
                          <p className="font-semibold text-emerald-100 mt-0.5">v{res.version}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-3 mt-1">
                          <span className="text-[10px] text-emerald-400/70 uppercase">Bucket Path</span>
                          <p className="font-mono text-xs text-emerald-300 truncate mt-0.5">
                            quran-resources/{res.storagePath}
                          </p>
                        </div>
                      </div>

                      {/* Public Supabase CDN URL Box */}
                      <div className="mt-3 bg-[#061e16] p-2.5 rounded-xl border border-emerald-900/80 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-emerald-200/70 truncate">{res.publicUrl}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(res.publicUrl);
                              setCopiedUrlKey(res.resourceKey);
                              setTimeout(() => setCopiedUrlKey(null), 2000);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white transition cursor-pointer"
                            title="Copy Supabase Public URL"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={res.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 hover:text-amber-200 transition"
                            title="Test Link in Browser"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-2 flex items-center justify-between border-t border-emerald-900/40">
                      <span className="text-xs text-emerald-300/80">
                        Status: <strong className="text-white">{res.isActive ? 'Publicly Available' : 'Hidden'}</strong>
                      </span>
                      <button
                        onClick={() => handleToggleResourceStatus(res.id, res.isActive)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          res.isActive
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60 hover:bg-amber-900/80'
                            : 'bg-emerald-900 text-emerald-200 border border-emerald-700 hover:bg-emerald-800'
                        }`}
                      >
                        {res.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-400" />
                            <span>Set Inactive</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-amber-400" />
                            <span>Set Active</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'releases' ? (
          <AppReleaseManagementView onNotification={(type, msg) => setBanner({ type, message: msg })} />
        ) : null}

        {/* MODAL: Correct Salah Status */}
        {correctingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#0A3023] border border-emerald-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <h3 className="font-serif font-bold text-base text-white">Correct Salah Record</h3>
                </div>
                <button
                  onClick={() => setCorrectingRecord(null)}
                  className="text-stone-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary of record */}
              <div className="bg-[#07241A] p-3 rounded-xl border border-emerald-900/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-300/70">User:</span>
                  <span className="font-bold text-white">{correctingRecord.userName} ({correctingRecord.userEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300/70">Prayer & Date:</span>
                  <span className="font-bold text-amber-300 capitalize">{correctingRecord.prayerName} • {correctingRecord.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300/70">Current Status:</span>
                  <span className="font-bold uppercase text-stone-200">{correctingRecord.status}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-emerald-200/90 font-semibold mb-1">New Salah Status</label>
                  <select
                    value={correctionNewStatus}
                    onChange={(e) => setCorrectionNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800/60 text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="on_time">ON TIME (وقت پر ادا کی)</option>
                    <option value="late">LATE (تاخیر سے)</option>
                    <option value="qada">QADA (قضا ادا کی)</option>
                    <option value="missed">MISSED (قضا ہو گئی)</option>
                    <option value="delete">DELETE / RESET (Delete record)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-200/90 font-semibold mb-1">
                    Mandatory Explanation Reason <span className="text-amber-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter explicit reason for this administrative change (e.g., 'User submitted correction request after accidental swipe', 'Correction verified with congregation')..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800/60 text-white placeholder-emerald-400/40 focus:outline-none focus:border-amber-400 text-xs"
                  />
                  <p className="text-[10px] text-amber-400/80 mt-1">
                    ⚠️ Required for audit trail: this reason and your admin ID will be permanently recorded in `admin_prayer_corrections`.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-900/60">
                  <button
                    type="button"
                    onClick={() => setCorrectingRecord(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCorrection || !correctionReason.trim()}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#072118] text-xs font-bold shadow-md cursor-pointer transition disabled:opacity-40"
                  >
                    {submittingCorrection ? 'Recording...' : 'Save & Record Audit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SignOutConfirmationModal
          isOpen={isSignOutModalOpen}
          onClose={() => setIsSignOutModalOpen(false)}
          onConfirmSignOut={async () => {
            await logout();
            setIsSignOutModalOpen(false);
            navigate('/', { replace: true });
          }}
          userName={currentUser?.name}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
