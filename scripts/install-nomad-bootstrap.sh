#!/bin/bash
#
# Project Nomad Bootstrap Installer
# Downloads Nomad from GitHub releases and runs the installer without requiring git clone
#
# Usage:
#   curl -fsSL https://.../install-nomad-bootstrap.sh | bash
#   wget -qO- https://.../install-nomad-bootstrap.sh | bash
#
# Options:
#   --version v0.4.2    Install specific version (default: latest)
#   --dir /path         Install to specific directory (default: ./project_nomad)
#   --dry-run           Show what would be done without making changes
#   --help              Show usage information
#

set -e

# Script metadata
SCRIPT_VERSION="1.0.0"
REPO_OWNER="WISE-Developers"
REPO_NAME="project_nomad"
GITHUB_API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"
GITHUB_RAW_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}"

# Default configuration
VERSION="latest"
INSTALL_DIR=""
DRY_RUN=false
CLEANUP_TEMP=true
TEMP_DIR=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ============================================
# Print Functions
# ============================================

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║      Project Nomad Bootstrap Installer v${SCRIPT_VERSION}           ║"
    echo "║         Fire Modeling System - Curl Installable            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

print_success() {
    echo -e "${GREEN}✔${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_dry_run() {
    echo -e "${MAGENTA}[DRY RUN]${NC} $1"
}

# ============================================
# Usage
# ============================================

show_usage() {
    cat << EOF
Usage: install-nomad-bootstrap.sh [OPTIONS]

Bootstrap installer for Project Nomad. Downloads the Nomad source from
GitHub releases and runs the installer without requiring git clone.

Options:
  --version v0.4.2    Install specific version (default: latest)
  --dir /path         Install to specific directory (default: ./project_nomad)
  --dry-run           Show what would be done without making changes
  --help, -h          Show this help message

Examples:
  # Install latest version
  curl -fsSL https://.../install-nomad-bootstrap.sh | bash

  # Install specific version
  curl -fsSL ... | bash -s -- --version v0.4.2

  # Dry run
  wget -qO- ... | bash -s -- --dry-run

  # Install to specific directory
  curl ... | bash -s -- --dir /opt/nomad

EOF
}

