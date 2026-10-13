import { Link } from 'react-router'
import styled from 'styled-components'

export type MonitorCellArea = 'status' | 'name' | 'spark' | 'uptime' | 'response' | 'checked'

// Cards on phones, one table-style line from the md breakpoint up. The same
// cells are placed with grid areas, so both layouts share one component.
export const ROW_COLUMNS = '170px minmax(0, 1fr) 130px 100px 100px 140px'

export const Row = styled(Link)<{ $isMuted: boolean }>`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    'status status status'
    'name name name'
    'uptime response checked'
    'spark spark spark';
  gap: ${({ theme }) => theme.spacing(1, 2)};
  padding: ${({ theme }) => theme.spacing(2)};
  color: inherit;
  text-decoration: none;
  opacity: ${({ $isMuted }) => ($isMuted ? 0.65 : 1)};

  &:hover {
    background-color: ${({ theme }) => theme.vars.palette.action.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.vars.palette.primary.main};
    outline-offset: -2px;
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.vars.palette.divider};
  }

  ${({ theme }) => theme.breakpoints.up('md')} {
    grid-template-columns: ${ROW_COLUMNS};
    grid-template-areas: 'status name spark uptime response checked';
    align-items: center;
  }
`

export const Cell = styled.div<{ $area: MonitorCellArea }>`
  grid-area: ${({ $area }) => $area};
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-variant-numeric: tabular-nums;
`

export const CellLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.vars.palette.text.secondary};

  ${({ theme }) => theme.breakpoints.up('md')} {
    display: none;
  }
`

export const Name = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  min-width: 0;
`
