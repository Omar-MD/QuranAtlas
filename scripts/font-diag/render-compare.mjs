#!/usr/bin/env node
/**
 * Side-by-side render of Ayat al-Kursi (2:255) in Chromium AND WebKit
 * across all three riwayat. Saves PNG screenshots of the .qa-verse-arabic
 * element to scripts/font-diag/.out/ for visual comparison.
 *
 * NOTE: Playwright's WebKit is the same engine Safari uses but is NOT
 * iOS Safari proper — iOS adds its own font subsystem quirks on top. This
 * is the closest local proxy we have without a real device.
 *
 * Run:
 *   node scripts/font-diag/render-compare.mjs
 *
 * Requires:
 *   npx playwright install webkit chromium
 */

import { chromium, webkit } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PORT = 5179  // out-of-band to avoid collisions
const URL = `http://localhost:${PORT}`
const OUT = resolve('scripts/font-diag/.out')
mkdirSync(OUT, { recursive: true })

const RIWAYAT = (process.env.RIWAYAT || 'hafs').split(',')

// --- vite dev server lifecycle ----------------------------------------------

console.log(`[server] starting vite on :${PORT}`)
const server = spawn('pnpm', ['exec', 'vite', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'inherit'],
})
let serverReady = false
const serverReadyPromise = new Promise((res, rej) => {
  server.stdout.on('data', (chunk) => {
    const s = chunk.toString()
    if (!serverReady && /ready in|Local:.*localhost/i.test(s)) {
      serverReady = true
      res()
    }
  })
  server.on('exit', (code) => {
    if (!serverReady) rej(new Error(`vite exited early (code ${code})`))
  })
})

await Promise.race([
  serverReadyPromise,
  new Promise((_, rej) => setTimeout(() => rej(new Error('vite did not start in 30s')), 30000)),
])
console.log('[server] ready')

// Tiny extra delay to let HMR endpoints settle.
await new Promise(r => setTimeout(r, 500))

// --- IDB seeding helpers (run in-page) --------------------------------------

const SEED_FN = `(riwayah) => new Promise((resolve, reject) => {
  const open = indexedDB.open('quran-atlas', 4)
  open.onupgradeneeded = (e) => {
    const db = e.target.result
    if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
    if (!db.objectStoreNames.contains('marks')) db.createObjectStore('marks', { keyPath: 'verseKey' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('edges')) db.createObjectStore('edges', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('activationState')) db.createObjectStore('activationState', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('datasetMeta')) db.createObjectStore('datasetMeta', { keyPath: 'id' })
  }
  open.onsuccess = () => {
    const db = open.result
    const tx = db.transaction('settings', 'readwrite')
    const s = tx.objectStore('settings')
    s.put({ key: 'onboardingComplete', value: true })
    s.put({ key: 'riwayah', value: riwayah })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => reject(tx.error)
  }
  open.onerror = () => reject(open.error)
})`

// --- screenshot loop --------------------------------------------------------

async function captureEngine(launcher, label) {
  console.log(`[${label}] launching`)
  const browser = await launcher.launch()
  try {
    for (const r of RIWAYAT) {
    try {
      const ctx = await browser.newContext({
        viewport: { width: 900, height: 700 },
        deviceScaleFactor: 2,
      })
      const page = await ctx.newPage()
      // Bootstrap origin so IDB is available, then seed.
      await page.goto(URL + '/', { waitUntil: 'domcontentloaded' })
      await page.evaluate(`(${SEED_FN})("${r}")`)
      // Surat ar-Rahman: 78 short verses, dense tashkeel — best stress test
      // for Naskh stem weight + combining-mark stacking across riwayat.
      await page.goto(URL + '/#/s/55/1', { waitUntil: 'load' })
      // Wait for fonts + verse element.
      await page.waitForSelector('.qa-verse-arabic', { timeout: 30000 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(500)

      // Capture first 6 verses stacked — gives a clear weight read.
      const buf = await page.evaluate(async () => {
        const verses = Array.from(document.querySelectorAll('.qa-verse-arabic')).slice(0, 6)
        if (verses.length === 0) return null
        const first = verses[0].getBoundingClientRect()
        const last = verses[verses.length - 1].getBoundingClientRect()
        return { y: Math.floor(first.top), h: Math.ceil(last.bottom - first.top) + 16 }
      })
      const clip = buf
        ? { x: 0, y: Math.max(0, buf.y), width: 900, height: Math.min(700, buf.h) }
        : { x: 0, y: 0, width: 900, height: 700 }
      const png = await page.screenshot({ type: 'png', clip })
      const file = resolve(OUT, `${label}-${r}.png`)
      writeFileSync(file, png)
      console.log(`[${label}/${r}] → ${file}  (clip h=${clip.height})`)

      await ctx.close()
    } catch (e) {
      console.warn(`[${label}/${r}] FAILED: ${e.message}`)
    }
  }
  } finally {
    await browser.close()
  }
}

try {
  await captureEngine(chromium, 'chromium')
  await captureEngine(webkit, 'webkit')
} finally {
  server.kill()
}

console.log('\nWrote screenshots to:')
console.log(`  ${OUT}`)
console.log('Compare side-by-side:')
console.log(`  open ${OUT}/chromium-hafs.png ${OUT}/webkit-hafs.png`)
console.log(`  open ${OUT}/chromium-warsh.png ${OUT}/webkit-warsh.png`)
console.log(`  open ${OUT}/chromium-qaloon.png ${OUT}/webkit-qaloon.png`)
