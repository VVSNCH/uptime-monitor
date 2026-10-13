import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import Button from '@mui/material/Button'

import { EmptyState, type EmptyStateVariant } from '../EmptyState/EmptyState'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  variant?: EmptyStateVariant
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'page',
}: ErrorStateProps) {
  return (
    <EmptyState
      variant={variant}
      icon={<ErrorOutlineRounded color="error" />}
      title={title}
      description={message}
      action={
        onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  )
}
