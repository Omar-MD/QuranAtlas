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
