import styled from 'styled-components'

import type { EmptyStateVariant } from './EmptyState'

interface VariantProps {
  $variant: EmptyStateVariant
}

const PADDING: Record<EmptyStateVariant, number> = { page: 8, inline: 3 }
const ICON_SIZE: Record<EmptyStateVariant, string> = { page: '3rem', inline: '2rem' }

export const Wrapper = styled.div<VariantProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme, $variant }) => theme.spacing(PADDING[$variant], 2)};
  text-align: center;
`

export const IconWrap = styled.div<VariantProps>`
  display: flex;
  color: ${({ theme }) => theme.vars.palette.text.secondary};
  font-size: ${({ $variant }) => ICON_SIZE[$variant]};

  svg {
    font-size: inherit;
  }
`
