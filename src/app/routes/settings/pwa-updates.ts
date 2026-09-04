export type AppUpdateCheckResult =
  | { status: 'current'; message: string }
  | { status: 'reloading'; message: string }
  | { status: 'unavailable'; message: string }

const SERVICE_WORKER_READY_TIMEOUT_MS = 4_000

export async function fetchLatestAppChanges(): Promise<AppUpdateCheckResult> {
  if (!('serviceWorker' in navigator)) {
    return {
      status: 'unavailable',
      message: 'App updates are not available in this browser.',
    }
  }

  const registration = await navigator.serviceWorker.getRegistration()

  if (!registration) {
    return {
      status: 'unavailable',
      message: 'App updates are available after QuranAtlas is installed or opened from a production build.',
    }
  }

  const updatedRegistration = await registration.update()
  const pendingWorker = updatedRegistration.waiting ?? await waitForInstallingWorker(updatedRegistration)

  if (!pendingWorker) {
    return {
      status: 'current',
      message: 'QuranAtlas is already using the latest app files.',
    }
  }

  await activateWorkerAndReload(pendingWorker)

  return {
    status: 'reloading',
    message: 'Latest app files found. Reloading QuranAtlas...',
  }
}

async function waitForInstallingWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorker | null> {
  const installingWorker = registration.installing
  if (!installingWorker) return null
  const worker: ServiceWorker = installingWorker

  if (worker.state === 'installed' || worker.state === 'activated') return worker
  if (worker.state === 'redundant') return null

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      worker.removeEventListener('statechange', handleStateChange)
      resolve(null)
    }, SERVICE_WORKER_READY_TIMEOUT_MS)

    function handleStateChange() {
      if (
        worker.state !== 'installed'
        && worker.state !== 'activated'
        && worker.state !== 'redundant'
      ) return

      window.clearTimeout(timeoutId)
      worker.removeEventListener('statechange', handleStateChange)
      resolve(worker.state === 'redundant' ? null : worker)
    }

    worker.addEventListener('statechange', handleStateChange)
  })
}

async function activateWorkerAndReload(worker: ServiceWorker): Promise<void> {
  if (worker.state !== 'activated') {
    const controllerChanged = waitForControllerChange()
    worker.postMessage({ type: 'SKIP_WAITING' })
    await controllerChanged
  }

  window.location.reload()
}

function waitForControllerChange(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false
    const timeoutId = window.setTimeout(finish, SERVICE_WORKER_READY_TIMEOUT_MS)

    function finish() {
      if (resolved) return
      resolved = true
      window.clearTimeout(timeoutId)
      navigator.serviceWorker.removeEventListener('controllerchange', finish)
      resolve()
    }

    navigator.serviceWorker.addEventListener('controllerchange', finish)
  })
}
