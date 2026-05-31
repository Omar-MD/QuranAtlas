export const SEARCH_PACK_ABI_MAJOR = 1
export const SEARCH_PACK_ABI_MINOR = 0
export const SEARCH_SHARD_MAGIC = 'QAS1'
export const SEARCH_SHARD_MAGIC_BYTES = new Uint8Array([0x51, 0x41, 0x53, 0x31])
export const SEARCH_SHARD_ENDIAN_LITTLE = 0x01020304
export const SEARCH_SHARD_HEADER_LENGTH = 48
export const SEARCH_TABLE_DIRECTORY_ENTRY_LENGTH = 28

export const SEARCH_TABLE_ROLES = {
  dictionary: 1,
  postings: 2,
  positions: 3,
  references: 4,
  provenance: 5,
  tableDirectory: 6,
} as const

export const SEARCH_VALUE_WIDTHS = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  utf8: 255,
} as const

export const SEARCH_TABLE_ALIGNMENTS = [1, 2, 4, 8, 16] as const

export const SEARCH_FEATURE_IDS = {
  core: 'core',
  arabicText: 'arabic-text',
  translation: 'translation',
  context: 'context',
  phrase: 'phrase',
  morphology: 'morphology',
  followingWording: 'following-wording',
  sharedWording: 'shared-wording',
  countsPatterns: 'counts-patterns',
  provenance: 'provenance',
} as const

export type SearchFeatureId = typeof SEARCH_FEATURE_IDS[keyof typeof SEARCH_FEATURE_IDS]
export type SearchShardSchemaId = `search-shard-${SearchFeatureId}-v${number}`
export type SearchChecksumScope = 'encoded-bytes' | 'decoded-bytes'
export type SearchTableRoleId = typeof SEARCH_TABLE_ROLES[keyof typeof SEARCH_TABLE_ROLES]
export type SearchValueWidthId = typeof SEARCH_VALUE_WIDTHS[keyof typeof SEARCH_VALUE_WIDTHS]
export type SearchTableAlignment = typeof SEARCH_TABLE_ALIGNMENTS[number]

export interface SearchByteBudget {
  maxShardBytes: number
  maxDecodedShardBytes: number
  maxResidentWorkerBytes: number
}

export interface SearchShardHeader {
  magic: typeof SEARCH_SHARD_MAGIC
  abiMajor: number
  abiMinor: number
  endianMarker: number
  schemaId: number
  featureId: number
  headerLength: number
  tableDirectoryOffset: number
  tableCount: number
  bodyLength: number
  fixtureId: number
}

export interface SearchShardTableDirectoryEntry {
  role: SearchTableRoleId
  offset: number
  byteLength: number
  itemCount: number
  valueWidth: SearchValueWidthId
  alignment: SearchTableAlignment
  checksumScope: SearchChecksumScope
}

export class SearchAbiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SearchAbiError'
  }
}

export function assertSupportedSearchPackAbi(abiMajor: number, abiMinor: number): void {
  if (abiMajor !== SEARCH_PACK_ABI_MAJOR) {
    throw new SearchAbiError(`unsupported Search pack ABI major ${abiMajor}`)
  }
  if (abiMinor > SEARCH_PACK_ABI_MINOR) {
    throw new SearchAbiError(`unsupported Search pack ABI minor ${abiMinor}`)
  }
}

export function assertSearchShardMagic(bytes: Uint8Array): void {
  for (let index = 0; index < SEARCH_SHARD_MAGIC_BYTES.length; index += 1) {
    if (bytes[index] !== SEARCH_SHARD_MAGIC_BYTES[index]) {
      throw new SearchAbiError('invalid Search shard magic')
    }
  }
}

export function assertSearchEndianMarker(endianMarker: number): void {
  if (endianMarker !== SEARCH_SHARD_ENDIAN_LITTLE) {
    throw new SearchAbiError(`unsupported Search shard endian marker ${endianMarker}`)
  }
}

export function readSearchShardHeaderWithDataView(bytes: ArrayBuffer | Uint8Array): SearchShardHeader {
  const viewBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (viewBytes.byteLength < SEARCH_SHARD_HEADER_LENGTH) {
    throw new SearchAbiError('Search shard header is truncated')
  }
  assertSearchShardMagic(viewBytes)

  const view = new DataView(viewBytes.buffer, viewBytes.byteOffset, viewBytes.byteLength)
  const header: SearchShardHeader = {
    magic: SEARCH_SHARD_MAGIC,
    abiMajor: view.getUint16(4, true),
    abiMinor: view.getUint16(6, true),
    endianMarker: view.getUint32(8, true),
    schemaId: view.getUint16(12, true),
    featureId: view.getUint16(14, true),
    headerLength: view.getUint32(16, true),
    tableDirectoryOffset: view.getUint32(20, true),
    tableCount: view.getUint32(24, true),
    bodyLength: view.getUint32(28, true),
    fixtureId: view.getUint32(32, true),
  }

  assertSupportedSearchPackAbi(header.abiMajor, header.abiMinor)
  assertSearchEndianMarker(header.endianMarker)
  if (header.headerLength < SEARCH_SHARD_HEADER_LENGTH) {
    throw new SearchAbiError('Search shard header length is too small')
  }
  if (header.tableDirectoryOffset < header.headerLength) {
    throw new SearchAbiError('Search shard table directory overlaps header')
  }
  return header
}

export function assertSearchTableDirectoryEntry(entry: SearchShardTableDirectoryEntry): void {
  if (!Object.values(SEARCH_TABLE_ROLES).includes(entry.role)) {
    throw new SearchAbiError(`unsupported Search table role ${entry.role}`)
  }
  if (!Object.values(SEARCH_VALUE_WIDTHS).includes(entry.valueWidth)) {
    throw new SearchAbiError(`unsupported Search value width ${entry.valueWidth}`)
  }
  if (!SEARCH_TABLE_ALIGNMENTS.includes(entry.alignment)) {
    throw new SearchAbiError(`unsupported Search table alignment ${entry.alignment}`)
  }
  if (entry.offset % entry.alignment !== 0) {
    throw new SearchAbiError(`Search table offset ${entry.offset} is not ${entry.alignment}-byte aligned`)
  }
  if (entry.byteLength < 0 || entry.itemCount < 0) {
    throw new SearchAbiError('Search table directory entry has negative size fields')
  }
  if (entry.checksumScope !== 'encoded-bytes' && entry.checksumScope !== 'decoded-bytes') {
    throw new SearchAbiError(`unsupported Search checksum scope ${entry.checksumScope}`)
  }
}
