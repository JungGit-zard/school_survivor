Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
function Assert-True($Value,[string]$Name) { if(-not $Value){throw "FAILED: $Name"};"PASS $Name" }
function Assert-Throws([scriptblock]$Action,[string]$Name) { $threw=$false;try{$null=& $Action}catch{$threw=$true};Assert-True $threw $Name }
$composer=@'
0 dialog Create post
  1 text Hyun Uk Jung
  2 edit What's on your mind?, Value: exact draft
  3 text Edit privacy. Sharing with Your friends.
  4 graphic, Value: fixture.png. Open context menu to inspect image description.
  5 button Remove post attachment
'@
# Execute the production attachment wait with native calls stubbed; no UI is touched.
& {
  $tokens=$null;$errors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'FacebookNative.ps1'),[ref]$tokens,[ref]$errors)
  $fn=$ast.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Complete-FacebookNativeOpenDialog'},$true)
  . ([scriptblock]::Create($fn.Extent.Text))
  $script:draftReads=0;$script:treeReads=0;$script:badBody=$false;$script:opens=0
  function Get-FacebookDraftNative { $script:draftReads++;[pscustomobject]@{text='exact draft';attachmentCount=[int]($script:draftReads -gt 1)} }
  function Set-FacebookNativeOpenDialogPathForWindow { [pscustomobject]@{path='fixture.png'} }
  function Get-FacebookChromeWindow { [pscustomobject]@{Current=[pscustomobject]@{ProcessId=1}} }
  function Get-FacebookOrcaTree { [pscustomobject]@{source='native_uia'} }
  function Invoke-FacebookNativeOpenButton { $script:opens++ }
  function Get-FacebookNativeTree {
    $script:treeReads++
    if($script:badBody){return ($composer -replace 'exact draft','changed draft')}
    if($script:treeReads -eq 1){return ($composer -replace 'fixture.png','uploading.png')}
    return $composer
  }
  function Start-Sleep { if($script:badBody){throw 'fixture bounded stop after rejected body'} }
  $proof=Complete-FacebookNativeOpenDialog 'fixture.png' 1 ''
  Assert-True ($proof.path -eq 'fixture.png' -and $script:treeReads -eq 2 -and $script:opens -eq 1) 'attachment wait rejects delayed filename then returns exact ready proof without reattachment'
  $script:draftReads=0;$script:badBody=$true
  Assert-Throws { Complete-FacebookNativeOpenDialog 'fixture.png' 1 '' } 'attachment wait never returns proof for changed draft body'
}
# Run the actual final cutoff/intent/native statements in their production order.
& {
  $tokens=$null;$errors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1'),[ref]$tokens,[ref]$errors)
  $switch=$ast.Find({param($n) $n -is [Management.Automation.Language.SwitchStatementAst] -and $n.Condition.Extent.Text -eq '$Action'},$true)
  $clause=@($switch.Clauses | Where-Object {$_.Item1.Value -eq 'PublishOnce'})[0]
  $statements=@($clause.Item2.Statements | Where-Object {$_.Extent.Text -match '^Add-FacebookPublishIntent |^\$click=Invoke-FacebookPublishNative |KST cutoff reached before Facebook native Publish click\.'})
  Assert-True ($statements.Count -eq 3) 'cutoff fixture executes exactly the production boundary statements'
  $boundary=[scriptblock]::Create(($statements.Extent.Text -join "`n"))
  $script:events=[Collections.Generic.List[string]]::new()
  function Add-FacebookPublishIntent { $script:events.Add('intent') }
  function Invoke-FacebookPublishNative { $script:events.Add('native');[pscustomobject]@{clickedUtc='fixture'} }
  $receipt=@{};$Language='en';$entry=[pscustomobject]@{intent=@{}};$path='fixture';$WindowId=1
  $StopAtKst=[DateTimeOffset]::UtcNow.AddMinutes(-1).ToString('o')
  Assert-Throws { & $boundary } 'expired final cutoff rejects publish'
  Assert-True ($script:events.Count -eq 0) 'expired cutoff writes no intent and invokes no native click'
  $StopAtKst=[DateTimeOffset]::UtcNow.AddMinutes(1).ToString('o')
  & $boundary
  Assert-True (($script:events -join ',') -ceq 'intent,native') 'allowed publish persists intent before exactly one native invocation'
}
# Execute the actual selected-text-only native helper against synthetic UIA objects.
& {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $tokens=$null;$errors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'FacebookNative.ps1'),[ref]$tokens,[ref]$errors)
  $fn=$ast.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Cancel-FacebookOwnDraftNative'},$true)
  . ([scriptblock]::Create($fn.Extent.Text))
  $script:cleanupStage='composer';$script:cleanupCalls=@();$script:cleanupBody='exact draft';$script:cleanupAttachments=0;$script:foreignModal=$false;$script:keepConfirm=$false
  function Get-FacebookChromeWindow { [pscustomobject]@{Current=[pscustomobject]@{ProcessId=1;Name='Chrome'}} }
  function Assert-FacebookProfileAddress {}
  function Assert-FacebookAccountMarker {}
  function Focus-FacebookChromeWindow {}
  function Assert-FacebookForeground {}
  function Get-FacebookComposerEditor { $e=[pscustomobject]@{};$e|Add-Member ScriptMethod GetRuntimeId {return [int[]]@(4,7)};return $e }
  function Get-FacebookDraftEvidenceNative { [pscustomobject]@{text=$script:cleanupBody;attachmentCount=$script:cleanupAttachments;authorCount=1;audience='Friends'} }
  function Get-FacebookDraftNative { Get-FacebookDraftEvidenceNative }
  function Get-FacebookComposerDialog { [pscustomobject]@{Current=[pscustomobject]@{Name='Create post'}} }
  function Get-FacebookUiAll {
    $name=if($script:foreignModal){'Open'}elseif($script:cleanupStage -eq 'composer'){'Create post'}elseif($script:cleanupStage -eq 'confirm'){'Save this post as a draft?'}else{$null}
    if($name){[pscustomobject]@{Current=[pscustomobject]@{Name=$name;IsOffscreen=$false;ControlType=[Windows.Automation.ControlType]::Window}}}
  }
  function Get-FacebookExistingComposerReadiness { [pscustomobject]@{state='wait'} }
  function Get-FacebookScopedButton($Root,$Names) {
    $action=if($Names -contains 'Close composer dialog'){'Close'}else{'Discard'}
    if($action -eq 'Discard' -and ($Root.Current.Name -cne 'Save this post as a draft?' -or $Names -notcontains 'Delete draft')){throw 'Discard escaped exact confirmation scope'}
    $button=[pscustomobject]@{Action=$action}
    $button|Add-Member ScriptMethod TryGetCurrentPattern {
      param($pattern,$reference)
      $invoke=[pscustomobject]@{Action=$this.Action}
      $invoke|Add-Member ScriptMethod Invoke {$script:cleanupCalls+=$this.Action;$script:cleanupStage=if($this.Action -eq 'Close' -or $script:keepConfirm){'confirm'}else{'closed'}}
      $reference.Value=$invoke;return $true
    }
    return $button
  }
  function Start-Sleep {if($script:keepConfirm){throw 'fixture stop: confirmation deliberately remains visible'}}
  $result=Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1 -SelectedTextOnly
  Assert-True ($result.composerClosed -and ($script:cleanupCalls -join ',') -ceq 'Close,Discard') 'exact selected text-only draft closes then discards once through scoped confirmation'
  $script:cleanupCalls=@();$script:cleanupStage='composer';$script:cleanupBody='changed draft'
  Assert-Throws {Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1 -SelectedTextOnly} 'changed text-only draft is preserved'
  $script:cleanupBody='exact draft';$script:cleanupAttachments=1
  Assert-Throws {Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1 -SelectedTextOnly} 'text-only mode preserves any attached draft'
  $script:cleanupAttachments=0;$script:foreignModal=$true
  Assert-Throws {Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1 -SelectedTextOnly} 'foreign modal or file chooser prevents text-only cleanup'
  Assert-True ($script:cleanupCalls.Count -eq 0) 'rejected text body attachment and modal cases invoke no Close or Discard'
  $script:foreignModal=$false;$script:keepConfirm=$true
  Assert-Throws {Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1 -SelectedTextOnly} 'remaining Save draft confirmation never counts as composer closure'
  $script:keepConfirm=$false;$script:cleanupStage='composer'
  Assert-Throws {Cancel-FacebookOwnDraftNative 'exact draft' 'fixture.png' 1} 'normal attachment cleanup still rejects a zero-attachment draft'
}
& {
  $tokens=$null;$errors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1'),[ref]$tokens,[ref]$errors)
  $switch=$ast.Find({param($n) $n -is [Management.Automation.Language.SwitchStatementAst] -and $n.Condition.Extent.Text -eq '$Action'},$true)
  $clause=@($switch.Clauses|Where-Object {$_.Item1.Value -eq 'CancelOwnDraft'})[0]
  $cancelAction=[scriptblock]::Create($clause.Item2.Extent.Text.Trim().TrimStart('{').TrimEnd('}'))
  $Language='ja';$SelectedTextOnly=$true
  foreach($state in @('prepared','publish_intent')){
    $receipt=[pscustomobject]@{entries=[pscustomobject]@{ja=[pscustomobject]@{state=$state;intent=@{}}}}
    Assert-Throws {& $cancelAction} "actual CancelOwnDraft action rejects $state before native cleanup"
  }
}
'FACEBOOK_PREPUBLISH_SAFETY_TEST_OK'
