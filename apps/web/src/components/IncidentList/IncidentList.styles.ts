import styled from 'styled-components'

import type { IncidentListVariant } from './IncidentList'

type IncidentCellArea = 'state' | 'monitor' | 'cause' | 'started' | 'duration'

const STACKED_AREAS: Record<IncidentListVariant, string> = {
  all: `'state state' 'monitor monitor' 'cause cause' 'started duration'`,
  monitor: `'state state' 'cause cause' 'started duration'`,
}

export const List = styled.div`
  display: flex;
  flex-direction: column;
`

// The full list becomes one table-style line from the md breakpoint. A single
// monitor's list sits in a side column, so it stays stacked at every width.
export const Row = styled.div<{ $variant: IncidentListVariant }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-areas: ${({ $variant }) => STACKED_AREAS[$variant]};
  gap: ${({ theme }) => theme.spacing(0.5, 2)};
  padding: ${({ theme }) => theme.spacing(1.5, 2)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.vars.palette.divider};
  }

  ${({ theme }) => theme.breakpoints.up('md')} {
    ${({ $variant }) =>
      $variant === 'all' &&
      `
        grid-template-columns: 100px minmax(0, 1fr) minmax(0, 1.2fr) 180px 140px;
        grid-template-areas: 'state monitor cause started duration';
        align-items: center;
      `}
  }
`

export const Cell = styled.div<{ $area: IncidentCellArea }>`
  grid-area: ${({ $area }) => $area};
  min-width: 0;

  a {
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`

export const CellLabel = styled.span<{ $variant: IncidentListVariant }>`
  display: block;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.vars.palette.text.secondary};

  ${({ theme }) => theme.breakpoints.up('md')} {
    display: ${({ $variant }) => ($variant === 'all' ? 'none' : 'block')};
  }
`
