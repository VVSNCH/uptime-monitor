import styled from 'styled-components'

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  max-width: 420px;
`
