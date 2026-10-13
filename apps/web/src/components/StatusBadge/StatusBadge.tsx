import type { SvgIconComponent } from '@mui/icons-material'
import CancelRounded from '@mui/icons-material/CancelRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import HelpRounded from '@mui/icons-material/HelpRounded'
import PauseCircleRounded from '@mui/icons-material/PauseCircleRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'

import { type DisplayStatus, STATUS_LABELS } from '../../constants/status'
import { InlineStatus, StatusChip } from './StatusBadge.styles'

const STATUS_ICONS: Record<DisplayStatus, SvgIconComponent> = {
  up: CheckCircleRounded,
  down: CancelRounded,
  paused: PauseCircleRounded,
  pending: ScheduleRounded,
  unknown: HelpRounded,
}

export type StatusBadgeVariant = 'chip' | 'inline'
export type StatusBadgeSize = 'small' | 'medium'

interface StatusBadgeProps {
  status: DisplayStatus
  variant?: StatusBadgeVariant
  size?: StatusBadgeSize
}

export function StatusBadge({ status, variant = 'chip', size = 'small' }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status]
  const label = STATUS_LABELS[status]

  if (variant === 'inline') {
    return (
      <InlineStatus $status={status} $size={size}>
        <Icon fontSize="inherit" />
        {label}
      </InlineStatus>
    )
  }

  return (
    <StatusChip $status={status} icon={<Icon />} label={label} size={size} variant="outlined" />
  )
}
