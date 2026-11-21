param([string]$NativeSourcePath = (Join-Path $PSScriptRoot 'WindowsXPosting.ps1'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($NativeSourcePath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors.Message -join '; ') }
$bodies = @{}
foreach ($name in @('Select-XWindowCandidate','Get-XTickDelta','Test-XHumanInputRecent','Assert-XForeground','Send-XKeys','Click-XElement','Restore-XWindowFocus','Initialize-XWindow')) {
  $node = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name }, $true)
  if ($null -eq $node) { throw "FAILED: $name is missing" }
  $bodies[$name] = $node.Extent.Text
  if ($name -in @('Select-XWindowCandidate','Get-XTickDelta','Test-XHumanInputRecent')) { . ([scriptblock]::Create($node.Extent.Text)) }
}
function New-Window([long]$Hwnd, [int]$ProcessId, [string]$Name) { [pscustomobject]@{ Current=[pscustomobject]@{ NativeWindowHandle=$Hwnd; ProcessId=$ProcessId; Name=$Name } } }
$title = 'Escape Zombie School (@jungsilx) / X - Chrome'

$picked = Select-XWindowCandidate @((New-Window 11 7 $title), (New-Window 22 7 $title))
Assert-True ($null -ne $picked -and $picked.Current.NativeWindowHandle -eq 11) 'two identical X windows of one Chrome process: the Z-order top one is used'
Assert-True ($null -eq (Select-XWindowCandidate @((New-Window 11 7 $title), (New-Window 22 8 $title)))) 'X windows from two Chrome processes (profiles) stay ambiguous'
Assert-True ($null -eq (Select-XWindowCandidate @((New-Window 11 7 $title), (New-Window 22 7 'Home / X - Chrome')))) 'X windows on different pages stay ambiguous'
Assert-True ($null -eq (Select-XWindowCandidate @((New-Window 11 7 $title)))) 'a single window is not routed through the tie-break'
Assert-True ($bodies['Initialize-XWindow'].Contains('Select-XWindowCandidate $windows') -and $bodies['Initialize-XWindow'].Contains('Select -WindowId.')) 'window init uses the tie-break and still refuses when it returns nothing'

Assert-True (-not (Test-XHumanInputRecent 100000 30000 $null)) 'input 70s ago is idle'
Assert-True (Test-XHumanInputRecent 100000 90000 $null) 'input 10s ago with no runner marker is a person'
Assert-True (-not (Test-XHumanInputRecent 100000 90000 90500)) 'input right before the runner marker is the runner itself'
Assert-True (Test-XHumanInputRecent 100000 95000 90000) 'input 5s after the runner marker is a person'
Assert-True (-not (Test-XHumanInputRecent 10 4294900000 $null)) 'tick wrap-around 67s ago is idle'

Assert-True ($bodies['Assert-XForeground'].Contains('Assert-XUserIdle')) 'every focus/input gate checks the user is idle'
Assert-True ($bodies['Restore-XWindowFocus'].Contains('Assert-XUserIdle')) 'focus restore checks the user is idle before taking focus'
Assert-True ($bodies['Send-XKeys'].Contains('Register-XInjectedInput') -and $bodies['Click-XElement'].Contains('Register-XInjectedInput')) 'runner keys and clicks are marked as its own input'
Write-Output 'X_WINDOW_PICK_AND_IDLE_TEST_OK'
