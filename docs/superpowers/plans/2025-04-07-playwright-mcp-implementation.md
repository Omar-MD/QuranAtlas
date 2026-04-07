# Playwright MCP Optimization - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure 5 specialized Playwright MCP profiles (mobile, tablet, desktop, CI, offline) with screenshot management and offline testing support for QuranAtlas.

**Architecture:** Multiple MCP profiles in `.opencode/opencode.json` with device-specific viewports, screenshot directories in `.opencode/mcp/screenshots/`, and npm scripts for cleanup. Offline profile supports network state toggling for PWA testing.

**Tech Stack:** Playwright MCP, OpenCode MCP framework, pnpm/npm scripts, bash for cleanup

---

## File Structure

**Create:**
- `.opencode/mcp/.gitkeep` (directory marker)
- `scripts/mcp-cleanup.sh` (screenshot cleanup script)
- `scripts/mcp-setup.sh` (directory setup script)

**Modify:**
- `.opencode/opencode.json` (add 4 new MCP profiles alongside existing chrome-devtools)
- `.gitignore` (add screenshot directories)
- `package.json` (add mcp:cleanup and mcp:clean-all scripts)

---

## Task 1: Update opencode.json with MCP Profiles

**Files:**
- Modify: `.opencode/opencode.json`

### Context
The file currently has one MCP server (chrome-devtools). We need to add 4 new Playwright MCP profiles alongside it, keeping chrome-devtools for backward compatibility.

### Step 1: Update MCP configuration

