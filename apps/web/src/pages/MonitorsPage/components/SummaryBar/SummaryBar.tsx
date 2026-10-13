import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { MonitorSummary } from '@uptime/shared'

import { DateTime, StatCard } from '../../../../components'
import { summarizeMonitors } from '../../../../services/monitorStatus'
import { Grid } from './SummaryBar.styles'

interface SummaryBarProps {
  monitors: MonitorSummary[]
  openIncidentCount: number
}

// When checks have stopped, counts of up and down would be stale claims, so
// the bar is replaced by a notice saying when they last ran.
export function SummaryBar({ monitors, openIncidentCount }: SummaryBarProps) {
  const overview = summarizeMonitors(monitors)

  if (overview.isStalled) {
    return (
      <Alert severity="warning">
        <AlertTitle>Checks have stopped running</AlertTitle>
        {overview.lastCheckedAt ? (
          <>
            Checks last ran <DateTime value={overview.lastCheckedAt} variant="relative" />, so every
            status below is unknown until they resume.
          </>
        ) : (
          'No check has run yet, so every status below is unknown until one does.'
        )}
      </Alert>
    )
  }

  return (
    <Grid>
      <StatCard label="Up" value={overview.upCount} tone="success" />
      <StatCard
        label="Down"
        value={overview.downCount}
        tone={overview.downCount > 0 ? 'error' : 'neutral'}
      />
      <StatCard
        label="Open incidents"
        value={openIncidentCount}
        tone={openIncidentCount > 0 ? 'warning' : 'neutral'}
        hint={openIncidentCount > 0 ? 'Something is down right now' : 'Nothing is down'}
      />
      <StatCard label="Paused" value={overview.pausedCount} />
    </Grid>
  )
}
