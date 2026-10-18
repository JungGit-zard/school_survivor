Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookNative.ps1')
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};"PASS $Name"}
function Assert-Throws([scriptblock]$Action,[string]$Name){$threw=$false;try{$null=& $Action}catch{$threw=$true};Assert-True $threw $Name}
function New-TestWindow([long]$Id,[string[]]$Tabs){[pscustomobject]@{windowId=$Id;isChrome=$true;tabNames=$Tabs}}
$englishLogin=@([pscustomobject]@{isVisible=$true;controlType='Edit';name='Password';isPassword=$false},[pscustomobject]@{isVisible=$true;controlType='Button';name='Log in';isPassword=$false})
$koreanLogin=@([pscustomobject]@{isVisible=$true;controlType='Edit';name='';isPassword=$true},[pscustomobject]@{isVisible=$true;controlType='Button';name='로그인';isPassword=$false})
$loggedInProfile=@([pscustomobject]@{isVisible=$true;controlType='Edit';name='Address and search bar';isPassword=$false},[pscustomobject]@{isVisible=$true;controlType='Button';name="What's on your mind?";isPassword=$false})
$securityChallenge=@([pscustomobject]@{isVisible=$true;controlType='Text';name='Security check';isPassword=$false},[pscustomobject]@{isVisible=$true;controlType='Button';name='Continue';isPassword=$false})
Assert-True (Test-FacebookLoginControls $englishLogin) 'visible English password edit and Log in button identify an explicit login form'
Assert-True (Test-FacebookLoginControls $koreanLogin) 'visible password edit and Korean 로그인 button identify an explicit login form'
Assert-True (-not (Test-FacebookLoginControls $loggedInProfile)) 'logged-in profile controls are not classified as a login form'
Assert-True (-not (Test-FacebookLoginControls $securityChallenge)) 'security challenge controls are not classified as a login form'

