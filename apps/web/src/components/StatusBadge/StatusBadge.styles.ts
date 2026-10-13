import Chip from '@mui/material/Chip'
import styled from 'styled-components'

import type { DisplayStatus } from '../../constants/status'
import type { StatusBadgeSize } from './StatusBadge'

interface StatusProps {
  $status: DisplayStatus
}

export const StatusChip = styled(Chip)<StatusProps>`
  && {
    color: ${({ theme, $status }) => theme.vars.palette.status[$status]};
    border-color: currentColor;
  }

  && .MuiChip-icon {
    color: inherit;
  }
`

const INLINE_FONT_SIZE: Record<StatusBadgeSize, string> = {
  small: '0.8125rem',
  medium: '0.9375rem',
}

export const InlineStatus = styled.span<StatusProps & { $size: StatusBadgeSize }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.5)};
  font-size: ${({ $size }) => INLINE_FONT_SIZE[$size]};
  font-weight: 600;
  color: ${({ theme, $status }) => theme.vars.palette.status[$status]};

  svg {
    font-size: 1.15em;
  }
`
