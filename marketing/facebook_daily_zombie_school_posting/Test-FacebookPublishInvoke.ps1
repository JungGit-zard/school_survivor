Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'FacebookNative.ps1')

$script:caseName = ''
$script:counts = $null
$script:window = [pscustomobject]@{ fakeWindow = $true }
$script:dialog = [pscustomobject]@{ fakeDialog = $true }
$script:button = $null
$script:invokePattern = $null

function Get-FacebookChromeWindow([long]$WindowId = 0) { $script:counts.window++; return $script:window }
function Assert-FacebookProfileAddress($Window) { $script:counts.profile++; if ($script:caseName -eq 'wrong-profile') { throw 'wrong profile fixture' } }
function Assert-FacebookAccountMarker($Window) { $script:counts.account++; if ($script:caseName -eq 'no-author') { throw 'missing author fixture' } }
function Get-FacebookComposerDialog($Window) { $script:counts.dialog++; if ($script:caseName -eq 'ambiguous-dialog') { throw 'ambiguous composer fixture' }; return $script:dialog }
function Get-FacebookScopedButton($Root, [string[]]$Names) { $script:counts.button++; if ($script:caseName -eq 'ambiguous-post') { throw 'ambiguous Post fixture' }; return $script:button }
function Focus-FacebookChromeWindow($Window) { $script:counts.focus++ }
function Assert-FacebookForeground($Window) { $script:counts.foreground++ }
function Invoke-FacebookUiClick($Element, $Window) { $script:counts.coordinate++ }

function Reset-FakePublishCase([string]$Name, [bool]$Enabled = $true, [bool]$Offscreen = $false) {
  $script:caseName = $Name
  $script:counts = [pscustomobject]@{ window=0;profile=0;account=0;dialog=0;button=0;focus=0;foreground=0;semantic=0;coordinate=0;patternChecks=0 }
  $script:invokePattern = [pscustomobject]@{ InvokeCount=0 }
  $script:invokePattern | Add-Member -MemberType ScriptMethod -Name Invoke -Value { $this.InvokeCount++; $script:counts.semantic++ }
  $script:button = [pscustomobject]@{
    Current=[pscustomobject]@{
      Name='Post'
      IsEnabled=$Enabled
      IsOffscreen=$Offscreen
      BoundingRectangle=[pscustomobject]@{ IsEmpty=$false; Width=80.0; Height=24.0 }
    }
  }
  $script:button | Add-Member -MemberType ScriptMethod -Name TryGetCurrentPattern -Value {
    param($Pattern, [ref]$PatternObject)
    $script:counts.patternChecks++
    if ($script:caseName -eq 'unsupported-invoke') { return $false }
    $PatternObject.Value = $script:invokePattern
    return $true
  }
}

function Assert-BlockedWithoutInvoke([string]$Name, [bool]$Enabled = $true, [bool]$Offscreen = $false) {
  Reset-FakePublishCase $Name $Enabled $Offscreen
  $blocked = $false
  try { $null = Invoke-FacebookPublishNative 123 }
  catch { $blocked = $true }
  if (-not $blocked -or $script:counts.semantic -ne 0 -or $script:counts.coordinate -ne 0 -or $script:invokePattern.InvokeCount -ne 0) {
    throw "${Name}: invalid Post state was not blocked before any invoke/click"
  }
  "PASS $Name blocks before publish input"
}

Reset-FakePublishCase 'semantic-invoke'
$result = Invoke-FacebookPublishNative 123
if ($result.method -cne 'uia_invoke' -or $script:counts.semantic -ne 1 -or $script:counts.focus -ne 0 -or $script:counts.foreground -ne 0 -or $script:counts.coordinate -ne 0) {
  throw 'Supported Post InvokePattern did not publish semantically without focusing or sending coordinates'
}
'PASS supported Post InvokePattern avoids focus and coordinate input'

Assert-BlockedWithoutInvoke 'disabled-post' $false
Assert-BlockedWithoutInvoke 'offscreen-post' $true $true
Assert-BlockedWithoutInvoke 'no-author'
Assert-BlockedWithoutInvoke 'wrong-profile'
Assert-BlockedWithoutInvoke 'ambiguous-dialog'
Assert-BlockedWithoutInvoke 'ambiguous-post'

Reset-FakePublishCase 'unsupported-invoke'
$fallback = Invoke-FacebookPublishNative 123
if ($script:counts.semantic -ne 0 -or $script:counts.focus -ne 1 -or $script:counts.foreground -ne 1 -or $script:counts.coordinate -ne 1) {
  throw 'Unsupported InvokePattern did not use the foreground-checked focus fallback exactly once'
}
'PASS unsupported InvokePattern uses one foreground-checked focus fallback'

'FACEBOOK_PUBLISH_INVOKE_TEST_OK'
