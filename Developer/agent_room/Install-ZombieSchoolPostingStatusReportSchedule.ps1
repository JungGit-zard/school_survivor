[CmdletBinding()]
param(
  [string]$TaskName='EscapeZombieSchool-SocialPostingStatusReport',
  [string]$ReportScriptPath='',
  [switch]$TestOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($ReportScriptPath)){$ReportScriptPath=Join-Path $PSScriptRoot 'Write-ZombieSchoolPostingStatusReport.ps1'}

function Get-NextHalfHourKst {
  $zone=[TimeZoneInfo]::FindSystemTimeZoneById('Korea Standard Time')
  $kst=[TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow,$zone)
  $base=[DateTime]::new($kst.Year,$kst.Month,$kst.Day,$kst.Hour,0,0)
  if($kst.Minute -lt 30){$base=$base.AddMinutes(30)}else{$base=$base.AddHours(1)}
  [DateTimeOffset]::new($base,[TimeSpan]::FromHours(9)).ToString('yyyy-MM-ddTHH:mm:sszzz')
}

function New-StatusReportTaskXml([string]$Name,[string]$ScriptPath,[string]$UserId,[string]$StartBoundary,[string]$WorkingDirectory=(Split-Path -Parent ([IO.Path]::GetFullPath($ScriptPath)))) {
  $escapedScript=[System.Security.SecurityElement]::Escape([IO.Path]::GetFullPath($ScriptPath))
  $escapedUser=[System.Security.SecurityElement]::Escape($UserId)
  $escapedBoundary=[System.Security.SecurityElement]::Escape($StartBoundary)
  $escapedWorkingDirectory=[System.Security.SecurityElement]::Escape([IO.Path]::GetFullPath($WorkingDirectory))
  [xml]@"
<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task" version="1.4">
  <RegistrationInfo><Description>Read-only Escape Zombie School social posting status report every 30 minutes.</Description><URI>\$Name</URI></RegistrationInfo>
  <Triggers><TimeTrigger><Repetition><Interval>PT30M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>$escapedBoundary</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$escapedUser</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><WakeToRun>true</WakeToRun><ExecutionTimeLimit>PT5M</ExecutionTimeLimit><Enabled>true</Enabled><Hidden>true</Hidden><RunOnlyIfIdle>false</RunOnlyIfIdle><AllowStartOnDemand>true</AllowStartOnDemand><UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine></Settings>
  <Actions Context="Author"><Exec><Command>powershell.exe</Command><Arguments>-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File &quot;$escapedScript&quot;</Arguments><WorkingDirectory>$escapedWorkingDirectory</WorkingDirectory></Exec></Actions>
</Task>
"@
}

$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$xml=New-StatusReportTaskXml $TaskName $ReportScriptPath ([Security.Principal.WindowsIdentity]::GetCurrent().Name) (Get-NextHalfHourKst) $repoRoot
if($TestOnly){Write-Output $xml.OuterXml;return}
Register-ScheduledTask -TaskName $TaskName -Xml $xml.OuterXml -Force|Out-Null
$task=Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
$taskInfo=Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop
$action=@($task.Actions|Where-Object{$_.Execute -match 'powershell\.exe' -and $_.Arguments -match '-WindowStyle Hidden' -and $_.Arguments -match [regex]::Escape([IO.Path]::GetFullPath($ReportScriptPath)) -and [IO.Path]::GetFullPath($_.WorkingDirectory) -ceq $repoRoot})
$trigger=@($task.Triggers|Where-Object{$_.Repetition.Interval -eq 'PT30M' -and [string]::IsNullOrWhiteSpace([string]$_.Repetition.Duration) -and $null -eq $_.EndBoundary})
if(-not $task.Settings.Enabled -or $task.State -eq 'Disabled' -or $task.Settings.MultipleInstances -ne 'IgnoreNew' -or -not $task.Settings.StartWhenAvailable -or -not $task.Settings.WakeToRun -or ([string]$task.Settings.ExecutionTimeLimit) -ne 'PT5M' -or -not $task.Settings.Hidden -or $task.Principal.LogonType -ne 'Interactive' -or $action.Count -ne 1 -or $trigger.Count -ne 1){throw 'Status report schedule readback did not match enabled, hidden, interactive, 30-minute indefinite, WakeToRun, StartWhenAvailable, IgnoreNew, five-minute settings.'}
[pscustomobject]@{taskName=$TaskName;state=[string]$task.State;enabled=[bool]$task.Settings.Enabled;nextRunTime=$taskInfo.NextRunTime;repetition=$task.Triggers[0].Repetition.Interval;duration=$task.Triggers[0].Repetition.Duration;hidden=[bool]$task.Settings.Hidden;interactiveLogon=$task.Principal.LogonType;wakeToRun=[bool]$task.Settings.WakeToRun;startWhenAvailable=[bool]$task.Settings.StartWhenAvailable;multipleInstances=[string]$task.Settings.MultipleInstances;executionTimeLimit=$task.Settings.ExecutionTimeLimit}|ConvertTo-Json -Compress
