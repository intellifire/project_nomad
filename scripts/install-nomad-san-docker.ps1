#!/usr/bin/env pwsh
#
# Project Nomad - SAN + Docker Headless Installer (Windows)
# Quick install for SAN mode with Docker infrastructure on Windows
#
# Usage:
#   .\install-nomad-san-docker.ps1
#   or (PowerShell 7+):
#   iwr -Uri https://.../install-nomad-san-docker.ps1 -UseBasicParsing | iex
#   or (keep window open on error):
#   powershell -NoExit -Command "iwr -Uri https://.../install-nomad-san-docker.ps1 | iex"
#
# Optional Environment Variables (defaults shown):
#   $env:INSTALL_DIR=.\project_nomad     Where to extract Nomad
#   $env:FIRESTARR_DATASET_PATH=$env:USERPROFILE\firestarr_data   Dataset location
#   $env:NOMAD_PORT=4901                Backend/server port
#
# Example:
#   .\install-nomad-san-docker.ps1
#

param(
    [string]$InstallDir = $env:INSTALL_DIR,
    [string]$DatasetPath = $env:FIRESTARR_DATASET_PATH,
    [string]$Version = $env:VERSION,
    [switch]$SkipStart = [bool]$env:SKIP_START,
    [switch]$AutoInstallDataset = [bool]$env:AUTO_INSTALL_DATASET
)

$InstallerVersion = "1.0.0"
$RepoOwner = "WISE-Developers"
$RepoName = "project_nomad"

# Set defaults if not provided
if (-not $InstallDir) { $InstallDir = ".\project_nomad" }
if (-not $DatasetPath) { $DatasetPath = "$env:USERPROFILE\firestarr_data" }
if (-not $Version) { $Version = "latest" }
$NomadPort = if ($env:NOMAD_PORT) { $env:NOMAD_PORT } else { 4901 }
$FrontendPort = if ($env:NOMAD_FRONTEND_HOST_PORT) { $env:NOMAD_FRONTEND_HOST_PORT } else { 3901 }
$BackendPort = if ($env:NOMAD_BACKEND_HOST_PORT) { $env:NOMAD_BACKEND_HOST_PORT } else { 4901 }
$Hostname = if ($env:NOMAD_SERVER_HOSTNAME) { $env:NOMAD_SERVER_HOSTNAME } else { "localhost" }
$NomadDataPath = if ($env:NOMAD_DATA_PATH) { $env:NOMAD_DATA_PATH } else { $DatasetPath }
$SimsPath = if ($env:SIMS_OUTPUT_PATH) { $env:SIMS_OUTPUT_PATH } else { "$DatasetPath\sims" }

# FireSTARR image config
$FirestarrRegistry = "ghcr.io/cwfmf/firestarr-cpp"
$FirestarrImageName = "firestarr"
$FirestarrImageTag = "unstable-latest"

# Colors for output
function Write-Header { param($text) Write-Host $text -ForegroundColor Cyan }
function Write-Step { param($text) Write-Host "▶ $text" -ForegroundColor Green }
function Write-Warning { param($text) Write-Host "⚠ $text" -ForegroundColor Yellow }
function Write-Error { param($text) Write-Host "✖ $text" -ForegroundColor Red }
function Write-Success { param($text) Write-Host "✔ $text" -ForegroundColor Green }
function Write-Info { param($text) Write-Host "ℹ $text" -ForegroundColor Blue }

function Show-Header {
    Write-Host ""
    Write-Header "╔════════════════════════════════════════════════════════════╗"
    Write-Header "║   Project Nomad - SAN + Docker Installer v$InstallerVersion       ║"
    Write-Header "║              Headless / Non-Interactive Mode             ║"
    Write-Header "╚════════════════════════════════════════════════════════════╝"
    Write-Host ""
}

# Check PowerShell version
function Test-PowerShellVersion {
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        Write-Warning "PowerShell $($PSVersionTable.PSVersion) detected. PowerShell 7+ recommended."
        Write-Host "  Install: https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows"
        Write-Host "  Then run with: pwsh .\install-nomad-san-docker.ps1"
        Write-Host ""
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    Test-PowerShellVersion

    # Check Docker
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if (-not $dockerVersion) {
            throw "Docker not running"
        }
        Write-Success "Docker available (v$dockerVersion)"
    } catch {
        Write-Error "Docker Desktop is required but not available"
        Write-Host "Install from: https://docs.docker.com/desktop/install/windows/"
        exit 1
    }

    # Check Docker Compose
    try {
        $composeVersion = docker compose version --short 2>$null
        if (-not $composeVersion) {
            throw "Docker Compose not available"
        }
        Write-Success "Docker Compose available (v$composeVersion)"
    } catch {
        Write-Error "Docker Compose v2 is required"
        exit 1
    }

    # Check curl
    try {
        $curlVersion = curl --version 2>$null | Select-Object -First 1
        Write-Success "curl available"
    } catch {
        Write-Warning "curl not found, using Invoke-WebRequest"
    }

    Write-Success "Prerequisites satisfied"
}

