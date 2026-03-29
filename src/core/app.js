/**
 * Application entry point.
 *
 * Initialisation order:
 *   1. Error handlers (must be first — catches errors in all subsequent steps)
 *   2. DB connection (lazy — getDb() called here to warm up the connection)
 *   3. Router (registers core routes, handles initial URL)
 *   4. Service Worker registration
 *   5. Storage persistence request
 */

import { setupErrorHandlers } from './error.js';
import { getDb } from './db.js';
import { initRouter, registerRoute } from './router.js';
import { emit } from './events.js';

// ─── 1. Error Handlers ───────────────────────────────────────────────────────

setupErrorHandlers();

// ─── 2. DB Warm-Up ───────────────────────────────────────────────────────────

// Open the DB connection eagerly so the first user action (e.g. mark save)
// doesn't pay the cold-open cost.
getDb().catch((err) => {
  console.error('[QuranAtlas:db] Failed to open database:', err);
  emit('error:fatal', { message: 'Database unavailable', error: err });
});

// ─── 3. Routes ───────────────────────────────────────────────────────────────

// Routes are registered here and resolved lazily via dynamic import.
// Phase 0: placeholders — modules will be implemented in Phase 1+.

registerRoute('/', () => import('../reader/index.js'));
registerRoute('s/', () => import('../reader/index.js'));
registerRoute('t/', () => import('../review/index.js'));

initRouter();

// ─── 4. Service Worker ───────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Listen for a waiting SW (new version available)
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.statechange === 'installed' && navigator.serviceWorker.controller) {
            emit('sw:update-available', { registration });
          }
        });
      });
    } catch (err) {
      console.error('[QuranAtlas:sw] Registration failed:', err);
      // Non-fatal: app works online without SW
    }
  });
}

// ─── 5. Storage Persistence ──────────────────────────────────────────────────

// Request persistent storage after the page loads.
// On Android Chrome, installed PWAs are granted persistence automatically.
// We request here to get persistence for non-installed (online) sessions too.
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().then((granted) => {
    if (!granted) {
      emit('storage:persistence-denied');
    }
  });
}
