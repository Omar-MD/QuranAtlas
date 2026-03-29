/**
 * IndexedDB layer (idb v8 wrapper).
 *
 * Single database: 'quran-atlas', version 1.
 * All IDB access goes through getDb() — never open directly.
 *
 * Stores:
 *   marks        — verseKey (PK), tags[] (by-tag index), updatedAt (by-updated index)
 *   positions    — id (PK): "main" | "review"
 *   settings     — key (PK)
 *   datasetMeta  — id (PK): "current"
 *   activationState — id (PK): "current"
 */

import { openDB } from 'idb';
import { emit } from './events.js';

const DB_NAME = 'quran-atlas';
const DB_VERSION = 1;

/** @type {import('idb').IDBPDatabase | null} */
let db = null;

/**
 * Open (or return cached) the database connection.
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function getDb() {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        // marks: one per verse, indexed by tag and update time
        const marksStore = database.createObjectStore('marks', { keyPath: 'verseKey' });
        marksStore.createIndex('by-tag', 'tags', { multiEntry: true });
        marksStore.createIndex('by-updated', 'updatedAt');

        // positions: reading position per context ("main" | "review")
        database.createObjectStore('positions', { keyPath: 'id' });

        // settings: arbitrary key-value store
        database.createObjectStore('settings', { keyPath: 'key' });

        // datasetMeta: current dataset package version and hash state
        database.createObjectStore('datasetMeta', { keyPath: 'id' });

        // activationState: dataset download/activation phase
        database.createObjectStore('activationState', { keyPath: 'id' });
      }
    },

    blocked() {
      // A newer version wants to open but this tab has the DB open.
      // The user will see a "please reload" prompt from the versionchange handler.
      emit('db:blocked');
    },

    blocking() {
      // This tab is running an old version and is blocking an upgrade in another tab.
      db?.close();
      db = null;
      emit('db:version-change');
    },

    terminated() {
      // Browser killed the IDB connection (rare).
      db = null;
      emit('db:terminated');
    },
  });

  return db;
}

/**
 * Close and clear the cached connection (used during factory reset).
 */
export function closeDb() {
  db?.close();
  db = null;
}
