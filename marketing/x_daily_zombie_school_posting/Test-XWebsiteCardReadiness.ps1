Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'XWebsiteCardReadiness.ps1')
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }

$cardUrl = 'https://escapezombie.com/share/x/ja/0123456789abcdef'
$global:expectedCardUrl = $cardUrl
function global:Invoke-WebRequest {
  param([string]$Uri, [switch]$UseBasicParsing, [int]$TimeoutSec, [switch]$DisableKeepAlive, [hashtable]$Headers)
  if (-not $UseBasicParsing -or $TimeoutSec -ne 20 -or $Uri -cne $global:expectedCardUrl -or -not $DisableKeepAlive -or $null -eq $Headers -or $Headers['Cache-Control'] -cne 'no-cache') { throw 'Unexpected readiness request parameters.' }
  $global:mockCalls++
  if ($global:mockSpaUntilCall -ge $global:mockCalls) { return [pscustomobject]@{ StatusCode=200; Headers=@{'Content-Type'='text/html'}; Content='<html><head><meta name="twitter:image" content="https://escapezombie.com/og-image.jpg"></head></html>' } }
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
  $global:mockCalls = 0; $global:mockSpaUntilCall = 0
  $ready = Assert-XWebsiteCardPublished $cardUrl
  Assert-True ($ready.statusCode -eq 200 -and $ready.imageUrl -ceq ($cardUrl + '.png')) 'exact published card metadata passes readiness check'

  $global:mockCalls = 0; $global:mockSpaUntilCall = 2
  $retried = Assert-XWebsiteCardPublished $cardUrl 6 0
  Assert-True ($retried.imageUrl -ceq ($cardUrl + '.png') -and $global:mockCalls -eq 3) 'an edge serving the SPA fallback is retried with no-cache on a fresh connection until the exact card answers'

  $global:mockCalls = 0; $global:mockSpaUntilCall = 0
  $global:mockSpaFallback = $true
  $spaRejected = $false; try { $null = Assert-XWebsiteCardPublished $cardUrl 3 0 } catch { $spaRejected = $true }
  Assert-True $spaRejected 'HTTP 200 SPA fallback without card metadata is rejected'

  $global:mockStatus = 404; $global:mockSpaFallback = $false
  $notFoundRejected = $false; try { $null = Assert-XWebsiteCardPublished $cardUrl 3 0 } catch { $notFoundRejected = $true }
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