$unrelated=@((New-TestWindow 1 @('X')),(New-TestWindow 2 @('Google Search')),(New-TestWindow 3 @('YouTube')))
$oneFacebook=@($unrelated+(New-TestWindow 4 @('(2) Facebook')))
Assert-True ((Resolve-FacebookWindowDescriptor $oneFacebook 0).windowId -eq 4) 'three unrelated Chrome windows plus one Facebook tab resolves only Facebook'
Assert-True (Test-FacebookTabName 'Hyun Uk Jung | Facebook') 'Facebook profile-title tab is recognized'
Assert-True (Test-FacebookTabName '정즴 (@hyunuk.jung.56) • Facebook') 'localized Chrome Facebook profile-title tab is recognized'
Assert-True ((Resolve-FacebookDiscoveryPlan @((New-TestWindow 9 @('New Tab')))).openProfileNewTab) 'one Chrome window without a Facebook tab is selected for guarded profile-tab opening'
Assert-Throws { Resolve-FacebookDiscoveryPlan @((New-TestWindow 9 @('New Tab')),(New-TestWindow 10 @('Google Search'))) } 'no Facebook tab across multiple Chrome windows refuses window guessing'
$titledFacebook=[pscustomobject]@{windowId=11;windowName='(5) Facebook - Chrome';isChrome=$true;tabNames=@()}
Assert-True ((Resolve-FacebookDiscoveryPlan @((New-TestWindow 9 @('X')),$titledFacebook)).windowId -eq 11) 'one exact Facebook window title recovers discovery when tab accessibility is missing'
Assert-Throws { Resolve-FacebookDiscoveryPlan @($titledFacebook,([pscustomobject]@{windowId=12;windowName='Facebook - Chrome';isChrome=$true;tabNames=@()})) } 'two titled Facebook windows remain ambiguous'
Assert-Throws { Resolve-FacebookWindowDescriptor $unrelated 0 } 'no Facebook candidate stops clearly'
Assert-Throws { Resolve-FacebookWindowDescriptor @((New-TestWindow 4 @('Facebook')),(New-TestWindow 5 @('Other | Facebook'))) 0 } 'two Facebook candidates stop without choosing an account'
Assert-Throws { Resolve-FacebookWindowDescriptor $oneFacebook 99 } 'invalid explicit HWND is rejected'
$nativeSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'FacebookNative.ps1') -Raw -Encoding UTF8
$invokeSource=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-FacebookDailyZombieSchoolPosting.ps1') -Raw -Encoding UTF8
Assert-True ($invokeSource.Contains("'DiscoverWindow'") -and $invokeSource.Contains('Get-FacebookChromeWindowForDiscovery')) 'scheduled discovery opens a profile tab only through the strict no-tab single-window resolver'
Assert-True ($invokeSource -match '\$readOnlyActions=@\([^\r\n]*\)' -and $invokeSource -notmatch '\$readOnlyActions=@\([^\r\n]*DiscoverWindow') 'Facebook discovery that can open a tab is protected by the profile mutex'
Assert-True ($nativeSource -match 'function Get-FacebookChromeWindowForDiscovery' -and $nativeSource -match 'Open-FacebookProfileNewTabNative \$plan.windowId' -and $nativeSource -match 'multiple Chrome windows are present; refusing to guess') 'zero-tab fallback opens in the sole Chrome window and keeps ambiguous multi-window discovery blocked'
Assert-True ($nativeSource -match "LocalizedControlType -match 'heading" -and $nativeSource -match '\$token -in @\(''edit'',''link''\)') 'native fallback preserves headings outside post text and limits Value serialization to parser-relevant controls'
Assert-True ($nativeSource -match "source='native_uia'" -and $nativeSource -match 'Get-FacebookNativeTree \$window' -and $nativeSource -match 'Supplied Facebook PID does not own') 'native UIA tree is primary and revalidates exact PID/window scope'
Assert-True ($nativeSource -match 'AutomationId -eq .1.' -and $nativeSource -match 'Invoke-FacebookNativeOpenButton') 'native chooser fallback requires one AutomationId 1 Open button with InvokePattern'
$composerButtonSource=[regex]::Match($nativeSource,'(?s)function Get-FacebookVisibleComposerButton.*?(?=\r?\nfunction |\z)').Value
$composerInvokeSource=[regex]::Match($nativeSource,'(?s)function Invoke-FacebookComposerButton.*?(?=\r?\nfunction |\z)').Value
$openComposerSource=[regex]::Match($nativeSource,'(?s)function Open-FacebookComposerNative.*?(?=\r?\nfunction |\z)').Value
Assert-True ($composerButtonSource -match 'ScrollItemPattern' -and $composerButtonSource -match 'Expected one exact Facebook composer button' -and $composerInvokeSource -match 'Test-FacebookVisiblePostingIdentity' -and $composerInvokeSource -match 'Assert-FacebookForeground \$Window' -and $openComposerSource -match 'Assert-FacebookForeground \$w;\$click=Invoke-FacebookComposerButton \$button \$w') 'composer selection keeps exact scoping and scroll checks; semantic invoke rechecks identity and foreground before click'
Assert-True ((Get-Command Focus-FacebookChromeWindow -ErrorAction Stop).CommandType -eq 'Function') 'focus helper is loaded as an executable native adapter function'
Assert-True ($nativeSource -match 'IsIconic' -and $nativeSource -match 'ShowWindow\(\$target,9\)' -and $nativeSource -match 'AttachThreadInput' -and $nativeSource -match 'Assert-FacebookForeground \$Window') 'focus helper restores Chrome, attaches input only after direct foreground fails, then asserts the exact HWND'
$publishSource=[regex]::Match($nativeSource,'(?s)function Invoke-FacebookPublishNative.*?(?=\r?\nfunction |\z)').Value
Assert-True ($publishSource -match 'Focus-FacebookChromeWindow \$w' -and $publishSource -match 'Get-FacebookComposerDialog \$w' -and $publishSource -match 'Get-FacebookScopedButton \$freshDialog @\(''Post'',''게시''\)' -and $publishSource -match 'Fresh exact Facebook composer Post button changed before semantic invoke' -and $publishSource -match 'Assert-FacebookForeground \$w\s+Invoke-FacebookUiClick \$post \$w') 'publish reacquires the exact composer and enabled Post button before semantic invoke; coordinate fallback asserts the exact foreground'
Assert-True ((Resolve-FacebookComposerReadiness @()).state -eq 'wait') 'deferred composer readiness waits without another click when no exact composer exists yet'
$emptyComposer=[pscustomobject]@{isEmpty=$true;attachmentCount=0;authorCount=1;friendsCount=1}
Assert-True ((Resolve-FacebookComposerReadiness @($emptyComposer)).state -eq 'reuse_empty') 'one exact empty Friends composer is reused instead of clicking another composer button'
Assert-Throws { Resolve-FacebookComposerReadiness @([pscustomobject]@{isEmpty=$false;attachmentCount=0;authorCount=1;friendsCount=1}) } 'nonempty existing composer is never reused'
Assert-Throws { Resolve-FacebookComposerReadiness @($emptyComposer,$emptyComposer) } 'ambiguous existing composers are never reused'
Assert-True ($nativeSource -match 'Get-FacebookExistingComposerReadiness' -and $nativeSource -match 'reusedEmptyComposer=\$true' -and $nativeSource -match 'AddSeconds\(10\)' -and $nativeSource -match 'did not become ready after one composer click') 'composer reuses only the proven empty dialog and otherwise polls bounded readiness after one click'
$cancelSource=[regex]::Match($nativeSource,'(?s)function Cancel-FacebookOwnDraftNative.*?(?=\r?\nfunction |\z)').Value
Assert-True ($cancelSource -match 'Focus-FacebookChromeWindow \$w' -and $cancelSource -match 'Assert-FacebookForeground \$w;\$draft=Get-FacebookDraftNative') 'draft cancellation foregrounds the exact Chrome window before checking canonical draft evidence'
'FACEBOOK_WINDOW_DISCOVERY_TEST_OK'
