# MCP Usage Guide

## Available MCP Profiles

QuranAtlas has 5 Playwright MCP profiles for different testing scenarios:

### 1. playwright-mobile
- **Device:** Pixel 5 (393x851)
- **Mode:** Headed (visible browser)
- **Use for:** Mobile debugging, touch interaction testing
- **Best when:** Investigating mobile-specific issues, testing PWA install flow

### 2. playwright-tablet
- **Device:** iPad Mini (768x1024)
- **Mode:** Headed
- **Use for:** Tablet layout testing, larger touch targets
- **Best when:** Testing responsive breakpoints between mobile and desktop

### 3. playwright-desktop
- **Device:** Desktop (1280x720)
- **Mode:** Headed
- **Use for:** Desktop debugging, keyboard navigation
- **Best when:** Testing hover states, keyboard shortcuts, developer tools

### 4. playwright-ci
- **Device:** Pixel 5 (393x851)
- **Mode:** Headless (invisible, faster)
- **Use for:** Automated testing, visual regression
- **Best when:** Running consistent screenshots, CI/CD pipelines

### 5. playwright-offline
- **Device:** Pixel 5 (393x851)
- **Mode:** Headed
- **Use for:** PWA offline testing, service worker verification
- **Best when:** Testing IndexedDB persistence, cache behavior

## Switching Between Profiles

In OpenCode, you can switch between MCP profiles in two ways:

### Method 1: Via MCP UI

1. Look for the **MCP** icon in the OpenCode toolbar/interface
2. Click to see available MCP servers
3. Select the profile you want (e.g., `playwright-mobile`)
4. The profile will be active for your next browser automation request

### Method 2: Via Prompt

Mention the profile name in your request:

```
Using playwright-mobile, navigate to /#/s/112 and take a screenshot
```

Or switch profiles mid-conversation:

```
Switch to playwright-desktop and check the settings page layout
```

### Profile Indicators

Each profile has distinct characteristics:

- **Headed profiles** (mobile, tablet, desktop, offline): Browser window visible
- **Headless profile** (ci): No visible window, runs in background
- **Offline profile**: Can toggle network state via MCP tools

### Quick Reference

| To test... | Use this profile |
|------------|------------------|
| Mobile UI bugs | `playwright-mobile` |
| Tablet layout | `playwright-tablet` |
| Keyboard shortcuts | `playwright-desktop` |
| Consistent screenshots | `playwright-ci` |
| Offline PWA mode | `playwright-offline` |

## Common Workflows

### Debug a Failing E2E Test

1. Run the test to see the error:
   ```bash
   pnpm test:e2e -- reader-experience.spec.js
   ```

2. Use MCP with headed browser to investigate:
   - Select `playwright-mobile` profile
   - Navigate to the failing page
   - Use browser tools to inspect elements
   - Check console for JavaScript errors
   - Take screenshots for comparison

### Test PWA Offline Mode

1. Use `playwright-offline` profile
2. Navigate to a surah (e.g., `/#/s/112`)
3. Toggle offline mode using MCP tools
4. Verify content loads from service worker cache
5. Test mark persistence in IndexedDB

### Visual Regression Testing

1. Use `playwright-ci` profile for consistency
2. Take screenshots of key pages:
   - Surah reader with different themes
   - Navigation panel
   - Settings page
3. Compare across theme changes or refactors

## Screenshot Management

Screenshots are automatically saved when using MCP browser tools.

### Location
`.opencode/mcp/screenshots/`

### Cleanup Commands

```bash
# Remove screenshots older than 7 days
pnpm mcp:cleanup

# Remove ALL screenshots (with confirmation)
pnpm mcp:clean-all
```

### Git
Screenshots are automatically gitignored and will not be committed.

## Tips

- **Start dev server first:** `pnpm dev` before using MCP
- **Mobile profile most used:** QuranAtlas is mobile-first, start there
- **Offline profile for PWA:** Use this to verify offline functionality
- **CI profile for consistency:** Same viewport and headless mode every time
- **Screenshots auto-cleanup:** Run `pnpm mcp:cleanup` periodically

## Troubleshooting

### MCP server not starting
- Ensure dev server is running (`pnpm dev`)
- Check that port 5173 is available
- Restart OpenCode to reload MCP configuration

### Screenshots not saving
- Verify `.opencode/mcp/screenshots/` directory exists
- Check write permissions
- Look for errors in OpenCode console

### Offline mode not working
- Ensure service worker is registered
- Test in `playwright-offline` profile specifically
- Clear browser cache if needed
