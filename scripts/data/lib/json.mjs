import { readFile, writeFile } from 'node:fs/promises'

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value), 'utf8')
}
