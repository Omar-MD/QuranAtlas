# CSP allow-list

Per-feature registry for **outbound** CSP directives — `connect-src`, `script-src`, `style-src`, `font-src`, `img-src`, `media-src`. Audit R-19 / R-32 / N24 (2026-04-29) flagged that without an attribution registry, a future feature will quietly widen the policy and the next reviewer will not know which line is load-bearing for which feature.

The deployed policy lives in `public/_headers` and is enforced by Cloudflare Pages. **Adding or widening a directive requires (a) an entry in this doc and (b) an `_headers` edit in the same commit.** The unit test at `tests/unit/safety/csp-headers.test.ts` parses both and rejects drift.

## Current policy (2026-05-01)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data:;
connect-src 'self';
base-uri 'self';
form-action 'none';
frame-ancestors 'none';
manifest-src 'self';
worker-src 'self';
```

Plus headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` (full deny list), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.

## Registry (per-feature attribution)

| directive    | value             | source feature   | reason                                                                                                                            |
|--------------|-------------------|------------------|------------------------------------------------------------------------------------------------------------------------------------|
| default-src  | `'self'`          | app              | global default                                                                                                                     |
| script-src   | `'self'`          | app              | only first-party JS bundles ship                                                                                                   |
| style-src    | `'self'`          | app              | first-party CSS                                                                                                                    |
| style-src    | `'unsafe-inline'` | reader / tag UI  | Svelte `style:` directives for per-tag colors. **Removal tracked at R-19c (P3.24); deferred to v1.3 inline-style audit.**         |
| font-src     | `'self'`          | reader / fonts   | KFGQPC, Newsreader, Geist Mono — all self-hosted under `/fonts/`                                                                   |
| font-src     | `data:`           | reader / fonts   | inline data: URLs in CSS for fallback glyphs (legacy; remove if no longer emitted by build)                                        |
| img-src      | `'self'`          | nav / icons      | favicons, app icons under `/icons/`                                                                                                |
| img-src      | `data:`           | nav / icons      | tiny inline SVGs in components                                                                                                     |
| connect-src  | `'self'`          | app / data       | per-surah dataset fetches under `/dataset/`, SW update poll                                                                        |
| base-uri     | `'self'`          | router           | hash router does not rewrite base; lock to origin                                                                                  |
| form-action  | `'none'`          | n/a              | no `<form action>` posts anywhere                                                                                                  |
| frame-ancestors | `'none'`       | security         | clickjacking deny — only header CSP can enforce this; `X-Frame-Options: DENY` defence-in-depth                                     |
| manifest-src | `'self'`          | pwa              | `/manifest.webmanifest`                                                                                                            |
| worker-src   | `'self'`          | sw               | service worker at `/sw.js`                                                                                                         |

## Adding a new entry

When a feature needs to connect, embed, or load from a new origin:

1. **Justify it.** Is the asset truly third-party? Self-host if reasonable (fonts, icons, scripts). Self-hosting also dodges third-party privacy + integrity risks.
2. **Add a row** to the registry above with the source feature + reason.
3. **Edit `public/_headers`** in the same commit. Place the new origin in the directive's value list.
4. **Update the test.** `tests/unit/safety/csp-headers.test.ts` parses both this doc + `_headers`. If they drift, CI fails. Update the expected map there too.
5. **PR description.** Call out the directive change explicitly — security reviewers will look here.

## Forbidden directives

These are NOT permitted without an architecture-level decision (audit / brainstorm / spec doc):

- `'unsafe-eval'` — banned outright. No code-string evaluation in this codebase.
- `'wasm-unsafe-eval'` — banned. No WebAssembly today.
- `'unsafe-hashes'` — banned. Inline event handlers must be removed, not hashed.
- `data:` on `script-src` — banned. Data-URL scripts are an XSS amplifier.
- `*` (wildcard) anywhere — banned. Always enumerate origins.
- A new third-party origin without privacy review.

## Future widenings (sketches — not policy)

Tracked in `docs/context/future-work.md`:

- **Audio (P3.21).** May require `connect-src https://<reciter-cdn>` if reciter audio cannot be self-hosted. Prefer self-hosting under `/dataset/audio/{reciter-id}/` to avoid CSP widening + third-party privacy risk.
- **Sync v2 (P3.22).** Will require `connect-src https://<sync-endpoint>` for cross-device push. Endpoint must be first-party (own subdomain) — third-party sync hosts disallowed by the privacy posture.
- **Page-image renderer (future-work #14).** May require `img-src` widening if KFGQPC page raster comes from a third-party CDN. Prefer self-hosting.

In every case, the widening lands as a registry row + `_headers` edit + the test update, with the PR description spelling out the privacy + integrity trade-off.
