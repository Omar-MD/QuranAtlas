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
