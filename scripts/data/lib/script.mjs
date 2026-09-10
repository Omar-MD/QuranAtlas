// Cross-script micro-helpers for the data pipeline (audit §5: ensure ×5,
// argValue ×4, pad3 ×3, sha256 ×4, isInside ×3, run/runChecked ×2,
// chunkRows ×3). Bodies moved verbatim from the per-script copies.
import { createHash } from 'node:crypto'
import { relative, resolve, sep } from 'node:path'

export function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

export function argValue(argv, name, fallback = null) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : fallback
}

// Plain zero-pad for mushaf page / surah filenames. Distinct from
// lib/ayah.mjs `pad3`, which validates the value as a surah number.
export function pad3(n) {
  return String(n).padStart(3, '0')
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function isInside(parent, candidate) {
  const path = relative(resolve(parent), resolve(candidate))
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`))
}

export async function runChecked(runCommand, command, args) {
  const result = await runCommand(command, args)
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || `status ${result.status}`).trim()}`)
  }
  return result.stdout ?? ''
}

export function chunkRows(rows, chunkSize) {
  const chunks = []
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize))
  }
  return chunks
}
