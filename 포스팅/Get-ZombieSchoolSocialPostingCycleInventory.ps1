[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$StartDate,
  [Parameter(Mandatory)][string]$EndDate,
  [string]$ReceiptRoot = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$start = [datetime]::ParseExact($StartDate,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture)
$end = [datetime]::ParseExact($EndDate,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture)
if($end -lt $start){throw 'EndDate must be on or after StartDate.'}
if([string]::IsNullOrWhiteSpace($ReceiptRoot)){$ReceiptRoot=Join-Path (Split-Path -Parent $PSScriptRoot) 'Developer\agent_room'}
$config=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\marketing\x_daily_zombie_school_posting\posting_config.json') -Raw -Encoding UTF8|ConvertFrom-Json
$slots=@($config.schedule_times|Sort-Object)
foreach($slot in $slots){if($slot -notmatch '^\d{2}:\d{2}$'){throw "Invalid configured schedule slot '$slot'."}}
for($date=$start;$date -le $end;$date=$date.AddDays(1)){
  foreach($slot in $slots){
    $id=$date.ToString('yyyy-MM-dd')+'-'+$slot.Replace(':','')
    $platforms=@{}
    foreach($platform in @('facebook','x')){
      $subdir=if($platform -eq 'facebook'){'facebook_posting_receipts'}else{'x_posting_receipts'}
      $path=Join-Path (Join-Path $ReceiptRoot $subdir) ($id+'.json')
      if(-not (Test-Path -LiteralPath $path)){$platforms[$platform]=[pscustomobject]@{exists=$false;status='missing';entryStates=@();publishIntentLanguages=@();verifiedLanguageCount=0};continue}
      $receipt=Get-Content -LiteralPath $path -Raw -Encoding UTF8|ConvertFrom-Json
      $states=@();$intents=@();$verified=0
      foreach($language in @('ja','en','vi','ko')){$entry=$receipt.entries.$language;if($null -eq $entry){$states+="${language}:missing"}else{$states+="$language`:$($entry.state)";if($entry.state -eq 'publish_intent'){$intents+=$language};if($entry.state -eq 'verified'){$verified++}}}
      $platforms[$platform]=[pscustomobject]@{exists=$true;status=[string]$receipt.status;entryStates=@($states);publishIntentLanguages=@($intents);verifiedLanguageCount=$verified}
    }
    [pscustomobject]@{cycleId=$id;facebook=$platforms.facebook;x=$platforms.x;receiptOnly=$true;liveTimelineVerified=$false}|ConvertTo-Json -Depth 6 -Compress
  }
}
