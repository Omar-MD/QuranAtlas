import { vi } from 'vitest'

vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 2, counts: { hafs: 286, warsh: 286, qaloon: 286 } },
    { n: 4, counts: { hafs: 176, warsh: 176, qaloon: 176 } },
  ])),
}))

import { describe, expect, it } from 'vitest'

import {
  resolveLaunchableTarget,
  resolveReaderTarget,
} from '../../../src/continuity/launch-targets'

const removedHubHash = ['#/re', 'view'].join('')
const removedTopicHash = ['#/thr', 'eads/foo'].join('')
const removedEntityHash = ['#/pe', 'ople/Moses'].join('')

describe('continuity/launch-targets', () => {
  it('preserves valid launchable reader and static routes', async () => {
    await expect(resolveLaunchableTarget('#/s/2/255', 'qaloon')).resolves.toBe('#/s/2/255')
    await expect(resolveLaunchableTarget('#/m/604', 'qaloon')).resolves.toBe('#/m/604')
    await expect(resolveLaunchableTarget('#/surahs', 'qaloon')).resolves.toBe('#/surahs')
    await expect(resolveLaunchableTarget('#/bookmarks', 'qaloon')).resolves.toBe('#/bookmarks')
    await expect(resolveLaunchableTarget('#/about', 'qaloon')).resolves.toBe('#/about')
  })

  it('rejects removed, polluted, and malformed launch targets', async () => {
    await expect(resolveLaunchableTarget(removedHubHash, 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget(removedTopicHash, 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/surahs?x=1', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/settings', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/settings/extra', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/assets', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/assets/extra', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/s/2/+1', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/s/2/1.5', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/m/0', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget(removedEntityHash, 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/s/2%2F255', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/about#extra', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/%3Cscript%3E', 'qaloon')).resolves.toBeNull()
    await expect(resolveLaunchableTarget('#/javascript:alert(1)', 'qaloon')).resolves.toBeNull()
  })

  it('reader-only targets exclude non-reader launchable hashes', async () => {
    await expect(resolveReaderTarget('#/about', 'qaloon')).resolves.toBeNull()
    await expect(resolveReaderTarget('#/bookmarks', 'qaloon')).resolves.toBeNull()
    await expect(resolveReaderTarget('#/surahs', 'qaloon')).resolves.toBeNull()
    await expect(resolveReaderTarget('#/s/4/17', 'qaloon')).resolves.toBe('#/s/4/17')
  })
})
