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
Assert-True ($source.Contains('function Restore-XAccountSession') -and $source.Contains('Set-XLoginField') -and $source.Contains('Test-XSecurityChallengeVisible')) 'credential recovery is restricted to visible X username/password fields and stops on security challenges'
. $scriptPath
$restoreBody=[regex]::Match($source,'function Restore-XAccountSession[\s\S]*?\r?\n}\r?\nfunction Assert-XAccount').Value
$challengeGuard=$restoreBody.IndexOf('if (Test-XSecurityChallengeVisible) { throw')
$vaultRead=$restoreBody.IndexOf("XCredentialVault.ps1")
Assert-True ($challengeGuard -ge 0 -and $vaultRead -gt $challengeGuard) 'security challenge is checked before reading credentials or entering login fields'
$publishRunnerPath=Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1';$publishRunnerSource=Get-Content -LiteralPath $publishRunnerPath -Raw -Encoding UTF8
$publishClick=$publishRunnerSource.IndexOf('Publish-XPost -Text $text');$lastCutoffCheck=$publishRunnerSource.LastIndexOf('Assert-XBeforePublishCutoff $StopAtKst',$publishClick)
Assert-True ($publishRunnerSource.Contains('[string]$StopAtKst') -and $lastCutoffCheck -ge 0) 'X PublishOnly accepts the same-day cutoff and checks it immediately before the post click'
$postingConfig=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8|ConvertFrom-Json
Assert-True ($postingConfig.x_link_card.base_url -in @('https://escapezombie.com','https://escape-zombie-school-assets.web.app') -and $publishRunnerSource.Contains("enabled=`$false; base_url='https://escapezombie.com'")) 'website-card mode defaults off for old configs and restricts the host to approved HTTPS origins'
Assert-True ($publishRunnerSource.Contains('WebsiteCardOnly publishing requires -PublishOnly -SinglePost') -and $publishRunnerSource.Contains("postFormat='website_card'") -and $publishRunnerSource.Contains('cardUrl=$cardUrl') -and $publishRunnerSource.Contains('imageSha256=$imageSha256')) 'website-card mode is explicit and freezes format, URL, and image hash in its intent'
Assert-True ($publishRunnerSource.Contains('$WebsiteCardOnly -and -not $PrepareOnly') -and $publishRunnerSource.Contains('$websiteCardMode -and -not $PrepareOnly')) 'website-card PrepareOnly can preview while actual publish remains separately gated'
$cardBranch=$source.IndexOf('if ($WebsiteCardOnly) {',$source.IndexOf('function Prepare-XPost'))
$nativeUpload=$source.IndexOf('$image = [Drawing.Image]::FromFile($ImagePath)',$source.IndexOf('function Prepare-XPost'))
Assert-True ($cardBranch -ge 0 -and $nativeUpload -gt $cardBranch -and $source.Contains("if ((Get-XAttachmentCount) -ne 0) { throw 'Website-card mode forbids a native image attachment' }")) 'website-card draft uses text/link only and rejects a simultaneous photo attachment'
Assert-True ($source.Contains('function Get-XWebsiteCardProof') -and $source.Contains('Assert-XComposer $Text -WebsiteCardOnly:$WebsiteCardOnly -CardUrl $CardUrl')) 'card proof is rechecked through the composer assertion before Publish'
$invokeButtonBody=[regex]::Match($source,'function Invoke-XButton\([\s\S]*?\r?\n}').Value
$publishPostBody=[regex]::Match($source,'function Publish-XPost\([\s\S]*?\r?\n}').Value
Assert-True ($invokeButtonBody.Contains('Assert-XForeground') -and $invokeButtonBody.Contains('ControlType]::Button') -and $invokeButtonBody.Contains('IsEnabled') -and $invokeButtonBody.Contains('IsOffscreen') -and $invokeButtonBody.Contains('InvokePattern]::Pattern') -and $invokeButtonBody.Contains('$pattern.Invoke()') -and $invokeButtonBody.Contains('refusing coordinate fallback')) 'website-card publish uses guarded native UI Automation InvokePattern and fails closed when unsupported'
Assert-True ($publishPostBody.Contains('if ($WebsiteCardOnly) { Invoke-XButton $postButton }') -and $publishPostBody.Contains('else { Click-XElement $postButton }')) 'native button invocation is limited to website-card mode; photo mode keeps its existing click path'
Assert-True ($source.Contains('function Test-XObservedWebsiteCardEvidence') -and $source.Contains('dialogEditors.Count -eq 1') -and $source.Contains('Get-XElements $dialog')) 'observed X card evidence is constrained to the nearest composer ancestor with exactly one editor'
$standaloneUrlPaste=$source.IndexOf("[Windows.Forms.Clipboard]::SetText(`$CardUrl)",$source.IndexOf('function Prepare-XPost'))
$cardWait=$source.IndexOf("'exact website card URL and visible card image'",$standaloneUrlPaste)
$fullTextReplace=$source.IndexOf("[Windows.Forms.Clipboard]::SetText(`$Text)",$cardWait)
Assert-True ($standaloneUrlPaste -ge 0 -and $cardWait -gt $standaloneUrlPaste -and $fullTextReplace -gt $cardWait -and $source.Contains('(Get-XCardPreviewRemoveCount) -ne 0')) 'card preview is created from the standalone exact URL before full campaign copy is restored; stale preview blocks a new prepare'
$observedUrl = 'https://escapezombie.com/share/x/ko/b3b795b213eeda0a'
$observedCopy = 'copy ' + $observedUrl + ' Play URL'
$observedGroup = 'escapezombie.com ' + (-join @(0xD0C8,0xCD9C,0x21,0x20,0xC880,0xBE44,0xD559,0xAD50 | ForEach-Object { [char]$_ }))
$sourceButton = 'From escapezombie.com'
$removeButton = 'Remove card preview'
$observedCardProof=Test-XObservedWebsiteCardEvidence -BoundCardUrl $observedUrl -CardUrl $observedUrl -EditorText $observedCopy -GroupName $observedGroup -ChildButtonName $observedGroup -SourceButtonName $sourceButton -RemoveButtonName $removeButton -Width 516 -Height 272 -SameDialog $true
Assert-True $observedCardProof 'observed Korean campaign card and same-dialog controls prove the bound URL'
$jaGroup = Get-XWebsiteCardGroupName 'https://escapezombie.com/share/x/ja/0123456789abcdef'
$enGroup = Get-XWebsiteCardGroupName 'https://escapezombie.com/share/x/en/0123456789abcdef'
$viGroup = Get-XWebsiteCardGroupName 'https://escapezombie.com/share/x/vi/0123456789abcdef'
$expectedJa = 'escapezombie.com ' + (-join @(0x8131,0x51FA,0xFF01,0x30BE,0x30F3,0x30D3,0x5B66,0x6821 | ForEach-Object { [char]$_ }))
$expectedVi = 'escapezombie.com Tho' + [char]0x00E1 + 't Kh' + [char]0x1ECF + 'i Tr' + [char]0x01B0 + [char]0x1EDD + 'ng Zombie'
Assert-True ($jaGroup -ceq $expectedJa -and $enGroup -ceq 'escapezombie.com Escape! Zombie School' -and $viGroup -ceq $expectedVi) 'card UIA title is localized for all campaign locales'
$avatarProof=Test-XObservedWebsiteCardEvidence -BoundCardUrl $observedUrl -CardUrl $observedUrl -EditorText $observedCopy -GroupName 'Profile avatar' -ChildButtonName 'Profile avatar' -SourceButtonName $sourceButton -RemoveButtonName $removeButton -Width 516 -Height 272 -SameDialog $true
Assert-True (-not $avatarProof) 'avatar/profile image cannot satisfy the observed card group proof'
$smallCardProof=Test-XObservedWebsiteCardEvidence -BoundCardUrl $observedUrl -CardUrl $observedUrl -EditorText $observedCopy -GroupName $observedGroup -ChildButtonName $observedGroup -SourceButtonName $sourceButton -RemoveButtonName $removeButton -Width 24 -Height 25 -SameDialog $true
Assert-True (-not $smallCardProof) 'small preview controls do not count as the visible card image'
$crossDialogProof=Test-XObservedWebsiteCardEvidence -BoundCardUrl $observedUrl -CardUrl $observedUrl -EditorText $observedCopy -GroupName $observedGroup -ChildButtonName $observedGroup -SourceButtonName $sourceButton -RemoveButtonName $removeButton -Width 516 -Height 272 -SameDialog $false
Assert-True (-not $crossDialogProof) 'card group and controls from different dialog scopes are rejected'
Assert-True ($source.Contains("elseif ((Get-XAttachmentCount) -ne 1) { throw 'Expected exactly one attached campaign image' }") -and $source.Contains('[Windows.Forms.Clipboard]::SetImage($image)')) 'default photo mode still requires and uploads exactly one image'
Assert-True (Test-XWebsiteCardEvidence -LinkUrls @('https://escapezombie.com/share/x/ja/0123456789abcdef') -CardImageCount 1 -CardUrl 'https://escapezombie.com/share/x/ja/0123456789abcdef') 'exact locale/hash link plus card image is accepted'
Assert-True (-not (Test-XWebsiteCardEvidence -LinkUrls @('https://escapezombie.com/share/x/ja/0123456789abcdef') -CardImageCount 0 -CardUrl 'https://escapezombie.com/share/x/ja/0123456789abcdef')) 'URL text without a card image is rejected'
Assert-True (-not (Test-XWebsiteCardEvidence -LinkUrls @('https://play.google.com/store/apps/details?id=x') -CardImageCount 1 -CardUrl 'https://escapezombie.com/share/x/ja/0123456789abcdef')) 'a wrong selected website link is rejected even if an image exists'
Assert-True (-not (Test-XWebsiteCardEvidence -LinkUrls @('https://escapezombie.com/share/x/ja/0123456789abcdef') -CardImageCount 1 -CardUrl 'https://escapezombie.com/share/x/ja/fedcba9876543210')) 'a card for another frozen image hash is rejected'
Assert-True (Test-XWebsiteCardEvidence -LinkUrls @('https://escape-zombie-school-assets.web.app/share/x/en/0123456789abcdef') -CardImageCount 1 -CardUrl 'https://escape-zombie-school-assets.web.app/share/x/en/0123456789abcdef') 'the approved assets-host origin is accepted'
Assert-True (-not (Test-XWebsiteCardEvidence -LinkUrls @('https://example.com/share/x/ja/0123456789abcdef') -CardImageCount 1 -CardUrl 'https://example.com/share/x/ja/0123456789abcdef')) 'unapproved card origins are rejected'
$vaultPath = Join-Path $PSScriptRoot 'XCredentialVault.ps1'
$vaultSource = Get-Content -LiteralPath $vaultPath -Raw -Encoding UTF8
Assert-True ($vaultSource.Contains("'EscapeZombieSchool-XPosting'") -and $vaultSource.Contains('CredReadW') -and $vaultSource.Contains('CredFree')) 'reads one named Windows Credential Manager entry at runtime and frees the native credential'
foreach ($forbidden in @('CredWrite','WriteAllText','Set-Content','ConvertTo-SecureString','Write-Output $password')) { Assert-True (-not $vaultSource.Contains($forbidden)) "credential adapter does not $forbidden" }
. $vaultPath
Assert-True ($null -ne (Get-Command Get-XPostingVaultCredential -ErrorAction SilentlyContinue)) 'credential helper loads without reading or writing a credential'

# Exercise Initialize-XWindow through its private adapter functions. This test
# does not launch Chrome, access the desktop, or call any posting action.
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
