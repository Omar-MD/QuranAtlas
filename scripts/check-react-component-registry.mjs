import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const repoRoot = process.cwd()
const registryPath = join(repoRoot, 'src/design-system/registry/component-registry.json')
const schemaPath = join(repoRoot, 'src/design-system/registry/component-registry.schema.json')
const packageJsonPath = join(repoRoot, 'package.json')

// The registry schema is the single source of truth for the vocabulary the
// checker enforces; nothing here keeps a second copy that can drift.
const UI_MODULE_DIR = 'src/components/ui'
const UI_BARREL_PATH = `${UI_MODULE_DIR}/index.ts`
const RECIPES_MODULE_DIR = 'src/design-system/recipes'
const scanRoots = [UI_MODULE_DIR, RECIPES_MODULE_DIR]

let schemaContract = null
function getSchemaContract() {
  if (!schemaContract) {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
    const component = schema.$defs.component
    schemaContract = {
      root: schema,
      requiredDependencyKeys: component.properties.dependencies.required,
    }
  }
  return schemaContract
}

function valueMatchesSchemaType(value, type) {
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (type === 'string') return typeof value === 'string'
  return true
}

function resolveSchemaRef(root, ref) {
  if (!ref.startsWith('#/')) return null
  let node = root
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')]
    if (node === undefined || node === null) return null
  }
  return node
}

// Enforces the schema subset the registry document uses: type, const, enum,
// required, additionalProperties:false, items, minItems, and in-document $ref.
// Vocabulary and structure are read from the schema file at runtime; anything
// beyond this subset stays a bespoke check in validateRegistryData.
function validateAgainstSchema(value, subschema, root, label, failures) {
  if (!subschema || typeof subschema !== 'object') return
  if (subschema.$ref) {
    const resolved = resolveSchemaRef(root, subschema.$ref)
    if (resolved) validateAgainstSchema(value, resolved, root, label, failures)
    return
  }
  if (subschema.const !== undefined && value !== subschema.const) {
    failures.push(`${label} must equal ${JSON.stringify(subschema.const)}`)
    return
  }
  if (subschema.enum && !subschema.enum.includes(value)) {
    failures.push(`${label} must be one of ${subschema.enum.join(', ')}`)
    return
  }
  if (typeof subschema.type === 'string' && !valueMatchesSchemaType(value, subschema.type)) {
    failures.push(`${label} must be of type ${subschema.type}`)
    return
  }
  if (subschema.type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of subschema.required ?? []) {
      if (!(key in value)) failures.push(`${label} missing required key ${key}`)
    }
    if (subschema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (subschema.properties ?? {}))) failures.push(`${label} has unknown key ${key}`)
      }
    }
    for (const [key, propertySchema] of Object.entries(subschema.properties ?? {})) {
      if (key in value) validateAgainstSchema(value[key], propertySchema, root, `${label}.${key}`, failures)
    }
  }
  if (subschema.type === 'array' && Array.isArray(value)) {
    if (subschema.minItems !== undefined && value.length < subschema.minItems) {
      failures.push(`${label} must have at least ${subschema.minItems} item(s)`)
    }
    if (subschema.items) {
      value.forEach((item, itemIndex) => {
        validateAgainstSchema(item, subschema.items, root, `${label}[${itemIndex}]`, failures)
      })
    }
  }
}

let declaredPackages = null
function getDeclaredPackages() {
  if (!declaredPackages) {
    if (!existsSync(packageJsonPath)) return null
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    declaredPackages = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ])
  }
  return declaredPackages
}

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
    else if (['.ts', '.tsx'].includes(extname(path))) files.push(path)
  }
  return files
}

function matchesPattern(path, pattern) {
  const expression = pattern
    .split('**')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
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

function toPosix(path) {
  return path.replace(/\\/g, '/')
}

function stripExtension(path) {
  return path.replace(/\.(?:ts|tsx)$/, '')
}

function parseNamedList(fragment) {
  const names = []
  for (const part of fragment.split(',')) {
    const trimmed = part.trim()
    if (!trimmed || /^type\s/.test(trimmed)) continue
    const match = trimmed.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
    if (match) names.push({ source: match[1], alias: match[2] ?? match[1] })
  }
  return names
}

function collectRuntimeExports(text) {
  const names = new Set()
  for (const match of text.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|var|class)\s+([\w$]+)/g)) {
    names.add(match[1])
  }
  for (const match of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const { source } of parseNamedList(match[1])) names.add(source)
  }
  return names
}

const namedImportPattern = /(?:\bimport|\bexport)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
const barrelReexportPattern = /\bexport\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g

function buildModuleGraph(files) {
  const importsByTarget = new Map()
  const runtimeExportsByFile = new Map()
  for (const file of files) {
    const importer = toPosix(relative(repoRoot, file))
    const text = readFileSync(file, 'utf8')
    runtimeExportsByFile.set(stripExtension(importer), collectRuntimeExports(text))
    for (const match of text.matchAll(namedImportPattern)) {
      const resolved = resolveImportPath(file, match[2])
      if (!resolved) continue
      const target = toPosix(stripExtension(resolved))
      if (!importsByTarget.has(target)) importsByTarget.set(target, [])
      importsByTarget.get(target).push({
        importer,
        names: parseNamedList(match[1]).map(({ source }) => source),
      })
    }
  }
  return { importsByTarget, runtimeExportsByFile }
}

