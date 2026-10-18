Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }

# Use actual image bytes and isolated receipt fixtures, never operational receipts.
$config = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'posting_config.json') | ConvertFrom-Json
$catalog = Get-PostingImageCatalog
$paths = @('image_pool/x/ja/vertical_comic_20261018/backlog_comic_20261015_01.png', 'image_pool/x/ja/vertical_comic_20261018/backlog_comic_20261015_02.png')
$hashes = @($paths | ForEach-Object { (Get-FileHash (Resolve-PostingImagePath $_) -Algorithm SHA256).Hash.ToLowerInvariant() })
$originalHash = (Get-FileHash (Resolve-PostingImagePath 'image_pool/x/ja/backlog_comic_20261015/01.png') -Algorithm SHA256).Hash.ToLowerInvariant()
$middleHash = (Get-FileHash (Resolve-PostingImagePath 'image_pool/x/ja/dialogue_filled_20261018/backlog_comic_20261015_01.png') -Algorithm SHA256).Hash.ToLowerInvariant()
$fixtureCatalog = [pscustomobject]@{ images=@(
  [pscustomobject]@{ platform='X';locale='ja';path=($paths[0] -replace '^image_pool/','');gameStartText=(Get-PostingGameStartText ja);sha256=$hashes[0];derivedFromSha256=$middleHash },
  [pscustomobject]@{ platform='X';locale='ja';path=($paths[1] -replace '^image_pool/','');gameStartText=(Get-PostingGameStartText ja);sha256=$hashes[1] },
  [pscustomobject]@{ platform='X';locale='ja';path='x/ja/dialogue_filled_20261018/backlog_comic_20261015_01.png';sha256=$middleHash;derivedFromSha256=$originalHash }
) }
$config.localized_social_image_pool.ja.images = $paths
$temp = Join-Path ([IO.Path]::GetTempPath()) ('posting-lineage-' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($temp)
try {
  $receiptPath = Join-Path $temp 'history.json'
  foreach ($historyHash in @($originalHash, $middleHash, $hashes[0])) {
    foreach ($state in @('publish_intent','verified')) {
      @{ entries=@{ ja=@{ state=$state;intent=@{ imageSha256=$historyHash;imagePath='retired/immutable.png' } } } } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
      $selected = Select-PostingLocaleImagePath $config ja '2099-01-01-0300' $temp X $fixtureCatalog @($temp)
      Assert-True ($selected -ceq (Resolve-PostingImagePath $paths[1])) "$state source/intermediate/edited consumption skips its derivative and selects next comic"
    }
  }
  @{ entries=@{ ja=@{ state='selected';intent=@{ imageSha256=$originalHash } } } } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
  Assert-True ((Select-PostingLocaleImagePath $config ja '2099-01-01-0300' $temp X $fixtureCatalog @($temp)) -ceq (Resolve-PostingImagePath $paths[0])) 'unclicked historical selection does not consume the comic'
  $fixtureCatalog.images[0].sha256 = '0' * 64
  $rejected = $false
  try { $null = Select-PostingLocaleImagePath $config ja '2099-01-01-0300' $temp X $fixtureCatalog @($temp) } catch { $rejected = $_.Exception.Message -like 'IMAGE_LINEAGE_INVALID:*' }
  Assert-True $rejected 'changed edited bytes cannot escape their catalog ancestry'
  $fixtureCatalog.images[0].sha256 = $hashes[0]
  $fixtureCatalog.images[2].derivedFromSha256 = $hashes[0]
  $rejected = $false
  try { $null = Select-PostingLocaleImagePath $config ja '2099-01-01-0300' $temp X $fixtureCatalog @($temp) } catch { $rejected = $_.Exception.Message -like 'IMAGE_LINEAGE_INVALID:*' }
  Assert-True $rejected 'cyclic ancestry fails closed'
} finally {
  $full = [IO.Path]::GetFullPath($temp)
  if ($full.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($full) -match '^posting-lineage-[a-f0-9]{32}$') { Remove-Item -LiteralPath $full -Recurse -Force }
}
