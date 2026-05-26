# React Visual Baselines

These Playwright screenshots are local regression evidence for the React rebuild.
They are not visual source of truth and do not replace `docs/ui-references/**`
or the Svelte baseline appendix.

Update baselines only with the code, token, or story change that intentionally
changes the rendered React state:

```bash
pnpm exec playwright test --config playwright.visual.react.config.js --update-snapshots
pnpm run visual:react
```

Do not update screenshots to hide missing fonts, missing assets, layout overlap,
unintended product scope, or inaccessible focus.
