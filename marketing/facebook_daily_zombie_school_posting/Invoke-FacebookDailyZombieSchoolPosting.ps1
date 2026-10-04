[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('InspectPair','SelectSourcePair','DiscoverWindow','OpenProfile','RecoverStorageWarning','ProfileReadinessDiagnostics','FeedCandidateDiagnostics','ReadState','OpenComposer','ResumeOwnDraft','TypeText','AttachImage','VerifyDraft','PublishOnce','OpenNewestPost','VerifyPost','ClosePost','CancelOwnDraft','FullCycleResumeSafe')][string]$Action,
  [Parameter(Mandatory=$true)][string]$RunId,
  [ValidateSet('ja','en','vi','ko')][string]$Language,
  [string]$ReceiptDirectory,
  [string]$VariantId = '', [long]$WindowId = 0,
  [string]$ObservedText, [int]$ObservedAttachmentCount = -1, [string]$ObservedAudience,
  [string]$Permalink, [switch]$AuthorizePublish, [switch]$NativeChooserAlreadyOpen, [string]$OrcaAppId, [switch]$IncludeTree
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
. (Join-Path $PSScriptRoot 'FacebookNative.ps1')
if ([string]::IsNullOrWhiteSpace($ReceiptDirectory)) { $ReceiptDirectory = Join-Path $PSScriptRoot '..\..\Developer\agent_room\facebook_posting_receipts' }
Assert-FacebookRunId $RunId
if (($Action -notin @('FullCycleResumeSafe','ProfileReadinessDiagnostics')) -and [string]::IsNullOrWhiteSpace($Language)) { throw 'Language is required for this action' }
$config = Get-FacebookConfig
$path = Get-FacebookReceiptPath $ReceiptDirectory $RunId
$readOnlyActions=@('InspectPair','DiscoverWindow','ProfileReadinessDiagnostics','FeedCandidateDiagnostics','ReadState','FullCycleResumeSafe')
$mutex=$null;$locked=$false
if($Action -notin $readOnlyActions){
  $mutex=[Threading.Mutex]::new($false,'Local\EscapeZombieSchoolFacebookHyunUkJung')
  try{$locked=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$locked=$true}
  if(-not $locked){$mutex.Dispose();throw 'Another Facebook poster owns this profile lock'}
}
try {
$receipt = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json } else { New-FacebookReceipt $RunId }
if($receipt.schema -ne 1){throw "Unsupported/old Facebook receipt schema '$($receipt.schema)'; it is rejected without migration"}
if($receipt.platform -ne 'facebook'){throw 'Receipt platform is not facebook'}