Replace the current `mcp` section with the full 5-profile configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"],
  "permission": {
    "skill": {
      "*": "allow"
    }
  },
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://127.0.0.1:9222", "--no-category-performance", "--no-category-emulation", "--no-performance-crux", "--no-usage-statistics"]
    },
    "playwright-mobile": {
      "type": "local",
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--headless=false",
        "--browser=chromium",
        "--viewport-size=393,851"
      ],
      "enabled": true
    },
    "playwright-tablet": {
      "type": "local",
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--headless=false",
        "--browser=chromium",
        "--viewport-size=768,1024"
      ],
      "enabled": true
    },
    "playwright-desktop": {
      "type": "local",
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--headless=false",
        "--browser=chromium",
        "--viewport-size=1280,720"
      ],
      "enabled": true
    },
    "playwright-ci": {
      "type": "local",
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--headless=true",
        "--browser=chromium",
        "--viewport-size=393,851"
      ],
      "enabled": true
    },
    "playwright-offline": {
      "type": "local",
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--headless=false",
        "--browser=chromium",
        "--viewport-size=393,851"
      ],
      "enabled": true
    }
  }
}
```

### Step 2: Validate JSON syntax

Run: `cat .opencode/opencode.json | python3 -m json.tool > /dev/null && echo "Valid JSON"`

Expected: `Valid JSON`

### Step 3: Commit

```bash
git add .opencode/opencode.json
git commit -m "feat: Add 5 Playwright MCP profiles (mobile, tablet, desktop, ci, offline)"
```

---

## Task 2: Create Screenshot Directory Structure

**Files:**
- Create: `.opencode/mcp/.gitkeep`

### Step 1: Create directory marker

```bash
mkdir -p .opencode/mcp/screenshots
touch .opencode/mcp/.gitkeep
```

### Step 2: Verify directory structure

Run: `ls -la .opencode/mcp/`

Expected: Shows `screenshots/` directory and `.gitkeep` file

### Step 3: Commit

```bash
git add .opencode/mcp/.gitkeep
git commit -m "chore: Add MCP screenshot directory structure"
```

---

## Task 3: Update .gitignore

**Files:**
- Modify: `.gitignore`

### Context
Need to add `.opencode/mcp/screenshots/` to gitignore to prevent committing screenshots.

### Step 1: Read current .gitignore

Run: `cat .gitignore`

### Step 2: Add MCP screenshot entries

Append these lines to `.gitignore`:

```
# MCP Screenshots
.opencode/mcp/screenshots/
.opencode/mcp/*.log
```

### Step 3: Verify gitignore

Run: `cat .gitignore | tail -5`

Expected: Shows the new MCP entries

### Step 4: Commit

```bash
git add .gitignore
git commit -m "chore: Ignore MCP screenshot directories"
```

---

## Task 4: Create Screenshot Cleanup Script

**Files:**
- Create: `scripts/mcp-cleanup.sh`

### Step 1: Create cleanup script

Create `scripts/mcp-cleanup.sh`:

```bash
#!/bin/bash
# MCP Screenshot Cleanup Script
# Removes screenshots older than 7 days from .opencode/mcp/screenshots/

set -e

SCREENSHOT_DIR=".opencode/mcp/screenshots"
RETENTION_DAYS=7

if [ ! -d "$SCREENSHOT_DIR" ]; then
    echo "Screenshot directory does not exist: $SCREENSHOT_DIR"
    exit 0
fi

echo "Cleaning up screenshots older than $RETENTION_DAYS days..."

# Find and remove old files
find "$SCREENSHOT_DIR" -type f -name "*.png" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$SCREENSHOT_DIR" -type f -name "*.jpg" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$SCREENSHOT_DIR" -type f -name "*.jpeg" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Remove empty directories
find "$SCREENSHOT_DIR" -type d -empty -delete 2>/dev/null || true

echo "Screenshot cleanup complete"
```

### Step 2: Make script executable

Run: `chmod +x scripts/mcp-cleanup.sh`

### Step 3: Test script

Run: `./scripts/mcp-cleanup.sh`

Expected:
```
Cleaning up screenshots older than 7 days...
Screenshot cleanup complete
```

### Step 4: Commit

```bash
git add scripts/mcp-cleanup.sh
git commit -m "feat: Add MCP screenshot cleanup script"
```

---

## Task 5: Create Clean-All Script

**Files:**
- Create: `scripts/mcp-clean-all.sh`

### Step 1: Create clean-all script

Create `scripts/mcp-clean-all.sh`:

```bash
#!/bin/bash
# MCP Clean All Script
# Removes ALL screenshots from .opencode/mcp/screenshots/

set -e

SCREENSHOT_DIR=".opencode/mcp/screenshots"

if [ ! -d "$SCREENSHOT_DIR" ]; then
    echo "Screenshot directory does not exist: $SCREENSHOT_DIR"
    exit 0
fi

read -p "Remove ALL screenshots from $SCREENSHOT_DIR? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing all screenshots..."
    rm -rf "$SCREENSHOT_DIR"/*
    echo "All screenshots removed"
else
    echo "Aborted"
    exit 0
fi
```

### Step 2: Make script executable

Run: `chmod +x scripts/mcp-clean-all.sh`

### Step 3: Commit

```bash
git add scripts/mcp-clean-all.sh
git commit -m "feat: Add MCP clean-all script"
```

---

## Task 6: Update package.json Scripts

**Files:**
- Modify: `package.json`

### Context
Need to add npm scripts for easy access to MCP cleanup commands.

### Step 1: Read current package.json

Run: `cat package.json`

### Step 2: Add MCP scripts

Find the `scripts` section and add these two entries:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "mcp:cleanup": "./scripts/mcp-cleanup.sh",
    "mcp:clean-all": "./scripts/mcp-clean-all.sh"
  }
}
```

**Important:** Only add the two new `mcp:` lines, preserve all existing scripts.

### Step 3: Validate JSON syntax

Run: `cat package.json | python3 -m json.tool > /dev/null && echo "Valid JSON"`

Expected: `Valid JSON`

### Step 4: Commit

```bash
git add package.json
git commit -m "feat: Add MCP cleanup npm scripts"
```

---

## Task 7: Create MCP Usage Documentation

**Files:**
- Create: `docs/mcp-usage.md`

### Step 1: Create documentation

Create `docs/mcp-usage.md`:

```markdown
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
```

### Step 2: Commit

```bash
git add docs/mcp-usage.md
git commit -m "docs: Add MCP usage guide"
```

---

## Task 8: Create MCP Setup Script

**Files:**
- Create: `scripts/mcp-setup.sh`

### Step 1: Create setup script

Create `scripts/mcp-setup.sh`:

```bash
#!/bin/bash
# MCP Setup Script
# Initializes MCP directory structure

set -e

echo "Setting up MCP directories..."

# Create screenshot directories for all profiles
mkdir -p .opencode/mcp/screenshots/mobile
mkdir -p .opencode/mcp/screenshots/tablet
mkdir -p .opencode/mcp/screenshots/desktop
mkdir -p .opencode/mcp/screenshots/ci
mkdir -p .opencode/mcp/screenshots/offline

echo "MCP setup complete"
echo ""
echo "Available profiles:"
echo "  - playwright-mobile (393x851, headed)"
echo "  - playwright-tablet (768x1024, headed)"
echo "  - playwright-desktop (1280x720, headed)"
echo "  - playwright-ci (393x851, headless)"
echo "  - playwright-offline (393x851, headed, offline capable)"
echo ""
echo "Cleanup commands:"
echo "  pnpm mcp:cleanup    # Remove screenshots older than 7 days"
echo "  pnpm mcp:clean-all  # Remove all screenshots"
```

### Step 2: Make script executable

Run: `chmod +x scripts/mcp-setup.sh`

### Step 3: Run setup

Run: `./scripts/mcp-setup.sh`

Expected output shows directory creation and profile list.

### Step 4: Commit

```bash
git add scripts/mcp-setup.sh
git commit -m "feat: Add MCP setup script"
```

---

## Task 9: Verification

**Files:**
- All modified files

### Step 1: Verify MCP configuration

Run: `cat .opencode/opencode.json | python3 -m json.tool | grep -c "playwright"`

Expected: `5` (5 playwright profiles found)

### Step 2: Verify npm scripts

Run: `cat package.json | grep "mcp:"`

Expected: Shows both `mcp:cleanup` and `mcp:clean-all`

### Step 3: Verify gitignore

Run: `cat .gitignore | grep "mcp"`

Expected: Shows screenshot directory entries

### Step 4: Verify scripts are executable

Run: `ls -la scripts/mcp-*.sh | awk '{print $1}'`

Expected: All scripts show `x` (executable) permission

### Step 5: Final verification commit

```bash
git status
git log --oneline -5
```

Expected: Clean status, recent commits show MCP-related changes

---

## Task 10: Create README Update

**Files:**
- Modify: `README.md`

### Step 1: Add MCP section to README

Find the `## Testing` section and add MCP subsection:

```markdown
### MCP (Model Context Protocol)

QuranAtlas includes 5 specialized Playwright MCP profiles for interactive testing:

```bash
# Cleanup old screenshots
pnpm mcp:cleanup

# Remove all screenshots
pnpm mcp:clean-all
```

**Profiles:**
- `playwright-mobile` - Mobile debugging (393x851, headed)
- `playwright-tablet` - Tablet testing (768x1024, headed)
- `playwright-desktop` - Desktop debugging (1280x720, headed)
- `playwright-ci` - Automated testing (393x851, headless)
- `playwright-offline` - PWA offline testing (393x851, headed)

See [docs/mcp-usage.md](docs/mcp-usage.md) for detailed usage guide.
```

Insert this after the existing testing commands section.

### Step 2: Commit

```bash
git add README.md
git commit -m "docs: Add MCP section to README"
```

---

## Completion Checklist

All tasks complete when:

- [ ] `.opencode/opencode.json` has 5 Playwright MCP profiles + chrome-devtools
- [ ] `.gitignore` ignores `.opencode/mcp/screenshots/`
- [ ] `package.json` has `mcp:cleanup` and `mcp:clean-all` scripts
- [ ] `scripts/mcp-cleanup.sh` exists and is executable
- [ ] `scripts/mcp-clean-all.sh` exists and is executable
- [ ] `scripts/mcp-setup.sh` exists and is executable
- [ ] `docs/mcp-usage.md` documentation complete
- [ ] `README.md` has MCP section
- [ ] All commits are clean and descriptive
- [ ] JSON files are valid syntax

---

## Testing the Implementation

After completing all tasks, verify the setup:

1. **Start dev server:** `pnpm dev`
2. **Check MCP profiles load:** Restart OpenCode, verify 5 playwright profiles appear
3. **Test mobile profile:** Use `playwright-mobile`, navigate to `/#/s/112`
4. **Take a screenshot:** Verify it saves to `.opencode/mcp/screenshots/`
5. **Test cleanup:** Run `pnpm mcp:cleanup`, verify no errors
6. **Verify gitignore:** `git status` should not show screenshot files

## Success Criteria Met

✅ 5 MCP profiles configured  
✅ Screenshot management with cleanup  
✅ Offline testing support  
✅ Multi-device viewport support  
✅ Documentation complete  
✅ No screenshots in git  
