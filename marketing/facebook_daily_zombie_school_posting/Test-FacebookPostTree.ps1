Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'FacebookPosting.ps1')
. (Join-Path $PSScriptRoot 'FacebookTree.ps1')
function Assert-True($Value,[string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; "PASS $Name" }
function Assert-Throws([scriptblock]$Action,[string]$Name) { $threw=$false;try { $null = & $Action } catch { $threw=$true };Assert-True $threw $Name }

$fixturePath = Join-Path $PSScriptRoot '..\..\Developer\agent_room\facebook_posting_receipts\photo-repost-ko-observed-tree.txt'
$tree = Get-Content -LiteralPath $fixturePath -Raw -Encoding UTF8
$permalink = 'https://www.facebook.com/hyunuk.jung.56/posts/pfbid0W4C4KuH6eV7RVPMHhF6mUhrXtzohFGcRBw5rFtz8QAZGRpAkW6h9vjHYJZRBydCRl'
$config = Get-FacebookConfig
$historicalReceipt=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\Developer\agent_room\facebook_posting_receipts\2026-09-27-manual-photo-repost-2149.json') -Raw -Encoding UTF8|ConvertFrom-Json
$expected = $historicalReceipt.entries.ko.intent.text
$evidence = Get-FacebookPostEvidenceFromTree $tree $permalink $expected
Assert-True ($evidence.text -ceq $expected) 'observed tree reconstructs exact post text'
Assert-True ($evidence.attachmentCount -eq 1 -and $evidence.photoUrl -match '/photo/\?fbid=') 'observed tree has one photo URL'

Assert-Throws { Get-FacebookPostEvidenceFromTree ($tree -replace 'Hyun Uk Jung, Value:', 'Other User, Value:') $permalink $expected } 'wrong account rejected'
$body = ($expected -split "`r?`n")[0]
$bodySuffix = $body + ' extra'
Assert-Throws { Get-FacebookPostEvidenceFromTree ($tree -replace [regex]::Escape($body), $bodySuffix) $permalink $expected } 'body suffix rejected'
$twoPhotos = $tree + [Environment]::NewLine + '                              88 link Second photo, Value: https://www.facebook.com/photo/?fbid=2&set=a.1'
Assert-Throws { Get-FacebookPostEvidenceFromTree $twoPhotos $permalink $expected } 'two photos rejected'
Assert-Throws { Get-FacebookPostEvidenceFromTree ($tree -replace 'id%3Dcom\.jungyoon\.zombieschool', 'id%3Dcom.evil.game') $permalink $expected } 'wrong Play URL rejected'
Assert-Throws { Get-FacebookPostEvidenceFromTree ($tree -replace 'facebook\.com/hyunuk\.jung\.56/posts/pfbid0W4C4KuH6eV7RVPMHhF6mUhrXtzohFGcRBw5rFtz8QAZGRpAkW6h9vjHYJZRBydCRl\?locale=ko_KR', 'facebook.com/other/posts/nope') $permalink $expected } 'address-bar mismatch rejected'
$foreignBelowDialog = ($tree -replace [regex]::Escape($body), $bodySuffix) + [Environment]::NewLine + '  foreign text ' + $expected
Assert-Throws { Get-FacebookPostEvidenceFromTree $foreignBelowDialog $permalink $expected } 'foreign body below dialog does not satisfy post'
$webExpected=$expected -replace [regex]::Escape('https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool'), "https://escapezombie.com`nhttps://play.google.com/store/apps/details?id=com.jungyoon.zombieschool"
$webReplacement='                              85 link https://escapezombie.com, Value: https://escapezombie.com' + "`r`n" + '$1'
$webTree=$tree -replace '(?m)^(.*https://play\.google\.com/store/apps/details\.\.\., Value:.*)$', $webReplacement
$webEvidence=Get-FacebookPostEvidenceFromTree $webTree $permalink $webExpected
Assert-True ($webEvidence.text -ceq $webExpected) 'new Web-first then Play copy is verified while legacy receipt remains valid'
$latestKo=$config.copy.ko.text
$koLines=@($latestKo -split "`r?`n")
$latestTree=$tree -replace [regex]::Escape($body),$koLines[0]
$latestInsertion='                              85 text ' + $koLines[1] + [Environment]::NewLine + '                              86 link https://escapezombie.com, Value: https://escapezombie.com' + [Environment]::NewLine + '                              87 text ' + $koLines[3] + [Environment]::NewLine + '$1'
$latestTree=$latestTree -replace '(?m)^(.*https://play\.google\.com/store/apps/details\.\.\., Value:.*)$',$latestInsertion
$latestEvidence=Get-FacebookPostEvidenceFromTree $latestTree $permalink $latestKo
Assert-True ($latestEvidence.text -ceq $latestKo) 'Korean labelled Web and Play nodes reconstruct in observed order'
Assert-Throws { Get-FacebookPostEvidenceFromTree ($latestTree -replace [regex]::Escape($koLines[1]), '') $permalink $latestKo } 'Korean missing web label rejected'
$reversedTree=$latestTree -replace '(?s)(86 link https://escapezombie\.com, Value: https://escapezombie\.com\r?\n.*?87 text .*?\r?\n)(.*https://play\.google\.com/store/apps/details\.\.\., Value:.*?)', ('$2' + [Environment]::NewLine + '$1')
Assert-Throws { Get-FacebookPostEvidenceFromTree $reversedTree $permalink $latestKo } 'reversed Web and Play nodes rejected'

 $pair = Get-FacebookPair $config ko
Assert-True (Test-FacebookCanonicalIntent $config $pair) 'exact canonical intent accepted'
$tampered = $pair | Select-Object *; $tampered.text = $tampered.text + ' extra'; $tampered.textSha256 = Get-FacebookSha256 $tampered.text
Assert-True (-not (Test-FacebookCanonicalIntent $config $tampered)) 'same-hash noncanonical intent rejected'
$composer=@'
0 dialog Create post
  1 text Hyun Uk Jung
  2 edit What's on your mind?, Value: exact draft
  3 text Edit privacy. Sharing with Your friends.
  4 text fixture.png
  5 button Remove post attachment
'@
$composerProof=Assert-FacebookComposerTree $composer 'exact draft' 'fixture.png'
Assert-True ($composerProof.text -eq 'exact draft' -and $composerProof.attachmentCount -eq 1) 'composer parser reads edit value after raw label stripping'
Assert-Throws { Assert-FacebookComposerTree $composer 'wrong draft' 'fixture.png' } 'composer parser rejects mismatched text'
'FACEBOOK_POST_TREE_TEST_OK'
