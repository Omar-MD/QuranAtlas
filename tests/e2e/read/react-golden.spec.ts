import { expect, test, type Page } from '@playwright/test'

import { expectAxeClean, expectMinTouchTarget, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import {
  expectNoGuardFailures,
  expectReactProductionPreflight,
  GOLDEN_FIXTURES,
  GOLDEN_VIEWPORTS,
  installPageGuards,
  openSeededReactMushafRoute,
  PRIVATE_MUSHAF_EDITION_ID,
  PRIVATE_MUSHAF_ENABLED,
  seedTargetState,
  targetUrl,
} from '../fixtures/react-golden-routes'

const readFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  [
    'reader-surah-start',
    'reader-ayah-deeplink',
    'mushaf-ready',
    'daily-wird-no-plan',
    'daily-wird-active',
  ].includes(fixture.id),
)

for (const fixture of readFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(page, `react ${fixture.id}`)
      const seenDatasetUrls = new Set<string>()
      page.on('request', (request) => {
        const url = request.url()
        if (url.includes('/dataset/')) seenDatasetUrls.add(new URL(url).pathname)
      })
      await page.goto(targetUrl('react', fixture.route || '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
      await expect(page.locator('main')).toBeVisible()

      if (fixture.id.startsWith('reader-') || fixture.id.startsWith('daily-wird')) {
        await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      }

      if (fixture.id === 'daily-wird-no-plan') {
        await expect(page.getByRole('button', { name: /start daily wird/i })).toHaveCount(0)
      }

      if (fixture.id === 'daily-wird-active') {
        const status = page.getByRole('button', { name: /Daily Wird: \d+% today/i })
        await expect(status).toBeVisible()
        await status.click()
        const drawer = page.getByRole('dialog', { name: 'Navigation' })
        await expect(drawer.getByRole('heading', { name: 'Daily Wird' })).toBeVisible()
      }

      if (fixture.id === 'reader-surah-start') {
        await expect(page.getByTestId('verse-1:7'), 'RPA-002: React must render the full dataset-backed Al-Fatihah corpus.').toBeVisible()
        expect(seenDatasetUrls).toContain('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json')
        expect(seenDatasetUrls).toContain('/dataset/translations/bridges/001.json')
        await expect(page.getByLabel(/بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ/)).toBeVisible()
        const basmalaSize = await page.locator('.qar-reader-basmala-text').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
        expect(basmalaSize).toBeLessThanOrEqual(72)
        await expect(page.getByTestId('verse-1:1')).toContainText('اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ')
        await expect(page.getByTestId('verse-1:1')).toContainText('All praise be to Allah, Lord of all realms,')
        const previousSurah = page.getByRole('button', { name: 'Previous surah: An-Nās' })
        const nextSurah = page.getByRole('button', { name: 'Next surah: Al-Baqarah' })
        await expect(previousSurah).toBeVisible()
        await expect(nextSurah).toBeVisible()
        expect(seenDatasetUrls).toContain('/dataset/surahs.json')
        const quickNavSize = await nextSurah.evaluate((element) => {
          const buttonBox = element.getBoundingClientRect()
          const title = element.querySelector('.qar-reader-continue-title') ?? element
          const arrow = element.querySelector('.qar-reader-continue-arrow') ?? element
          return {
            arrowSize: Number.parseFloat(getComputedStyle(arrow).fontSize),
            height: buttonBox.height,
            titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
          }
        })
        expect(quickNavSize.height).toBeGreaterThanOrEqual(44)
        expect(quickNavSize.titleSize).toBeGreaterThanOrEqual(13)
        expect(quickNavSize.arrowSize).toBeGreaterThanOrEqual(14)
        const tokenProof = await page.getByTestId('verse-1:1').evaluate((element) => {
          const rootStyles = getComputedStyle(document.documentElement)
          const arabicStyles = getComputedStyle(element.querySelector('[lang="ar"]') ?? element)
          const nextDividerStyles = getComputedStyle(element.nextElementSibling ?? element, '::before')
          return {
            divider: nextDividerStyles.backgroundImage,
            fontFamily: arabicStyles.fontFamily,
            tokens: [
              '--qa-react-canvas',
              '--qa-react-surface',
              '--qa-react-text',
              '--qa-react-text-muted',
              '--qa-react-border',
              '--qa-react-focus',
              '--qa-react-accent',
              '--qa-react-reader-selection',
            ].map((name) => rootStyles.getPropertyValue(name).trim()),
          }
        })
        expect(tokenProof.divider).toContain('linear-gradient')
        expect(tokenProof.fontFamily).toContain('KFGQPC Uthmanic Qaloon')
        expect(tokenProof.tokens.every(Boolean)).toBe(true)
        const headerLayout = await page.getByLabel('Surah 1 header').evaluate((element) => {
          const surface = element.closest('[data-reader-verse-surface="true"]') ?? element.parentElement ?? element
          const headerBox = element.getBoundingClientRect()
          const surfaceBox = surface.getBoundingClientRect()
          const title = element.querySelector('[dir="rtl"]') ?? element
          const titleStyles = getComputedStyle(title)
          return {
            centerDelta: Math.abs((headerBox.left + headerBox.width / 2) - (surfaceBox.left + surfaceBox.width / 2)),
            fontFamily: titleStyles.fontFamily,
            fontSize: Number.parseFloat(titleStyles.fontSize),
            paddingLeft: Number.parseFloat(getComputedStyle(element).paddingLeft),
            paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
          }
        })
        expect(headerLayout.centerDelta).toBeLessThan(1)
        expect(headerLayout.fontFamily).toContain('Scheherazade New')
        expect(headerLayout.fontSize).toBeGreaterThanOrEqual(34)
        expect(headerLayout.paddingLeft).toBeGreaterThanOrEqual(12)
        expect(headerLayout.paddingTop).toBeGreaterThanOrEqual(8)
        const versePadding = await page.getByTestId('verse-1:1').evaluate((element) => {
          const styles = getComputedStyle(element)
          return {
            bottom: Number.parseFloat(styles.paddingBottom),
            left: Number.parseFloat(styles.paddingLeft),
            right: Number.parseFloat(styles.paddingRight),
            top: Number.parseFloat(styles.paddingTop),
          }
        })
        expect(versePadding.top).toBeCloseTo(18, 0)
        expect(versePadding.right).toBeCloseTo(24, 0)
        expect(versePadding.bottom).toBeCloseTo(18, 0)
        expect(versePadding.left).toBeCloseTo(30, 0)
        const verseOne = page.getByTestId('verse-1:1')
        const verseNumberBox = await verseOne.getByRole('button', { name: 'Bookmark verse 1' }).boundingBox()
        const arabicBox = await verseOne.locator('[data-reader-arabic-line="true"]').boundingBox()
        expect(verseNumberBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(arabicBox?.x ?? 0)
        await expect(verseOne.locator('[data-reader-translation="true"]')).toHaveAttribute('dir', 'ltr')
        const translationLayout = await verseOne.evaluate((element) => {
          const verseBox = element.getBoundingClientRect()
          const translationBox = element.querySelector('[data-reader-translation="true"]')?.getBoundingClientRect()
          return {
            direction: getComputedStyle(element.querySelector('[data-reader-translation="true"]') ?? element).direction,
            translationWidth: translationBox?.width ?? 0,
            verseWidth: verseBox.width,
          }
        })
        expect(translationLayout.direction).toBe('ltr')
        expect(translationLayout.translationWidth).toBeGreaterThan(translationLayout.verseWidth * 0.8)
        const footnoteButton = page.getByRole('button', { name: /footnote 1/i }).first()
        await footnoteButton.click()
        const footnote = page.getByRole('note')
        await expect(footnote).toContainText(/King of the Day of Recompense/i)
        expect(await footnote.evaluate((element) => element.closest('[data-reader-translation="true"]') === null)).toBe(true)
        await expect(page.getByText(/tafsir/i), 'RPA-002: React intentionally excludes Tafsir reader UI.').toHaveCount(0)
        await expect(page.getByText(/Verse text unavailable/i), 'RPA-002: production must not show preview fallback copy.').toHaveCount(0)
        await nextSurah.click()
        await expect(page).toHaveURL(/#\/s\/2$/)
        await expect(page.getByLabel('Surah 2 header')).toBeVisible()
      }

      if (fixture.id === 'reader-ayah-deeplink') {
        expect(seenDatasetUrls).toContain('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/002.json')
        expect(seenDatasetUrls).toContain('/dataset/translations/bridges/002.json')
        await expect(page.getByTestId('verse-2:255')).toBeVisible()
        await expect(page.getByTestId('verse-2:255')).toContainText(/لَا إِكْرَاهَ فِے اِ۬لدِّينِ/i)
        await expect(page.getByTestId('verse-2:255')).toContainText(/no compulsion in religion/i)
        const beforeScroll = await page.evaluate(() => window.scrollY)
        await page.mouse.wheel(0, 900)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeScroll)
        await expect(page.locator('[data-virtualized="true"]')).toHaveCount(0)
      }

      if (fixture.id === 'mushaf-ready') {
        await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
        await expect.poll(() => Array.from(seenDatasetUrls)).toContain('/dataset/indexes/mushaf-assets.json')
        await expect.poll(() => Array.from(seenDatasetUrls)).toContain('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
        await expect.poll(() => Array.from(seenDatasetUrls)).toContain('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg')
        await expect(page.getByLabel(/mushaf page placeholder/i), 'RPA-003: production must not render the temporary Mushaf SVG.').toHaveCount(0)
        const pageImage = page.getByRole('img', { name: /mushaf page 1, qaloon/i })
        await expect(pageImage, 'RPA-003: React must render a real edition-aware Mushaf SVG page.').toBeVisible()
        const svg = pageImage.locator('svg')
        await expect(svg).toBeVisible()
        await expect(svg).toHaveAttribute('viewBox', /^-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/)
        await expect(page.getByRole('tab', { name: /auto/i })).toHaveCount(0)
        await expect(page.getByRole('tab', { name: /page/i })).toHaveCount(0)
        await expect(page.getByRole('tab', { name: /width/i })).toHaveCount(0)
        const pageCounter = page.getByLabel('Mushaf page 1', { exact: true })
        await expect(pageCounter).toBeVisible()
        await expect(pageCounter).toHaveText('1')
        const surahLabel = page.locator('.qar-react-mushaf-page-surah')
        await expect(surahLabel).toBeVisible()
        await expect(surahLabel).toContainText(/الفَاتِحة|الفاتحة/)
        await expect(surahLabel).toHaveAttribute('dir', 'rtl')
        await expect(surahLabel).toHaveAttribute('lang', 'ar')
        const layout = await pageImage.evaluate((element) => {
          const box = element.getBoundingClientRect()
          const svgBox = element.querySelector('svg')?.getBoundingClientRect()
          const counterBox = document.querySelector('[aria-label="Mushaf page 1"]')?.getBoundingClientRect()
          const root = getComputedStyle(document.documentElement)
          const svgStyle = getComputedStyle(element.querySelector('svg') ?? element)
          return {
            counterBottomGap: counterBox ? window.innerHeight - counterBox.bottom : 0,
            counterCenterOffset: counterBox ? Math.abs((counterBox.left + counterBox.width / 2) - window.innerWidth / 2) : 999,
            height: box.height,
            svgHeight: svgBox?.height ?? 0,
            svgWidth: svgBox?.width ?? 0,
            tokens: [
              '--qa-react-mushaf-ground',
              '--qa-react-mushaf-ink',
              '--qa-react-mushaf-border',
              '--qa-react-mushaf-accent',
            ].map((name) => root.getPropertyValue(name).trim()),
            width: box.width,
            svgDisplay: svgStyle.display,
          }
        })
        expect(layout.tokens.every(Boolean)).toBe(true)
        expect(layout.width).toBeGreaterThan(200)
        expect(layout.height).toBeGreaterThan(300)
        expect(layout.svgWidth).toBeGreaterThan(200)
        expect(layout.svgHeight).toBeGreaterThan(300)
        expect(layout.counterBottomGap).toBeGreaterThanOrEqual(8)
        expect(layout.counterCenterOffset).toBeLessThanOrEqual(2)
        expect(layout.svgDisplay).toBe('block')
        const chrome = page.getByRole('navigation', { name: 'Primary navigation' })
        await expect(chrome).toHaveAttribute('data-visible', 'true')
        const nextPage = page.getByRole('button', { name: 'Next Mushaf page' })
        const previousPage = page.getByRole('button', { name: 'Previous Mushaf page' })
        await expect(nextPage).toBeEnabled()
        await expect(previousPage).toBeDisabled()
        await expectMinTouchTarget(nextPage)
        await expectMinTouchTarget(previousPage)
        await nextPage.click()
        await expect(page).toHaveURL(/#\/m\/2$/)
        await expect(page.getByRole('img', { name: /Mushaf page 2,/i })).toBeVisible()
      }

      const firstControl = page.getByRole('button').first()
      if (await firstControl.count()) {
        await expectMinTouchTarget(firstControl)
      }
      await expectNoGuardFailures(guard)
      guard.dispose()
    })
  }
}

async function expectPrivatePagePixels(page: Page, pageNo: number) {
  const image = page.getByRole('img', { name: new RegExp(`Mushaf page ${pageNo}, Qaloon`, 'i') }).locator('img')
  await expect(image).toHaveAttribute('src', new RegExp(`/pages/${String(pageNo).padStart(3, '0')}-2136\\.webp$`))
  const evidence = await image.evaluate((source) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const colours = new Set<string>()
    let darkPixels = 0
    let opaquePixels = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue, alpha] = [pixels[index]!, pixels[index + 1]!, pixels[index + 2]!, pixels[index + 3]!]
      if (alpha > 0) opaquePixels += 1
      if (red + green + blue < 540) darkPixels += 1
      if (index % 16 === 0) colours.add(`${red}:${green}:${blue}:${alpha}`)
    }
    return { colours: colours.size, darkPixels, opaquePixels, naturalHeight: source.naturalHeight, naturalWidth: source.naturalWidth }
  })
  expect(evidence).not.toBeNull()
  expect(evidence!.naturalWidth).toBe(2136)
  expect(evidence!.naturalHeight).toBeGreaterThan(2000)
  expect(evidence!.opaquePixels).toBe(4096)
  expect(evidence!.darkPixels).toBeGreaterThan(16)
  expect(evidence!.colours).toBeGreaterThan(16)
}

