import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { MonitorSummary } from '@uptime/shared'

import { DateTime, StatusBadge } from '../../../../components'
import { ROUTES } from '../../../../constants/navigation'
import { formatPercent, formatResponseTime } from '../../../../services/format'
import { toDisplayStatus } from '../../../../services/monitorStatus'
import { Sparkline } from '../Sparkline/Sparkline'
import { Cell, CellLabel, Name, Row } from './MonitorRow.styles'

interface MonitorRowProps {
  monitor: MonitorSummary
}

export function MonitorRow({ monitor }: MonitorRowProps) {
  const status = toDisplayStatus(monitor)

  return (
    <Row to={ROUTES.monitor(monitor.id)} $isMuted={status === 'paused'}>
      <Cell $area="status">
        <StatusBadge status={status} variant="inline" />
      </Cell>
      <Cell $area="name">
        <Name>
          <Typography variant="subtitle1" component="span" noWrap>
            {monitor.name}
          </Typography>
          {monitor.isSeeded && <Chip label="Seeded" size="small" variant="outlined" />}
        </Name>
        <Typography variant="body2" color="textSecondary" noWrap>
          {monitor.url}
        </Typography>
      </Cell>
      <Cell $area="spark">
        <Sparkline monitorId={monitor.id} status={status} />
      </Cell>
      <Cell $area="uptime">
        <CellLabel>Uptime 24h</CellLabel>
        {formatPercent(monitor.uptime24h)}
      </Cell>
      <Cell $area="response">
        <CellLabel>Response</CellLabel>
        {formatResponseTime(monitor.lastResponseMs)}
      </Cell>
      <Cell $area="checked">
        <CellLabel>Last checked</CellLabel>
        {monitor.lastCheckedAt ? (
          <DateTime value={monitor.lastCheckedAt} variant="relative" />
        ) : (
          'Never'
        )}
      </Cell>
    </Row>
  )
}
