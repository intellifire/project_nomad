#!/bin/bash
# Launches the Project Nomad installer
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/scripts/install_nomad_setup.sh" "$@"
