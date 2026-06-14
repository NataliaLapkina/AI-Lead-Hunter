import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Users,
  BarChart3,
  Settings,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ru } from '@/i18n/ru'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: ru.nav.dashboard },
  { to: '/search', icon: Search, label: ru.nav.search },
  { to: '/leads', icon: Users, label: ru.nav.leads },
  { to: '/analytics', icon: BarChart3, label: ru.nav.analytics },
  { to: '/settings', icon: Settings, label: ru.nav.settings },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">{ru.app.name}</p>
          <p className="text-xs text-muted-foreground">{ru.app.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
