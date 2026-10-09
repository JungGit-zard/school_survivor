# Pure parser for an Orca/UIA text tree.  It neither opens UI nor changes a receipt.
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Web
$script:FacebookTreePlayUrl = 'https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool'
$script:FacebookTreeWebUrl = 'https://escapezombie.com'

function Get-FacebookTreeLine([string]$Line) {
  $leading = [regex]::Match($Line, '^\s*').Value.Replace("`t", '  ')
  $label = $Line.Trim() -replace '(?:,\s*)?Value:.*$', ''
  [pscustomobject]@{ indent = $leading.Length; raw = ($label -replace '^\d+\s+', ''); value = if ($Line -match '(?:,\s*)?Value:\s*(.*?)(?:,\s*Secondary Actions:.*)?$') { $Matches[1].Trim() } else { $null } }
}

function Get-FacebookTreeScope([string]$Tree, [string]$DialogName = 'Hyun Uk Jung''s Post') {
  if ([string]::IsNullOrWhiteSpace($Tree)) { throw 'Empty Facebook accessibility tree' }
  $nodes = @($Tree -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { Get-FacebookTreeLine $_ })
  $start = -1
  for ($i = 0; $i -lt $nodes.Count; $i++) {
    if ($nodes[$i].raw -match '(?i)(?:dialog|\uB300\uD654\s+\uC0C1\uC790)\s+' -and $nodes[$i].raw -match [regex]::Escape($DialogName)) { $start = $i; break }
  }
  if ($start -lt 0) { throw "No exact scoped dialog '$DialogName' in accessibility tree" }
  $end = $nodes.Count
  for ($i = $start + 1; $i -lt $nodes.Count; $i++) {
    if ($nodes[$i].indent -le $nodes[$start].indent) { $end = $i; break }
  }
  [pscustomobject]@{ nodes = @($nodes[$start..($end - 1)]); dialogIndent = $nodes[$start].indent }
}

function Get-FacebookTreeAddress([object[]]$Nodes) {
  $addresses = @($Nodes | Where-Object { $_.raw -match '(?i)(?:address bar|\uC8FC\uC18C\uCC3D)' -and -not [string]::IsNullOrWhiteSpace($_.value) })
  if ($addresses.Count -ne 1) { throw "Expected one address-bar value; found $($addresses.Count)" }
  $value = $addresses[0].value
  if ($value -notmatch '^[a-z][a-z0-9+.-]*://') { $value = 'https://' + $value }
  try { [uri]$value } catch { throw 'Address-bar value is not an absolute URL' }
}

function Test-FacebookSamePostAddress([uri]$Observed, [string]$Permalink) {
  try { [uri]$expected = $Permalink } catch { return $false }
  $observedHost = if ($Observed.Host -ceq 'facebook.com') { 'www.facebook.com' } else { $Observed.Host }
  $expectedHost = if ($expected.Host -ceq 'facebook.com') { 'www.facebook.com' } else { $expected.Host }
  return $Observed.Scheme -eq 'https' -and $observedHost -ceq 'www.facebook.com' -and $observedHost -ceq $expectedHost -and $Observed.AbsolutePath.TrimEnd('/') -ceq $expected.AbsolutePath.TrimEnd('/')
}

function Get-FacebookDecodedRedirectUrl([string]$Value) {
  try {
    [uri]$outer = $Value
    $query = [System.Web.HttpUtility]::ParseQueryString($outer.Query)
    if ([string]::IsNullOrWhiteSpace($query['u'])) { return $null }
    return [uri]$query['u']
  } catch { return $null }
}

function Test-FacebookCampaignUrl([string]$Value, [string]$ExpectedUrl) {
  $actual = Get-FacebookDecodedRedirectUrl $Value
  if ($null -eq $actual) { try { $actual = [uri]$Value } catch { return $false } }
  try { $expected = [uri]$ExpectedUrl } catch { return $false }
  if ($actual.Scheme -cne $expected.Scheme -or $actual.Host -cne $expected.Host -or $actual.AbsolutePath.TrimEnd('/') -cne $expected.AbsolutePath.TrimEnd('/')) { return $false }
  $query = [System.Web.HttpUtility]::ParseQueryString($actual.Query)
  $keys = @($query.AllKeys | Where-Object { -not [string]::IsNullOrEmpty($_) })
  if ($keys | Where-Object { $_ -notin @('id','fbclid') }) { return $false }
  if ($ExpectedUrl -ceq $script:FacebookTreePlayUrl) {
    $ids = @($query.GetValues('id') | Where-Object { $null -ne $_ })
    if ($ids.Count -ne 1 -or $ids[0] -cne 'com.jungyoon.zombieschool') { return $false }
  } elseif (@($query.GetValues('id') | Where-Object { $null -ne $_ }).Count -ne 0) { return $false }
  return @($query.GetValues('fbclid') | Where-Object { $null -ne $_ }).Count -le 1
}

