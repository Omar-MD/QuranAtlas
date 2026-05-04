import type { Category } from '../infra/sw/route-defs'

type SourceAssetKind = 'translation' | 'tafsir'

export async function getCategoryManifest(category: Category) {
  const offline = await import('./offline')
  return offline.getCategoryManifest(category)
}

export async function getSourceAssetManifest(kind: SourceAssetKind, id: string) {
  const offline = await import('./offline')
  return offline.getSourceAssetManifest(kind, id)
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

export async function startCategoryDownload(category: Category) {
  const offline = await import('./offline')
  return offline.startCategoryDownload(category)
}

export async function startSourceAssetDownload(kind: SourceAssetKind, id: string) {
  const offline = await import('./offline')
  return offline.startSourceAssetDownload(kind, id)
}
