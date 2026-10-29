param([string]$NativeSourcePath = (Join-Path $PSScriptRoot 'WindowsXPosting.ps1'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($NativeSourcePath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors.Message -join '; ') }
foreach ($name in @('Assert-XNavigationSafe','Close-XOwnedDraft')) {
  $node = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name }, $true)
  . ([scriptblock]::Create($node.Extent.Text))
}
$script:elements = @()
$script:attachments = 0
$script:cards = 0
$script:clicks = 0
function Get-XElements { return $script:elements }
function Get-XValue($Element) { return $Element.Value }
function Normalize-PostText([string]$Text) { return $Text.Replace("`r`n", "`n") }
function Get-XAttachmentCount { return $script:attachments }
function Get-XCardPreviewRemoveCount { return $script:cards }
function Click-XElement($Element) { $script:clicks++ }
function Find-XControl { return $script:elements[0] }
function Assert-Blocked([scriptblock]$Action, [string]$Name) {
  $blocked = $false
  try { & $Action } catch { $blocked = $true }
  if (-not $blocked) { throw "FAILED: $Name" }
  Write-Output "PASS $Name"
}
Assert-XNavigationSafe
Write-Output 'PASS empty page permits navigation'
$script:elements = @([pscustomobject]@{ Current=[pscustomobject]@{ Name='Post text'; IsOffscreen=$false; ControlType=[Windows.Automation.ControlType]::Edit }; Value='unsaved user draft' })
Assert-Blocked { Assert-XNavigationSafe } 'user text blocks navigation'
$script:XOwnedDraft = $null
Assert-Blocked { Close-XOwnedDraft 'unsaved user draft' } 'unknown ownership prevents discard'
$script:XOwnedDraft = [pscustomobject]@{ text='campaign'; attachments=0; cards=0 }
Assert-Blocked { Close-XOwnedDraft 'campaign' } 'changed draft prevents discard'
if ($script:clicks -ne 0) { throw 'FAILED: preserving user draft must send no clicks' }
$script:elements = @()
$script:attachments = 1
Assert-Blocked { Assert-XNavigationSafe } 'attachment-only draft blocks navigation'
$script:attachments = 0
$script:cards = 1
Assert-Blocked { Assert-XNavigationSafe } 'card-only draft blocks navigation'
$script:cards = 0
$script:elements = @([pscustomobject]@{ Current=[pscustomobject]@{ Name='Leave site?'; IsOffscreen=$false; ControlType=[Windows.Automation.ControlType]::Window } })
Assert-Blocked { Assert-XNavigationSafe } 'existing leave-site dialog blocks navigation'
$navigate = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Navigate-X' }, $true).Body.EndBlock.Statements[0].Extent.Text
if ($navigate -cne 'Assert-XNavigationSafe') { throw 'FAILED: guard must run before focus/clipboard/address input' }
Write-Output 'PASS navigation guard runs before all input'
$prepare = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Prepare-XPost' }, $true)
$opening = ($prepare.Body.EndBlock.Statements | Select-Object -First 3 | ForEach-Object { $_.Extent.Text }) -join "`n"
$script:events = @()
function Navigate-XProfile { $script:events += 'verified profile' }
function Assert-XNavigationSafe { $script:events += 'draft guard' }
function Find-XControl([string]$Name, [string]$Type) {
  if ($Name -cne 'Post' -or $Type -cne 'Hyperlink') { throw 'FAILED: compose opener must be Post hyperlink' }
  return 'compose hyperlink'
}
function Click-XElement($Element) {
  if ($Element -cne 'compose hyperlink') { throw 'FAILED: unexpected compose opener' }
  $script:events += 'clicked Post hyperlink'
}
& ([scriptblock]::Create($opening))
if (($script:events -join ',') -cne 'verified profile,draft guard,clicked Post hyperlink') { throw 'FAILED: profile/guard/link sequence' }
if ($prepare.Extent.Text.Contains("Navigate-X 'https://x.com/compose/post'")) { throw 'FAILED: direct compose URL navigation returned' }
Write-Output 'PASS compose opens through verified profile Post hyperlink after draft guard'
foreach ($name in @('Assert-XAddressFocused','Set-XAddressUrl')) {
  $node = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name }, $true)
  . ([scriptblock]::Create($node.Extent.Text))
}
$script:events = @()
$script:address = [pscustomobject]@{ Current=[pscustomobject]@{ HasKeyboardFocus=$false }; Value='' }
$script:address | Add-Member ScriptMethod SetFocus { $script:events += 'focus address' }
$script:address | Add-Member ScriptMethod GetRuntimeId { return @(1,2,3) }
function Assert-XForeground {}
function Get-XFocusedElement { return $script:address }
function Set-XClipboardText([string]$Text) { $script:events += 'clipboard'; $script:clipboard=$Text }
function Send-XKeys([string]$Keys) {
  $script:events += $Keys
  if ($Keys -eq '^v') { $script:address.Value=$script:clipboard }
}
Assert-Blocked { Set-XAddressUrl $script:address 'https://x.com/jungsilx' } 'unproven address focus sends no clipboard or keys'
if (($script:events -join ',') -cne 'focus address') { throw 'FAILED: input sent before proven address focus' }
$script:address.Current.HasKeyboardFocus=$true
$script:events=@()
Set-XAddressUrl $script:address 'https://x.com/jungsilx'
if (($script:events -join ',') -cne 'focus address,clipboard,^a,^v,{ENTER}') { throw 'FAILED: proven address input order' }
Write-Output 'PASS proven address focus selects/pastes/checks URL before Enter'
function Get-XFocusedElement {
  $other = [pscustomobject]@{}
  $other | Add-Member ScriptMethod GetRuntimeId { return @(9,9,9) }
  return $other
}
$script:events=@()
Assert-Blocked { Set-XAddressUrl $script:address 'https://x.com/jungsilx' } 'different focused element sends no clipboard or keys'
if (($script:events -join ',') -cne 'focus address') { throw 'FAILED: input sent to wrong focused element' }
$navigationSource = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Navigate-X' }, $true).Extent.Text
if ($navigationSource.Contains("Send-XKeys '^l'")) { throw 'FAILED: unverified Ctrl+L navigation returned' }
Write-Output 'PASS navigation does not rely on Ctrl+L'
Write-Output 'NAVIGATION_SAFETY_TEST_OK'

