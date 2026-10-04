param(
  [ValidateSet('ja','en','vi','ko')][string]$Language = 'ja',
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'posting_config.json'),
  [string]$CycleId,
  [long]$WindowId = 0,
  [string]$ReceiptDirectory = (Join-Path $PSScriptRoot 'receipts'),
  [switch]$DryRun, [switch]$ValidateOnly, [switch]$FullCycle, [switch]$Run, [switch]$PrepareOnly, [switch]$SinglePost
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
$receipt = $null
$receiptPath = $null
$activeLanguage = $null
$mutex = $null
$locked = $false
try {
  $config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($config.boundary.account -cne '@jungsilx' -or $config.boundary.posting_method -cne 'browser_ui_only') { throw 'Unexpected account or transport' }
  if (($config.language_order -join ',') -cne 'ja,en,vi,ko') { throw 'Expected ja,en,vi,ko order' }
  if ($config.timezone -cne 'Asia/Seoul') { throw 'Expected Asia/Seoul timezone' }
  if ($config.play_store_url -cne 'https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool') { throw 'Unexpected campaign URL' }
  if ($config.web_url -cne 'https://escapezombie.com') { throw 'Unexpected campaign web URL' }
  foreach ($lang in $config.language_order) {
    $copy = $config.copy.$lang
    if ([string]::IsNullOrWhiteSpace($copy.text) -or -not $copy.text.Contains($copy.hashtag)) { throw "Incomplete $lang copy" }
    Assert-PostingTextLinks $config ([string]$copy.text) "$lang/original"
    if (@($config.image_pool.$lang.images).Count -ne 1) { throw "Exactly one canonical image is required for $lang" }
  }
  Assert-PostingVariants $config

  if ($DryRun -or $ValidateOnly) {
    $existing = $null
    $existingPath = Join-Path $ReceiptDirectory ($CycleId + '.json')
    if (Test-Path -LiteralPath $existingPath) { $existing = Get-Content -LiteralPath $existingPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    $selections = foreach ($lang in $config.language_order) {
      $savedIntent = $null
      if ($null -ne $existing -and $null -ne $existing.entries.$lang) { $savedIntent = $existing.entries.$lang.intent }
      $variant = Select-PostingVariant $config $lang $CycleId $ReceiptDirectory $savedIntent
      [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$variant.text; imagePath=$variant.imagePath; weightedLength=(Get-XWeightedLength $variant.text); persisted=($null -ne $savedIntent) }
    }
    [pscustomobject]@{ status='validated_only'; published=0; languages=$config.language_order; account=$config.boundary.account; uiTouched=$false; cycleId=$CycleId; selections=@($selections) } | ConvertTo-Json -Depth 8 -Compress
    exit 0
  }

  if (-not ($Run -or $FullCycle -or $PrepareOnly)) { throw 'Specify -Run/-FullCycle, -PrepareOnly, or -DryRun' }
  if ([string]::IsNullOrWhiteSpace($CycleId)) { $CycleId = Get-PostingCycleId ([DateTimeOffset]::UtcNow) $config.schedule_times }
  if ($CycleId -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$') { throw 'An explicit stable -CycleId is required; use the same ID on retry' }
  if ($SinglePost -and (-not $Run -or $FullCycle -or $PrepareOnly)) { throw '-SinglePost requires -Run and cannot be combined with -FullCycle or -PrepareOnly' }
  if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Start powershell with -STA' }
  $mutex = [Threading.Mutex]::new($false, 'Local\EscapeZombieSchoolXPosting')
  $locked = $false
  try {
    try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another campaign runner owns the desktop' }
    $receiptPath = Join-Path $ReceiptDirectory ($CycleId + '.json')
    if (Test-Path -LiteralPath $receiptPath) { $receipt = Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    else {
      $receipt = [pscustomobject]@{ schema=1; cycleId=$CycleId; status='incomplete'; lastError=$null; failedLanguage=$null; entries=[pscustomobject]@{} }
      foreach ($lang in $config.language_order) { $receipt.entries | Add-Member -NotePropertyName $lang -NotePropertyValue $null }
    }
    if (Test-CycleComplete $receipt) {
      foreach ($lang in $config.language_order) {
        $entry = $receipt.entries.$lang
        $null = Resolve-PostingIntentVariant $config $lang $entry.intent
      }
      $receipt.status = 'complete'
      Save-CycleReceipt $receipt $receiptPath
      [pscustomobject]@{ status='complete'; published=4; newlyPublished=0; uiTouched=$false; cycleId=$CycleId; receiptPath=$receiptPath } | ConvertTo-Json -Compress
      exit 0
    }
    $languages = @($config.language_order)
    if ($PrepareOnly -or $SinglePost) { $languages = @($Language) }
    foreach ($lang in $languages) {
      $entry = $receipt.entries.$lang
      if ($null -eq $entry) {
        $variant = Select-PostingVariant $config $lang $CycleId $ReceiptDirectory
        $intent = [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$variant.text; textSha256=(Get-CopyDigest $variant.text); imagePath=$variant.imagePath; selectedUtc=[DateTimeOffset]::UtcNow.ToString('o') }
        $receipt.entries.$lang = [pscustomobject]@{ state='selected'; intent=$intent; evidence=$null }
      } else { $null = Resolve-PostingIntentVariant $config $lang $entry.intent }
    }
    # Freeze every pair before loading, discovering, or interacting with desktop UI.
    Save-CycleReceipt $receipt $receiptPath
    . (Join-Path $PSScriptRoot 'WindowsXPosting.ps1')
    Initialize-XWindow -RequestedWindowId $WindowId
    foreach ($lang in $languages) {
      $activeLanguage = $lang
      $entry = $receipt.entries.$lang
      if ($null -ne $entry -and $entry.state -eq 'verified') {
        $null = Resolve-PostingIntentVariant $config $lang $entry.intent
        if (-not (Test-PublishedEvidence $entry.intent $entry.evidence)) { throw "Invalid verified receipt for $lang" }
        Write-Output "VERIFIED_SKIP $lang $($entry.evidence.url)"
        continue
      }
      if ($null -ne $entry -and $entry.state -eq 'publish_intent') {
        $evidence = Find-XPublishedPost -Intent $entry.intent
        if ($null -eq $evidence) { throw "UNCERTAIN $lang`: prior publish intent; no matching new status visible. No second click." }
        $entry.state = 'verified'; $entry.evidence = $evidence
        Save-CycleReceipt $receipt $receiptPath
        continue
      }
      $variant = Resolve-PostingIntentVariant $config $lang $entry.intent
      $text = [string]$entry.intent.text
      $imagePath = [string]$entry.intent.imagePath
      if ($null -ne $entry -and $entry.state -eq 'prepared') {
        if ($entry.intent.text -cne $text -or $entry.intent.imagePath -cne $imagePath -or $entry.intent.imageSha256 -cne (Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant()) { throw 'Prepared intent no longer matches canonical copy/image' }
        Assert-XComposer $text
        $intent = $entry.intent
        $proof = $intent
      } else {
        Navigate-XProfile
        Assert-XAccount
        $baseline = @(Get-XStatusUrls)
        $proof = Prepare-XPost -Text $text -ImagePath $imagePath
        $intent = [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$text; textSha256=(Get-CopyDigest $text); imagePath=$imagePath; imageSha256=$proof.imageSha256; attachmentCount=$proof.attachmentCount; baselineUrls=$baseline; createdUtc=[DateTimeOffset]::UtcNow.ToString('o'); preparedUtc=$proof.preparedUtc }
      }
      if ($PrepareOnly) {
        $receipt.entries.$lang = [pscustomobject]@{ state='prepared'; intent=$intent; evidence=$null }
        Save-CycleReceipt $receipt $receiptPath
        [pscustomobject]@{ status='prepared_not_published'; language=$lang; proof=$proof } | ConvertTo-Json -Depth 5
        exit 0
      }
      $entry = [pscustomobject]@{ state='publish_intent'; intent=$intent; evidence=$null }
      $receipt.entries.$lang = $entry
      Save-CycleReceipt $receipt $receiptPath
      Publish-XPost -Text $text
      $evidence = Find-XPublishedPost -Intent $intent
      if ($null -eq $evidence) { throw "UNCERTAIN $lang`: publish clicked once; matching new status not verified" }
      $entry.state = 'verified'; $entry.evidence = $evidence
      Save-CycleReceipt $receipt $receiptPath
      Write-Output "VERIFIED $lang $($evidence.url)"
    }
    if ($SinglePost) {
      $single=$receipt.entries.$Language
      if ($null -eq $single -or $single.state -ne 'verified' -or -not (Test-PublishedEvidence $single.intent $single.evidence)) { throw "Single post $Language was not verified" }
      $receipt.status = 'partial'
      $receipt.lastError = $null
      $receipt.failedLanguage = $null
      Save-CycleReceipt $receipt $receiptPath
      [pscustomobject]@{ status='partial_verified'; published=1; language=$Language; cycleId=$CycleId; receiptPath=$receiptPath } | ConvertTo-Json -Compress
      exit 0
    }
    if (-not (Test-CycleComplete $receipt)) { throw 'Incomplete cycle: all four distinct verified URLs required' }
    $receipt.status = 'complete'
    $receipt.lastError = $null
    $receipt.failedLanguage = $null
    Save-CycleReceipt $receipt $receiptPath
    [pscustomobject]@{ status='complete'; published=4; cycleId=$CycleId; receiptPath=$receiptPath } | ConvertTo-Json -Compress
  } catch { throw }
} catch {
  $failureMessage = $_.Exception.Message
  if ($null -ne $receipt -and $receiptPath) {
    $receipt.status = 'incomplete'
    $receipt | Add-Member -Force -NotePropertyName lastError -NotePropertyValue $failureMessage
    $receipt | Add-Member -Force -NotePropertyName failedLanguage -NotePropertyValue $activeLanguage
    try { Save-CycleReceipt $receipt $receiptPath }
    catch { [Console]::Error.WriteLine('Receipt save also failed: ' + $_.Exception.Message) }
  }
  [Console]::Error.WriteLine('X_POSTING_FAILED: ' + $failureMessage)
  exit 1
} finally { if ($locked) { $mutex.ReleaseMutex() }; if ($null -ne $mutex) { $mutex.Dispose() } }