function Get-FacebookPostEvidenceFromTree([string]$Tree, [string]$Permalink, [string]$ExpectedText) {
  $allNodes = @($Tree -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { Get-FacebookTreeLine $_ })
  $address = Get-FacebookTreeAddress $allNodes
  if (-not (Test-FacebookSamePostAddress $address $Permalink)) { throw 'Address-bar post path does not equal the requested permalink' }
  $scope = Get-FacebookTreeScope $Tree
  $nodes = @($scope.nodes)
  $comment = @($nodes | Where-Object { $_.raw -match '(?i)(?:^|\s)(?:comments?|\uB313\uAE00)(?:\s|$)' } | Select-Object -First 1)
  if ($comment.Count) { $nodes = @($nodes | Select-Object -First ([array]::IndexOf($nodes, $comment[0]))) }

  $authors = @($nodes | Where-Object { $_.raw -match '(?i)(?:link|\uB9C1\uD06C)\s+Hyun Uk Jung(?:,|$)' -and $_.value -match '^https://www\.facebook\.com/hyunuk\.jung\.56(?:[/?]|$)' })
  if ($authors.Count -lt 1) { throw 'Scoped post has no exact Hyun Uk Jung author link' }
  $audiences = @($nodes | Where-Object { $_.raw -match '(?i)(?:Shared with Your friends|\uCE5C\uAD6C\uC640\s+\uACF5\uC720)' })
  $friends = @($nodes | Where-Object { $_.raw -match '(?i)(?:graphic|\uADF8\uB798\uD53D)\s+Friends(?:,|$)' })
  if ($audiences.Count -ne 1 -or $friends.Count -ne 1) { throw 'Scoped post must have exactly one Friends privacy label and icon' }

  $expectedUrls=@([regex]::Matches($ExpectedText,'https://[^\s]+') | ForEach-Object Value)
  if($expectedUrls.Count -lt 1 -or $expectedUrls[-1] -cne $script:FacebookTreePlayUrl){throw 'Expected copy must end its URL sequence with the canonical Play URL'}
  if($expectedUrls.Count -gt 2 -or ($expectedUrls.Count -eq 2 -and $expectedUrls[0] -cne $script:FacebookTreeWebUrl)){throw 'Expected copy permits only optional Web URL followed by Play URL'}
  $hashtags = @($nodes | Where-Object { $_.raw -match '(?i)(?:link|\uB9C1\uD06C)\s+#\S+' })
  if ($hashtags.Count -ne 1) { throw "Scoped post requires exactly one hashtag link; found $($hashtags.Count)" }
  $photos = @($nodes | Where-Object { $_.raw -match '(?i)(?:link|\uB9C1\uD06C)\s+' -and $_.value -match '^https://www\.facebook\.com/photo/\?fbid=[^&]+&set=' })
  if ($photos.Count -ne 1) { throw "Scoped post requires exactly one photo URL; found $($photos.Count)" }

  $chunks=@();$bodyCount=0;$seenUrls=@{}
  foreach($node in $nodes){
    if($node.raw -match '(?i)^(?:text|\uD14D\uC2A4\uD2B8)\s+' -and $node.raw -notmatch '(?i)(Shared with Your friends|\uCE5C\uAD6C\uC640\s+\uACF5\uC720)'){$chunks+=($node.raw -replace '(?i)^(?:text|\uD14D\uC2A4\uD2B8)\s+','');$bodyCount++;continue}
    if($node.raw -match '(?i)^(?:link|\uB9C1\uD06C)\s+#\S+'){$chunks+=($node.raw -replace '(?i)^(?:link|\uB9C1\uD06C)\s+','').Trim();continue}
    $decoded=Get-FacebookDecodedRedirectUrl $node.value;$actual=if($null -ne $decoded){$decoded}else{try{[uri]$node.value}catch{$null}}
    if($null -eq $actual){continue}
    foreach($expectedUrl in $expectedUrls){
      $matches=$false
      $matches=Test-FacebookCampaignUrl $node.value $expectedUrl
      if($matches){$chunks+=$expectedUrl;if(-not $seenUrls.ContainsKey($expectedUrl)){$seenUrls[$expectedUrl]=0};$seenUrls[$expectedUrl]++;break}
    }
  }
  if($bodyCount -lt 1){throw 'Scoped post lacks body text'}
  foreach($expectedUrl in $expectedUrls){$count=if($seenUrls.ContainsKey($expectedUrl)){$seenUrls[$expectedUrl]}else{0};if($count -ne 1){throw "Scoped post requires exactly one expected URL $expectedUrl; found $count"}}
  $observedText=$chunks -join "`n"
  if ((Normalize-FacebookText $observedText) -cne (Normalize-FacebookText $ExpectedText)) { throw 'Scoped post reconstructed text differs from the frozen intent' }
  $canonicalPermalink = 'https://www.facebook.com' + $address.PathAndQuery
  [pscustomobject]@{ permalink = $canonicalPermalink; text = $observedText; attachmentCount = 1; audience = 'Friends'; author = 'Hyun Uk Jung'; photoUrl = $photos[0].value; observedTreeSha256 = Get-FacebookSha256 ($nodes.raw -join "`n"); verifiedUtc = [DateTimeOffset]::UtcNow.ToString('o') }
}

