const noop = () => {}
const dev = import.meta.env.DEV

export const logger = {
  debug: dev ? console.debug.bind(console, '[QA]') : noop,
  info:  dev ? console.info.bind(console, '[QA]') : noop,
  warn:  dev ? console.warn.bind(console, '[QA]') : noop,
  error: dev ? console.error.bind(console, '[QA]') : noop,
}
