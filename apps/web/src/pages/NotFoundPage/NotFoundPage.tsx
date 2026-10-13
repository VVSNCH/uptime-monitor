import Button from '@mui/material/Button'
import { Link } from 'react-router'

import { EmptyState } from '../../components'
import { ROUTES } from '../../constants/navigation'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="There is nothing at this address."
      action={
        <Button component={Link} to={ROUTES.monitors} variant="outlined">
          Go to monitors
        </Button>
      }
    />
  )
}
