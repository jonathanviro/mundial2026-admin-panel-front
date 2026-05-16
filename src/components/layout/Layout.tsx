import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard, Megaphone, Users, Monitor, Calendar,
  Swords, ClipboardList, Trophy, LogOut, ChevronRight, Globe2, UserCheck,
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

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const navItems = user?.role === 'superadmin' ? superadminNav : campaignAdminNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-card border-r border-white/[0.06]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">⚽</div>
            <div>
              <p className="text-sm font-bold text-[#e8eaf0] leading-none">Polla Mundial</p>
              <p className="text-xs text-[#7a8899] mt-0.5">2026</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-[#7a8899] hover:text-[#e8eaf0] hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent' : '')} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-accent" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.nombres?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#e8eaf0] truncate">{user?.nombres}</p>
              <p className="text-xs text-[#7a8899] truncate">
                {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#7a8899] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eaf0]">{title}</h1>
        {subtitle && <p className="text-sm text-[#7a8899] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
