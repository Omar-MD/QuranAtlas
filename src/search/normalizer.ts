import {
  normalizeSearchInput,
  tokenizeSearchInput,
  type SearchNormalizationMode,
} from '../../shared/search'

export type { SearchNormalizationMode }

export function normalizeSearchText(input: string, mode: SearchNormalizationMode = 'normalized'): string {
  return normalizeSearchInput(input, mode)
}

export function tokenizeSearchText(input: string, mode: SearchNormalizationMode = 'normalized'): string[] {
  return tokenizeSearchInput(input, mode)
}

export function hasArabicScript(input: string): boolean {
  return /\p{Script=Arabic}/u.test(input)
}
