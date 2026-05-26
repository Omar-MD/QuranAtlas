import type { Category } from '../infra/sw/route-defs'
import type { Riwayah } from '../packs/riwayah'
import { getRiwayahPackageStatus } from '../packs/riwayah'
import { planRiwayahPackageInstall as planRiwayahPackageInstallFromIndex } from './riwayah-packages'

type SourceAssetKind = 'translation' | 'tafsir'

export async function getCategoryManifest(category: Category) {
  const offline = await import('./offline')
  return offline.getCategoryManifest(category)
}

export async function getSourceAssetManifest(kind: SourceAssetKind, id: string) {
  const offline = await import('./offline')
  return offline.getSourceAssetManifest(kind, id)
}

export async function getPageAssetManifest(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.getPageAssetManifest(riwayah)
}

export async function planRiwayahPackageInstall(riwayah: Riwayah) {
  return planRiwayahPackageInstallFromIndex(riwayah)
}

export async function refreshRiwayahPackageStatus(riwayah: Riwayah) {
  return getRiwayahPackageStatus(riwayah)
}

export async function getStorageBudget() {
  const offline = await import('./offline')
  return offline.getStorageBudget()
}

export async function removeCategoryDownload(category: Category) {
  const offline = await import('./offline')
  return offline.removeCategoryDownload(category)
}

export async function removeSourceAssetDownload(kind: SourceAssetKind, id: string) {
  const offline = await import('./offline')
  return offline.removeSourceAssetDownload(kind, id)
}

export async function removePageAssetDownload(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.removePageAssetDownload(riwayah)
}

export async function removeRiwayahPackage(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.removeRiwayahPackage(riwayah)
}

export async function startCategoryDownload(category: Category) {
  const offline = await import('./offline')
  return offline.startCategoryDownload(category)
}

export async function startSourceAssetDownload(kind: SourceAssetKind, id: string) {
  const offline = await import('./offline')
  return offline.startSourceAssetDownload(kind, id)
}

export async function startPageAssetDownload(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.startPageAssetDownload(riwayah)
}

export async function startRiwayahPackageInstall(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.startRiwayahPackageInstall(riwayah)
}

export async function retryRiwayahPackageInstall(riwayah: Riwayah) {
  const offline = await import('./offline')
  return offline.retryRiwayahPackageInstall(riwayah)
}
