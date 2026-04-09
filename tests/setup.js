import 'fake-indexeddb/auto'
import { afterEach, beforeEach, vi } from 'vitest'
import { logger } from '../src/core/logger.js'

function formatConsoleArg(value) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function createUnexpectedConsoleError(methodName, args) {
  const renderedArgs = args.map(formatConsoleArg).join(' ')
  const detail = renderedArgs ? `\nReceived: ${renderedArgs}` : ''

  return new Error(
    `Unexpected console.${methodName} call in test. Mock console.${methodName} explicitly in this test if it is expected.${detail}`
  )
}

function installConsoleGuards() {
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    throw createUnexpectedConsoleError('warn', args)
  })
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    throw createUnexpectedConsoleError('error', args)
  })
}

const originalRestoreAllMocks = vi.restoreAllMocks.bind(vi)

vi.restoreAllMocks = () => {
  originalRestoreAllMocks()
  logger.setLevel('silent')
  installConsoleGuards()
}

logger.setLevel('silent')
installConsoleGuards()

beforeEach(() => {
  logger.setLevel('silent')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Mock BroadcastChannel for jsdom
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = class {
    constructor() {
      this.onmessage = null
      this.postMessage = () => {}
      this.close = () => {}
    }
  }
}

// Mock caches API for jsdom
globalThis.caches = {
  open: async (name) => ({
    match: async () => undefined,
    put: async () => {},
    keys: async () => [],
    add: async () => {},
    addAll: async () => {},
  }),
  has: async () => false,
  delete: async () => false,
}

// Mock serviceWorker
globalThis.navigator.serviceWorker = {
  ready: Promise.resolve({ active: {} }),
  controller: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  postMessage: () => {},
}