function collectBarrelExports() {
  const barrelFile = join(repoRoot, UI_BARREL_PATH)
  if (!existsSync(barrelFile)) return new Map()
  const exportsByOrigin = new Map()
  for (const match of readFileSync(barrelFile, 'utf8').matchAll(barrelReexportPattern)) {
    const resolved = resolveImportPath(barrelFile, match[2])
    if (!resolved) continue
    const origin = toPosix(stripExtension(resolved))
    if (!exportsByOrigin.has(origin)) exportsByOrigin.set(origin, new Set())
    const names = exportsByOrigin.get(origin)
    for (const { alias } of parseNamedList(match[1])) names.add(alias)
  }
  return exportsByOrigin
}

function checkDependencies(component, failures) {
  const dependencies = component.dependencies
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) return
  const packages = getDeclaredPackages()
  if (!packages) return
  const schema = getSchemaContract()
  for (const key of schema.requiredDependencyKeys) {
    for (const name of dependencies[key] ?? []) {
      if (!packages.has(name)) {
        failures.push(`${component.id}: dependency ${name} is not declared in package.json`)
      }
    }
  }
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

function checkReverseCoverage(components, files, failures) {
  const ownerCounts = new Map()
  for (const component of components) {
    if (typeof component.exportPath !== 'string' || typeof component.namedExport !== 'string') continue
    const owner = `${stripExtension(component.exportPath)}::${component.namedExport}`
    ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1)
  }

  const scanned = files.filter((file) => {
    const path = toPosix(relative(repoRoot, file))
    if (!scanRoots.some((root) => path.startsWith(`${root}/`))) return false
    if (!/\.tsx?$/.test(path)) return false
    if (/\.stories\.tsx?$/.test(path)) return false
    return path !== UI_BARREL_PATH
  })
  if (scanned.length === 0) return

  const { importsByTarget, runtimeExportsByFile } = buildModuleGraph(files)
  const barrelExports = collectBarrelExports()

  for (const file of scanned) {
    const path = toPosix(relative(repoRoot, file))
    const moduleKey = stripExtension(path)
    const isRecipeModule = path.startsWith(`${RECIPES_MODULE_DIR}/`)
    const moduleDir = isRecipeModule ? RECIPES_MODULE_DIR : UI_MODULE_DIR
    for (const name of runtimeExportsByFile.get(moduleKey) ?? []) {
      const isBarrelPublic = barrelExports.get(moduleKey)?.has(name) ?? false
      if (!isRecipeModule && !isBarrelPublic) {
        const importedOutsideModule = (importsByTarget.get(moduleKey) ?? []).some(
          (entry) => entry.names.includes(name) && !entry.importer.startsWith(`${moduleDir}/`),
        )
        if (!importedOutsideModule) continue
      }
      const owners = ownerCounts.get(`${moduleKey}::${name}`) ?? 0
      if (owners === 0) failures.push(`unregistered public export ${name} in ${path}`)
      else if (owners > 1) failures.push(`export ${name} in ${path} has ${owners} registry owners`)
    }
  }
}

export function validateRegistryData(data, options = {}) {
  const checkFiles = options.checkFiles ?? true
  const failures = []
  const schema = getSchemaContract()
  validateAgainstSchema(data, schema.root, schema.root, 'registry', failures)
  if (!Array.isArray(data.components) || data.components.length === 0) {
    failures.push('components must be a non-empty array')
    return failures
  }

  const seenIds = new Set()
  const ids = []
  const files = checkFiles && existsSync(join(repoRoot, 'src')) ? sourceFiles(join(repoRoot, 'src')) : []
  data.components.forEach((component) => {
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
    if (
      checkFiles &&
      exportFile &&
      component.namedExport &&
      existsSync(exportFile) &&
      !fileHasNamedExport(exportFile, component.namedExport)
    ) {
      failures.push(`${component.id}: namedExport ${component.namedExport} was not found in ${component.exportPath}`)
    }

    if (component.dependencies !== undefined) checkDependencies(component, failures)

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

    for (const story of component.stories ?? []) {
      if (checkFiles && typeof story?.path === 'string' && !existsSync(join(repoRoot, story.path))) {
        failures.push(`${component.id}: story path does not exist: ${story.path}`)
      }
    }
    for (const test of component.tests ?? []) {
      if (checkFiles && typeof test?.path === 'string' && !existsSync(join(repoRoot, test.path))) {
        failures.push(`${component.id}: test path does not exist: ${test.path}`)
      }
    }
  })

  const idSet = new Set(ids)
  for (const component of data.components) {
    for (const dependencyId of component.dependencies?.components ?? []) {
      if (dependencyId === component.id) {
        failures.push(`${component.id}: dependencies.components must not reference itself`)
      } else if (!idSet.has(dependencyId)) {
        failures.push(`${component.id}: dependencies.components references unknown component ${dependencyId}`)
      }
    }
  }

  if (checkFiles) checkReverseCoverage(data.components, files, failures)

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
