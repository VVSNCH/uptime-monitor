import CampaignRounded from '@mui/icons-material/CampaignRounded'
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded'
import ReportProblemRounded from '@mui/icons-material/ReportProblemRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'

import type { NavItem } from '../types/navigation'

export const ROUTES = {
  monitors: '/',
  monitor: (id: number | string) => `/monitors/${id}`,
  monitorPattern: '/monitors/:id',
  incidents: '/incidents',
  channels: '/channels',
  settings: '/settings',
  login: '/login',
  register: '/register',
} as const

export const NAV_ITEMS: NavItem[] = [
  { label: 'Monitors', to: ROUTES.monitors, icon: MonitorHeartRounded },
  { label: 'Incidents', to: ROUTES.incidents, icon: ReportProblemRounded },
  { label: 'Channels', to: ROUTES.channels, icon: CampaignRounded },
  { label: 'Settings', to: ROUTES.settings, icon: SettingsRounded },
]
