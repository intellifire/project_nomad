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
BOOTSTRAP_URL="https://raw.githubusercontent.com/WISE-Developers/project_nomad/main/scripts/install-nomad-bootstrap.sh"

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

# Check for curl or wget
download_and_run() {
    print_step "Downloading Nomad installer..."

    if command -v curl &> /dev/null; then
        print_info "Using curl"
        exec bash -c "$(curl -fsSL '$BOOTSTRAP_URL')" - "$@"
    elif command -v wget &> /dev/null; then
        print_info "Using wget"
        exec bash -c "$(wget -qO- '$BOOTSTRAP_URL')" - "$@"
    else
        print_error "Neither curl nor wget is installed"
        echo ""
        echo "Please install curl or wget and try again:"
        echo "  Ubuntu/Debian: sudo apt-get install curl"
        echo "  macOS: brew install curl"
        echo "  RHEL/CentOS: sudo yum install curl"
        exit 1
    fi
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

# Pass all arguments through to the bootstrap script
download_and_run "$@"
