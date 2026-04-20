#!/usr/bin/env bash
# SessionStart hook: surface open Dependabot alerts for the current repo.
# Emits JSON with additionalContext → Claude sees the alert summary at
# session start and can propose/open fixes in-session.
# Fails silently on anything unexpected (no gh, no auth, no repo, no alerts),
# so the hook never blocks a session for setup reasons.

set -u

# Resolve repo from the working directory so the hook works across forks/renames.
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null) || exit 0
[ -z "$repo" ] && exit 0

alerts=$(gh api "/repos/$repo/dependabot/alerts?state=open&per_page=30" 2>/dev/null) || exit 0
count=$(printf '%s' "$alerts" | jq 'length' 2>/dev/null) || exit 0
[ "${count:-0}" -eq 0 ] && exit 0

summary=$(printf '%s' "$alerts" | jq -r '
  map("- [\(.security_advisory.severity // "?" | ascii_upcase)] \(.dependency.package.ecosystem // "?"):\(.dependency.package.name // "?") — \(.security_advisory.summary // "(no summary)") — CVE: \(.security_advisory.cve_id // "n/a")") | join("\n")
')

context="[DEPENDABOT] $count open Dependabot alert(s) on $repo:

$summary

ACTION REQUIRED: At the very start of your first response in this session,
notify the user of these alerts. Use a brief heading, then one line per alert
with severity in brackets and a concise (<=15 word) description — do not paste
the raw summary or CVE IDs unless asked. Then ask whether they want to address
any now. If yes, propose a targeted plan before editing files (bump the
affected package in the appropriate lockfile and PR into dev per CLAUDE.md
Rule 5, or merge the pending Dependabot auto-PR)."

jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
