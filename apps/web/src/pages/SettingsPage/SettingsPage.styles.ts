import ToggleButton from '@mui/material/ToggleButton'
import styled from 'styled-components'

export const ModeButton = styled(ToggleButton)`
  && {
    gap: ${({ theme }) => theme.spacing(0.75)};
  }
`

export const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  max-width: 720px;
`

export const Example = styled.div`
  margin-top: ${({ theme }) => theme.spacing(1)};
`
