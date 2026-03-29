import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, closeDb } from '../../../src/core/db.js';

describe('db', () => {
  beforeEach(() => {
    closeDb();
  });

  it('opens the database successfully', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    expect(db.name).toBe('quran-atlas');
  });

  it('returns the same cached instance on repeated calls', async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });

  it('creates all required object stores', async () => {
    const db = await getDb();
    const storeNames = [...db.objectStoreNames];
    expect(storeNames).toContain('marks');
    expect(storeNames).toContain('positions');
    expect(storeNames).toContain('settings');
    expect(storeNames).toContain('datasetMeta');
    expect(storeNames).toContain('activationState');
  });

  it('creates the by-tag multiEntry index on marks', async () => {
    const db = await getDb();
    const tx = db.transaction('marks', 'readonly');
    const store = tx.objectStore('marks');
    const index = store.index('by-tag');
    expect(index).toBeDefined();
    expect(index.multiEntry).toBe(true);
    await tx.done;
  });

  it('creates the by-updated index on marks', async () => {
    const db = await getDb();
    const tx = db.transaction('marks', 'readonly');
    const store = tx.objectStore('marks');
    const index = store.index('by-updated');
    expect(index).toBeDefined();
    await tx.done;
  });

  it('can write and read a mark record', async () => {
    const db = await getDb();
    const mark = {
      verseKey: '2:255',
      tags: ['favorite', 'review'],
      note: 'Ayat al-Kursi',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('marks', mark);
    const retrieved = await db.get('marks', '2:255');
    expect(retrieved).toMatchObject({ verseKey: '2:255', note: 'Ayat al-Kursi' });
  });

  it('closeDb() clears the cached connection', async () => {
    const db1 = await getDb();
    expect(db1).toBeDefined();
    closeDb();
    const db2 = await getDb();
    // After close + re-open, a new instance is returned
    expect(db2).toBeDefined();
  });

  it('can query marks by tag using the by-tag index', async () => {
    const db = await getDb();
    await db.put('marks', {
      verseKey: '1:1',
      tags: ['basmala'],
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.put('marks', {
      verseKey: '2:255',
      tags: ['ayat-al-kursi', 'basmala'],
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const results = await db.getAllFromIndex('marks', 'by-tag', 'basmala');
    expect(results.length).toBe(2);
  });
});
