param(
  [ValidateSet('ja','en','vi','ko')][string]$Language = 'ja',
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'posting_config.json'),
  [string]$CycleId,
  [long]$WindowId = 0,
  [string]$ReceiptDirectory = (Join-Path $PSScriptRoot 'receipts'),
  [switch]$DryRun, [switch]$ValidateOnly, [switch]$FullCycle, [switch]$Run, [switch]$PrepareOnly, [switch]$SinglePost, [switch]$PublishOnly,
  [switch]$ReconcileExistingPosts, [switch]$CredentialRecovery, [string]$StopAtKst = '', [switch]$WebsiteCardOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-XBeforePublishCutoff([string]$Value) {
  if([string]::IsNullOrWhiteSpace($Value)){return}
  try{$cutoff=[DateTimeOffset]::Parse($Value,[Globalization.CultureInfo]::InvariantCulture)}catch{throw 'Invalid -StopAtKst value; expected an ISO-8601 offset timestamp.'}
  $now=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))
  if($now -ge $cutoff){throw 'SCHEDULE_CUTOFF: KST cutoff reached before a new X PublishOnly action.'}
}
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
. (Join-Path $PSScriptRoot 'XWebsiteCardReadiness.ps1')
$receipt = $null
$receiptPath = $null
$activeLanguage = $null
$mutex = $null
$locked = $false
function Resolve-XIntentVariant($Config, [string]$Language, $Intent) {
  if ($Intent.PSObject.Properties.Name -contains 'postFormat' -and $Intent.postFormat -ceq 'website_card') {
    if ($Intent.PSObject.Properties.Name -notcontains 'sourceText' -or [string]::IsNullOrWhiteSpace([string]$Intent.sourceText)) { throw 'Website-card receipt is missing its canonical source text' }
    $sourceIntent = [pscustomobject]@{ variantId=$Intent.variantId; text=$Intent.sourceText; imagePath=$Intent.imagePath }
    return Resolve-PostingIntentVariant $Config $Language $sourceIntent
  }
  return Resolve-PostingIntentVariant $Config $Language $Intent
}
try {
  $config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($config.boundary.account -cne '@jungsilx' -or $config.boundary.posting_method -cne 'browser_ui_only') { throw 'Unexpected account or transport' }
  if (($config.language_order -join ',') -cne 'ja,en,vi,ko') { throw 'Expected ja,en,vi,ko order' }
  if ($config.timezone -cne 'Asia/Seoul') { throw 'Expected Asia/Seoul timezone' }
  if ($config.play_store_url -cne 'https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool') { throw 'Unexpected campaign URL' }
  if ($config.web_url -cne 'https://escapezombie.com') { throw 'Unexpected campaign web URL' }
  $cardConfig = if ($config.PSObject.Properties.Name -contains 'x_link_card' -and $null -ne $config.x_link_card) { $config.x_link_card } else { [pscustomobject]@{ enabled=$false; base_url='https://escapezombie.com' } }
  $cardBaseUrl = if ($cardConfig.PSObject.Properties.Name -contains 'base_url' -and -not [string]::IsNullOrWhiteSpace([string]$cardConfig.base_url)) { [string]$cardConfig.base_url } else { 'https://escapezombie.com' }
  if ($cardConfig.enabled -and $PublishOnly -and $SinglePost) { $WebsiteCardOnly = $true }
  $cardBaseUri = $null
  if (-not [Uri]::TryCreate($cardBaseUrl, [UriKind]::Absolute, [ref]$cardBaseUri) -or $cardBaseUri.Scheme -cne 'https' -or $cardBaseUri.AbsolutePath -notin @('', '/') -or $cardBaseUri.Query -or $cardBaseUri.Fragment -or $cardBaseUri.Host -notin @('escapezombie.com','escape-zombie-school-assets.web.app')) { throw 'X website-card base URL must use an approved HTTPS origin with no path, query, or fragment' }
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
      $variant = if ($null -ne $savedIntent) { Resolve-XIntentVariant $config $lang $savedIntent } else { Select-PostingVariant $config $lang $CycleId $ReceiptDirectory }
      $selectedText = if ($null -ne $savedIntent) { [string]$savedIntent.text } else { [string]$variant.text }
      $savedFormat = if ($null -ne $savedIntent -and $savedIntent.PSObject.Properties.Name -contains 'postFormat') { [string]$savedIntent.postFormat } else { 'photo' }
      $cardUrl = if ($savedFormat -eq 'website_card') { [string]$savedIntent.cardUrl } else { $null }
      if ($null -eq $savedIntent -and $WebsiteCardOnly) {
        $imageHash=(Get-FileHash -LiteralPath $variant.imagePath -Algorithm SHA256).Hash.ToLowerInvariant()
        $cardUrl=$cardBaseUrl.TrimEnd('/')+'/share/x/'+$lang+'/'+$imageHash.Substring(0,16)
        $selectedText=$variant.text.Replace([string]$config.web_url,$cardUrl)
        $savedFormat='website_card'
      }
      [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$selectedText; imagePath=$variant.imagePath; postFormat=$savedFormat; cardUrl=$cardUrl; weightedLength=(Get-XWeightedLength $selectedText); persisted=($null -ne $savedIntent) }
    }
    [pscustomobject]@{ status='validated_only'; published=0; languages=$config.language_order; account=$config.boundary.account; uiTouched=$false; cycleId=$CycleId; selections=@($selections) } | ConvertTo-Json -Depth 8 -Compress
    exit 0
  }

  if (-not ($Run -or $FullCycle -or $PrepareOnly)) { throw 'Specify -Run/-FullCycle, -PrepareOnly, or -DryRun' }
  if ([string]::IsNullOrWhiteSpace($CycleId)) { $CycleId = Get-PostingCycleId ([DateTimeOffset]::UtcNow) $config.schedule_times }
  if ($CycleId -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$') { throw 'An explicit stable -CycleId is required; use the same ID on retry' }
  if ($SinglePost -and (-not $Run -or $FullCycle -or $PrepareOnly)) { throw '-SinglePost requires -Run and cannot be combined with -FullCycle or -PrepareOnly' }
  if ($PublishOnly -and (-not $SinglePost -or -not $Run)) { throw '-PublishOnly requires -Run -SinglePost and leaves the receipt at publish_intent for user verification' }
  if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'Start powershell with -STA' }
  Assert-XBeforePublishCutoff $StopAtKst
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
    if ((Test-CycleComplete $receipt) -and -not $ReconcileExistingPosts) {
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
        if ($WebsiteCardOnly -and -not $PrepareOnly -and (-not $PublishOnly -or -not $SinglePost -or -not $cardConfig.enabled)) { throw '-WebsiteCardOnly publishing requires -PublishOnly -SinglePost and x_link_card.enabled=true for a new intent' }
        $variant = Select-PostingVariant $config $lang $CycleId $ReceiptDirectory
        $intent = [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$variant.text; textSha256=(Get-CopyDigest $variant.text); imagePath=$variant.imagePath; selectedUtc=[DateTimeOffset]::UtcNow.ToString('o') }
        if ($WebsiteCardOnly) {
          $selectedImagePath = Resolve-PostingImagePath ([string]$variant.imagePath)
          $selectedImageHash = (Get-FileHash -LiteralPath $selectedImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
          $intent | Add-Member -NotePropertyName postFormat -NotePropertyValue 'website_card'
          $intent | Add-Member -NotePropertyName cardUrl -NotePropertyValue ($cardBaseUrl.TrimEnd('/') + '/share/x/' + $lang + '/' + $selectedImageHash.Substring(0,16))
          $intent | Add-Member -NotePropertyName imageSha256 -NotePropertyValue $selectedImageHash
          $intent | Add-Member -NotePropertyName sourceText -NotePropertyValue $variant.text
        }
        $receipt.entries.$lang = [pscustomobject]@{ state='selected'; intent=$intent; evidence=$null }
      } else { $null = Resolve-XIntentVariant $config $lang $entry.intent }
    }
    foreach ($lang in $languages) {
      $entry = $receipt.entries.$lang
      if ($null -ne $entry -and $entry.state -in @('selected','prepared')) {
        Assert-PostingImageGameStartText ([string]$entry.intent.imagePath) $lang -Platform X
      }
    }
    # Freeze every pair before loading, discovering, or interacting with desktop UI.
    Save-CycleReceipt $receipt $receiptPath
    foreach ($lang in $languages) {
      $cardEntry = $receipt.entries.$lang
      if ($null -ne $cardEntry -and $cardEntry.state -in @('selected', 'prepared') -and
          $cardEntry.intent.PSObject.Properties.Name -contains 'postFormat' -and $cardEntry.intent.postFormat -ceq 'website_card') {
        $null = Assert-XWebsiteCardPublished ([string]$cardEntry.intent.cardUrl)
      }
    }
    . (Join-Path $PSScriptRoot 'WindowsXPosting.ps1')
    Assert-XBeforePublishCutoff $StopAtKst
    Initialize-XWindow -RequestedWindowId $WindowId -AllowSignedOut:$CredentialRecovery
    if ($CredentialRecovery) { Restore-XAccountSession }
    foreach ($lang in $languages) {
      $activeLanguage = $lang
      Assert-XBeforePublishCutoff $StopAtKst
      $entry = $receipt.entries.$lang
      if ($null -ne $entry -and $entry.state -eq 'verified') {
        $null = Resolve-XIntentVariant $config $lang $entry.intent
        if (-not (Test-PublishedEvidence $entry.intent $entry.evidence)) { throw "Invalid verified receipt for $lang" }
        if ($ReconcileExistingPosts) {
          $liveEvidence = Find-XPublishedPost -Intent $entry.intent
          if ($null -eq $liveEvidence -or $liveEvidence.url -cne $entry.evidence.url) { throw "UNSAFE $lang`: verified receipt does not reconcile to one matching live timeline post" }
        }
        Write-Output "VERIFIED_SKIP $lang $($entry.evidence.url)"
        continue
      }
      if ($ReconcileExistingPosts -and $null -ne $entry -and $entry.state -in @('selected','prepared')) {
        $visibleMatch = Find-XPublishedPost -Intent $entry.intent -AllowExistingVisible
        if ($null -ne $visibleMatch) { throw "UNSAFE $lang`: an exact matching post is already visible in the timeline, but the receipt has no publish intent; no second post was created." }
      }
      if ($null -ne $entry -and $entry.state -eq 'publish_intent') {
        $evidence = Find-XPublishedPost -Intent $entry.intent
        if ($null -eq $evidence) { throw "UNCERTAIN $lang`: prior publish intent; no matching new status visible. No second click." }
        $entry.state = 'verified'; $entry.evidence = $evidence
        Save-CycleReceipt $receipt $receiptPath
        continue
      }
      $variant = Resolve-XIntentVariant $config $lang $entry.intent
      $postFormat = if ($entry.intent.PSObject.Properties.Name -contains 'postFormat') { [string]$entry.intent.postFormat } else { 'photo' }
      if ($postFormat -notin @('photo','website_card')) { throw "Unsupported frozen X post format '$postFormat'" }
      $websiteCardMode = $postFormat -eq 'website_card'
      if ($websiteCardMode -and -not $PrepareOnly -and (-not $PublishOnly -or -not $SinglePost)) { throw 'Frozen website-card intent requires -PublishOnly -SinglePost; refusing full-cycle post verification' }
      if ($websiteCardMode -and -not $PrepareOnly -and -not $cardConfig.enabled) { throw 'Frozen website-card publishing is disabled by x_link_card.enabled=false' }
      $text = if ($postFormat -eq 'website_card') { [string]$entry.intent.sourceText } else { [string]$entry.intent.text }
      $imagePath = [string]$variant.imagePath
      $cardUrl = $null
      $composerText = $text
      $imageSha256 = (Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($websiteCardMode) {
        $expectedCardUrl = $cardBaseUrl.TrimEnd('/') + '/share/x/' + $lang + '/' + $imageSha256.Substring(0,16)
        if ($entry.intent.PSObject.Properties.Name -contains 'cardUrl') {
          if ($entry.intent.cardUrl -cne $expectedCardUrl -or $entry.intent.imageSha256 -cne $imageSha256 -or (Resolve-PostingImagePath ([string]$entry.intent.imagePath)) -cne $imagePath) { throw 'Frozen website-card URL/source/hash no longer matches the selected image' }
          $cardUrl = [string]$entry.intent.cardUrl
        } else {
          if ([regex]::Matches($text, [regex]::Escape([string]$config.web_url)).Count -ne 1) { throw 'Website-card source copy must contain exactly one canonical web URL' }
          $cardUrl = $expectedCardUrl
        }
        if ($entry.state -eq 'prepared') {
          $storedCardProof = if ($entry.intent.PSObject.Properties.Name -contains 'cardEvidence') { $entry.intent.cardEvidence } else { $null }
          if ($null -eq $storedCardProof -or $storedCardProof.PSObject.Properties.Name -notcontains 'proofMode' -or $storedCardProof.proofMode -cne 'observed_x_card_group' -or $storedCardProof.cardUrl -cne $cardUrl -or $storedCardProof.boundCardUrl -cne $cardUrl) { throw 'Prepared website-card receipt is missing its exact observed card binding proof.' }
          $script:XExpectedCardUrl = $cardUrl
        }
        $composerText = $text.Replace([string]$config.web_url, $cardUrl)
        if ([regex]::Matches($composerText, [regex]::Escape($cardUrl)).Count -ne 1 -or [regex]::Matches($composerText, [regex]::Escape([string]$config.play_store_url)).Count -ne 1) { throw 'Website-card copy must contain its exact card URL and retain the Play URL once' }
        if ((Get-XWeightedLength $composerText) -gt 280) { throw 'Website-card copy exceeds the X weighted character limit' }
      }
      if ($null -ne $entry -and $entry.state -eq 'prepared') {
        $expectedFrozenText = if ($websiteCardMode) { $composerText } else { $text }
        if ($entry.intent.text -cne $expectedFrozenText -or (Resolve-PostingImagePath ([string]$entry.intent.imagePath)) -cne $imagePath -or $entry.intent.imageSha256 -cne $imageSha256) { throw 'Prepared intent no longer matches canonical copy/image' }
        if ($websiteCardMode -and ($entry.intent.cardUrl -cne $cardUrl -or $entry.intent.postFormat -cne 'website_card')) { throw 'Prepared website-card intent does not match the frozen card' }
        Assert-XComposer $composerText -WebsiteCardOnly:$websiteCardMode -CardUrl $cardUrl
        $intent = $entry.intent
        $proof = $intent
      } else {
        Navigate-XProfile
        Assert-XAccount
        $baseline = @(Get-XStatusUrls)
        if ($websiteCardMode) {
          $proof = Prepare-XPost -Text $composerText -ImagePath $imagePath -WebsiteCardOnly -CardUrl $cardUrl -CardLanguage $lang
          $intent = [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$composerText; sourceText=$text; textSha256=(Get-CopyDigest $composerText); imagePath=$imagePath; imageSha256=$imageSha256; attachmentCount=0; postFormat='website_card'; cardUrl=$cardUrl; baselineUrls=$baseline; createdUtc=[DateTimeOffset]::UtcNow.ToString('o'); preparedUtc=$proof.preparedUtc; cardEvidence=$proof.cardEvidence }
        } else {
          $proof = Prepare-XPost -Text $text -ImagePath $imagePath
          $intent = [pscustomobject]@{ language=$lang; variantId=$variant.id; text=$text; textSha256=(Get-CopyDigest $text); imagePath=$imagePath; imageSha256=$proof.imageSha256; attachmentCount=$proof.attachmentCount; baselineUrls=$baseline; createdUtc=[DateTimeOffset]::UtcNow.ToString('o'); preparedUtc=$proof.preparedUtc }
        }
      }
      if ($PrepareOnly) {
        $receipt.entries.$lang = [pscustomobject]@{ state='prepared'; intent=$intent; evidence=$null }
        Save-CycleReceipt $receipt $receiptPath
        [pscustomobject]@{ status='prepared_not_published'; language=$lang; proof=$proof } | ConvertTo-Json -Depth 5
        exit 0
      }
      $entry = [pscustomobject]@{ state='publish_intent'; intent=$intent; evidence=$null }
      $receipt.entries.$lang = $entry
      Assert-XBeforePublishCutoff $StopAtKst
      Save-CycleReceipt $receipt $receiptPath
      Assert-XBeforePublishCutoff $StopAtKst
      if ($websiteCardMode) { Publish-XPost -Text $composerText -WebsiteCardOnly -CardUrl $cardUrl }
      else { Publish-XPost -Text $text }
      if ($PublishOnly) {
        [pscustomobject]@{ status='published_unverified'; published=1; language=$lang; cycleId=$CycleId; receiptPath=$receiptPath; receiptState='publish_intent' } | ConvertTo-Json -Compress
        exit 0
      }
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
