import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
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
} from 'lucide-react';
import { adminApi, type AdminOverviewData, type AdminUserData } from '../services/backendApi';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout, banner, setBanner } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast'>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter, verifiedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(), fetchUsers()]);
    setRefreshing(false);
  };

  const handleToggleRole = async (targetUser: AdminUserData) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change ${targetUser.email}'s role to ${newRole}?`)) {
      return;
    }
    try {
      await adminApi.updateUserRole(targetUser.id, newRole);
      setBanner({ type: 'success', message: `Updated ${targetUser.email} to ${newRole}.` });
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update role.' });
    }
  };

  const handleDeleteUser = async (targetUser: AdminUserData) => {
    if (targetUser.id === currentUser?.id) {
      setBanner({ type: 'error', message: 'You cannot delete your own admin account.' });
      return;
    }
    if (!window.confirm(`PERMANENT ACTION: Delete user ${targetUser.email} and all associated prayer logs?`)) {
      return;
    }
    try {
      await adminApi.deleteUser(targetUser.id);
      setBanner({ type: 'success', message: `Deleted user ${targetUser.email}.` });
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete user.' });
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;
    setBroadcasting(true);
    try {
      await adminApi.broadcastNotification({
        title: broadcastTitle,
        body: broadcastBody,
        type: broadcastType,
      });
      setBanner({ type: 'success', message: 'Broadcast sent to active users successfully!' });
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to dispatch broadcast.' });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07241A] text-[#FAF8F2] flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {banner && (
        <aside
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
            onClick={logout}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-200 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <nav aria-label="Admin Navigation" className="border-b border-emerald-900/40 bg-[#08281D] px-4 sm:px-8 flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
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
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'users'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory</span>
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'broadcast'
              ? 'border-amber-400 text-amber-300 bg-emerald-900/20'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Push Notifications</span>
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
                <span className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">Weekly Active</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                  {overview?.kpis.weeklyActiveUsers ?? 0}
                </p>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Active in past 7 days
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
        ) : (
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
        )}
      </main>
    </div>
  );
};
export default AdminDashboard;
