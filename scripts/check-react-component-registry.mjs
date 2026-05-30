import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const registryPath = join(repoRoot, 'src/design-system/registry/component-registry.json')
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

function fileHasNamedExport(filePath, namedExport) {
  if (!existsSync(filePath)) return false
  const text = readFileSync(filePath, 'utf8')
  const escaped = namedExport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${escaped}\\b`),
    new RegExp(`export\\s+(?:const|let|var|class)\\s+${escaped}\\b`),
    new RegExp(`export\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}`),
  ].some((pattern) => pattern.test(text))
}

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
    if (component.exportPath && !String(component.exportPath).startsWith('src/')) failures.push(`${component.id}: exportPath must start with src/`)
    const exportFile = component.exportPath ? join(repoRoot, component.exportPath) : null
    if (checkFiles && component.exportPath && !existsSync(exportFile)) failures.push(`${component.id}: exportPath does not exist: ${component.exportPath}`)
    if (checkFiles && exportFile && component.namedExport && existsSync(exportFile) && !fileHasNamedExport(exportFile, component.namedExport)) {
      failures.push(`${component.id}: namedExport ${component.namedExport} was not found in ${component.exportPath}`)
    }
    if (Array.isArray(component.stories) && component.stories.length === 0) failures.push(`${component.id}: stories must be non-empty`)
    for (const story of component.stories ?? []) {
      if (checkFiles && !existsSync(join(repoRoot, story.path))) failures.push(`${component.id}: story path does not exist: ${story.path}`)
      if (!Array.isArray(story.states) || story.states.length === 0) failures.push(`${component.id}: story ${story.path} must list covered states`)
    }
    if (Array.isArray(component.tests) && component.tests.length === 0) failures.push(`${component.id}: tests must be non-empty`)
    for (const test of component.tests ?? []) {
      if (checkFiles && !existsSync(join(repoRoot, test.path))) failures.push(`${component.id}: test path does not exist: ${test.path}`)
      if (!Array.isArray(test.behaviors) || test.behaviors.length === 0) failures.push(`${component.id}: test ${test.path} must list covered behaviors`)
    }
    if (Array.isArray(component.accessibility) && component.accessibility.length === 0) failures.push(`${component.id}: accessibility must be non-empty`)
    if (component.visualProof?.status === 'covered') {
      if (!Array.isArray(component.visualProof.references) || component.visualProof.references.length === 0) {
        failures.push(`${component.id}: covered visualProof requires at least one reference`)
      }
      for (const reference of component.visualProof.references ?? []) {
        if (checkFiles && !existsSync(join(repoRoot, reference))) failures.push(`${component.id}: visualProof reference does not exist: ${reference}`)
      }
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
