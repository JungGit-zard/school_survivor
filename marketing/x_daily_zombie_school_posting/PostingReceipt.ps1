# Pure receipt checks. Dot-sourcing this file never loads UI or changes the desktop.
function Get-PostingCycleId([DateTimeOffset]$Now, [string[]]$ScheduleTimes) {
  $kst = $Now.ToOffset([TimeSpan]::FromHours(9))
  $slots = @($ScheduleTimes | ForEach-Object { [DateTimeOffset]::ParseExact(($kst.ToString('yyyy-MM-dd') + ' ' + $_ + ' +09:00'), 'yyyy-MM-dd HH:mm zzz', [Globalization.CultureInfo]::InvariantCulture) } | Sort-Object)
  if ($slots.Count -eq 0) { throw 'No schedule slots configured' }
  $eligible = @($slots | Where-Object { $_ -le $kst })
  $slot = if ($eligible.Count) { $eligible[-1] } else { $slots[-1].AddDays(-1) }
  return $slot.ToString('yyyy-MM-dd-HHmm')
}
function Get-CopyDigest([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
function Normalize-PostText([string]$Text) { return ([regex]::Replace($Text, '\s+', ' ')).Trim() }
function Test-PublishedEvidence($Intent, $Evidence) {
  if ($null -eq $Intent -or $null -eq $Evidence) { return $false }
  if ($Evidence.account -cne '@jungsilx' -or $Evidence.hasPhoto -ne $true) { return $false }
  if ($Evidence.url -notmatch '^https://x\.com/jungsilx/status/([0-9]+)$') { return $false }
  $id = [long]$Matches[1]
  $created = [DateTimeOffset]::FromUnixTimeMilliseconds(($id -shr 22) + 1288834974657L)
  if ($created -lt [DateTimeOffset]::Parse($Intent.createdUtc)) { return $false }
  if (@($Intent.baselineUrls) -contains $Evidence.url) { return $false }
  if ((Normalize-PostText $Evidence.text) -cne (Normalize-PostText $Intent.text)) { return $false }
  if ($Evidence.imageSha256 -cne $Intent.imageSha256 -or $Intent.attachmentCount -ne 1) { return $false }
  return $true
}
function Test-CycleComplete($Receipt, [string[]]$Languages = @('ja','en','vi','ko')) {
  $urls = @()
  foreach ($language in $Languages) {
    $entry = $Receipt.entries.$language
    if ($null -eq $entry -or $entry.state -ne 'verified' -or -not (Test-PublishedEvidence $entry.intent $entry.evidence)) { return $false }
    if ($urls -contains $entry.evidence.url) { return $false }
    $urls += $entry.evidence.url
  }
  return $true
}
function Save-CycleReceipt($Receipt, [string]$Path) {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $temporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Receipt | ConvertTo-Json -Depth 20))
  $stream = [IO.File]::Open($temporary, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
  if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temporary, $Path, [NullString]::Value) }
  else { [IO.File]::Move($temporary, $Path) }
}
