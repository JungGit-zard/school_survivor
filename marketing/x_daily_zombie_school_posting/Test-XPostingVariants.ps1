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
    $eligibleImages=@(Get-PostingLocaleImageCandidates $config $lang -RequireGameStartText)
    Assert-True (@($config.variants.$lang).Count -eq 3) "$lang has three extra pairs"
    Assert-True (@(Get-PostingLocaleImageCandidates $config $lang).Count -eq 19) "$lang keeps eighteen prior candidates and the appended CTA image"
    Assert-True ($eligibleImages.Count -eq 1) "$lang selects only the single image with confirmed localized game-start text"
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
      Assert-True ($choice.imagePath -match "[\\/]x[\\/]$lang[\\/](marketing_social_30_20261004|marketing_social_20261010_add10|marketing_social_cta_20261010)[\\/]") "$lang/$cycle uses the X locale image pool"
      if ($null -ne $previousImage -and $eligibleImages.Count -gt 1) { Assert-True ($choice.imagePath -cne $previousImage) "$lang/$cycle has no adjacent image repeat" }
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
  $historicTemp=Join-Path $tempFull 'facebook-history';New-Item -ItemType Directory -Path $historicTemp -Force|Out-Null
  Save-CycleReceipt $historicFixture (Join-Path $historicTemp '2026-10-10-0600.json')
  $savedScheduleTimes=@($config.schedule_times);$config.schedule_times=@('06:00','11:00')
  try {
    foreach($lang in @('ja','en','vi','ko')){
      $candidates=@(Get-PostingLocaleImageCandidates $config $lang)
      $previousImage=Get-PostingPreviousImagePath $config $lang '2026-10-10-1100' $historicTemp $candidates -Platform Facebook
      Assert-True (@($candidates|Where-Object{$_ -ceq $previousImage}).Count -eq 1) "$lang historic Facebook receipt maps back to its exact X pool candidate"
      $selected=Select-PostingVariant $config $lang '2026-10-10-1100' $historicTemp -Platform Facebook
      Assert-True ($selected.imagePath -cne $previousImage) "$lang next Facebook cycle avoids the image in the historic 0600 receipt without a platform-path exception"
    }
  } finally {$config.schedule_times=$savedScheduleTimes}
  $choice = $config.variants.ja[0]
  $receipt = [pscustomobject]@{ schema=1; cycleId='2026-09-06-0900'; entries=[pscustomobject]@{ ja=[pscustomobject]@{ state='selected'; intent=[pscustomobject]@{ variantId=$choice.id; text=$choice.text; imagePath=$choice.imagePath } }; en=$null; vi=$null; ko=$null } }
  Save-CycleReceipt $receipt $fixturePath
  Assert-True ((Select-PostingVariant $config ja '2026-09-06-1200' $temp).id -ne 'bell') 'prior actual choice prevents repeat despite slot default'
  Assert-True ((Select-PostingVariant $config ja '2026-09-08-1200' $temp).id -ne 'bell') 'missed slots do not cause repeated actual choice'
  Save-CycleReceipt $config $savedConfig
  $cardVariant=$config.variants.ja[0]
  $cardImagePath=Resolve-PostingImagePath ([string]$cardVariant.imagePath)
  $cardImageHash=(Get-FileHash -LiteralPath $cardImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $cardUrl='https://escapezombie.com/share/x/ja/'+$cardImageHash.Substring(0,16)
  $cardText=$cardVariant.text.Replace([string]$config.web_url,$cardUrl)
  $cardCycle='2026-09-10-0900'
  $cardEntry=[pscustomobject]@{state='selected';intent=[pscustomobject]@{variantId=$cardVariant.id;text=$cardText;sourceText=$cardVariant.text;textSha256=(Get-CopyDigest $cardText);imagePath=$cardImagePath;imageSha256=$cardImageHash;attachmentCount=0;postFormat='website_card';cardUrl=$cardUrl};evidence=$null}
  $cardReceipt=[pscustomobject]@{schema=1;cycleId=$cardCycle;entries=[pscustomobject]@{ja=$cardEntry;en=$null;vi=$null;ko=$null}}
  Save-CycleReceipt $cardReceipt (Join-Path $tempFull ($cardCycle+'.json'))
  $cardOut=& powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -DryRun -FullCycle -ConfigPath $savedConfig -CycleId $cardCycle -ReceiptDirectory $tempFull
  Assert-True ($LASTEXITCODE -eq 0) 'dry-run reads a frozen website-card receipt without UI or config activation'
  $cardResult=$cardOut|ConvertFrom-Json
  Assert-True ($cardResult.selections[0].postFormat -eq 'website_card' -and $cardResult.selections[0].cardUrl -ceq $cardUrl -and $cardResult.selections[0].text -ceq $cardText) 'dry-run preserves the exact card URL, posted text, and frozen format'
  $newCardPreviewOut=& powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -DryRun -FullCycle -WebsiteCardOnly -ConfigPath $savedConfig -CycleId 2026-09-12-0900 -ReceiptDirectory $tempFull
  Assert-True ($LASTEXITCODE -eq 0) 'new website-card text can be inspected in a non-mutating dry-run'
  $newCardPreview=$newCardPreviewOut|ConvertFrom-Json
  Assert-True ($newCardPreview.selections[0].postFormat -eq 'website_card' -and $newCardPreview.selections[0].cardUrl -match '^https://escapezombie\.com/share/x/ja/[0-9a-f]{16}$' -and $newCardPreview.selections[0].text.Contains($newCardPreview.selections[0].cardUrl)) 'dry-run renders the locale and selected-image hash into the card URL and copy'
  $photoWithCardSwitchOut=& powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -DryRun -FullCycle -WebsiteCardOnly -ConfigPath $savedConfig -CycleId 2026-09-06-0900 -ReceiptDirectory $tempFull
  Assert-True ($LASTEXITCODE -eq 0) 'website-card opt-in does not reject an existing frozen photo intent'
  $photoWithCardSwitch=$photoWithCardSwitchOut|ConvertFrom-Json
  Assert-True ($photoWithCardSwitch.selections[0].postFormat -eq 'photo') 'existing intent format remains authoritative when the card switch is present'
  $legacyConfig=$config|ConvertTo-Json -Depth 30|ConvertFrom-Json
  $legacyConfig.PSObject.Properties.Remove('x_link_card')
  $legacyConfigPath=Join-Path $tempFull 'legacy-config.json'
  $legacyConfig|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $legacyConfigPath -Encoding UTF8
  $legacyOut=& powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -DryRun -FullCycle -ConfigPath $legacyConfigPath -CycleId 2026-09-06-0900 -ReceiptDirectory $tempFull
  Assert-True ($LASTEXITCODE -eq 0) 'older custom configs without x_link_card remain compatible'
  $ctaImagePath=[string]$config.localized_social_image_pool.en.images[0]
  $ctaFullPath=Resolve-PostingImagePath $ctaImagePath
  $ctaRelative=$ctaFullPath.Substring([IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool')).Length+1).Replace([string][char]92,'/')
  $ctaFixtureRows=@(foreach($row in $catalog.images){
    $copy=[pscustomobject]@{platform=[string]$row.platform;locale=[string]$row.locale;collection=[string]$row.collection;path=[string]$row.path;source=[string]$row.source;gameStartText='NO CTA'}
    if($copy.platform -ceq 'X' -and $copy.locale -ceq 'en' -and $copy.path -ceq $ctaRelative){$copy.gameStartText=Get-PostingGameStartText en}
    $copy
  })
  $ctaFixtureCatalog=[pscustomobject]@{images=$ctaFixtureRows}
  $ctaEligible=@(Get-PostingLocaleImageCandidates $config en -RequireGameStartText -Catalog $ctaFixtureCatalog)
  Assert-True ($ctaEligible.Count -eq 1 -and $ctaEligible[0] -ceq $ctaFullPath) 'new X image selection admits only catalog proof with exact localized START GAME text'
  foreach($lang in @('ko','en','ja','vi')){
    $label=Get-PostingGameStartText $lang
    $localizedPath=[string]$config.localized_social_image_pool.$lang.images[0]
    $localizedFull=Resolve-PostingImagePath $localizedPath
    $localizedRelative=$localizedFull.Substring([IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool')).Length+1).Replace([string][char]92,'/')
    $localizedProof=[pscustomobject]@{images=@([pscustomobject]@{platform='X';locale=$lang;collection='fixture';path=$localizedRelative;gameStartText=$label})}
    Assert-True (Test-PostingImageGameStartText $localizedFull $lang X $localizedProof) "$lang accepts only its exact localized game-start label"
    $wrongLabel=[pscustomobject]@{images=@([pscustomobject]@{platform='X';locale=$lang;collection='fixture';path=$localizedRelative;gameStartText='NO CTA'})}
    Assert-True (-not (Test-PostingImageGameStartText $localizedFull $lang X $wrongLabel)) "$lang rejects a nonmatching image CTA label"
  }
  $missingCtaCatalog=[pscustomobject]@{images=@($catalog.images | Where-Object { $_.platform -ceq 'X' -and $_.locale -ceq 'en' -and $_.PSObject.Properties.Name -notcontains 'gameStartText' })}
  Assert-True (-not (Test-PostingImageGameStartText $ctaImagePath en X $missingCtaCatalog)) 'catalog entries without confirmed localized game-start text are rejected'
  $wrongLocaleCta=[pscustomobject]@{images=@([pscustomobject]@{platform='X';locale='ko';collection='fixture';path=$ctaRelative;gameStartText=(Get-PostingGameStartText en)})}
  Assert-True (-not (Test-PostingImageGameStartText $ctaImagePath en X $wrongLocaleCta)) 'CTA proof cannot be borrowed across locales'
  $noCtaSelectionRejected=$false
  try {$null=Select-PostingLocaleImagePath $config en '2026-09-06-0900' $temp X $missingCtaCatalog}catch{$noCtaSelectionRejected=$_.Exception.Message -like '*No confirmed localized game-start CTA*'}
  Assert-True $noCtaSelectionRejected 'empty eligible-image set errors instead of falling back to an unconfirmed image'
  foreach($state in @('selected','prepared')){
    $cycle=if($state -eq 'selected'){'2026-09-29-0900'}else{'2026-09-30-0900'}
    $oldImage=[string]$config.image_pool.ko.images[0]
    $intent=[pscustomobject]@{language='ko';variantId='original';text=[string]$config.copy.ko.text;textSha256=(Get-CopyDigest ([string]$config.copy.ko.text));imagePath=$oldImage;imageSha256=$null}
    $oldEntry=[pscustomobject]@{state=$state;intent=$intent;evidence=$null}
    $oldReceipt=[pscustomobject]@{schema=1;cycleId=$cycle;status='incomplete';lastError=$null;failedLanguage=$null;entries=[pscustomobject]@{ko=$oldEntry;en=$null;ja=$null;vi=$null}}
    Save-CycleReceipt $oldReceipt (Join-Path $tempFull ($cycle+'.json'))
    $savedPreference=$ErrorActionPreference;$ErrorActionPreference='Continue'
    try {$blockedResume=& powershell -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -Run -SinglePost -PublishOnly -Language ko -ConfigPath $savedConfig -CycleId $cycle -ReceiptDirectory $tempFull 2>&1} finally {$ErrorActionPreference=$savedPreference}
    Assert-True ($LASTEXITCODE -ne 0 -and (($blockedResume -join "`n") -match 'not confirmed to contain the exact localized game-start CTA')) "$state X receipt without image CTA is rejected before desktop initialization"
  }
  $fbCtaRow=@($catalog.images | Where-Object { $_.platform -ceq 'Facebook' -and $_.locale -ceq 'en' } | Select-Object -First 1)[0]
  $fbCtaFull=Resolve-PostingImagePath ('image_pool/'+$fbCtaRow.path) -Platform Facebook
  $fbCtaCatalog=[pscustomobject]@{images=@([pscustomobject]@{platform='Facebook';locale='en';collection=$fbCtaRow.collection;path=$fbCtaRow.path;source=$fbCtaRow.source;gameStartText=(Get-PostingGameStartText en)})}
  Assert-True (Test-PostingImageGameStartText $fbCtaFull en Facebook $fbCtaCatalog) 'Facebook candidate requires its own platform and locale CTA proof'
  $fbMissingCta=[pscustomobject]@{images=@([pscustomobject]@{platform='Facebook';locale='en';collection=$fbCtaRow.collection;path=$fbCtaRow.path;source=$fbCtaRow.source})}
  Assert-True (-not (Test-PostingImageGameStartText $fbCtaFull en Facebook $fbMissingCta)) 'Facebook image without its own confirmed CTA metadata is rejected'
  $fbWrongLocale=$false;try{$null=Assert-PostingImageGameStartText $fbCtaFull ko Facebook $fbCtaCatalog}catch{$fbWrongLocale=$true}
  Assert-True $fbWrongLocale 'CTA proof from another locale cannot authorize an image'
  $runnerSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -Raw -Encoding UTF8
  $ctaGuardBlock=[regex]::Match($runnerSource,'foreach \(\$lang in \$languages\) \{\r?\n      \$entry = \$receipt\.entries\.\$lang[\s\S]*?\r?\n    \}\r?\n    # Freeze every pair').Value
  Assert-True ($ctaGuardBlock.Contains("state -in @('selected','prepared')") -and -not $ctaGuardBlock.Contains('publish_intent')) 'CTA guard applies only to selected/prepared intents and leaves existing publish_intent untouched'
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
    if (-not $tempFull.StartsWith($systemTempFull, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($tempFull) -notmatch '^x-variants-test-[0-9a-f]{32}$') { throw 'Refusing to clean an unscoped X variants test directory.' }
    Remove-Item -LiteralPath $tempFull -Recurse -Force
  }
}
Write-Output 'VARIANT_TEST_OK'
