/**
 * Structured logger backed by loglevel with an in-memory ring buffer.
 *
 * Features:
 * - loglevel handles level filtering, localStorage persistence, and console delegation.
 * - Ring buffer: retains the last RING_SIZE entries so they can be included in
 *   user-triggered bug reports without needing a remote sink.
 * - Configurable minimum level via setLevel().
 *
 * Usage:
 *   import { logger } from './logger.js'
 *   logger.info('Router resolved', { route: '#/s/1' })
 *   logger.error('IDB open failed', { error: err.message })
 *   const recent = logger.getLogs()  // for bug reports
 */

import log from 'loglevel'
import { getActionTrail } from './events.js'

const RING_SIZE = 50

/** @type {Array<{ts:number, level:string, msg:string, ctx?:unknown}>} */
const ringBuffer = []

const _logger = log.getLogger('QuranAtlas')

// Plugin: intercept all log calls to maintain the ring buffer
const _originalFactory = _logger.methodFactory
_logger.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = _originalFactory(methodName, logLevel, loggerName)
  return function (message, context) {
    const entry = { ts: Date.now(), level: methodName, msg: String(message) }
    if (context !== undefined) {
      entry.ctx = context
    }
    if (ringBuffer.length >= RING_SIZE) {
      ringBuffer.shift()
    }
    ringBuffer.push(entry)
    const prefix = `[QuranAtlas:${methodName.toUpperCase()}]`
    if (context !== undefined) {
      rawMethod(prefix, message, context)
    } else {
      rawMethod(prefix, message)
    }
  }
}

// Apply the plugin and set initial level based on build mode
_logger.setLevel(import.meta.env?.DEV ? 'debug' : 'warn')

export const logger = {
  /** @param {string} msg @param {unknown} [ctx] */
  debug: (msg, ctx) => _logger.debug(msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  info: (msg, ctx) => _logger.info(msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  warn: (msg, ctx) => _logger.warn(msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  error: (msg, ctx) => _logger.error(msg, ctx),

  /**
   * Return the last `n` log entries merged with the action trail for unified
   * bug report export.
   * @param {number} [n] - number of entries to return (default: all buffered)
   * @returns {{ logs: Array<{ts:number, level:string, msg:string, ctx?:unknown}>, trail: Array<{type:string, ts:number, _cid?:string}> }}
   */
  getLogs: (n = RING_SIZE) => ({
    logs: ringBuffer.slice(-n),
    trail: getActionTrail(n),
  }),

  /**
   * Set the minimum log level.
   * @param {'trace'|'debug'|'info'|'warn'|'error'|'silent'} level
   */
  setLevel: (level) => _logger.setLevel(level),
}
