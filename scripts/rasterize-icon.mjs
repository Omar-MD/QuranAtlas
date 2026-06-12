// Rasterize the accepted app icon reference → favicon + PWA install icons.
// Uses Playwright's bundled chromium so no extra dep is needed.
//
// Run: node scripts/rasterize-icon.mjs

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SOURCE_PATH = resolve(ROOT, 'docs/ui-references/infra/app-icon/install.desktop.light.png')
const sourceDataUrl = `data:image/png;base64,${readFileSync(SOURCE_PATH).toString('base64')}`

const TARGETS = [
  { out: 'public/favicon.ico',                 size: 64,  maskable: false },
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
    // Render the source at 80% with a teal fill so the accepted artwork
    // survives platform masks without clipping the gold border.
    const inset = maskable ? Math.round(size * 0.1) : 0
    const imageSize = size - inset * 2

    const radius = Math.round(imageSize * 0.18)
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:transparent;">
      <div id="root" style="width:${size}px;height:${size}px;background:${maskable ? '#075f5c' : 'transparent'};overflow:hidden;border-radius:${maskable ? 0 : radius}px;">
        <img alt="" src="${sourceDataUrl}" style="display:block;width:${imageSize}px;height:${imageSize}px;margin:${inset}px;border-radius:${radius}px;" />
      </div>
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
