import { Sidebar, MobileNav } from '@/components/layout/Sidebar'
import { Outlet } from 'react-router-dom'

export function AppLayout() {
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
