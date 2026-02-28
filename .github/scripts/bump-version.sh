#!/bin/bash
# bump-version.sh <bump-type>
# Reads frontend/package.json, applies semver bump, writes back, echoes new version.
# bump-type: patch | minor | major
set -euo pipefail

BUMP_TYPE="${1:-}"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
    echo "ERROR: bump-version.sh requires argument: patch | minor | major" >&2
    exit 1
fi

PACKAGE_FILE="frontend/package.json"

if [[ ! -f "$PACKAGE_FILE" ]]; then
    echo "ERROR: $PACKAGE_FILE not found" >&2
    exit 1
fi

CURRENT=$(node -p "require('./${PACKAGE_FILE}').version")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('${PACKAGE_FILE}', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('${PACKAGE_FILE}', JSON.stringify(pkg, null, 2) + '\n');
"

echo "$NEW_VERSION"
