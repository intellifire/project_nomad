#!/bin/bash
#
# Project Nomad Quick Install
# One-line installer: curl -fsSL ... | bash
#
# This is a minimal wrapper that downloads the full bootstrap script
# and executes it. For the full installer with all options, use
# install-nomad-bootstrap.sh directly.
#

set -e

# URL to the full bootstrap script
# Uses curl-installer branch for testing; will be main after merge
BOOTSTRAP_URL="https://raw.githubusercontent.com/WISE-Developers/project_nomad/curl-installer/scripts/install-nomad-bootstrap.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Download the bootstrap script to a temp file
download_bootstrap() {
    local temp_file
    temp_file=$(mktemp -t nomad_bootstrap.XXXXXX)

    if command -v curl &> /dev/null; then
        print_info "Using curl" >&2
        curl -fsSL "$BOOTSTRAP_URL" -o "$temp_file"
    elif command -v wget &> /dev/null; then
        print_info "Using wget" >&2
        wget -q "$BOOTSTRAP_URL" -O "$temp_file"
    else
        print_error "Neither curl nor wget is installed" >&2
        echo "" >&2
        echo "Please install curl or wget and try again:" >&2
        echo "  Ubuntu/Debian: sudo apt-get install curl" >&2
        echo "  macOS: brew install curl" >&2
        echo "  RHEL/CentOS: sudo yum install curl" >&2
        rm -f "$temp_file"
        exit 1
    fi

    echo "$temp_file"
}

# Main
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Project Nomad - Quick Install                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_info "This will download and install Project Nomad"
print_info "Installer source: $BOOTSTRAP_URL"
echo ""

# Check if stdin is a terminal (required for interactive installer)
if [ ! -t 0 ]; then
    echo -e "${RED}✖${NC} Interactive input required"
    echo ""
    echo "The Nomad installer requires user interaction and cannot run via 'curl | bash'."
    echo ""
    echo "Instead, download the script first, then run it:"
    echo ""
    echo "  curl -fsSL $BOOTSTRAP_URL -o install-nomad.sh"
    echo "  bash install-nomad.sh"
    echo ""
    echo "Or force terminal access (Linux/macOS only):"
    echo "  curl -fsSL $BOOTSTRAP_URL | bash < /dev/tty"
    echo ""
    exit 1
fi

print_step "Downloading Nomad installer..."
BOOTSTRAP_FILE=$(download_bootstrap)

print_info "Bootstrap script downloaded to: $BOOTSTRAP_FILE"
echo ""

# Execute the bootstrap script with all arguments
# Use exec to replace this process so signals propagate correctly
exec bash "$BOOTSTRAP_FILE" "$@"
