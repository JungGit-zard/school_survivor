# Facebook posting guardrails. Importing this file has no desktop or network side effects.
Set-StrictMode -Version Latest
$script:FacebookImageRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\image_pool'))
$script:FacebookProfileUrl = 'https://www.facebook.com/hyunuk.jung.56/'
$script:FacebookProfileId = '100006315245185'
$script:FacebookPlayUrl = 'https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool'
$script:FacebookLanguages = @('ja','en','vi','ko')

function Get-FacebookSha256([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
function Normalize-FacebookText([string]$Text) { ([regex]::Replace($Text, '\s+', ' ')).Trim() }
function Assert-FacebookRunId([string]$RunId) {
  if ($RunId -notmatch '^\d{4}-\d{2}-\d{2}-\d{4}(?:-[a-z0-9][a-z0-9_-]{0,48})?$') { throw 'RunId must be an explicit KST slot (yyyy-MM-dd-HHmm) with optional authorized repost suffix' }
}
function Test-FacebookUnderImageRoot([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  try {
    $root = $script:FacebookImageRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $full = [IO.Path]::GetFullPath($Path)
    return $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)
  } catch { return $false }
}
function Assert-FacebookImagePath([string]$Path) {
  if (-not (Test-FacebookUnderImageRoot $Path)) { throw 'Image path is outside the approved X image_pool root' }
}
function Get-FacebookConfig { Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json }
function Get-FacebookPair($Config, [ValidateSet('ja','en','vi','ko')][string]$Language, [string]$VariantId = 'escape') {
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  $variant = @((Get-PostingVariants $Config $Language -IncludeDisabled) | Where-Object { $_.id -ceq $VariantId })
  if ($variant.Count -ne 1) { throw "Unknown or ambiguous X config variant '$VariantId' for $Language" }
  $text = [string]$variant[0].text
  $imagePath = [string]$variant[0].imagePath
  if ([string]::IsNullOrWhiteSpace($text) -or [string]::IsNullOrWhiteSpace($imagePath)) { throw "Missing canonical X pair for $Language" }
  if (-not $text.Contains($script:FacebookPlayUrl) -or -not $text.Contains([string]$Config.copy.$Language.hashtag)) { throw "Canonical $Language copy is missing its exact Play link or hashtag" }
  Assert-FacebookImagePath $imagePath
  [pscustomobject]@{ language=$Language; variantId=$variant[0].id; text=$text; textSha256=(Get-FacebookSha256 $text); imagePath=[IO.Path]::GetFullPath($imagePath); attachmentCount=1 }
}
function Get-FacebookReceiptPath([string]$ReceiptDirectory, [string]$RunId) { Join-Path $ReceiptDirectory ($RunId + '.json') }
function Save-FacebookReceipt($Receipt, [string]$Path) {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $temp = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
  [IO.File]::WriteAllText($temp, ($Receipt | ConvertTo-Json -Depth 20), [Text.Encoding]::UTF8)
  if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temp, $Path, [NullString]::Value) } else { [IO.File]::Move($temp, $Path) }
}
function New-FacebookReceipt([string]$RunId) {
  [pscustomobject]@{ schema=1; platform='facebook'; runId=$RunId; status='incomplete'; targetProfileUrl=$script:FacebookProfileUrl; author='Hyun Uk Jung'; profileId=$script:FacebookProfileId; audience='Friends'; sourceConfig='marketing/x_daily_zombie_school_posting/posting_config.json'; createdUtc=[DateTimeOffset]::UtcNow.ToString('o'); entries=[pscustomobject]@{ ja=$null; en=$null; vi=$null; ko=$null } }
}
function Test-FacebookIntent($Intent) {
  if ($null -eq $Intent -or $Intent.attachmentCount -ne 1 -or -not (Test-FacebookUnderImageRoot ([string]$Intent.imagePath))) { return $false }
  if ((Get-FacebookSha256 ([string]$Intent.text)) -cne [string]$Intent.textSha256) { return $false }
  return ([string]$Intent.text).Contains($script:FacebookPlayUrl)
}
function Assert-FacebookFrozenIntent($Config,[string]$Language,$Intent) {
  if(-not (Test-FacebookIntent $Intent)){throw 'Receipt intent is structurally invalid'}
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  $match=@((Get-PostingVariants $Config $Language -IncludeDisabled)|Where-Object{$_.id -ceq $Intent.variantId -and $_.text -ceq $Intent.text -and $_.imagePath -ceq $Intent.imagePath})
  if($match.Count -ne 1){throw 'Frozen receipt intent no longer equals one exact X config pair'}
}
function Test-FacebookEvidence($Intent, $Evidence) {
  if (-not (Test-FacebookIntent $Intent) -or $null -eq $Evidence) { return $false }
  if ([string]$Evidence.permalink -notmatch '^https://www\.facebook\.com/(?:hyunuk\.jung\.56/posts/|permalink\.php\?story_fbid=)') { return $false }
  if ([string]$Evidence.audience -cne 'Friends' -or $Evidence.attachmentCount -ne 1) { return $false }
  return (Normalize-FacebookText ([string]$Evidence.text)) -ceq (Normalize-FacebookText ([string]$Intent.text))
}
function Test-FacebookComplete($Receipt) {
  $links = @()
  foreach ($language in $script:FacebookLanguages) {
    $entry = $Receipt.entries.$language
    if ($null -eq $entry -or $entry.state -ne 'verified' -or -not (Test-FacebookEvidence $entry.intent $entry.evidence)) { return $false }
    if ($links -contains $entry.evidence.permalink) { return $false }; $links += $entry.evidence.permalink
  }
  return $true
}
function Assert-FacebookDraft($Intent, [string]$ObservedText, [int]$ObservedAttachmentCount, [string]$ObservedAudience) {
  if (-not (Test-FacebookIntent $Intent)) { throw 'Invalid frozen post intent' }
  if ((Normalize-FacebookText $ObservedText) -cne (Normalize-FacebookText ([string]$Intent.text))) { throw 'Draft text must exactly match the frozen campaign copy' }
  if ($ObservedAttachmentCount -ne 1) { throw 'Draft must contain exactly one image attachment' }
  if ($ObservedAudience -cne 'Friends') { throw 'Audience must remain Friends; public expansion is forbidden' }
}
function Assert-FacebookComposerTree([string]$Tree) {
  if($Tree -notmatch 'facebook\.com/hyunuk\.jung\.56'){throw 'Composer document is not the fixed Hyun Uk Jung profile'}
  if($Tree -notmatch '(?m)^.*Hyun Uk Jung.*$'){throw 'Composer tree does not identify Hyun Uk Jung'}
}
function ConvertFrom-FacebookPostTree([string]$Tree,[string]$Permalink,[string]$ExpectedText) {
  if([string]::IsNullOrWhiteSpace($Tree)){throw 'Empty Orca post tree'}
  $canonical=$Permalink.TrimEnd('/')
  if($Tree -notmatch [regex]::Escape($canonical)){throw 'Fresh document address does not equal the supplied post permalink'}
  $scopeMatch=[regex]::Match($Tree,"(?ms)^.*(?:dialog|대화 상자).*Hyun Uk Jung.?s Post.*$")
  if(-not $scopeMatch.Success){throw 'No scoped Hyun Uk Jung post dialog in fresh tree'}
  $scope=$Tree.Substring($scopeMatch.Index)
  if($scope -notmatch '(?m)^.*Hyun Uk Jung.*$'){throw 'Scoped post lacks Hyun Uk Jung author'}
  $lines=@($ExpectedText -split "`r?`n")
  foreach($line in $lines){if($scope -notmatch [regex]::Escape($line)){throw 'Scoped post lacks an exact intended text/link/hashtag node'}}
  $encoded=[Uri]::EscapeDataString($script:FacebookPlayUrl)
  if($scope -notmatch [regex]::Escape($script:FacebookPlayUrl) -and $scope -notmatch ('[?&]u='+[regex]::Escape($encoded))){throw 'Scoped post lacks the exact Play link target'}
  if($scope -notmatch '(Shared with Your friends|친구와 공유)'){throw 'Scoped post lacks Friends audience evidence'}
  $photos=@([regex]::Matches($scope,'(?im)^.*(?:May be an image of text|photo|사진).*$'))
  if($photos.Count -ne 1){throw "Scoped post requires exactly one photo evidence node; found $($photos.Count)"}
  [pscustomobject]@{permalink=$canonical;text=$ExpectedText;attachmentCount=1;audience='Friends';author='Hyun Uk Jung';observedTreeSha256=(Get-FacebookSha256 $scope);verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o')}
}
function Add-FacebookPublishIntent($Receipt, [string]$Language, $Intent, [string]$Path) {
  $entry = $Receipt.entries.$Language
  if ($null -ne $entry -and $entry.state -eq 'publish_intent') { throw "UNCERTAIN ${Language}: an earlier Post click exists; verify it before any further click" }
  if ($null -ne $entry -and $entry.state -eq 'verified') { throw "$Language is already verified; no second post" }
  $Receipt.entries.$Language = [pscustomobject]@{ state='publish_intent'; intent=$Intent; evidence=$null; publishIntentUtc=[DateTimeOffset]::UtcNow.ToString('o') }
  Save-FacebookReceipt $Receipt $Path
}
function Complete-FacebookVerification($Receipt, [string]$Language, $Evidence, [string]$Path) {
  $entry = $Receipt.entries.$Language
  if ($null -eq $entry -or $entry.state -ne 'publish_intent') { throw 'Verification requires a persisted publish_intent' }
  if (-not (Test-FacebookEvidence $entry.intent $Evidence)) { throw 'Evidence must prove exact text, Friends audience, one image, and a Facebook permalink' }
  $entry.state = 'verified'; $entry.evidence = $Evidence; Save-FacebookReceipt $Receipt $Path
}