test.describe('private Furatiyyah Mushaf', () => {
  test.skip(!PRIVATE_MUSHAF_ENABLED, 'Private Mushaf journeys require QURANATLAS_PRIVATE_MUSHAF=1.')

  test('renders reviewed private pages as nonblank WebP assets and retains only adjacent media', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const webpPages = new Set<number>()
    page.on('request', (request) => {
      const match = /\/pages\/(\d+)-\d+\.webp$/.exec(new URL(request.url()).pathname)
      if (match) webpPages.add(Number(match[1]))
    })
    await openSeededReactMushafRoute(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' }, {
      mushafEditionId: PRIVATE_MUSHAF_EDITION_ID,
      route: '/#/m/42',
    })

    const current = page.getByRole('img', { name: /Mushaf page 42, Qaloon/i })
    await expect(current).toBeVisible()
    await expectPrivatePagePixels(page, 42)
    await expect.poll(() => [...webpPages].sort((left, right) => left - right)).toEqual([41, 42, 43])

    for (const pageNo of [1, 2, 302, 604]) {
      await page.goto(targetUrl('react', `/#/m/${pageNo}`))
      await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${pageNo}, Qaloon`, 'i') })).toBeVisible()
      await expectPrivatePagePixels(page, pageNo)
    }
    await expectNoHorizontalOverflow(page)
  })
})
