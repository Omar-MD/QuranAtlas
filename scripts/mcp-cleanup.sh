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
