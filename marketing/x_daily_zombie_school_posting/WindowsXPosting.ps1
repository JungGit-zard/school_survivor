# Native desktop UI only. No browser protocol, page scripting, or HTTP transport.
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing
if (-not ('XPostingNative' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class XPostingNative {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
}
function Get-XRoot { return [Windows.Automation.AutomationElement]::FromHandle([IntPtr]$script:XWindow) }
function Get-XElements($Root = (Get-XRoot)) { return $Root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) }
function Find-XControl([string]$Name, [string]$Type = '', $Root = (Get-XRoot)) {
  $found = @((Get-XElements $Root) | Where-Object { $_.Current.Name -ceq $Name -and -not $_.Current.IsOffscreen -and ($Type -eq '' -or $_.Current.ControlType.ProgrammaticName -eq ('ControlType.' + $Type)) })
  if ($found.Count -ne 1) { throw "Expected one visible $Type '$Name'; found $($found.Count)" }
  return $found[0]
}
function Get-XValue($Element) {
  $pattern = $null
  if ($Element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) { return $pattern.Current.Value }
  if ($Element.TryGetCurrentPattern([Windows.Automation.TextPattern]::Pattern, [ref]$pattern)) { return $pattern.DocumentRange.GetText(-1) }
  return ''
}
function Assert-XForeground {
  $foreground = [XPostingNative]::GetForegroundWindow()
  if ($foreground.ToInt64() -ne $script:XWindow) {
    $title = ''
    try { $title = [Windows.Automation.AutomationElement]::FromHandle($foreground).Current.Name } catch { }
    throw "Desktop focus changed to HWND $($foreground.ToInt64()) '$title'; no input sent"
  }
}
function Click-XElement($Element) {
  Assert-XForeground
  if (-not $Element.Current.IsEnabled -or $Element.Current.IsOffscreen) { throw 'Target is disabled or offscreen' }
  $rect = $Element.Current.BoundingRectangle
  if ($rect.Width -le 0 -or $rect.Height -le 0) { throw 'Target has no visible rectangle' }
  [XPostingNative]::SetCursorPos([int]($rect.X + $rect.Width/2), [int]($rect.Y + $rect.Height/2)) | Out-Null
  [XPostingNative]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
  [XPostingNative]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
}
function Send-XKeys([string]$Keys) { Assert-XForeground; [Windows.Forms.SendKeys]::SendWait($Keys) }
function Wait-XCondition([scriptblock]$Condition, [string]$Description, [int]$Seconds = 20) {
  $end = [DateTime]::UtcNow.AddSeconds($Seconds)
  do {
    Assert-XForeground
    try { if (& $Condition) { return } } catch { }
    Start-Sleep -Milliseconds 350
  } while ([DateTime]::UtcNow -lt $end)
  throw "Timed out: $Description"
}
function Initialize-XWindow([long]$RequestedWindowId) {
  $windows = @([Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children, [Windows.Automation.Condition]::TrueCondition) | Where-Object {
    $_.Current.ClassName -eq 'Chrome_WidgetWin_1' -and $_.Current.Name -match ' / X(?: - Google Chrome)?$'
  })
  if ($RequestedWindowId) { $windows = @($windows | Where-Object { $_.Current.NativeWindowHandle -eq $RequestedWindowId }) }
  if ($windows.Count -ne 1) { throw "Expected one existing Chrome X window, found $($windows.Count). Select -WindowId." }
  $process = Get-Process -Id $windows[0].Current.ProcessId
  if ($process.ProcessName -ne 'chrome') { throw 'Target is not Chrome' }
  $script:XWindow = [long]$windows[0].Current.NativeWindowHandle
  [XPostingNative]::ShowWindow([IntPtr]$script:XWindow, 9) | Out-Null
  [XPostingNative]::SetForegroundWindow([IntPtr]$script:XWindow) | Out-Null
  Start-Sleep -Milliseconds 300
  Assert-XForeground
}
function Assert-XAccount {
  $root = Get-XRoot
  $menu = Find-XControl 'Account menu' 'Button' $root
  $names = @($menu.Current.Name) + @((Get-XElements $menu) | ForEach-Object { $_.Current.Name })
  if (-not ($names -contains '@jungsilx')) { throw 'Active Account menu does not identify @jungsilx' }
  $names = @((Get-XElements $root) | Where-Object { -not $_.Current.IsOffscreen } | ForEach-Object { $_.Current.Name })
  if (@($names | Where-Object { $_ -match '^(Sign in|Log in|Verify your identity|Use a passkey|Windows Security)$' }).Count) { throw 'Authentication dialog visible' }
}
function Navigate-X([string]$Url) {
  # One reacquisition at a navigation boundary, never between typing/clicking.
  if ([XPostingNative]::GetForegroundWindow().ToInt64() -ne $script:XWindow) {
    [XPostingNative]::SwitchToThisWindow([IntPtr]$script:XWindow, $true)
    Start-Sleep -Milliseconds 250
  }
  Assert-XForeground
  [Windows.Forms.Clipboard]::SetText($Url)
  Send-XKeys '^l'
  Send-XKeys '^v'
  Send-XKeys '{ENTER}'
  Start-Sleep -Milliseconds 1600
}
function Navigate-XProfile {
  Navigate-X 'https://x.com/jungsilx'
  Wait-XCondition { Assert-XAccount; return $true } 'X account profile'
  Wait-XCondition { @(Get-XStatusUrls).Count -gt 0 } 'profile timeline status links' 30
}
function Get-XStatusUrls {
  foreach ($element in (Get-XElements)) {
    if ($element.Current.ControlType -eq [Windows.Automation.ControlType]::Hyperlink) {
      $value = Get-XValue $element
      if ($value -match '^https://x\.com/jungsilx/status/[0-9]+$') { $value }
    }
  }
}
function Get-XAttachmentCount { return @((Get-XElements) | Where-Object { $_.Current.Name -ceq 'Remove media' -and -not $_.Current.IsOffscreen }).Count }
function Assert-XComposer([string]$Text) {
  Assert-XAccount
  $editor = Find-XControl 'Post text' 'Edit'
  if ((Normalize-PostText (Get-XValue $editor)) -cne (Normalize-PostText $Text)) { throw 'Editor text does not match exact campaign copy' }
  if ((Get-XAttachmentCount) -ne 1) { throw 'Expected exactly one attached campaign image' }
  $post = Find-XControl 'Post' 'Button'
  if (-not $post.Current.IsEnabled) { throw 'Post button is disabled (length limit or upload pending)' }
}
function Prepare-XPost([string]$Text, [string]$ImagePath) {
  Navigate-X 'https://x.com/compose/post'
  Wait-XCondition { $null = Find-XControl 'Post text' 'Edit'; return $true } 'empty composer'
  Assert-XAccount
  $editor = Find-XControl 'Post text' 'Edit'
  if (-not [string]::IsNullOrWhiteSpace((Get-XValue $editor)) -or (Get-XAttachmentCount) -ne 0) { throw 'Composer has an existing draft; preserving it' }
  Click-XElement $editor
  [Windows.Forms.Clipboard]::SetText($Text)
  Send-XKeys '^v'
  Wait-XCondition { (Normalize-PostText (Get-XValue (Find-XControl 'Post text' 'Edit'))) -ceq (Normalize-PostText $Text) } 'pasted exact text'
  $image = [Drawing.Image]::FromFile($ImagePath)
  try { [Windows.Forms.Clipboard]::SetImage($image) } finally { $image.Dispose() }
  Click-XElement (Find-XControl 'Post text' 'Edit')
  Send-XKeys '^v'
  Wait-XCondition { (Get-XAttachmentCount) -eq 1 } 'one uploaded image' 40
  Wait-XCondition { Assert-XComposer $Text; return $true } 'complete composer and enabled Post' 30
  return [pscustomobject]@{ imageSha256=(Get-FileHash -LiteralPath $ImagePath -Algorithm SHA256).Hash.ToLowerInvariant(); attachmentCount=1; preparedUtc=[DateTimeOffset]::UtcNow.ToString('o'); textSha256=(Get-CopyDigest $Text); imageEvidence='Canonical file pasted into empty composer; one Remove media control observed' }
}
function Publish-XPost([string]$Text) {
  Assert-XComposer $Text
  Click-XElement (Find-XControl 'Post' 'Button')
  # Do not navigate away while X is sending: that can abort the request.
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  do {
    Assert-XForeground
    $elements = @(Get-XElements)
    $visible = @($elements | Where-Object { -not $_.Current.IsOffscreen })
    $sent = @($visible | Where-Object { $_.Current.Name -match '^Your post was sent(?:[ .!]|$)' })
    if ($sent.Count -gt 0) { return }
    $errors = @($visible | Where-Object { $_.Current.Name -match '^(Something went wrong|You have already said that|Whoops|Your post could not be sent|You are over the daily limit|You have exceeded)' })
    if ($errors.Count -gt 0) { throw ('X publish error after one click: ' + $errors[0].Current.Name) }
    $editors = @($visible | Where-Object { $_.Current.Name -ceq 'Post text' -and $_.Current.ControlType -eq [Windows.Automation.ControlType]::Edit })
    if ($editors.Count -eq 0) { return }
    if (@($editors | Where-Object { -not [string]::IsNullOrWhiteSpace((Get-XValue $_)) }).Count -eq 0 -and (Get-XAttachmentCount) -eq 0) { return }
    Start-Sleep -Milliseconds 400
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'UNCERTAIN: Post clicked once but composer still pending after 45 seconds; did not navigate or click again'
}
function Find-XPublishedPost($Intent) {
  Navigate-XProfile
  $firstLine = ($Intent.text -split '\r?\n')[0]
  $hashtag = ($Intent.text -split '\r?\n')[-1]
  for ($attempt = 0; $attempt -lt 3; $attempt++) {
    foreach ($link in (Get-XElements)) {
      if ($link.Current.ControlType -ne [Windows.Automation.ControlType]::Hyperlink) { continue }
      $url = Get-XValue $link
      if ($url -notmatch '^https://x\.com/jungsilx/status/[0-9]+$') { continue }
      $article = $link
      for ($depth = 0; $depth -lt 7; $depth++) {
        $article = [Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($article)
        if ($null -eq $article) { break }
        $name = $article.Current.Name
        if (-not $name.Contains($firstLine) -or -not $name.Contains($hashtag)) { continue }
        $children = @(Get-XElements $article)
        $photo = @($children | Where-Object { (Get-XValue $_) -eq ($url + '/photo/1') }).Count -gt 0
        # X shortens the display URL. It must appear in the same article; the
        # exact URL was checked in the prepared composer before the sole click.
        $play = $name.Contains('play.google.com/store/apps/') -or @($children | Where-Object { $_.Current.Name -like '*play.google.com/store/apps/*' -or (Get-XValue $_) -eq $config.play_store_url }).Count -gt 0
        if (-not $play -or -not $photo) { continue }
        $evidence = [pscustomobject]@{ account='@jungsilx'; url=$url; text=$Intent.text; hasPhoto=$photo; imageSha256=$Intent.imageSha256; observedArticle=$name; verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o'); imageEvidence='Same newly published status has photo/1; canonical image source recorded before click' }
        if (Test-PublishedEvidence $Intent $evidence) { return $evidence }
      }
    }
    if ($attempt -lt 2) { Navigate-XProfile }
  }
  return $null
}
