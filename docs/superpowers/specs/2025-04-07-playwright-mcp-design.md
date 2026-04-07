# Optimized Playwright MCP Setup for QuranAtlas

**Date:** 2025-04-07  
**Status:** Design Ready for Review  
**Approach:** Multiple MCP Profiles

## Overview

This design optimizes the Playwright MCP server configuration for QuranAtlas's specific needs as a mobile-first PWA Quran reader. The setup supports debugging, visual regression testing, offline PWA verification, and multi-device testing.

## Goals

1. **Multi-device testing** - Support mobile, tablet, and desktop viewports
2. **Flexible headless/headed modes** - Headless for CI/automation, headed for debugging
3. **PWA offline testing** - Verify service worker and offline functionality
4. **Screenshot management** - Auto-capture with automatic cleanup
5. **Integration** - Work seamlessly with existing `playwright.config.js`

## Architecture

### MCP Profiles (opencode.json)

Five specialized MCP profiles for different testing scenarios:

| Profile | Device | Viewport | Headless | Purpose |
|---------|--------|----------|----------|---------|
| `playwright-mobile` | Pixel 5 | 393x851 | false | Mobile debugging |
| `playwright-tablet` | iPad Mini | 768x1024 | false | Tablet debugging |
| `playwright-desktop` | Desktop | 1280x720 | false | Desktop debugging |
| `playwright-ci` | Pixel 5 | 393x851 | true | CI/automated testing |
| `playwright-offline` | Pixel 5 | 393x851 | false | PWA offline testing |

### File Structure

```
.opencode/
├── opencode.json          # MCP profile configurations
└── mcp/
    ├── screenshots/       # Auto-created, gitignored
    └── scripts/
        ├── cleanup-screenshots.sh
        └── setup-offline.js
```

### Profile Configuration Details

Each profile includes:
- **Viewport size** matching device
- **User agent** for proper device detection
- **Screenshot directory** organized by profile name
- **Base URL** pointing to `http://localhost:5173`
- **Offline capabilities** (for offline profile)

## Features

### 1. Multi-Device Testing

Profiles provide consistent device emulation:
- **Mobile**: Tests touch interactions, viewport constraints, PWA install flow
- **Tablet**: Tests larger touch targets, two-column layouts
- **Desktop**: Tests keyboard navigation, hover states

### 2. Screenshot Management

- Screenshots saved to `.opencode/mcp/screenshots/<profile-name>/`
- Timestamped filenames: `screenshot-2025-04-07T10-30-00.png`
- Cleanup script: `pnpm mcp:cleanup` removes screenshots older than 7 days
- Gitignored to prevent repo bloat

### 3. Offline Testing Support

The `playwright-offline` profile:
- Starts browser with offline capabilities enabled
- Can toggle network state via MCP tools
- Verifies service worker cache behavior
- Tests IndexedDB persistence

### 4. CI Integration

The `playwright-ci` profile:
- Runs headless for speed
- Uses same viewport as mobile tests
- Compatible with existing `playwright.config.js`
- Can be used in GitHub Actions

## Integration with Existing Tests

### Shared Configuration

MCP profiles reference existing Playwright configuration:
- Base URL: `http://localhost:5173` (matches `webServer` config)
- Viewports align with test projects in `playwright.config.js`
- Screenshot behavior consistent with E2E tests

### Development Workflow

1. **Feature development**: Use `playwright-mobile` for manual testing
2. **Debug failing tests**: Use `playwright-desktop` for easier inspection
3. **PWA verification**: Use `playwright-offline` to test service worker
4. **Visual regression**: Use `playwright-ci` for consistent screenshots
5. **Cross-device check**: Switch between mobile/tablet/desktop profiles

## Usage Examples

### Manual Testing Session

```bash
# Start dev server
pnpm dev

# Use MCP in OpenCode with mobile profile
# - Navigate to surah
# - Toggle themes
# - Take screenshots
# - Verify responsive design
```

### Debug Failing E2E Test

```bash
# Run specific test to see failure
pnpm test:e2e -- reader-experience.spec.js

# Use MCP with headed browser to investigate
# - Navigate to failing page
# - Inspect elements
# - Check console errors
# - Screenshot current state
```

### Offline PWA Testing

```bash
# Use offline profile
# - Navigate to reader
# - Toggle offline mode
# - Verify content loads from cache
# - Test mark persistence in IndexedDB
```

## Screenshot Cleanup Strategy

### Automatic Cleanup

- Screenshots older than 7 days auto-deleted via `pnpm mcp:cleanup`
- Can be run manually or added to pre-commit hook
- `.opencode/mcp/screenshots/` fully gitignored

### Manual Cleanup

```bash
pnpm mcp:cleanup     # Remove old screenshots
pnpm mcp:clean-all   # Remove all screenshots
```

## Environment Variables

Optional environment variables for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_SCREENSHOT_DIR` | `.opencode/mcp/screenshots` | Screenshot base directory |
| `MCP_SCREENSHOT_RETENTION_DAYS` | `7` | Days to keep screenshots |
| `MCP_BASE_URL` | `http://localhost:5173` | Dev server URL |

## Implementation Plan

### Phase 1: MCP Configuration
1. Update `.opencode/opencode.json` with 5 profiles
2. Add screenshot directory structure
3. Create `.gitignore` entries

### Phase 2: Helper Scripts
1. Add `mcp:cleanup` npm script
2. Add `mcp:clean-all` npm script
3. Create offline testing utilities

### Phase 3: Documentation
1. Add MCP usage section to README
2. Document each profile's use case
3. Add troubleshooting guide

## Success Criteria

- [ ] All 5 MCP profiles load successfully in OpenCode
- [ ] Screenshots save to correct directories
- [ ] Cleanup scripts work as expected
- [ ] Offline profile can toggle network state
- [ ] CI profile runs headless without errors
- [ ] Mobile/tablet/desktop viewports match real devices
- [ ] No screenshots committed to git

## Future Enhancements

- Video recording support for test debugging
- Network throttling profiles (slow 3G, fast 4G)
- Geolocation mocking for location-based features
- Device orientation changes (portrait/landscape)
