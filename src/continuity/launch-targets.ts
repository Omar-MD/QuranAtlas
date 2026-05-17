import type { Riwayah } from '../packs/riwayah'
import { resolveSavedPositionTarget } from './position'

const MUSHAF_MIN_PAGE = 1
const MUSHAF_MAX_PAGE = 604
const STATIC_LAUNCHABLE_ROUTES = new Set(['#/surahs', '#/bookmarks', '#/about'])

function hasRejectedSyntax(hash: string): boolean {
  if (!hash.startsWith('#/')) return true
  if (hash === '#/' || hash === '#') return true
  if (hash.slice(1).includes('#')) return true
  if (/[?&<>\\]/.test(hash)) return true
  if (/%2f|%5c|%3c|%3e|javascript:|data:/i.test(hash)) return true
  return false
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

async function resolveVerseTarget(hash: string, riwayah: Riwayah): Promise<string | null> {
  const match = hash.match(/^#\/s\/(\d+)(?:\/(\d+))?$/)
  if (!match) return null

  const surah = parsePositiveInteger(match[1] ?? '')
  if (surah === null || surah < 1 || surah > 114) return null

  const ayah = match[2]
  if (!ayah) return `#/s/${surah}`

  const verse = parsePositiveInteger(ayah)
  if (verse === null) return null

  return resolveSavedPositionTarget({ surah, verse }, riwayah)
}

function resolveMushafTarget(hash: string): string | null {
  const match = hash.match(/^#\/m\/(\d+)$/)
  if (!match) return null

  const page = parsePositiveInteger(match[1] ?? '')
  if (page === null || page < MUSHAF_MIN_PAGE || page > MUSHAF_MAX_PAGE) {
    return null
  }

  return `#/m/${page}`
}

export async function resolveLaunchableTarget(hash: unknown, riwayah: Riwayah): Promise<string | null> {
  if (typeof hash !== 'string' || hasRejectedSyntax(hash)) {
    return null
  }
  if (STATIC_LAUNCHABLE_ROUTES.has(hash)) {
    return hash
  }
  return (await resolveVerseTarget(hash, riwayah)) ?? resolveMushafTarget(hash)
}

export async function resolveReaderTarget(hash: unknown, riwayah: Riwayah): Promise<string | null> {
  if (typeof hash !== 'string' || hasRejectedSyntax(hash)) {
    return null
  }
  return (await resolveVerseTarget(hash, riwayah)) ?? resolveMushafTarget(hash)
}
