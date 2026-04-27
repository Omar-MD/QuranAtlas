#!/usr/bin/env bash
# SessionStart hook: surface open Dependabot + CodeQL code-scanning alerts for
# the current repo. Emits JSON with additionalContext → Claude sees the alert
# summary at session start and can propose/open fixes in-session.
# Fails silently on anything unexpected (no gh, no auth, no repo, no alerts),
# so the hook never blocks a session for setup reasons.

set -u

# Resolve repo from the working directory so the hook works across forks/renames.
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null) || exit 0
[ -z "$repo" ] && exit 0

# ---- Dependabot (dependency vulnerabilities) ----
dep_alerts=$(gh api "/repos/$repo/dependabot/alerts?state=open&per_page=30" 2>/dev/null) || dep_alerts='[]'
dep_count=$(printf '%s' "$dep_alerts" | jq 'length' 2>/dev/null) || dep_count=0

dep_summary=""
if [ "${dep_count:-0}" -gt 0 ]; then
  dep_summary=$(printf '%s' "$dep_alerts" | jq -r '
    map("- [\(.security_advisory.severity // "?" | ascii_upcase)] \(.dependency.package.ecosystem // "?"):\(.dependency.package.name // "?") — \(.security_advisory.summary // "(no summary)") — CVE: \(.security_advisory.cve_id // "n/a")") | join("\n")
  ')
fi

# ---- CodeQL code-scanning (source-level findings) ----
# Only the `open` state matters; dismissed/fixed alerts are ignored.
cs_alerts=$(gh api "/repos/$repo/code-scanning/alerts?state=open&per_page=50" 2>/dev/null) || cs_alerts='[]'
cs_count=$(printf '%s' "$cs_alerts" | jq 'length' 2>/dev/null) || cs_count=0

cs_summary=""
if [ "${cs_count:-0}" -gt 0 ]; then
  cs_summary=$(printf '%s' "$cs_alerts" | jq -r '
    map("- [\(.rule.severity // "?" | ascii_upcase)] \(.rule.id // "?") — \(.most_recent_instance.location.path // "?"):\(.most_recent_instance.location.start_line // 0) — \(.most_recent_instance.message.text // "(no message)" | gsub("\n"; " ") | .[0:140])") | join("\n")
  ')
fi

# ---- Compose context (only emit if at least one alert is open) ----
total=$((dep_count + cs_count))
[ "$total" -eq 0 ] && exit 0

context="[SECURITY] $repo has open security alerts:"

if [ "${dep_count:-0}" -gt 0 ]; then
  context="$context

DEPENDABOT ($dep_count open):
$dep_summary"
fi

if [ "${cs_count:-0}" -gt 0 ]; then
  context="$context

CODEQL CODE SCANNING ($cs_count open):
$cs_summary"
fi

context="$context

ACTION REQUIRED: At the very start of your first response in this session,
notify the user of these alerts. Use a brief heading per source (Dependabot
and/or CodeQL), then one line per alert with severity in brackets and a
concise (<=15 word) description — do not paste the raw summary, CVE IDs, or
file paths unless asked. Then ask whether they want to address any now. If
yes, propose a targeted plan before editing files (Dependabot: bump the
affected package and PR into dev per CLAUDE.md Rule 6, or merge the pending
auto-PR; CodeQL: fix the source-level issue and PR into dev)."

jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
