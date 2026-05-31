import { createHash } from 'node:crypto'

export const SEARCH_PACK_ABI_MAJOR = 1
export const SEARCH_PACK_ABI_MINOR = 0
export const SEARCH_SHARD_MAGIC_BYTES = [0x51, 0x41, 0x53, 0x31]
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
}

export const SEARCH_VALUE_WIDTHS = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  utf8: 255,
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function stableJson(value) {
  return JSON.stringify(sortJson(value))
}

export function writeJsonShard({
  schemaOrdinal = 1,
  featureOrdinal = 1,
  fixtureId = 1,
  role = SEARCH_TABLE_ROLES.provenance,
  payload,
}) {
  const body = Buffer.from(stableJson(payload), 'utf8')
  const headerLength = SEARCH_SHARD_HEADER_LENGTH
  const tableDirectoryOffset = headerLength
  const tableCount = 1
  const directoryLength = SEARCH_TABLE_DIRECTORY_ENTRY_LENGTH * tableCount
  const bytes = Buffer.alloc(headerLength + directoryLength + body.byteLength)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  bytes.set(SEARCH_SHARD_MAGIC_BYTES, 0)
  view.setUint16(4, SEARCH_PACK_ABI_MAJOR, true)
  view.setUint16(6, SEARCH_PACK_ABI_MINOR, true)
  view.setUint32(8, SEARCH_SHARD_ENDIAN_LITTLE, true)
  view.setUint16(12, schemaOrdinal, true)
  view.setUint16(14, featureOrdinal, true)
  view.setUint32(16, headerLength, true)
  view.setUint32(20, tableDirectoryOffset, true)
  view.setUint32(24, tableCount, true)
  view.setUint32(28, body.byteLength, true)
  view.setUint32(32, fixtureId, true)

  const bodyOffset = headerLength + directoryLength
  view.setUint16(tableDirectoryOffset, role, true)
  view.setUint32(tableDirectoryOffset + 4, bodyOffset, true)
  view.setUint32(tableDirectoryOffset + 8, body.byteLength, true)
  view.setUint32(tableDirectoryOffset + 12, Array.isArray(payload) ? payload.length : Object.keys(payload).length, true)
  view.setUint16(tableDirectoryOffset + 16, SEARCH_VALUE_WIDTHS.utf8, true)
  view.setUint16(tableDirectoryOffset + 18, 4, true)
  view.setUint8(tableDirectoryOffset + 20, 1)

  body.copy(bytes, bodyOffset)
  return bytes
}

export function decodeJsonShard(bytes) {
  const viewBytes = Buffer.from(bytes)
  if (viewBytes.byteLength < SEARCH_SHARD_HEADER_LENGTH) throw new Error('Search shard header is truncated')
  for (let index = 0; index < SEARCH_SHARD_MAGIC_BYTES.length; index += 1) {
    if (viewBytes[index] !== SEARCH_SHARD_MAGIC_BYTES[index]) throw new Error('invalid Search shard magic')
  }
  const view = new DataView(viewBytes.buffer, viewBytes.byteOffset, viewBytes.byteLength)
  const bodyLength = view.getUint32(28, true)
  const tableDirectoryOffset = view.getUint32(20, true)
  const bodyOffset = view.getUint32(tableDirectoryOffset + 4, true)
  return JSON.parse(viewBytes.subarray(bodyOffset, bodyOffset + bodyLength).toString('utf8'))
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]))
}
