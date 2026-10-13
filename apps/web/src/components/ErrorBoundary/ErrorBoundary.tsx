import { Component, type ReactNode } from 'react'

import { ErrorState } from '../ErrorState/ErrorState'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  private readonly handleReload = () => window.location.reload()

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message="This page failed to load. Reloading usually fixes it."
          onRetry={this.handleReload}
        />
      )
    }
    return this.props.children
  }
}
