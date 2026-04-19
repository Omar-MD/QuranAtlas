import { describe, it, expect, beforeEach } from 'vitest'
import { sync } from '../../../src/state/sync.svelte.ts'

describe('state/sync.svelte.ts', () => {
  beforeEach(() => {
    sync.broadcastChannel = null
  })

  it('has correct initial state', () => {
    expect(sync.broadcastChannel).toBeNull()
  })

  it('field is directly assignable', () => {
    const someMockChannel = {} as BroadcastChannel
    sync.broadcastChannel = someMockChannel
    // $state proxies the assigned object; use toStrictEqual for structural equality
    expect(sync.broadcastChannel).toStrictEqual(someMockChannel)
  })

  it('can be reset to null', () => {
    sync.broadcastChannel = {} as BroadcastChannel
    sync.broadcastChannel = null
    expect(sync.broadcastChannel).toBeNull()
  })
})
