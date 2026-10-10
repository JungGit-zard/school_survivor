Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$config.schedule_times = @('09:00','12:00','18:00')
Assert-PostingVariants $config
$portableFixture = 'D:/JungSil/2.Minigame_project/school_survivor-integration/marketing/x_daily_zombie_school_posting/image_pool/marketing_social_30_20261004/ja/01_bell_escape.png'
$localFixture = Join-Path $PSScriptRoot 'image_pool/x/ja/marketing_social_30_20261004/01_bell_escape.png'
Assert-True ((Resolve-PostingImagePath $portableFixture) -ceq [IO.Path]::GetFullPath($localFixture)) 'explicit legacy receipt suffix maps to the canonical X locale collection'
Assert-True ((Resolve-PostingImagePath 'image_pool/x/ja/marketing_social_30_20261004/01_bell_escape.png') -ceq [IO.Path]::GetFullPath($localFixture)) 'canonical X image path resolves'
$portableNewImage = 'D:/JungSil/2.Minigame_project/school_survivor-integration/marketing/x_daily_zombie_school_posting/image_pool/x/en/marketing_social_20261010_add10/01_classroom.png'
$localNewImage = Join-Path $PSScriptRoot 'image_pool/x/en/marketing_social_20261010_add10/01_classroom.png'
Assert-True ((Resolve-PostingImagePath $portableNewImage) -ceq [IO.Path]::GetFullPath($localNewImage)) 'new localized X image path resolves on a different checkout'
$catalog = Get-PostingImageCatalog
$newCatalogEntries = @($catalog.images | Where-Object { $_.collection -ceq 'marketing_social_20261010_add10' })
Assert-True ($newCatalogEntries.Count -eq 80) 'catalog contains all 80 new platform and locale assets'
foreach ($platform in @('X','Facebook')) { foreach ($locale in @('ko','en','ja','vi')) {
  Assert-True (@($newCatalogEntries | Where-Object { $_.platform -ceq $platform -and $_.locale -ceq $locale }).Count -eq 10) "$platform/$locale catalog has ten new assets"
} }
$facebookRejected=$false;try{$null=Resolve-PostingImagePath 'image_pool/facebook/ja/marketing_social_30_20261004/01_bell_escape.png'}catch{$facebookRejected=$true}
Assert-True $facebookRejected 'X resolver rejects Facebook-owned assets'
$escapedImageRejected=$false
try {$null=Resolve-PostingImagePath 'D:/image_pool/../../outside.png'} catch {$escapedImageRejected=$true}
Assert-True $escapedImageRejected 'portable image resolution cannot escape the approved image_pool root'
$outsideAbsolute = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\outside.png'))
$outsideAbsoluteRejected=$false
try {$null=Resolve-PostingImagePath $outsideAbsolute} catch {$outsideAbsoluteRejected=$true}
Assert-True $outsideAbsoluteRejected 'absolute paths outside the campaign image_pool root are rejected'
$relativeTraversalRejected=$false
try {$null=Resolve-PostingImagePath '..\outside.png'} catch {$relativeTraversalRejected=$true}
Assert-True $relativeTraversalRejected 'relative traversal outside the campaign image_pool root is rejected'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('x-variants-test-' + [guid]::NewGuid().ToString('N'))
$tempFull = [IO.Path]::GetFullPath($temp)
$systemTempFull = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
Assert-True ($tempFull.StartsWith($systemTempFull, [StringComparison]::OrdinalIgnoreCase) -and ([IO.Path]::GetFileName($tempFull) -match '^x-variants-test-[0-9a-f]{32}$')) 'test temp path is scoped'
$fixturePath = Join-Path $tempFull '2026-09-06-0900.json'
$savedConfig = Join-Path $tempFull 'fixture-config.json'
try {
  foreach ($lang in $config.language_order) {
    Assert-True (@($config.variants.$lang).Count -eq 3) "$lang has three extra pairs"
    Assert-True (@(Get-PostingLocaleImageCandidates $config $lang).Count -eq 18) "$lang has eighteen verified localized images, including ten additions"
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
      Assert-True ($choice.imagePath -match "[\\/]x[\\/]$lang[\\/](marketing_social_30_20261004|marketing_social_20261010_add10)[\\/]") "$lang/$cycle uses the X locale image pool"
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
  $historicFacebookReceiptPath=Join-Path $PSScriptRoot '..\..\Developer\agent_room\facebook_posting_receipts\2026-10-10-0600.json'
  if(-not (Test-Path -LiteralPath $historicFacebookReceiptPath -PathType Leaf)){throw 'Historic Facebook 0600 fixture receipt is missing'}
  $historicFacebookReceipt=Get-Content -LiteralPath $historicFacebookReceiptPath -Raw -Encoding UTF8|ConvertFrom-Json
  $historicEntries=[ordered]@{}
  foreach($lang in @('ja','en','vi','ko')){if($historicFacebookReceipt.entries.$lang.state -ne 'publish_intent' -or [string]::IsNullOrWhiteSpace([string]$historicFacebookReceipt.entries.$lang.intent.imagePath)){throw "Historic Facebook 0600 $lang intent is not available for the regression fixture"};$historicEntries[$lang]=$historicFacebookReceipt.entries.$lang}
  $historicFixture=[pscustomobject]@{cycleId='2026-10-10-0600';entries=[pscustomobject]$historicEntries}
  Save-CycleReceipt $historicFixture (Join-Path $tempFull '2026-10-10-0600.json')
  $savedScheduleTimes=@($config.schedule_times);$config.schedule_times=@('06:00','11:00')
  try {
    foreach($lang in @('ja','en','vi','ko')){
      $candidates=@(Get-PostingLocaleImageCandidates $config $lang)
      $previousImage=Get-PostingPreviousImagePath $config $lang '2026-10-10-1100' $tempFull $candidates -Platform Facebook
      Assert-True (@($candidates|Where-Object{$_ -ceq $previousImage}).Count -eq 1) "$lang historic Facebook receipt maps back to its exact X pool candidate"
      $selected=Select-PostingVariant $config $lang '2026-10-10-1100' $tempFull -Platform Facebook
      Assert-True ($selected.imagePath -cne $previousImage) "$lang next Facebook cycle avoids the image in the historic 0600 receipt without a platform-path exception"
    }
  } finally {$config.schedule_times=$savedScheduleTimes}
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
