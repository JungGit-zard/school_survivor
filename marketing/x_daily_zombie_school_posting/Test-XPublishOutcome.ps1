param([string]$NativeSourcePath = (Join-Path $PSScriptRoot 'WindowsXPosting.ps1'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

$sourcePath = $NativeSourcePath
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | ForEach-Object ToString | Out-String) }
$publishAst = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Publish-XPost' }, $true)
if ($null -eq $publishAst) { throw 'Publish-XPost function was not found.' }
. ([scriptblock]::Create($publishAst.Extent.Text))

$script:Snapshots = @()
$script:SnapshotIndex = 0
$script:AttachmentCount = 0
$script:ClosedDraftCount = 0
function Assert-XComposer { }
function Find-XControl { [pscustomobject]@{ target = 'post' } }
function Click-XElement { }
function Invoke-XButton { }
function Assert-XForeground { }
function Get-XElements {
  $index = [Math]::Min($script:SnapshotIndex, $script:Snapshots.Count - 1)
  $script:SnapshotIndex++
  return @($script:Snapshots[$index])
}
function Get-XAttachmentCount { return $script:AttachmentCount }
function Get-XValue($Element) { return [string]$Element.value }
function Close-XOwnedDraft([string]$Text) { $script:ClosedDraftCount++ }
function New-UiFixture([string]$Name,[string]$Type='Text',[string]$Value='') {
  $controlType = if ($Type -eq 'Edit') { [Windows.Automation.ControlType]::Edit } else { [Windows.Automation.ControlType]::Text }
  [pscustomobject]@{ Current = [pscustomobject]@{ IsOffscreen=$false; Name=$Name; ControlType=$controlType }; value=$Value }
}
function Assert-Outcome([string]$Name,[string]$Expected,[object[]]$Elements,[int]$Attachments=0) {
  $script:Snapshots = ,@($Elements)
  $script:SnapshotIndex = 0
  $script:AttachmentCount = $Attachments
  $actual = Publish-XPost -Text 'fixture copy'
  if ($null -eq $actual -or $actual.outcome -cne $Expected) { throw "FAILED $Name expected '$Expected', got '$($actual.outcome)'" }
  "PASS $Name => $Expected"
}

Assert-Outcome 'sent toast' 'sent' @((New-UiFixture 'Your post was sent.'))
$closedDraftsBefore = $script:ClosedDraftCount
$script:Snapshots = ,@((New-UiFixture "You've already said that."))
$script:SnapshotIndex = 0
$duplicate = Publish-XPost -Text 'fixture copy'
if ($null -eq $duplicate -or $duplicate.outcome -cne 'duplicate_skipped' -or $script:ClosedDraftCount -ne ($closedDraftsBefore + 1)) { throw 'FAILED duplicate notice => duplicate_skipped and closes only its exact draft' }
'PASS duplicate notice => duplicate_skipped'
Assert-Outcome 'composer closed' 'composer_closed' @()
Assert-Outcome 'composer cleared' 'composer_cleared' @((New-UiFixture 'Post text' 'Edit' ''))
# Website-card mode submits with Ctrl+Enter in the focused editor, exactly once, never the Post button.
$script:Submits = @()
function Submit-XEditorShortcut($Editor) { $script:Submits += $Editor }
function Invoke-XButton { throw 'FAILED website-card mode must not invoke the Post button' }
function Find-XControl([string]$Name,[string]$Type='') { [pscustomobject]@{ target = ($Name + '|' + $Type) } }
$script:Snapshots = ,@((New-UiFixture 'Your post was sent.'))
$script:SnapshotIndex = 0
$cardResult = Publish-XPost -Text 'fixture copy' -WebsiteCardOnly -CardUrl 'https://escapezombie.com/share/x/en/0123456789abcdef'
if ($cardResult.outcome -cne 'sent' -or $script:Submits.Count -ne 1 -or $script:Submits[0].target -cne 'Post text|Edit') { throw 'FAILED website-card publish submits once via the editor shortcut' }
'PASS website-card publish => one Ctrl+Enter submit from the editor'
$submitAst = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Submit-XEditorShortcut' }, $true)
. ([scriptblock]::Create($submitAst.Extent.Text))
function Start-Sleep { }
$script:Keys = @()
$script:EditorClicks = 0
function Click-XElement($Element) { $script:EditorClicks++ }
function Send-XKeys([string]$Keys) { $script:Keys += $Keys }
Submit-XEditorShortcut ([pscustomobject]@{ Current = [pscustomobject]@{ HasKeyboardFocus = $true } })
if ($script:EditorClicks -ne 1 -or ($script:Keys -join ',') -cne '^{ENTER}') { throw 'FAILED focused editor gets one click then one Ctrl+Enter' }
'PASS focused editor => click then one Ctrl+Enter'
$script:Keys = @()
$unfocused = $false
try { Submit-XEditorShortcut ([pscustomobject]@{ Current = [pscustomobject]@{ HasKeyboardFocus = $false } }) } catch { $unfocused = $true }
if (-not $unfocused -or $script:Keys.Count -ne 0) { throw 'FAILED unfocused editor must send no Ctrl+Enter' }
'PASS unfocused editor => no Ctrl+Enter'
'X_PUBLISH_OUTCOME_TEST_OK'
