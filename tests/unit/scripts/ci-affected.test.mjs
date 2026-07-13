import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

import { detectAffected, selectMushafCiPolicy } from '../../../scripts/ci/affected.mjs'

describe('affected-change gates', () => {
  it('treats every Search dataset lane as dataset and full-dataset relevant without forcing Mushaf page rebuilds', () => {
    for (const file of [
      'scripts/data/search/graph/build.mjs',
      'scripts/data/search/build.mjs',
      'shared/search/manifest.ts',
      'public/search-packs/registry.json',
      'public/search-packs/packs/abc123abc123/shards/following-wording-1.qas',
      'data/catalog/search-sources.json',
      'data/normalized/search/qac/quranic-corpus-morphology-0.4.txt',
    ]) {
      expect(detectAffected([file])).toMatchObject({
        dataset_relevant: true,
        full_dataset_relevant: true,
        mushaf_pages_relevant: false,
      })
    }
  })

  it('keeps Mushaf page triggers scoped to Mushaf page data', () => {
    expect(detectAffected(['data/normalized/mushaf-pages/qaloon/pages/001.svg'])).toMatchObject({
      dataset_relevant: true,
      full_dataset_relevant: true,
      mushaf_pages_relevant: true,
    })
  })

  it('selects Mushaf page data lanes for private edition contracts and importers', () => {
    for (const file of [
      'data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json',
      'scripts/data/mushaf-pages/private-pdf.mjs',
    ]) {
      expect(detectAffected([file])).toMatchObject({
        dataset_relevant: true,
        mushaf_pages_relevant: true,
      })
    }
  })

  it.each([
    ['push', 'dev', { mushaf_profile: 'private', private_mushaf: true }],
    ['pull_request', 'dev', { mushaf_profile: 'baseline', private_mushaf: false }],
    ['push', 'staging', { mushaf_profile: 'baseline', private_mushaf: false }],
    ['push', 'main', { mushaf_profile: 'baseline', private_mushaf: false }],
  ])('selects the branch Mushaf policy for %s on %s', (eventName, refName, expected) => {
    expect(selectMushafCiPolicy({ eventName, refName })).toEqual(expected)
  })

  it('prebuilds the private profile before ci:build and enables private E2E only through the trusted policy', async () => {
    const workflow = await readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8')
    const cachedReleaseCheck = workflow.indexOf('pnpm run data -- mushaf-pages restore-release --check')
    const privateBuild = workflow.indexOf('pnpm run data -- mushaf-pages build --profile="${{ needs.changes.outputs.mushaf_profile }}"')
    const productionBuild = workflow.indexOf('pnpm run ci:build')
    const finalPrivateCheck = workflow.lastIndexOf('pnpm run data -- mushaf-pages build --profile="${{ needs.changes.outputs.mushaf_profile }}" --check')
    const artifactUpload = workflow.indexOf('name: Upload dist artifact')
    expect(cachedReleaseCheck).toBeGreaterThan(-1)
    expect(privateBuild).toBeGreaterThan(cachedReleaseCheck)
    expect(privateBuild).toBeGreaterThan(-1)
    expect(productionBuild).toBeGreaterThan(privateBuild)
    expect(finalPrivateCheck).toBeGreaterThan(productionBuild)
    expect(artifactUpload).toBeGreaterThan(finalPrivateCheck)
    expect(workflow).toContain('QURANATLAS_DATASET_PROFILE: ${{ needs.changes.outputs.mushaf_profile }}')
    expect(workflow).toContain("QURANATLAS_PRIVATE_MUSHAF: ${{ needs.changes.outputs.private_mushaf == 'true' && '1' || '0' }}")
    expect(workflow).toContain('key: ${{ steps.private-distribution.outputs.archive_sha256 }}')
    const privateCacheStep = workflow.match(/- name: Cache private Mushaf normalized edition[\s\S]*?(?=\n\s+- name:)/)?.[0]
    expect(privateCacheStep).toBeTruthy()
    expect(privateCacheStep).not.toContain('restore-keys:')
    expect(workflow).toContain('compression-level: 0')
  })
})
