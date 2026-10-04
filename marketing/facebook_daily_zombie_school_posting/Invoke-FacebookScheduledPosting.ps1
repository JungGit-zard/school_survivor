[CmdletBinding()]
param(
  [string]$RunId,
  [ValidateSet('ja','en','vi','ko')][string]$Language,
  [switch]$TestSinglePost,
  [switch]$DraftOnly,
  [switch]$ValidateOnly,
  [long]$WindowId=0,
  [Parameter(DontShow=$true)][scriptblock]$WrapperInvoker,
  [Parameter(DontShow=$true)][string]$ReceiptDirectory,
  [Parameter(DontShow=$true)][switch]$TestBypassSlotCheck,
  [Parameter(DontShow=$true)][switch]$ThrowOnFailure
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
$slots=@('02:00','06:00','11:00','17:00','21:00');$slotPattern='(?:0200|0600|1100|1700|2100)';$kst=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))
if([string]::IsNullOrWhiteSpace($RunId)){
  $eligible=@($slots|Where-Object{[TimeSpan]::Parse($_) -le $kst.TimeOfDay});if($eligible.Count -eq 0){throw 'No current KST slot; never backfill'}
  $slot=$eligible[-1];$runId=$kst.ToString('yyyy-MM-dd-')+$slot.Replace(':','')
  $age=$kst-([DateTimeOffset]::ParseExact($kst.ToString('yyyy-MM-dd')+' '+$slot+' +09:00','yyyy-MM-dd HH:mm zzz',[Globalization.CultureInfo]::InvariantCulture));if($age.TotalMinutes -gt 30){throw 'Outside 30-minute schedule grace; never backfill'}
}
if($RunId -notmatch ("^\d{4}-\d{2}-\d{2}-$slotPattern(?:-[a-z0-9_-]+)?$")){throw 'RunId must be a 02:00, 06:00, 11:00, 17:00, or 21:00 KST slot'}
if($RunId -ceq '2026-10-03-1700' -and -not $ValidateOnly){throw 'Duplicate guard: eight manual Facebook photo posts were confirmed on 2026-10-03; no 17:00 automated post may run without reconciled immutable receipt evidence'}
if($TestSinglePost -and [string]::IsNullOrWhiteSpace($Language)){throw 'TestSinglePost requires Language'}
if($DraftOnly -and $TestSinglePost){throw 'DraftOnly always verifies all four languages; do not combine it with TestSinglePost'}
if($DraftOnly -and -not [string]::IsNullOrWhiteSpace($Language)){throw 'DraftOnly does not accept Language; it verifies all four languages'}
if($DraftOnly -and $RunId -notmatch ("^\d{4}-\d{2}-\d{2}-$slotPattern-")){throw 'DraftOnly requires an explicit suffixed RunId'}
if(-not $TestSinglePost -and -not $DraftOnly -and $RunId -match ("^\d{4}-\d{2}-\d{2}-$slotPattern-")){throw 'Scheduled full cycles cannot use suffixed RunIds'}
if(-not $TestSinglePost -and -not $DraftOnly -and -not $TestBypassSlotCheck){$base=$RunId.Substring(0,15);$scheduled=[DateTimeOffset]::ParseExact($base+' +09:00','yyyy-MM-dd-HHmm zzz',[Globalization.CultureInfo]::InvariantCulture);$delta=$kst-$scheduled;if($delta.TotalMinutes -lt 0 -or $delta.TotalMinutes -gt 30){throw 'Explicit scheduled RunId is outside the current 30-minute KST slot grace'}}
$wrapper=Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1'
$receiptRoot=if([string]::IsNullOrWhiteSpace($ReceiptDirectory)){Join-Path $PSScriptRoot '..\..\Developer\agent_room\facebook_posting_receipts'}else{[IO.Path]::GetFullPath($ReceiptDirectory)}
$langs=if($TestSinglePost){@($Language)}else{@('ja','en','vi','ko')}
if($ValidateOnly){[pscustomobject]@{status='validated_only';mode=if($DraftOnly){'draft_only'}elseif($TestSinglePost){'single_post'}else{'scheduled_full_cycle'};runId=$RunId;languages=@($langs);uiTouched=$false}|ConvertTo-Json;exit 0}
$mutex=[Threading.Mutex]::new($false,'Local\EscapeZombieSchoolFacebookSchedule');$locked=$false
try { try { $locked=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked=$true };if(-not $locked){throw 'Another Facebook schedule cycle owns the desktop'}
 $call={param([string]$action,[string]$lang,[string[]]$extra=@())
   if($null -ne $WrapperInvoker){return @(& $WrapperInvoker $action $lang $RunId $WindowId $extra)}
   $priorEap=$ErrorActionPreference
   try {
     $ErrorActionPreference='Continue'
     $raw=@(& powershell -NoProfile -STA -ExecutionPolicy Bypass -File $wrapper -Action $action -RunId $RunId -Language $lang -WindowId $WindowId @extra 2>&1)
     $exitCode=$LASTEXITCODE
   } finally { $ErrorActionPreference=$priorEap }
   if($exitCode -ne 0){throw "FAILED $RunId/$lang/$action`: $([string]::Join(' ', @($raw | ForEach-Object { [string]$_ })))"};return $raw
 }
 foreach($lang in $langs){
   $receipt=Join-Path $receiptRoot "$RunId.json"
   $current=if(Test-Path -LiteralPath $receipt){Get-Content -Raw -LiteralPath $receipt -Encoding UTF8|ConvertFrom-Json}else{$null}
   $entry=if($null -ne $current){$current.entries.$lang}else{$null}
   if($null -ne $entry -and $entry.state -eq 'verified'){
     if($DraftOnly){throw "FAILED $RunId/${lang}: DraftOnly requires an unverified receipt entry"}
     Assert-FacebookCanonicalIntent (Get-FacebookConfig) $entry.intent;if(-not (Test-FacebookEvidence $entry.intent $entry.evidence)){throw "FAILED $RunId/${lang}: invalid verified evidence"};continue
   }
   if($null -ne $entry -and $entry.state -eq 'publish_intent'){throw "FAILED $RunId/${lang}: uncertain publish_intent; VerifyPost only, never second click"}
   if($null -eq $entry){&$call 'SelectSourcePair' $lang|Out-Null}
   $profile=(&$call 'OpenProfile' $lang|ConvertFrom-Json);$WindowId=[long]$profile.windowId
   $fresh=Get-Content -Raw -LiteralPath $receipt -Encoding UTF8|ConvertFrom-Json;$state=$fresh.entries.$lang.state
   if($state -eq 'selected'){&$call 'OpenComposer' $lang|Out-Null;&$call 'TypeText' $lang|Out-Null;&$call 'AttachImage' $lang|Out-Null;&$call 'VerifyDraft' $lang|Out-Null}
   elseif($state -eq 'prepared'){&$call 'VerifyDraft' $lang|Out-Null}
   if($DraftOnly){&$call 'CancelOwnDraft' $lang|Out-Null;continue}
   &$call 'PublishOnce' $lang @('-AuthorizePublish')|Out-Null
   $opened=(&$call 'OpenNewestPost' $lang|Where-Object{$_ -match '^\{'}|ConvertFrom-Json)
   &$call 'VerifyPost' $lang @('-Permalink',$opened.permalink)|Out-Null
   &$call 'ClosePost' $lang|Out-Null
 }
 $final=Get-Content -Raw -LiteralPath (Join-Path $receiptRoot "$RunId.json") -Encoding UTF8|ConvertFrom-Json
 $checkedLanguages=if($TestSinglePost){@($Language)}else{$script:FacebookLanguages}
 foreach($checkedLanguage in $checkedLanguages){
   $checkedEntry=$final.entries.$checkedLanguage
   if($DraftOnly){
     if($null -eq $checkedEntry -or $checkedEntry.state -ne 'prepared' -or $null -ne $checkedEntry.evidence){throw "$checkedLanguage is not a prepared no-evidence draft"}
     Assert-FacebookCanonicalIntent (Get-FacebookConfig) $checkedEntry.intent
     continue
   }
   if($null -eq $checkedEntry -or $checkedEntry.state -ne 'verified'){throw "$checkedLanguage is not verified"}
   Assert-FacebookCanonicalIntent (Get-FacebookConfig) $checkedEntry.intent
   if(-not (Test-FacebookEvidence $checkedEntry.intent $checkedEntry.evidence)){throw "$checkedLanguage has invalid verified evidence"}
 }
 if($DraftOnly){[pscustomobject]@{status='drafts_verified_no_publish';runId=$RunId;languages=@($script:FacebookLanguages);published=$false}|ConvertTo-Json -Compress}
 elseif($TestSinglePost){[pscustomobject]@{status='single_verified';language=$Language;runId=$RunId}|ConvertTo-Json -Compress}
 elseif(-not (Test-FacebookComplete $final)){throw 'Full cycle lacks four distinct verified URLs'}else{[pscustomobject]@{status='complete';runId=$RunId}|ConvertTo-Json -Compress}
} catch {$dir=Join-Path $receiptRoot 'runlogs';[IO.Directory]::CreateDirectory($dir)|Out-Null;$log=Join-Path $dir ($RunId+'.json');[IO.File]::WriteAllText($log,([pscustomobject]@{status='FAILED';runId=$RunId;error=$_.Exception.Message;utc=[DateTimeOffset]::UtcNow.ToString('o')}|ConvertTo-Json),[Text.UTF8Encoding]::new($false));[Console]::Error.WriteLine("FAILED ${RunId}: $($_.Exception.Message)");if($ThrowOnFailure){throw};exit 1
} finally {if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
