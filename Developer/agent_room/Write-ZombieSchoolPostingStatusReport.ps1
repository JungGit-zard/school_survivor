[CmdletBinding()]
param(
  [switch]$NoNotify,
  [switch]$TestOnly,
  [string]$FixturePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-KstNow {
  $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')
  return [TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow, $zone)
}

function ConvertTo-OneLine([string]$Value, [int]$Limit = 240) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $safe = ($Value -replace '[\r\n\t]+', ' ' -replace '\s{2,}', ' ').Trim()
  if ($safe.Length -gt $Limit) { return $safe.Substring(0, $Limit) + '…' }
  return $safe
}

function Get-ObjectValue($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Get-FailureSummary($Value) {
  if ($null -eq $Value) { return '' }
  $raw = [string]$Value
  for ($depth = 0; $depth -lt 3; $depth++) {
    try {
      $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
      $parts = @()
      foreach ($name in @('reason','error','message','failedLanguage','status')) {
        $property = $parsed.PSObject.Properties[$name]
        if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
          $parts += ("{0}={1}" -f $name, [string]$property.Value)
        }
      }
      if ($parts.Count -gt 0) { return (ConvertTo-OneLine ($parts -join '; ')) }
      $outputProperty = $parsed.PSObject.Properties['output']
      if ($null -ne $outputProperty -and $outputProperty.Value -is [string]) { $raw = [string]$outputProperty.Value; continue }
      return ''
    } catch { return (ConvertTo-OneLine $raw) }
  }
  return (ConvertTo-OneLine $raw)
}

function Get-TaskResultLabel($Task) {
  $result = [int]$Task.lastTaskResult
  if ($result -eq 267011) { return '미실행(실패 아님)' }
  if ($result -eq 0) { return '정상 종료(게시 성공을 뜻하지 않음)' }
  if ($result -eq 1) {
    if ([string]::IsNullOrWhiteSpace([string]$Task.lastRunTime)) { return '오류 코드 1 (실행 시각 없음)' }
    return ("오류 코드 1 (마지막 실행 {0})" -f $Task.lastRunTime)
  }
  return ("결과 코드 {0} (마지막 실행 {1})" -f $result, [string]$Task.lastRunTime)
}

function Get-StatusSummary($Data) {
  $activeFailures=@(@($Data.nextRetries)+@($Data.queuedCycles)|Where-Object{$_.status -in @('retry_wait','failed','partial_failed','stopped_unsafe','stopped_cutoff')})
  $missedStarts=@($Data.warnings|Where-Object{$_ -like '예정시각경과·시작기록없음 *'})
  $parts=[System.Collections.Generic.List[string]]::new()
  if($activeFailures.Count){$failure=$activeFailures[0];$reason=ConvertTo-OneLine ([string]$failure.failureReason) 70;$when='';$failureNextRetryUtc=Get-ObjectValue $failure 'nextRetryUtc';if($failureNextRetryUtc){try{$when=' 다음 재시도 '+[DateTimeOffset]::Parse([string]$failureNextRetryUtc).ToOffset([TimeSpan]::FromHours(9)).ToString("HH:mm 'KST'")}catch{}};$parts.Add(("활성 실패 {0}: {1}.{2}" -f $failure.status,$reason,$when))}else{$parts.Add('활성 재시도 없음')}
  if($missedStarts.Count){$parts.Add((ConvertTo-OneLine ([string]$missedStarts[0]) 100))}
  $intentCount=@($Data.postingStates|Where-Object rawState -eq 'publish_intent').Count;$parts.Add("사용자 확인 대기 $intentCount")
  $next=@($Data.tasks|Where-Object{$_.enabled -and $_.state -ne 'Disabled' -and $_.taskName -notmatch '(?i)StatusReport' -and $_.nextRunTime}|Sort-Object nextRunTime|Select-Object -First 1)
  if($next.Count){$parts.Add("다음 게시 $($next[0].nextRunTime)")}
  $disabled=@($Data.tasks|Where-Object{-not $_.enabled -or $_.state -eq 'Disabled'});if($disabled.Count){$parts.Add("꺼진 작업 $($disabled.Count): $((@($disabled|Select-Object -ExpandProperty taskName)-join ', '))")}
  if(@($Data.warnings).Count){$parts.Add("읽기 경고 $(@($Data.warnings).Count): $(ConvertTo-OneLine ([string]$Data.warnings[0]) 60)")}
  ConvertTo-OneLine ($parts -join ' · ') 240
}

