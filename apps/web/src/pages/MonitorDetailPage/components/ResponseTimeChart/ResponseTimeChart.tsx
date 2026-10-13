import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { LineChart } from '@mui/x-charts/LineChart'
import { useState } from 'react'

import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../../components'
import { CHART_HEIGHT, CHART_MAX_POINTS } from '../../../../constants/layout'
import { DEFAULT_RESPONSE_CHART_HOURS, RESPONSE_CHART_WINDOWS } from '../../../../constants/monitor'
import { useMonitorChecks } from '../../../../hooks/useMonitors'
import { useTimeZone } from '../../../../hooks/useTimeZone'
import { toChartPoints } from '../../../../services/chart'
import {
  formatDateTime,
  formatResponseTime,
  formatShortDate,
  formatTimeOfDay,
} from '../../../../services/format'
import { ChartArea } from './ResponseTimeChart.styles'

const HOURS_SHOWN_AS_TIME = 24

interface ResponseTimeChartProps {
  monitorId: number
}

export function ResponseTimeChart({ monitorId }: ResponseTimeChartProps) {
  const [hours, setHours] = useState(DEFAULT_RESPONSE_CHART_HOURS)
  const [timeZone] = useTimeZone()
  const { data: checks, isPending, isError, refetch } = useMonitorChecks(monitorId, hours)

  const handleWindowChange = (_event: unknown, value: number | null) => {
    if (value !== null) setHours(value)
  }

  const points = toChartPoints(checks ?? [], CHART_MAX_POINTS)
  const formatAxis = (value: Date) =>
    hours <= HOURS_SHOWN_AS_TIME
      ? formatTimeOfDay(value, timeZone)
      : formatShortDate(value, timeZone)

  return (
    <SectionCard
      title="Response time"
      actions={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={hours}
          onChange={handleWindowChange}
          aria-label="Time window"
        >
          {RESPONSE_CHART_WINDOWS.map((window) => (
            <ToggleButton key={window.hours} value={window.hours}>
              {window.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {isPending && <LoadingState variant="detail" count={1} />}
      {isError && (
        <ErrorState
          variant="inline"
          message="Response times could not be loaded."
          onRetry={() => void refetch()}
        />
      )}
      {!isPending && !isError && points.length === 0 && (
        <EmptyState
          variant="inline"
          title="No checks in this window"
          description="Response times appear here once the monitor has been checked."
        />
      )}
      {points.length > 0 && (
        <ChartArea>
          <LineChart
            height={CHART_HEIGHT.regular}
            hideLegend
            grid={{ horizontal: true }}
            margin={{ left: 0, right: 8 }}
            xAxis={[
              {
                data: points.map((point) => point.at),
                scaleType: 'time',
                valueFormatter: (value: Date, context) =>
                  context.location === 'tick' ? formatAxis(value) : formatDateTime(value, timeZone),
              },
            ]}
            yAxis={[
              { min: 0, width: 56, valueFormatter: (value: number) => formatResponseTime(value) },
            ]}
            series={[
              {
                data: points.map((point) => point.responseMs),
                label: 'Response time',
                color: 'currentColor',
                showMark: false,
                valueFormatter: (value) => formatResponseTime(value),
              },
            ]}
          />
        </ChartArea>
      )}
    </SectionCard>
  )
}
