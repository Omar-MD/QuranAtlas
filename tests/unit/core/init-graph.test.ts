import { describe, it, expect, beforeEach } from 'vitest'
import { register, boot, reset } from '../../../src/core/init-graph'

describe('core/init-graph', () => {
  beforeEach(() => {
    reset()
  })

  it('runs nodes in topological order — linear chain', async () => {
    const order: string[] = []
    register({ name: 'a', init: () => { order.push('a') } })
    register({ name: 'b', deps: ['a'], init: () => { order.push('b') } })
    register({ name: 'c', deps: ['b'], init: () => { order.push('c') } })

    await boot()

    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('runs nodes in topological order — diamond', async () => {
    const order: string[] = []
    register({ name: 'root', init: () => { order.push('root') } })
    register({ name: 'left', deps: ['root'], init: () => { order.push('left') } })
    register({ name: 'right', deps: ['root'], init: () => { order.push('right') } })
    register({ name: 'tail', deps: ['left', 'right'], init: () => { order.push('tail') } })

    await boot()

    expect(order[0]).toBe('root')
    expect(order[3]).toBe('tail')
    expect(order.slice(1, 3).sort()).toEqual(['left', 'right'])
  })

  it('handles registration in arbitrary order — sort happens at boot()', async () => {
    const order: string[] = []
    register({ name: 'tail', deps: ['mid'], init: () => { order.push('tail') } })
    register({ name: 'mid', deps: ['head'], init: () => { order.push('mid') } })
    register({ name: 'head', init: () => { order.push('head') } })

    await boot()

    expect(order).toEqual(['head', 'mid', 'tail'])
  })

  it('awaits async init functions sequentially within order constraints', async () => {
    const events: string[] = []
    register({
      name: 'a',
      init: async () => {
        events.push('a-start')
        await new Promise((r) => setTimeout(r, 5))
        events.push('a-end')
      },
    })
    register({
      name: 'b',
      deps: ['a'],
      init: () => { events.push('b') },
    })

    await boot()

    expect(events).toEqual(['a-start', 'a-end', 'b'])
  })

  it('returns cleanup functions in reverse-topological order', async () => {
    const calls: string[] = []
    register({ name: 'a', init: () => () => { calls.push('cleanup-a') } })
    register({ name: 'b', deps: ['a'], init: () => () => { calls.push('cleanup-b') } })
    register({ name: 'c', deps: ['b'], init: () => () => { calls.push('cleanup-c') } })

    const cleanups = await boot()

    // Run them in the order returned (caller pushes them onto a stack).
    for (const fn of cleanups) fn()
    expect(calls).toEqual(['cleanup-c', 'cleanup-b', 'cleanup-a'])
  })

  it('throws when a dep is not registered', async () => {
    register({ name: 'b', deps: ['a'], init: () => {} })
    await expect(boot()).rejects.toThrow(/depends on 'a'/)
  })

  it('throws on a duplicate node name', () => {
    register({ name: 'x', init: () => {} })
    expect(() => register({ name: 'x', init: () => {} })).toThrow(/duplicate node 'x'/)
  })

  it('throws on a dependency cycle', async () => {
    register({ name: 'a', deps: ['b'], init: () => {} })
    register({ name: 'b', deps: ['a'], init: () => {} })
    await expect(boot()).rejects.toThrow(/cycle detected/)
  })

  it('skips cleanup for nodes whose init returns void', async () => {
    register({ name: 'a', init: () => {} })
    register({ name: 'b', deps: ['a'], init: () => () => {} })

    const cleanups = await boot()

    expect(cleanups).toHaveLength(1)
  })
})
