# Security policy

## Supported versions

The only supported surface is the currently deployed production build at **https://quranatlas.org**. Older tagged releases are not patched.

## Reporting a vulnerability

If you discover a security vulnerability in QuranAtlas, please report it **privately** via GitHub's "Report a vulnerability" feature:

1. Go to the **Security** tab on https://github.com/Omar-MD/QuranAtlas
2. Click **Report a vulnerability**
3. Fill in the advisory form

Alternatively, email the maintainer at the address listed on the GitHub profile. Please do **not** open a public issue for security concerns.

## What to report

Examples of things worth reporting:

- Leaked secrets in the repo or CI logs
- Supply-chain issues (a dependency you believe is compromised)
- Ways to compromise user data stored in IndexedDB from the served site (XSS, SW cache poisoning, etc.)
- Subdomain takeover or DNS misconfiguration on `*.quranatlas.org`
- Authentication or authorization bugs (though note: QuranAtlas has no backend and no accounts — user data is entirely local)

## What isn't in scope

- Brute-force or DoS of the static site (it's served by Cloudflare; their mitigations apply)
- Attacks requiring local device access to read IndexedDB (the threat model trusts the device)
- Missing headers that have no practical exploit path (e.g., clickjacking on a single-page app with no sensitive state server-side)

## Response expectations

This is a single-maintainer project. Expect a first reply within **7 days**. Fixes land in `main` once verified and deploy automatically.

## Coordinated disclosure

Please wait until a fix has shipped (or 90 days from report, whichever comes first) before publicly disclosing.
