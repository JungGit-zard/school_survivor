# Facebook posting guardrails. Importing this file has no desktop or network side effects.
Set-StrictMode -Version Latest
$script:FacebookImageRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\image_pool\facebook'))
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
    . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
    $full = Resolve-PostingImagePath $Path -Platform Facebook
    $root = $script:FacebookImageRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return $true }
    # 2026-11-07: Facebook posts X's localized promo images directly.
    $xRoot = [IO.Path]::GetFullPath((Join-Path $script:FacebookImageRoot '..\x')).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if ($full.StartsWith($xRoot, [StringComparison]::OrdinalIgnoreCase)) { return $true }
    $normalized=$Path -replace '\\','/';$marker=[regex]::Match($normalized,'(?:^|/)image_pool/(.+)$',[Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $suffix=if($marker.Success){$marker.Groups[1].Value}else{$normalized.TrimStart('/')};$catalog=Get-PostingImageCatalog
    return ($catalog.legacyPaths.PSObject.Properties.Name -contains $suffix)
  } catch { return $false }
}
function Assert-FacebookImagePath([string]$Path) {
  if (-not (Test-FacebookUnderImageRoot $Path)) { throw 'Image path is outside the approved social image_pool root' }
}
function Resolve-FacebookAttachmentPath([string]$Path) {
  Assert-FacebookImagePath $Path
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  return Resolve-PostingImagePath $Path -Platform Facebook
}
function Get-FacebookConfig { Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json }
function Resolve-FacebookPlatformImagePath([string]$Path, [ValidateSet('ja','en','vi','ko')][string]$Language) {
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  $catalog=Get-PostingImageCatalog;$poolRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\image_pool'))
  try {
    $facebookImage = Resolve-PostingImagePath $Path -Platform Facebook
    $relative=$facebookImage.Substring($poolRoot.Length+1).Replace('\','/')
    $facebookRows=@($catalog.images|Where-Object{$_.platform -ceq 'Facebook' -and $_.path -ceq $relative -and $_.locale -ceq $Language})
    if($facebookRows.Count -eq 1){Assert-FacebookImagePath $facebookImage;if(-not(Test-Path -LiteralPath $facebookImage -PathType Leaf)){throw "Missing Facebook platform image for $Language"};return $facebookImage}
  } catch {}
  $xImage = Resolve-PostingImagePath $Path -Platform X
  $relative=$xImage.Substring($poolRoot.Length+1).Replace('\','/')
  $xRows=@($catalog.images|Where-Object{$_.platform -ceq 'X' -and $_.path -ceq $relative -and $_.locale -ceq $Language})
  if($xRows.Count -ne 1){throw "No exact X catalog entry for $Language image; shared reference assets are not localized pairs"}
  # 2026-11-07 (Terry): Facebook posts the same X promo image itself, not a Facebook comic copy.
  Assert-FacebookImagePath $xImage
  if (-not (Test-Path -LiteralPath $xImage -PathType Leaf)) { throw "Missing X promo image for $Language" }
  return $xImage
}
function Add-FacebookCampaignUtm([string]$Text, [string]$Language) {
  [regex]::Replace($Text, 'https://escapezombie\.com(?=\s)', ('https://escapezombie.com/?utm_source=fb&utm_medium=social&utm_campaign=daily_' + $Language))
}
function Get-FacebookPair($Config, [ValidateSet('ja','en','vi','ko')][string]$Language, [string]$VariantId = 'escape', [string]$CandidateImagePath = '') {
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  $variant = @((Get-PostingVariants $Config $Language -IncludeDisabled) | Where-Object { $_.id -ceq $VariantId })
  if ($variant.Count -ne 1) { throw "Unknown or ambiguous campaign config variant '$VariantId' for $Language" }
  $text = Add-FacebookCampaignUtm ([string]$variant[0].text) $Language
  $selectedImagePath=if([string]::IsNullOrWhiteSpace($CandidateImagePath)){[string]$variant[0].imagePath}else{$CandidateImagePath}
  $imagePath = Resolve-FacebookPlatformImagePath $selectedImagePath $Language
  if ([string]::IsNullOrWhiteSpace($text) -or [string]::IsNullOrWhiteSpace($imagePath)) { throw "Missing canonical Facebook pair for $Language" }
  if (-not $text.Contains($script:FacebookPlayUrl) -or -not $text.Contains([string]$Config.copy.$Language.hashtag)) { throw "Canonical $Language copy is missing its exact Play link or hashtag" }
  [pscustomobject]@{ language=$Language; variantId=$variant[0].id; text=$text; textSha256=(Get-FacebookSha256 $text); imagePath=[IO.Path]::GetFullPath($imagePath); imageSha256=(Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant(); attachmentCount=1 }
}
function Get-FacebookPairFromSelectedVariant($Config,[ValidateSet('ja','en','vi','ko')][string]$Language,$SelectedVariant) {
  if($null -eq $SelectedVariant -or [string]::IsNullOrWhiteSpace([string]$SelectedVariant.id) -or [string]::IsNullOrWhiteSpace([string]$SelectedVariant.imagePath)){throw 'Selected Facebook variant must contain its exact ID and selected X catalog image path'}
  $pair=Get-FacebookPair $Config $Language ([string]$SelectedVariant.id) ([string]$SelectedVariant.imagePath)
  . (Join-Path $PSScriptRoot '..\x_daily_zombie_school_posting\PostingVariant.ps1')
  # Same gating as X: website-card mode needs no burned-in CTA because the post text carries the links.
  if(-not (Test-PostingXWebsiteCardMode $Config)){Assert-PostingImageGameStartText ([string]$pair.imagePath) $Language -Platform Facebook}
  return $pair
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
  $intentPath=Resolve-PostingImagePath ([string]$Intent.imagePath) -Platform Facebook
  $pairMatch=$false
  try{$pair=Get-FacebookPair $Config $Language ([string]$Intent.variantId);$pairMatch=($pair.text -ceq $Intent.text -and $pair.imagePath -ceq $intentPath)}catch{}
  if($pairMatch){return}
  $selectedVariant=@((Get-PostingVariants $Config $Language -IncludeDisabled)|Where-Object{$_.id -ceq [string]$Intent.variantId -and ($_.text -ceq [string]$Intent.text -or (Add-FacebookCampaignUtm $_.text $Language) -ceq [string]$Intent.text)})
  if($selectedVariant.Count -eq 1){
    # Retired comic pool stays valid only for receipts frozen before 2026-11-07.
    $retiredComics=@(if($Config.PSObject.Properties.Name -contains 'facebook_rotation_image_pool' -and $Config.facebook_rotation_image_pool.PSObject.Properties.Name -contains $Language){@($Config.facebook_rotation_image_pool.$Language.images)})
    foreach($candidate in @(@(Get-PostingLocaleImageCandidates $Config $Language -Platform Facebook)+$retiredComics)){
      try{$mappedFacebookPath=Resolve-PostingImagePath ([string]$candidate) -Platform Facebook;if($mappedFacebookPath -ceq $intentPath){return}}catch{}
    }
  }
  $normalized=[string]$Intent.imagePath -replace '\\','/';$marker=[regex]::Match($normalized,'(?:^|/)image_pool/(.+)$',[Text.RegularExpressions.RegexOptions]::IgnoreCase);$suffix=if($marker.Success){$marker.Groups[1].Value}else{$normalized.TrimStart('/')};$catalog=Get-PostingImageCatalog
  if($catalog.legacyPaths.PSObject.Properties.Name -notcontains $suffix){throw 'Frozen receipt is neither a Facebook pair nor an explicitly mapped legacy image'}
  $legacyMatch=@((Get-PostingVariants $Config $Language -IncludeDisabled)|Where-Object{$_.id -ceq $Intent.variantId -and $_.text -ceq $Intent.text -and $_.imagePath -ceq $intentPath})
  if($legacyMatch.Count -ne 1){throw 'Legacy frozen receipt no longer equals one exact localized X config pair'}
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
function Add-FacebookPublishIntent($Receipt, [string]$Language, $Intent, [string]$Path, [string]$PostFormat = '', [string]$CardUrl = '') {
  $entry = $Receipt.entries.$Language
  if ($null -ne $entry -and $entry.state -eq 'publish_intent') { throw "UNCERTAIN ${Language}: an earlier Post click exists; verify it before any further click" }
  if ($null -ne $entry -and $entry.state -eq 'verified') { throw "$Language is already verified; no second post" }
  $Receipt.entries.$Language = [pscustomobject]@{ state='publish_intent'; intent=$Intent; evidence=$null; publishIntentUtc=[DateTimeOffset]::UtcNow.ToString('o') }
  if ($PostFormat -ceq 'link_card') { $Receipt.entries.$Language | Add-Member -NotePropertyName postFormat -NotePropertyValue $PostFormat; $Receipt.entries.$Language | Add-Member -NotePropertyName cardUrl -NotePropertyValue $CardUrl }
  Save-FacebookReceipt $Receipt $Path
}

# 2026-11-21 (Terry): Facebook posts are link posts. The frozen intent (text, image, SHA) is
# unchanged so selection, no-reuse and canonical checks stay exactly as before; the composer
# text swaps the plain game URL for the per-image X website card URL (same UTM), and no photo
# is uploaded. Facebook builds the large preview from the card's og:image. If the card or its
# preview is unavailable the same slot falls back to the photo post.
$script:FacebookLinkCardEnabled = $true
$script:FacebookLinkCardBaseUrl = 'https://escapezombie.com'
$script:FacebookLinkPreviewTimeoutSeconds = 25
function Get-FacebookEntryPostFormat($Entry) {
  if ($null -ne $Entry -and $Entry.PSObject.Properties.Name -contains 'postFormat') { return [string]$Entry.postFormat }
  'photo'
}
function Get-FacebookCampaignQuery([string]$Language) { '?utm_source=fb&utm_medium=social&utm_campaign=daily_' + $Language }
function Get-FacebookCardUrl($Intent) {
  $language = [string]$Intent.language; $sha = [string]$Intent.imageSha256
  if ($language -notin $script:FacebookLanguages) { throw 'Link card requires a known intent language' }
  if ($sha -notmatch '^[0-9a-f]{64}$') { throw 'Link card requires the frozen lowercase image SHA-256' }
  $script:FacebookLinkCardBaseUrl.TrimEnd('/') + '/share/x/' + $language + '/' + $sha.Substring(0, 16)
}
function Get-FacebookLinkPostText($Intent) {
  $language = [string]$Intent.language; $text = [string]$Intent.text
  $gameUrl = 'https://escapezombie.com/' + (Get-FacebookCampaignQuery $language)
  if ([regex]::Matches($text, [regex]::Escape($gameUrl)).Count -ne 1) { throw 'LINK_CARD_UNAVAILABLE: frozen copy does not contain its campaign game URL exactly once' }
  $linkText = $text.Replace($gameUrl, (Get-FacebookCardUrl $Intent) + (Get-FacebookCampaignQuery $language))
  if (-not $linkText.Contains($script:FacebookPlayUrl)) { throw 'Link post copy lost its Play URL' }
  $linkText
}
function Test-FacebookLinkCardHtml([string]$Html, [string]$CardUrl) {
  $meta = @{}
  foreach ($tag in [regex]::Matches($Html, '<meta\b[^>]*>', [Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    $attributes = @{}
    foreach ($attribute in [regex]::Matches($tag.Value, '(?<name>[\w:-]+)\s*=\s*(?:"(?<double>[^"]*)"|''(?<single>[^'']*)'')')) {
      $value = if ($attribute.Groups['double'].Success) { $attribute.Groups['double'].Value } else { $attribute.Groups['single'].Value }
      $attributes[$attribute.Groups['name'].Value.ToLowerInvariant()] = [Net.WebUtility]::HtmlDecode($value)
    }
    if ($attributes.ContainsKey('property') -and $attributes.ContainsKey('content')) { $meta[[string]$attributes['property']] = [string]$attributes['content'] }
  }
  $path = ([uri]$CardUrl).AbsolutePath
  $okUrls = @($CardUrl, ('https://media.escapezombie.com' + $path))
  $okImages = @(($CardUrl + '.png'), ('https://media.escapezombie.com' + $path + '.png'))
  return ($meta.ContainsKey('og:url') -and $okUrls -ccontains $meta['og:url'] -and $meta.ContainsKey('og:image') -and $okImages -ccontains $meta['og:image'])
}
function Assert-FacebookLinkCardPublished([string]$CardUrl) {
  if ($CardUrl -notmatch '^https://escapezombie\.com/share/x/(ko|en|ja|vi)/[0-9a-f]{16}$') { throw 'LINK_CARD_UNAVAILABLE: card URL is not an exact locale/hash card' }
  try { $response = Invoke-WebRequest -Uri $CardUrl -UseBasicParsing -TimeoutSec 20 } catch { throw "LINK_CARD_UNAVAILABLE: card page is not reachable: $($_.Exception.Message)" }
  if ([int]$response.StatusCode -ne 200) { throw "LINK_CARD_UNAVAILABLE: card page returned HTTP $($response.StatusCode)" }
  if (-not (Test-FacebookLinkCardHtml ([string]$response.Content) $CardUrl)) { throw 'LINK_CARD_UNAVAILABLE: card page og:url/og:image do not match the exact card' }
}
function Assert-FacebookLinkDraft($Intent, [string]$ObservedText, [string]$ObservedAudience, [bool]$PreviewSeen) {
  if (-not (Test-FacebookIntent $Intent)) { throw 'Invalid frozen post intent' }
  if ((Normalize-FacebookText $ObservedText) -cne (Normalize-FacebookText (Get-FacebookLinkPostText $Intent))) { throw 'Link draft text must exactly match the frozen copy with its card URL' }
  if (-not $PreviewSeen) { throw 'LINK_PREVIEW_TIMEOUT: link preview is not visible in the composer' }
  if ($ObservedAudience -cne 'Friends') { throw 'Audience must remain Friends; public expansion is forbidden' }
}
function Complete-FacebookVerification($Receipt, [string]$Language, $Evidence, [string]$Path) {
  $entry = $Receipt.entries.$Language
  if ($null -eq $entry -or $entry.state -ne 'publish_intent') { throw 'Verification requires a persisted publish_intent' }
  if (-not (Test-FacebookEvidence $entry.intent $Evidence)) { throw 'Evidence must prove exact text, Friends audience, one image, and a Facebook permalink' }
  $entry.state = 'verified'; $entry.evidence = $Evidence; Save-FacebookReceipt $Receipt $Path
}