function Get-NotificationGate($Data, [switch]$NoNotify) {
  $activeFailures=@(@($Data.nextRetries)+@($Data.queuedCycles)|Where-Object{$_.status -in @('retry_wait','failed','partial_failed','stopped_unsafe')})
  $cutoffFailures=@(@($Data.nextRetries)+@($Data.queuedCycles)|Where-Object{$_.status -eq 'stopped_cutoff' -and -not [string]::IsNullOrWhiteSpace([string]$_.failureReason) -and [string]$_.failureReason -notmatch '(?i)cutoff|자정|종료 시각|마감 시각'})
  $hasFailure=($activeFailures.Count -gt 0 -or $cutoffFailures.Count -gt 0 -or @($Data.warnings).Count -gt 0)
  $suppressionReason=if($NoNotify){'NoNotify'}elseif(-not $hasFailure){'no_active_failure'}else{''}
  [pscustomobject]@{hasActiveFailure=[bool]$hasFailure;notify=([bool]$hasFailure -and -not $NoNotify);suppressionReason=$suppressionReason}
}

function Format-StatusReport($Data) {
  $terminalCycles=@(Get-ObjectValue $Data 'terminalCycles');$warnings=@(Get-ObjectValue $Data 'warnings')
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add('# Escape! Zombie School 게시 상태')
  $lines.Add('')
  $lines.Add(("생성 시각: {0}" -f $Data.generatedAtKst))
  $lines.Add(("알림 요약: {0}" -f (Get-StatusSummary $Data)))
  $lines.Add('')
  $lines.Add('## 다음 예약')
  $futureTasks = @($Data.tasks | Where-Object { $_.enabled -and $_.state -ne 'Disabled' -and $_.taskName -notmatch '(?i)StatusReport' -and -not [string]::IsNullOrWhiteSpace([string]$_.nextRunTime) } | Sort-Object nextRunTime)
  if ($futureTasks.Count -gt 0) {
    $next = $futureTasks[0]
    $lines.Add(("가장 가까운 예약: {0} — {1}" -f $next.nextRunTime, $next.taskName))
  } else { $lines.Add('가까운 예약 시각을 확인할 수 없습니다.') }
  foreach ($task in $Data.tasks) {
    $lines.Add(("- {0}: {1}; 상태 {2}; 사용 {3}; 다음 실행 {4}" -f $task.taskName, (Get-TaskResultLabel $task), $task.state, $(if($task.enabled){'예'}else{'아니요'}), $(if ([string]::IsNullOrWhiteSpace([string]$task.nextRunTime)) { '없음' } else { $task.nextRunTime })))
  }
  $lines.Add('')
  $lines.Add('## 언어별 최근 게시 상태')
  $lines.Add('| 플랫폼 | 언어 | 상태 | 기록 시각 (KST) | 실패 원인 |')
  $lines.Add('|---|---|---|---|---|')
  foreach ($row in $Data.postingStates) {
    $lines.Add(("| {0} | {1} | {2} | {3} | {4} |" -f $row.platform, $row.language, $row.statusLabel, $row.intentTimeKst, (ConvertTo-OneLine ([string]$row.failureReason) 160)))
  }
  $lines.Add('')
  $lines.Add('`publish_intent`는 게시 의도 기록이며 사용자 확인 대기 상태입니다. 이 보고서는 게시 성공이나 검증 완료로 해석하지 않습니다.')
  $lines.Add('')
  $lines.Add('## 재시도 대기')
  if (@($Data.nextRetries | Where-Object status -eq 'retry_wait').Count -eq 0) { $lines.Add('대기 중인 재시도 시각 없음') }
  foreach ($retry in $Data.nextRetries) {
    if($retry.status -ne 'retry_wait'){continue}
    $lines.Add(("- {0}: {1}; 다음 재시도 UTC {2}; 원인 {3}" -f $retry.cycleId, $retry.status, $(if ($retry.nextRetryUtc) { $retry.nextRetryUtc } else { '예약 없음' }), (ConvertTo-OneLine ([string]$retry.failureReason) 160)))
  }
  $lines.Add('')
  $lines.Add('## 대기열')
  if (@($Data.queuedCycles).Count -eq 0) { $lines.Add('오늘 대기열 항목 없음') }
  foreach ($cycle in $Data.queuedCycles) {
    $lines.Add(("- {0}: {1}; 시도 {2}; 마지막 오류 {3}" -f $cycle.cycleId, $cycle.status, $cycle.attempts, (ConvertTo-OneLine ([string]$cycle.failureReason) 160)))
  }
  $lines.Add('')
  $lines.Add('## 완료 또는 제출 종료')
  if($terminalCycles.Count -eq 0){$lines.Add('종료 상태 항목 없음')}
  foreach($cycle in $terminalCycles){$lines.Add(("- {0}: {1}; 시도 {2}; 사용자 확인 여부와 게시 성공은 별도입니다." -f $cycle.cycleId,$cycle.status,$cycle.attempts))}
  $lines.Add('')
  $lines.Add('## 읽기 경고')
  if($warnings.Count -eq 0){$lines.Add('읽기 오류 없음')}
  foreach($warning in $warnings){$lines.Add("- $(ConvertTo-OneLine ([string]$warning) 200)")}
  return ($lines -join [Environment]::NewLine)
}

