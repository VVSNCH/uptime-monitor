import MuiCard from '@mui/material/Card'
import styled, { type DefaultTheme } from 'styled-components'

import type { StatCardTone } from './StatCard'

const TONE_COLOR: Record<StatCardTone, (theme: DefaultTheme) => string> = {
  neutral: (theme) => theme.vars.palette.text.primary,
  success: (theme) => theme.vars.palette.success.main,
  error: (theme) => theme.vars.palette.error.main,
  warning: (theme) => theme.vars.palette.warning.main,
}

export const Card = styled(MuiCard)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
  padding: ${({ theme }) => theme.spacing(2)};
`

export const Value = styled.span<{ $tone: StatCardTone }>`
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) => TONE_COLOR[$tone](theme)};
`