# Execute real prepare/cleanup functions with desktop-free native adapters.
foreach($name in @('Assert-XNavigationSafe','Close-XOwnedDraft','Prepare-XPost','Assert-XComposer')) {
  $node=$ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true)
  . ([scriptblock]::Create($node.Extent.Text))
}
$script:XWindow=321
$url='https://escapezombie.com/share/x/en/0123456789abcdef'
$copy="campaign copy`n"+$url+"`nhttps://play.google.com/store/apps/details?id=com.jungyoon.zombieschool"
function Get-XWindowElement { return $script:window }
function Get-XFileHashFixture { [pscustomobject]@{Hash=('0123456789abcdef'*4)} }
function Get-FileHash { Get-XFileHashFixture }
function Get-CopyDigest([string]$Text) { return 'fixture-digest' }
function Navigate-XProfile {}
function Get-XWebsiteCardProof([string]$CardUrl) { return $script:cardProof }
function Set-XClipboardText([string]$Text) { $script:clipboardHistory += $Text; $script:clipboard=$Text }
function Find-XControl([string]$Name,[string]$Type='',$Root=$null) {
  if($Name -eq 'Post text'){return $script:editor}
  if($Name -eq 'Post' -and $Type -eq 'Button'){return [pscustomobject]@{Name='Post button';Current=[pscustomobject]@{IsEnabled=$script:postEnabled}}}
  if($Name -eq 'Save post?' -and $Type -ne 'Window'){throw 'Expected one Save post? control; found Window and Text'}
  if($Name -eq 'Discard' -and ($null -eq $Root -or $Root.Name -ne 'Save post?')){throw 'Discard must be scoped to exact confirmation window'}
  return [pscustomobject]@{Name=$Name}
}
function Click-XElement($Element) {
  if($Element.Name -eq 'Close'){$script:closeClicks++}
  if($Element.Name -eq 'Discard'){$script:discardClicks++;$script:editor.Value='';$script:cards=0}
  if($Element.Name -eq 'Post button'){$script:postButtonClicks++}
}
function Send-XKeys([string]$Keys) {$script:keys += $Keys; if($Keys -eq '^v'){$script:editor.Value=$script:clipboard}}
function Wait-XCondition([scriptblock]$Condition,[string]$Description,[int]$Seconds=20) {
  if(-not (& $Condition)){throw ('Fixture condition failed: '+$Description)}
}
# The fixed unfurl wait is where X (or a user) can change the composer.
function Start-Sleep([int]$Seconds=0,[int]$Milliseconds=0) {
  $script:sleeps += $Seconds
  switch($script:scenario){
    'text'{$script:editor.Value='user changed draft'}
    'card'{$script:cards=1}
    'twocards'{$script:cards=2}
    'attachment'{$script:attachments=1}
    'window'{$script:window.Current.ProcessId=999}
    'account'{$script:window.Current.Name='Other (@someone) / X - Chrome'}
    'editor'{$script:editorRuntimeId=99}
  }
}
function Reset-PrepareFixture([string]$Scenario) {
  $script:scenario=$Scenario;$script:attachments=0;$script:cards=0;$script:closeClicks=0;$script:discardClicks=0;$script:postButtonClicks=0;$script:editorRuntimeId=1
  $script:clipboardHistory=@();$script:keys=@();$script:sleeps=@();$script:postEnabled=$false;$script:cardProof=$null
  $script:window=[pscustomobject]@{Current=[pscustomobject]@{NativeWindowHandle=321;ProcessId=654;Name='Profile (@jungsilx) / X - Chrome'}}
  $script:editor=[pscustomobject]@{Name='Post text';Value='';Current=[pscustomobject]@{Name='Post text';IsOffscreen=$false;ControlType=[Windows.Automation.ControlType]::Edit}}
  $script:editor|Add-Member ScriptMethod GetRuntimeId {return @(1,$script:editorRuntimeId)}
  $script:elements=@($script:editor);$script:XOwnedDraft=$null
}
$expectedErrors=@{text='Editor text does not match exact campaign copy';attachment='Website-card mode forbids a native image attachment'}
foreach($scenario in @('plain','card','text','twocards','attachment','window','account','editor')){
  Reset-PrepareFixture $scenario
  $caught='';try{Prepare-XPost -Text $copy -ImagePath 'fixture.png' -WebsiteCardOnly -CardUrl $url -CardLanguage en}catch{$caught=$_.Exception.Message}
  $expected=if($expectedErrors.ContainsKey($scenario)){$expectedErrors[$scenario]}else{'Post button is disabled (length limit or upload pending)'}
  if($caught -cne $expected){throw ('FAILED original composer error preserved: '+$caught)}
  if($scenario -in @('plain','card')){
    # 'card': X unfurled our exact pasted URL into one (placeholder) preview; still our draft.
    if($script:closeClicks -ne 1 -or $script:discardClicks -ne 1){throw ('FAILED own '+$scenario+' draft must close/discard once')}
    Assert-XNavigationSafe
    Write-Output ('PASS own '+$scenario+' draft cleaned and next navigation allowed')
  }else{
    if($script:closeClicks -ne 0 -or $script:discardClicks -ne 0){throw ('FAILED changed '+$scenario+' draft was touched')}
    Write-Output ('PASS changed '+$scenario+' draft preserved with original error')
  }
}
foreach($scenario in @('nocard','observedcard')){
  Reset-PrepareFixture $scenario
  $script:postEnabled=$true
  if($scenario -eq 'observedcard'){$script:cardProof=[pscustomobject]@{cardUrl=$url;proofMode='observed_x_card_group'}}
  $prepared=Prepare-XPost -Text $copy -ImagePath 'fixture.png' -WebsiteCardOnly -CardUrl $url -CardLanguage en
  if(($script:clipboardHistory -join '|') -cne $copy){throw 'FAILED full campaign copy must be the only paste (no standalone card URL)'}
  if(($script:keys -join ',') -cne '^a,^v'){throw ('FAILED composer keys: '+($script:keys -join ','))}
  if(($script:sleeps -join ',') -cne '20'){throw ('FAILED fixed 20 second unfurl wait: '+($script:sleeps -join ','))}
  if($script:postButtonClicks -ne 0 -or $script:closeClicks -ne 0){throw 'FAILED prepare must not click Post or close the draft'}
  if($prepared.postFormat -cne 'website_card' -or $prepared.cardUrl -cne $url){throw 'FAILED prepared website-card result'}
  if($scenario -eq 'nocard' -and ($null -ne $prepared.cardEvidence -or $prepared.cardPreviewObserved)){throw 'FAILED missing card preview must be recorded as not observed'}
  if($scenario -eq 'observedcard' -and ($null -eq $prepared.cardEvidence -or -not $prepared.cardPreviewObserved)){throw 'FAILED observed card preview must be recorded as evidence'}
  if($null -eq $script:XOwnedDraft -or (Normalize-PostText $script:XOwnedDraft.text) -cne $copy){throw 'FAILED prepared draft ownership must record the exact campaign copy'}
  Write-Output ('PASS '+$scenario+' prepare pastes full copy once, waits 20s, does not block on the card preview')
}
$script:scenario='plain';$script:cards=1;$script:attachments=0;$script:editor.Value=$url;$script:closeClicks=0
$script:XOwnedDraft=[pscustomobject]@{text=$url;attachments=0;cards=0}
Assert-Blocked {Close-XOwnedDraft $url} 'post-click duplicate cleanup still requires the exact recorded card count'
if($script:closeClicks -ne 0){throw 'FAILED post-click duplicate with changed card count was closed'}
$script:cards=0
$script:XOwnedDraft=[pscustomobject]@{text=$url;attachments=0;cards=0;phase='publish_started'}
Assert-Blocked {Close-XOwnedDraft $url -BeforePublish} 'post-click/unknown-phase draft cannot use pre-click cleanup'
if($script:closeClicks -ne 0){throw 'FAILED post-click draft was closed'}
Write-Output 'PRECLICK_CLEANUP_TEST_OK'
