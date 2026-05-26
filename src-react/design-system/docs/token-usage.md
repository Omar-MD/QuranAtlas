# React Token Usage

React components consume semantic `--qa-react-*` tokens through prefixed Tailwind
utilities or design-system recipes. Primitive `--qar-*` tokens are private to
`src-react/design-system/tokens/**`.

Rules:

- Use `qar:` prefixed utilities only.
- Use semantic names such as `qar:bg-surface`, `qar:text-text`, `qar:border-border`, and `qar:rounded-control`.
- Do not use built-in Tailwind palette classes.
- Do not use arbitrary values unless listed in `measured-layout-allowlist.json`.
- Do not add inline color styles.
- Keep Tailwind in owned React design-system and product components, not shared Svelte files.
