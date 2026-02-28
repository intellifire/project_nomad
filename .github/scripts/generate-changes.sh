#!/bin/bash
# Generate CHANGES.md from git log on main branch
# Idempotent: full regeneration each time, no drift
# Groups commits under version headers detected from commit messages
set -euo pipefail

REPO_URL="https://github.com/WISE-Developers/project_nomad"
OUTPUT="${1:-CHANGES.md}"

# Read current version from frontend package.json for the top section
CURRENT_VERSION=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "unreleased")

{
    echo "# Project Nomad — Change Log"
    echo ""
    echo "Auto-generated from git history. Do not edit manually."
    echo ""
    echo "---"
    echo ""
    echo "## v${CURRENT_VERSION}"

    current_date=""

    git log main --format="%H|%an|%ai|%s" | while IFS='|' read -r hash author date message; do
        day="${date%% *}"
        time_part=$(echo "$date" | awk '{print $2}' | cut -d: -f1-2)
        short_hash="${hash:0:7}"

        # Detect version bump commits
        version=""
        if echo "$message" | grep -qiE "^bump (version to|frontend to) v?"; then
            version=$(echo "$message" | grep -oiE 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        elif echo "$message" | grep -qiE "^chore:.*bump to v"; then
            version=$(echo "$message" | grep -oiE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        fi

        # Normalize version prefix
        if [ -n "$version" ]; then
            case "$version" in
                v*) ;;
                *)  version="v${version}" ;;
            esac
        fi

        # Print version header when a version bump is detected
        if [ -n "$version" ]; then
            current_date=""
            echo ""
            echo "---"
            echo ""
            echo "## ${version}"
        fi

        # Print date subheader when date changes
        if [ "$day" != "$current_date" ]; then
            current_date="$day"
            echo ""
            echo "### ${day}"
            echo ""
        fi

        echo "- [\`${short_hash}\`](${REPO_URL}/commit/${hash}) ${message} — *${author}, ${time_part}*"
    done
} > "$OUTPUT"

echo "Generated $OUTPUT ($(wc -l < "$OUTPUT" | tr -d ' ') lines)"
