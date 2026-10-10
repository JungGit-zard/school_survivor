Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FacebookNative.ps1')
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};"PASS $Name"}
function Assert-Throws([scriptblock]$Action,[string]$Name){$threw=$false;try{$null=& $Action}catch{$threw=$true};Assert-True $threw $Name}
function New-TestWindow([long]$Id,[string[]]$Tabs){[pscustomobject]@{windowId=$Id;isChrome=$true;tabNames=$Tabs}}

$unrelated=@((New-TestWindow 1 @('X')),(New-TestWindow 2 @('Google Search')),(New-TestWindow 3 @('YouTube')))
$oneFacebook=@($unrelated+(New-TestWindow 4 @('(2) Facebook')))
Assert-True ((Resolve-FacebookWindowDescriptor $oneFacebook 0).windowId -eq 4) 'three unrelated Chrome windows plus one Facebook tab resolves only Facebook'
Assert-True (Test-FacebookTabName 'Hyun Uk Jung | Facebook') 'Facebook profile-title tab is recognized'
Assert-True (Test-FacebookTabName '정즴 (@hyunuk.jung.56) • Facebook') 'localized Chrome Facebook profile-title tab is recognized'
Assert-True ((Resolve-FacebookDiscoveryPlan @((New-TestWindow 9 @('New Tab')))).openProfileNewTab) 'one Chrome window without a Facebook tab is selected for guarded profile-tab opening'
Assert-Throws { Resolve-FacebookDiscoveryPlan @((New-TestWindow 9 @('New Tab')),(New-TestWindow 10 @('Google Search'))) } 'no Facebook tab across multiple Chrome windows refuses window guessing'
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
Assert-True ($nativeSource -match 'function Get-FacebookVisibleComposerButton' -and $nativeSource -match 'ScrollItemPattern' -and $nativeSource -match 'Expected one exact Facebook composer button' -and $nativeSource -match 'Assert-FacebookForeground \$w;Invoke-FacebookUiClick') 'offscreen composer button is uniquely scoped, scrolled into view, freshly visibility-checked, and foreground-checked before click'
Assert-True ((Get-Command Focus-FacebookChromeWindow -ErrorAction Stop).CommandType -eq 'Function') 'focus helper is loaded as an executable native adapter function'
Assert-True ($nativeSource -match 'IsIconic' -and $nativeSource -match 'ShowWindow\(\$target,9\)' -and $nativeSource -match 'AttachThreadInput' -and $nativeSource -match 'Assert-FacebookForeground \$Window') 'focus helper restores Chrome, attaches input only after direct foreground fails, then asserts the exact HWND'
$publishSource=[regex]::Match($nativeSource,'(?s)function Invoke-FacebookPublishNative.*?(?=\r?\nfunction |\z)').Value
Assert-True ($publishSource -match 'Focus-FacebookChromeWindow \$w' -and @([regex]::Matches($publishSource,'Assert-FacebookForeground \$w')).Count -eq 2) 'publish reacquires and rechecks the exact Chrome foreground before the semantic Post click'
Assert-True ((Resolve-FacebookComposerReadiness @()).state -eq 'wait') 'deferred composer readiness waits without another click when no exact composer exists yet'
$emptyComposer=[pscustomobject]@{isEmpty=$true;attachmentCount=0;authorCount=1;friendsCount=1}
Assert-True ((Resolve-FacebookComposerReadiness @($emptyComposer)).state -eq 'reuse_empty') 'one exact empty Friends composer is reused instead of clicking another composer button'
Assert-Throws { Resolve-FacebookComposerReadiness @([pscustomobject]@{isEmpty=$false;attachmentCount=0;authorCount=1;friendsCount=1}) } 'nonempty existing composer is never reused'
Assert-Throws { Resolve-FacebookComposerReadiness @($emptyComposer,$emptyComposer) } 'ambiguous existing composers are never reused'
Assert-True ($nativeSource -match 'Get-FacebookExistingComposerReadiness' -and $nativeSource -match 'reusedEmptyComposer=\$true' -and $nativeSource -match 'AddSeconds\(10\)' -and $nativeSource -match 'did not become ready after one composer click') 'composer reuses only the proven empty dialog and otherwise polls bounded readiness after one click'
$cancelSource=[regex]::Match($nativeSource,'(?s)function Cancel-FacebookOwnDraftNative.*?(?=\r?\nfunction |\z)').Value
Assert-True ($cancelSource -match 'Focus-FacebookChromeWindow \$w' -and $cancelSource -match 'Assert-FacebookForeground \$w;\$draft=Get-FacebookDraftNative') 'draft cancellation foregrounds the exact Chrome window before checking canonical draft evidence'
'FACEBOOK_WINDOW_DISCOVERY_TEST_OK'
