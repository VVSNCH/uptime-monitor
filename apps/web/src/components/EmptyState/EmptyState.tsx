import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

import { IconWrap, Wrapper } from './EmptyState.styles'

export type EmptyStateVariant = 'page' | 'inline'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  variant?: EmptyStateVariant
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = 'page',
}: EmptyStateProps) {
  return (
    <Wrapper $variant={variant}>
      {icon && <IconWrap $variant={variant}>{icon}</IconWrap>}
      <Typography variant={variant === 'page' ? 'h2' : 'h3'}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      )}
      {action}
    </Wrapper>
  )
}
