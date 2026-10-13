import MuiCard from '@mui/material/Card'
import styled from 'styled-components'

import { AUTH_CARD_WIDTH } from '../../constants/layout'

export const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(2)};
`

export const Card = styled(MuiCard)`
  width: 100%;
  max-width: ${AUTH_CARD_WIDTH}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 3)};
`

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`
