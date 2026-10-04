<#
Escape Zombie School one-command social posting wrapper.
No live browser/posting occurs with -Offline or -DryRun.
One-line examples:
  X only dry validation: powershell.exe -NoProfile -ExecutionPolicy Bypass -File marketing/Invoke-ZombieSchoolSocialPosting.ps1 -Platform X -Language ko -RunId 2026-10-05-1100-safe -DryRun
  X live: powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File marketing/Invoke-ZombieSchoolSocialPosting.ps1 -Platform X -Language ko -RunId 2026-10-05-1100-safe
  Facebook live approved sequence: powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File marketing/Invoke-ZombieSchoolSocialPosting.ps1 -Platform Facebook -Language ko -RunId 2026-10-05-1100-safe -AuthorizeFacebookPublish
  Both live approved sequence: powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File marketing/Invoke-ZombieSchoolSocialPosting.ps1 -Platform Both -Language ko -RunId 2026-10-05-1100-safe -AuthorizeFacebookPublish
  Recovery/resume: rerun the exact same command with the same -RunId; the wrapper distinguishes already_verified from publish_intent uncertain and will not blindly re-click uncertain receipts.
Important: explicit -VariantId is supported only for Facebook-only runs. X's approved daily runner has no VariantId parameter and reselects internally, so X/Both reject explicit variants rather than silently drifting text/image pairs.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('X','Facebook','Both')][string]$Platform,
  [Parameter(Mandatory=$true)][ValidateSet('ja','en','vi','ko')][string]$Language,
  [Parameter(Mandatory=$true)][string]$RunId,
  [string]$VariantId = '',
  [string]$ConfigPath = '',
  [string]$ReceiptRoot = '',
  [long]$XWindowId = 0,
  [long]$FacebookWindowId = 0,
  [string]$XScriptPath = '',
  [string]$FacebookScriptPath = '',
  [switch]$DryRun,
  [switch]$Offline,
  [switch]$AuthorizeFacebookPublish
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ConfigPath)) { $ConfigPath = Join-Path $PSScriptRoot 'x_daily_zombie_school_posting\posting_config.json' }
if ([string]::IsNullOrWhiteSpace($ReceiptRoot)) { $ReceiptRoot = Join-Path $PSScriptRoot '..\Developer\agent_room' }
if ([string]::IsNullOrWhiteSpace($XScriptPath)) { $XScriptPath = Join-Path $PSScriptRoot 'x_daily_zombie_school_posting\Invoke-XDailyZombieSchoolPosting.ps1' }
if ([string]::IsNullOrWhiteSpace($FacebookScriptPath)) { $FacebookScriptPath = Join-Path $PSScriptRoot 'facebook_daily_zombie_school_posting\Invoke-FacebookDailyZombieSchoolPosting.ps1' }
$XRoot = Join-Path $PSScriptRoot 'x_daily_zombie_school_posting'
. (Join-Path $XRoot 'PostingReceipt.ps1')
. (Join-Path $XRoot 'PostingVariant.ps1')
function Assert-SocialRunId([string]$Value, [string]$PlatformName) {
  if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$') { throw 'A unique explicit -RunId is required; use the same ID on retry' }
  if ($PlatformName -in @('Facebook','Both') -and $Value -notmatch '^\d{4}-\d{2}-\d{2}-\d{4}(-[a-zA-Z0-9][a-zA-Z0-9_-]{0,63})?$') { throw 'Facebook/Both -RunId must match yyyy-MM-dd-HHmm[-suffix] so it is accepted by the approved Facebook wrapper before any UI step' }
}
function ConvertTo-HashtableObject($InputObject) { return $InputObject }
function Get-JsonFromLines($Lines, [string]$Context) {
  $items = @($Lines | ForEach-Object { [string]$_ })
  $first = -1
  $last = -1
  for ($i = 0; $i -lt $items.Count; $i++) {
    $trimmed = $items[$i].Trim()
    if ($first -lt 0 -and ($trimmed.StartsWith('{') -or $trimmed.StartsWith('['))) { $first = $i }
    if ($first -ge 0 -and ($trimmed.EndsWith('}') -or $trimmed.EndsWith(']'))) { $last = $i }
  }
  if ($first -lt 0 -or $last -lt $first) { throw "$Context returned no JSON result" }
  $text = ($items[$first..$last] -join "`n").Trim()
  try { return ($text | ConvertFrom-Json) } catch { throw "$Context returned non-JSON result: $text" }
}
function Invoke-JsonPowerShell([string]$ScriptPath, [object[]]$Arguments, [string]$Context) {
  if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) { throw "$Context script not found: $ScriptPath" }
  $ps = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
  if ([string]::IsNullOrWhiteSpace($ps)) { $ps = 'powershell' }
  $output = & $ps -NoProfile -STA -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
  $exit = $LASTEXITCODE
  if ($exit -ne 0) { throw "$Context failed (exit $exit): $($output -join "`n")" }
  return Get-JsonFromLines $output $Context
}
function Assert-LocalizedLinkLabels($Config, [string]$Text, [string]$Language, [string]$Name) {
  Assert-PostingTextLinks $Config $Text $Name
  $labels = @{
    ja = @([regex]::Unescape('\u30b2\u30fc\u30e0\u958b\u59cb ->'),[regex]::Unescape('Google Play \u30b9\u30c8\u30a2 ->'))
    en = @('Start game ->','Google Play Store ->')
    vi = @([regex]::Unescape('B\u1eaft \u0111\u1ea7u tr\u00f2 ch\u01a1i ->'),[regex]::Unescape('C\u1eeda h\u00e0ng Google Play ->'))
    ko = @([regex]::Unescape('\uac8c\uc784\uc2dc\uc791 ->'),[regex]::Unescape('\uad6c\uae00\ud50c\ub808\uc774\uc2a4\ud1a0\uc5b4 ->'))
  }
  $lines = @([regex]::Split($Text, "\r?\n"))
  $web = [string]$Config.web_url
  $play = [string]$Config.play_store_url
  $webIndex = [array]::IndexOf($lines, $web)
  $playIndex = [array]::IndexOf($lines, $play)
  if ($webIndex -lt 1 -or $playIndex -lt 1) { throw "$Name must place localized labels immediately before both URLs" }
  if ($lines[$webIndex - 1] -cne $labels[$Language][0]) { throw "$Name has wrong localized web label" }
  if ($lines[$playIndex - 1] -cne $labels[$Language][1]) { throw "$Name has wrong localized Play label" }
  if ($webIndex -ge $playIndex) { throw "$Name must place web URL before Play URL" }
}
function Get-ValidatedSelection($Config, [string]$Language, [string]$RunId, [string]$ReceiptDirectory, [string]$VariantId) {
  if (-not (Test-Path -LiteralPath $ReceiptDirectory -PathType Container)) { New-Item -ItemType Directory -Path $ReceiptDirectory | Out-Null }
  Assert-PostingVariants $Config
  foreach ($lang in $Config.language_order) {
    foreach ($variant in @(Get-PostingVariants $Config $lang -IncludeDisabled)) {
      Assert-LocalizedLinkLabels $Config ([string]$variant.text) ([string]$lang) "$lang/$($variant.id)"
    }
  }
  $selected = if ([string]::IsNullOrWhiteSpace($VariantId)) { Select-PostingVariant $Config $Language $RunId $ReceiptDirectory } else { @(Get-PostingVariants $Config $Language -IncludeDisabled | Where-Object { $_.id -ceq $VariantId }) }
  if (@($selected).Count -ne 1) { throw "Unknown or ambiguous explicit variant '$VariantId' for $Language" }
  $selected = $selected[0]
  Assert-LocalizedLinkLabels $Config ([string]$selected.text) $Language "$Language/$($selected.id)"
  $imagePath = [IO.Path]::GetFullPath([string]$selected.imagePath)
  if (-not (Test-Path -LiteralPath $imagePath -PathType Leaf)) { throw "Selected image is missing: $imagePath" }
  $imageHash = (Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  [pscustomobject]@{ language=$Language; variantId=[string]$selected.id; text=[string]$selected.text; textSha256=(Get-CopyDigest ([string]$selected.text)); imagePath=$imagePath; imageSha256=$imageHash }
}
function Get-VerifiedReceiptEntry([string]$Path, [string]$Language, [string]$PlatformName) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$PlatformName receipt is missing: $Path" }
  $receipt = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  $entry = $receipt.entries.$Language
  if ($null -eq $entry -or $entry.state -ne 'verified') { throw "$PlatformName receipt is not verified for $Language" }
  if (-not (Test-PublishedEvidence $entry.intent $entry.evidence)) { throw "$PlatformName receipt evidence is not a same-status verified photo permalink for $Language" }
  $permalink = ''
  if ($null -ne $entry.evidence) {
    if ($entry.evidence.PSObject.Properties.Name -contains 'url') { $permalink = [string]$entry.evidence.url }
    elseif ($entry.evidence.PSObject.Properties.Name -contains 'permalink') { $permalink = [string]$entry.evidence.permalink }
  }
  if ([string]::IsNullOrWhiteSpace($permalink)) { throw "$PlatformName verified receipt did not contain a permalink for $Language" }
  [pscustomobject]@{ permalink=$permalink; intent=$entry.intent; evidence=$entry.evidence; receiptPath=$Path }
}
function Get-ActualSelectionFromIntent($Intent, [string]$FallbackLanguage) {
  if ($null -eq $Intent) { return $null }
  [pscustomobject]@{
    language = if ($Intent.PSObject.Properties.Name -contains 'language' -and -not [string]::IsNullOrWhiteSpace([string]$Intent.language)) { [string]$Intent.language } else { $FallbackLanguage }
    variantId = if ($Intent.PSObject.Properties.Name -contains 'variantId') { [string]$Intent.variantId } else { '' }
    text = if ($Intent.PSObject.Properties.Name -contains 'text') { [string]$Intent.text } else { '' }
    textSha256 = if ($Intent.PSObject.Properties.Name -contains 'textSha256') { [string]$Intent.textSha256 } elseif ($Intent.PSObject.Properties.Name -contains 'text') { Get-CopyDigest ([string]$Intent.text) } else { '' }
    imagePath = if ($Intent.PSObject.Properties.Name -contains 'imagePath') { [string]$Intent.imagePath } else { '' }
    imageSha256 = if ($Intent.PSObject.Properties.Name -contains 'imageSha256') { [string]$Intent.imageSha256 } else { '' }
  }
}
function Normalize-FacebookReceiptText([string]$Text) { ([regex]::Replace($Text, '\s+', ' ')).Trim() }
function Test-FacebookReceiptIntent($Intent) {
  if ($null -eq $Intent) { return $false }
  if (-not ($Intent.PSObject.Properties.Name -contains 'attachmentCount') -or [int]$Intent.attachmentCount -ne 1) { return $false }
  if (-not ($Intent.PSObject.Properties.Name -contains 'text') -or -not ([string]$Intent.text).Contains('https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool')) { return $false }
  if (-not ($Intent.PSObject.Properties.Name -contains 'textSha256') -or (Get-CopyDigest ([string]$Intent.text)) -cne [string]$Intent.textSha256) { return $false }
  if (-not ($Intent.PSObject.Properties.Name -contains 'imagePath') -or [string]::IsNullOrWhiteSpace([string]$Intent.imagePath)) { return $false }
  return $true
}
function Test-FacebookReceiptEvidence($Intent, $Evidence) {
  if (-not (Test-FacebookReceiptIntent $Intent) -or $null -eq $Evidence) { return $false }
  if (-not ($Evidence.PSObject.Properties.Name -contains 'permalink') -or [string]$Evidence.permalink -notmatch '^https://www\.facebook\.com/(?:hyunuk\.jung\.56/posts/|permalink\.php\?story_fbid=)') { return $false }
  if (-not ($Evidence.PSObject.Properties.Name -contains 'audience') -or [string]$Evidence.audience -cne 'Friends') { return $false }
  if (-not ($Evidence.PSObject.Properties.Name -contains 'attachmentCount') -or [int]$Evidence.attachmentCount -ne 1) { return $false }
  if (-not ($Evidence.PSObject.Properties.Name -contains 'text')) { return $false }
  return (Normalize-FacebookReceiptText ([string]$Evidence.text)) -ceq (Normalize-FacebookReceiptText ([string]$Intent.text))
}
function Get-FacebookVerifiedReceiptForLanguage([string]$ReceiptDirectory) {
  $path = Join-Path $ReceiptDirectory ($RunId + '.json')
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
  $receipt = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($receipt.schema -ne 1 -or $receipt.platform -ne 'facebook') { throw 'Unsupported Facebook receipt shape; refusing resume without manual review' }
  $entry = $receipt.entries.$Language
  if ($null -eq $entry) { return $null }
  if ($entry.state -eq 'publish_intent') { throw 'Facebook publish_intent uncertain; wrapper will not blindly re-click. Verify the existing post or use a new RunId.' }
  if ($entry.state -ne 'verified') { return $null }
  if (-not (Test-FacebookReceiptEvidence $entry.intent $entry.evidence)) { throw "Facebook receipt for $Language is marked verified but evidence does not prove exact text, Friends audience, one image, and permalink" }
  [pscustomobject]@{ status='already_verified'; permalink=[string]$entry.evidence.permalink; receiptPath=$path; intent=$entry.intent; evidence=$entry.evidence; actualSelection=(Get-ActualSelectionFromIntent $entry.intent $Language) }
}
function Invoke-XWrapper($Selection, [string]$RunId, [string]$ReceiptDirectory) {
  if ($Offline) { return [pscustomobject]@{ status='offline_validated'; uiTouched=$false; selected=$Selection } }
  if ($DryRun) {
    $args = @('-Language',$Language,'-CycleId',$RunId,'-ReceiptDirectory',$ReceiptDirectory,'-DryRun','-ValidateOnly')
    $result = Invoke-JsonPowerShell $XScriptPath $args 'X dry-run'
    if ($result.uiTouched -ne $false -or [int]$result.published -ne 0) { throw 'X dry-run unexpectedly touched UI or published' }
    return $result
  }
  $args = @('-Language',$Language,'-CycleId',$RunId,'-ReceiptDirectory',$ReceiptDirectory,'-Run','-SinglePost')
  if ($XWindowId -ne 0) { $args += @('-WindowId', $XWindowId) }
  $result = Invoke-JsonPowerShell $XScriptPath $args 'X live posting'
  if ($result.status -notin @('partial_verified','complete') -or [int]$result.published -lt 1) { throw 'X process exited without a verified publish status; refusing to infer success from exit code' }
  if (-not ($result.PSObject.Properties.Name -contains 'receiptPath') -or [string]::IsNullOrWhiteSpace([string]$result.receiptPath)) { throw 'X live posting did not return a receiptPath; refusing to claim success without receipt evidence' }
  $verifiedEntry = Get-VerifiedReceiptEntry ([string]$result.receiptPath) $Language 'X'
  $actualSelection = Get-ActualSelectionFromIntent $verifiedEntry.intent $Language
  $result | Add-Member -Force -NotePropertyName permalink -NotePropertyValue ([string]$verifiedEntry.permalink)
  if ($null -ne $actualSelection) { $result | Add-Member -Force -NotePropertyName actualSelection -NotePropertyValue $actualSelection }
  return $result
}
function Invoke-FacebookAction([string]$Action, [string]$ReceiptDirectory, [hashtable]$Extra) {
  $args = @('-Action',$Action,'-RunId',$RunId,'-Language',$Language,'-ReceiptDirectory',$ReceiptDirectory)
  $extraArgs = if ($null -ne $Extra) { @{} + $Extra } else { @{} }
  $variantToPass = $VariantId
  if ($extraArgs.ContainsKey('VariantId')) {
    $variantToPass = [string]$extraArgs['VariantId']
    $extraArgs.Remove('VariantId')
  }
  if (-not [string]::IsNullOrWhiteSpace($variantToPass) -and $Action -in @('InspectPair','SelectSourcePair')) { $args += @('-VariantId',$variantToPass) }
  if ($FacebookWindowId -ne 0) { $args += @('-WindowId',$FacebookWindowId) }
  foreach ($key in $extraArgs.Keys) {
    $value = $extraArgs[$key]
    if ($value -is [switch] -or $value -is [bool]) { if ($value) { $args += "-$key" } }
    else { $args += @("-$key", $value) }
  }
  Invoke-JsonPowerShell $FacebookScriptPath $args "Facebook $Action"
}
function Get-FacebookExactProfileTabCountReadOnly([string]$ReceiptDirectory) {
  $diag = Invoke-FacebookAction 'ProfileReadinessDiagnostics' $ReceiptDirectory @{}
  if ($diag.PSObject.Properties.Name -contains 'exactFacebookTabCount') { return [int]$diag.exactFacebookTabCount }
  throw 'Approved Facebook readiness diagnostics did not return exactFacebookTabCount; refusing new-tab fallback'
}
function Invoke-FacebookProfileOpen([string]$ReceiptDirectory) {
  try { return Invoke-FacebookAction 'OpenProfile' $ReceiptDirectory @{} }
  catch {
    $message = $_.Exception.Message
    if ($message -match 'No exact Facebook profile tab exists|found 0 exact Facebook profile tabs|Resolved Facebook window no longer exposes one exact Facebook tab') {
      $exactTabCount = Get-FacebookExactProfileTabCountReadOnly $ReceiptDirectory
      if ($exactTabCount -eq 0) { return Invoke-FacebookAction 'OpenProfileNewTab' $ReceiptDirectory @{} }
      if ($exactTabCount -gt 1) { throw "Facebook has $exactTabCount exact Facebook tabs; wrapper will not add another tab" }
    }
    throw
  }
}
function Invoke-FacebookWrapper($Selection, [string]$ReceiptDirectory) {
  if ($Offline) { return [pscustomobject]@{ status='offline_validated'; uiTouched=$false; selected=$Selection } }
  if ($DryRun) {
    $pair = Invoke-FacebookAction 'InspectPair' $ReceiptDirectory @{ VariantId = [string]$Selection.variantId }
    if ([int]$pair.attachmentCount -ne 1) { throw 'Facebook dry-run pair is not a one-image post' }
    return [pscustomobject]@{ status='dry_run_validated'; uiTouched=$false; pair=$pair; selected=$Selection }
  }
  $existingVerified = Get-FacebookVerifiedReceiptForLanguage $ReceiptDirectory
  if ($null -ne $existingVerified) { return [pscustomobject]@{ status='already_verified'; permalink=[string]$existingVerified.permalink; receiptPath=[string]$existingVerified.receiptPath; uiTouched=$false; runId=$RunId; actualSelection=$existingVerified.actualSelection; evidence=$existingVerified.evidence } }
  $resume = Invoke-FacebookAction 'FullCycleResumeSafe' $ReceiptDirectory @{}
  $existingVerified = Get-FacebookVerifiedReceiptForLanguage $ReceiptDirectory
  if ($null -ne $existingVerified) { return [pscustomobject]@{ status='already_verified'; permalink=[string]$existingVerified.permalink; receiptPath=[string]$existingVerified.receiptPath; uiTouched=$false; runId=$RunId; actualSelection=$existingVerified.actualSelection; evidence=$existingVerified.evidence } }
  if ($resume.status -eq 'complete') { throw 'Facebook FullCycleResumeSafe reported complete but the requested language could not be verified from receipt evidence' }
  if ($resume.status -eq 'uncertain_requires_manual_verification') { throw 'Facebook publish_intent uncertain; wrapper will not blindly re-click. Verify the existing post or use a new RunId.' }
  if (-not $AuthorizeFacebookPublish) { throw 'Facebook publishing is a live external mutation: pass -AuthorizeFacebookPublish to run the approved PublishOnce step' }
  $selected = Invoke-FacebookAction 'SelectSourcePair' $ReceiptDirectory @{ VariantId = [string]$Selection.variantId }
  $window = Invoke-FacebookAction 'DiscoverWindow' $ReceiptDirectory @{}
  $profile = Invoke-FacebookProfileOpen $ReceiptDirectory
  $composer = Invoke-FacebookAction 'OpenComposer' $ReceiptDirectory @{}
  $typed = Invoke-FacebookAction 'TypeText' $ReceiptDirectory @{}
  $attached = Invoke-FacebookAction 'AttachImage' $ReceiptDirectory @{}
  if ($attached.PSObject.Properties.Name -contains 'attachmentCount' -and [int]$attached.attachmentCount -ne 1) { throw 'Facebook attachment proof did not show exactly one image' }
  $draft = Invoke-FacebookAction 'VerifyDraft' $ReceiptDirectory @{}
  if ($draft.status -ne 'draft_verified') { throw 'Facebook draft was not verified as Friends/one-image before publish' }
  $published = Invoke-FacebookAction 'PublishOnce' $ReceiptDirectory @{ AuthorizePublish = $true }
  if ($published.status -ne 'uncertain_requires_VerifyPost') { throw 'Facebook publish did not enter the expected verify-required state' }
  $opened = Invoke-FacebookAction 'OpenNewestPost' $ReceiptDirectory @{}
  if ([string]::IsNullOrWhiteSpace([string]$opened.permalink)) { throw 'Facebook newest post did not return a permalink; refusing to claim success' }
  $verified = Invoke-FacebookAction 'VerifyPost' $ReceiptDirectory @{ Permalink = [string]$opened.permalink }
  if ($verified.status -ne 'verified' -or [string]::IsNullOrWhiteSpace([string]$verified.permalink)) { throw 'Facebook post was not verified after publish' }
  $closed = Invoke-FacebookAction 'ClosePost' $ReceiptDirectory @{}
  [pscustomobject]@{ status='verified'; permalink=[string]$verified.permalink; uiTouched=$true; runId=$RunId; actualSelection=$selected; window=$window; profile=$profile; composer=$composer; typed=$typed; attached=$attached; draft=$draft; publish=$published; close=$closed }
}
try {
  Assert-SocialRunId $RunId $Platform
  if ($DryRun -and $Offline) { throw 'Use only one of -DryRun or -Offline' }
  if (-not [string]::IsNullOrWhiteSpace($VariantId) -and $Platform -in @('X','Both')) { throw 'Explicit -VariantId is unsupported for X/Both because the approved X runner reselects internally and has no VariantId parameter; use Facebook-only or omit -VariantId.' }
  $config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($config.boundary.account -cne '@jungsilx' -or $config.web_url -cne 'https://escapezombie.com' -or $config.play_store_url -cne 'https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool') { throw 'Unexpected social posting config boundary' }
  $xReceiptDirectory = Join-Path $ReceiptRoot 'x_posting_receipts'
  $facebookReceiptDirectory = Join-Path $ReceiptRoot 'facebook_posting_receipts'
  $selection = Get-ValidatedSelection $config $Language $RunId $xReceiptDirectory $VariantId
  $platforms = [ordered]@{}
  if ($Platform -in @('X','Both')) { $platforms.x = Invoke-XWrapper $selection $RunId $xReceiptDirectory }
  if ($Platform -in @('Facebook','Both')) { $platforms.facebook = Invoke-FacebookWrapper $selection $facebookReceiptDirectory }
  [pscustomobject]@{ status='ok'; platform=$Platform; language=$Language; runId=$RunId; uiTouched=((-not $Offline) -and (-not $DryRun)); previewSelection=$selection; platforms=$platforms } | ConvertTo-Json -Depth 12 -Compress
  exit 0
} catch {
  [Console]::Error.WriteLine('ZOMBIE_SOCIAL_POSTING_FAILED: ' + $_.Exception.Message)
  exit 1
}
