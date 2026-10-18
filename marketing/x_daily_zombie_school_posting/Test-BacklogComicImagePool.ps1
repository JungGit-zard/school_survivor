Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')

function Assert-True([bool]$Value, [string]$Name) {
  if (-not $Value) { throw "FAILED: $Name" }
  Write-Output "PASS $Name"
}

$collection = 'backlog_comic_20261015'
$locales = @('ko', 'en', 'ja', 'vi')
$platforms = @('X', 'Facebook')
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$catalog = Get-PostingImageCatalog
$rows = @($catalog.images | Where-Object { $_.collection -ceq $collection })
$expectedCta = @{
  ko = -join @([char]0xAC8C, [char]0xC784, [char]0xC2DC, [char]0xC791)
  en = 'START GAME'
  ja = -join @([char]0x30B2, [char]0x30FC, [char]0x30E0, [char]0x30B9, [char]0x30BF, [char]0x30FC, [char]0x30C8)
  vi = -join @([char]0x0042, [char]0x1EAE, [char]0x0054, [char]0x0020, [char]0x0110, [char]0x1EA6, [char]0x0055, [char]0x0020, [char]0x0043, [char]0x0048, [char]0x01A0, [char]0x0049)
}

Assert-True ($rows.Count -eq 80) 'catalog contains exactly 80 backlog comic assets'
$unique = @($rows | ForEach-Object { "$($_.platform)|$($_.locale)|$($_.path)" } | Select-Object -Unique)
Assert-True ($unique.Count -eq 80) 'all catalog platform/locale/path tuples are unique'

foreach ($platform in $platforms) {
  $folder = if ($platform -eq 'X') { 'x' } else { 'facebook' }
  foreach ($locale in $locales) {
    $localeRows = @($rows | Where-Object { $_.platform -ceq $platform -and $_.locale -ceq $locale })
    Assert-True ($localeRows.Count -eq 10) "$platform/$locale catalog has ten episodes"
    foreach ($episode in 1..10) {
      $filename = '{0:D2}.png' -f $episode
      $relative = "$folder/$locale/$collection/$filename"
      $matches = @($localeRows | Where-Object { $_.path -ceq $relative })
      Assert-True ($matches.Count -eq 1) "$platform/$locale/$filename has its canonical path"
      $row = $matches[0]
      Assert-True ($row.gameStartText -ceq $expectedCta[$locale]) "$platform/$locale/$filename has exact localized CTA metadata"
      Assert-True (@($row.dialogueWords).Count -eq 4) "$platform/$locale/$filename has four dialogue words"
      Assert-True (-not [string]::IsNullOrWhiteSpace([string]$row.story)) "$platform/$locale/$filename has an episode story id"
      $absolute = Resolve-PostingImagePath ("image_pool/$relative") -Platform $platform
      Assert-True (Test-Path -LiteralPath $absolute -PathType Leaf) "$platform/$locale/$filename exists"
      Assert-True (Test-PostingImageGameStartText ("image_pool/$relative") $locale $platform $catalog) "$platform/$locale/$filename passes exact CTA matcher"
    }

    $poolKey = if ($platform -eq 'X') { 'localized_social_image_pool' } else { 'facebook_rotation_image_pool' }
    $pool = @($config.$poolKey.$locale.images)
    $registered = @($pool | Where-Object { $_ -like "image_pool/$folder/$locale/$collection/*.png" -or $_ -like "image_pool/$folder/$locale/dialogue_filled_20261018/${collection}_*.png" })
    Assert-True ($registered.Count -eq 10) "$platform/$locale rotation pool registers ten backlog comics"
  }
}

Write-Output 'PASS all backlog comic image-pool checks'
