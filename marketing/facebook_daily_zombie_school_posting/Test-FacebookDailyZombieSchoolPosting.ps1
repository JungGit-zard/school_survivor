Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};"PASS $Name"}
$invoke=Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1'
$invokeSource=Get-Content -LiteralPath $invoke -Raw -Encoding UTF8
Assert-True ($invokeSource.Contains('[string]$StopAtKst') -and $invokeSource.Contains('SCHEDULE_CUTOFF: KST cutoff reached before Facebook native Publish click.') -and $invokeSource.IndexOf('SCHEDULE_CUTOFF: KST cutoff reached before Facebook native Publish click.') -lt $invokeSource.IndexOf('Invoke-FacebookPublishNative $WindowId')) 'same-day cutoff is rechecked inside Facebook PublishOnce immediately before the native click'
$config=Get-FacebookConfig
foreach($lang in $script:FacebookLanguages){$pair=Get-FacebookPair $config $lang;Assert-True ($pair.attachmentCount -eq 1) "$lang exact pair has one image";Assert-True (Test-FacebookUnderImageRoot $pair.imagePath) "$lang image is allowlisted"}
. (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
$selectionCandidates=@(Get-PostingLocaleImageCandidates $config ja);$selectedPoolPath=[string]$selectionCandidates[-1];$selectedPoolVariant=[pscustomobject]@{id='original';imagePath=$selectedPoolPath};$selectedPoolPair=Get-FacebookPairFromSelectedVariant $config ja $selectedPoolVariant
$expectedSelectedFacebookPath=Resolve-FacebookPlatformImagePath $selectedPoolPath ja
Assert-True ($selectedPoolPair.imagePath -ceq $expectedSelectedFacebookPath -and [IO.Path]::GetFileName($selectedPoolPair.imagePath) -ceq [IO.Path]::GetFileName($selectedPoolPath)) 'Facebook selected source pair preserves the selected locale-pool image and resolves its exact Facebook catalog copy'
Assert-FacebookFrozenIntent $config ja $selectedPoolPair
Assert-True (Test-FacebookCanonicalIntent $config $selectedPoolPair) 'selected locale-pool image remains canonical through frozen receipt validation'
$foreignLocaleCandidate=[string](Get-PostingLocaleImageCandidates $config en | Select-Object -First 1);$foreignFacebookPath=Resolve-FacebookPlatformImagePath $foreignLocaleCandidate en
$foreignLocaleIntent=[pscustomobject]@{language='ja';variantId=$selectedPoolPair.variantId;text=$selectedPoolPair.text;textSha256=$selectedPoolPair.textSha256;imagePath=$foreignFacebookPath;attachmentCount=1}
Assert-True (-not (Test-FacebookCanonicalIntent $config $foreignLocaleIntent)) 'selected-pool receipt rejects an image mapped to another locale'
$wrapperSource=Get-Content -LiteralPath $invoke -Raw -Encoding UTF8
Assert-True ($wrapperSource -match '\[switch\]\$ForceReload' -and $wrapperSource -match 'if \(\$ForceReload -and \$Action -ne ''OpenProfile''\)' -and $wrapperSource -match 'Open-FacebookProfileNative \$WindowId -ForceReload:\$ForceReload') 'ForceReload is routed only through OpenProfile and remains guarded for every other wrapper action'
Assert-True ($wrapperSource -match 'Get-FacebookPairFromSelectedVariant \$config \$Language \$selectedVariant') 'SelectSourcePair passes the selected variant image path into Facebook image mapping'
foreach($lang in $script:FacebookLanguages){foreach($bossId in @('boss-b01','boss-b02','boss-b03','boss-b04','boss-all')){ $failed=$false;try{$null=Get-FacebookPair $config $lang $bossId}catch{$failed=$true};Assert-True $failed "$lang/$bossId shared reference is not a new localized Facebook pair" }}
$legacyBossPath=[IO.Path]::GetFullPath((Join-Path (Split-Path $script:FacebookImageRoot -Parent) 'boss_series\boss_b03_promotional.png'))
$koBossB03=[pscustomobject]@{language='ko';variantId='boss-b03';text=$config.copy.ko.text;textSha256=(Get-FacebookSha256 $config.copy.ko.text);imagePath=$legacyBossPath;attachmentCount=1}
Assert-FacebookFrozenIntent $config ko $koBossB03
Assert-True (Test-FacebookCanonicalIntent $config $koBossB03) 'explicit legacy boss receipt remains valid without creating a localized Facebook pair'
Assert-True ((Resolve-FacebookAttachmentPath $legacyBossPath) -ceq [IO.Path]::GetFullPath((Join-Path $script:FacebookImageRoot '..\reference\boss_series\boss_b03_promotional.png'))) 'legacy attachment selection resolves to the shared reference file under guard'
Assert-True ((Resolve-FacebookAttachmentPath (Get-FacebookPair $config ja 'bell').imagePath) -ceq (Get-FacebookPair $config ja 'bell').imagePath) 'new Facebook attachment selection resolves only its Facebook copy'
$legacyJaImage=[IO.Path]::GetFullPath((Join-Path (Split-Path $script:FacebookImageRoot -Parent) 'marketing_social_30_20261004\ja\01_bell_escape.png'))
$jaVariant=@((Get-PostingVariants $config ja -IncludeDisabled)|Where-Object{$_.id -ceq 'bell'})[0]
$legacyJa=[pscustomobject]@{language='ja';variantId='bell';text=$jaVariant.text;textSha256=(Get-FacebookSha256 $jaVariant.text);imagePath=$legacyJaImage;attachmentCount=1}
Assert-FacebookFrozenIntent $config ja $legacyJa
Assert-True (Test-FacebookCanonicalIntent $config $legacyJa) 'legacy localized Facebook receipt remains canonical through its explicit X-path mapping'
Assert-True ((Resolve-FacebookAttachmentPath $legacyJaImage) -ceq [IO.Path]::GetFullPath((Join-Path $script:FacebookImageRoot '..\x\ja\marketing_social_30_20261004\01_bell_escape.png'))) 'legacy localized attachment path resumes at the original X asset under explicit mapping'
$xPairPath=(Get-FacebookPair $config ja 'bell').imagePath -replace '\\facebook\\','\\x\\'
$crossPlatformRejected=$false;try{$null=Resolve-FacebookAttachmentPath $xPairPath}catch{$crossPlatformRejected=$true}
Assert-True $crossPlatformRejected 'Facebook attachment resolver rejects an unregistered X path'
Assert-True (-not (Test-FacebookUnderImageRoot (Join-Path $script:FacebookImageRoot '..\evil.png'))) 'path traversal rejected'
Assert-True (-not (Test-FacebookUnderImageRoot 'C:\temp\evil.png')) 'outside path rejected'
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$temp=Join-Path $tempRoot ('facebook-posting-test-'+[guid]::NewGuid().ToString('N'))
try {
 $run='2026-09-27-1700-photo-repost';$path=Get-FacebookReceiptPath $temp $run;$receipt=New-FacebookReceipt $run;$pair=Get-FacebookPair $config en
 $receipt.entries.en=[pscustomobject]@{state='prepared';intent=$pair; evidence=$null};Add-FacebookPublishIntent $receipt en $pair $path
 $duplicate=$false;try{Add-FacebookPublishIntent $receipt en $pair $path}catch{$duplicate=$true};Assert-True $duplicate 'duplicate publish intent rejected'
 Assert-True (-not (Test-FacebookComplete $receipt)) 'uncertain receipt is not complete'
 $bad=[pscustomobject]@{permalink='https://www.facebook.com/hyunuk.jung.56/posts/pfbidX';text=($pair.text+' extra');attachmentCount=1;audience='Friends'};Assert-True (-not (Test-FacebookEvidence $pair $bad)) 'substring text evidence rejected'
 $wrongAudience=[pscustomobject]@{permalink='https://www.facebook.com/hyunuk.jung.56/posts/pfbidX';text=$pair.text;attachmentCount=1;audience='Public'};Assert-True (-not (Test-FacebookEvidence $pair $wrongAudience)) 'public audience rejected'
 $timeout=$false;try{Assert-FacebookDraft $pair $pair.text 0 'Friends'}catch{$timeout=$true};Assert-True $timeout 'missing attachment fails draft verification'
  $selected=& powershell -NoProfile -ExecutionPolicy Bypass -File $invoke -Action SelectSourcePair -RunId '2026-09-27-2149-wrappertest' -Language en -VariantId escape -ReceiptDirectory $temp 2>&1
  Assert-True ($LASTEXITCODE -eq 0 -and (($selected -join "`n") -match 'selected')) 'wrapper command selects a receipt intent'
  $prepared=Get-Content -LiteralPath (Get-FacebookReceiptPath $temp '2026-09-27-2149-wrappertest') -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($prepared.entries.en.state -eq 'selected' -and $prepared.schema -eq 1) 'receipt lifecycle begins selected with current schema'
  $rotated=& powershell -NoProfile -ExecutionPolicy Bypass -File $invoke -Action SelectSourcePair -RunId '2026-10-01-1100' -Language ja -ReceiptDirectory $temp 2>&1
  Assert-True ($LASTEXITCODE -eq 0 -and (($rotated -join "`n") -match 'selected')) 'wrapper selects a rotated scheduled variant without an explicit VariantId'
  $rotatedReceipt=Get-Content -LiteralPath (Get-FacebookReceiptPath $temp '2026-10-01-1100') -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True (-not [string]::IsNullOrWhiteSpace([string]$rotatedReceipt.entries.ja.intent.variantId)) 'rotated scheduled selection freezes its variant ID'
  $savedPreference=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try {$refused=& powershell -NoProfile -ExecutionPolicy Bypass -File $invoke -Action PublishOnce -RunId '2026-09-27-2149-wrappertest' -Language en -ReceiptDirectory $temp 2>&1} finally {$ErrorActionPreference=$savedPreference}
  Assert-True ($LASTEXITCODE -ne 0 -and (($refused -join "`n") -match 'explicit -AuthorizePublish')) 'publish is refused without explicit authorization before UI'
 Assert-True ($prepared.entries.en.state -ne 'publish_intent') 'refused publish leaves no publish intent'
  . (Join-Path $PSScriptRoot 'FacebookNative.ps1')
  $nativeSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'FacebookNative.ps1') -Raw -Encoding UTF8
  Assert-True (Test-FacebookExactPostUrl 'https://www.facebook.com/hyunuk.jung.56/posts/pfbid0LHwaGf1mHjxKGzCgsh2zzzonSpDv8rtHJmBziMFyzBz12moLETn3efQwC6jr4fGel') 'exact-post navigation accepts the fixed profile post URL'
  Assert-True (-not (Test-FacebookExactPostUrl 'https://www.facebook.com/other.user/posts/pfbid123')) 'exact-post navigation rejects another profile path'
  Assert-True (-not (Test-FacebookExactPostUrl 'https://evil.example/hyunuk.jung.56/posts/pfbid123')) 'exact-post navigation rejects another host'
  Assert-True (-not (Test-FacebookExactPostUrl 'https://www.facebook.com/hyunuk.jung.56/?q=/posts/pfbid123')) 'exact-post navigation rejects profile query paths'
  Assert-True (Test-FacebookExactPostDisplayAddress 'facebook.com/hyunuk.jung.56/posts/pfbid0LHwaGf1mHjxKGzCgsh2zzzonSpDv8rtHJmBziMFyzBz12moLETn3efQwC6jr4fGel' 'https://www.facebook.com/hyunuk.jung.56/posts/pfbid0LHwaGf1mHjxKGzCgsh2zzzonSpDv8rtHJmBziMFyzBz12moLETn3efQwC6jr4fGel') 'exact-post readback normalizes Chrome scheme-less address display'
  Assert-True (-not (Test-FacebookExactPostDisplayAddress 'evil.example/hyunuk.jung.56/posts/pfbid123' 'https://www.facebook.com/hyunuk.jung.56/posts/pfbid123')) 'exact-post readback rejects another host'
  Assert-True (-not (Test-FacebookExactPostDisplayAddress 'facebook.com/hyunuk.jung.56/?q=/posts/pfbid123' 'https://www.facebook.com/hyunuk.jung.56/posts/pfbid123')) 'exact-post readback rejects a different path'
  $invokeSource=Get-Content -LiteralPath $invoke -Raw -Encoding UTF8
  Assert-True ($invokeSource -match "'OpenExactPost'" -and $invokeSource -match 'Open-FacebookExactPostNative \$Permalink \$WindowId') 'exact-post navigation is exposed only through the Facebook wrapper'
  Assert-True ($nativeSource -match "function Open-FacebookProfileNative" -and $nativeSource -match "Name -ceq 'Facebook'" -and $nativeSource -match 'Assert-FacebookProfileAddress' -and $nativeSource -notmatch 'Start-Process -FilePath ''chrome\.exe''') 'profile wrapper reuses only the exact existing Facebook tab and confirms the fixed profile address'
  Assert-True ($nativeSource -match 'function Wait-FacebookProfileReady' -and $nativeSource -match 'Assert-FacebookProfileAddress \$Window;Assert-FacebookAccountMarker \$Window' -and $nativeSource -match 'Open-FacebookComposerNative.*Wait-FacebookProfileReady \$w') 'profile and composer wait for the exact address and account marker to settle'
  Assert-True ($nativeSource -match 'function Test-FacebookVisiblePostingIdentity' -and $nativeSource -match "What's on your mind\?" -and $nativeSource -match 'one enabled own-profile composer button' -and $nativeSource -match 'Expected visible Facebook posting identity') 'offscreen profile-name duplicates do not block an otherwise visible exact own-profile composer'
  $clickSource=[regex]::Match($nativeSource,'(?s)function Invoke-FacebookUiClick.*?(?=\r?\nfunction |\z)').Value
  Assert-True ($nativeSource -match 'function Get-FacebookExactStorageWarningClose' -and $nativeSource -match '\$warningText=''계속하려면 여유 공간을 확보하세요''' -and $nativeSource -match "@\('Close','닫기'\)" -and $nativeSource -match 'function Close-FacebookChromeStorageWarningIfPresent' -and $nativeSource -match 'Close-FacebookChromeStorageWarningIfPresent \$Window\|Out-Null') 'only one exact Chrome storage warning with one scoped Close button can be dismissed while profile readiness settles'
  $storageSource=[regex]::Match($nativeSource,'(?s)function Get-FacebookExactStorageWarningClose.*?(?=\r?\nfunction |\z)').Value
  Assert-True ($storageSource -match 'ControlType\]::Window' -and $storageSource -match 'Get-FacebookUiAll \$warnings\[0\]' -and $storageSource -notmatch '\$walker\.GetParent') 'Chrome storage recovery uses only the exact dialog and ignores its same-named heading'
  Assert-True ($clickSource -match '\$clickRoot=\$storageClose\.dialog' -and $clickSource -match 'Get-FacebookUiAll \$clickRoot' -and $clickSource -match 'Exact Chrome storage warning disappeared immediately before its Close click') 'storage-warning Close is freshly reacquired only inside that dialog before the one coordinate click'
  $waitSource=[regex]::Match($nativeSource,'(?s)function Wait-FacebookProfileReady.*?(?=\r?\nfunction |\z)').Value
  Assert-True ($waitSource -match 'Close-FacebookChromeStorageWarningIfPresent \$Window\|Out-Null' -and $waitSource.IndexOf('Close-FacebookChromeStorageWarningIfPresent') -lt $waitSource.IndexOf('try { Assert-FacebookProfileAddress')) 'storage-warning ambiguity is not swallowed by the profile-settle retry catch'
  $invokeSource=Get-Content -LiteralPath $invoke -Raw -Encoding UTF8
  Assert-True ($invokeSource -match "'RecoverStorageWarning'" -and $invokeSource -match 'Close-FacebookChromeStorageWarningIfPresent \$w') 'storage-warning recovery is exposed only through the Facebook wrapper action'
  Assert-True ($invokeSource -match "'ProfileReadinessDiagnostics'" -and $invokeSource -match 'Get-FacebookProfileReadinessDiagnostics \$w' -and $invokeSource -match "'ProfileReadinessDiagnostics'" ) 'read-only wrapper diagnostics expose the exact profile-ready predicate inputs'
  Assert-True ($nativeSource -match 'exactFacebookTabCount' -and $nativeSource -match 'Test-FacebookTabName' -and $nativeSource -match 'Get-FacebookVisibleTabSnapshot \$Window') 'read-only profile diagnostics expose the exact Facebook tab count for approved wrapper fallback decisions'
  Assert-True ($nativeSource -match 'function Set-FacebookStableWindowBounds' -and $nativeSource -match 'IsZoomed' -and $nativeSource -match 'ShowWindow\(\$target,9\)' -and $nativeSource -match 'for\(\$attempt=0;\$attempt -lt 2;\$attempt\+\+\)' -and $nativeSource -match 'SetWindowPos' -and $nativeSource -match 'GetWindowRect' -and $nativeSource -match 'after one restore retry' -and $nativeSource -match '\$script:FacebookWindowWidth=1280' -and $nativeSource -match '\$script:FacebookWindowHeight=900') 'every native Facebook action restores a maximized exact HWND once, then fixes and verifies the stable 1280x900 posting window bounds'
  Assert-True ($nativeSource -match 'function Resolve-FacebookCoordinateCacheEntry' -and $nativeSource -match 'Get-FacebookUiParentWindowName' -and $nativeSource -match 'SetCursorPos' -and $nativeSource -match 'mouse_event') 'coordinate clicks use the process-independent native cache adapter'
  Assert-True ($nativeSource -match 'composerCoordinate=\$click' -and $nativeSource -match 'photoCoordinate.*\$photoCoordinate' -and $nativeSource -match 'windowBounds=\(Set-FacebookStableWindowBounds \$w\)') 'the fixed-window composer and photo steps return their freshly verified PID/HWND viewport coordinates'
  Assert-True ($clickSource -match '\$layout=Set-FacebookStableWindowBounds \$Window' -and $clickSource.IndexOf('Set-FacebookStableWindowBounds') -lt $clickSource.IndexOf('BoundingRectangle')) 'each coordinate is taken only after the fixed 0,0 1280x900 viewport is rechecked'
  Assert-True ($nativeSource -match 'function Select-FacebookProfileTab' -and $nativeSource -match 'SelectionItemPattern' -and $nativeSource -match '\$selection\.Select\(\)' -and $nativeSource -notmatch 'Invoke-FacebookUiClick \$tabs\[0\] \$Window -AllowMissingAccountMarker' -and $nativeSource -match 'function Navigate-FacebookProfileInSelectedTab' -and $nativeSource -match 'Assert-FacebookProfileAddress \$w' -and $nativeSource -match 'Assert-FacebookAccountMarker \$w') 'exact Facebook tab uses semantic UIA selection and same-tab profile navigation before account verification'
  Assert-True ($invokeSource -match "'OpenProfileNewTab'" -and $invokeSource -match 'Open-FacebookProfileNewTabNative \$WindowId') 'wrapper exposes a bounded native new-tab profile opener for an exact existing Chrome HWND'
  Assert-True ($invokeSource -match "'CloseDuplicateProfileTab'" -and $invokeSource -match 'Close-FacebookDuplicateProfileTabNative \$WindowId' -and $nativeSource -match 'CloseDuplicateProfileTab requires a fresh explicit WindowId' -and $nativeSource -match '\$profileTabs\[-1\]' -and $nativeSource -match '\$selection\.Select\(\)' -and $nativeSource -match 'Get-FacebookExistingComposerReadiness \$w' -and $nativeSource -match "SendWait\('\^w'\)" -and $nativeSource -match 'Select-FacebookProfileTab \$w') 'wrapper selects the trace-identified newest duplicate, guards identity/tabs/draft, closes once, and restores the original Facebook tab'
  Assert-True ($nativeSource -match 'existingFacebookTabs=@\(\(Get-FacebookVisibleTabSnapshot \$w\)\|Where-Object\{Test-FacebookTabName \$_.name\}\)' -and $nativeSource -match 'existingFacebookTabs.Count -gt 1' -and $nativeSource -match 'existingFacebookTabs.Count -eq 1\)\{return Open-FacebookProfileNative \$WindowId\}') 'new-tab profile opener reuses exactly one existing Facebook tab and refuses duplicate tabs'
  Assert-True ($nativeSource -match 'function Open-FacebookProfileNewTabNative' -and $nativeSource -match "SendWait\('\^t'\)" -and $nativeSource -match 'SetText\(\$script:FacebookProfileUrl\)' -and $nativeSource -match "SendWait\('\^v'\).*SendWait\('\{ENTER\}'\)" -and $nativeSource -match 'selectedTabBefore' -and $nativeSource -match 'Wait-FacebookProfileReady \$w') 'new-tab profile opener uses only native UI keystrokes in the exact Chrome HWND and then proves the fixed profile/account marker'
  Assert-True ($nativeSource -notmatch 'Start-Process -FilePath ''chrome\.exe''' -and $nativeSource -notmatch 'chrome\.exe.*--remote-debugging-port' -and $nativeSource -notmatch 'DevToolsActivePort') 'new-tab profile opener does not spawn Chrome, use CDP, or inspect browser internals'
  $cacheKey='profile=https://www.facebook.com/hyunuk.jung.56/|bounds=0,0,1280,900|control=ControlType.Button|name=Post';$cacheState='account=Hyun Uk Jung|dialog=Create post'
  Assert-True ($script:FacebookProfileUrl -ceq 'https://www.facebook.com/hyunuk.jung.56/') 'coordinate cache uses the exact nonempty canonical Facebook profile key'
  $firstCache=Resolve-FacebookCoordinateCacheEntry @() $cacheKey $cacheState 640 700
  Assert-True (-not $firstCache.cacheHit -and $firstCache.records.Count -eq 1 -and $firstCache.records[0].x -eq 640 -and $firstCache.records[0].y -eq 700) 'coordinate cache refreshes from the first fresh UIA frame'
  $hitCache=Resolve-FacebookCoordinateCacheEntry $firstCache.records $cacheKey $cacheState 640 700
  Assert-True ($hitCache.cacheHit) 'coordinate cache hits only when the fresh UIA frame and expected state match'
  $staleCache=Resolve-FacebookCoordinateCacheEntry $hitCache.records $cacheKey $cacheState 641 700
  Assert-True (-not $staleCache.cacheHit -and $staleCache.records[0].x -eq 641) 'stale coordinate cache is replaced from the fresh UIA frame before clicking'
  Assert-True ($nativeSource -match '\^\(\?:https\?://\)\?\(\?:www\\\.\)\?facebook\\\.com/hyunuk\\\.jung\\\.56') 'profile address accepts Chrome scheme-less display without broadening the fixed path'
  Assert-True ($nativeSource -match '\[Windows\.Automation\.Automation\]::Compare\(\$focused,\$e\)' -and $nativeSource -notmatch '\[Windows\.Automation\.AutomationElement\]::Compare') 'composer focus check uses the PS5.1 UIA Automation.Compare API'
  Assert-True ($nativeSource -match "Set-FacebookComposerTextNative.*SendWait\('\^a'\).*SendWait\('\^v'\).*retain exact select-all/pasted text") 'text replacement selects all and pastes only after exact editor focus, then verifies the full value'
  $openNewestSource=[regex]::Match($nativeSource,'(?s)function Open-FacebookNewestPostNative.*?(?=\r?\nfunction |\z)').Value
  Assert-True ($openNewestSource -match 'Open-FacebookProfileNative \$WindowId -ForceReload' -and $nativeSource -match 'function Open-FacebookProfileNative\(\[long\]\$WindowId=0,\[switch\]\$ForceReload\)' -and $nativeSource -match 'if\(\$ForceReload\)\{Navigate-FacebookProfileInSelectedTab \$w\}' -and $openNewestSource -match 'Wait-FacebookProfileReady \$w' -and $openNewestSource -match 'ControlViewWalker\.GetParent' -and $openNewestSource -match 'Test-FacebookFeedPostScope' -and $openNewestSource -notmatch 'Get-FacebookPostEvidenceFromTree') 'feed opener force-reloads the exact Facebook profile top before scoping a post ancestor, preventing stale-scroll and active-tab candidates'
  Assert-True ($nativeSource -match 'function Wait-FacebookStableUiTarget' -and $nativeSource -match 'Start-Sleep -Milliseconds \$DelayMilliseconds' -and $nativeSource -match 'Exact feed target frame changed during the bounded stability wait' -and $openNewestSource -match 'Bring-FacebookUiTargetIntoView \$matches\[0\]\.link \$w' -and $openNewestSource -match 'Wait-FacebookStableUiTarget \$visibleTimestamp \$w 350' -and $openNewestSource -match 'Invoke-FacebookUiClick \$stableTimestamp \$w') 'feed timestamp gets controlled visibility plus two bounded fresh UIA stability reads after reload while the final click guard remains in place'
  Assert-True ($nativeSource -match 'function Test-FacebookFeedPostScope' -and $nativeSource -match 'Test-FacebookCampaignUrl' -and $nativeSource -match 'Shared with Your friends' -and $nativeSource -match 'photo/\\\?fbid=') 'feed scope checks ordered copy, Friends privacy, author links, and one photo link'
  Assert-True ($openNewestSource -match 'a few seconds ago' -and $openNewestSource -match 'about a minute ago' -and $openNewestSource -match '#\\\?' -and $openNewestSource -match '/posts/' -and $openNewestSource -match 'fresh canonical /posts/ address') 'feed opener accepts observed own timestamp-link shapes and returns only a fresh canonical post address'
  Assert-True ($openNewestSource -match 'AddSeconds\(10\)' -and $openNewestSource -match 'matches\.Count -gt 1' -and $openNewestSource -match '\(\?:https\?://\)\?' -and $openNewestSource -match "'https://www.facebook.com'") 'feed opener waits only for no candidate, stops ambiguity, and canonicalizes a scheme-less post address'
  Assert-True ($nativeSource -match 'function Test-FacebookFeedPostPrefixScope' -and $nativeSource -match "Name -ceq 'See more'" -and $openNewestSource -match 'Test-FacebookFeedPostPrefixScope' -and $openNewestSource -match 'Get-FacebookScopedButton \$prefixes\[0\]\.post') 'collapsed feed copy is expanded only inside one exact own post prefix before the full intent is rechecked'
  Assert-True ($nativeSource -match 'function Test-FacebookFeedPostVisibleShortScope' -and $nativeSource -match '\$seeMore\.Count -ne 0' -and $openNewestSource -match 'Test-FacebookFeedPostVisibleShortScope') 'a fully visible short post with no See more is accepted before the collapsed-copy expansion route'
  Assert-True ($nativeSource -match 'function Get-FacebookFeedCandidateDiagnostics' -and $nativeSource -match 'loadedTimestampCount' -and $nativeSource -match 'visibleTimestampCount' -and $nativeSource -match 'timestampTargets' -and $nativeSource -match 'isOffscreen' -and $nativeSource -match 'matchedLineCount' -and $nativeSource -match 'authorCount' -and $nativeSource -match 'friendsCount' -and $nativeSource -match 'photoCount' -and $nativeSource -match 'collapsedPrefixScope') 'read-only feed diagnostics report loaded-versus-visible timestamp bounds plus each ancestor scope predicate count'
  Assert-True ($invokeSource -match "'FeedCandidateDiagnostics'" -and $invokeSource -match 'Get-FacebookFeedCandidateDiagnostics \$entry.intent.text \$w') 'actual frozen receipt text can be diagnosed through a read-only wrapper action'
  Assert-True ($nativeSource -match 'function Bring-FacebookUiTargetIntoView' -and $nativeSource -match 'ScrollItemPattern' -and $nativeSource -match 'coordinate scrolling is forbidden' -and $nativeSource -match 'function Assert-FacebookExactVisibleFeedPostScope' -and $openNewestSource -match 'Bring-FacebookUiTargetIntoView \$matches\[0\]\.link \$w' -and $openNewestSource -match 'Assert-FacebookExactVisibleFeedPostScope \$visibleTimestamp \$ExpectedText') 'only the uniquely matched offscreen timestamp may use ScrollItemPattern, after which the full frozen one-photo scope is rechecked before stability and click guards'
  $savedUiAll=(Get-Command Get-FacebookUiAll -CommandType Function).ScriptBlock;$savedValue=(Get-Command Get-FacebookValue -CommandType Function).ScriptBlock
  try {
    function Get-FacebookUiAll($Root){@($Root.items)}
    function Get-FacebookValue($Element){$Element.value}
    function New-FacebookFeedTestItem($ControlType,[string]$Name,[string]$Value=''){[pscustomobject]@{Current=[pscustomobject]@{ControlType=$ControlType;Name=$Name};value=$Value}}
    $viPublishedIntent=Get-FacebookPair $config vi 'boss-b02-v2'
    $viLines=@($viPublishedIntent.text -split "`r?`n")
    $shortItems=@(
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) 'Hyun Uk Jung' 'https://www.facebook.com/hyunuk.jung.56/'),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Text) 'Shared with Your friends'),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Image) 'Friends')
    )
    foreach($line in $viLines){
      if($line -match '^https?://') { $shortItems += (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) $line $line) }
      else { $shortItems += (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Text) $line) }
    }
    $shortItems += (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) 'photo' 'https://www.facebook.com/photo/?fbid=4592468914306905')
    $shortPost=[pscustomobject]@{items=$shortItems}
    Assert-True (Test-FacebookFeedPostVisibleShortScope $shortPost $viPublishedIntent.text) 'visible published B02 Vietnamese copy with Friends, full ordered links, and one photo does not require See more'
    Assert-True (-not (Test-FacebookFeedPostPrefixScope $shortPost $viPublishedIntent.text)) 'visible published B02 Vietnamese copy is not misclassified as collapsed See more copy'
  } finally { Set-Item -Path Function:Get-FacebookUiAll -Value $savedUiAll;Set-Item -Path Function:Get-FacebookValue -Value $savedValue;Remove-Item -Path Function:New-FacebookFeedTestItem -ErrorAction SilentlyContinue }
  $fullScopeSource=[regex]::Match($nativeSource,'(?s)function Test-FacebookFeedPostScope.*?(?=\r?\nfunction |\z)').Value
  Assert-True ($fullScopeSource -notmatch 'Where-Object\{-not \$_.Current.IsOffscreen\}') 'loaded offscreen descendants remain evidence while click targets keep their visible guard'
  Assert-True ($nativeSource -match 'WM_GETTEXT did not confirm exact native file path' -and $nativeSource -match '\$before\.attachmentCount -ne 0' -and $nativeSource -match '\$after\.attachmentCount -eq 1' -and $nativeSource -notmatch '\$hasExpectedFilename=') 'attachment proof requires an exact native chooser path and a composer attachment transition from zero to one'
  Assert-True ($nativeSource -match 'function Get-FacebookOrcaTree' -and $nativeSource -match 'Get-FacebookNativeTree \$window' -and $nativeSource -match "source='native_uia'" -and $nativeSource -notmatch "Invoke-FacebookOrca @\('computer','get-app-state'") 'state reader uses the current exact-window native UIA tree instead of a stale external snapshot'
} finally {
  $resolved=[IO.Path]::GetFullPath($temp);$prefix=$tempRoot+[IO.Path]::DirectorySeparatorChar
  if($resolved.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -and ([IO.Path]::GetFileName($resolved) -match '^facebook-posting-test-[0-9a-f]{32}$') -and (Test-Path -LiteralPath $resolved)){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
'FACEBOOK_POSTING_TEST_OK'
exit 0
