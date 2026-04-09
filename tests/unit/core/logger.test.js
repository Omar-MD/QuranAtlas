import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('core/logger.js', () => {
  let logger
  let clear
  let emit

  beforeEach(async () => {
    vi.resetModules()
    ;({ clear, emit } = await import('../../../src/core/events.js'))
    ;({ logger } = await import('../../../src/core/logger.js'))
    clear()
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.setLevel('debug')
  })

  it('records log entries with and without context and includes the action trail', () => {
    emit('reader:surah-loaded', { surah: 2, _cid: 'cid-1' })
    logger.info('Reader ready')
    logger.error('Reader failed', { reason: 'network' })

    const snapshot = logger.getLogs()

    expect(snapshot.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'info', msg: 'Reader ready' }),
        expect.objectContaining({ level: 'error', msg: 'Reader failed', ctx: { reason: 'network' } }),
      ])
    )
    expect(snapshot.trail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'reader:surah-loaded', _cid: 'cid-1' }),
      ])
    )
  })

  it('retains only the latest 50 log entries', () => {
    for (let i = 0; i < 55; i++) {
      logger.debug(`entry ${i}`)
    }

    const { logs } = logger.getLogs()
    expect(logs).toHaveLength(50)
    expect(logs[0]).toEqual(expect.objectContaining({ msg: 'entry 5' }))
    expect(logs[49]).toEqual(expect.objectContaining({ msg: 'entry 54' }))
  })

  it('returns only the requested trailing window from the ring buffer', () => {
    logger.warn('one')
    logger.warn('two')
    logger.warn('three')

    const { logs } = logger.getLogs(2)
    expect(logs).toHaveLength(2)
    expect(logs[0]).toEqual(expect.objectContaining({ msg: 'two' }))
    expect(logs[1]).toEqual(expect.objectContaining({ msg: 'three' }))
  })
})