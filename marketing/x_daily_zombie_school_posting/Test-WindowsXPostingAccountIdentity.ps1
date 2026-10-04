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
function Assert-Contains([string]$Needle, [string]$Name) {
  if (-not $source.Contains($Needle)) { throw "FAILED: missing $Name" }
  Write-Output "PASS $Name"
}
function Assert-NotContains([string]$Needle, [string]$Name) {
  if ($source.Contains($Needle)) { throw "FAILED: forbidden $Name" }
  Write-Output "PASS $Name"
}
function Assert-Order([string]$Before, [string]$After, [string]$Name) {
  $beforeIndex = $source.IndexOf($Before)
  $afterIndex = $source.IndexOf($After)
  if ($beforeIndex -lt 0 -or $afterIndex -lt 0 -or $beforeIndex -ge $afterIndex) { throw "FAILED: order $Name" }
  Write-Output "PASS $Name"
}

Assert-Contains "SwitchToThisWindow(IntPtr hWnd, bool fAltTab)" "native SwitchToThisWindow P/Invoke is declared"
Assert-Contains "function Restore-XWindowFocus" "navigation boundary focus restore helper exists"
Assert-Contains "Get-XWindowElement" "focus restore verifies exact target X Chrome window"
Assert-Contains "function Test-XAuthDialogVisible" "auth dialog visible probe exists"
Assert-Contains "function Assert-XNoAuthDialog" "auth dialog guard helper exists"
Assert-Contains "Assert-XNoAuthDialog `$root" "account check stops on auth dialog before opening menu"
Assert-Contains "Test-XAuthDialogVisible" "account wait watches auth dialog while menu is open"
Assert-Contains "`$script:XAccountAuthDialogVisible" "auth dialog during account wait preserves stop reason"
Assert-Contains "Click-XElement `$menu" "account check opens account menu"
Assert-Contains "ControlType]::MenuItem" "account identity is checked on menu item control type"
Assert-Contains "'Log out @jungsilx'" "account identity requires exact Log out @jungsilx menu item"
Assert-Contains "Send-XKeys '{ESC}'" "account menu is closed with Escape"
Assert-Order "Assert-XNoAuthDialog `$root" "Click-XElement `$menu" "auth guard runs before account menu click"
Assert-Order "Click-XElement `$menu" "Send-XKeys '{ESC}'" "account menu is closed after opening"
Assert-NotContains "`$names -contains '@jungsilx'" "old descendant/display-name-only account inference"
Assert-NotContains "Click-XElement `$logout" "logout menu item must never be clicked"

Write-Output 'ACCOUNT_IDENTITY_TEST_OK'
