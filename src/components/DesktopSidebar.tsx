import React from 'react'
import { Home, Moon, BookOpen, BarChart2, Settings, Compass, Bell, Shield, LogOut, Building } from 'lucide-react'
import type { NavTab } from './BottomNav'
import type { UserProfile } from '../services/backendApi'

interface DesktopSidebarProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  user: UserProfile | null
  unreadNotifsCount?: number
  onOpenQibla?: () => void
  onOpenNotifications?: () => void
  onSignOut?: () => void
  onOpenAdmin?: () => void
  onOpenMosqueFinder?: () => void
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  user,
  unreadNotifsCount = 0,
  onOpenQibla,
  onOpenNotifications,
  onSignOut,
  onOpenAdmin,
  onOpenMosqueFinder,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Dashboard', icon: Home },
    { id: 'salah' as NavTab, label: 'My Salah', icon: Moon },
    { id: 'quran' as NavTab, label: 'Hadith & Quran', icon: BookOpen },
    { id: 'progress' as NavTab, label: 'Progress', icon: BarChart2 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#0C382B] text-white min-h-screen border-r border-[#08281E] shadow-xl sticky top-0 h-screen select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-emerald-900/60 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-emerald-950 p-1 shadow-md border border-[#E2B755]/30 flex-shrink-0">
          <img src="/images/app-logo.png" alt="Salah Companion" className="w-full h-full object-cover rounded-xl" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg text-[#F6E6C2] tracking-wide leading-tight">
            Salah Companion
          </h2>
          <p className="text-[11px] text-emerald-200/70 font-medium">Your Journey Closer to Allah</p>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
        <div className="text-[10px] font-bold tracking-wider text-emerald-300/60 uppercase px-3 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer text-left touch-target ${
                isActive
                  ? 'bg-[#E2B755] text-[#0C382B] shadow-md shadow-emerald-950/40 font-bold'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#0C382B] stroke-[2.4]' : 'text-emerald-300/80'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}

        {/* Quick Tools Section */}
        <div className="pt-6">
          <div className="text-[10px] font-bold tracking-wider text-emerald-300/60 uppercase px-3 mb-2">
            Tools & Shortcuts
          </div>
          {onOpenQibla && (
            <button
              type="button"
              onClick={onOpenQibla}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white transition cursor-pointer touch-target"
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4 text-[#E2B755]" />
                <span>Qibla Direction</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-800">
                Live
              </span>
            </button>
          )}

          {onOpenMosqueFinder && (
            <button
              type="button"
              onClick={onOpenMosqueFinder}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white transition cursor-pointer touch-target"
            >
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-[#E2B755]" />
                <span>Nearby Mosques</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-800">
                Maps
              </span>
            </button>
          )}

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white transition cursor-pointer touch-target"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#E2B755]" />
                <span>Notifications</span>
              </div>
              {unreadNotifsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-emerald-950 font-bold text-[10px]">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          )}

          {user?.role === 'ADMIN' && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-emerald-900/60 transition cursor-pointer touch-target"
            >
              <Shield className="w-4 h-4 text-amber-300" />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-4 border-t border-emerald-900/60 bg-[#092B21]/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#E2B755]/20 border border-[#E2B755]/40 flex items-center justify-center text-sm font-bold text-[#F6E6C2] flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Salah User'}</p>
              <p className="text-[11px] text-emerald-200/60 truncate">{user?.email || 'Logged In'}</p>
            </div>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-300/70 hover:text-white hover:bg-emerald-800/40 transition cursor-pointer flex-shrink-0 touch-target"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
