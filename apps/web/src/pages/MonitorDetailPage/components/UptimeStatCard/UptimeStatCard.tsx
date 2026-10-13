import Skeleton from '@mui/material/Skeleton'
import type { StatsWindow } from '@uptime/shared'

import { StatCard, type StatCardTone } from '../../../../components'
import { useMonitorStats } from '../../../../hooks/useMonitors'
import { formatPercent, formatResponseTime } from '../../../../services/format'

const HEALTHY_UPTIME = 0.999

interface UptimeStatCardProps {
  monitorId: number
  window: StatsWindow
  label: string
}

// No checks yet reads as waiting, never as 0%: zero would claim an outage.
export function UptimeStatCard({ monitorId, window, label }: UptimeStatCardProps) {
  const { data: stats, isPending } = useMonitorStats(monitorId, window)

  if (isPending) return <StatCard label={`Uptime, ${label}`} value={<Skeleton width={80} />} />

  const uptime = stats?.uptime ?? null
  const tone: StatCardTone =
    uptime === null ? 'neutral' : uptime >= HEALTHY_UPTIME ? 'success' : 'warning'

  return (
    <StatCard
      label={`Uptime, ${label}`}
      value={formatPercent(uptime)}
      tone={tone}
      hint={
        stats && stats.checkCount > 0
          ? `${stats.checkCount.toLocaleString()} checks · avg ${formatResponseTime(stats.avgResponseMs)}`
          : 'Waiting for first check'
      }
    />
  )
}
