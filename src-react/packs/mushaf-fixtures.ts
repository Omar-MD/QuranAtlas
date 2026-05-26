import type { MushafAssetIndexEntry } from './mushaf-index'
import { mushafManifestUrl } from './mushaf-paths'

export const qaloonMushafFixture: MushafAssetIndexEntry = {
  packId: 'mushaf-pages:qaloon:qalun-quran-ws-v1',
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  label: 'Qalun quran.ws pages',
  manifestUrl: mushafManifestUrl({ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1' }),
  pageCount: 604,
  totalBytes: 0,
  version: 'v1',
  provenance: 'test-fixture',
  pageUrlTemplate: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/{page}.svg',
  deliveryMode: 'on-demand-pack',
  availability: 'available',
}
