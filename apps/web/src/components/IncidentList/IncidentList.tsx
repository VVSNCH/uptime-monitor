import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import type { IncidentResponse } from '@uptime/shared'
import { Link } from 'react-router'

import { ROUTES } from '../../constants/navigation'
import { useNow } from '../../hooks/useNow'
import { formatDuration } from '../../services/format'
import { DateTime } from '../DateTime/DateTime'
import { Cell, CellLabel, List, Row } from './IncidentList.styles'

export type IncidentListVariant = 'all' | 'monitor'

const MS_PER_SECOND = 1_000

interface IncidentListProps {
  incidents: IncidentResponse[]
  // 'all' names the monitor on each row; 'monitor' is for a single monitor's page.
  variant?: IncidentListVariant
}

export function IncidentList({ incidents, variant = 'all' }: IncidentListProps) {
  const now = useNow()

  return (
    <List>
      {incidents.map((incident) => {
        const isOpen = incident.endedAt === null
        const seconds =
          incident.durationSeconds ??
          Math.round((now - new Date(incident.startedAt).getTime()) / MS_PER_SECOND)

        return (
          <Row key={incident.id} $variant={variant}>
            <Cell $area="state">
              <Chip
                size="small"
                variant={isOpen ? 'filled' : 'outlined'}
                color={isOpen ? 'error' : 'default'}
                label={isOpen ? 'Ongoing' : 'Resolved'}
              />
            </Cell>
            {variant === 'all' && (
              <Cell $area="monitor">
                <Typography
                  component={Link}
                  to={ROUTES.monitor(incident.monitorId)}
                  variant="subtitle2"
                  color="textPrimary"
                  noWrap
                >
                  {incident.monitorName}
                </Typography>
              </Cell>
            )}
            <Cell $area="cause">
              <Typography variant="body2">{incident.cause}</Typography>
            </Cell>
            <Cell $area="started">
              <CellLabel $variant={variant}>Started</CellLabel>
              <Typography variant="body2" color="textSecondary">
                <DateTime value={incident.startedAt} />
              </Typography>
            </Cell>
            <Cell $area="duration">
              <CellLabel $variant={variant}>{isOpen ? 'Down for' : 'Lasted'}</CellLabel>
              <Typography variant="subtitle2">
                {formatDuration(seconds)}
                {isOpen && ' so far'}
              </Typography>
            </Cell>
          </Row>
        )
      })}
    </List>
  )
}
