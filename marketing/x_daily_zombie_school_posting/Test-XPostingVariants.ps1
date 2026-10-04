Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Assert-PostingVariants $config
$temp = Join-Path ([IO.Path]::GetTempPath()) ('x-variants-test-' + [guid]::NewGuid().ToString('N'))
$tempFull = [IO.Path]::GetFullPath($temp)
$systemTempFull = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
Assert-True ($tempFull.StartsWith($systemTempFull, [StringComparison]::OrdinalIgnoreCase) -and ([IO.Path]::GetFileName($tempFull) -match '^x-variants-test-[0-9a-f]{32}$')) 'test temp path is scoped'
$fixturePath = Join-Path $tempFull '2026-09-06-0900.json'
$savedConfig = Join-Path $tempFull 'fixture-config.json'
try {
  foreach ($lang in $config.language_order) {
    Assert-True (@($config.variants.$lang).Count -eq 3) "$lang has three extra pairs"
    Assert-True (@($config.localized_social_image_pool.$lang.images).Count -eq 3) "$lang has three verified localized images"
    foreach ($variant in $config.variants.$lang) {
      Assert-True ((Get-XWeightedLength $variant.text) -le 280) "$lang/$($variant.id) fits weighted X limit"
      $variant.enabled = $false
    }
    Assert-True ((Select-PostingVariant $config $lang '2026-09-06-1200' $temp).id -eq 'original') "$lang disabled sets not selected"
    foreach ($variant in $config.variants.$lang) { $variant.enabled = $true }
    $previous = $null; $seen = @(); $previousImage = $null
    foreach ($cycle in @('2026-09-06-0900','2026-09-06-1200','2026-09-06-1800','2026-09-07-0900','2026-09-07-1200','2026-09-07-1800')) {
      $choice = Select-PostingVariant $config $lang $cycle $temp
      Assert-True ($choice.id -ne $previous) "$lang/$cycle has no adjacent repeat"
      Assert-True ((Select-PostingVariant $config $lang $cycle $temp).id -eq $choice.id) "$lang/$cycle keeps deterministic text variant"
      Assert-True (Test-Path -LiteralPath $choice.imagePath) "$lang/$cycle selected image exists"
      Assert-True ($choice.imagePath -match "marketing_social_30_20261004[\\/]$lang[\\/]") "$lang/$cycle uses locale marketing image pool"
      if ($null -ne $previousImage -and @($config.localized_social_image_pool.$lang.images).Count -gt 1) { Assert-True ($choice.imagePath -cne $previousImage) "$lang/$cycle has no adjacent image repeat" }
      $seen += $choice.id; $previous = $choice.id
      $receipt = [pscustomobject]@{ schema=1; cycleId=$cycle; entries=[pscustomobject]@{} }
      foreach ($receiptLang in $config.language_order) { $receipt.entries | Add-Member -NotePropertyName $receiptLang -NotePropertyValue $null }
      $receipt.entries.$lang = [pscustomobject]@{ state='selected'; intent=[pscustomobject]@{ variantId=$choice.id; text=$choice.text; imagePath=$choice.imagePath } }
      Save-CycleReceipt $receipt (Join-Path $temp ($cycle + '.json'))
      $previousImage = $choice.imagePath
    }
    Assert-True (@($seen | Select-Object -Unique).Count -eq 4) "$lang rotates all four sets"
    $legacy = [pscustomobject]@{ text=$config.copy.$lang.text; imagePath=$config.image_pool.$lang.images[0] }
    Assert-True ((Resolve-PostingIntentVariant $config $lang $legacy).id -eq 'original') "$lang legacy intent accepted after variants enabled"
    $saved = $config.variants.$lang[1]
    $intent = [pscustomobject]@{ variantId=$saved.id; text=$saved.text; imagePath=$saved.imagePath }
    $saved.enabled = $false
    Assert-True ((Select-PostingVariant $config $lang '2026-09-06-0900' $temp $intent).id -eq 'supplies') "$lang retry keeps disabled saved pair"
    $saved.enabled = $true
    $otherLang = @($config.language_order | Where-Object { $_ -cne $lang })[0]
    $intent.imagePath = $config.localized_social_image_pool.$otherLang.images[0]
    $rejected = $false
    try { $null = Resolve-PostingIntentVariant $config $lang $intent } catch { $rejected = $true }
    Assert-True $rejected "$lang cross-language copy and image rejected"
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
  if (Test-Path -LiteralPath $tempFull -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $tempFull -File -Filter '*.json')) { Remove-Item -LiteralPath $file.FullName }
    Remove-Item -LiteralPath $tempFull
  }
}
Write-Output 'VARIANT_TEST_OK'
