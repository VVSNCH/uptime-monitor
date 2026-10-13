import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

import { Actions, Header, Titles } from './PageHeader.styles'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Header>
      <Titles>
        <Typography variant="h1">{title}</Typography>
        {description && (
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        )}
      </Titles>
      {actions && <Actions>{actions}</Actions>}
    </Header>
  )
}
