[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
  [string]$TaskName = 'EscapeZombieSchool-SocialPostingFiveSlots',
  [string[]]$OldTaskNames = @('EscapeZombieSchool-XPosting','EscapeZombieSchool-FacebookPosting')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$times = @('02:00','06:00','11:00','17:00','21:00')
$taskPath = '\'
$description = 'EscapeZombieSchool serial Facebook then X posting: 02:00,06:00,11:00,17:00,21:00 Asia/Seoul; interactive desktop required.'
$timezone = Get-TimeZone
if ($timezone.Id -notin @('Korea Standard Time', 'Asia/Seoul')) { throw "Host timezone is '$($timezone.Id)'; Asia/Seoul (Korea Standard Time) is required. No schedule was changed." }

$runner = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'Invoke-ZombieSchoolFiveSlotPosting.ps1')).ProviderPath
$powershell = (Resolve-Path -LiteralPath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe')).ProviderPath
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $identity.User.Value
$arguments = '-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $runner
$rollbackDir = Join-Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'Developer\agent_room\social_posting_schedule_rollback_t_77083b1f') ([DateTimeOffset]::Now.ToString('yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($rollbackDir) | Out-Null

function Get-TaskStateRecord([string]$Name, [string]$SnapshotLabel = 'state') {
  $task = Get-ScheduledTask -TaskPath '\' -TaskName $Name -ErrorAction SilentlyContinue
  if ($null -eq $task) { return [pscustomobject]@{ taskName=$Name; exists=$false; state=$null; enabled=$null; nextRunTime=$null; xmlPath=$null } }
  $info = Get-ScheduledTaskInfo -TaskPath '\' -TaskName $Name -ErrorAction SilentlyContinue
  if ($SnapshotLabel -notmatch '^[A-Za-z0-9_-]+$') { throw "Invalid snapshot label: $SnapshotLabel" }
  $xmlPath = Join-Path $rollbackDir ($Name + '.' + $SnapshotLabel + '.xml')
  Export-ScheduledTask -TaskPath '\' -TaskName $Name | Set-Content -LiteralPath $xmlPath -Encoding UTF8
  return [pscustomobject]@{ taskName=$Name; exists=$true; state=[string]$task.State; enabled=[bool]$task.Settings.Enabled; nextRunTime=if($null -ne $info -and $info.NextRunTime){$info.NextRunTime.ToString('o')}else{$null}; xmlPath=$xmlPath }
}

function Test-NewTaskReadback([string]$Name) {
  $saved = Get-ScheduledTask -TaskName $Name -TaskPath '\'
  [xml]$xml = Export-ScheduledTask -TaskName $Name -TaskPath '\'
  $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace('t', $xml.DocumentElement.NamespaceURI)
  $savedTriggers = @($xml.SelectNodes('/t:Task/t:Triggers/*', $ns))
  $savedTimes = @($savedTriggers | ForEach-Object {
    $daily = $_.SelectSingleNode('t:ScheduleByDay/t:DaysInterval', $ns)
    $enabled = $_.SelectSingleNode('t:Enabled', $ns)
    $repeat = $_.SelectSingleNode('t:Repetition', $ns)
    if ($_.LocalName -ne 'CalendarTrigger' -or $null -eq $daily -or $daily.InnerText -ne '1' -or ($null -ne $enabled -and $enabled.InnerText -ne 'true') -or $null -ne $repeat) { throw 'Saved trigger is not enabled, daily, and non-repeating.' }
    ([datetime]::Parse($_.SelectSingleNode('t:StartBoundary', $ns).InnerText)).ToString('HH:mm')
  } | Sort-Object)
  if ($savedTriggers.Count -ne 5 -or ($savedTimes -join ',') -cne ($times -join ',')) { throw "Saved trigger times differ from $($times -join ',')." }
  $startWhenAvailable = $xml.SelectSingleNode('/t:Task/t:Settings/t:StartWhenAvailable', $ns)
  $multiple = $xml.SelectSingleNode('/t:Task/t:Settings/t:MultipleInstancesPolicy', $ns)
  $enabledSetting = $xml.SelectSingleNode('/t:Task/t:Settings/t:Enabled', $ns)
  if (($null -ne $startWhenAvailable -and $startWhenAvailable.InnerText -eq 'true') -or $null -eq $multiple -or $multiple.InnerText -ne 'IgnoreNew' -or ($null -ne $enabledSetting -and $enabledSetting.InnerText -eq 'false')) { throw 'Saved settings differ from enabled, no-backfill, IgnoreNew policy.' }
  $logon = $xml.SelectSingleNode('/t:Task/t:Principals/t:Principal/t:LogonType', $ns)
  $user = $xml.SelectSingleNode('/t:Task/t:Principals/t:Principal/t:UserId', $ns)
  if ($null -eq $logon -or $null -eq $user -or $logon.InnerText -ne 'InteractiveToken' -or $user.InnerText -ne $userSid) { throw 'Saved principal is not the current InteractiveToken user.' }
  if (@($saved.Actions).Count -ne 1 -or $saved.Actions[0].Execute -cne $powershell -or $saved.Actions[0].Arguments -cne $arguments -or $saved.Actions[0].WorkingDirectory -cne $PSScriptRoot) { throw 'Saved action differs from the serial orchestrator.' }
  return [pscustomobject]@{ taskName=$Name; state=[string]$saved.State; enabled=[bool]$saved.Settings.Enabled; triggerTimes=$savedTimes; nextRunTime=(Get-ScheduledTaskInfo -TaskName $Name -TaskPath '\').NextRunTime.ToString('o') }
}

$oldBefore = @($OldTaskNames | ForEach-Object { Get-TaskStateRecord $_ 'before' })
$proof = [ordered]@{ status='planned'; taskName=$TaskName; timezone='Asia/Seoul'; hostTimezone=$timezone.Id; times=$times; user=$identity.Name; userSid=$userSid; logonType='InteractiveToken'; multipleInstances='IgnoreNew'; startWhenAvailable=$false; executable=$powershell; arguments=$arguments; workingDirectory=$PSScriptRoot; rollbackDir=$rollbackDir; oldBefore=$oldBefore; newReadback=$null; oldAfter=$null; postingStarted=$false }

if (-not $PSCmdlet.ShouldProcess($TaskName, 'Register five-slot serial posting task and disable old per-platform tasks only after verified readback')) { $proof | ConvertTo-Json -Depth 8; return }

$oldEnabledToRestore = @($oldBefore | Where-Object { $_.exists -and $_.enabled } | ForEach-Object { $_.taskName })
try {
  $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $PSScriptRoot
  $triggers = @($times | ForEach-Object { New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.Add([timespan]::Parse($_))) })
  $principal = New-ScheduledTaskPrincipal -UserId $userSid -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 180) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  $settings.StartWhenAvailable = $false
  $settings.RestartCount = 0
  $settings.Enabled = $true
  Register-ScheduledTask -TaskName $TaskName -TaskPath $taskPath -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description $description -Force | Out-Null
  Enable-ScheduledTask -TaskName $TaskName -TaskPath $taskPath | Out-Null
  $proof.newReadback = Test-NewTaskReadback $TaskName
  foreach ($old in $oldBefore) { if ($old.exists -and $old.enabled) { Disable-ScheduledTask -TaskName $old.taskName -TaskPath '\' | Out-Null } }
  $proof.oldAfter = @($OldTaskNames | ForEach-Object { Get-TaskStateRecord $_ 'after' })
  $conflicts = @($proof.oldAfter | Where-Object { $_.exists -and $_.enabled })
  if ($conflicts.Count -gt 0) { throw 'One or more old posting tasks remained enabled after disable.' }
  $proof.status = 'registered_verified_old_disabled'
  $proof | ConvertTo-Json -Depth 10
}
catch {
  Disable-ScheduledTask -TaskName $TaskName -TaskPath $taskPath -ErrorAction SilentlyContinue | Out-Null
  foreach ($name in $oldEnabledToRestore) { Enable-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction SilentlyContinue | Out-Null }
  $proof.status = 'failed_restored_old_tasks'
  $proof.error = $_.Exception.Message
  $proof.oldAfter = @($OldTaskNames | ForEach-Object { Get-TaskStateRecord $_ 'after' })
  $proof | ConvertTo-Json -Depth 10
  throw
}
