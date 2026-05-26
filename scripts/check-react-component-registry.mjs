import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const registryPath = join(repoRoot, 'src-react/design-system/registry/component-registry.json')
const requiredComponentFields = [
  'id',
  'name',
  'maturity',
  'exportPath',
  'namedExport',
  'allowedVariants',
  'allowedSizes',
  'slots',
  'dependencies',
  'tokenNamespaces',
  'stories',
  'tests',
  'accessibility',
  'visualProof',
  'owner',
  'allowedConsumers',
  'forbiddenUses',
]

export function validateRegistryData(data, options = {}) {
  const checkFiles = options.checkFiles ?? true
  const failures = []
  if (data.schemaVersion !== 1) failures.push('schemaVersion must be 1')
  if (!Array.isArray(data.components) || data.components.length === 0) {
    failures.push('components must be a non-empty array')
    return failures
  }
  const seenIds = new Set()
  const ids = []
  data.components.forEach((component, index) => {
    for (const field of requiredComponentFields) {
      if (!(field in component)) failures.push(`components[${index}] missing required field ${field}`)
    }
    if (component.id) {
      if (seenIds.has(component.id)) failures.push(`duplicate component id ${component.id}`)
      seenIds.add(component.id)
      ids.push(component.id)
      if (!/^[a-z0-9-]+$/.test(component.id)) failures.push(`${component.id}: invalid id format`)
    }
    if (component.exportPath && !String(component.exportPath).startsWith('src-react/')) failures.push(`${component.id}: exportPath must start with src-react/`)
    if (checkFiles && component.exportPath && !existsSync(join(repoRoot, component.exportPath))) failures.push(`${component.id}: exportPath does not exist: ${component.exportPath}`)
    for (const story of component.stories ?? []) {
      if (checkFiles && !existsSync(join(repoRoot, story.path))) failures.push(`${component.id}: story path does not exist: ${story.path}`)
    }
    for (const test of component.tests ?? []) {
      if (checkFiles && !existsSync(join(repoRoot, test.path))) failures.push(`${component.id}: test path does not exist: ${test.path}`)
    }
  })
  const sortedIds = [...ids].sort()
  if (ids.join('\n') !== sortedIds.join('\n')) failures.push('components must be sorted by id')
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = validateRegistryData(JSON.parse(readFileSync(registryPath, 'utf8')))
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-component-registry: ok')
}
