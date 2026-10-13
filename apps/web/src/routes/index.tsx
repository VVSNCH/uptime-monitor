import { createBrowserRouter, Outlet } from 'react-router'

import { AccountMenu, AppShell, ThemeModeMenu } from '../components'
import { NAV_ITEMS, ROUTES } from '../constants/navigation'
import { LoginPage } from '../pages/LoginPage/LoginPage'
import { RegisterPage } from '../pages/RegisterPage/RegisterPage'
import { RouteErrorPage } from '../pages/RouteErrorPage/RouteErrorPage'
import { GuestOnly } from './guards/GuestOnly'
import { RequireAuth } from './guards/RequireAuth'

// Every address the app answers, and the page behind it. Pages behind sign-in
// load on first visit, so the sign-in screen does not wait for the charts.
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: (
              <AppShell
                navItems={NAV_ITEMS}
                actions={
                  <>
                    <ThemeModeMenu />
                    <AccountMenu />
                  </>
                }
              >
                <Outlet />
              </AppShell>
            ),
            children: [
              {
                index: true,
                lazy: () =>
                  import('../pages/MonitorsPage/MonitorsPage').then((page) => ({
                    Component: page.MonitorsPage,
                  })),
              },
              {
                path: ROUTES.monitorPattern,
                lazy: () =>
                  import('../pages/MonitorDetailPage/MonitorDetailPage').then((page) => ({
                    Component: page.MonitorDetailPage,
                  })),
              },
              {
                path: ROUTES.incidents,
                lazy: () =>
                  import('../pages/IncidentsPage/IncidentsPage').then((page) => ({
                    Component: page.IncidentsPage,
                  })),
              },
              {
                path: ROUTES.channels,
                lazy: () =>
                  import('../pages/ChannelsPage/ChannelsPage').then((page) => ({
                    Component: page.ChannelsPage,
                  })),
              },
              {
                path: ROUTES.settings,
                lazy: () =>
                  import('../pages/SettingsPage/SettingsPage').then((page) => ({
                    Component: page.SettingsPage,
                  })),
              },
              {
                path: '*',
                lazy: () =>
                  import('../pages/NotFoundPage/NotFoundPage').then((page) => ({
                    Component: page.NotFoundPage,
                  })),
              },
            ],
          },
        ],
      },
    ],
  },
])
