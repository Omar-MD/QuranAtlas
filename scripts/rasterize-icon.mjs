// Rasterize public/icons/icon.svg → icon-192.png + icon-512.png + maskable.
// Uses Playwright's bundled chromium so no extra dep is needed.
//
// Run: node scripts/rasterize-icon.mjs

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SVG_PATH = resolve(ROOT, 'public/icons/icon.svg')
const svg = readFileSync(SVG_PATH, 'utf8')

const TARGETS = [
  { out: 'public/icons/icon-192.png',          size: 192, maskable: false },
  { out: 'public/icons/icon-512.png',          size: 512, maskable: false },
  { out: 'public/icons/icon-maskable-512.png', size: 512, maskable: true  },
]

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  for (const { out, size, maskable } of TARGETS) {
    // Maskable icons need a 10–20% safe-area padding because Android
    // applies platform mask shapes (circle / squircle / rounded square).
    // Render the SVG at 80% with surrounding solid fill so the safe area
    // is preserved.
    const padded = maskable
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
           <rect width="${size}" height="${size}" fill="#0c1426"/>
           <g transform="translate(${size * 0.1} ${size * 0.1}) scale(${size * 0.8 / 512})">
             ${svg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')}
           </g>
         </svg>`
      : svg

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:transparent;">
      <div id="root" style="width:${size}px;height:${size}px;">${padded}</div>
    </body></html>`

    await page.setViewportSize({ width: size, height: size })
    await page.setContent(html)
    const root = await page.locator('#root').first()
    const buf = await root.screenshot({ type: 'png', omitBackground: true })
    writeFileSync(resolve(ROOT, out), buf)
    console.log(`✓ wrote ${out} (${size}×${size}${maskable ? ' maskable' : ''})`)
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
