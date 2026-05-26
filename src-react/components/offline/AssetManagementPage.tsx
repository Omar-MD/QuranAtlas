import { AssetManagementPageRecipe } from '../../design-system/recipes/asset-management-page'
import { AssetRow } from '../sources/AssetRow'

export function AssetManagementPage() {
  return (
    <AssetManagementPageRecipe>
      <section className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Asset rows">
        <AssetRow label="Qalun text" status="installed" />
        <AssetRow label="Hafs Mushaf pages" status="missing" />
        <AssetRow label="Search index" progress={48} status="installing" />
      </section>
    </AssetManagementPageRecipe>
  )
}
