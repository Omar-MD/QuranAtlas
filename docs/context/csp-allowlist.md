# CSP Allowlist

Per-feature registry for outbound CSP directives. The deployed policy lives in `public/_headers` and is enforced by Cloudflare Pages. Adding or widening a directive requires this doc and `_headers` to change together.

## Current Policy

```text
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
worker-src 'self'
```

Additional headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, full-deny `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`.

## Registry

| Directive | Value | Source Feature | Reason |
| --- | --- | --- | --- |
| `default-src` | `'self'` | app | global fallback |
| `script-src` | `'self'` | app | first-party Vite bundles only |
| `style-src` | `'self'` | app | first-party generated CSS |
| `style-src` | `'unsafe-inline'` | React layout/primitives | runtime layout variables and primitive positioning that cannot be fully enumerated as static classes without regressions |
| `font-src` | `'self'` | reader/fonts | self-hosted Quran and UI fonts under `/fonts/` |
| `font-src` | `data:` | fonts | data URL font fallbacks when emitted by CSS tooling |
| `img-src` | `'self'` | icons/Mushaf | app icons and same-origin image/SVG assets |
| `img-src` | `data:` | icons | tiny inline SVG/image data used by UI/tooling |
| `connect-src` | `'self'` | app/data | same-origin runtime dataset fetches, PWA update checks, and preview assets |
| `base-uri` | `'self'` | router | lock document base to origin |
| `form-action` | `'none'` | app | no form posts |
| `frame-ancestors` | `'none'` | security | deny embedding; header CSP enforces this |
| `manifest-src` | `'self'` | PWA | generated web manifest |
| `worker-src` | `'self'` | PWA | service worker at `/sw.js` |

## Forbidden Without Architecture Review

- `'unsafe-eval'`
- `'wasm-unsafe-eval'`
- `'unsafe-hashes'`
- `data:` on `script-src`
- wildcard origins
- new third-party origins without privacy and integrity review

No future widening is pre-approved.
