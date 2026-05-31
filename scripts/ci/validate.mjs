#!/usr/bin/env node

import { buildPreviewArtifact, runPnpm, runPreviewPlaywright } from './commands.mjs'

runPnpm(['run', 'check'])
runPnpm(['run', 'test'])
buildPreviewArtifact()
runPreviewPlaywright(['--grep-invert', '@offline'])
runPreviewPlaywright(['--grep', '@offline'], { includeOffline: true })
runPnpm(['run', 'visual'], {
  env: { PLAYWRIGHT_USE_PREVIEW: '1' },
  unsetEnv: ['FORCE_COLOR'],
})
runPnpm(['run', 'build:storybook'])
runPnpm(['run', 'test:storybook'])
runPnpm(['run', 'docs:check'])
