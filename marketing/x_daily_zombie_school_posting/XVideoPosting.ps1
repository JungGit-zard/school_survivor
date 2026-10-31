# Pure X video-slot helpers. Dot-sourcing this file never loads UI, writes receipts, or changes the desktop.
# Terry 2026-10-31: one of the two daily X posts per language is a native video (21:00 KST); 03:00 stays a website card.
function Get-XVideoPoolRoot { return [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'video_pool')) }
function Get-XCyclePostFormat([string]$CycleId) {
  # Terry 2026-10-31 night: video off after the 21:00 failure; every slot is a website card again.
  # To resume video: if ($CycleId -match '^\d{4}-\d{2}-\d{2}-2100$') { return 'video' }
  return 'website_card'
}
function Get-XVideoClips([string]$Root = (Get-XVideoPoolRoot)) {
  if (-not (Test-Path -LiteralPath $Root -PathType Container)) { return @() }
  return @(Get-ChildItem -LiteralPath $Root -Filter '*.mp4' -File | Sort-Object Name | ForEach-Object { $_.FullName })
}
function Resolve-XVideoClipPath([string]$Path, [string]$Root = (Get-XVideoPoolRoot)) {
  if ([string]::IsNullOrWhiteSpace($Path)) { throw 'Video clip path is empty.' }
  $full = [IO.Path]::GetFullPath($Path)
  $prefix = $Root.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or $full -notmatch '\.mp4$') { throw 'Video clip must be an .mp4 under the X video_pool root.' }
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Video clip is missing: $full" }
  return $full
}
function Select-XVideoClip([string]$Language, [string]$CycleId, [string[]]$ReceiptDirectories, [string]$Root = (Get-XVideoPoolRoot)) {
  # Least-recently-posted clip for this language: unused clips first (pool order), and never the
  # language's previous video while another clip exists.  Only submitted posts count as history.
  $clips = @(Get-XVideoClips $Root)
  if ($clips.Count -eq 0) { throw 'VIDEO_POOL_EMPTY: no .mp4 clips in the X video_pool.' }
  $hashes = @{}
  foreach ($clip in $clips) { $hashes[$clip] = (Get-FileHash -LiteralPath $clip -Algorithm SHA256).Hash.ToLowerInvariant() }
  $lastUsed = @{}
  foreach ($directory in @($ReceiptDirectories | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) { continue }
    foreach ($file in @(Get-ChildItem -LiteralPath $directory -Filter '*.json' -File | Where-Object { $_.BaseName -match '^\d{4}-\d{2}-\d{2}-\d{4}$' -and $_.BaseName -cne $CycleId })) {
      try { $receipt = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } catch { continue }
      if ($null -eq $receipt -or $receipt.PSObject.Properties.Name -notcontains 'entries' -or $null -eq $receipt.entries -or $receipt.entries.PSObject.Properties.Name -notcontains $Language) { continue }
      $entry = $receipt.entries.$Language
      if ($null -eq $entry -or $entry.PSObject.Properties.Name -notcontains 'intent' -or $null -eq $entry.intent -or $entry.state -notin @('publish_intent','verified')) { continue }
      $intent = $entry.intent
      if ($intent.PSObject.Properties.Name -notcontains 'postFormat' -or [string]$intent.postFormat -cne 'video' -or $intent.PSObject.Properties.Name -notcontains 'videoSha256') { continue }
      $hash = ([string]$intent.videoSha256).ToLowerInvariant()
      if (-not $lastUsed.ContainsKey($hash) -or [string]::CompareOrdinal($file.BaseName, [string]$lastUsed[$hash]) -gt 0) { $lastUsed[$hash] = $file.BaseName }
    }
  }
  foreach ($clip in $clips) { if (-not $lastUsed.ContainsKey($hashes[$clip])) { return $clip } }
  $mostRecent = $null
  foreach ($key in @($lastUsed.Keys)) { if ($null -eq $mostRecent -or [string]::CompareOrdinal([string]$lastUsed[$key], [string]$lastUsed[$mostRecent]) -gt 0) { $mostRecent = $key } }
  $pick = $null
  foreach ($clip in $clips) {
    if ($clips.Count -gt 1 -and $hashes[$clip] -ceq $mostRecent) { continue }
    if ($null -eq $pick -or [string]::CompareOrdinal([string]$lastUsed[$hashes[$clip]], [string]$lastUsed[$hashes[$pick]]) -lt 0) { $pick = $clip }
  }
  return $pick
}
function Get-XVideoComposerText([string]$SourceText, [string]$WebUrl, [string]$PlayUrl, [string]$Language) {
  # Same localized variant copy; the bare web URL gains UTM only (no share card URL for a video post).
  if ([regex]::Matches($SourceText, [regex]::Escape($WebUrl)).Count -ne 1) { throw 'Video source copy must contain exactly one canonical web URL' }
  $text = $SourceText.Replace($WebUrl, $WebUrl.TrimEnd('/') + '/?utm_source=x&utm_medium=social&utm_campaign=daily_' + $Language)
  if ([regex]::Matches($text, [regex]::Escape($PlayUrl)).Count -ne 1 -or $text.Contains('/share/x/')) { throw 'Video copy must keep the Play URL once and carry no share-card URL' }
  if ((Get-XWeightedLength $text) -gt 280) { throw 'Video copy exceeds the X weighted character limit' }
  return $text
}
function New-XVideoIntent([string]$Language, [string]$VariantId, [string]$Text, [string]$SourceText, [string]$VideoPath, [string]$VideoSha256, [string[]]$BaselineUrls = @(), [string]$PreparedUtc = $null) {
  # imagePath/imageSha256 stay present (null) so StrictMode readers of older receipt shapes never crash.
  return [pscustomobject]@{ language=$Language; variantId=$VariantId; text=$Text; sourceText=$SourceText; textSha256=(Get-CopyDigest $Text); imagePath=$null; imageSha256=$null; videoPath=$VideoPath; videoSha256=$VideoSha256; attachmentCount=1; postFormat='video'; cardUrl=$null; baselineUrls=@($BaselineUrls); createdUtc=[DateTimeOffset]::UtcNow.ToString('o'); preparedUtc=$PreparedUtc }
}
