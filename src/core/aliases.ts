import aliasesData from '../data/aliases.json'

interface AliasEntry {
  canonical: string
  forms: string[]
}

interface AliasesFile {
  version: number
  aliases: AliasEntry[]
  excludeFromAliasing: string[]
}

const data = aliasesData as AliasesFile

let aliasMap: Map<string, string> | null = null
let protectedSet: Set<string> | null = null

export function buildAliasMap(): Map<string, string> {
  if (aliasMap) { return aliasMap }
  aliasMap = new Map()
  for (const entry of data.aliases) {
    for (const form of entry.forms) {
      aliasMap.set(form, entry.canonical)
    }
  }

  // Assert no protected terms appear as alias forms (prevent silent breakage)
  const protectedForms = new Set(data.excludeFromAliasing)
  for (const [form, canonical] of aliasMap) {
    if (protectedForms.has(form)) {
      throw new Error(`Alias form "${form}" → "${canonical}" conflicts with excludeFromAliasing. Protected terms must not appear as alias forms.`)
    }
  }

  return aliasMap
}

export function resolveCanonical(normalized: string): string {
  const map = buildAliasMap()
  return map.get(normalized) ?? normalized
}

export function isProtectedFromAliasing(normalized: string): boolean {
  if (!protectedSet) {
    protectedSet = new Set(data.excludeFromAliasing)
  }
  return protectedSet.has(normalized)
}
