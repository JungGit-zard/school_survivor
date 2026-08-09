# Keeps the Escape! zombie school Vite dev server available on TCP port 5173.
# This script is a persistent local watchdog: the scheduled task still runs every 5 minutes
# as a fallback, while each active instance checks the port continuously and starts Vite
# immediately when no listener is bound to port 5173.

$ErrorActionPreference = 'Stop'

$Port = 5173
$PollIntervalSeconds = 2
$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$DevServerDirectory = Join-Path $ProjectRoot 'Developer\r3f_prototype'
$NpmCmd = 'C:\Program Files\nodejs\npm.cmd'
$LogDirectory = Join-Path $env:LOCALAPPDATA 'SchoolSurvivor'
$LogPath = Join-Path $LogDirectory 'keep_port_5173_dev_server.log'
$ServerLogPath = Join-Path $LogDirectory 'dev_server_5173.log'
$ServerErrorLogPath = Join-Path $LogDirectory 'dev_server_5173.err.log'
$MutexName = 'Global\SchoolSurvivor-Keep-5173-Watchdog'

function Write-Keep5173Log {
    param([string] $Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ssK'
    Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$timestamp] $Message"
}

function Get-Port5173Listener {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Start-HiddenViteServer {
    Start-Process -FilePath $NpmCmd `
        -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0', '--port', "$Port", '--strictPort') `
        -WorkingDirectory $DevServerDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $ServerLogPath `
        -RedirectStandardError $ServerErrorLogPath `
        -PassThru
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

$mutex = [System.Threading.Mutex]::new($false, $MutexName)
$hasMutex = $false
$serverProcess = $null
$lastListenerPid = $null

try {
    $hasMutex = $mutex.WaitOne(0)
    if (-not $hasMutex) {
        Write-Keep5173Log "SKIP another watchdog instance is already running."
        exit 0
    }

    Write-Keep5173Log "WATCHDOG started for port $Port; poll interval ${PollIntervalSeconds}s."

    while ($true) {
        if ($serverProcess -and $serverProcess.HasExited) {
            Write-Keep5173Log "STOP launched npm dev server process exited with code $($serverProcess.ExitCode); continuing watchdog loop."
            $serverProcess = $null
        }

        $listener = Get-Port5173Listener
        if ($listener) {
            if ($lastListenerPid -ne $listener.OwningProcess) {
                Write-Keep5173Log "OK port $Port listening (PID $($listener.OwningProcess))."
                $lastListenerPid = $listener.OwningProcess
            }
        } elseif (-not $serverProcess) {
            $lastListenerPid = $null
            Write-Keep5173Log "START port $Port listener missing; launching hidden npm dev server."
            $serverProcess = Start-HiddenViteServer
            Write-Keep5173Log "STARTED hidden npm dev server wrapper PID $($serverProcess.Id)."
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }
} finally {
    if ($hasMutex) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
