Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'XWebsiteCardReadiness.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }

$cardUrl = 'https://escapezombie.com/share/x/ja/0123456789abcdef'
$global:expectedCardUrl = $cardUrl
function global:Invoke-WebRequest {
  param([string]$Uri, [switch]$UseBasicParsing, [int]$TimeoutSec)
  if (-not $UseBasicParsing -or $TimeoutSec -ne 20 -or $Uri -cne $global:expectedCardUrl) { throw 'Unexpected readiness request parameters.' }
  if ($global:mockStatus -eq 404) { return [pscustomobject]@{ StatusCode=404; Headers=@{'Content-Type'='text/html'}; Content='not found' } }
  $body = if ($global:mockSpaFallback) {
    '<html><head><meta name="description" content="app"></head><body>SPA</body></html>'
  } else {
    '<html><head><meta property="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + $Uri + '.png"></head></html>'
  }
  return [pscustomobject]@{ StatusCode=200; Headers=@{'Content-Type'='text/html; charset=utf-8'}; Content=$body }
}

try {
  $global:mockStatus = 200; $global:mockSpaFallback = $false
  $ready = Assert-XWebsiteCardPublished $cardUrl
  Assert-True ($ready.statusCode -eq 200 -and $ready.imageUrl -ceq ($cardUrl + '.png')) 'exact published card metadata passes readiness check'

  $global:mockSpaFallback = $true
  $spaRejected = $false; try { $null = Assert-XWebsiteCardPublished $cardUrl } catch { $spaRejected = $true }
  Assert-True $spaRejected 'HTTP 200 SPA fallback without card metadata is rejected'

  $global:mockStatus = 404; $global:mockSpaFallback = $false
  $notFoundRejected = $false; try { $null = Assert-XWebsiteCardPublished $cardUrl } catch { $notFoundRejected = $true }
  Assert-True $notFoundRejected 'HTTP 404 is rejected before UI initialization'

  $runner = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1') -Raw -Encoding UTF8
  $saveIndex = $runner.IndexOf('Save-CycleReceipt $receipt $receiptPath', $runner.IndexOf('# Freeze every pair'))
  $preflightIndex = $runner.IndexOf('Assert-XWebsiteCardPublished ([string]$cardEntry.intent.cardUrl)', $saveIndex)
  $windowIndex = $runner.IndexOf('Initialize-XWindow -RequestedWindowId', $preflightIndex)
  Assert-True ($saveIndex -ge 0 -and $preflightIndex -gt $saveIndex -and $windowIndex -gt $preflightIndex) 'receipt is saved, then card HTTP readiness runs before Chrome initialization'
  Assert-True ($runner.Contains("`$cardEntry.state -in @('selected', 'prepared')") -and $runner.Contains("`$cardEntry.intent.postFormat -ceq 'website_card'")) 'preflight skips frozen publish_intent and photo receipts'
  Write-Output 'X_WEBSITE_CARD_READINESS_TEST_OK'
} finally {
  Remove-Item Function:\global:Invoke-WebRequest -ErrorAction SilentlyContinue
  Remove-Variable expectedCardUrl -Scope Global -ErrorAction SilentlyContinue
}
