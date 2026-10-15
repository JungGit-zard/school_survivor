Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'WindowsXPosting.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors.Message -join '; ') }
foreach ($name in @('Assert-XNavigationSafe','Close-XDuplicateDraft')) {
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
Assert-Blocked { Close-XDuplicateDraft 'unsaved user draft' } 'unknown ownership prevents discard'
$script:XOwnedDraft = [pscustomobject]@{ text='campaign'; attachments=0; cards=0 }
Assert-Blocked { Close-XDuplicateDraft 'campaign' } 'changed draft prevents discard'
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
Write-Output 'NAVIGATION_SAFETY_TEST_OK'
