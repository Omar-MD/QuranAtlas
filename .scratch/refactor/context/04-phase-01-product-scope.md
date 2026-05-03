# Phase 01 Product Scope — Knowledge Lane

## Product Objective

Phase 01 should make the reader slightly more context-aware without changing the core reading experience.

The user should feel:

> “I understand where this ayah sits and what themes it carries.”

They should not yet feel:

> “This is an AI reflection app.”

## What Phase 01 Adds

### 1. Passage Awareness

The app can know:

- which passage an ayah belongs to
- the passage title
- the passage summary
- the passage themes

Example:

```text
2:1-5 — The qualities of those who receive guidance
```

### 2. Ayah Theme Awareness

The app can know:

- this ayah is about guidance
- this ayah is about taqwa
- this ayah is about revelation

Example:

```text
Themes: Guidance · Taqwa · Revelation
```

### 3. Theme Indexing

The app can later answer:

```text
Show me other ayat about guidance.
```

This requires a `theme-to-ayah` index.

## What Phase 01 Does Not Add

- reflection prompts
- AI chat
- tafsir claim extraction
- embeddings
- journaling
- user personalization
- social/community reflection
- action recommendations

## Minimal UX For Phase 01

### Reader

Default reader remains unchanged.

Optional enhancement:

- show passage label above first ayah of a passage
- or show passage context only after ayah tap

### Ayah Interaction Surface

When user taps an ayah, show:

```text
Context
The qualities of those who receive guidance

Themes
Guidance · Taqwa · Revelation
```

This should be small and collapsible.

## Product Risk

The main risk is visual clutter.

Phase 01 should be judged successful only if the reader still feels calm.

## Data Risk

The main data risk is weak or inconsistent theme tagging.

Use a small curated pilot set rather than tagging the entire Qur'an poorly.

## Success Criteria

Phase 01 succeeds when:

- the reader still works without knowledge data
- selected pilot passages display correctly
- selected ayat show theme chips
- invalid knowledge data fails build
- future reflection work has a stable knowledge base
