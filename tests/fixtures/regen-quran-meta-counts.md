# Regenerating `quran-meta-counts.json`

This fixture pins per-surah ayah counts from [quran-center/quran-meta](https://github.com/quran-center/quran-meta) (Tanzil-derived) as an independent cross-validation source for QuranAtlas's KFGQPC-derived counts in `public/dataset/surahs.json`.

Re-fetch when:
- The KFGQPC riwayat dataset is bumped (`hafs.json`/`warsh.json`/`qaloon.json` versions change)
- quran-meta publishes a new release with corrected metadata
- The cross-validation test (`tests/unit/data/translation-riwayah-alignment.test.js`) starts failing for a reason other than the bug it's meant to catch

## Regenerate

```sh
# 1. Fetch the three SurahList sources from quran-meta main
for r in Hafs Warsh Qalun; do
  gh api repos/quran-center/quran-meta/contents/src/lists/${r}Lists.ts \
    --jq .content | base64 -d > /tmp/${r}Lists.ts
done

# 2. Extract per-surah ayah counts (field 2 of each SurahInfo tuple, indices 1..114)
python3 <<'PY'
import re, json
def parse(path):
    with open(path) as f: c = f.read()
    m = re.search(r'export const SurahList[^=]*=\s*\[(.*?)\] as const', c, re.S)
    rows = re.findall(r'\[\s*(-?\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]*)",\s*(true|false)\s*\]', m.group(1))
    return [int(r[1]) for i, r in enumerate(rows) if 1 <= i <= 114]
fixture = {
  '_meta': {
    'description': 'Per-surah ayah counts from quran-meta (https://github.com/quran-center/quran-meta), used as an independent cross-validation source for QuranAtlas\'s KFGQPC-derived counts. Regenerate via tests/fixtures/regen-quran-meta-counts.md when bumping. Only the 114 ayahCount integers per riwayah are extracted; surah names / partition data are not used here.',
    'fetchedAt': 'YYYY-MM-DD',
    'source': 'https://github.com/quran-center/quran-meta',
    'sourceFiles': ['src/lists/HafsLists.ts', 'src/lists/WarshLists.ts', 'src/lists/QalunLists.ts'],
  },
  'counts': {
    'hafs':   parse('/tmp/HafsLists.ts'),
    'warsh':  parse('/tmp/WarshLists.ts'),
    'qaloon': parse('/tmp/QalunLists.ts'),
  },
}
with open('tests/fixtures/quran-meta-counts.json', 'w') as f:
    json.dump(fixture, f, ensure_ascii=False, indent=2)
PY

# 3. Update _meta.fetchedAt to today's date
# 4. Update _verse-map.json::_meta.crossValidation.checkedAt to match
# 5. Run pnpm test tests/unit/data/translation-riwayah-alignment
```

## Schema sanity

quran-meta's `SurahInfo` tuple is `[startAyahId, ayahCount, surahOrder, rukuCount, name, used]`. The first array slot (index 0) is a 1-indexed sentinel; surahs live at indices 1..114. The `ayahCount` is field 2.

If the upstream tuple shape changes, this fixture will silently mis-extract. The cross-validation test is the only structural guard — if it ever breaks because the shape changed (not because counts diverged), update the regex above.
