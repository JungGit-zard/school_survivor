$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$root=$PSScriptRoot;$runner=Join-Path $root 'Invoke-FacebookScheduledPosting.ps1'
. (Join-Path $root 'FacebookPosting.ps1');. (Join-Path $root 'FacebookTree.ps1')
$tmp=Join-Path ([IO.Path]::GetTempPath()) ('facebook-schedule-test-'+[guid]::NewGuid().ToString('N'));[IO.Directory]::CreateDirectory($tmp)|Out-Null
try {
  $calls=[Collections.Generic.List[string]]::new()
  $makeInvoker={
    param([string]$failureAction='')
    $invoker = {
      param($action,$language,$runId,$windowId,$extra)
      $calls.Add("$language/$action")
      if($action -ceq $failureAction){throw "mock $action failure"}
      $path=Join-Path $tmp ($runId+'.json')
      if($action -eq 'SelectSourcePair'){
        $receipt=if(Test-Path -LiteralPath $path){Get-Content -Raw -LiteralPath $path -Encoding UTF8|ConvertFrom-Json}else{New-FacebookReceipt $runId};$receipt.entries.$language=[pscustomobject]@{state='selected';intent=(Get-FacebookPair (Get-FacebookConfig) $language);evidence=$null};Save-FacebookReceipt $receipt $path;return
      }
      if($action -eq 'OpenProfile'){return ([pscustomobject]@{windowId=777}|ConvertTo-Json -Compress)}
      $receipt=Get-Content -Raw -LiteralPath $path -Encoding UTF8|ConvertFrom-Json;$entry=$receipt.entries.$language
      if($action -eq 'VerifyDraft'){$entry.state='prepared';Save-FacebookReceipt $receipt $path;return}
      if($action -eq 'PublishOnce'){$entry.state='publish_intent';Save-FacebookReceipt $receipt $path;return}
      if($action -eq 'OpenNewestPost'){return ([pscustomobject]@{permalink="https://www.facebook.com/hyunuk.jung.56/posts/mock-$language-$runId"}|ConvertTo-Json -Compress)}
      if($action -eq 'VerifyPost'){$entry.state='verified';$entry.evidence=[pscustomobject]@{permalink=$extra[1];text=$entry.intent.text;attachmentCount=1;audience='Friends'};Save-FacebookReceipt $receipt $path;return}
    }
    return $invoker.GetNewClosure()
  }
  $allRun='2026-10-01-1100';$allInvoker=& $makeInvoker
  try{$all=& $runner -RunId $allRun -ReceiptDirectory $tmp -WrapperInvoker $allInvoker -TestBypassSlotCheck -ThrowOnFailure|ConvertFrom-Json}catch{throw "full mock calls: $($calls -join ','); $($_.Exception.Message)"}
  if($all.status -ne 'complete'){throw 'mock full cycle did not complete'}
  foreach($language in @('ja','en','vi','ko')){foreach($action in @('SelectSourcePair','OpenProfile','OpenComposer','TypeText','AttachImage','VerifyDraft','PublishOnce','OpenNewestPost','VerifyPost','ClosePost')){if(-not $calls.Contains("$language/$action")){throw "missing mocked action $language/$action"}}}
  $calls.Clear();try{& $runner -RunId '2026-10-03-1700' -ReceiptDirectory $tmp -WrapperInvoker (& $makeInvoker) -TestBypassSlotCheck -ThrowOnFailure|Out-Null;throw 'manual-post duplicate guard unexpectedly continued'}catch{if($_.Exception.Message -notmatch 'Duplicate guard'){throw};if($calls.Count -ne 0){throw 'manual-post duplicate guard touched the wrapper'}}
  $draftRun='2026-10-03-1700-draft-only';$calls.Clear();$draftInvoker=& $makeInvoker
  $draft=& $runner -RunId $draftRun -DraftOnly -ReceiptDirectory $tmp -WrapperInvoker $draftInvoker -ThrowOnFailure|ConvertFrom-Json
  if($draft.status -ne 'drafts_verified_no_publish' -or $draft.published){throw 'draft-only result contract failed'}
  foreach($language in @('ja','en','vi','ko')){
    foreach($action in @('VerifyDraft','CancelOwnDraft')){if(-not $calls.Contains("$language/$action")){throw "draft-only missing $language/$action"}}
    foreach($forbidden in @('PublishOnce','OpenNewestPost','VerifyPost','ClosePost')){if($calls.Contains("$language/$forbidden")){throw "draft-only invoked forbidden $language/$forbidden"}}
    $draftReceipt=Get-Content -Raw -LiteralPath (Join-Path $tmp ($draftRun+'.json')) -Encoding UTF8|ConvertFrom-Json;$draftEntry=$draftReceipt.entries.$language
    if($draftEntry.state -ne 'prepared' -or $null -ne $draftEntry.evidence){throw "draft-only $language receipt is not prepared/no-evidence"}
  }
  $preparedRun='2026-10-01-1700-smoke';$prepared=New-FacebookReceipt $preparedRun;$intent=Get-FacebookPair (Get-FacebookConfig) ko;$prepared.entries.ko=[pscustomobject]@{state='prepared';intent=$intent;evidence=$null};Save-FacebookReceipt $prepared (Join-Path $tmp ($preparedRun+'.json'))
  $calls.Clear();$preparedInvoker=& $makeInvoker
  $one=& $runner -RunId $preparedRun -Language ko -TestSinglePost -ReceiptDirectory $tmp -WrapperInvoker $preparedInvoker -ThrowOnFailure|ConvertFrom-Json
  if($one.status -ne 'single_verified' -or $calls.Contains('ko/OpenComposer') -or -not $calls.Contains('ko/VerifyDraft')){throw 'prepared resume contract failed'}
  $verifiedRun='2026-10-01-1100-verified';$verified=New-FacebookReceipt $verifiedRun;$verified.entries.ko=[pscustomobject]@{state='verified';intent=$intent;evidence=[pscustomobject]@{permalink='https://www.facebook.com/hyunuk.jung.56/posts/mock-verified';text=$intent.text;attachmentCount=1;audience='Friends'}};Save-FacebookReceipt $verified (Join-Path $tmp ($verifiedRun+'.json'))
  $calls.Clear();$verifiedInvoker=& $makeInvoker
  $skip=& $runner -RunId $verifiedRun -Language ko -TestSinglePost -ReceiptDirectory $tmp -WrapperInvoker $verifiedInvoker -ThrowOnFailure|ConvertFrom-Json
  if($skip.status -ne 'single_verified' -or $calls.Count -ne 0){throw 'verified skip must revalidate without UI actions'}
  $uncertainRun='2026-10-01-1700-uncertain';$uncertain=New-FacebookReceipt $uncertainRun;$uncertain.entries.ko=[pscustomobject]@{state='publish_intent';intent=$intent;evidence=$null};Save-FacebookReceipt $uncertain (Join-Path $tmp ($uncertainRun+'.json'))
  $calls.Clear();try{& $runner -RunId $uncertainRun -Language ko -TestSinglePost -ReceiptDirectory $tmp -WrapperInvoker (& $makeInvoker) -ThrowOnFailure|Out-Null;throw 'publish_intent unexpectedly continued'}catch{if($_.Exception.Message -notmatch 'publish_intent'){throw};if($calls.Contains('ko/PublishOnce')){throw 'uncertain receipt attempted another publish'}}
  $failRun='2026-10-01-1100-failure';$calls.Clear();try{& $runner -RunId $failRun -Language ko -TestSinglePost -ReceiptDirectory $tmp -WrapperInvoker (& $makeInvoker 'AttachImage') -ThrowOnFailure|Out-Null;throw 'failure action unexpectedly continued'}catch{if($_.Exception.Message -notmatch 'AttachImage'){throw};if($calls.Contains('ko/PublishOnce')){throw 'failure advanced to publish'};if(-not (Test-Path -LiteralPath (Join-Path $tmp "runlogs\\$failRun.json"))){throw 'failure log missing'}}
  $priorEap=$ErrorActionPreference;$ErrorActionPreference='Continue';$bad=& powershell -NoProfile -File $runner -RunId 2000-01-01-1100 -ValidateOnly 2>$null;$badExit=$LASTEXITCODE;$ErrorActionPreference=$priorEap;if($badExit -eq 0){throw 'ordinary explicit stale slot bypassed grace'}
  $valid=& powershell -NoProfile -File $runner -RunId 2026-10-01-1700-smoke-fix -Language ko -TestSinglePost -ValidateOnly;if($LASTEXITCODE -ne 0 -or (($valid|ConvertFrom-Json).languages.Count -ne 1)){throw 'single validation contract failed'}
  'FACEBOOK_SCHEDULE_TEST_OK'
} finally {if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Recurse -Force}}
