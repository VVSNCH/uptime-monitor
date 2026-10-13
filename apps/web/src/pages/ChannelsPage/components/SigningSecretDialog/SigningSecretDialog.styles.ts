import styled from 'styled-components'

export const Secret = styled.code`
  display: block;
  margin-top: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1.5)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  background-color: ${({ theme }) => theme.vars.palette.action.hover};
  font-size: 0.875rem;
  overflow-wrap: anywhere;
  user-select: all;
`
