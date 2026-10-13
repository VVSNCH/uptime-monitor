import DialogContent from '@mui/material/DialogContent'
import styled from 'styled-components'

export const Fields = styled(DialogContent)`
  && {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(2)};
    padding-top: ${({ theme }) => theme.spacing(1)};
  }
`
