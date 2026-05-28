import { Button } from '../../../components/ui'
import { SettingsPageRecipe } from '../../../design-system/recipes/settings-page'
import { isReactProductionDeployment } from '../../deploy-target'
import { closeReactDb } from '../../../storage/db'
import { QURAN_ATLAS_DB_NAME } from '../../../storage/schema'

async function clearReactData() {
  localStorage.clear()
  sessionStorage.clear()
  closeReactDb()
  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.map((name) => caches.delete(name)))
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
  window.location.hash = '#/s/1'
  window.location.reload()
}

export function AboutRoute() {
  return (
    <SettingsPageRecipe title="About">
      <p className="qar:m-0 qar:text-base qar:font-medium">Read, reflect, remember.</p>
      <p className="qar:m-0 qar:max-w-2xl qar:text-sm qar:text-muted">
        {isReactProductionDeployment
          ? 'QuranAtlas provides verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows.'
          : 'QuranAtlas React preview keeps Svelte as the shipped reference while parity work is verified.'}
      </p>
      <div>
        <Button onClick={() => { void clearReactData() }} variant="danger">
          Clear all data
        </Button>
      </div>
    </SettingsPageRecipe>
  )
}
