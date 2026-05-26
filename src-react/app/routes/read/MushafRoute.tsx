import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'

export function MushafRoute({ assetState = 'ready', page }: { assetState?: ReaderAssetState; page: number }) {
  return (
    <ReaderPageShell label={`Page ${page}`} mode="mushaf">
      <ReaderAssetGate label="Qalun" state={assetState}>
        <MushafPageViewer page={page} />
      </ReaderAssetGate>
    </ReaderPageShell>
  )
}
