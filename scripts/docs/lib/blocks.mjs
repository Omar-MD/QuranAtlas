// Auto-generated fence-block reader/writer + manifest hashing.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './scan.mjs';

const MANIFEST_PATH = join(REPO_ROOT, '.docs-derive-manifest.json');

export function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { version: 1, blocks: {} };
  }
}

export function saveManifest(m) {
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        _comment: 'SHA-256 hashes of AUTO-GENERATED fence blocks. Maintained by scripts/docs/derive.mjs. Do not hand-edit.',
        version: m.version ?? 1,
        blocks: m.blocks ?? {},
      },
      null,
      2,
    ) + '\n',
  );
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const fenceRe = (name) => new RegExp(
  `<!-- AUTO-GENERATED:${escapeRegExp(name)} START -->[\\s\\S]*?<!-- AUTO-GENERATED:${escapeRegExp(name)} END -->`,
  'm',
);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function listBlocks(text) {
  const out = [];
  const re = /<!-- AUTO-GENERATED:([a-z0-9_-]+) START -->([\s\S]*?)<!-- AUTO-GENERATED:\1 END -->/g;
  let m;
  while ((m = re.exec(text))) {
    out.push({ name: m[1], match: m[0], body: m[2], startIdx: m.index, endIdx: m.index + m[0].length });
  }
  return out;
}

export function replaceBlock(text, name, newBody) {
  const replacement = `<!-- AUTO-GENERATED:${name} START -->\n${newBody.trim()}\n<!-- AUTO-GENERATED:${name} END -->`;
  return text.replace(fenceRe(name), replacement);
}

export function writeBlockToFile(filePath, blockName, newBody, manifest) {
  const text = readFileSync(filePath, 'utf8');
  const blocks = listBlocks(text);
  const existing = blocks.find((b) => b.name === blockName);
  const manifestKey = `${relative(REPO_ROOT, filePath)}:${blockName}`;

  if (existing) {
    const existingInteriorHash = sha256(existing.body.trim());
    const recordedHash = manifest.blocks?.[manifestKey];
    if (recordedHash && recordedHash !== existingInteriorHash) {
      throw new Error(
        `[blocks] ${manifestKey}: hand-edit detected inside auto-generated fence (hash mismatch). ` +
        `Move custom content outside the fence and re-run derive.`,
      );
    }
  }

  const newText = existing
    ? replaceBlock(text, blockName, newBody)
    : text;

  if (newText !== text) {
    writeFileSync(filePath, newText);
  }

  const finalText = readFileSync(filePath, 'utf8');
  const finalBlocks = listBlocks(finalText);
  const finalBlock = finalBlocks.find((b) => b.name === blockName);
  if (finalBlock) {
    manifest.blocks ||= {};
    manifest.blocks[manifestKey] = sha256(finalBlock.body.trim());
  }

  return { changed: newText !== text };
}

export function verifyManifest(manifest) {
  const violations = [];
  for (const [key, expected] of Object.entries(manifest.blocks ?? {})) {
    const [relPath, blockName] = key.split(':');
    const filePath = join(REPO_ROOT, relPath);
    let text;
    try {
      text = readFileSync(filePath, 'utf8');
    } catch {
      violations.push({ key, expected, actual: '<missing-file>' });
      continue;
    }
    const blocks = listBlocks(text);
    const block = blocks.find((b) => b.name === blockName);
    if (!block) {
      violations.push({ key, expected, actual: '<missing-block>' });
      continue;
    }
    const actual = sha256(block.body.trim());
    if (actual !== expected) {
      violations.push({ key, expected, actual });
    }
  }
  return violations;
}
