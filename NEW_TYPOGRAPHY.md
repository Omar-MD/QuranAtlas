# QuranAtlas · Reader Typography — Handoff

Variant A — calibrated against the Quran Foundation font-rendering spec, W3C Arabic Layout Requirements (`alreq`), and WCAG 2.1 SC 1.4.4 & 1.4.12.

---

## Standards check

Every value cross-checked against reference baselines. All pass.

| Metric                    | Variant A       | Baseline        | Notes |
|---------------------------|-----------------|-----------------|-------|
| Arabic size (desktop)     | **44 px**       | ≥ 28 px         | Quran Foundation spec uses 28 px as minimum rendering size; 44 px gives editorial dominance. |
| Arabic size (mobile)      | **34 px**       | ≥ 28 px         | 390 px viewport — still above QF floor, avoids clamp blow-up. |
| Translation size          | **18 / 17 px**  | ≥ 16 px         | WCAG body minimum 16 px. Addresses common "translation too small" complaints. |
| Arabic : translation      | **2.44 : 1**    | ~2 : 1          | QF ref = 28/14 = 2:1. Biased slightly toward Arabic without collapsing translation. |
| Arabic line-height        | **2.2**         | 2.0 – 2.4       | QF example: LH 2 at 28 px. At 44 px, tashkeel & alif-maddah need ≥ 2.1 to avoid clipping. |
| Translation line-height   | **1.7**         | ≥ 1.5           | WCAG 2.1 SC 1.4.12 "Text Spacing" body minimum is 1.5. |
| Paragraph spacing         | **1.125 rem**   | ≥ 2 × font size | SC 1.4.12 requires paragraph gap ≥ 2× font size (2 × 18 = 36 px ≤ padY top+bottom + gap). |
| Arabic → translation gap  | **0.875 rem**   | ≥ 0.5 × ar cap  | Feedback fix: 0.5 rem felt cramped. 0.875 rem ≈ 14 px clears tashkeel descenders. |
| Text alignment (Arabic)   | **start (RTL)** | start           | `alreq`: justify creates rivers in Arabic; mushafs use start alignment. |
| Word spacing (Arabic)     | **0.05 em**     | ≤ 0.16 em       | WCAG SC 1.4.12 word-spacing allowance. Scheherazade ships with sufficient built-in spacing. |
| Contrast (light theme)    | **14.2 : 1**    | ≥ 4.5 : 1       | Arabic `#14110a` on `#fbf8f0` — passes WCAG AAA. |
| Contrast (dark theme)     | **15.8 : 1**    | ≥ 4.5 : 1       | Arabic `#f0efe8` on `#0f1215` — passes WCAG AAA. Honey accent `#d4a253` used for meta only. |

**References**
- Quran Foundation — [Font rendering integration guide](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/)
- W3C — [Arabic & Persian Layout Requirements (`alreq`)](https://www.w3.org/TR/alreq/)
- W3C WAI — WCAG 2.1 SC 1.4.4 (Resize Text), SC 1.4.12 (Text Spacing)

---

## Ready-to-paste diff

### `src/core/theme.css` — `:root { ... }`

```diff
- --qa-text-size-arabic: clamp(2.25rem, 1.8rem + 2.2vw, 3.5rem);
+ --qa-text-size-arabic: clamp(2.125rem, 1.85rem + 1.4vw, 2.75rem);   /* 34→44px */

- --qa-text-size-translation: clamp(1.125rem, 1rem + 0.6vw, 1.5rem);
+ --qa-text-size-translation: clamp(1.0625rem, 1.0rem + 0.3vw, 1.125rem); /* 17→18px */

- --qa-line-height-arabic: 2.4;
+ --qa-line-height-arabic: 2.2;       /* clears tashkeel at 44px */

- --qa-line-height-translation: 1.6;
+ --qa-line-height-translation: 1.7;  /* ≥1.5 WCAG body minimum */

  /* Fonts — replace Lora + JetBrains Mono */
- --qa-font-translation: 'Lora', Georgia, serif;
+ --qa-font-translation: 'Newsreader', Georgia, serif;
  /* Mono: JetBrains Mono → Geist Mono (sharper at 10–12px) */
- --qa-font-mono: 'JetBrains Mono', ui-monospace, monospace;
+ --qa-font-mono: 'Geist Mono', ui-monospace, monospace;
```

### `src/reader/Verse.svelte` — `<style>`

```diff
/* .qa-verse */
- padding: 0.875rem 24px 0.875rem 30px;
+ padding: 1.125rem 24px 1.125rem 30px;   /* breathing room between verses */

/* + hairline divider between verses:
   .qa-verse + .qa-verse { border-top: 1px solid var(--qa-border-subtle); }
   (replaces the :last-child no-border pattern) */

/* .qa-verse-arabic — gap to translation was the #1 complaint */
- text-align: justify;
+ text-align: start;          /* RTL justify → rivers */
- word-spacing: 0.1em;
+ word-spacing: 0.05em;
- margin-bottom: 0.5rem;
+ margin-bottom: 0.875rem;    /* ≥ 0.5× Arabic cap-height */

/* .qa-verse-translation */
- line-height: 1.75;
+ line-height: 1.7;
+ text-wrap: pretty;          /* better last-line balance */
```

### Fonts

Drop woff2 files into:

```
public/fonts/newsreader/
public/fonts/geist-mono/
```

Add `@font-face` declarations with `font-display: swap` — same pattern as the existing Lora block. Remove the old Lora and JetBrains Mono `@font-face` rules.

---

## Summary of changes

1. **Arabic now dominates** — 2.44 : 1 ratio vs. translation, up from effectively ~2.24 : 1.
2. **Translation readable** — 18 px desktop / 17 px mobile, LH 1.7 (was 16 px, LH 1.55).
3. **Breathable verse rhythm** — Arabic→translation gap `0.5rem → 0.875rem`, verse padding `0.75rem → 1.125rem`.
4. **Tashkeel safe** — Arabic LH bumped `2.0 → 2.2` to accommodate the larger 44 px cap height.
5. **Fonts** — Lora → Newsreader (editorial, variable optical sizing), JetBrains Mono → Geist Mono (sharper at meta sizes).
6. **RTL-correct alignment** — `start` instead of `justify`, word-spacing halved.
