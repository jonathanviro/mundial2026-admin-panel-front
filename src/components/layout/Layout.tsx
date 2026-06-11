import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard, Megaphone, Users, Monitor, Calendar,
  Swords, ClipboardList, Trophy, LogOut, ChevronRight, Globe2, UserCheck,
  PanelLeftClose, PanelLeft, Menu, X,
} from 'lucide-react'
import type { ReactNode } from 'react'

const superadminNav = [
  { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/campaigns',   label: 'Campañas',       icon: Megaphone },
  { to: '/users',       label: 'Usuarios',       icon: Users },
  { to: '/totems',      label: 'Tótems',         icon: Monitor },
  { to: '/employees',   label: 'Empleados',      icon: UserCheck },
  { to: '/phases',      label: 'Fases',          icon: Calendar },
  { to: '/matches',     label: 'Partidos',       icon: Swords },
  { to: '/registrations', label: 'Registros',   icon: ClipboardList },
  { to: '/winners',     label: 'Ganadores',      icon: Trophy },
]

const campaignAdminNav = [
  { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/totems',       label: 'Mis Tótems',    icon: Monitor },
  { to: '/employees',    label: 'Empleados',     icon: UserCheck },
  { to: '/registrations',label: 'Participantes', icon: ClipboardList },
  { to: '/winners',      label: 'Ganadores',     icon: Trophy },
]

function SidebarContent({ collapsed, onToggleCollapse, user, handleLogout }: { collapsed: boolean; onToggleCollapse: () => void; user: any; handleLogout: () => void }) {
  const navItems = user?.role === 'superadmin' ? superadminNav : campaignAdminNav
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">⚽</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#e8eaf0] leading-none truncate">Polla Mundial</p>
              <p className="text-xs text-[#7a8899] mt-0.5">2026</p>
            </div>
          )}
        </div>
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1 text-[#7a8899] hover:text-accent transition-colors rounded hover:bg-white/5 flex-shrink-0"
          >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-[#7a8899] hover:text-[#e8eaf0] hover:bg-white/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent' : '')} />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {!collapsed && isActive && <ChevronRight className="w-3 h-3 text-accent flex-shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className={cn('flex items-center gap-3 px-3 py-2 mb-2', collapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.nombres?.[0]?.toUpperCase() || 'A'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#e8eaf0] truncate">{user?.nombres}</p>
              <p className="text-xs text-[#7a8899] truncate">
                {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-sm text-[#7a8899] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all',
            collapsed ? 'justify-center' : '',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-shrink-0 flex-col bg-surface-card border-r border-white/[0.06] transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} user={user} handleLogout={handleLogout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col bg-surface-card border-r border-white/[0.06] animate-fade-in">
            <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">⚽</div>
                <div>
                  <p className="text-sm font-bold text-[#e8eaf0] leading-none">Polla Mundial</p>
                  <p className="text-xs text-[#7a8899] mt-0.5">2026</p>
                </div>
              </div>
              <button onClick={closeMobile} className="p-1 text-[#7a8899] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {(user?.role === 'superadmin' ? superadminNav : campaignAdminNav).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'text-[#7a8899] hover:text-[#e8eaf0] hover:bg-white/5'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-white/[0.06]">
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#7a8899] hover:text-red-400 rounded-lg">
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 flex items-center gap-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-[#7a8899] hover:text-white rounded-lg hover:bg-white/5">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[#e8eaf0]">Polla Mundial 2026</span>
        </div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-[#e8eaf0]">{title}</h1>
        {subtitle && <p className="text-sm text-[#7a8899] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
