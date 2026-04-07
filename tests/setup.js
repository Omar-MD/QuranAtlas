import 'fake-indexeddb/auto'

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
