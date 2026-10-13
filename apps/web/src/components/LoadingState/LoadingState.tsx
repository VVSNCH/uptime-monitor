import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'

import { CardGrid, FullPage, Stack } from './LoadingState.styles'

// page is for before the app knows what to show at all, such as while it
// checks whether there is a session; the others are skeletons of their layout.
export type LoadingStateVariant = 'list' | 'cards' | 'detail' | 'page'

interface LoadingStateProps {
  variant?: LoadingStateVariant
  count?: number
}

export function LoadingState({ variant = 'list', count = 3 }: LoadingStateProps) {
  const items = Array.from({ length: count }, (_, index) => index)

  if (variant === 'page') {
    return (
      <FullPage aria-busy="true">
        <CircularProgress aria-label="Loading" />
      </FullPage>
    )
  }

  if (variant === 'cards') {
    return (
      <CardGrid aria-busy="true">
        {items.map((index) => (
          <Skeleton key={index} variant="rounded" height={96} />
        ))}
      </CardGrid>
    )
  }

  if (variant === 'detail') {
    return (
      <Stack aria-busy="true">
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    )
  }

  return (
    <Stack aria-busy="true">
      {items.map((index) => (
        <Skeleton key={index} variant="rounded" height={64} />
      ))}
    </Stack>
  )
}
