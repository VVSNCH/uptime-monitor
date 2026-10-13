import styled from 'styled-components'

export const Details = styled.dl`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(1, 2)};
  margin: 0;
`

export const Term = styled.dt`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.vars.palette.text.secondary};
`

export const Value = styled.dd`
  margin: 0;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
`
