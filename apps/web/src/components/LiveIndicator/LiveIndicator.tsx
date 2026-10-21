import Tooltip from '@mui/material/Tooltip'

import { useLiveUpdates } from '../../hooks/useLiveUpdates'
import type { LiveStatus } from '../../services/liveEvents'
import { Dot, Label, Wrapper } from './LiveIndicator.styles'

const COPY: Record<LiveStatus, { label: string; hint: string }> = {
  live: { label: 'Live', hint: 'Changes appear as soon as a check finishes' },
  connecting: { label: 'Connecting', hint: 'Connecting for live updates' },
  offline: {
    label: 'Reconnecting',
    hint: 'Live updates paused; the dashboard still refreshes every minute',
  },
}

// Mounted once in the app bar: it keeps the dashboard live and shows whether it is.
export function LiveIndicator() {
  const status = useLiveUpdates()
  const { label, hint } = COPY[status]

  return (
    <Tooltip title={hint}>
      <Wrapper role="status" aria-label={hint}>
        <Dot $status={status} />
        <Label>{label}</Label>
      </Wrapper>
    </Tooltip>
  )
}
