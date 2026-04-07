# MCP Usage Guide

QuranAtlas uses a single, unified Playwright MCP server that dynamically adapts to different testing scenarios through tool calls.

## Quick Start

The `playwright` MCP provides browser automation with these key capabilities:
- **Dynamic viewport resizing** - Test any device size without restarting
- **Headless or headed mode** - Configurable via environment variable
- **Screenshot capture** - Automatic saving to organized directories
- **Full PWA testing** - Offline mode, service workers, IndexedDB

## Dynamic Viewport Resizing

Instead of switching between multiple MCP profiles, use the `browser_resize` tool to change viewport size on demand.

### Standard Device Sizes

| Device | Dimensions | Use Case |
|--------|-----------|----------|
| Mobile (Pixel 5) | 393x851 | Primary mobile testing |
| Tablet (iPad Mini) | 768x1024 | Tablet layout testing |
| Desktop | 1280x720 | Desktop debugging |
| Small Desktop | 1366x768 | Common laptop resolution |
| Large Desktop | 1920x1080 | Full HD testing |

### Resizing Workflow

1. **Navigate to your target page:**
   ```
   browser_navigate(url: "http://localhost:5173/#/s/112")
   ```

2. **Resize to mobile viewport:**
   ```
   browser_resize(width: 393, height: 851)
   ```

3. **Test, then resize to tablet:**
   ```
   browser_resize(width: 768, height: 1024)
   ```

4. **Continue testing desktop:**
   ```
   browser_resize(width: 1280, height: 720)
   ```

All resizing happens in the same browser session—no MCP restarts needed.

## Headless Mode

By default, the Playwright MCP runs in **headed mode** (browser window visible). To run headless:

### Option 1: Environment Variable (Recommended)

Set the environment variable before starting OpenCode:

```bash
# macOS/Linux
export OPENCODE_PLAYWRIGHT_HEADLESS=true
opencode

# Windows PowerShell
$env:OPENCODE_PLAYWRIGHT_HEADLESS="true"
opencode

# Windows CMD
set OPENCODE_PLAYWRIGHT_HEADLESS=true
opencode
```

### Option 2: Add to Shell Profile

