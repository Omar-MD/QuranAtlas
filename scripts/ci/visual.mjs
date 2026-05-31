#!/usr/bin/env node

import { runPnpm } from './commands.mjs'

const args = process.argv.slice(2).filter((arg) => arg !== '--')

runPnpm(['exec', 'playwright', 'test', '--config', 'playwright.visual.config.js', ...args], {
  unsetEnv: ['NO_COLOR'],
})
