import { isRouteErrorResponse, useRouteError } from 'react-router'

import { ErrorState } from '../../components'

export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorState title="Page not found" message="There is nothing at this address." />
  }

  return <ErrorState message="This page failed to load." onRetry={() => window.location.reload()} />
}