function Assert-FacebookComposerTree([string]$Tree, [string]$ExpectedText = '', [string]$ExpectedFileName = '') {
  $scope = Get-FacebookTreeScope $Tree 'Create post'
  $nodes = @($scope.nodes)
  if (@($nodes | Where-Object { $_.raw -match '(?i)(?:(?:link|\uB9C1\uD06C)|(?:text|\uD14D\uC2A4\uD2B8))\s+Hyun Uk Jung(?:,|$)' }).Count -lt 1) { throw 'Composer lacks the fixed author' }
  $edit = @($nodes | Where-Object { $_.raw -match '(?i)(?:edit|\uD3B8\uC9D1)(?:\s|,|$)' -and (Normalize-FacebookText $_.value) -ceq (Normalize-FacebookText $ExpectedText) })
  if (-not [string]::IsNullOrWhiteSpace($ExpectedText) -and $edit.Count -ne 1) { throw "Composer requires one exact editor value; found $($edit.Count)" }
  $files = @(if ([string]::IsNullOrWhiteSpace($ExpectedFileName)) { @() } else { @($nodes | Where-Object { $_.raw -cmatch [regex]::Escape($ExpectedFileName) }) })
  $remove = @($nodes | Where-Object { $_.raw -match '(?i)(?:Remove post attachment|\uAC8C\uC2DC\uBB3C\s+\uCCA8\uBD80\s+\uD30C\uC77C\s+\uC81C\uAC70)' })
  if ((-not [string]::IsNullOrWhiteSpace($ExpectedFileName)) -and ($files.Count -ne 1 -or $remove.Count -ne 1)) { throw 'Composer requires exactly one expected filename and one remove marker' }
  $audience = @($nodes | Where-Object { $_.raw -match '(?i)(?:Shared with Your friends|Sharing with Your friends|\uCE5C\uAD6C\uC640\s+\uACF5\uC720)' })
  if ($audience.Count -ne 1) { throw 'Composer audience is not exactly Friends' }
  [pscustomobject]@{ text = if ($edit.Count) { $edit[0].value } else { $null }; attachmentCount = if ([string]::IsNullOrWhiteSpace($ExpectedFileName)) { 0 } else { 1 }; audience = 'Friends'; attachmentFileName = $ExpectedFileName }
}

function Test-FacebookCanonicalIntent($Config, $Intent) {
  try {
    if ($null -eq $Intent -or [string]::IsNullOrWhiteSpace([string]$Intent.language) -or [string]::IsNullOrWhiteSpace([string]$Intent.variantId)) { return $false }
    Assert-FacebookFrozenIntent $Config ([string]$Intent.language) $Intent
    return (Get-FacebookSha256 ([string]$Intent.text)) -ceq [string]$Intent.textSha256 -and $Intent.attachmentCount -eq 1
  } catch { return $false }
}

function Assert-FacebookCanonicalIntent($Config, $Intent) {
  if (-not (Test-FacebookCanonicalIntent $Config $Intent)) { throw 'Frozen intent is not an exact Facebook pair or explicitly mapped legacy receipt' }
}
