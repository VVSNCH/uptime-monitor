import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { UPTIME_HISTORY_DAYS } from '@uptime/shared'

import { ErrorState, SectionCard } from '../../../../components'
import { useMonitorStats } from '../../../../hooks/useMonitors'
import { formatPercent } from '../../../../services/format'
import { UptimeBar } from '../UptimeBar/UptimeBar'

interface UptimeHistoryProps {
  monitorId: number
}

export function UptimeHistory({ monitorId }: UptimeHistoryProps) {
  const { data: stats, isPending, isError, refetch } = useMonitorStats(monitorId, '90d')

  return (
    <SectionCard
      title={`Last ${UPTIME_HISTORY_DAYS} days`}
      actions={
        stats && (
          <Typography variant="body2" color="textSecondary">
            {formatPercent(stats.uptime)} uptime
          </Typography>
        )
      }
    >
      {isPending && <Skeleton variant="rounded" height={36} />}
      {isError && (
        <ErrorState
          variant="inline"
          message="The uptime history could not be loaded."
          onRetry={() => void refetch()}
        />
      )}
      {stats && <UptimeBar days={stats.days} />}
    </SectionCard>
  )
}
