import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { SearchLayout } from '@/components/search/SearchLayout'
import { ManualSearchPage } from '@/pages/ManualSearchPage'
import { AutoSearchPage } from '@/pages/AutoSearchPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        {
          path: 'search',
          element: <SearchLayout />,
          children: [
            { index: true, element: <ManualSearchPage /> },
            { path: 'auto', element: <AutoSearchPage /> },
          ],
        },
        { path: 'leads', element: <LeadsPage /> },
        { path: 'leads/:id', element: <LeadDetailPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
