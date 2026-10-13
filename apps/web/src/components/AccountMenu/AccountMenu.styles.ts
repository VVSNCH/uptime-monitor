import Chip from '@mui/material/Chip'
import styled from 'styled-components'

export const DemoChip = styled(Chip)`
  ${({ theme }) => theme.breakpoints.down('sm')} {
    && {
      display: none;
    }
  }
`

export const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  margin-left: ${({ theme }) => theme.spacing(1)};
`

export const Account = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 260px;
  padding: ${({ theme }) => theme.spacing(1, 2)};
`
