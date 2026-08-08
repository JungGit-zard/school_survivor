param(
  [ValidateRange(1, 65535)]
  [int]$Port = 5173,

  [ValidateRange(100, 60000)]
  [int]$RestartDelayMilliseconds = 500
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$mutex = [Threading.Mutex]::new($false, "Local\EscapeZombieSchoolDevServer$Port")
$hasMutex = $false

try {
  $hasMutex = $mutex.WaitOne(0)
  if (-not $hasMutex) {
    Write-Output "The localhost:$Port keepalive supervisor is already running."
    exit 0
  }

  Set-Location -LiteralPath $projectDirectory

  while ($true) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($listener) {
      Start-Sleep -Milliseconds $RestartDelayMilliseconds
      continue
    }

    Write-Output "Starting the game server at http://localhost:$Port/"
    & npm.cmd run dev -- --port $Port --strictPort
    Write-Output "Game server exited. Restarting in $RestartDelayMilliseconds ms."
    Start-Sleep -Milliseconds $RestartDelayMilliseconds
  }
}
finally {
  if ($hasMutex) {
    $mutex.ReleaseMutex()
  }
  $mutex.Dispose()
}
