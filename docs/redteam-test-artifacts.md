# Red Team Review: Test Artifact Locations

## Executive Summary

**Status: ⚠️ NEEDS REVISION**

The proposed artifact locations have **5 critical issues** that violate industry best practices and will cause operational friction. While the intent is good, the implementation mixes concerns, conflicts with Playwright defaults, and creates maintenance overhead.

---

## Critical Issues Found

### 1. 🔴 **Conflict with Playwright Defaults (HIGH SEVERITY)**

**Problem:** Playwright already uses `test-results/` as its default output directory (hardcoded behavior). The proposed `.opencode/mcp/artifacts/` creates a parallel location that won't capture actual Playwright output.

**Evidence:**
```javascript
// playwright.config.js shows:
// trace: 'on-first-retry'
// screenshot: 'only-on-failure'
// These output to test-results/ by default
```

**Impact:**
- E2E test artifacts go to `test-results/` (Playwright default)
- Cleanup script tries to clean `.opencode/mcp/artifacts/` (empty)
- Developers confused where to find traces from failed CI runs

**Fix:** Align with Playwright's convention OR explicitly configure Playwright outputDir

---

### 2. 🔴 **MCP vs Playwright Artifact Confusion (HIGH SEVERITY)**

**Problem:** The proposal conflates two different systems:
- **MCP (Model Context Protocol)**: Interactive browser automation during AI-assisted development
- **Playwright**: Automated test suite with deterministic runs

**Current Mix-up:**
```
Proposed:
├── .opencode/mcp/screenshots/  ← MCP interactive screenshots
├── .opencode/mcp/artifacts/   ← ??? (intended for MCP HAR files?)
└── test-results/              ← Playwright E2E artifacts (ignored by cleanup!)
```

**Why This Matters:**
- MCP screenshots are manually-triggered during development
- Playwright artifacts are automatically generated during test runs
- They have different retention needs (MCP = ephemeral, Playwright = until CI upload)
- Cleanup policies should differ (MCP = 7 days, Playwright = last run only)

**Fix:** Separate the concerns completely

---

### 3. 🟡 **Dot Directory Anti-Pattern for Screenshots (MEDIUM SEVERITY)**

**Problem:** `.opencode/mcp/screenshots/` hides screenshots in a dot directory.

**Issues:**
- Dot directories are typically for config/state, not user-facing files
- Developers can't easily browse screenshots in Finder/Explorer
- IDE file explorers often hide dot directories by default
- Screenshots are meant to be *looked at*—they shouldn't be hidden

**Industry Standard:**
```
Good:  test-screenshots/      ← Visible, browsable
Good:  test-output/           ← Visible, clear purpose
Bad:   .opencode/mcp/screenshots/  ← Hidden, fragmented
```

**Fix:** Use visible directories with clear names

---

### 4. 🟡 **Over-Fragmentation (MEDIUM SEVERITY)**

**Problem:** Artifacts are scattered across 5+ locations.

**Proposed Structure:**
```
Project Root
├── .opencode/mcp/screenshots/   ← MCP screenshots
├── .opencode/mcp/logs/          ← MCP browser logs
├── .opencode/mcp/artifacts/     ← MCP HAR files, traces
├── test-screenshots/            ← Manual screenshots
├── test-results/               ← Playwright E2E artifacts (default)
└── playwright-report/          ← Playwright HTML report
```

**Problems:**
1. **Cognitive load**: "Where did I save that screenshot?" → 5 possible places
2. **Cleanup complexity**: Multiple cleanup targets
3. **CI integration**: Artifact upload patterns need 5+ path rules
4. **Documentation drift**: Hard to explain when to use each

**Industry Best Practice:**
Most projects use 1-2 directories:
```
Simple approach (recommended for small projects):
├── test-output/          ← All test artifacts
│   ├── screenshots/
│   ├── traces/
│   └── logs/
└── playwright-report/    ← HTML reports (separate because viewed differently)
```

---

### 5. 🟡 **Missing Retention Strategy (MEDIUM SEVERITY)**

**Problem:** The cleanup script uses 7-day retention for everything, but different artifacts have different lifespans.

**Recommended Retention by Type:**
| Artifact Type | Retention | Rationale |
|--------------|-----------|-----------|
| MCP screenshots | 7 days | Manual debugging, short-term |
| Playwright screenshots | 1 run | Only need last failure |
| Playwright traces | 1-3 runs | Debugging flakes |
| Playwright reports | 30 days | Historical trends |

**Current Approach:** One-size-fits-all 7 days is suboptimal.

---

## Recommended Directory Structure

### Option A: Unified Output Directory (Recommended)

```
Project Root
├── test-output/                    # All test artifacts (visible, clear)
│   ├── screenshots/               # All screenshots (MCP + manual)
│   │   └── 2026-04-07/           # Date-organized subdirs
│   ├── traces/                    # Playwright traces
│   └── logs/                      # Browser console logs
├── playwright-report/             # Keep separate (HTML viewer)
└── .opencode/mcp/                 # MCP state only (not artifacts)
    └── .session/                  # Internal MCP state if needed
```

**Benefits:**
- Single directory for all artifacts
- Visible and browsable
- Aligns cleanup with single location
- Easy CI artifact upload: `test-output/**`
- Clear mental model: "test artifacts go in test-output/"

### Option B: Separate Concerns (If Must Keep MCP Separate)

```
Project Root
├── test-artifacts/                # Playwright + test artifacts
│   ├── screenshots/
│   ├── traces/
│   └── logs/
├── mcp-output/                   # MCP-specific output
│   ├── screenshots/
│   └── logs/
└── playwright-report/
```

**Benefits:**
- Clear separation between automated test artifacts and MCP dev artifacts
- Different retention policies possible
- Still avoids dot directories

---

## Required Configuration Changes

### 1. Update Playwright Config

```javascript
// playwright.config.js
export default defineConfig({
  outputDir: 'test-output/traces',  // Explicit output location
  // ... rest of config
})
```

### 2. Update .gitignore

```gitignore
# Test artifacts (unified)
test-output/
playwright-report/

# Legacy locations (backwards compatibility)
test-results/           # Keep for existing files
test-screenshots/       # Keep until migrated
```

### 3. Update Cleanup Scripts

```bash
# Single cleanup target
TEST_OUTPUT="test-output"

# Playwright artifacts: keep only last run (aggressive cleanup)
find "$TEST_OUTPUT/traces" -type f -mtime +1 -delete

# MCP screenshots: keep 7 days
find "$TEST_OUTPUT/screenshots" -type f -mtime +7 -delete
```

---

## CI/CD Integration Path

With unified structure, CI artifact upload becomes simple:

```yaml
# .github/workflows/ci.yml
- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-artifacts
    path: test-output/
    retention-days: 7
```

---

## Action Items

1. **Immediate:** Change `.opencode/mcp/screenshots/` → `test-output/screenshots/` (or similar visible path)
2. **Immediate:** Add `outputDir: 'test-output/traces'` to playwright.config.js
3. **Short-term:** Consolidate cleanup scripts to single `test-output/` target
4. **Short-term:** Update README/docs with unified structure
5. **Optional:** Create migration script to move existing `test-screenshots/` and `test-results/`

---

## Conclusion

The current proposal fragments artifacts across too many locations and hides them in dot directories. A unified `test-output/` directory is the industry standard and will reduce cognitive load for developers while simplifying CI integration.

**Bottom line:** Don't fight Playwright's defaults, and don't hide screenshots where developers can't find them.