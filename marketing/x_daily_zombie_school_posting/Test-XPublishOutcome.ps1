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
'X_PUBLISH_OUTCOME_TEST_OK'
