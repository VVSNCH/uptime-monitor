import IconButton from '@mui/material/IconButton'
import styled from 'styled-components'

import { CONTENT_MAX_WIDTH } from '../../constants/layout'

export const MenuButton = styled(IconButton)`
  && {
    margin-right: ${({ theme }) => theme.spacing(1)};
  }

  ${({ theme }) => theme.breakpoints.up('sm')} {
    && {
      display: none;
    }
  }
`

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  flex-grow: 1;
`

export const DesktopNav = styled.nav`
  display: none;
  gap: ${({ theme }) => theme.spacing(0.5)};

  ${({ theme }) => theme.breakpoints.up('sm')} {
    display: flex;
  }

  a.active {
    color: ${({ theme }) => theme.vars.palette.primary.main};
    background-color: ${({ theme }) => theme.vars.palette.action.selected};
  }
`

export const DrawerNav = styled.nav`
  min-width: 240px;

  .active {
    color: ${({ theme }) => theme.vars.palette.primary.main};
    background-color: ${({ theme }) => theme.vars.palette.action.selected};
  }

  .active .MuiListItemIcon-root {
    color: inherit;
  }
`

export const Main = styled.main`
  max-width: ${CONTENT_MAX_WIDTH}px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing(3, 2)};

  ${({ theme }) => theme.breakpoints.up('sm')} {
    padding: ${({ theme }) => theme.spacing(4, 3)};
  }
`
