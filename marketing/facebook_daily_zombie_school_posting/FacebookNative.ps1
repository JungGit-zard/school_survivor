# Native visible-UI adapter. No HTTP, CDP, browser profile, cookie, or hidden window access.
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
if (-not ('FacebookPostingNative' -as [type])) { Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class FacebookPostingNative {
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,StringBuilder l);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,string l);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int n);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int cx,int cy,uint flags);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,IntPtr extra);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a,uint b,bool attach);
 [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
 public const uint WM_SETTEXT=0x000C, WM_GETTEXT=0x000D, WM_GETTEXTLENGTH=0x000E;
 public static string ReadText(IntPtr h) { int n=(int)SendMessage(h,WM_GETTEXTLENGTH,IntPtr.Zero,(StringBuilder)null); var b=new StringBuilder(n+2); SendMessage(h,WM_GETTEXT,(IntPtr)b.Capacity,b); return b.ToString(); }
 public static bool WriteText(IntPtr h,string s) { return SendMessage(h,WM_SETTEXT,IntPtr.Zero,s)!=IntPtr.Zero; }
}
'@ }
$script:FacebookWindowLeft=0
$script:FacebookWindowTop=0
$script:FacebookWindowWidth=1280
$script:FacebookWindowHeight=900
$script:FacebookProfileUrl='https://www.facebook.com/hyunuk.jung.56/'
$script:FacebookWindowPosNoZOrder=0x0004
$script:FacebookMouseLeftDown=0x0002
$script:FacebookMouseLeftUp=0x0004
$script:FacebookCoordinateCachePath=Join-Path ([IO.Path]::GetTempPath()) 'escape-zombie-school-facebook-coordinate-cache.json'
function Get-FacebookUiAll($Root) { @($Root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)) }
function Get-FacebookValue($Element) { $p=$null; if($Element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$p)){return $p.Current.Value}; if($Element.TryGetCurrentPattern([Windows.Automation.TextPattern]::Pattern,[ref]$p)){return $p.DocumentRange.GetText(-1)}; '' }
function Test-FacebookTabName([string]$Name) { return $Name -match '^(?:\(\d+\)\s+)?Facebook$|\| Facebook$' }
function Resolve-FacebookWindowDescriptor($Descriptors,[long]$WindowId=0) {
 $windows=@($Descriptors|Where-Object{$_.isChrome})
 if($WindowId){$exact=@($windows|Where-Object{$_.windowId -eq $WindowId});if($exact.Count -ne 1){throw "Expected one exact Chrome WindowId $WindowId; found $($exact.Count)"};return $exact[0]}
 $facebook=@($windows|Where-Object{@($_.tabNames|Where-Object{Test-FacebookTabName $_}).Count -gt 0})
 if($facebook.Count -eq 0){throw 'No visible Chrome window exposes a Facebook tab'}
 if($facebook.Count -ne 1){throw "Expected one visible Facebook Chrome window; found $($facebook.Count)"}
 $facebook[0]
}
function Get-FacebookChromeWindow([long]$WindowId=0) {
 $windows=Get-FacebookChromeWindows
 $descriptors=@(foreach($window in $windows){[pscustomobject]@{windowId=$window.Current.NativeWindowHandle;isChrome=$true;tabNames=@((Get-FacebookUiAll $window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem}|ForEach-Object{$_.Current.Name});window=$window}})
 $selected=Resolve-FacebookWindowDescriptor $descriptors $WindowId
 $selected.window
}
function Get-FacebookChromeWindows {
 @([Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition) | Where-Object {$_.Current.ClassName -eq 'Chrome_WidgetWin_1' -and (Get-Process -Id $_.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -eq 'chrome'})
}
function Assert-FacebookForeground($Window) { if([FacebookPostingNative]::GetForegroundWindow().ToInt64() -ne $Window.Current.NativeWindowHandle){throw 'Chrome target is not foreground; input stopped'} }
function Set-FacebookStableWindowBounds($Window) {
 $target=[IntPtr]$Window.Current.NativeWindowHandle
 if($target -eq [IntPtr]::Zero){throw 'Chrome target has no HWND'}
 # Position is deliberately fixed for repeatable visible UI work. Click targets are still
 # freshly resolved through UI Automation, never trusted from a stale coordinate cache.
 if([FacebookPostingNative]::IsZoomed($target)){[FacebookPostingNative]::ShowWindow($target,9)|Out-Null;Start-Sleep -Milliseconds 100}
 $rect=New-Object FacebookPostingNative+RECT
 for($attempt=0;$attempt -lt 2;$attempt++) {
  if(-not [FacebookPostingNative]::SetWindowPos($target,[IntPtr]::Zero,$script:FacebookWindowLeft,$script:FacebookWindowTop,$script:FacebookWindowWidth,$script:FacebookWindowHeight,$script:FacebookWindowPosNoZOrder)){throw 'Could not set the fixed Facebook Chrome window bounds; input stopped'}
  Start-Sleep -Milliseconds 50
  if(-not [FacebookPostingNative]::GetWindowRect($target,[ref]$rect)){throw 'Could not read the fixed Facebook Chrome window bounds; input stopped'}
  if($rect.Left -eq $script:FacebookWindowLeft -and $rect.Top -eq $script:FacebookWindowTop -and ($rect.Right-$rect.Left) -eq $script:FacebookWindowWidth -and ($rect.Bottom-$rect.Top) -eq $script:FacebookWindowHeight){break}
  if($attempt -eq 0){[FacebookPostingNative]::ShowWindow($target,9)|Out-Null;Start-Sleep -Milliseconds 100}
 }
 if($rect.Left -ne $script:FacebookWindowLeft -or $rect.Top -ne $script:FacebookWindowTop -or ($rect.Right-$rect.Left) -ne $script:FacebookWindowWidth -or ($rect.Bottom-$rect.Top) -ne $script:FacebookWindowHeight){throw 'Facebook Chrome window bounds did not match the fixed posting layout after one restore retry; input stopped'}
 [pscustomobject]@{left=$rect.Left;top=$rect.Top;width=($rect.Right-$rect.Left);height=($rect.Bottom-$rect.Top)}
}
function Focus-FacebookChromeWindow($Window) {
 $target=[IntPtr]$Window.Current.NativeWindowHandle;if($target -eq [IntPtr]::Zero){throw 'Chrome target has no HWND'}
 if([FacebookPostingNative]::IsIconic($target)){[FacebookPostingNative]::ShowWindow($target,9)|Out-Null}
 Set-FacebookStableWindowBounds $Window|Out-Null
 if([FacebookPostingNative]::GetForegroundWindow() -eq $target){return}
 [FacebookPostingNative]::SetForegroundWindow($target)|Out-Null;Start-Sleep -Milliseconds 150
 if([FacebookPostingNative]::GetForegroundWindow() -eq $target){return}
 $foreground=[FacebookPostingNative]::GetForegroundWindow();$currentThread=[FacebookPostingNative]::GetCurrentThreadId();[uint32]$ignored=0;$targetThread=[FacebookPostingNative]::GetWindowThreadProcessId($target,[ref]$ignored);$foregroundThread=if($foreground -eq [IntPtr]::Zero){[uint32]0}else{[FacebookPostingNative]::GetWindowThreadProcessId($foreground,[ref]$ignored)};$attachedForeground=$false;$attachedTarget=$false
 try {
  if($foregroundThread -ne 0 -and $foregroundThread -ne $currentThread){$attachedForeground=[FacebookPostingNative]::AttachThreadInput($currentThread,$foregroundThread,$true);if(-not $attachedForeground){throw 'Could not attach current input to foreground window; input stopped'}}
  if($targetThread -ne 0 -and $targetThread -ne $currentThread){$attachedTarget=[FacebookPostingNative]::AttachThreadInput($currentThread,$targetThread,$true);if(-not $attachedTarget){throw 'Could not attach current input to Chrome target; input stopped'}}
  [FacebookPostingNative]::SetForegroundWindow($target)|Out-Null;Start-Sleep -Milliseconds 150
 } finally {
  if($attachedTarget){[FacebookPostingNative]::AttachThreadInput($currentThread,$targetThread,$false)|Out-Null}
  if($attachedForeground){[FacebookPostingNative]::AttachThreadInput($currentThread,$foregroundThread,$false)|Out-Null}
 }
 Assert-FacebookForeground $Window
}
function Get-FacebookCoordinateCacheRecords {
 if(-not (Test-Path -LiteralPath $script:FacebookCoordinateCachePath)){return @()}
 try {@(Get-Content -LiteralPath $script:FacebookCoordinateCachePath -Raw -Encoding UTF8|ConvertFrom-Json)}catch{@()}
}
function Save-FacebookCoordinateCacheRecords($Records) {
 $directory=[IO.Path]::GetDirectoryName($script:FacebookCoordinateCachePath);[IO.Directory]::CreateDirectory($directory)|Out-Null
 $temporary=$script:FacebookCoordinateCachePath+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try {[IO.File]::WriteAllText($temporary,(@($Records)|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false));Move-Item -LiteralPath $temporary -Destination $script:FacebookCoordinateCachePath -Force} finally {if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}}
}
function Resolve-FacebookCoordinateCacheEntry($Records,[string]$Key,[string]$State,[int]$X,[int]$Y) {
 $validRecords=@($Records|Where-Object{ $null -ne $_ -and $_.PSObject.Properties.Name -contains 'key' })
 $matches=@($validRecords|Where-Object{$_.key -ceq $Key})
 $cached=if($matches.Count -eq 1){$matches[0]}else{$null}
 $hit=$null -ne $cached -and $cached.state -ceq $State -and [int]$cached.x -eq $X -and [int]$cached.y -eq $Y
 $next=@($validRecords|Where-Object{$_.key -cne $Key})+[pscustomobject]@{key=$Key;state=$State;x=$X;y=$Y;verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o')}
 [pscustomobject]@{cacheHit=$hit;records=$next}
}
function Get-FacebookUiParentWindowName($Element) {
 $walker=[Windows.Automation.TreeWalker]::ControlViewWalker;$node=$Element
 while($null -ne $node){if($node.Current.ControlType -eq [Windows.Automation.ControlType]::Window){return [string]$node.Current.Name};$node=$walker.GetParent($node)}
 ''
}
function Get-FacebookExactStorageWarningClose($Window) {
 $warningText='계속하려면 여유 공간을 확보하세요'
 # Chrome exposes the dialog title both as a Window and a nested heading.  The Window is
 # the authority; the heading must never count as a second warning or widen the click scope.
 $warnings=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Window -and $_.Current.Name -ceq $warningText})
 if($warnings.Count -eq 0){return $null}
 if($warnings.Count -ne 1){throw "Expected one exact Chrome storage warning; found $($warnings.Count)"}
 $closes=@((Get-FacebookUiAll $warnings[0])|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -in @('Close','닫기')})
 if($closes.Count -ne 1){throw "Exact Chrome storage warning has $($closes.Count) scoped Close buttons; recovery stopped"}
 [pscustomobject]@{dialog=$warnings[0];close=$closes[0]}
}
function Invoke-FacebookUiClick($Element,$Window,[switch]$AllowExactStorageWarningClose) {
 Assert-FacebookForeground $Window
 $controlType=$Element.Current.ControlType;$name=$Element.Current.Name
 # Always establish the same visible viewport before taking a coordinate from UIA.
 # This keeps the cached diagnostic coordinate useful, but never makes it authority.
 $layout=Set-FacebookStableWindowBounds $Window
 $clickRoot=$Window;$storageClose=$null
 if($AllowExactStorageWarningClose){
  if($controlType -ne [Windows.Automation.ControlType]::Button -or $name -notin @('Close','닫기')){throw 'Only an exact Chrome storage-warning Close button may bypass the account marker'}
  $storageClose=Get-FacebookExactStorageWarningClose $Window
  if($null -eq $storageClose){throw 'Exact Chrome storage warning disappeared before its Close click; recovery stopped'}
  $clickRoot=$storageClose.dialog;$controlType=$storageClose.close.Current.ControlType;$name=$storageClose.close.Current.Name
 }
 $fresh=@((Get-FacebookUiAll $clickRoot)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq $controlType -and $_.Current.Name -ceq $name})
 if($fresh.Count -ne 1){throw 'UI target frame changed before coordinate click; input stopped'}
 $Element=$fresh[0]
 $accounts=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -ceq 'Hyun Uk Jung'})
 $postingIdentity=Test-FacebookVisiblePostingIdentity $Window
 if(-not $postingIdentity -and $null -eq $storageClose){throw 'Expected visible Facebook posting identity is absent; coordinate click stopped'}
 $bounds=$Element.Current.BoundingRectangle
 if($bounds.IsEmpty -or $bounds.Width -lt 2 -or $bounds.Height -lt 2){throw 'UI target has no usable visible frame; coordinate click stopped'}
 $x=[int][math]::Floor($bounds.X+($bounds.Width/2));$y=[int][math]::Floor($bounds.Y+($bounds.Height/2))
 if($x -lt [int]$bounds.X -or $x -ge [int]($bounds.X+$bounds.Width) -or $y -lt [int]$bounds.Y -or $y -ge [int]($bounds.Y+$bounds.Height)){throw 'Computed coordinate is outside the fresh UI target frame; input stopped'}
 $key=('profile={0}|bounds={1},{2},{3},{4}|control={5}|name={6}' -f $script:FacebookProfileUrl,$layout.left,$layout.top,$layout.width,$layout.height,$Element.Current.ControlType.ProgrammaticName,[uri]::EscapeDataString($Element.Current.Name))
 $state=('account={0}|dialog={1}' -f $(if($accounts.Count -gt 0){'Hyun Uk Jung'}elseif($postingIdentity){'own-profile-composer'}else{'exact-storage-warning'}),[uri]::EscapeDataString((Get-FacebookUiParentWindowName $Element)))
 $resolution=Resolve-FacebookCoordinateCacheEntry (Get-FacebookCoordinateCacheRecords) $key $state $x $y
 Save-FacebookCoordinateCacheRecords $resolution.records
 Assert-FacebookForeground $Window
 if(-not [FacebookPostingNative]::SetCursorPos($x,$y)){throw 'Could not move to the freshly verified Facebook control coordinate; input stopped'}
 if($AllowExactStorageWarningClose){$storageClose=Get-FacebookExactStorageWarningClose $Window;if($null -eq $storageClose){throw 'Exact Chrome storage warning disappeared immediately before its Close click; recovery stopped'};$clickRoot=$storageClose.dialog}
 $immediate=@((Get-FacebookUiAll $clickRoot)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq $controlType -and $_.Current.Name -ceq $name})
 if($immediate.Count -ne 1 -or $immediate[0].Current.BoundingRectangle.X -ne $bounds.X -or $immediate[0].Current.BoundingRectangle.Y -ne $bounds.Y -or $immediate[0].Current.BoundingRectangle.Width -ne $bounds.Width -or $immediate[0].Current.BoundingRectangle.Height -ne $bounds.Height){throw 'UI target frame changed immediately before coordinate click; input stopped'}
 if(-not (Test-FacebookVisiblePostingIdentity $Window) -and $null -eq $storageClose){throw 'Expected visible Facebook posting identity changed immediately before coordinate click; input stopped'}
 Assert-FacebookForeground $Window
 [FacebookPostingNative]::mouse_event($script:FacebookMouseLeftDown,0,0,0,[IntPtr]::Zero)
 [FacebookPostingNative]::mouse_event($script:FacebookMouseLeftUp,0,0,0,[IntPtr]::Zero)
 [pscustomobject]@{cacheHit=$resolution.cacheHit;x=$x;y=$y}
}
function Close-FacebookChromeStorageWarningIfPresent($Window) {
 Focus-FacebookChromeWindow $Window;Assert-FacebookForeground $Window
 $target=Get-FacebookExactStorageWarningClose $Window
 if($null -eq $target){return [pscustomobject]@{status='absent';uiTouched=$false}}
 $coordinate=Invoke-FacebookUiClick $target.close $Window -AllowExactStorageWarningClose
 $deadline=[DateTime]::UtcNow.AddSeconds(3)
 do { if($null -eq (Get-FacebookExactStorageWarningClose $Window)){return [pscustomobject]@{status='closed_exact_storage_warning';uiTouched=$true;coordinate=$coordinate}};Start-Sleep -Milliseconds 100 } while([DateTime]::UtcNow -lt $deadline)
 throw 'Exact Chrome storage warning remained after one Close click; recovery stopped'
}
function Find-FacebookUi([string[]]$Names,[string]$ControlType,$Window) { $hits=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType.ProgrammaticName -eq ('ControlType.'+$ControlType) -and $Names -contains $_.Current.Name});if($hits.Count -ne 1){throw "Expected one visible Facebook $ControlType [$($Names -join ', ')]; found $($hits.Count)"};$hits[0] }
function Get-FacebookTabSelected($Tab) {
 $selection=$null
 return $Tab.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection) -and $selection.Current.IsSelected
}
function Select-FacebookProfileTab($Window) {
 $tabs=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem -and ($_.Current.Name -ceq 'Facebook' -or (Test-FacebookTabName $_.Current.Name))})
 if($tabs.Count -gt 1){throw "Expected at most one exact Facebook tab; found $($tabs.Count)"}
 if($tabs.Count -ne 1){return $false}
 # Tabs can move while Chrome is rendering.  Use UIA's semantic selection rather
 # than a coordinate click, then prove the same named tab became selected.
 $selection=$null
 if(-not $tabs[0].TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection)){throw 'Exact Facebook tab lacks SelectionItemPattern; tab selection stopped'}
 $selection.Select();Start-Sleep -Milliseconds 200
 $fresh=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem -and $_.Current.Name -ceq $tabs[0].Current.Name})
 if($fresh.Count -ne 1 -or -not (Get-FacebookTabSelected $fresh[0])){throw 'Exact Facebook tab did not remain selected after semantic UIA selection'}
 $true
}
function Assert-FacebookProfileAddress($Window) {
 $addressNames=@('Address and search bar','주소창 및 검색창')
 $addresses=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames}|ForEach-Object{Get-FacebookValue $_}|Where-Object{$_ -match '^(?:https?://)?(?:www\.)?facebook\.com/hyunuk\.jung\.56/?(?:[?#]|$)'})
 if($addresses.Count -ne 1){throw "Expected one visible Hyun Uk Jung profile address; found $($addresses.Count)"}
}
function Navigate-FacebookProfileInSelectedTab($Window) {
 $addressNames=@('Address and search bar','주소창 및 검색창')
 $addresses=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames})
 if($addresses.Count -ne 1){throw "Expected one visible Chrome address bar in the selected Facebook tab; found $($addresses.Count)"}
 $address=$addresses[0];$address.SetFocus();Start-Sleep -Milliseconds 50
 $focused=[Windows.Automation.AutomationElement]::FocusedElement
 if($null -eq $focused -or -not [Windows.Automation.Automation]::Compare($focused,$address)){throw 'Chrome address bar did not receive focus; profile navigation stopped'}
 [Windows.Forms.Clipboard]::SetText($script:FacebookProfileUrl);[Windows.Forms.SendKeys]::SendWait('^a');[Windows.Forms.SendKeys]::SendWait('^v');[Windows.Forms.SendKeys]::SendWait('{ENTER}')
 $deadline=[DateTime]::UtcNow.AddSeconds(10)
 do { try { Assert-FacebookProfileAddress $Window;return } catch { Start-Sleep -Milliseconds 200 } } while([DateTime]::UtcNow -lt $deadline)
 throw 'Selected Facebook tab did not navigate to the exact Hyun Uk Jung profile address'
}
function Test-FacebookExactPostUrl([string]$Permalink) {
 $Permalink -cmatch '^https://www\.facebook\.com/hyunuk\.jung\.56/posts/(?:pfbid[A-Za-z0-9]+|[0-9]+)(?:\?[^#]*)?$'
}
function Test-FacebookExactPostDisplayAddress([string]$ObservedAddress,[string]$Permalink) {
 if(-not (Test-FacebookExactPostUrl $Permalink)){return $false}
 $displayAddress=$ObservedAddress;if($displayAddress -notmatch '^https?://'){$displayAddress="https://$displayAddress"}
 $expectedUri=[uri]$Permalink;$actualUri=$null
 [uri]::TryCreate($displayAddress,[UriKind]::Absolute,[ref]$actualUri) -and $actualUri.Scheme -ceq $expectedUri.Scheme -and $actualUri.Host -in @('facebook.com','www.facebook.com') -and $actualUri.AbsolutePath -ceq $expectedUri.AbsolutePath
}
function Open-FacebookExactPostNative([string]$Permalink,[long]$WindowId=0) {
 if(-not (Test-FacebookExactPostUrl $Permalink)){throw 'Only an exact Hyun Uk Jung Facebook post permalink can be opened'}
 $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Wait-FacebookProfileReady $w;Assert-FacebookForeground $w
 $readiness=Get-FacebookExistingComposerReadiness $w;if($readiness.state -notin @('wait','reuse_empty')){throw 'Existing composer is not empty; exact-post navigation stopped'}
 Assert-FacebookProfileAddress $w;Assert-FacebookAccountMarker $w
 $addressNames=@('Address and search bar','주소창 및 검색창');$addresses=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames})
 if($addresses.Count -ne 1){throw 'Expected one visible Chrome address bar for exact post navigation'}
 $address=$addresses[0];$address.SetFocus();Start-Sleep -Milliseconds 50;$focused=[Windows.Automation.AutomationElement]::FocusedElement
 if($null -eq $focused -or -not [Windows.Automation.Automation]::Compare($focused,$address)){throw 'Chrome address bar did not receive focus; exact-post navigation stopped'}
 [Windows.Forms.Clipboard]::SetText($Permalink);[Windows.Forms.SendKeys]::SendWait('^a');[Windows.Forms.SendKeys]::SendWait('^v');[Windows.Forms.SendKeys]::SendWait('{ENTER}')
 $deadline=[DateTime]::UtcNow.AddSeconds(15);do{try{$fresh=Get-FacebookChromeWindow $WindowId;Assert-FacebookForeground $fresh;$values=@((Get-FacebookUiAll $fresh)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames}|ForEach-Object{Get-FacebookValue $_});foreach($value in $values){if(Test-FacebookExactPostDisplayAddress ([string]$value) $Permalink){return [pscustomobject]@{status='exact_permalink_opened';windowId=$fresh.Current.NativeWindowHandle;permalink=$Permalink}}}}catch{};Start-Sleep -Milliseconds 250}while([DateTime]::UtcNow -lt $deadline)
 throw 'Exact post permalink did not become the visible Facebook address'
}
function Test-FacebookVisiblePostingIdentity($Window) {
 $accounts=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -ceq 'Hyun Uk Jung'})
 if($accounts.Count -ge 1){return $true}
 $composerNames=@("What's on your mind?",'무슨 생각을 하고 계신가요?')
 $composer=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -in $composerNames})
 $composer.Count -eq 1
}
function Assert-FacebookAccountMarker($Window) {
 if(-not (Test-FacebookVisiblePostingIdentity $Window)){throw 'Expected visible Hyun Uk Jung marker or one enabled own-profile composer button after selecting the Facebook tab'}
}
function Get-FacebookProfileReadinessDiagnostics($Window) {
 $addressNames=@('Address and search bar','주소창 및 검색창')
 $tabSnapshot=@(Get-FacebookVisibleTabSnapshot $Window)
 $exactFacebookTabs=@($tabSnapshot|Where-Object{Test-FacebookTabName ([string]$_.name)})
 $addressElements=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames})
 $addresses=@($addressElements|ForEach-Object{[pscustomobject]@{name=$_.Current.Name;value=(Get-FacebookValue $_)}})
 $matchingAddresses=@($addresses|Where-Object{$_.value -match '^(?:https?://)?(?:www\.)?facebook\.com/hyunuk\.jung\.56/?(?:[?#]|$)'})
 $accounts=@((Get-FacebookUiAll $Window)|Where-Object{$_.Current.Name -ceq 'Hyun Uk Jung'}|ForEach-Object{[pscustomobject]@{controlType=$_.Current.ControlType.ProgrammaticName;isOffscreen=$_.Current.IsOffscreen;isEnabled=$_.Current.IsEnabled}})
 $composerNames=@("What's on your mind?",'무슨 생각을 하고 계신가요?')
 $composerButtons=@((Get-FacebookUiAll $Window)|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -in $composerNames}|ForEach-Object{[pscustomobject]@{name=$_.Current.Name;isOffscreen=$_.Current.IsOffscreen;isEnabled=$_.Current.IsEnabled}})
 $addressError=$null;$accountError=$null
 try{Assert-FacebookProfileAddress $Window}catch{$addressError=$_.Exception.Message}
 try{Assert-FacebookAccountMarker $Window}catch{$accountError=$_.Exception.Message}
 [pscustomobject]@{windowId=$Window.Current.NativeWindowHandle;processId=$Window.Current.ProcessId;exactFacebookTabCount=$exactFacebookTabs.Count;visibleTabs=@($tabSnapshot);addressElements=@($addresses);matchingAddressCount=$matchingAddresses.Count;accountMarkers=@($accounts);visibleAccountMarkerCount=@($accounts|Where-Object{-not $_.isOffscreen}).Count;composerButtons=@($composerButtons);visibleComposerButtonCount=@($composerButtons|Where-Object{-not $_.isOffscreen -and $_.isEnabled}).Count;addressError=$addressError;accountError=$accountError}
}
function Wait-FacebookProfileReady($Window) {
 $deadline=[DateTime]::UtcNow.AddSeconds(15)
 do {
  # A malformed/ambiguous storage warning is a safety error, not a loading state.
  # Let it fail immediately instead of hiding it in the profile-settle retry loop.
  Close-FacebookChromeStorageWarningIfPresent $Window|Out-Null
  try { Assert-FacebookProfileAddress $Window;Assert-FacebookAccountMarker $Window;return } catch { Start-Sleep -Milliseconds 200 }
 } while([DateTime]::UtcNow -lt $deadline)
 throw 'Exact Hyun Uk Jung profile address and account marker did not settle within 15 seconds'
}
function Open-FacebookProfileNative([long]$WindowId=0,[switch]$ForceReload) {
 $w=Get-FacebookChromeWindow $WindowId
 Focus-FacebookChromeWindow $w
 if(-not (Select-FacebookProfileTab $w)){throw 'Resolved Facebook window no longer exposes one exact Facebook tab'}
 if($ForceReload){Navigate-FacebookProfileInSelectedTab $w}else{try { Assert-FacebookProfileAddress $w } catch { Navigate-FacebookProfileInSelectedTab $w }}
 Wait-FacebookProfileReady $w
 return [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;reusedTab=$true;windowBounds=(Set-FacebookStableWindowBounds $w)}
}
function Get-FacebookVisibleTabSnapshot($Window) {
 @((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem}|ForEach-Object{[pscustomobject]@{name=$_.Current.Name;selected=(Get-FacebookTabSelected $_)}})
}
function Open-FacebookProfileNewTabNative([long]$WindowId=0) {
 $w=Get-FacebookChromeWindow $WindowId
 Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w
 $existingFacebookTabs=@((Get-FacebookVisibleTabSnapshot $w)|Where-Object{Test-FacebookTabName $_.name})
 if($existingFacebookTabs.Count -gt 1){throw "Expected at most one exact Facebook tab before opening a profile tab; found $($existingFacebookTabs.Count)"}
 if($existingFacebookTabs.Count -eq 1){return Open-FacebookProfileNative $WindowId}
 $beforeTabs=@(Get-FacebookVisibleTabSnapshot $w)
 $selectedBefore=@($beforeTabs|Where-Object{$_.selected}|Select-Object -ExpandProperty name)
 [Windows.Forms.Clipboard]::SetText($script:FacebookProfileUrl)
 [Windows.Forms.SendKeys]::SendWait('^t')
 Start-Sleep -Milliseconds 150
 $addressNames=@('Address and search bar','주소창 및 검색창')
 $deadline=[DateTime]::UtcNow.AddSeconds(5)
 do {
  $addresses=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $addressNames})
  if($addresses.Count -eq 1){$addresses[0].SetFocus();break}
  Start-Sleep -Milliseconds 100
 } while([DateTime]::UtcNow -lt $deadline)
 if($addresses.Count -ne 1){throw "Expected one visible Chrome address bar after opening a new tab; found $($addresses.Count)"}
 $focused=[Windows.Automation.AutomationElement]::FocusedElement
 if($null -eq $focused -or -not [Windows.Automation.Automation]::Compare($focused,$addresses[0])){throw 'Chrome new-tab address bar did not receive focus; profile navigation stopped'}
 [Windows.Forms.SendKeys]::SendWait('^v');[Windows.Forms.SendKeys]::SendWait('{ENTER}')
 $deadline=[DateTime]::UtcNow.AddSeconds(10)
 do { try { Assert-FacebookProfileAddress $w;break } catch { Start-Sleep -Milliseconds 200 } } while([DateTime]::UtcNow -lt $deadline)
 Assert-FacebookProfileAddress $w
 Wait-FacebookProfileReady $w
 $afterTabs=@(Get-FacebookVisibleTabSnapshot $w)
 [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;openedNewTab=$true;profileUrl=$script:FacebookProfileUrl;selectedTabBefore=@($selectedBefore);visibleTabsBefore=@($beforeTabs|Select-Object -ExpandProperty name);visibleTabsAfter=@($afterTabs|Select-Object -ExpandProperty name);windowBounds=(Set-FacebookStableWindowBounds $w)}
}
function Close-FacebookDuplicateProfileTabNative([long]$WindowId=0) {
 if($WindowId -le 0){throw 'CloseDuplicateProfileTab requires a fresh explicit WindowId'}
 $w=Get-FacebookChromeWindow $WindowId
 Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w
 $profileTabs=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem -and (Test-FacebookTabName $_.Current.Name)})
 if($profileTabs.Count -ne 2){throw "Expected exactly two visible Facebook profile tabs; found $($profileTabs.Count)"}
 $ownedTab=$profileTabs[-1];$selection=$null
 if(-not $ownedTab.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$selection)){throw 'Newest trace-identified Facebook tab has no SelectionItemPattern'}
 $selection.Select();Start-Sleep -Milliseconds 150
 $facebookTabs=@((Get-FacebookVisibleTabSnapshot $w)|Where-Object{Test-FacebookTabName $_.name});$selected=@($facebookTabs|Where-Object{$_.selected})
 if($facebookTabs.Count -ne 2 -or $selected.Count -ne 1 -or -not $facebookTabs[-1].selected){throw 'Trace-identified newest Facebook profile tab did not become the unique selected tab'}
 Assert-FacebookProfileAddress $w;Assert-FacebookAccountMarker $w
 $readiness=Get-FacebookExistingComposerReadiness $w
 if($readiness.state -cne 'wait'){throw "Refusing to close selected Facebook tab while a composer exists (state '$($readiness.state)')"}
 Assert-FacebookForeground $w
 $freshFacebookTabs=@((Get-FacebookVisibleTabSnapshot $w)|Where-Object{Test-FacebookTabName $_.name});$freshSelected=@($freshFacebookTabs|Where-Object{$_.selected})
 if($freshFacebookTabs.Count -ne 2 -or $freshSelected.Count -ne 1 -or -not $freshFacebookTabs[-1].selected){throw 'Trace-identified Facebook tab selection changed before the one close action; stopped'}
 Assert-FacebookProfileAddress $w;Assert-FacebookAccountMarker $w
 [Windows.Forms.SendKeys]::SendWait('^w')
 $deadline=[DateTime]::UtcNow.AddSeconds(5);do{$afterFacebookTabs=@((Get-FacebookVisibleTabSnapshot $w)|Where-Object{Test-FacebookTabName $_.name});if($afterFacebookTabs.Count -eq 1){break};Start-Sleep -Milliseconds 150}while([DateTime]::UtcNow -lt $deadline)
 if($afterFacebookTabs.Count -ne 1){throw "Expected exactly one Facebook profile tab after closing the selected duplicate; found $($afterFacebookTabs.Count)"}
 if(-not (Select-FacebookProfileTab $w)){throw 'Remaining original Facebook profile tab could not be selected'}
 $afterFacebookTabs=@((Get-FacebookVisibleTabSnapshot $w)|Where-Object{Test-FacebookTabName $_.name})
 $afterSelected=@($afterFacebookTabs|Where-Object{$_.selected})
 if($afterFacebookTabs.Count -ne 1 -or $afterSelected.Count -ne 1){throw 'Remaining Facebook profile tab is not the unique selected tab'}
 Assert-FacebookProfileAddress $w;Assert-FacebookAccountMarker $w
 [pscustomobject]@{status='closed_selected_duplicate_profile_tab';windowId=$WindowId;remainingFacebookTabs=@($afterFacebookTabs|Select-Object -ExpandProperty name);remainingSelectedTab=$afterSelected[0].name}
}
function Get-FacebookVisibleComposerButton($Window) { $names=@("What's on your mind?",'무슨 생각을 하고 계신가요?');$all=@((Get-FacebookUiAll $Window)|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -in $names});if($all.Count -ne 1){throw "Expected one exact Facebook composer button; found $($all.Count)"};if($all[0].Current.IsOffscreen){$scrollItem=$null;if(-not $all[0].TryGetCurrentPattern([Windows.Automation.ScrollItemPattern]::Pattern,[ref]$scrollItem)){throw 'Exact offscreen composer button has no ScrollItemPattern'};$scrollItem.ScrollIntoView();Start-Sleep -Milliseconds 150};$fresh=Find-FacebookUi -Names $names -ControlType 'Button' -Window $Window;$bounds=$fresh.Current.BoundingRectangle;if($bounds.IsEmpty -or $bounds.Width -lt 2 -or $bounds.Height -lt 2){throw 'Exact Facebook composer button has no usable visible frame'};$fresh }
function Invoke-FacebookComposerButton($Button,$Window) { Assert-FacebookForeground $Window;$layout=Set-FacebookStableWindowBounds $Window;$name=$Button.Current.Name;$fresh=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -ceq $name});if($fresh.Count -ne 1){throw 'UI composer button changed before semantic invoke; input stopped'};if(-not (Test-FacebookVisiblePostingIdentity $Window)){throw 'Expected visible Facebook posting identity is absent; semantic composer invoke stopped'};$bounds=$fresh[0].Current.BoundingRectangle;if($bounds.IsEmpty -or $bounds.Width -lt 2 -or $bounds.Height -lt 2){throw 'Composer button has no usable visible frame; semantic invoke stopped'};$invoke=$null;if(-not $fresh[0].TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){throw 'Exact composer button has no InvokePattern'};Assert-FacebookForeground $Window;$invoke.Invoke();Start-Sleep -Milliseconds 200;[pscustomobject]@{semanticInvoke=$true;x=[int][math]::Floor($bounds.X+($bounds.Width/2));y=[int][math]::Floor($bounds.Y+($bounds.Height/2));windowBounds=$layout} }
function Resolve-FacebookComposerReadiness($Candidates) { $items=@($Candidates);if($items.Count -eq 0){return [pscustomobject]@{state='wait'}};if($items.Count -ne 1){throw "Expected at most one exact existing composer; found $($items.Count)"};$item=$items[0];if(-not $item.isEmpty -or $item.attachmentCount -ne 0 -or $item.authorCount -ne 1 -or $item.friendsCount -ne 1){throw 'Existing composer is not the exact empty Friends composer'};[pscustomobject]@{state='reuse_empty';candidate=$item} }
function Get-FacebookExistingComposerReadiness($Window) { $names=@("What's on your mind?",'무슨 생각을 하고 계신가요?');$editors=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $names});$candidates=@(foreach($editor in $editors){$dialog=Get-FacebookComposerDialog $Window;$all=@(Get-FacebookUiAll $dialog);[pscustomobject]@{dialog=$dialog;isEmpty=[string]::IsNullOrWhiteSpace((Normalize-FacebookText (Get-FacebookValue $editor)));attachmentCount=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -in @('Remove post attachment','게시물 첨부 파일 제거')}).Count;authorCount=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -ceq 'Hyun Uk Jung'}).Count;friendsCount=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -match '^Edit privacy\. Sharing with Your friends\.\s*$'}).Count}});Resolve-FacebookComposerReadiness $candidates }
function Open-FacebookComposerNative([long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Wait-FacebookProfileReady $w;Assert-FacebookForeground $w;$readiness=Get-FacebookExistingComposerReadiness $w;if($readiness.state -ceq 'reuse_empty'){return [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;windowBounds=(Set-FacebookStableWindowBounds $w);reusedEmptyComposer=$true;composerCoordinate=$null}};$button=Get-FacebookVisibleComposerButton $w;Assert-FacebookForeground $w;$click=Invoke-FacebookComposerButton $button $w;$deadline=[DateTime]::UtcNow.AddSeconds(10);do{$readiness=Get-FacebookExistingComposerReadiness $w;if($readiness.state -ceq 'reuse_empty'){return [pscustomobject]@{windowId=$w.Current.NativeWindowHandle;processId=$w.Current.ProcessId;windowBounds=(Set-FacebookStableWindowBounds $w);reusedEmptyComposer=$false;composerCoordinate=$click}};Start-Sleep -Milliseconds 200}while([DateTime]::UtcNow -lt $deadline);throw 'Exact empty Facebook composer did not become ready after one composer click' }
function Get-FacebookComposerDialog($Window) {
  # "Create post" also names nested headings.  The editor is the durable anchor.
  $editorNames=@("What's on your mind?",'무슨 생각을 하고 계신가요?')
  $editors=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in $editorNames})
  if($editors.Count -ne 1){throw "Expected one exact composer editor; found $($editors.Count)"}
  $walker=[Windows.Automation.TreeWalker]::ControlViewWalker;$node=$editors[0]
  while($null -ne $node){$node=$walker.GetParent($node);if($null -ne $node -and $node.Current.ControlType -eq [Windows.Automation.ControlType]::Window -and $node.Current.Name -in @('Create post','게시물 만들기')){return $node}}
  throw 'Exact composer editor has no Create post dialog ancestor'
}
function Get-FacebookComposerEditor($Window) { $dialog=Get-FacebookComposerDialog $Window;$hits=@((Get-FacebookUiAll $dialog)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in @("What's on your mind?",'무슨 생각을 하고 계신가요?')});if($hits.Count -ne 1){throw "Expected one exact composer Edit; found $($hits.Count)"};$hits[0] }
function Set-FacebookComposerTextNative([string]$Text,[long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w;$e=Get-FacebookComposerEditor $w;$existing=Get-FacebookValue $e;if(-not [string]::IsNullOrWhiteSpace((Normalize-FacebookText $existing)) -and (Normalize-FacebookText $existing) -cne (Normalize-FacebookText $Text)){throw 'Composer has unknown existing text; refusing to append or replace it'};if((Normalize-FacebookText $existing) -ceq (Normalize-FacebookText $Text)){return};$e.SetFocus();Start-Sleep -Milliseconds 50;$focused=[Windows.Automation.AutomationElement]::FocusedElement;if($null -eq $focused -or -not [Windows.Automation.Automation]::Compare($focused,$e)){throw 'Composer editor did not receive focus; select-all/paste stopped'};[Windows.Forms.Clipboard]::SetText($Text);[Windows.Forms.SendKeys]::SendWait('^a');[Windows.Forms.SendKeys]::SendWait('^v');Start-Sleep -Milliseconds 250;if((Normalize-FacebookText (Get-FacebookValue $e)) -cne (Normalize-FacebookText $Text)){throw 'Focused composer did not retain exact select-all/pasted text'} }
function Get-FacebookOpenDialog($ChromeWindow) { $dialogs=@((Get-FacebookUiAll $ChromeWindow)|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Window -and $_.Current.Name -in @('Open','열기') -and (Get-Process -Id $_.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -eq 'chrome'});if($dialogs.Count -ne 1){throw "Expected one Chrome-owned Open window descendant; found $($dialogs.Count)"};$dialogs[0] }
function Set-FacebookNativeOpenDialogPath([string]$ImagePath,$ChromeWindow) { Assert-FacebookImagePath $ImagePath;$ImagePath=Resolve-FacebookAttachmentPath $ImagePath;$d=Get-FacebookOpenDialog $ChromeWindow;$edit=@((Get-FacebookUiAll $d)|Where-Object{$_.Current.AutomationId -eq '1148' -and $_.Current.ClassName -eq 'Edit'});if($edit.Count -ne 1){throw "Expected one native filename Edit AutomationId 1148/ClassName Edit; found $($edit.Count)"};$h=[IntPtr]$edit[0].Current.NativeWindowHandle;if($h -eq [IntPtr]::Zero){throw 'Native filename Edit has no HWND'};$full=[IO.Path]::GetFullPath($ImagePath);if(-not [FacebookPostingNative]::WriteText($h,$full)){throw 'WM_SETTEXT failed'};$read=[FacebookPostingNative]::ReadText($h);if($read -cne $full){throw 'WM_GETTEXT did not confirm exact native file path'};[pscustomobject]@{dialogWindowId=$d.Current.NativeWindowHandle;dialogProcessId=$d.Current.ProcessId;fileEditWindowId=$edit[0].Current.NativeWindowHandle;imagePath=$full} }
function Set-FacebookNativeOpenDialogPathForWindow([string]$ImagePath,[long]$WindowId) { $w=Get-FacebookChromeWindow $WindowId; Set-FacebookNativeOpenDialogPath $ImagePath $w }
function Invoke-FacebookOrca([string[]]$Arguments) {
  $exe=if($env:ORCA_CLI_COMMAND){$env:ORCA_CLI_COMMAND}else{'orca'}
  $raw=& $exe @Arguments 2>&1
  if($LASTEXITCODE -ne 0){throw "Orca command failed: $($raw -join "`n")"}
  try{$json=($raw -join "`n")|ConvertFrom-Json}catch{throw 'Orca command did not return JSON'}
  if($json.PSObject.Properties.Name -contains 'ok' -and -not $json.ok){throw 'Orca reported ok=false'}
  $json
}
function Get-FacebookNativeTreeToken($Element) { switch ($Element.Current.ControlType.ProgrammaticName) { 'ControlType.Window' {'dialog';break};'ControlType.Text' {if($Element.Current.LocalizedControlType -match 'heading|제목'){'heading'}else{'text'};break};'ControlType.Edit' {'edit';break};'ControlType.Image' {'graphic';break};'ControlType.Hyperlink' {'link';break};'ControlType.Button' {'button';break};'ControlType.Pane' {'pane';break};default{'group'} } }
function Add-FacebookNativeTreeNode($Node,[int]$Depth,$Lines,[ref]$Index,[ref]$Count) { if($Count.Value -ge 5000){throw 'Native UIA tree exceeds 5000 controls'};$Count.Value++;$token=Get-FacebookNativeTreeToken $Node;$name=([string]$Node.Current.Name -replace '\s+',' ').Trim();$value=if($token -in @('edit','link')){([string](Get-FacebookValue $Node) -replace '\s+',' ').Trim()}else{''};$line=(' ' * $Depth)+$Index.Value+' '+$token;if($name){$line+=' '+$name};if($value){$line+=', Value: '+$value};$Lines.Add($line)|Out-Null;$Index.Value++;$walker=[Windows.Automation.TreeWalker]::ControlViewWalker;$child=$walker.GetFirstChild($Node);while($null -ne $child){Add-FacebookNativeTreeNode $child ($Depth+2) $Lines $Index $Count;$child=$walker.GetNextSibling($child)} }
function Get-FacebookNativeTree($Window) { $lines=New-Object 'System.Collections.Generic.List[string]';$index=0;$count=0;Add-FacebookNativeTreeNode $Window 0 $lines ([ref]$index) ([ref]$count);$tree=$lines -join "`n";if([string]::IsNullOrWhiteSpace($tree)){throw 'Fresh native UIA tree is empty'};$tree }
function Get-FacebookOrcaTree { [CmdletBinding()] param([Parameter(Mandatory=$true)][long]$ProcessId,[Parameter(Mandatory=$true)][long]$WindowId) $window=Get-FacebookChromeWindow $WindowId;if($window.Current.ProcessId -ne $ProcessId){throw 'Supplied Facebook PID does not own the exact Chrome WindowId'};[pscustomobject]@{state=$null;tree=(Get-FacebookNativeTree $window);source='native_uia'} }
function Invoke-FacebookNativeOpenButton($ChromeWindow) { $dialog=Get-FacebookOpenDialog $ChromeWindow;$buttons=@((Get-FacebookUiAll $dialog)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.AutomationId -eq '1' -and $_.Current.Name -in @('Open','열기(O)')});if($buttons.Count -ne 1){throw "Expected one exact native Open button AutomationId 1; found $($buttons.Count)"};$invoke=$null;if(-not $buttons[0].TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){throw 'Exact native Open button has no InvokePattern'};$invoke.Invoke() }
function Complete-FacebookNativeOpenDialog([string]$ImagePath,[long]$WindowId,[string]$OrcaAppId) {
  $before=Get-FacebookDraftNative $WindowId;if($before.attachmentCount -ne 0){throw 'Composer already has an attachment; refusing a second native file selection'}
  $proof=Set-FacebookNativeOpenDialogPathForWindow $ImagePath $WindowId
  $parent=Get-FacebookChromeWindow $WindowId;$snapshot=Get-FacebookOrcaTree $parent.Current.ProcessId $WindowId
  if($snapshot.source -ceq 'native_uia'){Invoke-FacebookNativeOpenButton $parent}else{$match=[regex]::Match($snapshot.tree,'(?m)^\s*(\d+)\s+pane\s+열기\(O\)\s*$');if(-not $match.Success){throw 'Fresh Orca tree has no unique pane 열기(O); no click sent'};$index=[int]$match.Groups[1].Value;$null=Invoke-FacebookOrca @('computer','click','--app',('pid:'+$parent.Current.ProcessId),'--window-id',$WindowId,'--element-index',$index,'--json')}
  $deadline=[DateTime]::UtcNow.AddSeconds(30)
  do { try{$after=Get-FacebookDraftNative $WindowId;if($after.attachmentCount -eq 1){return $proof}}catch{};Start-Sleep -Milliseconds 300 } while([DateTime]::UtcNow -lt $deadline)
  throw 'Native file path proof did not produce exactly one composer attachment'
}
function Attach-FacebookImageNative([string]$ImagePath,[long]$WindowId=0,[string]$OrcaAppId) {
  $w=Get-FacebookChromeWindow $WindowId
  Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w
  $kPhoto=([char]49324).ToString()+([char]51652).ToString()+'/'+([char]46041).ToString()+([char]50689).ToString()+([char]49345).ToString()
  [string[]]$photoNames = 'Photo/video',$kPhoto
  $photo=Find-FacebookUi -Names $photoNames -ControlType Button -Window $w
  $photoCoordinate=Invoke-FacebookUiClick $photo $w
  $deadline=[DateTime]::UtcNow.AddSeconds(10)
  do { try { $proof=Complete-FacebookNativeOpenDialog $ImagePath $WindowId $OrcaAppId;$proof | Add-Member -Force -NotePropertyName photoCoordinate -NotePropertyValue $photoCoordinate;return $proof } catch { if($_.Exception.Message -notmatch 'Chrome-owned Open window descendant'){throw};Start-Sleep -Milliseconds 250 } } while([DateTime]::UtcNow -lt $deadline)
  throw 'Native Open dialog did not appear'
}
function Get-FacebookDraftEvidenceNative($Window) { $dialog=Get-FacebookComposerDialog $Window;$e=Get-FacebookComposerEditor $Window;$all=Get-FacebookUiAll $dialog;$attachments=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -in @('Remove post attachment','게시물 첨부 파일 제거')}).Count;$privacy=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -match '^Edit privacy\. Sharing with Your friends\.\s*$'}).Count;$authors=@($all|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -ceq 'Hyun Uk Jung'}).Count;[pscustomobject]@{text=(Get-FacebookValue $e);attachmentCount=$attachments;audience=if($privacy -eq 1){'Friends'}else{'unknown'};authorCount=$authors} }
function Get-FacebookDraftNative([long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Get-FacebookDraftEvidenceNative $w|Select-Object text,attachmentCount,audience }
function Resume-FacebookOwnDraftNative([string]$ExpectedText,[long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;$confirm=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Window -and $_.Current.Name -in @('Save this post as a draft?','게시물을 임시 저장하시겠어요?')});if($confirm.Count -ne 1){throw "Expected one exact Save this post as a draft confirmation; found $($confirm.Count)"};$close=Get-FacebookScopedButton $confirm[0] @('Close','닫기');$invoke=$null;if(-not $close.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern,[ref]$invoke)){throw 'Exact draft confirmation Close has no InvokePattern'};$invoke.Invoke();Start-Sleep -Milliseconds 200;$deadline=[DateTime]::UtcNow.AddSeconds(5);do{try{$draft=Get-FacebookDraftEvidenceNative $w;if((Normalize-FacebookText $draft.text) -ceq (Normalize-FacebookText $ExpectedText) -and $draft.attachmentCount -eq 1 -and $draft.audience -ceq 'Friends' -and $draft.authorCount -eq 1){return [pscustomobject]@{status='resumed_exact_own_draft';windowId=$w.Current.NativeWindowHandle}};throw 'Resumed composer does not match exact frozen text, author, Friends audience, and one attachment'}catch{if($_.Exception.Message -notmatch 'Expected one exact composer'){throw}};Start-Sleep -Milliseconds 150}while([DateTime]::UtcNow -lt $deadline);throw 'Exact own composer did not return after closing only the draft confirmation' }
function Invoke-FacebookPublishNative([long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w;$postNames=@('Post','게시');$post=Find-FacebookUi -Names $postNames -ControlType 'Button' -Window $w;Assert-FacebookForeground $w;Invoke-FacebookUiClick $post $w }
function Get-FacebookScopedButton($Root,[string[]]$Names) { $hits=@((Get-FacebookUiAll $Root)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -in $Names});if($hits.Count -ne 1){throw "Expected one scoped button [$($Names -join ', ')]; found $($hits.Count)"};$hits[0] }
function Close-FacebookPostNative([long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w;$post=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Window -and $_.Current.Name -eq "Hyun Uk Jung's Post"});if($post.Count -ne 1){throw "Expected one exact Hyun Uk Jung's Post dialog; found $($post.Count)"};Invoke-FacebookUiClick (Get-FacebookScopedButton $post[0] @('Close','닫기')) $w }
function Cancel-FacebookOwnDraftNative([string]$ExpectedText,[string]$ExpectedFileName,[long]$WindowId=0) { $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Assert-FacebookForeground $w;$draft=Get-FacebookDraftNative $WindowId;if((Normalize-FacebookText $draft.text) -cne (Normalize-FacebookText $ExpectedText) -or $draft.attachmentCount -ne 1 -or $draft.audience -cne 'Friends'){throw 'Unknown/noncanonical draft is never cancelled'};$dialog=Get-FacebookComposerDialog $w;$filename=@((Get-FacebookUiAll $dialog)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.Name -match [regex]::Escape($ExpectedFileName)});if($filename.Count -ne 1){throw 'Exact frozen attachment filename is required before cancelling'};Assert-FacebookForeground $w;$close=Get-FacebookScopedButton $dialog @('Close composer dialog','작성 창 닫기');Invoke-FacebookUiClick $close $w;Start-Sleep -Milliseconds 200;$discard=Get-FacebookScopedButton $w @('Discard','삭제');Invoke-FacebookUiClick $discard $w }
function Test-FacebookFeedPostScope($Post,[string]$ExpectedText) {
 $items=@(Get-FacebookUiAll $Post)
 $authors=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -ceq 'Hyun Uk Jung' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:[/?]|$)'})
 if($authors.Count -lt 1){return $false}
 $audiences=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Text -and $_.Current.Name -ceq 'Shared with Your friends'})
 $friends=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Image -and $_.Current.Name -ceq 'Friends'})
 if($audiences.Count -ne 1 -or $friends.Count -ne 1){return $false}
 $photos=@($items|Where-Object{(Get-FacebookValue $_) -match '^https://www\.facebook\.com/photo/\?fbid='})
 if($photos.Count -ne 1){return $false}
 $expected=@($ExpectedText -split "`r?`n")
 $cursor=0
 foreach($line in $expected){$needle=Normalize-FacebookText $line;$found=$false;for($i=$cursor;$i -lt $items.Count;$i++){$name=Normalize-FacebookText ([string]$items[$i].Current.Name);$value=[string](Get-FacebookValue $items[$i]);if($line -match '^https?://'){$matches=Test-FacebookCampaignUrl $value $line}else{$matches=$name.Contains($needle)};if($matches){$cursor=$i+1;$found=$true;break}};if(-not $found){return $false}}
 $true
}
function Test-FacebookFeedPostPrefixScope($Post,[string]$ExpectedText) {
 $items=@(Get-FacebookUiAll $Post)
 $authors=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -ceq 'Hyun Uk Jung' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:[/?]|$)'})
 $audiences=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Text -and $_.Current.Name -ceq 'Shared with Your friends'})
 $friends=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Image -and $_.Current.Name -ceq 'Friends'})
 $photos=@($items|Where-Object{(Get-FacebookValue $_) -match '^https://www\.facebook\.com/photo/\?fbid='})
 $seeMore=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -ceq 'See more'})
 $firstLine=Normalize-FacebookText (($ExpectedText -split "`r?`n")[0])
 $body=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Text -and (Normalize-FacebookText $_.Current.Name) -ceq $firstLine})
 return $authors.Count -ge 1 -and $audiences.Count -eq 1 -and $friends.Count -eq 1 -and $photos.Count -eq 1 -and $seeMore.Count -eq 1 -and $body.Count -eq 1
}
function Test-FacebookFeedPostVisibleShortScope($Post,[string]$ExpectedText) {
 $items=@(Get-FacebookUiAll $Post)
 $authors=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -ceq 'Hyun Uk Jung' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:[/?]|$)'})
 $audiences=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Text -and $_.Current.Name -ceq 'Shared with Your friends'})
 $friends=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Image -and $_.Current.Name -ceq 'Friends'})
 $photos=@($items|Where-Object{(Get-FacebookValue $_) -match '^https://www\.facebook\.com/photo/\?fbid='})
 $seeMore=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -ceq 'See more'})
 if($authors.Count -lt 1 -or $audiences.Count -ne 1 -or $friends.Count -ne 1 -or $photos.Count -ne 1 -or $seeMore.Count -ne 0){return $false}
 $expected=@($ExpectedText -split "`r?`n");$cursor=0
 foreach($line in $expected){$needle=Normalize-FacebookText $line;$found=$false;for($i=$cursor;$i -lt $items.Count;$i++){$name=Normalize-FacebookText ([string]$items[$i].Current.Name);$value=Normalize-FacebookText ([string](Get-FacebookValue $items[$i]));if($line -match '^https?://'){$matches=(Test-FacebookCampaignUrl $value $line) -or (Test-FacebookCampaignUrl $name $line)}else{$matches=$name.Contains($needle) -or $value.Contains($needle)};if($matches){$cursor=$i+1;$found=$true;break}};if(-not $found){return $false}}
 $true
}
function Get-FacebookFeedMatchedLineCount($Items,[string]$ExpectedText) {
 $expected=@($ExpectedText -split "`r?`n");$cursor=0;$count=0
 foreach($line in $expected){$needle=Normalize-FacebookText $line;$found=$false;for($i=$cursor;$i -lt $Items.Count;$i++){$name=Normalize-FacebookText ([string]$Items[$i].Current.Name);$value=Normalize-FacebookText ([string](Get-FacebookValue $Items[$i]));if($line -match '^https?://'){$matches=(Test-FacebookCampaignUrl $value $line) -or (Test-FacebookCampaignUrl $name $line)}else{$matches=$name.Contains($needle) -or $value.Contains($needle)};if($matches){$cursor=$i+1;$count++;$found=$true;break}};if(-not $found){break}}
 $count
}
function Get-FacebookFeedCandidateDiagnostics([string]$ExpectedText,$Window) {
 $loadedLinks=@((Get-FacebookUiAll $Window)|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -match '^(?:a few seconds ago|about a minute ago|\d+\s+(?:seconds?|minutes?|hours?|days?)\s+ago)$' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:/posts/[^?]+(?:\?|$)|/\?.*#\?)'})
 $links=@($loadedLinks|Where-Object{-not $_.Current.IsOffscreen})
 $expectedLineCount=@($ExpectedText -split "`r?`n").Count;$rows=@()
 foreach($link in $loadedLinks){$post=$link;for($depth=0;$depth -lt 8;$depth++){$post=[Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($post);if($null -eq $post){break};$items=@(Get-FacebookUiAll $post);$authors=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -ceq 'Hyun Uk Jung' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:[/?]|$)'});$audiences=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Text -and $_.Current.Name -ceq 'Shared with Your friends'});$friends=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Image -and $_.Current.Name -ceq 'Friends'});$photos=@($items|Where-Object{(Get-FacebookValue $_) -match '^https://www\.facebook\.com/photo/\?fbid='});$seeMore=@($items|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Button -and $_.Current.Name -ceq 'See more'});$rows+=[pscustomobject]@{timestamp=$link.Current.Name;timestampUrl=(Get-FacebookValue $link);isOffscreen=$link.Current.IsOffscreen;depth=$depth;authorCount=$authors.Count;audienceCount=$audiences.Count;friendsCount=$friends.Count;photoCount=$photos.Count;seeMoreCount=$seeMore.Count;matchedLineCount=(Get-FacebookFeedMatchedLineCount $items $ExpectedText);expectedLineCount=$expectedLineCount;fullScope=(Test-FacebookFeedPostScope $post $ExpectedText);visibleShortScope=(Test-FacebookFeedPostVisibleShortScope $post $ExpectedText);collapsedPrefixScope=(Test-FacebookFeedPostPrefixScope $post $ExpectedText)}}}
 $addresses=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in @('Address and search bar','주소창 및 검색창')}|ForEach-Object{Get-FacebookValue $_})
 $tabs=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::TabItem}|ForEach-Object{[pscustomobject]@{name=$_.Current.Name;selected=(Get-FacebookTabSelected $_)}})
 $timestampTargets=@($loadedLinks|ForEach-Object{$rect=$_.Current.BoundingRectangle;[pscustomobject]@{name=$_.Current.Name;url=(Get-FacebookValue $_);isOffscreen=$_.Current.IsOffscreen;left=$rect.X;top=$rect.Y;width=$rect.Width;height=$rect.Height}})
 [pscustomobject]@{windowId=$Window.Current.NativeWindowHandle;processId=$Window.Current.ProcessId;windowTitle=$Window.Current.Name;addressValues=@($addresses);tabs=@($tabs);loadedTimestampCount=$loadedLinks.Count;visibleTimestampCount=$links.Count;candidateCount=$links.Count;timestampTargets=@($timestampTargets);expectedLineCount=$expectedLineCount;candidates=@($rows)}
}
function Bring-FacebookUiTargetIntoView($Element,$Window) {
 $controlType=$Element.Current.ControlType;$name=$Element.Current.Name;$value=Get-FacebookValue $Element
 $find={@((Get-FacebookUiAll $Window)|Where-Object{$_.Current.ControlType -eq $controlType -and $_.Current.Name -ceq $name -and ([string]::IsNullOrWhiteSpace($value) -or (Get-FacebookValue $_) -ceq $value)})}
 $fresh=@(& $find)
 if($fresh.Count -ne 1){throw 'Exact matched feed timestamp is not uniquely present before controlled scroll'}
 if(-not $fresh[0].Current.IsOffscreen){return $fresh[0]}
 $scrollItem=$null
 if(-not $fresh[0].TryGetCurrentPattern([Windows.Automation.ScrollItemPattern]::Pattern,[ref]$scrollItem)){throw 'Exact matched offscreen feed timestamp has no ScrollItemPattern; coordinate scrolling is forbidden'}
 $scrollItem.ScrollIntoView();Start-Sleep -Milliseconds 250
 $visible=@((& $find)|Where-Object{-not $_.Current.IsOffscreen})
 if($visible.Count -ne 1){throw 'Exact matched feed timestamp did not become uniquely visible after controlled scroll'}
 $visible[0]
}
function Assert-FacebookExactVisibleFeedPostScope($Timestamp,[string]$ExpectedText) {
 $post=$Timestamp
 for($depth=0;$depth -lt 8;$depth++) {
  $post=[Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($post)
  if($null -eq $post){break}
  if((Test-FacebookFeedPostScope $post $ExpectedText) -or (Test-FacebookFeedPostVisibleShortScope $post $ExpectedText)){return $post}
 }
 throw 'Exact feed post no longer matches its frozen text and one-photo scope after controlled scroll'
}
function Wait-FacebookStableUiTarget($Element,$Window,[int]$DelayMilliseconds=350) {
 $controlType=$Element.Current.ControlType;$name=$Element.Current.Name
 $first=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq $controlType -and $_.Current.Name -ceq $name})
 if($first.Count -ne 1){throw 'Exact feed target is not uniquely present for the first stability read'}
 $firstBounds=$first[0].Current.BoundingRectangle
 if($firstBounds.IsEmpty -or $firstBounds.Width -lt 2 -or $firstBounds.Height -lt 2){throw 'Exact feed target has no usable first stability frame'}
 Start-Sleep -Milliseconds $DelayMilliseconds
 $second=@((Get-FacebookUiAll $Window)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.IsEnabled -and $_.Current.ControlType -eq $controlType -and $_.Current.Name -ceq $name})
 if($second.Count -ne 1){throw 'Exact feed target changed during the bounded stability wait'}
 $secondBounds=$second[0].Current.BoundingRectangle
 if($secondBounds.IsEmpty -or $secondBounds.X -ne $firstBounds.X -or $secondBounds.Y -ne $firstBounds.Y -or $secondBounds.Width -ne $firstBounds.Width -or $secondBounds.Height -ne $firstBounds.Height){throw 'Exact feed target frame changed during the bounded stability wait'}
 $second[0]
}
function Open-FacebookNewestPostNative([string]$ExpectedText,[string]$ExpectedFileName,[long]$WindowId=0) {
 # The Chrome HWND can stay the same while another worker selects an X tab.  Re-select and
 # prove the fixed Facebook profile before reading/clicking a timestamp in its feed.
 Open-FacebookProfileNative $WindowId -ForceReload|Out-Null
 $w=Get-FacebookChromeWindow $WindowId;Focus-FacebookChromeWindow $w;Wait-FacebookProfileReady $w;Assert-FacebookForeground $w
 $feedDeadline=[DateTime]::UtcNow.AddSeconds(10);$expanded=$false
 do {$links=@((Get-FacebookUiAll $w)|Where-Object{$_.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink -and $_.Current.Name -match '^(?:a few seconds ago|about a minute ago|\d+\s+(?:seconds?|minutes?|hours?|days?)\s+ago)$' -and (Get-FacebookValue $_) -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:/posts/[^?]+(?:\?|$)|/\?.*#\?)'});$matches=@();$prefixes=@();foreach($link in $links){$post=$link;for($depth=0;$depth -lt 8;$depth++){$post=[Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($post);if($null -eq $post){break};if((Test-FacebookFeedPostScope $post $ExpectedText) -or (Test-FacebookFeedPostVisibleShortScope $post $ExpectedText)){$matches+=[pscustomobject]@{link=$link;post=$post};break};if(-not $expanded -and (Test-FacebookFeedPostPrefixScope $post $ExpectedText)){$prefixes+=[pscustomobject]@{link=$link;post=$post};break}}};if($matches.Count -gt 1){throw "Expected one visible own feed post with exact ordered copy and one photo; found $($matches.Count)"};if($matches.Count -eq 1){break};if($prefixes.Count -gt 1){throw "Expected one collapsed own feed post with exact prefix; found $($prefixes.Count)"};if($prefixes.Count -eq 1){$visiblePrefix=Bring-FacebookUiTargetIntoView $prefixes[0].link $w;Invoke-FacebookUiClick (Get-FacebookScopedButton $prefixes[0].post @('See more')) $w;$expanded=$true};Start-Sleep -Milliseconds 200} while([DateTime]::UtcNow -lt $feedDeadline)
 if($matches.Count -ne 1){throw 'No visible exact own feed post appeared within 10 seconds'}
 $visibleTimestamp=Bring-FacebookUiTargetIntoView $matches[0].link $w
 Assert-FacebookExactVisibleFeedPostScope $visibleTimestamp $ExpectedText|Out-Null
 $stableTimestamp=Wait-FacebookStableUiTarget $visibleTimestamp $w 350
 Invoke-FacebookUiClick $stableTimestamp $w
 $deadline=[DateTime]::UtcNow.AddSeconds(5)
 do {$urls=@((Get-FacebookUiAll $w)|Where-Object{!$_.Current.IsOffscreen -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit -and $_.Current.Name -in @('Address and search bar','주소창 및 검색창')}|ForEach-Object{Get-FacebookValue $_}|Where-Object{$_ -match '^(?:https?://)?(?:www\.)?facebook\.com/hyunuk\.jung\.56/posts/'});if($urls.Count -eq 1){return ($urls[0] -replace '^(?:https?://)?(?:www\.)?facebook\.com','https://www.facebook.com')};Start-Sleep -Milliseconds 150} while([DateTime]::UtcNow -lt $deadline)
 throw 'Timestamp click did not expose one fresh canonical /posts/ address'
}
