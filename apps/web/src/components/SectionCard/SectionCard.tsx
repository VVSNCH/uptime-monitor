import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

import { Body, Card, Header } from './SectionCard.styles'

export type SectionCardPadding = 'normal' | 'none'

interface SectionCardProps {
  title?: string
  actions?: ReactNode
  padding?: SectionCardPadding
  children: ReactNode
}

export function SectionCard({ title, actions, padding = 'normal', children }: SectionCardProps) {
  const hasHeader = Boolean(title) || Boolean(actions)

  return (
    <Card>
      {hasHeader && (
        <Header>
          {title && <Typography variant="h3">{title}</Typography>}
          {actions}
        </Header>
      )}
      <Body $padding={padding}>{children}</Body>
    </Card>
  )
}
