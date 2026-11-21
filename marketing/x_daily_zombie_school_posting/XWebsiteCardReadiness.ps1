Set-StrictMode -Version Latest

function Assert-XWebsiteCardPublished([string]$CardUrl, [int]$Attempts = 6, [int]$RetryDelaySeconds = 3) {
  # 2026-11-21: some Cloudflare edges (NRT) briefly answer a fresh /share/ card with the game's
  # SPA fallback page (generic og-image) while others (HKG, US) already serve the card. Ask for
  # an uncached copy and retry a few times; the exact-image check itself is unchanged.
  $lastError = $null
  for ($attempt = 1; $attempt -le [Math]::Max(1, $Attempts); $attempt++) {
    try { return (Assert-XWebsiteCardPublishedOnce $CardUrl) }
    catch {
      $lastError = $_
      if ($_.Exception.Message -match 'approved exact locale/hash card URL') { throw }
      if ($attempt -lt $Attempts) { Start-Sleep -Seconds $RetryDelaySeconds }
    }
  }
  throw $lastError
}

function Assert-XWebsiteCardPublishedOnce([string]$CardUrl) {
  $uri = $null
  if (-not [Uri]::TryCreate($CardUrl, [UriKind]::Absolute, [ref]$uri) -or
      $uri.Scheme -cne 'https' -or
      $uri.Host -notin @('escapezombie.com', 'escape-zombie-school-assets.web.app') -or
      $uri.AbsolutePath -notmatch '^/share/x/(ko|en|ja|vi)/[0-9a-f]{16}$' -or
      $uri.Query -or $uri.Fragment) {
    throw 'X card readiness requires an approved exact locale/hash card URL.'
  }

  try {
    $response = Invoke-WebRequest -Uri $uri.AbsoluteUri -UseBasicParsing -TimeoutSec 20 -Headers @{ 'Cache-Control' = 'no-cache'; 'Pragma' = 'no-cache' }
  } catch {
    throw "X website card is not publicly reachable: $($_.Exception.Message)"
  }

  if ([int]$response.StatusCode -ne 200) { throw "X website card returned HTTP $($response.StatusCode), expected 200." }
  $contentType = [string]$response.Headers['Content-Type']
  if ([string]::IsNullOrWhiteSpace($contentType) -and $response.PSObject.Properties.Name -contains 'ContentType') {
    $contentType = [string]$response.ContentType
  }
  if ($contentType -notmatch '(?i)^\s*text/html(?:\s*;|\s*$)') { throw "X website card returned '$contentType', expected text/html." }

  $meta = @{}
  foreach ($tag in [regex]::Matches([string]$response.Content, '<meta\b[^>]*>', [Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    $attributes = @{}
    foreach ($attribute in [regex]::Matches($tag.Value, '(?<name>[\w:-]+)\s*=\s*(?:"(?<double>[^"]*)"|''(?<single>[^'']*)'')')) {
      $value = if ($attribute.Groups['double'].Success) { $attribute.Groups['double'].Value } else { $attribute.Groups['single'].Value }
      $attributes[$attribute.Groups['name'].Value.ToLowerInvariant()] = [Net.WebUtility]::HtmlDecode($value)
    }
    $name = if ($attributes.ContainsKey('property')) { [string]$attributes['property'] } elseif ($attributes.ContainsKey('name')) { [string]$attributes['name'] } else { '' }
    if ($name -in @('twitter:card', 'twitter:image')) { $meta[$name] = [string]$attributes['content'] }
  }

  if ($meta['twitter:card'] -cne 'summary_large_image') { throw 'X website card is not ready: twitter:card must be summary_large_image.' }
  # Since the 2026-10-25 Cloudflare split, escapezombie.com/share/* 301s to the media site, whose cards serve the image from media.escapezombie.com.
  $expectedImages = @(($uri.AbsoluteUri + '.png'), ('https://media.escapezombie.com' + $uri.AbsolutePath + '.png'))
  if ($expectedImages -cnotcontains $meta['twitter:image']) { throw 'X website card is not ready: twitter:image does not match the exact card image URL.' }
  return [pscustomobject]@{ url=$uri.AbsoluteUri; imageUrl=$meta['twitter:image']; statusCode=200; contentType=$contentType }
}