# ============================================
# Argument Parsing
# ============================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run with --help for usage information"
                exit 1
                ;;
        esac
    done

    # Set default install directory if not specified
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="./project_nomad"
    fi

    # Expand ~ if present
    INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"

    # Convert to absolute path if relative
    if [[ ! "$INSTALL_DIR" = /* ]]; then
        INSTALL_DIR="$(pwd)/$INSTALL_DIR"
    fi
}

# ============================================
# Prerequisites
# ============================================

check_prerequisites() {
    print_step "Checking prerequisites..."

    local missing=()

    # Check for curl or wget
    if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
        missing+=("curl or wget")
    fi

    # Check for tar
    if ! command -v tar &> /dev/null; then
        missing+=("tar")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing[*]}"
        echo ""
        echo "Please install the missing dependencies and try again:"
        echo "  - Ubuntu/Debian: sudo apt-get install curl tar"
        echo "  - macOS: brew install curl tar"
        echo "  - RHEL/CentOS: sudo yum install curl tar"
        exit 1
    fi

    print_success "Prerequisites satisfied"
}

# ============================================
# Download Functions
# ============================================

detect_downloader() {
    if command -v curl &> /dev/null; then
        echo "curl"
    elif command -v wget &> /dev/null; then
        echo "wget"
    else
        echo "none"
    fi
}

# Download with curl or wget
download_file() {
    local url="$1"
    local output="$2"
    local silent="${3:-false}"

    local downloader
    downloader=$(detect_downloader)

    if [ "$downloader" = "curl" ]; then
        if [ "$silent" = "true" ]; then
            curl -fsSL "$url" -o "$output"
        else
            curl -fSL --progress-bar "$url" -o "$output"
        fi
    elif [ "$downloader" = "wget" ]; then
        if [ "$silent" = "true" ]; then
            wget -q "$url" -O "$output"
        else
            wget --show-progress "$url" -O "$output"
        fi
    else
        print_error "No downloader available (curl or wget required)"
        return 1
    fi
}

# Download JSON (silent)
download_json() {
    local url="$1"
    download_file "$url" - true
}

# ============================================
# Version Resolution
# ============================================

get_latest_version() {
    # Output progress to stderr to avoid polluting return value
    print_step "Fetching latest release version..." >&2

    local api_url="${GITHUB_API_URL}/releases/latest"
    local response

    if command -v curl &> /dev/null; then
        response=$(curl -fsSL "$api_url" 2>/dev/null || echo "")
    elif command -v wget &> /dev/null; then
        response=$(wget -qO- "$api_url" 2>/dev/null || echo "")
    fi

    if [ -z "$response" ]; then
        print_error "Failed to fetch latest version from GitHub API"
        echo ""
        echo "This could be due to:"
        echo "  - Network connectivity issues"
        echo "  - GitHub API rate limiting"
        echo "  - No releases published yet"
        echo ""
        echo "Try specifying a version explicitly:"
        echo "  curl ... | bash -s -- --version v0.4.2"
        exit 1
    fi

    # Extract tag_name from JSON response
    local version
    version=$(echo "$response" | grep -o '"tag_name": "[^"]*"' | head -1 | sed 's/.*: "\(.*\)".*/\1/')

    if [ -z "$version" ]; then
        print_error "Could not parse version from GitHub API response"
        exit 1
    fi

    echo "$version"
}

resolve_version() {
    if [ "$VERSION" = "latest" ]; then
        VERSION=$(get_latest_version)
        print_success "Latest version: $VERSION"
    else
        print_info "Using specified version: $VERSION"
    fi
}

# ============================================
# Download and Extract
# ============================================

create_temp_dir() {
    if [ "$DRY_RUN" = true ]; then
        TEMP_DIR="/tmp/nomad_bootstrap_dryrun_$$"
        print_dry_run "Would create temp directory: $TEMP_DIR"
    else
        TEMP_DIR=$(mktemp -d -t nomad_bootstrap.XXXXXX)
        print_info "Created temp directory: $TEMP_DIR"
    fi
}

cleanup_temp_dir() {
    if [ "$CLEANUP_TEMP" = true ] && [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        if [ "$DRY_RUN" = true ]; then
            print_dry_run "Would remove temp directory: $TEMP_DIR"
        else
            rm -rf "$TEMP_DIR"
            print_info "Cleaned up temp directory"
        fi
    fi
}

download_nomad() {
    local tarball_url="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${VERSION}.tar.gz"
    local output_file="${TEMP_DIR}/nomad-${VERSION}.tar.gz"

    print_step "Downloading Nomad ${VERSION}..."
    echo "  From: $tarball_url"
    echo "  To: $output_file"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        print_dry_run "Would download: $tarball_url"
        return 0
    fi

    if ! download_file "$tarball_url" "$output_file"; then
        print_error "Failed to download Nomad ${VERSION}"
        echo ""
        echo "Possible reasons:"
        echo "  - Version ${VERSION} does not exist"
        echo "  - Network connectivity issues"
        echo "  - GitHub is unavailable"
        echo ""
        echo "Check available versions at:"
        echo "  https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"
        exit 1
    fi

    print_success "Download complete"
}

extract_nomad() {
    local tarball="${TEMP_DIR}/nomad-${VERSION}.tar.gz"
    local extract_dir="${TEMP_DIR}/extracted"

    print_step "Extracting archive..."

    if [ "$DRY_RUN" = true ]; then
        print_dry_run "Would extract: $tarball to $extract_dir"
        return 0
    fi

    mkdir -p "$extract_dir"

    if ! tar -xzf "$tarball" -C "$extract_dir"; then
        print_error "Failed to extract archive"
        exit 1
    fi

    print_success "Extraction complete"
}

move_to_target() {
    local extracted_dir="${TEMP_DIR}/extracted/${REPO_NAME}-${VERSION#v}"

    print_step "Moving to target directory..."
    echo "  Source: $extracted_dir"
    echo "  Target: $INSTALL_DIR"

    if [ "$DRY_RUN" = true ]; then
        print_dry_run "Would move extracted directory to: $INSTALL_DIR"
        return 0
    fi

    # GitHub extracts to repo-name-version (without 'v' prefix)
    if [ ! -d "$extracted_dir" ]; then
        # Try with the 'v' prefix
        extracted_dir="${TEMP_DIR}/extracted/${REPO_NAME}-${VERSION}"
    fi

    if [ ! -d "$extracted_dir" ]; then
        # List what we have
        print_error "Expected directory not found after extraction"
        echo "Contents of ${TEMP_DIR}/extracted/:"
        ls -la "${TEMP_DIR}/extracted/" 2>/dev/null || echo "(unable to list)"
        exit 1
    fi

    # Check if target already exists
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Target directory already exists: $INSTALL_DIR"
        read -p "Overwrite? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled"
            exit 0
        fi
        rm -rf "$INSTALL_DIR"
    fi

    mkdir -p "$(dirname "$INSTALL_DIR")"
    mv "$extracted_dir" "$INSTALL_DIR"

    print_success "Moved to: $INSTALL_DIR"
}

# ============================================
# Run Installer
# ============================================

run_installer() {
    local installer_script="${INSTALL_DIR}/scripts/install_nomad_setup.sh"

    print_step "Running Nomad installer..."

    # Build installer arguments
    local installer_args=()
    if [ "$DRY_RUN" = true ]; then
        installer_args+=("--dry-run")
    fi

    if [ "$DRY_RUN" = true ]; then
        print_dry_run "Would execute: $installer_script ${installer_args[*]}"
        print_success "Bootstrap complete (dry run mode)"
        return 0
    fi

    if [ ! -f "$installer_script" ]; then
        print_error "Installer script not found: $installer_script"
        echo ""
        echo "The downloaded archive may be incomplete or corrupted."
        exit 1
    fi

    print_info "Handing off to: $installer_script"
    echo ""

    # Check if we can actually prompt for input
    # When running via curl | bash, stdin is the pipe, not the terminal
    if [ ! -t 0 ]; then
        print_error "Interactive input required but stdin is not a terminal"
        echo ""
        echo "The Nomad installer requires user interaction. When installing via curl,"
        echo "your options are:"
        echo ""
        echo "  Option 1: Download first, then run (recommended)"
        echo "    curl -fsSL https://.../install-nomad.sh -o install-nomad.sh"
        echo "    bash install-nomad.sh"
        echo ""
        echo "  Option 2: Use a configuration file"
        echo "    curl -fsSL https://.../install-nomad.sh | bash -s -- --help"
        echo "    (see the bootstrap script for non-interactive options)"
        echo ""
        echo "  Option 3: Force terminal access (Linux/macOS only)"
        echo "    curl -fsSL https://.../install-nomad.sh | bash </dev/tty"
        echo ""
        exit 1
    fi

    # Execute the installer
    cd "$INSTALL_DIR"
    exec "$installer_script" "${installer_args[@]}"
}

# ============================================
# Main
# ============================================

main() {
    print_header

    # Parse command line arguments
    parse_args "$@"

    # Check prerequisites
    check_prerequisites

    # Resolve version
    resolve_version

    # Create temp directory
    create_temp_dir

    # Set up cleanup on exit
    trap cleanup_temp_dir EXIT

    # Download Nomad
    download_nomad

    # Extract
    extract_nomad

    # Move to target
    move_to_target

    # Run installer (exec replaces this process)
    run_installer
}

# Run main function
main "$@"
