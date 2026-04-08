/**
 * Lightweight structured logger with in-memory ring buffer.
 *
 * Features:
 * - Structured output: each log line includes severity and a namespace prefix.
 * - Ring buffer: retains the last RING_SIZE entries in memory so they can be
 *   included in user-triggered bug reports without needing a remote sink.
 * - Configurable minimum level so debug noise can be suppressed in production.
 *
 * Usage:
 *   import { logger } from './logger.js'
 *   logger.info('Router resolved', { route: '#/s/1' })
 *   logger.error('IDB open failed', { error: err.message })
 *   const recent = logger.getLogs()  // for bug reports
 */

const RING_SIZE = 50

const LEVELS = Object.freeze({ debug: 0, info: 1, warn: 2, error: 3 })

let minLevel = LEVELS.info

/** @type {Array<{ts:number, level:string, msg:string, ctx?:unknown}>} */
const ringBuffer = []

/**
 * Append an entry to the ring buffer, evicting the oldest if full.
 * @param {string} level
 * @param {string} message
 * @param {unknown} [context]
 * @returns {{ ts: number, level: string, msg: string, ctx?: unknown }}
 */
function record(level, message, context) {
  const entry = { ts: Date.now(), level, msg: message }
  if (context !== undefined) {
    entry.ctx = context
  }
  if (ringBuffer.length >= RING_SIZE) {
    ringBuffer.shift()
  }
  ringBuffer.push(entry)
  return entry
}

/**
 * @param {string} level
 * @param {Function} consoleFn
 * @param {string} message
 * @param {unknown} [context]
 */
function log(level, consoleFn, message, context) {
  if (LEVELS[level] < minLevel) {
    return
  }
  record(level, message, context)
  const prefix = `[QuranAtlas:${level.toUpperCase()}]`
  if (context !== undefined) {
    consoleFn(prefix, message, context)
  } else {
    consoleFn(prefix, message)
  }
}

export const logger = {
  /** @param {string} msg @param {unknown} [ctx] */
  debug: (msg, ctx) => log('debug', console.debug, msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  info: (msg, ctx) => log('info', console.info, msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  warn: (msg, ctx) => log('warn', console.warn, msg, ctx),

  /** @param {string} msg @param {unknown} [ctx] */
  error: (msg, ctx) => log('error', console.error, msg, ctx),

  /**
   * Return the last `n` log entries from the ring buffer.
   * Useful for attaching recent logs to a bug report.
   * @param {number} [n] - number of entries to return (default: all buffered)
   * @returns {Array<{ts:number, level:string, msg:string, ctx?:unknown}>}
   */
  getLogs: (n = RING_SIZE) => ringBuffer.slice(-n),

  /**
   * Set the minimum log level. Messages below this level are silently dropped.
   * @param {'debug'|'info'|'warn'|'error'} level
   */
  setLevel: (level) => {
    if (LEVELS[level] !== undefined) {
      minLevel = LEVELS[level]
    }
  },
}
