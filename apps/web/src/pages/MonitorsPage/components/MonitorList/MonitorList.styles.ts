import styled from 'styled-components'

import { ROW_COLUMNS } from '../MonitorRow/MonitorRow.styles'

export const Header = styled.div`
  display: none;
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  border-bottom: 1px solid ${({ theme }) => theme.vars.palette.divider};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.vars.palette.text.secondary};

  ${({ theme }) => theme.breakpoints.up('md')} {
    display: grid;
    grid-template-columns: ${ROW_COLUMNS};
    gap: ${({ theme }) => theme.spacing(1, 2)};
  }
`
