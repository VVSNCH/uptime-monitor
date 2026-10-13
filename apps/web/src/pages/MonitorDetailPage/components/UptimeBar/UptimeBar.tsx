import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { DailyUptime } from '@uptime/shared'

import { formatDay, formatPercent, formatResponseTime } from '../../../../services/format'
import { Bar, Cell, type CellTone, Footer, Scroller } from './UptimeBar.styles'

// 99.9% allows about a minute and a half down in a day; under 99% is more than
// a quarter of an hour, a day someone would remember.
const GOOD_UPTIME = 0.999
const FAIR_UPTIME = 0.99

interface UptimeBarProps {
  days: DailyUptime[]
}

export function UptimeBar({ days }: UptimeBarProps) {
  return (
    <div>
      <Scroller>
        <Bar role="list" aria-label={`Uptime for the last ${days.length} days`}>
          {days.map((day) => (
            <Tooltip key={day.day} title={describeDay(day)} placement="top" arrow>
              <Cell role="listitem" aria-label={describeDay(day)} $tone={toneFor(day)} />
            </Tooltip>
          ))}
        </Bar>
      </Scroller>
      <Footer>
        <Typography variant="caption" color="textSecondary">
          {days.length} days ago
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Today
        </Typography>
      </Footer>
    </div>
  )
}

function toneFor(day: DailyUptime): CellTone {
  const total = day.upCount + day.downCount
  if (total === 0) return 'empty'
  const uptime = day.upCount / total
  if (uptime >= GOOD_UPTIME) return 'good'
  return uptime >= FAIR_UPTIME ? 'fair' : 'poor'
}

function describeDay(day: DailyUptime): string {
  const total = day.upCount + day.downCount
  if (total === 0) return `${formatDay(day.day)} · no checks`
  const uptime = formatPercent(day.upCount / total)
  const failed = day.downCount === 0 ? 'no failed checks' : `${day.downCount} of ${total} failed`
  return `${formatDay(day.day)} · ${uptime} · ${failed} · avg ${formatResponseTime(day.avgResponseMs)}`
}