function Get-ReceiptRows([string]$RepoRoot, [string]$Platform, [string]$ReceiptDirectory, [string]$Today,[System.Collections.Generic.List[string]]$Warnings) {
  $rows = @()
  if (-not (Test-Path -LiteralPath $ReceiptDirectory)) { return $rows }
  foreach ($file in Get-ChildItem -LiteralPath $ReceiptDirectory -File -Filter "$Today-*.json" -ErrorAction SilentlyContinue) {
    try { $receipt = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop } catch { $Warnings.Add("영수증 JSON 파싱 실패: $($file.Name) — $($_.Exception.Message)"); continue }
    if ($Platform -eq 'x' -and $null -eq $receipt.entries) { continue }
    foreach ($language in @('ja','en','vi','ko')) {
      $entryProperty = $receipt.entries.PSObject.Properties[$language]
      if ($null -eq $entryProperty) { continue }
      $entry = $entryProperty.Value
      if ($null -eq $entry) { continue }
      $state = [string]$entry.state
      $publishIntentUtc = Get-ObjectValue $entry 'publishIntentUtc'
      $selectedUtc = Get-ObjectValue $entry 'selectedUtc'
      $intent = Get-ObjectValue $entry 'intent'
      $time = if ($publishIntentUtc) { [string]$publishIntentUtc } elseif ($selectedUtc) { [string]$selectedUtc } elseif ((Get-ObjectValue $intent 'createdUtc')) { [string](Get-ObjectValue $intent 'createdUtc') } elseif ((Get-ObjectValue $intent 'preparedUtc')) { [string](Get-ObjectValue $intent 'preparedUtc') } else { [string](Get-ObjectValue $receipt 'createdUtc') }
      $kstTime = ''
      if (-not [string]::IsNullOrWhiteSpace($time)) {
        try { $kstTime = [TimeZoneInfo]::ConvertTime([DateTimeOffset]::Parse($time), [TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')).ToString("yyyy-MM-dd HH:mm:ss 'KST'") } catch { $kstTime = $time }
      }
      $label = switch ($state) {
        'publish_intent' { '게시 의도 기록·사용자 확인 대기'; break }
        'verified' { '영수증 검증 완료'; break }
        'prepared' { '게시 전 초안 준비'; break }
        'selected' { '게시 항목 선택'; break }
        default { if ($state) { $state } else { '상태 없음' } }
      }
      $receiptError = Get-ObjectValue $receipt 'lastError'
      $failedLanguage = Get-ObjectValue $receipt 'failedLanguage'
      $failure = if ($failedLanguage -ceq $language -and $state -in @('selected','prepared')) { Get-FailureSummary $receiptError } else { '' }
      $cycleId = Get-ObjectValue $receipt 'cycleId'
      if (-not $cycleId) { $cycleId = Get-ObjectValue $receipt 'runId' }
      if (-not $cycleId) { $cycleId = [IO.Path]::GetFileNameWithoutExtension($file.Name) }
      $rows += [pscustomobject]@{ platform=$Platform; language=$language; statusLabel=$label; intentTimeKst=$kstTime; failureReason=$failure; cycleId=[string]$cycleId; rawState=$state }
    }
  }
  return $rows
}

function Test-CycleHasStartRecord([string]$RepoRoot,[string]$CycleId,[System.Collections.Generic.List[string]]$Warnings) {
  $agentRoom=Join-Path $RepoRoot 'Developer/agent_room'
  foreach($path in @((Join-Path $agentRoom 'social_posting_scheduled_queue.json'),(Join-Path $agentRoom ('social_posting_today_override_queue_'+$CycleId.Substring(0,10)+'.json')))){
    if(-not (Test-Path -LiteralPath $path)){continue}
    try{$queue=Get-Content -LiteralPath $path -Raw -Encoding UTF8|ConvertFrom-Json -ErrorAction Stop}catch{$Warnings.Add("대기열 JSON 파싱 실패: $([IO.Path]::GetFileName($path)) — $($_.Exception.Message)");continue}
    foreach($collectionName in @('cycles','entries')){foreach($entry in @(Get-ObjectValue $queue $collectionName)){if((Get-ObjectValue $entry 'cycleId') -ceq $CycleId){return $true}}}
  }
  if(Test-Path -LiteralPath (Join-Path (Join-Path $agentRoom 'social_posting_scheduled_retries') ($CycleId+'.json'))){return $true}
  foreach($receiptPath in @((Join-Path (Join-Path $agentRoom 'x_posting_receipts') ($CycleId+'.json')),(Join-Path (Join-Path $agentRoom 'facebook_posting_receipts') ($CycleId+'.json')))){if(Test-Path -LiteralPath $receiptPath){return $true}}
  return $false
}

function Get-MissedStartWarnings([string]$RepoRoot,[string]$Today,[DateTimeOffset]$NowKst,[System.Collections.Generic.List[string]]$Warnings) {
  $agentRoom=Join-Path $RepoRoot 'Developer/agent_room';$proofPath=Join-Path $agentRoom ('social_posting_today_schedule_'+$NowKst.ToString('yyyyMMdd')+'.json');$dueCycles=@()
  if(Test-Path -LiteralPath $proofPath){
    try{$proof=Get-Content -LiteralPath $proofPath -Raw -Encoding UTF8|ConvertFrom-Json -ErrorAction Stop}catch{$Warnings.Add("오늘 예약 증거 JSON 파싱 실패: $([IO.Path]::GetFileName($proofPath)) — $($_.Exception.Message)");return}
    foreach($task in @($proof)){
      if([string]::IsNullOrWhiteSpace([string]$task.runId) -or [string]::IsNullOrWhiteSpace([string]$task.next)){continue}
      try{$next=[DateTimeOffset]::Parse([string]$task.next);if($next -le $NowKst -and $task.runId -match ('^'+[regex]::Escape($Today)+'-\d{4}$')){$dueCycles += [string]$task.runId}}catch{$Warnings.Add("오늘 예약 증거 시각 해석 실패: $([string]$task.name)")}
    }
  } else {
    $configPath=Join-Path $RepoRoot 'marketing/x_daily_zombie_school_posting/posting_config.json'
    if(-not (Test-Path -LiteralPath $configPath)){return}
    try{$config=Get-Content -LiteralPath $configPath -Raw -Encoding UTF8|ConvertFrom-Json -ErrorAction Stop}catch{$Warnings.Add('게시 설정 JSON 파싱 실패: posting_config.json');return}
    foreach($slot in @($config.schedule_times)){try{$time=[TimeSpan]::ParseExact([string]$slot,'hh\:mm',[Globalization.CultureInfo]::InvariantCulture);if($time -le $NowKst.TimeOfDay){$dueCycles += ($Today+'-'+$time.ToString('hhmm'))}}catch{$Warnings.Add("게시 설정 예약 시각 해석 실패: $([string]$slot)")}}
  }
  foreach($cycleId in @($dueCycles|Select-Object -Unique)){if(-not (Test-CycleHasStartRecord $RepoRoot $cycleId $Warnings)){$Warnings.Add("예정시각경과·시작기록없음 $cycleId")}}
}

function Get-ReportDataFromSnapshot([string]$RepoRoot,$TaskSnapshot) {
  $kst = Get-KstNow
  $today = $kst.ToString('yyyy-MM-dd')
  $warnings=[System.Collections.Generic.List[string]]::new()
  $tasks = @()
  foreach ($task in @($TaskSnapshot)) {
    if($null -ne $task.PSObject.Properties['lastTaskResult']){$tasks+= [pscustomobject]@{taskName=[string]$task.taskName;taskPath=[string]$task.taskPath;state=[string]$task.state;enabled=[bool]$task.enabled;lastTaskResult=[int]$task.lastTaskResult;lastRunTime=[string]$task.lastRunTime;nextRunTime=[string]$task.nextRunTime};continue}
    $info = $null
    try { $info = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction Stop } catch { $warnings.Add("예약 작업 정보 읽기 실패: $($task.TaskName) — $($_.Exception.Message)") }
    $next = ''; $last = ''; $result = 267011
    if ($null -ne $info) {
      if ($info.NextRunTime -and $info.NextRunTime.Year -gt 1900) { $next = [TimeZoneInfo]::ConvertTime([DateTimeOffset]$info.NextRunTime, [TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')).ToString("yyyy-MM-dd HH:mm:ss 'KST'") }
      if ($info.LastRunTime -and $info.LastRunTime.Year -gt 1900) { $last = [TimeZoneInfo]::ConvertTime([DateTimeOffset]$info.LastRunTime, [TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')).ToString("yyyy-MM-dd HH:mm:ss 'KST'") }
      $result = [int]$info.LastTaskResult
    }
    $tasks += [pscustomobject]@{ taskName=$task.TaskName; taskPath=$task.TaskPath; state=[string]$task.State; enabled=[bool]$task.Settings.Enabled; lastTaskResult=$result; lastRunTime=$last; nextRunTime=$next }
  }
  $posting = @()
  $posting += Get-ReceiptRows $RepoRoot 'x' (Join-Path $RepoRoot 'Developer/agent_room/x_posting_receipts') $today $warnings
  $posting += Get-ReceiptRows $RepoRoot 'facebook' (Join-Path $RepoRoot 'Developer/agent_room/facebook_posting_receipts') $today $warnings
  $latest = @()
  foreach ($platform in @('x','facebook')) { foreach ($language in @('ja','en','vi','ko')) {
    $candidate = @($posting | Where-Object { $_.platform -eq $platform -and $_.language -eq $language } | Sort-Object cycleId -Descending | Select-Object -First 1)
    if ($candidate.Count) { $latest += $candidate[0] } else { $latest += [pscustomobject]@{ platform=$platform; language=$language; statusLabel='오늘 영수증 없음'; intentTimeKst=''; failureReason=''; cycleId=''; rawState='' } }
  } }
  $queueRows = @()
  $queueFiles = @((Join-Path $RepoRoot ('Developer/agent_room/social_posting_today_override_queue_' + $today + '.json')), (Join-Path $RepoRoot 'Developer/agent_room/social_posting_scheduled_queue.json'))
  foreach ($queueFile in $queueFiles) {
    if (-not (Test-Path -LiteralPath $queueFile)) { continue }
    try { $queue = Get-Content -LiteralPath $queueFile -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop } catch { $warnings.Add("대기열 JSON 파싱 실패: $([IO.Path]::GetFileName([string]$queueFile)) — $($_.Exception.Message)"); continue }
    foreach ($cycle in @(Get-ObjectValue $queue 'cycles')) {
      $cycleId = Get-ObjectValue $cycle 'cycleId'
      if (-not $cycleId) { continue }
      $queueRows += [pscustomobject]@{ cycleId=[string]$cycleId; status=[string](Get-ObjectValue $cycle 'status'); attempts=[int](Get-ObjectValue $cycle 'attempts'); failureReason=(Get-FailureSummary (Get-ObjectValue $cycle 'lastError')) }
    }
    foreach ($cycle in @(Get-ObjectValue $queue 'entries')) {
      $cycleId = Get-ObjectValue $cycle 'cycleId'
      if (-not $cycleId) { continue }
      $queueRows += [pscustomobject]@{ cycleId=[string]$cycleId; status=[string](Get-ObjectValue $cycle 'status'); attempts=[int](Get-ObjectValue $cycle 'attempts'); failureReason=(Get-FailureSummary (Get-ObjectValue $cycle 'lastError')) }
    }
  }
  $retryRows = @()
  $terminalRows=@()
  $retryDirectory = Join-Path $RepoRoot 'Developer/agent_room/social_posting_scheduled_retries'
  if (Test-Path -LiteralPath $retryDirectory) {
    foreach ($retryFile in Get-ChildItem -LiteralPath $retryDirectory -File -Filter "$today-*.json" -ErrorAction SilentlyContinue) {
      try { $retryData = Get-Content -LiteralPath $retryFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop } catch { $warnings.Add("재시도 JSON 파싱 실패: $($retryFile.Name) — $($_.Exception.Message)"); continue }
      foreach ($retry in @(Get-ObjectValue $retryData 'entries')) {
        $cycleId = Get-ObjectValue $retry 'cycleId'
        if (-not $cycleId) { continue }
        $status=[string](Get-ObjectValue $retry 'status')
        $row=[pscustomobject]@{ cycleId=[string]$cycleId; status=$status; attempts=[int](Get-ObjectValue $retry 'attempts'); nextRetryUtc=[string](Get-ObjectValue $retry 'nextRetryUtc'); failureReason=(Get-FailureSummary (Get-ObjectValue $retry 'lastError')) }
        if($status -in @('complete','submitted','submitted_with_unresolved_intents')){$terminalRows+=$row}elseif($status -eq 'retry_wait'){$retryRows+=$row}else{$queueRows+=$row}
      }
    }
  }
  foreach($row in @($queueRows)){if($row.status -in @('complete','submitted','submitted_with_unresolved_intents')){$terminalRows+=$row}}
  $queueRows=@($queueRows|Where-Object{$_.status -notin @('complete','submitted','submitted_with_unresolved_intents')})
  Get-MissedStartWarnings $RepoRoot $today $kst $warnings
  return [pscustomobject]@{ generatedAtKst=$kst.ToString("yyyy-MM-dd HH:mm:ss 'KST'"); tasks=$tasks; postingStates=$latest; queuedCycles=$queueRows; nextRetries=$retryRows; terminalCycles=@($terminalRows|Sort-Object cycleId -Unique);warnings=@($warnings) }
}

function Get-LiveReportData([string]$RepoRoot) {
  $snapshot=@(Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like 'EscapeZombieSchool-SocialPosting*' } | ForEach-Object { [pscustomobject]@{TaskName=$_.TaskName;TaskPath=$_.TaskPath;State=$_.State;Settings=$_.Settings} })
  Get-ReportDataFromSnapshot $RepoRoot $snapshot
}

function Show-StatusToast([string]$Body) {
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
    $null = [Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]
    $null = [Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]
    $null = [Windows.UI.Notifications.ToastNotification,Windows.UI.Notifications,ContentType=WindowsRuntime]
    $escaped = [System.Security.SecurityElement]::Escape((ConvertTo-OneLine $Body 240))
    $xmlText = "<toast><visual><binding template='ToastGeneric'><text>좀비학교 게시 상태</text><text>$escaped</text></binding></visual></toast>"
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($xmlText)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Windows PowerShell').Show($toast)
    return $true
  } catch { return $false }
}

function Update-OrcaStatusComment($Data,[string]$RepoRoot) {
  Push-Location -LiteralPath $RepoRoot
  try {
  $command=$env:ORCA_CLI_COMMAND;if([string]::IsNullOrWhiteSpace($command)){$command='orca'}
  $currentOutput=@(& $command worktree current --json 2>&1)
  if($LASTEXITCODE -ne 0){throw "orca worktree current failed: $($currentOutput -join ' ')"}
  $current=($currentOutput -join [Environment]::NewLine)|ConvertFrom-Json -ErrorAction Stop
  $worktreeId=[string]$current.result.worktree.id
  if([string]::IsNullOrWhiteSpace($worktreeId)){throw 'Orca did not return the current worktree ID'}
  $showOutput=@(& $command worktree show --worktree $worktreeId --json 2>&1)
  if($LASTEXITCODE -ne 0){throw "orca worktree show failed: $($showOutput -join ' ')"}
  $show=($showOutput -join [Environment]::NewLine)|ConvertFrom-Json -ErrorAction Stop
  $oldComment=[string]$show.result.worktree.comment
  $line="게시 상태 {0} · {1}" -f $Data.generatedAtKst,(Get-StatusSummary $Data)
  $block="<!-- zombie-school-social-status:start -->`n$line`n<!-- zombie-school-social-status:end -->"
  $pattern='(?s)<!-- zombie-school-social-status:start -->.*?<!-- zombie-school-social-status:end -->'
  $newComment=if($oldComment -match $pattern){[regex]::Replace($oldComment,$pattern,[System.Text.RegularExpressions.MatchEvaluator]{param($match)$block},1)}elseif([string]::IsNullOrWhiteSpace($oldComment)){$block}else{$oldComment.TrimEnd()+"`n`n"+$block}
  $setOutput=@(& $command worktree set --worktree $worktreeId --comment $newComment --unread --json 2>&1)
  if($LASTEXITCODE -ne 0){throw "orca worktree set failed: $($setOutput -join ' ')"}
  $setResult=($setOutput -join [Environment]::NewLine)|ConvertFrom-Json -ErrorAction Stop
  if($setResult.ok -eq $false){throw 'Orca refused the status comment update'}
  return $worktreeId
  } finally { Pop-Location }
}

if ($FixturePath) {
  if (-not $TestOnly) { throw '-FixturePath is allowed only with -TestOnly' }
  $fixture = Get-Content -LiteralPath $FixturePath -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
  if($fixture.repoRoot){$data=Get-ReportDataFromSnapshot ([string]$fixture.repoRoot) @($fixture.tasks)}else{$data=$fixture}
} elseif ($TestOnly) {
  throw '-TestOnly requires -FixturePath so tests never read live tasks or receipts'
} else {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
  $data = Get-LiveReportData $repoRoot
}

$report = Format-StatusReport $data
$notificationGate=Get-NotificationGate $data -NoNotify:$NoNotify
if ($TestOnly) { Write-Output $report; Write-Output ('STATUS_NOTIFICATION_GATE_JSON=' + ($notificationGate|ConvertTo-Json -Compress)); exit 0 }

$outputDirectory = Join-Path $PSScriptRoot 'social_posting_status_reports'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$latestPath = Join-Path $outputDirectory 'latest.md'
$timestampPath = Join-Path $outputDirectory ((Get-KstNow).ToString('yyyyMMdd-HHmmss') + '-KST.md')
Set-Content -LiteralPath $latestPath -Value $report -Encoding UTF8
Set-Content -LiteralPath $timestampPath -Value $report -Encoding UTF8
$notificationSent = $false
if ($notificationGate.notify) {
  $notificationSent = [bool](Show-StatusToast (Get-StatusSummary $data))
}
$orcaUpdated=$false;$orcaWorktreeId='';$orcaError=''
if($notificationGate.notify){try{$orcaWorktreeId=Update-OrcaStatusComment $data $repoRoot;$orcaUpdated=$true}catch{$orcaError=ConvertTo-OneLine $_.Exception.Message 240}}
$delivery=[pscustomobject]@{generatedAtKst=$data.generatedAtKst;hasActiveFailure=$notificationGate.hasActiveFailure;suppressionReason=$notificationGate.suppressionReason;notificationAttempted=$notificationGate.notify;notificationSent=$notificationSent;orcaCommentAttempted=$notificationGate.notify;orcaCommentUpdated=$orcaUpdated;orcaWorktreeId=$orcaWorktreeId;orcaUpdateError=$orcaError;summary=(Get-StatusSummary $data)}
$deliveryPath=Join-Path $outputDirectory 'latest.delivery.json';Set-Content -LiteralPath $deliveryPath -Value ($delivery|ConvertTo-Json -Depth 6) -Encoding UTF8
Write-Output ([pscustomobject]@{ status='written'; latestPath=$latestPath; timestampPath=$timestampPath; deliveryPath=$deliveryPath; hasActiveFailure=$notificationGate.hasActiveFailure;suppressionReason=$notificationGate.suppressionReason;notificationAttempted=$notificationGate.notify;notificationSent=$notificationSent;orcaCommentAttempted=$notificationGate.notify;orcaCommentUpdated=$orcaUpdated; orcaWorktreeId=$orcaWorktreeId; orcaUpdateError=$orcaError } | ConvertTo-Json -Compress)
