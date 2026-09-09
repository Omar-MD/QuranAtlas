import { Component, type ReactNode } from 'react'

import { Button, Status } from '../components/ui'
import { NavigationPageRecipe } from '../design-system/recipes/navigation-page'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Top-level render crash boundary: replaces the route tree with a reload
 * affordance so a failed render never dead-ends the app shell.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="qar:min-h-screen qar:bg-canvas qar:text-text">
          <NavigationPageRecipe title="QuranAtlas cannot continue">
            <Status
              action={
                <Button onClick={() => window.location.reload()} variant="secondary">
                  Reload QuranAtlas
                </Button>
              }
              description="An unexpected error interrupted this screen. Reloading restores a working copy of the app."
              title="Something went wrong"
              tone="error"
            />
          </NavigationPageRecipe>
        </div>
      )
    }

    return this.props.children
  }
}
