Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$mutex = [Threading.Mutex]::new($false, 'Local\EscapeZombieSchoolFiveSlotSerial')
$held = $false
$previous = [Environment]::GetEnvironmentVariable('ESCAPE_VERTICAL_SERIAL_HELD', 'Process')
try {
  try { $held = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
  if (-not $held) { throw 'Current scheduled social actor owns the serial mutex; registration has not run.' }
  $env:ESCAPE_VERTICAL_SERIAL_HELD = '1'
  & node (Join-Path $PSScriptRoot 'Integrate-VerticalComicPool.cjs') --apply
  if ($LASTEXITCODE -ne 0) { throw 'Vertical comic registration failed; inspect output before retrying.' }
  & node (Join-Path $repo 'marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs') --output (Join-Path $repo 'Graphic_designer/comic_vertical_20261018/generated_cards')
  if ($LASTEXITCODE -ne 0) { throw 'Edited pool registered but website-card generation failed; scheduled card-readiness guard remains active.' }
  $work = Join-Path $repo 'Graphic_designer/comic_vertical_20261018'
  $registered = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $work 'pool_update.json') | ConvertFrom-Json
  $activeHashes = @($registered.mappings | Where-Object platform -CEQ 'X' | ForEach-Object targetSha256)
  $generated = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $work 'generated_cards/x-website-cards-manifest.json') | ConvertFrom-Json
  $activeCards = @($generated.cards | Where-Object { $activeHashes -ccontains $_.sha256 })
  if ($activeCards.Count -ne 60) { throw 'Expected exactly60 active edited X cards; do not deploy a partial card manifest.' }
  $urls = @($activeCards | ForEach-Object { $generated.origin + $_.cardPath })
  $filtered = [pscustomobject]@{ origin=$generated.origin; cards=$activeCards; httpChecks=@($generated.httpChecks | Where-Object { $urls -ccontains $_.card.url }) }
  [IO.File]::WriteAllText((Join-Path $work 'generated_cards/vertical-website-cards-manifest.json'),($filtered | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
} finally {
  [Environment]::SetEnvironmentVariable('ESCAPE_VERTICAL_SERIAL_HELD', $previous, 'Process')
  if ($held) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