For permanent headless mode in CI environments:

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export OPENCODE_PLAYWRIGHT_HEADLESS=true
```

### When to Use Headless Mode

| Scenario | Recommendation |
|----------|---------------|
| CI/CD pipelines | Headless (`true`) |
| Automated screenshots | Headless (`true`) |
| Interactive debugging | Headed (`false`, default) |
| Visual inspection | Headed (`false`, default) |
| Touch interaction testing | Headed (`false`, default) |

## Test Output & Artifact Management

All test artifacts are organized in a single, visible directory structure at `test-output/`.

### Directory Structure

```
test-output/              # All test artifacts (visible, browsable)
├── screenshots/         # MCP and manual screenshots
│   └── YYYY-MM-DD/      # Date-organized subdirectories
├── traces/              # Playwright trace files for debugging
├── logs/                # Browser console logs
└── report/              # Playwright HTML test reports
```

### Screenshot Locations

| Purpose | Path | Notes |
|---------|------|-------|
| MCP screenshots | `test-output/screenshots/` | Date-organized |
| Playwright traces | `test-output/traces/` | Auto-generated on test failure |
| Browser logs | `test-output/logs/` | Console output during tests |
| HTML reports | `test-output/report/` | View with `npx playwright show-report` |

### Why This Structure?

- **Unified location**: All artifacts in one visible directory
- **No dot directories**: Easy to browse in Finder/Explorer
- **Playwright compatible**: Aligns with Playwright's output conventions
- **CI-friendly**: Single path for artifact uploads: `test-output/**`

### Cleanup Commands

```bash
# Clean up all test output
pnpm mcp:cleanup
```

This removes the entire `test-output/` directory.

### Gitignore

All test output directories are automatically excluded from git:

```gitignore
# Test artifacts (unified)
test-output/

# Legacy locations (backward compatibility)
test-results/
playwright-report/
test-screenshots/
```

## Common Workflows

### Responsive Testing (Single Session)

Test all breakpoints without restarting MCP:

1. Navigate to page
2. Resize to mobile → take screenshot
3. Resize to tablet → take screenshot  
4. Resize to desktop → take screenshot
5. Compare all three

Screenshots save to: `test-output/screenshots/YYYY-MM-DD/`

### PWA Offline Testing

1. Navigate to surah with `browser_navigate`
2. Enable offline with `browser_set_offline_mode(offline: true)`
3. Verify content loads from service worker
4. Test IndexedDB persistence with marks
5. Re-enable online with `browser_set_offline_mode(offline: false)`

### Visual Regression Testing

1. Set headless mode for consistency:
   ```bash
   export OPENCODE_PLAYWRIGHT_HEADLESS=true
   ```

2. Navigate and capture screenshots at each breakpoint:
   ```
   browser_navigate(url: "http://localhost:5173/#/s/1")
   browser_resize(width: 393, height: 851)
   browser_take_screenshot
   browser_resize(width: 1280, height: 720)
   browser_take_screenshot
   ```

3. Find screenshots in: `test-output/screenshots/`

4. Compare screenshots across theme changes or refactors

### Debugging Mobile Issues

1. Start dev server: `pnpm dev`
2. Use default headed mode (browser visible)
3. Navigate to failing route
4. Resize to mobile: `browser_resize(width: 393, height: 851)`
5. Use browser tools to inspect elements
6. Check console logs in `test-output/logs/`

### Viewing Playwright Reports

After running E2E tests:

```bash
# View HTML report
npx playwright show-report test-output/report/

# Or serve manually
pnpm exec vite preview test-output/report/
```

### Analyzing Traces

When E2E tests fail, traces are saved to `test-output/traces/`:

```bash
# View a specific trace
npx playwright show-trace test-output/traces/trace-name.zip
```

## Available MCP Tools

### Navigation
- `browser_navigate(url)` - Load a page
- `browser_go_back` - Navigate back
- `browser_go_forward` - Navigate forward

### Viewport & Display
- `browser_resize(width, height)` - Change viewport size
- `browser_take_screenshot` - Capture screenshot (saves to `test-output/screenshots/`)
- `browser_set_viewport_size(width, height)` - Alternative resize

### PWA & Network
- `browser_set_offline_mode(offline)` - Toggle offline state
- `browser_clear_cache` - Clear browser cache
- `browser_reload` - Refresh page

### Debug & Inspection
- `browser_click(ref)` - Click element by reference
- `browser_type(ref, text)` - Type into input
- `browser_select_option(ref, value)` - Select dropdown option
- `browser_press_key(key)` - Send keystrokes
- `browser_scroll_up/down` - Scroll page

## Tips & Best Practices

### Before Using MCP
- **Start dev server:** `pnpm dev` before using MCP tools
- **Verify port:** Ensure port 5173 is available
- **Check logs:** Browser logs save to `test-output/logs/`

### Viewport Strategy
- **Start mobile-first:** QuranAtlas is mobile-optimized
- **Test breakpoints:** 393px (mobile), 768px (tablet), 1280px+ (desktop)
- **Use standard sizes:** Consistent with design breakpoints

### Screenshot Organization
- **Use descriptive names:** Request specific filenames when taking screenshots
- **Check gitignore:** Ensure sensitive screenshots aren't committed
- **Browse easily:** All screenshots in `test-output/screenshots/` (no hidden paths)

### Troubleshooting

**MCP server not starting:**
- Ensure dev server is running (`pnpm dev`)
- Check that port 5173 is available
- Restart OpenCode to reload MCP configuration

**Screenshots not saving:**
- Verify `test-output/screenshots/` exists (auto-created on first screenshot)
- Check write permissions
- Look for errors in OpenCode console

**Viewport not resizing:**
- Ensure page is fully loaded before resizing
- Some pages may have responsive breakpoints that affect layout
- Try refreshing after resize if layout doesn't update

**Offline mode not working:**
- Ensure service worker is registered (check DevTools → Application)
- Verify PWA manifest is present
- Clear browser cache if needed

**Can't find test artifacts:**
- Screenshots: `test-output/screenshots/`
- Playwright traces: `test-output/traces/`
- Browser logs: `test-output/logs/`
- HTML reports: `test-output/report/`

## Reference

### Environment Variables

| Variable | Effect | Default |
|----------|--------|---------|
| `OPENCODE_PLAYWRIGHT_HEADLESS` | Run browser headless | `false` |

### Standard Viewport Sizes

```javascript
// Mobile-first breakpoints used in QuranAtlas
const MOBILE = { width: 393, height: 851 };   // Pixel 5
const TABLET = { width: 768, height: 1024 };  // iPad Mini
const DESKTOP = { width: 1280, height: 720 }; // Desktop
```

### File Paths

```
Project Root
├── test-output/              # All test artifacts (visible, browsable)
│   ├── screenshots/         # MCP screenshots
│   ├── traces/              # Playwright traces
│   ├── logs/                # Browser console logs
│   └── report/              # HTML test reports
├── tests/
│   └── e2e/                 # E2E test files
├── .opencode/
│   ├── mcp/                 # MCP configuration (not artifacts)
│   └── opencode.json        # MCP configuration
└── docs/
    └── mcp-usage.md         # This file
```

### Migration from Legacy Locations

If you have artifacts in old locations, the cleanup scripts handle both:
- **Old:** `.opencode/mcp/screenshots/`, `test-screenshots/`, `test-results/`
- **New:** `test-output/screenshots/`, `test-output/traces/`

Both `pnpm mcp:cleanup` and `pnpm mcp:clean-all` clean legacy and new locations.

### Further Reading

- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)
- [MCP Browser Tools Reference](https://github.com/microsoft/playwright-mcp)
