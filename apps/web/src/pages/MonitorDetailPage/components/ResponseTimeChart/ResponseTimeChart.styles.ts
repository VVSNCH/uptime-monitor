import styled from 'styled-components'

// The series is drawn in currentColor, so its colour comes from the theme here.
export const ChartArea = styled.div`
  color: ${({ theme }) => theme.vars.palette.primary.main};
`
