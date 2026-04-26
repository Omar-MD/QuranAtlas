#!/usr/bin/env bash
# Test #1 — Audit KFGQPC font hinting + OS/2 weight class.
#
# Hypothesis H1: KFGQPC TTF ships unhinted. FreeType (Skia/Chrome) auto-hints
# stems → looks bold. CoreGraphics (WebKit) renders raw outlines → looks thin.
# Hypothesis H2: Hinting present in upstream TTF but stripped by woff2 build.
#
# Discriminates:
#   - fpgm / prep / cvt empty or absent → unhinted (H1 confirmed)
#   - fpgm / prep / cvt present in TTF, absent in woff2 → woff2 stripped (H2)
#   - All present everywhere + Safari still thin → look elsewhere (H3/H4)
#
# Requires: pip install fonttools brotli
# Optional: brew install woff2  (provides woff2_decompress for raw woff2 → ttf)

set -euo pipefail

cd "$(dirname "$0")/../.."

FONTS=(
  "public/fonts/kfgqpc-hafs/hafs.18"
  "public/fonts/kfgqpc-warsh/warsh.10"
  "public/fonts/kfgqpc-qaloon/qaloon.10"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

dump_tables() {
  local font="$1"
  local label="$2"
  echo "── $label ──"
  python3 -c "
from fontTools.ttLib import TTFont
import sys
f = TTFont(sys.argv[1])
tables = sorted(f.keys())
print(f'Tables present: {len(tables)}')
print('  ' + ' '.join(tables))
print()
for t in ('fpgm', 'prep', 'cvt ', 'gasp', 'maxp'):
    if t in f:
        if t == 'maxp':
            mx = f['maxp']
            print(f\"  maxp.maxFunctionDefs = {getattr(mx,'maxFunctionDefs','n/a')}\")
            print(f\"  maxp.maxStackElements = {getattr(mx,'maxStackElements','n/a')}\")
            print(f\"  maxp.numGlyphs = {mx.numGlyphs}\")
        else:
            tab = f[t]
            n = 0
            try:
                n = len(getattr(tab, 'program', getattr(tab, 'values', getattr(tab, 'bytecode', b''))))
            except Exception:
                pass
            print(f'  {t.strip()} present (rough size: {n})')
    else:
        print(f'  {t.strip()} MISSING')
print()
os2 = f['OS/2']
print(f'  OS/2.usWeightClass   = {os2.usWeightClass}')
print(f'  OS/2.fsSelection     = {os2.fsSelection:#06x}')
print(f'  OS/2.fsType          = {os2.fsType}')
print(f'  OS/2.sTypoAscender   = {os2.sTypoAscender}')
print(f'  OS/2.sTypoDescender  = {os2.sTypoDescender}')
print(f'  OS/2.usWinAscent     = {os2.usWinAscent}')
print(f'  OS/2.usWinDescent    = {os2.usWinDescent}')
hd = f['head']
print(f'  head.unitsPerEm      = {hd.unitsPerEm}')
print(f'  head.flags           = {hd.flags:#06x}  (bit1 left side bearing point, bit3 instructions)')
" "$font"
  echo
}

for base in "${FONTS[@]}"; do
  TTF="$base.ttf"
  WOFF2="$base.woff2"
  echo "=========================================================="
  echo " $base"
  echo "=========================================================="

  if [ -f "$TTF" ]; then
    dump_tables "$TTF" "TTF: $TTF"
  else
    echo "  (no TTF alongside woff2)"
    echo
  fi

  if [ -f "$WOFF2" ]; then
    if command -v woff2_decompress >/dev/null 2>&1; then
      cp "$WOFF2" "$TMP/"
      ( cd "$TMP" && woff2_decompress "$(basename "$WOFF2")" >/dev/null )
      DECOMP="$TMP/$(basename "${WOFF2%.woff2}").ttf"
      dump_tables "$DECOMP" "WOFF2 decoded: $WOFF2"
    else
      # Fall back to fontTools' built-in woff2 decode.
      python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('$WOFF2')
f.flavor = None
f.save('$TMP/$(basename "${WOFF2%.woff2}").ttf')
"
      dump_tables "$TMP/$(basename "${WOFF2%.woff2}").ttf" "WOFF2 decoded: $WOFF2"
    fi
  fi
done

echo "── Verdict checklist ──"
echo "  All fonts: fpgm + prep + cvt present  ?  → fonts ARE hinted (H1 unlikely)"
echo "  TTF has them, WOFF2 missing them      ?  → woff2 build stripped (H2)"
echo "  None of them present anywhere         ?  → unhinted (H1 confirmed)"
echo "  OS/2.usWeightClass < 400              ?  → font is genuinely light by design"
