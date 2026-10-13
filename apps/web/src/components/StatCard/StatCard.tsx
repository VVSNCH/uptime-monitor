import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

import { Card, Value } from './StatCard.styles'

export type StatCardTone = 'neutral' | 'success' | 'error' | 'warning'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatCardTone
}

export function StatCard({ label, value, hint, tone = 'neutral' }: StatCardProps) {
  return (
    <Card>
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
      <Value $tone={tone}>{value}</Value>
      {hint && (
        <Typography variant="caption" color="textSecondary">
          {hint}
        </Typography>
      )}
    </Card>
  )
}
