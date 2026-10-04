Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};"PASS $Name"}
$wrapper=Join-Path $PSScriptRoot 'Invoke-ZombieSchoolSocialPosting.ps1'
Assert-True (Test-Path -LiteralPath $wrapper -PathType Leaf) 'top-level social wrapper exists'
$source=Get-Content -LiteralPath $wrapper -Raw -Encoding UTF8
Assert-True ($source -match 'Invoke-XDailyZombieSchoolPosting\.ps1' -and $source -match '-Run' -and $source -match '-SinglePost') 'X delegate is exact daily runner Run SinglePost'
Assert-True ($source -match 'Invoke-FacebookDailyZombieSchoolPosting\.ps1' -and $source -match 'AuthorizePublish' -and $source -match 'FullCycleResumeSafe') 'Facebook delegate exposes approved resume-safe authorized sequence'
Assert-True ($source -notmatch 'Add-Type.*System\.Windows\.Automation' -and $source -notmatch 'FindAll\(' -and $source -notmatch 'InvokePattern') 'wrapper does not duplicate browser UIA code'
Assert-True ($source -notmatch 'FacebookNative\.ps1' -and $source -notmatch 'Get-FacebookVisibleTabSnapshot' -and $source -notmatch 'Get-FacebookChromeWindow') 'wrapper consumes only approved Facebook wrapper diagnostics and never dot-sources native UI code'
$tokens=$null;$errors=$null
[Management.Automation.Language.Parser]::ParseFile($wrapper,[ref]$tokens,[ref]$errors)|Out-Null
Assert-True ($errors.Count -eq 0) 'wrapper parses as PowerShell'
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$temp=Join-Path $tempRoot ('social-wrapper-test-'+[guid]::NewGuid().ToString('N'))
$created=$false
try{
  New-Item -ItemType Directory -Path $temp|Out-Null;$created=$true
  $xLog=Join-Path $temp 'x-args.jsonl';$fbLog=Join-Path $temp 'fb-args.jsonl'
  $xStub=Join-Path $temp 'Invoke-XDailyZombieSchoolPosting.ps1'
  $fbStub=Join-Path $temp 'Invoke-FacebookDailyZombieSchoolPosting.ps1'
  Set-Content -LiteralPath $xStub -Encoding UTF8 -Value @'
param([string]$Language,[string]$CycleId,[string]$ReceiptDirectory,[long]$WindowId=0,[switch]$DryRun,[switch]$ValidateOnly,[switch]$FullCycle,[switch]$Run,[switch]$PrepareOnly,[switch]$SinglePost)
$entry=[pscustomobject]@{language=$Language;cycleId=$CycleId;run=$Run.IsPresent;singlePost=$SinglePost.IsPresent;dryRun=$DryRun.IsPresent;validateOnly=$ValidateOnly.IsPresent;receiptDirectory=$ReceiptDirectory}
$entry|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:X_STUB_LOG -Encoding UTF8
if($DryRun -or $ValidateOnly){[pscustomobject]@{status='validated_only';uiTouched=$false;published=0;cycleId=$CycleId;selections=@([pscustomobject]@{language=$Language;variantId='escape';imagePath='stub.png'})}|ConvertTo-Json -Compress;exit 0}
$receiptPath=Join-Path $ReceiptDirectory ($CycleId+'.json')
New-Item -ItemType Directory -Path $ReceiptDirectory -Force|Out-Null
$receipt=[pscustomobject]@{entries=[pscustomobject]@{}}
$receipt.entries|Add-Member -NotePropertyName $Language -NotePropertyValue ([pscustomobject]@{state='verified';intent=[pscustomobject]@{createdUtc='2020-01-01T00:00:00Z';baselineUrls=@();text='stub post';imageSha256='abc123';attachmentCount=1};evidence=[pscustomobject]@{account='@jungsilx';hasPhoto=$true;url='https://x.com/jungsilx/status/1900000000000000000';text='stub post';imageSha256='abc123'}})
$receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receiptPath -Encoding UTF8
[pscustomobject]@{status='partial_verified';published=1;language=$Language;cycleId=$CycleId;receiptPath=$receiptPath}|ConvertTo-Json -Compress
'@
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value @'
param([string]$Action,[string]$RunId,[string]$Language,[string]$ReceiptDirectory,[string]$VariantId='', [long]$WindowId=0,[switch]$AuthorizePublish,[string]$Permalink)
$entry=[pscustomobject]@{action=$Action;runId=$RunId;language=$Language;variantId=$VariantId;authorizePublish=$AuthorizePublish.IsPresent;permalink=$Permalink}
$entry|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:FB_STUB_LOG -Encoding UTF8
switch($Action){
  'ProfileReadinessDiagnostics'{[pscustomobject]@{exactFacebookTabCount=[int]$env:FB_STUB_EXACT_TAB_COUNT;uiTouched=$false}|ConvertTo-Json -Compress;exit 0}
  'InspectPair'{
    $result=[pscustomobject]@{variantId=$VariantId;text='stub';imagePath='stub.png';attachmentCount=1}
    if($env:FB_STUB_PRETTY_JSON -eq '1'){
      Write-Output 'INFO approved Facebook wrapper prelude before JSON'
      $result|ConvertTo-Json -Depth 8
    } else {
      $result|ConvertTo-Json -Compress
    }
    exit 0
  }
  'FullCycleResumeSafe'{[pscustomobject]@{status='step_required';pending=@([pscustomobject]@{language=$Language;state='unselected'});uiTouched=$false}|ConvertTo-Json -Compress;exit 0}
  'SelectSourcePair'{[pscustomobject]@{status='selected';runId=$RunId;language=$Language;variantId=$VariantId;receiptPath=(Join-Path $ReceiptDirectory ($RunId+'.json'));uiTouched=$false}|ConvertTo-Json -Compress;exit 0}
  'DiscoverWindow'{[pscustomobject]@{windowId=123;processId=456;title='Facebook - Chrome'}|ConvertTo-Json -Compress;exit 0}
  'OpenProfile'{[pscustomobject]@{status='profile_ready';windowId=123;reusedTab=$true}|ConvertTo-Json -Compress;exit 0}
  'OpenProfileNewTab'{[pscustomobject]@{status='profile_ready';windowId=123;openedNewTab=$true}|ConvertTo-Json -Compress;exit 0}
  'OpenComposer'{[pscustomobject]@{status='composer_open'}|ConvertTo-Json -Compress;exit 0}
  'TypeText'{[pscustomobject]@{text='stub'}|ConvertTo-Json -Compress;exit 0}
  'AttachImage'{[pscustomobject]@{attachmentCount=1}|ConvertTo-Json -Compress;exit 0}
  'VerifyDraft'{[pscustomobject]@{status='draft_verified';uiTouched=$false}|ConvertTo-Json -Compress;exit 0}
  'PublishOnce'{if(-not $AuthorizePublish){throw 'missing auth'};[pscustomobject]@{status='uncertain_requires_VerifyPost';receiptPath='stub'}|ConvertTo-Json -Compress;exit 0}
  'OpenNewestPost'{[pscustomobject]@{status='opened_current_visible_post';permalink='https://www.facebook.com/hyunuk.jung.56/posts/pfbidWrapperTest'}|ConvertTo-Json -Compress;exit 0}
  'VerifyPost'{[pscustomobject]@{status='verified';permalink=$Permalink}|ConvertTo-Json -Compress;exit 0}
  'ClosePost'{[pscustomobject]@{status='closed'}|ConvertTo-Json -Compress;exit 0}
  default{throw "unexpected action $Action"}
}
'@
  $env:X_STUB_LOG=$xLog;$env:FB_STUB_LOG=$fbLog;$env:FB_STUB_EXACT_TAB_COUNT='1'
  $offline=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Both -Language ko -RunId '2026-10-05-1100-wrappertest' -Offline -ReceiptRoot $temp -XScriptPath $xStub -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'offline wrapper exits zero'
  $offlineJson=($offline -join "`n")|ConvertFrom-Json
  Assert-True ($offlineJson.uiTouched -eq $false -and $offlineJson.platforms.x.status -eq 'offline_validated' -and $offlineJson.platforms.facebook.status -eq 'offline_validated') 'offline validates both without platform UI'
  Assert-True (($offlineJson.PSObject.Properties.Name -contains 'previewSelection') -and -not ($offlineJson.PSObject.Properties.Name -contains 'selected')) 'top-level pair is labeled previewSelection, not a claimed shared platform selection'
  Assert-True (-not (Test-Path -LiteralPath $xLog) -and -not (Test-Path -LiteralPath $fbLog)) 'offline mode does not invoke platform scripts'
  $dry=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Both -Language ko -RunId '2026-10-05-1101-wrappertest' -DryRun -ReceiptRoot $temp -XScriptPath $xStub -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'dry-run wrapper exits zero'
  $dryJson=($dry -join "`n")|ConvertFrom-Json
  Assert-True ($dryJson.platforms.x.status -eq 'validated_only' -and $dryJson.platforms.facebook.status -eq 'dry_run_validated') 'dry-run returns per-platform dry results'
  $env:FB_STUB_PRETTY_JSON='1'
  $prettyDry=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language ko -RunId '2026-10-05-1107-wrappertest-pretty' -DryRun -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
  Remove-Item Env:FB_STUB_PRETTY_JSON -ErrorAction SilentlyContinue
  Assert-True ($LASTEXITCODE -eq 0) 'Facebook dry-run parses pretty multiline JSON with informational prelude'
  $prettyDryJson=($prettyDry -join "`n")|ConvertFrom-Json
  Assert-True ($prettyDryJson.platforms.facebook.status -eq 'dry_run_validated' -and $prettyDryJson.platforms.facebook.pair.variantId) 'Facebook pretty JSON dry-run returns parsed pair object'
  $oldErrorActionPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  $fbLogCountBeforeBadRunId=@(Get-Content -LiteralPath $fbLog -Encoding UTF8).Count
  try {
    $badRunId=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language ko -RunId 'not-facebook-valid' -DryRun -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
    $badRunIdExit=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$oldErrorActionPreference
  }
  $fbLogCountAfterBadRunId=@(Get-Content -LiteralPath $fbLog -Encoding UTF8).Count
  Assert-True ($badRunIdExit -ne 0 -and (($badRunId -join "`n") -match 'yyyy-MM-dd-HHmm') -and $fbLogCountAfterBadRunId -eq $fbLogCountBeforeBadRunId) 'Facebook dry-run rejects invalid RunId before invoking approved Facebook wrapper'
  $oldErrorActionPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue'

  try {
    $variantReject=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Both -Language ko -RunId '2026-10-05-1101-wrappertest-reject' -VariantId 'boss-b01' -DryRun -ReceiptRoot $temp -XScriptPath $xStub -FacebookScriptPath $fbStub 2>&1
    $variantRejectExit=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$oldErrorActionPreference
  }
  Assert-True ($variantRejectExit -ne 0 -and (($variantReject -join "`n") -match 'VariantId is unsupported for X/Both')) 'explicit VariantId with X/Both is rejected instead of drifting platform pairs'
  $live=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Both -Language en -RunId '2026-10-05-1102-wrappertest' -AuthorizeFacebookPublish -ReceiptRoot $temp -XScriptPath $xStub -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'stub live wrapper exits zero'
  $liveJson=($live -join "`n")|ConvertFrom-Json
  Assert-True ($liveJson.platforms.x.status -eq 'partial_verified' -and $liveJson.platforms.facebook.status -eq 'verified') 'live wrapper requires verified per-platform results'
  Assert-True (($liveJson.platforms.x.PSObject.Properties.Name -contains 'actualSelection') -and ($liveJson.platforms.facebook.PSObject.Properties.Name -contains 'actualSelection')) 'live wrapper reports per-platform actual selections instead of claiming one shared top-level pair'
  $xArgs=Get-Content -LiteralPath $xLog -Encoding UTF8|ForEach-Object{$_|ConvertFrom-Json}|Select-Object -Last 1
  Assert-True ($xArgs.run -eq $true -and $xArgs.singlePost -eq $true -and $xArgs.language -eq 'en') 'X live delegates Run SinglePost for one language'
  $fbActions=@(Get-Content -LiteralPath $fbLog -Encoding UTF8|ForEach-Object{($_|ConvertFrom-Json).action})
  $expected=@('FullCycleResumeSafe','SelectSourcePair','DiscoverWindow','OpenProfile','OpenComposer','TypeText','AttachImage','VerifyDraft','PublishOnce','OpenNewestPost','VerifyPost','ClosePost')
  Assert-True (($fbActions[-12..-1] -join ',') -ceq ($expected -join ',')) 'Facebook live reuses exact profile tab when available and uses approved action order'
  $publish=@(Get-Content -LiteralPath $fbLog -Encoding UTF8|ForEach-Object{$_|ConvertFrom-Json}|Where-Object action -eq 'PublishOnce')[-1]
  Assert-True ($publish.authorizePublish -eq $true) 'Facebook live publish has explicit authorization flag'
  $fbVariant=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language en -RunId '2026-10-05-1102-wrappertest-fbvariant' -VariantId 'boss-b01' -AuthorizeFacebookPublish -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'Facebook-only explicit variant live stub exits zero'
  $selectedFb=@(Get-Content -LiteralPath $fbLog -Encoding UTF8|ForEach-Object{$_|ConvertFrom-Json}|Where-Object action -eq 'SelectSourcePair')[-1]
  Assert-True ($selectedFb.variantId -eq 'boss-b01') 'Facebook-only live freezes the exact non-default top-level selected variant'
  $fbReceiptDir=Join-Path $temp 'facebook_posting_receipts'
  New-Item -ItemType Directory -Path $fbReceiptDir -Force|Out-Null
  $alreadyRunId='2026-10-05-1106-wrappertest-already'
  $fbText='Already posted Escape Zombie School https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool'
  $fbTextHash=([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($fbText))|ForEach-Object{$_.ToString('x2')}) -join ''
  $fbPermalink='https://www.facebook.com/hyunuk.jung.56/posts/pfbidAlreadyVerifiedWrapperTest'
  $receiptEntries=[pscustomobject]@{}
  $receiptEntries|Add-Member -NotePropertyName en -NotePropertyValue ([pscustomobject]@{state='verified';intent=[pscustomobject]@{language='en';variantId='boss-b01';text=$fbText;textSha256=$fbTextHash;imagePath='stub.png';attachmentCount=1};evidence=[pscustomobject]@{permalink=$fbPermalink;audience='Friends';attachmentCount=1;text=$fbText}})
  [pscustomobject]@{schema=1;platform='facebook';runId=$alreadyRunId;entries=$receiptEntries}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $fbReceiptDir ($alreadyRunId+'.json')) -Encoding UTF8
  $fbLogCountBefore=@(Get-Content -LiteralPath $fbLog -Encoding UTF8).Count
  $already=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language en -RunId $alreadyRunId -VariantId 'boss-b01' -AuthorizeFacebookPublish -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'already verified Facebook rerun exits zero'
  $alreadyJson=($already -join "`n")|ConvertFrom-Json
  Assert-True ($alreadyJson.platforms.facebook.status -eq 'already_verified' -and $alreadyJson.platforms.facebook.permalink -eq $fbPermalink -and $alreadyJson.platforms.facebook.uiTouched -eq $false) 'already verified Facebook rerun is a no-op with verified permalink'
  $fbLogCountAfter=@(Get-Content -LiteralPath $fbLog -Encoding UTF8).Count
  Assert-True ($fbLogCountAfter -eq $fbLogCountBefore) 'already verified Facebook rerun does not invoke Facebook runner'
  $oldOpenProfile="  'OpenProfile'{[pscustomobject]@{status='profile_ready';windowId=123;reusedTab=`$true}|ConvertTo-Json -Compress;exit 0}"
  $newOpenProfile="  'OpenProfile'{throw 'No exact Facebook profile tab exists in this Chrome window'}"
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value ((Get-Content -LiteralPath $fbStub -Raw -Encoding UTF8).Replace($oldOpenProfile,$newOpenProfile))
  $env:FB_STUB_EXACT_TAB_COUNT='0'
  $fallback=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language en -RunId '2026-10-05-1104-wrappertest' -VariantId 'boss-b01' -AuthorizeFacebookPublish -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'Facebook fallback new-tab path exits zero when no exact profile tab exists'
  $fallbackActions=@(Get-Content -LiteralPath $fbLog -Encoding UTF8|ForEach-Object{($_|ConvertFrom-Json).action})
  $expectedFallback=@('FullCycleResumeSafe','SelectSourcePair','DiscoverWindow','OpenProfile','ProfileReadinessDiagnostics','OpenProfileNewTab','OpenComposer','TypeText','AttachImage','VerifyDraft','PublishOnce','OpenNewestPost','VerifyPost','ClosePost')
  Assert-True (($fallbackActions[-14..-1] -join ',') -ceq ($expectedFallback -join ',')) 'Facebook fallback uses new-tab only after OpenProfile and a read-only tab-count proves no exact tab'

  $env:FB_STUB_EXACT_TAB_COUNT='2'
  $oldErrorActionPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  try {
    $ambiguous=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language en -RunId '2026-10-05-1105-wrappertest' -VariantId 'boss-b01' -AuthorizeFacebookPublish -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
    $ambiguousExit=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$oldErrorActionPreference
  }
  $ambiguousTail=@(Get-Content -LiteralPath $fbLog -Encoding UTF8|ForEach-Object{($_|ConvertFrom-Json).action})[-4..-1]
  Assert-True ($ambiguousExit -ne 0 -and ($ambiguousTail -join ',') -notmatch 'OpenProfileNewTab') 'ambiguous/duplicate Facebook profile tab state is not solved by adding another tab'
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value ((Get-Content -LiteralPath $fbStub -Raw -Encoding UTF8) -replace "status='step_required'","status='uncertain_requires_manual_verification'")
  $oldErrorActionPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  try {
    $uncertain=& powershell -NoProfile -ExecutionPolicy Bypass -File $wrapper -Platform Facebook -Language vi -RunId '2026-10-05-1103-wrappertest' -AuthorizeFacebookPublish -ReceiptRoot $temp -FacebookScriptPath $fbStub 2>&1
    $uncertainExit=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$oldErrorActionPreference
  }
  Assert-True ($uncertainExit -ne 0 -and (($uncertain -join "`n") -match 'publish_intent uncertain')) 'uncertain Facebook receipt is not blindly re-clicked'
} finally {
  Remove-Item Env:X_STUB_LOG -ErrorAction SilentlyContinue
  Remove-Item Env:FB_STUB_LOG -ErrorAction SilentlyContinue
  Remove-Item Env:FB_STUB_EXACT_TAB_COUNT -ErrorAction SilentlyContinue
  Remove-Item Env:FB_STUB_PRETTY_JSON -ErrorAction SilentlyContinue
  if($created){
    Start-Sleep -Milliseconds 100
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
    if(Test-Path -LiteralPath $temp){Write-Output "NOTE temp cleanup left $temp"}
  }
}
'ZOMBIE_SOCIAL_WRAPPER_TEST_OK'
