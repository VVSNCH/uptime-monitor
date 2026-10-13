import MuiCard from '@mui/material/Card'
import styled from 'styled-components'

import type { SectionCardPadding } from './SectionCard'

const BODY_PADDING: Record<SectionCardPadding, number> = { normal: 2, none: 0 }

export const Card = styled(MuiCard)`
  display: flex;
  flex-direction: column;
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  border-bottom: 1px solid ${({ theme }) => theme.vars.palette.divider};
`

export const Body = styled.div<{ $padding: SectionCardPadding }>`
  padding: ${({ theme, $padding }) => theme.spacing(BODY_PADDING[$padding])};
`
