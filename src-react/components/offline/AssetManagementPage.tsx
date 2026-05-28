import { AssetManagementPageRecipe } from '../../design-system/recipes/asset-management-page'
import { DEFAULT_READER_ASSET_PROFILE, readerAssetProfileRows } from '../../../shared/reader-assets/default-profile'
import { AssetRow } from '../sources/AssetRow'

export function AssetManagementPage() {
  const rows = readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE)
  return (
    <AssetManagementPageRecipe>
      <section className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Asset rows">
        {rows.map((row) => (
          <AssetRow key={row.id} label={row.label} status="included" />
        ))}
      </section>
    </AssetManagementPageRecipe>
  )
}
