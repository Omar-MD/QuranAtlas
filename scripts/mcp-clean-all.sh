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