# Get latest version from GitHub
function Get-LatestVersion {
    if ($Version -ne "latest") {
        Write-Info "Using specified version: $Version"
        return $Version
    }

    Write-Step "Fetching latest release version..."
    $apiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
        $Version = $response.tag_name
        Write-Success "Latest version: $Version"
        return $Version
    } catch {
        Write-Warning "Could not fetch latest version, using 'main'"
        return "main"
    }
}

# Download Nomad
function Get-NomadRelease {
    param($version)

    Write-Step "Downloading Nomad $version..."

    $tarballUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/tags/$version.tar.gz"
    $tempFile = [System.IO.Path]::GetTempFileName() + ".tar.gz"

    try {
        # Try curl first, then Invoke-WebRequest
        if (Get-Command curl -ErrorAction SilentlyContinue) {
            curl -fsSL "$tarballUrl" -o "$tempFile"
        } else {
            Invoke-WebRequest -Uri $tarballUrl -OutFile $tempFile -UseBasicParsing
        }

        if (-not (Test-Path $tempFile) -or (Get-Item $tempFile).Length -eq 0) {
            throw "Download failed"
        }

        Write-Success "Downloaded Nomad $version"
        return $tempFile
    } catch {
        Write-Error "Failed to download Nomad $version"
        Write-Host "Error: $_"
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        exit 1
    }
}

# Extract Nomad
function Expand-NomadArchive {
    param($tarball, $destination)

    Write-Step "Extracting to $destination..."

    # Resolve full path
    $destination = Resolve-Path -Path $destination -ErrorAction SilentlyContinue
    if (-not $destination) {
        $destination = Join-Path (Get-Location) $InstallDir
    }

    # Backup existing
    if (Test-Path $destination) {
        Write-Warning "Directory exists: $destination"
        $backupPath = "$destination.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Move-Item $destination $backupPath -Force
        Write-Info "Backed up to $backupPath"
    }

    New-Item -ItemType Directory -Path $destination -Force | Out-Null

    # Extract using tar (available in Windows 10+)
    try {
        $tempExtract = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString()
        New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null

        tar -xzf "$tarball" -C "$tempExtract"

        # Find extracted folder
        $extractedDir = Get-ChildItem $tempExtract | Select-Object -First 1
        if (-not $extractedDir) {
            throw "No folder found after extraction"
        }

        Move-Item "$($extractedDir.FullName)\*" $destination -Force
        Remove-Item $tempExtract -Recurse -Force

        Write-Success "Extracted to $destination"
        return $destination
    } catch {
        Write-Error "Failed to extract archive"
        Write-Host "Error: $_"
        exit 1
    }
}

# Generate .env file
function New-EnvironmentFile {
    param($projectDir)

    Write-Step "Generating configuration..."

    $envFile = Join-Path $projectDir ".env"
    $envExample = Join-Path $projectDir ".env.example"

    # Start from example if exists
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile -Force
    } else {
        New-Item $envFile -ItemType File -Force | Out-Null
    }

    function Update-EnvValue {
        param($key, $value)
        $pattern = "^$key=.*"
        $replacement = "$key=$value"

        if (Get-Content $envFile -Raw | Select-String -Pattern $pattern) {
            (Get-Content $envFile) -replace $pattern, $replacement | Set-Content $envFile
        } elseif (Get-Content $envFile -Raw | Select-String -Pattern "^#.*$key=") {
            (Get-Content $envFile) -replace "^#.*$key=.*", $replacement | Set-Content $envFile
        } else {
            Add-Content $envFile "$key=$value"
        }
    }

    # Detect architecture for FireSTARR image
    $arch = [System.Environment]::Is64BitProcess
    $FirestarrImage = "$FirestarrRegistry/$FirestarrImageName`:$FirestarrImageTag"

    # Core settings
    Update-EnvValue "NOMAD_DEPLOYMENT_MODE" "SAN"
    Update-EnvValue "FIRESTARR_DATASET_PATH" $DatasetPath
    Update-EnvValue "FIRESTARR_EXECUTION_MODE" "docker"
    Update-EnvValue "NOMAD_DATA_PATH" $NomadDataPath

    # Port configuration
    Update-EnvValue "PORT" $NomadPort
    Update-EnvValue "NOMAD_FRONTEND_HOST_PORT" $FrontendPort
    Update-EnvValue "NOMAD_BACKEND_HOST_PORT" $BackendPort
    Update-EnvValue "VITE_API_PORT" $BackendPort
    Update-EnvValue "VITE_API_BASE_URL" "http://${Hostname}:$BackendPort"
    Update-EnvValue "NOMAD_SERVER_HOSTNAME" $Hostname

    # FireSTARR image
    Update-EnvValue "FIRESTARR_IMAGE" $FirestarrImage

    # Auth mode
    Update-EnvValue "NOMAD_AUTH_MODE" "simple"
    Update-EnvValue "VITE_AUTH_MODE" "simple"

    Write-Success "Configuration saved to $envFile"
}

