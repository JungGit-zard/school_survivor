param(
  [int]$Port = 5174
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {
  throw 'python executable not found. Install Python or run another static HTTP server in this folder.'
}

Start-Process -FilePath $Python.Source -ArgumentList @('-m', 'http.server', "$Port", '--bind', 'localhost', '--directory', $Root) -WindowStyle Hidden -WorkingDirectory $Root
Write-Host "Independent Player GLB comparison viewer started at http://localhost:$Port/"
