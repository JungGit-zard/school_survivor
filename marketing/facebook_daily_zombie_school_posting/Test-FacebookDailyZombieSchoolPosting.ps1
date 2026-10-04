Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};"PASS $Name"}
$invoke=Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1'
$config=Get-FacebookConfig
foreach($lang in $script:FacebookLanguages){$pair=Get-FacebookPair $config $lang;Assert-True ($pair.attachmentCount -eq 1) "$lang exact pair has one image";Assert-True (Test-FacebookUnderImageRoot $pair.imagePath) "$lang image is allowlisted"}
. (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
foreach($lang in $script:FacebookLanguages){foreach($bossId in @('boss-b01','boss-b02','boss-b03','boss-b04','boss-all')){ $pair=Get-FacebookPair $config $lang $bossId;Assert-True ($pair.attachmentCount -eq 1 -and $pair.variantId -ceq $bossId) "$lang/$bossId resolves one shared X/Facebook pair";Assert-True (Test-FacebookUnderImageRoot $pair.imagePath) "$lang/$bossId remains allowlisted";Assert-True ($pair.text.Contains($config.copy.$lang.hashtag)) "$lang/$bossId keeps the regional copy" }}
$koBossB03=Get-FacebookPair $config ko 'boss-b03'
Assert-True ($koBossB03.text -ceq $config.copy.ko.text -and $koBossB03.imagePath.EndsWith('boss_series\boss_b03_promotional.png')) 'Facebook resolves the legacy verified Korean boss-b03 pair exactly'
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
  Assert-True ($nativeSource -match 'function Set-FacebookStableWindowBounds' -and $nativeSource -match 'IsZoomed' -and $nativeSource -match 'ShowWindow\(\$target,9\)' -and $nativeSource -match 'for\(\$attempt=0;\$attempt -lt 2;\$attempt\+\+\)' -and $nativeSource -match 'SetWindowPos' -and $nativeSource -match 'GetWindowRect' -and $nativeSource -match 'after one restore retry' -and $nativeSource -match '\$script:FacebookWindowWidth=1280' -and $nativeSource -match '\$script:FacebookWindowHeight=900') 'every native Facebook action restores a maximized exact HWND once, then fixes and verifies the stable 1280x900 posting window bounds'
  Assert-True ($nativeSource -match 'function Resolve-FacebookCoordinateCacheEntry' -and $nativeSource -match 'Get-FacebookUiParentWindowName' -and $nativeSource -match 'SetCursorPos' -and $nativeSource -match 'mouse_event') 'coordinate clicks use the process-independent native cache adapter'
  Assert-True ($nativeSource -match 'composerCoordinate=\$click' -and $nativeSource -match 'photoCoordinate.*\$photoCoordinate' -and $nativeSource -match 'windowBounds=\(Set-FacebookStableWindowBounds \$w\)') 'the fixed-window composer and photo steps return their freshly verified PID/HWND viewport coordinates'
  Assert-True ($clickSource -match '\$layout=Set-FacebookStableWindowBounds \$Window' -and $clickSource.IndexOf('Set-FacebookStableWindowBounds') -lt $clickSource.IndexOf('BoundingRectangle')) 'each coordinate is taken only after the fixed 0,0 1280x900 viewport is rechecked'
  Assert-True ($nativeSource -match 'function Select-FacebookProfileTab' -and $nativeSource -match 'SelectionItemPattern' -and $nativeSource -match '\$selection\.Select\(\)' -and $nativeSource -notmatch 'Invoke-FacebookUiClick \$tabs\[0\] \$Window -AllowMissingAccountMarker' -and $nativeSource -match 'function Navigate-FacebookProfileInSelectedTab' -and $nativeSource -match 'Assert-FacebookProfileAddress \$w' -and $nativeSource -match 'Assert-FacebookAccountMarker \$w') 'exact Facebook tab uses semantic UIA selection and same-tab profile navigation before account verification'
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
    $shortPost=[pscustomobject]@{items=@(
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) 'Hyun Uk Jung' 'https://www.facebook.com/hyunuk.jung.56/'),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Text) 'Shared with Your friends'),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Image) 'Friends'),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Text) $viLines[0]),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) $viLines[1] $viLines[1]),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) $viLines[2] $viLines[2]),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Text) $viLines[3]),
      (New-FacebookFeedTestItem ([Windows.Automation.ControlType]::Hyperlink) 'photo' 'https://www.facebook.com/photo/?fbid=4592468914306905')
    )}
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
