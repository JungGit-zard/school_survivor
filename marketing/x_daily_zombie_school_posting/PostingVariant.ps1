# Pure campaign pair selection; never opens UI or writes receipts.
function Get-PostingImageCatalog {
  $path = Join-Path $PSScriptRoot 'image_pool/image_catalog.json'
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'Social image catalog is missing.' }
  return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
}
function Resolve-PostingImagePath([string]$Path, [ValidateSet('X','Facebook')][string]$Platform = 'X') {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $Path }
  $root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool'))
  $rootPrefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  $normalized = $Path -replace '\\', '/'
  $match = [regex]::Match($normalized, '(?:^|/)image_pool/(.+)$', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $suffix = if ($match.Success) { $match.Groups[1].Value } else { $normalized.TrimStart('/') }
  $catalog = Get-PostingImageCatalog
  if ($catalog.legacyPaths.PSObject.Properties.Name -contains $suffix) { $suffix = [string]$catalog.legacyPaths.$suffix }
  elseif (-not $suffix.StartsWith('x/', [StringComparison]::OrdinalIgnoreCase) -and
          -not $suffix.StartsWith('facebook/', [StringComparison]::OrdinalIgnoreCase) -and
          -not $suffix.StartsWith('reference/', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Image path is not canonical and has no explicit legacy mapping.'
  }
  if ($suffix -match '(^|/)\.\.(/|$)' -or $suffix -match '^[A-Za-z]:') { throw 'Image path traversal or absolute suffix is forbidden.' }
  $platformRoot = if ($Platform -eq 'Facebook') { 'facebook/' } else { 'x/' }
  $isLegacy = $catalog.legacyPaths.PSObject.Properties.Name -contains $(if ($match.Success) { $match.Groups[1].Value } else { $normalized.TrimStart('/') })
  if ($Platform -eq 'X' -and $suffix.StartsWith('facebook/', [StringComparison]::OrdinalIgnoreCase)) { throw 'X cannot resolve Facebook-owned images.' }
  if ($Platform -eq 'Facebook' -and $suffix.StartsWith('x/', [StringComparison]::OrdinalIgnoreCase) -and -not $isLegacy) { throw 'Facebook cannot resolve X-owned images outside an explicit legacy receipt mapping.' }
  if ($Platform -eq 'Facebook' -and -not $isLegacy -and -not $suffix.StartsWith($platformRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Facebook images must be under the Facebook platform root.' }
  if ($Platform -eq 'X' -and -not $suffix.StartsWith('x/', [StringComparison]::OrdinalIgnoreCase) -and -not $suffix.StartsWith('reference/', [StringComparison]::OrdinalIgnoreCase)) { throw 'X images must be under the X or shared-reference root.' }
  $resolved = [IO.Path]::GetFullPath((Join-Path $root ($suffix -replace '/', [IO.Path]::DirectorySeparatorChar)))
  if (-not $resolved.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Configured image path escapes the campaign image_pool root.' }
  return $resolved
}
function Get-PostingVariants($Config, [string]$Language, [switch]$IncludeDisabled) {
  [pscustomobject]@{ id='original'; enabled=$true; text=[string]$Config.copy.$Language.text; imagePath=(Resolve-PostingImagePath ([string]$Config.image_pool.$Language.images[0])) }
  if ($Config.PSObject.Properties.Name -contains 'variants') {
    foreach ($variant in @($Config.variants.$Language)) {
      if ($IncludeDisabled -or $variant.enabled -eq $true) {
        [pscustomobject]@{ id=[string]$variant.id; enabled=[bool]$variant.enabled; text=[string]$variant.text; imagePath=(Resolve-PostingImagePath ([string]$variant.imagePath)) }
      }
    }
  }
  if ($Config.image_pool.PSObject.Properties.Name -contains 'boss_series') {
    foreach ($boss in @($Config.image_pool.boss_series.images)) {
      if ($IncludeDisabled -or $boss.enabled -eq $true) {
        [pscustomobject]@{ id=[string]$boss.id; enabled=[bool]$boss.enabled; text=[string]$Config.copy.$Language.text; imagePath=(Resolve-PostingImagePath ([string]$boss.imagePath)) }
      }
    }
  }
}
function Get-PostingGameStartText([string]$Language) {
  switch ($Language) {
    'ko' { return (-join @(0xAC8C,0xC784,0xC2DC,0xC791 | ForEach-Object { [char]$_ })) }
    'en' { return 'START GAME' }
    'ja' { return (-join @(0x30B2,0x30FC,0x30E0,0x30B9,0x30BF,0x30FC,0x30C8 | ForEach-Object { [char]$_ })) }
    'vi' { return (-join @(0x0042,0x1EAE,0x0054,0x0020,0x0110,0x1EA6,0x0055,0x0020,0x0043,0x0048,0x01A0,0x0049 | ForEach-Object { [char]$_ })) }
    default { throw "Unsupported game-start CTA locale '$Language'" }
  }
}
function Test-PostingImageGameStartText([string]$ImagePath, [ValidateSet('ko','en','ja','vi')][string]$Language, [ValidateSet('X','Facebook')][string]$Platform = 'X', $Catalog = $null) {
  if ($null -eq $Catalog) { $Catalog = Get-PostingImageCatalog }
  $full = Resolve-PostingImagePath $ImagePath -Platform $Platform
  $root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool'))
  $relative = $full.Substring($root.Length + 1).Replace([string][char]92,'/')
  $rows = @($Catalog.images | Where-Object { $_.platform -ceq $Platform -and $_.locale -ceq $Language -and $_.path -ceq $relative })
  if ($rows.Count -ne 1 -or $rows[0].PSObject.Properties.Name -notcontains 'gameStartText') { return $false }
  return ([string]$rows[0].gameStartText -ceq (Get-PostingGameStartText $Language))
}
function Assert-PostingImageGameStartText([string]$ImagePath, [ValidateSet('ko','en','ja','vi')][string]$Language, [ValidateSet('X','Facebook')][string]$Platform = 'X', $Catalog = $null) {
  if (-not (Test-PostingImageGameStartText $ImagePath $Language $Platform $Catalog)) { throw "Image is not confirmed to contain the exact localized game-start CTA for $Platform/$Language; refusing to continue." }
}
function Get-PostingLocaleImageCandidates($Config, [string]$Language, [switch]$IncludeLegacy, [switch]$RequireGameStartText, $Catalog = $null) {
  $images = @()
  if ($IncludeLegacy) { $images += @($Config.image_pool.$Language.images) }
  if ($Config.PSObject.Properties.Name -contains 'localized_social_image_pool' -and
      $Config.localized_social_image_pool.PSObject.Properties.Name -contains $Language) {
    $images += @($Config.localized_social_image_pool.$Language.images)
  }
  if ($RequireGameStartText -and $null -eq $Catalog) { $Catalog = Get-PostingImageCatalog }
  $valid = @()
  foreach ($image in $images) {
    $path = [string]$image
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $full = Resolve-PostingImagePath $path
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
    if ($full -notmatch '\.(png|jpg|jpeg|webp)$') { continue }
    if ($RequireGameStartText -and -not (Test-PostingImageGameStartText $full $Language -Platform X -Catalog $Catalog)) { continue }
    $null = Get-FileHash -LiteralPath $full -Algorithm SHA256
    $valid += $full
  }
  return @($valid | Select-Object -Unique)
}
function Get-PostingPreviousImagePath($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, $Candidates, [ValidateSet('X','Facebook')][string]$Platform = 'X') {
  if (-not (Test-Path -LiteralPath $ReceiptDirectory)) { return $null }
  $previousReceipts = @(Get-ChildItem -LiteralPath $ReceiptDirectory -Filter '*.json' -File | Where-Object { $_.BaseName -match '^\d{4}-\d{2}-\d{2}-\d{4}$' -and $_.BaseName -clt $CycleId } | Sort-Object BaseName -Descending)
  foreach ($previous in $previousReceipts) {
    $prior = Get-Content -LiteralPath $previous.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $entry = $prior.entries.$Language
    if ($null -ne $entry -and $null -ne $entry.intent) {
      $priorImage = Resolve-PostingImagePath ([string]$entry.intent.imagePath) -Platform $Platform
      if ($Platform -eq 'Facebook') {
        $catalog=Get-PostingImageCatalog;$poolRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool'))
        $relative=$priorImage.Substring($poolRoot.Length+1).Replace('\','/')
        $facebookRows=@($catalog.images|Where-Object{$_.platform -ceq 'Facebook' -and $_.locale -ceq $Language -and $_.path -ceq $relative})
        if($facebookRows.Count -ne 1){throw "Prior Facebook image is not uniquely catalogued for $Language"}
        $filename=[IO.Path]::GetFileName($facebookRows[0].path)
        $xRows=@($catalog.images|Where-Object{$_.platform -ceq 'X' -and $_.locale -ceq $Language -and $_.collection -ceq $facebookRows[0].collection -and [IO.Path]::GetFileName($_.path) -ceq $filename})
        if($xRows.Count -ne 1){throw "Prior Facebook image has no unique X candidate mapping for $Language"}
        $priorImage=Resolve-PostingImagePath ('image_pool/'+[string]$xRows[0].path) -Platform X
      }
      if (@($Candidates | Where-Object { $_ -ceq $priorImage }).Count -eq 1) { return $priorImage }
    }
  }
  return $null
}
function Select-PostingLocaleImagePath($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, [ValidateSet('X','Facebook')][string]$Platform = 'X', $Catalog = $null) {
  $candidates = @(Get-PostingLocaleImageCandidates $Config $Language -RequireGameStartText -Catalog $Catalog)
  if ($candidates.Count -eq 0) { throw "No confirmed localized game-start CTA images are eligible for $Platform/$Language." }
  $usable = @($candidates)
  $previous = Get-PostingPreviousImagePath $Config $Language $CycleId $ReceiptDirectory $candidates $Platform
  if ($usable.Count -gt 1 -and -not [string]::IsNullOrWhiteSpace($previous)) { $usable = @($usable | Where-Object { $_ -cne $previous }) }
  return [string]($usable | Get-Random -Count 1)
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
    $pool = @(Get-PostingLocaleImageCandidates $Config $lang)
    if ($Config.PSObject.Properties.Name -contains 'localized_social_image_pool' -and $pool.Count -eq 0) { throw "No verified localized social image candidates for $lang" }
  }
}
function Resolve-PostingIntentVariant($Config, [string]$Language, $Intent) {
  $intentImage = Resolve-PostingImagePath ([string]$Intent.imagePath)
  $allVariants = @(Get-PostingVariants $Config $Language -IncludeDisabled)
  if ($Intent.PSObject.Properties.Name -contains 'variantId' -and -not [string]::IsNullOrWhiteSpace([string]$Intent.variantId)) {
    $matchingVariants = @($allVariants | Where-Object { $_.id -ceq [string]$Intent.variantId -and $_.text -ceq $Intent.text })
  } else {
    $matchingVariants = @($allVariants | Where-Object { $_.id -ceq 'original' -and $_.text -ceq $Intent.text -and (Resolve-PostingImagePath ([string]$_.imagePath)) -ceq $intentImage })
    if ($matchingVariants.Count -eq 0) { $matchingVariants = @($allVariants | Where-Object { $_.text -ceq $Intent.text -and (Resolve-PostingImagePath ([string]$_.imagePath)) -ceq $intentImage }) }
  }
  if ($matchingVariants.Count -ne 1) { throw "Receipt config mismatch for $Language" }
  $allowedImages = @(Get-PostingLocaleImageCandidates $Config $Language -IncludeLegacy) + @($allVariants | ForEach-Object { Resolve-PostingImagePath ([string]$_.imagePath) })
  if (@($allowedImages | Select-Object -Unique | Where-Object { $_ -ceq $intentImage }).Count -ne 1) { throw "Receipt image is not in the verified $Language image pool" }
  $matchingVariants[0].imagePath = $intentImage
  return $matchingVariants[0]
}
function Select-PostingVariant($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, $ExistingIntent = $null, [ValidateSet('X','Facebook')][string]$Platform = 'X') {
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
  $selected = $variants[$index]
  $selected.imagePath = Select-PostingLocaleImagePath $Config $Language $CycleId $ReceiptDirectory $Platform
  return $selected
}
