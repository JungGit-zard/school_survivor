# 2026-11-25: one platform's failure must not stop the other platform in the same scheduled slot.
# Drives Invoke-SerializedPublishOnlyCycle with stub runners; nothing touches a browser or posts.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Assert-True($Value,[string]$Name){ if(-not $Value){ throw "FAILED: $Name" }; "PASS $Name" }
. (Join-Path $PSScriptRoot 'Invoke-ZombieSchoolFiveSlotPosting.ps1') -TestOnly

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('slot-independence-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
$receiptHelper = @'
function Set-StubEntry([string]$Path,[string]$Language,[string]$State){
  $r = if (Test-Path -LiteralPath $Path) { Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json } else { [pscustomobject]@{schema=1;entries=[pscustomobject]@{en=$null;ko=$null}} }
  $r.entries.$Language = [pscustomobject]@{state=$State;intent=[pscustomobject]@{language=$Language}}
  [IO.File]::WriteAllText($Path,($r|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
}
'@
$helper = Join-Path $tmp 'stub-helper.ps1'
Set-Content -LiteralPath $helper -Encoding ASCII -Value $receiptHelper
$env:SLOT_STUB_HELPER = $helper
$xStub = Join-Path $tmp 'x-stub.ps1'
Set-Content -LiteralPath $xStub -Encoding ASCII -Value (@'
param([switch]$Run,[switch]$SinglePost,[switch]$PublishOnly,[string]$Language,[string]$CycleId,[string]$ReceiptDirectory,[switch]$CredentialRecovery,[string]$StopAtKst,[switch]$NoVideo)
. $env:SLOT_STUB_HELPER
Add-Content -LiteralPath (Join-Path $env:SLOT_STUB_LOG 'x.log') -Value "x/$Language" -Encoding ASCII
if ($env:SLOT_STUB_X_MODE -eq 'fail') { [Console]::Error.WriteLine("X_POSTING_FAILED: IMAGE_POOL_EXHAUSTED: all unique SHA256 images are already used for X/$Language."); exit 1 }
Set-StubEntry (Join-Path $ReceiptDirectory ($CycleId + '.json')) $Language 'publish_intent'
[pscustomobject]@{status='published_unverified'} | ConvertTo-Json -Compress
'@)
$fbStub = Join-Path $tmp 'fb-stub.ps1'
Set-Content -LiteralPath $fbStub -Encoding ASCII -Value (@'
param([string]$Action,[string]$RunId,[string]$Language,[string]$ReceiptDirectory,[long]$WindowId,[string]$StopAtKst,[switch]$AuthorizePublish,[switch]$SelectedTextOnly)
. $env:SLOT_STUB_HELPER
Add-Content -LiteralPath (Join-Path $env:SLOT_STUB_LOG 'fb.log') -Value "$Action/$Language" -Encoding ASCII
$receipt = Join-Path $ReceiptDirectory ($RunId + '.json')
if ($Action -eq 'DiscoverWindow' -and $env:SLOT_STUB_FB_MODE -eq 'fail') { [Console]::Error.WriteLine('No visible Chrome window is available for Facebook discovery'); exit 1 }
switch ($Action) {
  'SelectSourcePair' { Set-StubEntry $receipt $Language 'selected'; '{}' }
  'DiscoverWindow' { '{"windowId":4242}' }
  'PublishOnce' { if (-not $AuthorizePublish) { exit 3 }; Set-StubEntry $receipt $Language 'publish_intent'; '{"publishClick":"semantic"}' }
  default { '{}' }
}
'@)
function Invoke-StubSlot([string]$Name,[string]$XMode,[string]$FbMode) {
  $root = Join-Path $tmp $Name
  $log = Join-Path $root 'log'
  New-Item -ItemType Directory -Path $log -Force | Out-Null
  $env:SLOT_STUB_LOG = $log; $env:SLOT_STUB_X_MODE = $XMode; $env:SLOT_STUB_FB_MODE = $FbMode
  $result = Invoke-SerializedPublishOnlyCycle -RunId '2030-01-01-2100' -ReceiptRoot $root -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  $fbLog = @(if (Test-Path -LiteralPath (Join-Path $log 'fb.log')) { Get-Content -LiteralPath (Join-Path $log 'fb.log') })
  $xLog = @(if (Test-Path -LiteralPath (Join-Path $log 'x.log')) { Get-Content -LiteralPath (Join-Path $log 'x.log') })
  $fbReceipt = Join-Path $root 'facebook_posting_receipts\2030-01-01-2100.json'
  $xReceipt = Join-Path $root 'x_posting_receipts\2030-01-01-2100.json'
  return [pscustomobject]@{result=$result;fbLog=$fbLog;xLog=$xLog
    fb=if(Test-Path -LiteralPath $fbReceipt){(Get-Content -LiteralPath $fbReceipt -Raw | ConvertFrom-Json).entries}else{$null}
    x=if(Test-Path -LiteralPath $xReceipt){(Get-Content -LiteralPath $xReceipt -Raw | ConvertFrom-Json).entries}else{$null}}
}
try {
  # X pool exhausted (the 11-24 21:00 / 11-25 03:00 failure): Facebook still publishes both languages.
  $a = Invoke-StubSlot 'x-fails' 'fail' 'ok'
  Assert-True (($a.xLog -join ',') -eq 'x/en,x/ko') 'X attempted both languages before failing'
  Assert-True ($a.result.status -eq 'partial_failed' -and $a.result.exitCode -eq 1) 'X failure leaves the slot partial_failed, not stopped_unsafe'
  $aOut = $a.result.output | ConvertFrom-Json
  Assert-True (@($aOut.errors | Where-Object { $_ -match 'IMAGE_POOL_EXHAUSTED' }).Count -eq 2) 'both X errors are recorded'
  Assert-True ((@($aOut.submitted) -join ',') -eq 'facebook/en,facebook/ko') 'Facebook submitted en and ko in the same slot'
  Assert-True ($a.fb.en.state -eq 'publish_intent' -and $a.fb.ko.state -eq 'publish_intent') 'Facebook persisted publish_intent for both languages'
  Assert-True (@($a.fbLog | Where-Object { $_ -like 'PublishOnce/*' }).Count -eq 2) 'exactly one Facebook PublishOnce per language'
  Assert-True ([array]::IndexOf($a.fbLog,'DiscoverWindow/en') -lt [array]::IndexOf($a.fbLog,'PublishOnce/en')) 'Facebook discovers its window before publishing'

  # Facebook window failure: X still publishes and the Facebook error is recorded.
  $b = Invoke-StubSlot 'fb-fails' 'ok' 'fail'
  $bOut = $b.result.output | ConvertFrom-Json
  Assert-True ($b.result.status -eq 'partial_failed') 'Facebook failure leaves the slot partial_failed'
  Assert-True ((@($bOut.submitted) -join ',') -eq 'x/en,x/ko' -and $b.x.en.state -eq 'publish_intent' -and $b.x.ko.state -eq 'publish_intent') 'X submitted both languages despite the Facebook failure'
  Assert-True (@($bOut.errors | Where-Object { $_ -match 'No visible Chrome window' }).Count -eq 2 -and @($b.fbLog | Where-Object { $_ -like 'PublishOnce/*' }).Count -eq 0) 'Facebook errors recorded and no Facebook click attempted'

  # Retry inside the slot: a language already at publish_intent is never replayed.
  $env:SLOT_STUB_X_MODE = 'fail'; $env:SLOT_STUB_FB_MODE = 'ok'; $env:SLOT_STUB_LOG = Join-Path (Join-Path $tmp 'x-fails') 'log'
  Remove-Item -LiteralPath (Join-Path $env:SLOT_STUB_LOG 'fb.log')
  $retry = Invoke-SerializedPublishOnlyCycle -RunId '2030-01-01-2100' -ReceiptRoot (Join-Path $tmp 'x-fails') -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  $retryOut = $retry.output | ConvertFrom-Json
  Assert-True (-not (Test-Path -LiteralPath (Join-Path $env:SLOT_STUB_LOG 'fb.log')) -and (@($retryOut.priorPublishIntentNotReplayed) -join ',') -eq 'facebook/en,facebook/ko') 'retry does not touch Facebook languages already at publish_intent'
} finally {
  Remove-Item Env:SLOT_STUB_LOG,Env:SLOT_STUB_X_MODE,Env:SLOT_STUB_FB_MODE,Env:SLOT_STUB_HELPER -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
'SLOT_PLATFORM_INDEPENDENCE_TEST_OK'