# Check dataset
function Test-Dataset {
    Write-Step "Checking FireSTARR dataset..."

    $gridPath = Join-Path $DatasetPath "generated\grid"

    if (Test-Path $gridPath) {
        Write-Success "Existing dataset found at $DatasetPath"
        return
    }

    Write-Warning "Dataset not found at $DatasetPath"
    Write-Host ""
    Write-Host "The FireSTARR dataset (~50GB) is required for fire modeling."
    Write-Host ""

    if (-not $AutoInstallDataset) {
        Write-Host "To auto-download, run with AUTO_INSTALL_DATASET=1:"
        Write-Host "  `$env:AUTO_INSTALL_DATASET = 1; .\install-nomad-san-docker.ps1"
        Write-Host ""
        Write-Host "Or download manually later:"
        Write-Host "  cd $InstallDir; .\scripts\install-firestarr-dataset.sh"
    } else {
        Write-Step "Auto-downloading dataset..."
        Set-Location $InstallDir
        & .\scripts\install-firestarr-dataset.ps1
    }
}

# Setup Docker
function Initialize-DockerEnvironment {
    param($projectDir)

    Write-Step "Setting up Docker environment..."

    Set-Location $projectDir

    # Create sims directory
    New-Item -ItemType Directory -Path $SimsPath -Force | Out-Null

    # Pull FireSTARR image
    Write-Step "Pulling FireSTARR image..."
    docker compose pull firestarr-app 2>$null

    # Build Nomad
    Write-Step "Building Nomad containers..."
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed (exit code $LASTEXITCODE)"
        Write-Host ""
        Write-Host "Common fixes:"
        Write-Host "  - Check Docker Desktop is running"
        Write-Host "  - Check disk space: docker system df"
        Write-Host "  - Clean up: docker system prune -a"
        Write-Host "  - Review build output above for errors"
        Write-Host ""
        $script:BuildFailed = $true
        return
    }

    Write-Success "Docker setup complete"
}

# Summary and start
function Show-Summary {
    Write-Host ""
    Write-Header "════════════════════════════════════════════════════════════"
    Write-Header "              Installation Summary"
    Write-Header "════════════════════════════════════════════════════════════"
    Write-Host ""
    Write-Host "  Deployment Mode:   SAN (Stand Alone Nomad)"
    Write-Host "  Infrastructure:      Docker"
    Write-Host "  Install Directory:   $InstallDir"
    Write-Host "  Dataset Path:        $DatasetPath"
    Write-Host "  Access URL:          http://${Hostname}:$FrontendPort"
    Write-Host ""
}

function Start-Nomad {
    param($projectDir)

    if ($script:BuildFailed) {
        Write-Error "Skipping start — Docker build failed. Fix the errors above and re-run."
        exit 1
    }

    Write-Step "Starting Project Nomad..."

    Set-Location $projectDir

    if (-not $SkipStart) {
        docker compose up -d
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to start containers (exit code $LASTEXITCODE)"
            exit 1
        }
        Write-Success "Project Nomad is starting!"
        Write-Host ""
        Write-Host "Access Nomad at: http://${Hostname}:$FrontendPort"
        Write-Host ""
        Write-Host "View logs: docker compose logs -f"
        Write-Host "Stop:      docker compose down"
    } else {
        Write-Info "Skip start requested. To start manually:"
        Write-Host "  cd $projectDir"
        Write-Host "  docker compose up -d"
    }
}

# Main
function Main {
    $script:BuildFailed = $false

    Show-Header

    Test-Prerequisites

    $version = Get-LatestVersion
    $tarball = Get-NomadRelease -version $version
    $projectDir = Expand-NomadArchive -tarball $tarball -destination $InstallDir
    Remove-Item $tarball -Force

    New-EnvironmentFile -projectDir $projectDir
    Test-Dataset
    Initialize-DockerEnvironment -projectDir $projectDir
    Show-Summary
    Start-Nomad -projectDir $projectDir
}

# Run main
Main
