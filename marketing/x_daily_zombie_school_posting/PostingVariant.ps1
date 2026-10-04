# Pure campaign pair selection; never opens UI or writes receipts.
function Get-PostingVariants($Config, [string]$Language, [switch]$IncludeDisabled) {
  [pscustomobject]@{ id='original'; enabled=$true; text=[string]$Config.copy.$Language.text; imagePath=[string]$Config.image_pool.$Language.images[0] }
  if ($Config.PSObject.Properties.Name -contains 'variants') {
    foreach ($variant in @($Config.variants.$Language)) {
      if ($IncludeDisabled -or $variant.enabled -eq $true) { $variant }
    }
  }
  if ($Config.image_pool.PSObject.Properties.Name -contains 'boss_series') {
    foreach ($boss in @($Config.image_pool.boss_series.images)) {
      if ($IncludeDisabled -or $boss.enabled -eq $true) {
        [pscustomobject]@{ id=[string]$boss.id; enabled=[bool]$boss.enabled; text=[string]$Config.copy.$Language.text; imagePath=[string]$boss.imagePath }
      }
    }
  }
}
function Get-XWeightedLength([string]$Text) {
  $withoutUrls = [regex]::Replace($Text, 'https?://[^\s]+', ('x' * 23))
  $length = 0
  for ($i=0; $i -lt $withoutUrls.Length; $i++) {
    $point = [char]::ConvertToUtf32($withoutUrls, $i)
    if ($point -gt 0xffff) { $i++ }
    # X single-weight Unicode ranges; all other code points conservatively cost 2.
    if ($point -le 0x10ff -or ($point -ge 0x2000 -and $point -le 0x200d) -or ($point -ge 0x2010 -and $point -le 0x201f) -or ($point -ge 0x2032 -and $point -le 0x2037)) { $length++ } else { $length += 2 }
  }
  return $length
}
function Assert-PostingTextLinks($Config, [string]$Text, [string]$Name) {
  $webUrl = [string]$Config.web_url
  $playUrl = [string]$Config.play_store_url
  if ($webUrl -cne 'https://escapezombie.com') { throw 'Unexpected campaign web URL' }
  if ([regex]::Matches($Text, [regex]::Escape($webUrl)).Count -ne 1 -or [regex]::Matches($Text, [regex]::Escape($playUrl)).Count -ne 1) { throw "$Name must contain each campaign URL exactly once" }
  if ($Text.IndexOf($webUrl, [StringComparison]::Ordinal) -ge $Text.IndexOf($playUrl, [StringComparison]::Ordinal)) { throw "$Name must place the web URL before the Play URL" }
}
function Assert-PostingVariants($Config) {
  foreach ($lang in $Config.language_order) {
    $ids = @()
    foreach ($variant in @(Get-PostingVariants $Config $lang -IncludeDisabled)) {
      if ($variant.id -notmatch '^[a-z][a-z0-9_-]*$' -or $ids -contains $variant.id) { throw "Invalid or duplicate variant ID for $lang" }
      $ids += $variant.id
      if ([string]::IsNullOrWhiteSpace($variant.text) -or -not $variant.text.Contains($Config.copy.$lang.hashtag)) { throw "Incomplete $lang/$($variant.id) copy" }
      Assert-PostingTextLinks $Config ([string]$variant.text) "$lang/$($variant.id)"
      if ((Get-XWeightedLength $variant.text) -gt 280) { throw "Overlong $lang/$($variant.id) copy" }
      if ([string]::IsNullOrWhiteSpace($variant.imagePath)) { throw "Missing $lang/$($variant.id) image mapping" }
    }
  }
}
function Resolve-PostingIntentVariant($Config, [string]$Language, $Intent) {
  $matches = @(Get-PostingVariants $Config $Language -IncludeDisabled | Where-Object { $_.text -ceq $Intent.text -and $_.imagePath -ceq $Intent.imagePath })
  if ($matches.Count -ne 1) { throw "Receipt config mismatch for $Language" }
  if ($Intent.PSObject.Properties.Name -contains 'variantId' -and $Intent.variantId -cne $matches[0].id) { throw "Receipt variant mismatch for $Language" }
  return $matches[0]
}
function Select-PostingVariant($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, $ExistingIntent = $null) {
  if ($null -ne $ExistingIntent) { return Resolve-PostingIntentVariant $Config $Language $ExistingIntent }
  $variants = @(Get-PostingVariants $Config $Language)
  $ordinal = 0L
  if ($CycleId -match '^(\d{4}-\d{2}-\d{2})-(\d{4})$') {
    $day = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
    $slot = $Matches[2].Insert(2, ':')
    $slots = @($Config.schedule_times | Sort-Object)
    $index = [array]::IndexOf($slots, $slot)
    if ($index -lt 0) { throw 'CycleId must use a configured schedule slot' }
    $ordinal = [long]($day - [datetime]'2026-09-06').TotalDays * $slots.Count + $index
  } else {
    $ordinal = [Convert]::ToInt64((Get-CopyDigest $CycleId).Substring(0, 12), 16)
  }
  $index = [int](($ordinal % $variants.Count + $variants.Count) % $variants.Count)
  # Respect the last actual selection too, including a missed slot or a newly enabled set.
  if ($variants.Count -gt 1 -and (Test-Path -LiteralPath $ReceiptDirectory)) {
    $previousReceipts = @(Get-ChildItem -LiteralPath $ReceiptDirectory -Filter '*.json' -File | Where-Object { $_.BaseName -match '^\d{4}-\d{2}-\d{2}-\d{4}$' -and $_.BaseName -clt $CycleId } | Sort-Object BaseName -Descending)
    foreach ($previous in $previousReceipts) {
      $prior = Get-Content -LiteralPath $previous.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      $entry = $prior.entries.$Language
      if ($null -ne $entry) {
        $priorId = [string]$entry.intent.variantId
        if (-not [string]::IsNullOrWhiteSpace($priorId) -and @($variants | Where-Object { $_.id -ceq $priorId }).Count -eq 1 -and $variants[$index].id -ceq $priorId) { $index = ($index + 1) % $variants.Count }
        break
      }
    }
  }
  return $variants[$index]
}
