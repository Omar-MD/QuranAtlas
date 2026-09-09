import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { AppProviders } from './providers/AppProviders'
import { installServiceWorkerReloadGuard } from './service-worker-reload'
import '../design-system/index.css'

const container = document.getElementById('react-root')

if (!container) {
  throw new Error('React root element #react-root was not found.')
}

installServiceWorkerReloadGuard()

const root = createRoot(container)

root.render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
