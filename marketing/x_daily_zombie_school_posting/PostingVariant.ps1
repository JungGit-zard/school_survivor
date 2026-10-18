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
  $normalized = [regex]::Replace(($Path -replace '\\', '/'), '/{2,}', '/')
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
function Get-PostingLocaleImageCandidates($Config, [string]$Language, [switch]$IncludeLegacy, [switch]$RequireGameStartText, [ValidateSet('X','Facebook')][string]$Platform = 'X', $Catalog = $null) {
  $images = @()
  if ($Platform -eq 'Facebook' -and $Config.PSObject.Properties.Name -contains 'facebook_rotation_image_pool' -and
      $Config.facebook_rotation_image_pool.PSObject.Properties.Name -contains $Language) {
    $images += @($Config.facebook_rotation_image_pool.$Language.images)
  } elseif ($Platform -eq 'Facebook') {
    if ($null -eq $Catalog) { $Catalog = Get-PostingImageCatalog }
    $images += @($Catalog.images | Where-Object { $_.platform -ceq 'Facebook' -and $_.locale -ceq $Language -and $_.PSObject.Properties.Name -contains 'gameStartText' } | ForEach-Object { 'image_pool/' + [string]$_.path })
  }
  if ($IncludeLegacy) { $images += @($Config.image_pool.$Language.images) }
  if ($Platform -eq 'X' -and $Config.PSObject.Properties.Name -contains 'localized_social_image_pool' -and
      $Config.localized_social_image_pool.PSObject.Properties.Name -contains $Language) {
    $images += @($Config.localized_social_image_pool.$Language.images)
  }
  if ($RequireGameStartText -and $null -eq $Catalog) { $Catalog = Get-PostingImageCatalog }
  $valid = @()
  foreach ($image in $images) {
    $path = [string]$image
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $full = Resolve-PostingImagePath $path -Platform $Platform
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
    if ($full -notmatch '\.(png|jpg|jpeg|webp)$') { continue }
    if ($RequireGameStartText -and -not (Test-PostingImageGameStartText $full $Language -Platform $Platform -Catalog $Catalog)) { continue }
    $null = Get-FileHash -LiteralPath $full -Algorithm SHA256
    $valid += $full
  }
  return @($valid | Select-Object -Unique)
}
function Get-PostingPreviousImagePath($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, $Candidates, [ValidateSet('X','Facebook')][string]$Platform = 'X') {
  if (-not (Test-Path -LiteralPath $ReceiptDirectory)) { return $null }
  $receiptPattern=if($Platform -eq 'Facebook'){'^\d{4}-\d{2}-\d{2}-\d{4}(?:-[a-z0-9][a-z0-9_-]{0,48})?$'}else{'^\d{4}-\d{2}-\d{2}-\d{4}$'}
  $previousReceipts = @(Get-ChildItem -LiteralPath $ReceiptDirectory -Filter '*.json' -File | Where-Object { $_.BaseName -match $receiptPattern -and $_.BaseName -clt $CycleId } | Sort-Object BaseName -Descending)
  foreach ($previous in $previousReceipts) {
    $prior = Get-Content -LiteralPath $previous.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $entry = $prior.entries.$Language
    if ($null -ne $entry -and $null -ne $entry.intent) {
      try {
        $priorImage = Resolve-PostingImagePath ([string]$entry.intent.imagePath) -Platform $Platform
      } catch {
        # Old Facebook receipts can reference retired collections.  They are not
        # eligible current assets and therefore cannot participate in rotation.
        if ($Platform -eq 'Facebook') { continue }
        throw
      }
      if ($Platform -eq 'Facebook') {
        $catalog=Get-PostingImageCatalog;$poolRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool'))
        $relative=$priorImage.Substring($poolRoot.Length+1).Replace('\','/')
        $facebookRows=@($catalog.images|Where-Object{$_.platform -ceq 'Facebook' -and $_.locale -ceq $Language -and $_.path -ceq $relative})
        # A legacy Facebook receipt can point at an image collection that was later
        # removed from the active catalog.  It must not block a new, CTA-approved
        # selection; simply skip rotation exclusion when no unique current mapping
        # exists.
        if($facebookRows.Count -eq 1){
          $filename=[IO.Path]::GetFileName($facebookRows[0].path)
          $facebookCandidate=Resolve-PostingImagePath ('image_pool/'+[string]$facebookRows[0].path) -Platform Facebook
          if(@($Candidates|Where-Object{$_ -ceq $facebookCandidate}).Count -eq 1){$priorImage=$facebookCandidate}
          $xRows=@($catalog.images|Where-Object{$_.platform -ceq 'X' -and $_.locale -ceq $Language -and $_.collection -ceq $facebookRows[0].collection -and [IO.Path]::GetFileName($_.path) -ceq $filename})
          if($xRows.Count -eq 1 -and @($Candidates|Where-Object{$_ -ceq $priorImage}).Count -ne 1){$priorImage=Resolve-PostingImagePath ('image_pool/'+[string]$xRows[0].path) -Platform X}
        }
      }
      if (@($Candidates | Where-Object { $_ -ceq $priorImage }).Count -eq 1) { return $priorImage }
    }
  }
  return $null
}
function Get-PostingDefaultReceiptDirectories([ValidateSet('X','Facebook')][string]$Platform) {
  if ($Platform -eq 'X') { return @((Join-Path $PSScriptRoot 'receipts'), (Join-Path $PSScriptRoot '..\..\Developer\agent_room\x_posting_receipts')) }
  return @()
}
function Select-PostingLocaleImagePath($Config, [string]$Language, [string]$CycleId, [string]$ReceiptDirectory, [ValidateSet('X','Facebook')][string]$Platform = 'X', $Catalog = $null, $ReceiptDirectoryOverrides = $null) {
  $gatedCandidates = @(Get-PostingLocaleImageCandidates $Config $Language -RequireGameStartText -Platform $Platform -Catalog $Catalog)
  $pool = if ($Platform -eq 'Facebook' -and $Config.PSObject.Properties.Name -contains 'facebook_rotation_image_pool' -and $Config.facebook_rotation_image_pool.PSObject.Properties.Name -contains $Language) { @($Config.facebook_rotation_image_pool.$Language.images) } elseif ($Platform -eq 'X' -and $Config.PSObject.Properties.Name -contains 'localized_social_image_pool' -and $Config.localized_social_image_pool.PSObject.Properties.Name -contains $Language) { @($Config.localized_social_image_pool.$Language.images) } else { @() }
  $poolPaths = @($pool | ForEach-Object { Resolve-PostingImagePath ([string]$_) -Platform $Platform } | Select-Object -Unique)
  $candidates = if ($poolPaths.Count -gt 0) { @($poolPaths | Where-Object { $gatedCandidates -ccontains $_ }) } else { $gatedCandidates }
  if ($candidates.Count -eq 0) { throw "No confirmed localized game-start CTA images are eligible for $Platform/$Language." }
  $receiptSearchDirectories = @($ReceiptDirectory)
  if ($null -ne $ReceiptDirectoryOverrides) { $receiptSearchDirectories = @($ReceiptDirectoryOverrides) }
  elseif ($Platform -eq 'X') { $receiptSearchDirectories += @(Get-PostingDefaultReceiptDirectories $Platform) }
  $usedHashes = @{}
  $candidateHashes = @{}
  foreach ($candidate in $candidates) {
    $hash = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash
    $candidateHashes[$candidate] = $hash
  }
  foreach ($directory in @($receiptSearchDirectories | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) { continue }
    foreach ($file in @(Get-ChildItem -LiteralPath $directory -Filter '*.json' -File)) {
      try { $receipt = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } catch { continue }
      if ($null -eq $receipt -or $receipt.PSObject.Properties.Name -notcontains 'entries') { continue }
      $entry = $receipt.entries.$Language
      if ($null -eq $entry -or $entry.state -notin @('publish_intent','verified') -or $null -eq $entry.intent) { continue }
      $historyHash = ''
      foreach ($hashProperty in @('imageSha256','sha256')) {
        if ($entry.intent.PSObject.Properties.Name -contains $hashProperty) {
          $value = [string]$entry.intent.$hashProperty
          if ($value -match '^[A-Fa-f0-9]{64}$') { $historyHash = $value.ToLowerInvariant(); break }
        }
      }
      if ([string]::IsNullOrWhiteSpace($historyHash)) {
        $historyPath = [string]$entry.intent.imagePath
        $normalizedHistoryPath = [regex]::Replace(($historyPath -replace '\\', '/'), '/{2,}', '/')
        $historyMatch = [regex]::Match($normalizedHistoryPath, '(?:^|/)image_pool/(.+)$', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $historySuffix = if ($historyMatch.Success) { $historyMatch.Groups[1].Value } else { '' }
        $historyCatalog = if ($null -ne $Catalog) { $Catalog } else { Get-PostingImageCatalog }
        if (-not [string]::IsNullOrWhiteSpace($historySuffix) -and $historyCatalog.PSObject.Properties.Name -contains 'legacyImageHashes' -and $historyCatalog.legacyImageHashes.PSObject.Properties.Name -contains $historySuffix) {
          $legacyHash = [string]$historyCatalog.legacyImageHashes.$historySuffix
          if ($legacyHash -match '^[A-Fa-f0-9]{64}$') { $historyHash = $legacyHash.ToLowerInvariant() }
        }
        if ([string]::IsNullOrWhiteSpace($historyHash)) {
          try { $image = Resolve-PostingImagePath $historyPath -Platform $Platform } catch { throw "IMAGE_HISTORY_HASH_UNKNOWN: cannot resolve a posted image from receipt '$($file.FullName)' for $Platform/$Language." }
          if (-not (Test-Path -LiteralPath $image -PathType Leaf)) { throw "IMAGE_HISTORY_HASH_UNKNOWN: receipt image is missing and has no stored SHA256: '$($file.FullName)' for $Platform/$Language." }
          $historyHash = (Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant()
        }
      }
      $usedHashes[$historyHash] = $true
    }
  }
  foreach ($candidate in $candidates) {
    if (-not $usedHashes.ContainsKey($candidateHashes[$candidate])) { return [string]$candidate }
  }
  throw "IMAGE_POOL_EXHAUSTED: all unique SHA256 images are already used for $Platform/$Language."
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
  $previousOpening = $null
  # Respect the last actual selection too, including a missed slot or a newly enabled set.
  if ($variants.Count -gt 1 -and (Test-Path -LiteralPath $ReceiptDirectory)) {
    $receiptPattern=if($Platform -eq 'Facebook'){'^\d{4}-\d{2}-\d{2}-\d{4}(?:-[a-z0-9][a-z0-9_-]{0,48})?$'}else{'^\d{4}-\d{2}-\d{2}-\d{4}$'}
    $previousReceipts = @(Get-ChildItem -LiteralPath $ReceiptDirectory -Filter '*.json' -File | Where-Object { $_.BaseName -match $receiptPattern -and $_.BaseName -clt $CycleId } | Sort-Object BaseName -Descending)
    foreach ($previous in $previousReceipts) {
      $prior = Get-Content -LiteralPath $previous.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      $entry = $prior.entries.$Language
      if ($null -ne $entry -and $null -ne $entry.intent) {
        $priorId = [string]$entry.intent.variantId
        $previousOpening = (([string]$entry.intent.text -split '\r?\n')[0]).Trim()
        if (-not [string]::IsNullOrWhiteSpace($priorId) -and @($variants | Where-Object { $_.id -ceq $priorId }).Count -eq 1 -and $variants[$index].id -ceq $priorId) { $index = ($index + 1) % $variants.Count }
        break
      }
    }
  }
  if (-not [string]::IsNullOrWhiteSpace($previousOpening)) {
    for ($offset = 0; $offset -lt $variants.Count; $offset++) {
      $candidateOpening = (([string]$variants[$index].text -split '\r?\n')[0]).Trim()
      if ($candidateOpening -cne $previousOpening) { break }
      $index = ($index + 1) % $variants.Count
    }
    if ((([string]$variants[$index].text -split '\r?\n')[0]).Trim() -ceq $previousOpening) { throw "No non-repeating opening copy is available for $Platform/$Language." }
  }
  $selected = $variants[$index]
  $selected.imagePath = Select-PostingLocaleImagePath $Config $Language $CycleId $ReceiptDirectory $Platform
  return $selected
}
