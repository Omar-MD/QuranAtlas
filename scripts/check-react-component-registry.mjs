import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

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

function sourceFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...sourceFiles(path))
    else if (['.ts', '.tsx'].includes(extname(entry.name))) files.push(path)
  }
  return files
}

function matchesPattern(path, pattern) {
  const expression = pattern
    .split('**').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
    .replace(/\\\*/g, '[^/]*')
  return new RegExp(`^${expression}$`).test(path)
}

function resolveImportPath(sourcePath, specifier) {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`
  if (!specifier.startsWith('.')) return null
  const source = relative(repoRoot, sourcePath).replace(/\\/g, '/')
  const directory = source.slice(0, source.lastIndexOf('/'))
  return join(directory, specifier).replace(/\\/g, '/')
}

function checkConsumerBoundary(component, files, failures) {
  const consumers = component.allowedConsumers
  if (!Array.isArray(consumers) || consumers.length === 0) return
  for (const consumer of consumers) {
    if (typeof consumer !== 'string' || !consumer.startsWith('src/')) {
      failures.push(`${component.id}: allowedConsumers must contain only src/ patterns`)
    }
  }

  const target = component.exportPath.replace(/\.(?:ts|tsx)$/, '')
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"{}]+\s+from\s+)?['"]([^'"]+)['"]/g
  for (const file of files) {
    const consumerPath = relative(repoRoot, file).replace(/\\/g, '/')
    if (consumerPath === component.exportPath) continue
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(importPattern)) {
      const importedPath = resolveImportPath(file, match[1])?.replace(/\.(?:ts|tsx)$/, '')
      if (importedPath !== target) continue
      if (!consumers.some((pattern) => matchesPattern(consumerPath, pattern))) {
        failures.push(`${component.id}: consumer ${consumerPath} is outside allowedConsumers`)
      }
    }
  }
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
  const files = checkFiles && existsSync(join(repoRoot, 'src')) ? sourceFiles(join(repoRoot, 'src')) : []
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

    if (component.exportPath && !String(component.exportPath).startsWith('src/')) {
      failures.push(`${component.id}: exportPath must start with src/`)
    }
    const exportFile = component.exportPath ? join(repoRoot, component.exportPath) : null
    if (checkFiles && component.exportPath && !existsSync(exportFile)) {
      failures.push(`${component.id}: exportPath does not exist: ${component.exportPath}`)
    }
    if (checkFiles && exportFile && component.namedExport && existsSync(exportFile) && !fileHasNamedExport(exportFile, component.namedExport)) {
      failures.push(`${component.id}: namedExport ${component.namedExport} was not found in ${component.exportPath}`)
    }

    if (!component.owner || typeof component.owner !== 'object') {
      failures.push(`${component.id}: owner must be an object`)
    } else {
      if (typeof component.owner.surface !== 'string' || component.owner.surface.length === 0) {
        failures.push(`${component.id}: owner.surface must be a non-empty string`)
      }
      if (typeof component.owner.package !== 'string' || !component.owner.package.startsWith('src/')) {
        failures.push(`${component.id}: owner.package must start with src/`)
      } else {
        if (!component.exportPath?.startsWith(`${component.owner.package}/`)) {
          failures.push(`${component.id}: exportPath must be owned by ${component.owner.package}`)
        }
        if (checkFiles && !existsSync(join(repoRoot, component.owner.package))) {
          failures.push(`${component.id}: owner package does not exist: ${component.owner.package}`)
        }
      }
    }
    checkConsumerBoundary(component, files, failures)

    if (!Array.isArray(component.stories) || component.stories.length === 0) failures.push(`${component.id}: stories must be non-empty`)
    for (const story of component.stories ?? []) {
      if (typeof story?.path !== 'string') failures.push(`${component.id}: story path must be a string`)
      if (!Array.isArray(story?.states) || story.states.length === 0) failures.push(`${component.id}: story ${story?.path ?? '(unknown)'} must list covered states`)
    }
    if (!Array.isArray(component.tests) || component.tests.length === 0) failures.push(`${component.id}: tests must be non-empty`)
    for (const test of component.tests ?? []) {
      if (typeof test?.path !== 'string') failures.push(`${component.id}: test path must be a string`)
      if (!Array.isArray(test?.behaviors) || test.behaviors.length === 0) failures.push(`${component.id}: test ${test?.path ?? '(unknown)'} must list covered behaviors`)
    }
    if (!Array.isArray(component.accessibility) || component.accessibility.length === 0) failures.push(`${component.id}: accessibility must be non-empty`)
    if (!component.visualProof || typeof component.visualProof !== 'object') failures.push(`${component.id}: visualProof must be an object`)
    if (!Array.isArray(component.allowedConsumers) || component.allowedConsumers.length === 0) failures.push(`${component.id}: allowedConsumers must be non-empty`)
    if (!Array.isArray(component.forbiddenUses) || component.forbiddenUses.length === 0) failures.push(`${component.id}: forbiddenUses must be non-empty`)
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
