import Typography from '@mui/material/Typography'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'

import { SPARKLINE_SIZE } from '../../../../constants/layout'
import { SPARKLINE_HOURS } from '../../../../constants/monitor'
import type { DisplayStatus } from '../../../../constants/status'
import { useMonitorChecks } from '../../../../hooks/useMonitors'
import { Wrapper } from './Sparkline.styles'

interface SparklineProps {
  monitorId: number
  status: DisplayStatus
}

// Response times of the last day's successful checks, drawn in the
// monitor's status colour.
export function Sparkline({ monitorId, status }: SparklineProps) {
  const { data: checks = [] } = useMonitorChecks(monitorId, SPARKLINE_HOURS)
  const values = checks.flatMap((check) =>
    check.ok && check.responseMs !== null ? [check.responseMs] : [],
  )

  if (values.length < 2) {
    return (
      <Typography variant="caption" color="textSecondary">
        No data yet
      </Typography>
    )
  }

  return (
    <Wrapper $status={status} aria-hidden="true">
      <SparkLineChart
        data={values}
        width={SPARKLINE_SIZE.width}
        height={SPARKLINE_SIZE.height}
        color="currentColor"
        curve="natural"
        margin={2}
      />
    </Wrapper>
  )
}
