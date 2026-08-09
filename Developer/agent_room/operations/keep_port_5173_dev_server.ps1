# Keeps the Escape! zombie school Vite dev server available on TCP port 5173.
# This script is intentionally small and local-operations-only: it starts the dev server
# only when no listener is already bound to port 5173.

$ErrorActionPreference = 'Stop'

$Port = 5173
$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$DevServerDirectory = Join-Path $ProjectRoot 'Developer\r3f_prototype'
$NpmCmd = 'C:\Program Files\nodejs\npm.cmd'
$LogDirectory = Join-Path $env:LOCALAPPDATA 'SchoolSurvivor'
$LogPath = Join-Path $LogDirectory 'keep_port_5173_dev_server.log'
$ServerLogPath = Join-Path $LogDirectory 'dev_server_5173.log'

function Write-Keep5173Log {
    param([string] $Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ssK'
    Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$timestamp] $Message"
}

New-Item -ItemType Directory -Force -Path $LogDirectory | Out-Null

if (-not (Test-Path -LiteralPath $DevServerDirectory -PathType Container)) {
    Write-Keep5173Log "SKIP missing dev server directory: $DevServerDirectory"
    exit 2
}

if (-not (Test-Path -LiteralPath $NpmCmd -PathType Leaf)) {
    Write-Keep5173Log "SKIP missing npm.cmd: $NpmCmd"
    exit 3
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    Write-Keep5173Log "OK port $Port already listening (PID $($listener.OwningProcess))."
    exit 0
}

Write-Keep5173Log "START port $Port listener missing; launching npm dev server."
Set-Location -LiteralPath $DevServerDirectory
& $NpmCmd run dev -- --host 0.0.0.0 --port 5173 --strictPort *>> $ServerLogPath
$serverExitCode = $LASTEXITCODE
Write-Keep5173Log "STOP npm dev server exited with code $serverExitCode; next scheduled check will restart it."
exit $serverExitCode
