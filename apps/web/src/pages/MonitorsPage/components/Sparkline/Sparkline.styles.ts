import styled from 'styled-components'

import type { DisplayStatus } from '../../../../constants/status'

// The chart draws in currentColor, so the colour comes from the theme here.
export const Wrapper = styled.div<{ $status: DisplayStatus }>`
  color: ${({ theme, $status }) => theme.vars.palette.status[$status]};
  line-height: 0;
`