if ($Action -eq 'FullCycleResumeSafe') {
  $pending = foreach ($lang in $script:FacebookLanguages) { $entry=$receipt.entries.$lang; if ($null -eq $entry -or $entry.state -ne 'verified') { [pscustomobject]@{language=$lang; state=if($null -eq $entry){'unselected'}else{$entry.state}} } }
  [pscustomobject]@{ status=if(Test-FacebookComplete $receipt){'complete'}elseif(@($pending | Where-Object state -eq 'publish_intent').Count){'uncertain_requires_manual_verification'}else{'step_required'}; runId=$RunId; pending=@($pending); uiTouched=$false; schedulerChanged=$false } | ConvertTo-Json -Depth 6
  exit 0
}
$pair = $null
if($Action -eq 'SelectSourcePair'){
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingReceipt.ps1')
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  # Facebook has its own authorized 11:00/17:00 cadence; do not alter X config.
  $config | Add-Member -Force -NotePropertyName schedule_times -NotePropertyValue @('11:00','17:00')
  $selectedVariant=if([string]::IsNullOrWhiteSpace($VariantId)){Select-PostingVariant $config $Language $RunId $ReceiptDirectory}else{@(Get-PostingVariants $config $Language | Where-Object{$_.id -ceq $VariantId})}
  if(@($selectedVariant).Count -ne 1){throw "Unknown or ambiguous explicit Facebook variant '$VariantId'"}
  $pair=Get-FacebookPair $config $Language $selectedVariant.id
}
switch ($Action) {
  'InspectPair' { if([string]::IsNullOrWhiteSpace($VariantId)){$VariantId='escape'};Get-FacebookPair $config $Language $VariantId | ConvertTo-Json -Depth 5; exit 0 }
  'SelectSourcePair' {
    if ($null -ne $receipt.entries.$Language) { throw 'Existing receipt entry is immutable; use its frozen intent or a new explicit repost RunId' }
    $receipt.entries.$Language = [pscustomobject]@{ state='selected'; intent=$pair; evidence=$null; selectedUtc=[DateTimeOffset]::UtcNow.ToString('o') }; Save-FacebookReceipt $receipt $path
    [pscustomobject]@{status='selected';runId=$RunId;language=$Language;receiptPath=$path;uiTouched=$false} | ConvertTo-Json; exit 0
  }
  'DiscoverWindow' { $w=Get-FacebookChromeWindow $WindowId; [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;title=$w.Current.Name}|ConvertTo-Json;exit 0 }
  'OpenProfile' { Open-FacebookProfileNative $WindowId|ConvertTo-Json;exit 0 }
  'RecoverStorageWarning' { $w=Get-FacebookChromeWindow $WindowId;Close-FacebookChromeStorageWarningIfPresent $w|ConvertTo-Json;exit 0 }
  'ProfileReadinessDiagnostics' { $w=Get-FacebookChromeWindow $WindowId;Get-FacebookProfileReadinessDiagnostics $w|ConvertTo-Json -Depth 5;exit 0 }
  'FeedCandidateDiagnostics' { $entry=$receipt.entries.$Language;if($null -eq $entry){throw 'Feed diagnostics require a frozen receipt intent'};$w=Get-FacebookChromeWindow $WindowId;Get-FacebookFeedCandidateDiagnostics $entry.intent.text $w|ConvertTo-Json -Depth 8;exit 0 }
  'ReadState' {
    if(-not $IncludeTree){try{Get-FacebookDraftNative $WindowId | ConvertTo-Json}catch{$w=Get-FacebookChromeWindow $WindowId;Get-FacebookOrcaTree $w.Current.ProcessId $WindowId|Select-Object -ExpandProperty tree};exit 0}
    $w=Get-FacebookChromeWindow $WindowId;$draft=$null;$draftError=$null;$orca=$null;$orcaError=$null
    try{$draft=Get-FacebookDraftNative $WindowId}catch{$draftError=$_.Exception.Message}
    try{$orca=Get-FacebookOrcaTree $w.Current.ProcessId $WindowId}catch{$orcaError=$_.Exception.Message}
    [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;draft=$draft;draftError=$draftError;nativeTree=Get-FacebookNativeTree $w;orcaTree=if($null -eq $orca){$null}else{$orca.tree};orcaSource=if($null -eq $orca){$null}else{$orca.source};orcaError=$orcaError}|ConvertTo-Json -Depth 6
    exit 0
  }
  'OpenComposer' { $result=Open-FacebookComposerNative $WindowId;$w=Get-FacebookChromeWindow $WindowId;Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree;$result | ConvertTo-Json;exit 0 }
  'ResumeOwnDraft' { $entry=$receipt.entries.$Language;if($null -eq $entry -or $entry.state -notin @('selected','prepared')){throw 'Resume requires a frozen selected or prepared draft intent'};Assert-FacebookCanonicalIntent $config $entry.intent;Resume-FacebookOwnDraftNative $entry.intent.text $WindowId|ConvertTo-Json;exit 0 }
  'TypeText' { $entry=$receipt.entries.$Language;if($null -eq $entry){throw 'Select source pair before typing'};Assert-FacebookCanonicalIntent $config $entry.intent;$w=Get-FacebookChromeWindow $WindowId;Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree;Set-FacebookComposerTextNative $entry.intent.text $WindowId;Get-FacebookDraftNative $WindowId|ConvertTo-Json;exit 0 }
  'AttachImage' { $entry=$receipt.entries.$Language;if($null -eq $entry){throw 'Select source pair before attachment'};Assert-FacebookCanonicalIntent $config $entry.intent;$w=Get-FacebookChromeWindow $WindowId;Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree $entry.intent.text;if($NativeChooserAlreadyOpen){Complete-FacebookNativeOpenDialog $entry.intent.imagePath $WindowId $OrcaAppId|ConvertTo-Json;exit 0};Attach-FacebookImageNative $entry.intent.imagePath $WindowId $OrcaAppId|ConvertTo-Json;exit 0 }
  'VerifyDraft' { $entry=$receipt.entries.$Language; if($null -eq $entry -or $entry.state -notin @('selected','prepared')){throw 'Select and freeze the source pair before draft verification'};Assert-FacebookCanonicalIntent $config $entry.intent;$w=Get-FacebookChromeWindow $WindowId;$state=Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree $entry.intent.text ([IO.Path]::GetFileName($entry.intent.imagePath));Assert-FacebookDraft $entry.intent $state.text $state.attachmentCount $state.audience;$entry.state='prepared';$entry | Add-Member -Force -NotePropertyName draftVerifiedUtc -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o'));Save-FacebookReceipt $receipt $path;[pscustomobject]@{status='draft_verified';uiTouched=$false}|ConvertTo-Json;exit 0 }
  'PublishOnce' {
    if(-not $AuthorizePublish){throw 'Publish is a live external mutation: rerun only with explicit -AuthorizePublish'}
    # Reload under the profile lock: no stale receipt may authorize a second click.
    $receipt=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
    $entry=$receipt.entries.$Language;if($null -eq $entry -or $entry.state -ne 'prepared'){throw 'Publish requires a persisted prepared draft'}
    Assert-FacebookCanonicalIntent $config $entry.intent
    $w=Get-FacebookChromeWindow $WindowId;$fresh=Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree $entry.intent.text ([IO.Path]::GetFileName($entry.intent.imagePath));Assert-FacebookDraft $entry.intent $fresh.text $fresh.attachmentCount $fresh.audience
    Add-FacebookPublishIntent $receipt $Language $entry.intent $path;Invoke-FacebookPublishNative $WindowId
    [pscustomobject]@{status='uncertain_requires_VerifyPost';receiptPath=$path}|ConvertTo-Json
    exit 0
  }
  'OpenNewestPost' { $entry=$receipt.entries.$Language;if($null -eq $entry){throw 'No frozen post intent'};Assert-FacebookCanonicalIntent $config $entry.intent;$url=Open-FacebookNewestPostNative $entry.intent.text ([IO.Path]::GetFileName($entry.intent.imagePath)) $WindowId;[pscustomobject]@{status='opened_current_visible_post';permalink=$url}|ConvertTo-Json -Compress;exit 0 }
  'VerifyPost' { $entry=$receipt.entries.$Language;if($null -eq $entry -or $entry.state -ne 'publish_intent'){throw 'Verification requires a persisted publish intent'};if([string]::IsNullOrWhiteSpace($Permalink)){throw 'Permalink is required; ambiguous results must not be marked verified'};$w=Get-FacebookChromeWindow $WindowId;$tree=(Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree;$evidence=Get-FacebookPostEvidenceFromTree $tree $Permalink $entry.intent.text;Complete-FacebookVerification $receipt $Language $evidence $path;[pscustomobject]@{status='verified';permalink=$Permalink}|ConvertTo-Json;exit 0 }
  'ClosePost' { Close-FacebookPostNative $WindowId;[pscustomobject]@{status='closed'}|ConvertTo-Json;exit 0 }
  'CancelOwnDraft' { $entry=$receipt.entries.$Language;if($null -eq $entry){throw 'No frozen draft intent'};Assert-FacebookCanonicalIntent $config $entry.intent;$w=Get-FacebookChromeWindow $WindowId;Assert-FacebookComposerTree (Get-FacebookOrcaTree $w.Current.ProcessId $WindowId).tree $entry.intent.text ([IO.Path]::GetFileName($entry.intent.imagePath));Cancel-FacebookOwnDraftNative $entry.intent.text ([IO.Path]::GetFileName($entry.intent.imagePath)) $WindowId;[pscustomobject]@{status='cancelled_exact_own_draft'}|ConvertTo-Json;exit 0 }
}
} finally { if($locked){$mutex.ReleaseMutex()};if($null -ne $mutex){$mutex.Dispose()} }
