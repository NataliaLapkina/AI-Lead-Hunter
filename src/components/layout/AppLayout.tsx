import { Sidebar, MobileNav } from '@/components/layout/Sidebar'
import { Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const { pathname } = useLocation()
  const isDashboard = pathname === '/'

  if (isDashboard) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  )
}
