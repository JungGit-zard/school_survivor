Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Assert-PostingVariants $config
$temp = Join-Path ([IO.Path]::GetTempPath()) ('x-variants-test-' + [guid]::NewGuid().ToString('N'))
$fixturePath = Join-Path $temp '2026-09-06-0900.json'
$savedConfig = Join-Path $temp 'fixture-config.json'
try {
  foreach ($lang in $config.language_order) {
    Assert-True (@($config.variants.$lang).Count -eq 3) "$lang has three extra pairs"
    foreach ($variant in $config.variants.$lang) {
      Assert-True ((Get-XWeightedLength $variant.text) -le 280) "$lang/$($variant.id) fits weighted X limit"
      $variant.enabled = $false
    }
    Assert-True ((Select-PostingVariant $config $lang '2026-09-06-1200' $temp).id -eq 'original') "$lang disabled sets not selected"
    foreach ($variant in $config.variants.$lang) { $variant.enabled = $true }
    $previous = $null; $seen = @()
    foreach ($cycle in @('2026-09-06-0900','2026-09-06-1200','2026-09-06-1800','2026-09-07-0900','2026-09-07-1200','2026-09-07-1800')) {
      $choice = Select-PostingVariant $config $lang $cycle $temp
      Assert-True ($choice.id -ne $previous) "$lang/$cycle has no adjacent repeat"
      Assert-True ((Select-PostingVariant $config $lang $cycle $temp).id -eq $choice.id) "$lang/$cycle deterministic"
      $seen += $choice.id; $previous = $choice.id
    }
    Assert-True (@($seen | Select-Object -Unique).Count -eq 4) "$lang rotates all four sets"
    $legacy = [pscustomobject]@{ text=$config.copy.$lang.text; imagePath=$config.image_pool.$lang.images[0] }
    Assert-True ((Resolve-PostingIntentVariant $config $lang $legacy).id -eq 'original') "$lang legacy intent accepted after variants enabled"
    $saved = $config.variants.$lang[1]
    $intent = [pscustomobject]@{ variantId=$saved.id; text=$saved.text; imagePath=$saved.imagePath }
    $saved.enabled = $false
    Assert-True ((Select-PostingVariant $config $lang '2026-09-06-0900' $temp $intent).id -eq 'supplies') "$lang retry keeps disabled saved pair"
    $saved.enabled = $true
    $intent.imagePath = $config.image_pool.$lang.images[0]
    $rejected = $false
    try { $null = Resolve-PostingIntentVariant $config $lang $intent } catch { $rejected = $true }
    Assert-True $rejected "$lang mixed copy and image rejected"
  }
  $choice = $config.variants.ja[0]
  $receipt = [pscustomobject]@{ schema=1; cycleId='2026-09-06-0900'; entries=[pscustomobject]@{ ja=[pscustomobject]@{ state='selected'; intent=[pscustomobject]@{ variantId=$choice.id; text=$choice.text; imagePath=$choice.imagePath } }; en=$null; vi=$null; ko=$null } }
  Save-CycleReceipt $receipt $fixturePath
  Assert-True ((Select-PostingVariant $config ja '2026-09-06-1200' $temp).id -ne 'bell') 'prior actual choice prevents repeat despite slot default'
  Assert-True ((Select-PostingVariant $config ja '2026-09-08-1200' $temp).id -ne 'bell') 'missed slots do not cause repeated actual choice'
  Save-CycleReceipt $config $savedConfig
  $before = (Get-FileHash -LiteralPath $fixturePath).Hash
  $out = & powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -DryRun -FullCycle -ConfigPath $savedConfig -CycleId 2026-09-06-0900 -ReceiptDirectory $temp
  Assert-True ($LASTEXITCODE -eq 0) 'dry-run with stored selection succeeds'
  $result = $out | ConvertFrom-Json
  Assert-True ($result.selections[0].variantId -eq 'bell' -and $result.selections[0].persisted -eq $true) 'dry-run uses exact saved pair'
  Assert-True ($result.uiTouched -eq $false -and $result.published -eq 0 -and (Get-FileHash -LiteralPath $fixturePath).Hash -eq $before) 'dry-run leaves UI and receipt untouched'
  $wrapper = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -Raw -Encoding UTF8
  $saveIndex = $wrapper.IndexOf('# Freeze every pair')
  Assert-True ($saveIndex -ge 0 -and $wrapper.IndexOf('Save-CycleReceipt $receipt $receiptPath', $saveIndex) -lt $wrapper.IndexOf('Initialize-XWindow -RequestedWindowId')) 'all selections persisted before UI initialization'
  $tokens=$null; $errors=$null
  [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'PostingVariant.ps1'),[ref]$tokens,[ref]$errors) | Out-Null
  Assert-True ($errors.Count -eq 0) 'PowerShell parses variant helper'
} finally {
  foreach ($path in @($fixturePath, $savedConfig)) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path } }
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp }
}
Write-Output 'VARIANT_TEST_OK'
