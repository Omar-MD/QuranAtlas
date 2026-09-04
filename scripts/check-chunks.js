#!/usr/bin/env node
/**
 * CI chunk size gate: fails if any JS chunk in dist/assets/ exceeds 155 KB gzip,
 * or if the total JS bundle exceeds the overall budget (500 KB gzip).
 *
 * Reads Vite's build manifest to get JS asset filenames, then measures
 * their gzip-compressed size. This mirrors what a browser would receive
 * with Content-Encoding: gzip.
 */

import { readdir } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

const MAX_GZIP_BYTES = 155 * 1024;   // 155 KB per chunk
const MAX_TOTAL_BYTES = 500 * 1024;  // 500 KB total bundle budget
const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

async function gzipSize(filePath) {
  let size = 0;
  const counter = new Writable({
    write(chunk, _enc, cb) {
      size += chunk.length;
      cb();
    },
  });
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), counter);
  return size;
}

async function main() {
  let files;
  try {
    files = await readdir(ASSETS_DIR);
  } catch {
    console.error(`\n✗ dist/assets/ not found — run "mise run build:release" first.\n`);
    process.exit(1);
  }

  const jsFiles = files.filter((f) => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    console.error('\n✗ No JS chunks found in dist/assets/\n');
    process.exit(1);
  }

  console.log(`\nChunk size check (max ${MAX_GZIP_BYTES / 1024} KB gzip):\n`);

  let failed = false;
  let totalBytes = 0;

  for (const file of jsFiles.sort()) {
    const filePath = join(ASSETS_DIR, file);
    const bytes = await gzipSize(filePath);
    const kb = (bytes / 1024).toFixed(1);
    const status = bytes > MAX_GZIP_BYTES ? '✗ OVER LIMIT' : '✓';
    console.log(`  ${status}  ${file.padEnd(50)} ${kb} KB gzip`);
    if (bytes > MAX_GZIP_BYTES) failed = true;
    totalBytes += bytes;
  }

  const totalKb = (totalBytes / 1024).toFixed(1);
  const totalStatus = totalBytes > MAX_TOTAL_BYTES ? '✗ OVER BUDGET' : '✓';
  console.log(`\n  ${totalStatus}  Total JS bundle: ${totalKb} KB gzip (budget: ${MAX_TOTAL_BYTES / 1024} KB)`);

  if (totalBytes > MAX_TOTAL_BYTES) {
    console.error(`\n✗ Total JS bundle (${totalKb} KB) exceeds ${MAX_TOTAL_BYTES / 1024} KB gzip budget.\n`);
    failed = true;
  }

  if (failed) {
    console.error(`\n✗ Bundle budget check failed.\n`);
    process.exit(1);
  }

  console.log(`\n✓ All chunks within ${MAX_GZIP_BYTES / 1024} KB per-chunk limit and ${MAX_TOTAL_BYTES / 1024} KB total budget.\n`);
}

main().catch((err) => {
  console.error('Chunk check error:', err.message);
  process.exit(1);
});
