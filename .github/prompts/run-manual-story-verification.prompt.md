---
name: "Run Manual Story Verification"
description: "Use when you want a completed user story manually verified through full browser journeys across mobile, tablet, desktop, offline, and PWA install flows."
agent: "Manual Story Verifier"
argument-hint: "Provide the story file or story number, route or feature area, local URL, and any risky flows or regressions to inspect."
---
Use the `Manual Story Verifier` agent to manually verify a completed story through full browser-based user journeys.

Use Playwright MCP directly for all manual browser verification.

Use these repository documents as the default source of truth:
- Product overview: [README.md](README.md)
- Product context: [docs/product-info.md](docs/product-info.md)
- Story specs:
	- [docs/specs/story-1-online-reading.md](docs/specs/story-1-online-reading.md)
	- [docs/specs/story-2-continuous-reader.md](docs/specs/story-2-continuous-reader.md)
	- [docs/specs/story-3-navigation.md](docs/specs/story-3-navigation.md)
	- [docs/specs/story-4-verse-marks.md](docs/specs/story-4-verse-marks.md)
	- [docs/specs/story-5-review-hub.md](docs/specs/story-5-review-hub.md)
	- [docs/specs/story-6-cross-tab-safety.md](docs/specs/story-6-cross-tab-safety.md)
	- [docs/specs/story-7-deep-links.md](docs/specs/story-7-deep-links.md)
	- [docs/specs/story-8-dataset-updates.md](docs/specs/story-8-dataset-updates.md)
	- [docs/specs/story-9-settings-about.md](docs/specs/story-9-settings-about.md)

If the user identifies a story by number or name, resolve it from the story spec files above before testing.

Test requirements:
- Read the relevant story spec and acceptance criteria first.
- Walk every primary user journey end to end.
- Cover all viewports: mobile `393x851`, tablet `768x1024`, desktop `1280x720`.
- Cover both online and offline behavior where the story can be affected.
- Check PWA install or installed-app behavior where the story can be affected.
- Inspect UI, UX, accessibility, styling, responsive behavior, navigation, focus handling, and obvious regressions.
- Use only Playwright MCP browser interactions for verification.
- Do not edit code or run non-browser verification.

Return a Markdown report with these sections:
- `Scope`
- `Findings`
- `Verification Notes`
- `Verdict`

In `Findings`, use only these severity labels:
- `critical`
- `high`
- `medium`
- `low`
- `polish`

User input:

{{input}}