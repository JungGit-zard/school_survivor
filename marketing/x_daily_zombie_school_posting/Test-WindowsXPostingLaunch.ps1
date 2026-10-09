Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'WindowsXPosting.ps1'
$tokens = $null
$parseErrors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$parseErrors)
if (@($parseErrors).Count -ne 0) {
  $messages = @($parseErrors | ForEach-Object { $_.Message }) -join '; '
  throw "FAILED: WindowsXPosting.ps1 parse errors: $messages"
}

$source = Get-Content -LiteralPath $scriptPath -Raw -Encoding UTF8
function Assert-True($Value, [string]$Name) {
  if (-not $Value) { throw "FAILED: $Name" }
  Write-Output "PASS $Name"
}
Assert-True ($source.Contains("Start-Process -FilePath `$chrome -ArgumentList @('--new-window', 'https://x.com')")) 'launches a visible new Chrome window directly to X'
foreach ($forbidden in @('--headless','--user-data-dir','--remote-debugging-port','--remote-allow-origins')) {
  Assert-True (-not $source.Contains($forbidden)) "does not use $forbidden"
}
Assert-True ($source.Contains('AddSeconds(25)') -and $source.Contains('Timed out waiting up to 25 seconds')) 'Chrome launch wait is bounded'
Assert-True ($source.Contains('SetWindowPos([IntPtr]$WindowId, [IntPtr]::Zero, 0, 0, 1280, 900, 0x14)')) 'sets exact 0,0 1280x900 outer bounds'
Assert-True ($source.Contains('$script:XWindow = [long]$windows[0].Current.NativeWindowHandle')) 'stores the selected HWND before revalidation'
Assert-True ($source.Contains('Get-XWindowElement') -and $source.Contains('Target X window process is not Chrome')) 'reacquires and checks HWND, title, class, and Chrome process'
Assert-True ($source.Contains('Security challenge') -and $source.Contains('verify you are human')) 'stops on security challenges'
Assert-True ($source.Contains('Unexpected account in active Account menu')) 'stops on a wrong signed-in account'

# Exercise Initialize-XWindow through its private adapter functions. This test
# does not launch Chrome, access the desktop, or call any posting action.
. $scriptPath
$script:launchTestWindow = [pscustomobject]@{ Current=[pscustomobject]@{ NativeWindowHandle=321; ProcessId=654; ClassName='Chrome_WidgetWin_1'; Name='Home / X - Google Chrome' } }
$script:launchTestPoll = 0
$script:launchTestLaunches = 0
$script:launchTestVerifications = 0
$script:launchTestBounds = $null
$script:launchTestFocused = $false
function Get-XTopLevelWindows {
  $script:launchTestPoll++
  if ($script:launchTestPoll -eq 1) { return @() }
  return @($script:launchTestWindow)
}
function Start-XChromeAtX { $script:launchTestLaunches++ }
function Get-XWindowElement { $script:launchTestVerifications++; return $script:launchTestWindow }
function Assert-XNoAuthDialog($Root = $null) { }
function Get-XRoot { return $null }
function Set-XChromeWindowBounds([long]$WindowId) {
  $script:launchTestBounds = [pscustomobject]@{ x=0; y=0; width=1280; height=900 }
  return $script:launchTestBounds
}
function Restore-XWindowFocus([string]$Reason = 'test') { $script:launchTestFocused = $true }

Initialize-XWindow -RequestedWindowId 0
Assert-True ($script:launchTestLaunches -eq 1 -and $script:launchTestPoll -ge 2) 'zero X windows triggers launch then reacquisition'
Assert-True ($script:launchTestVerifications -eq 2 -and $script:XWindow -eq 321) 'selected HWND is verified before and after positioning'
Assert-True ($script:launchTestBounds.x -eq 0 -and $script:launchTestBounds.y -eq 0 -and $script:launchTestBounds.width -eq 1280 -and $script:launchTestBounds.height -eq 900) 'reacquired window receives exact requested bounds'
Assert-True ($script:launchTestFocused) 'focus is restored only after window verification'

Write-Output 'X_POSTING_LAUNCH_TEST_OK'
