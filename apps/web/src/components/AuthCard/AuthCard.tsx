import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import type { FormEvent, ReactNode } from 'react'

import { Brand, Card, Form, Page } from './AuthCard.styles'

interface AuthCardProps {
  title: string
  subtitle: string
  error?: string | null
  footer: ReactNode
  onSubmit: () => void
  children: ReactNode
}

export function AuthCard({
  title,
  subtitle,
  error = null,
  footer,
  onSubmit,
  children,
}: AuthCardProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Page>
      <Card>
        <Brand>
          <MonitorHeartRounded color="primary" />
          <Typography variant="h3" component="span">
            Uptime Monitor
          </Typography>
        </Brand>
        <div>
          <Typography variant="h2" component="h1">
            {title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        </div>
        <Form onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
        </Form>
        <Typography variant="body2" color="textSecondary">
          {footer}
        </Typography>
      </Card>
    </Page>
  )
}
