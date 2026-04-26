/**
 * Test #5 — document.fonts duplicate-registration audit.
 *
 * Hypothesis H4: PR #54 added a programmatic FontFace (new FontFace(family,
 * ArrayBuffer, …) + document.fonts.add) on top of the existing CSS @font-face.
 * Result: each KFGQPC family may now have TWO FontFace records in
 * document.fonts. WebKit may pick the loser for layout while the winner
 * controls fallback math, OR shaping uses one face and rasterization uses
 * another. Either way, registry pollution.
 *
 * How to run on Safari:
 *   1. Open Web Inspector on dev.quranatlas.org (or local preview).
 *   2. Console tab.
 *   3. Paste this whole file. The result table prints to the console.
 *
 * Expected baseline (no bug):
 *   3 entries — one per riwayah (KFGQPC Hafs, KFGQPC Warsh, KFGQPC Qaloon).
 *   All status='loaded'.
 *
 * Bug shape:
 *   6 entries — two per family, e.g. one with usage:'normal' (CSS @font-face)
 *   and one with usage:'normal' but loaded via FontFace constructor.
 *   Either way: count > 3 = duplicate registrations.
 */

(() => {
  const all = Array.from(document.fonts);
  const kfgqpc = all.filter(f => f.family.includes('KFGQPC'));

  console.log(`Total document.fonts entries: ${all.length}`);
  console.log(`KFGQPC entries: ${kfgqpc.length}  (expect 3 — one per riwayah)`);

  console.table(
    kfgqpc.map(f => ({
      family: f.family,
      style: f.style,
      weight: f.weight,
      stretch: f.stretch,
      unicodeRange: f.unicodeRange,
      status: f.status,
      display: f.display,
    }))
  );

  // Also surface anything else that overlaps Arabic unicode-range.
  const arabicish = all.filter(f =>
    f.unicodeRange && /U\+0[68][0-9A-F]{2}/i.test(f.unicodeRange)
  );
  console.log(`Faces with Arabic unicode-range: ${arabicish.length}`);
  console.table(
    arabicish.map(f => ({ family: f.family, status: f.status, range: f.unicodeRange }))
  );

  if (kfgqpc.length > 3) {
    console.warn(
      `⚠ Duplicate KFGQPC FontFace registrations detected. CSS @font-face + ` +
      `programmatic FontFace (PR #54) are both registering the same family. ` +
      `WebKit shaping path may be picking the wrong face.`
    );
  } else if (kfgqpc.length < 3) {
    console.warn(`⚠ Fewer than 3 KFGQPC entries — at least one riwayah did not load.`);
  } else {
    console.log('✓ Exactly 3 KFGQPC entries — no duplicate registration.');
  }
})();
