import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProviders } from './providers/AppProviders'
import '../design-system/index.css'

const container = document.getElementById('react-root')

if (!container) {
  throw new Error('React root element #react-root was not found.')
}

const root = createRoot(container)

root.render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
