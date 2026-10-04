[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This installer never starts a posting run or changes the old Orca automation.
$taskName = 'EscapeZombieSchool-XPosting'
$taskPath = '\'
$description = 'EscapeZombieSchool X browser posting with bounded same-cycle recovery: 09:00,12:00,18:00 Asia/Seoul; interactive desktop required.'
$previousDescription = 'EscapeZombieSchool X browser posting: 09:00,12:00,18:00 Asia/Seoul; interactive desktop required.'
$times = @('09:00', '12:00', '18:00')
$timezone = Get-TimeZone
if ($timezone.Id -notin @('Korea Standard Time', 'Asia/Seoul')) {
    throw "Host timezone is '$($timezone.Id)'; Asia/Seoul (Korea Standard Time) is required. No schedule was changed."
}

$runner = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPostingRecovery.ps1')).ProviderPath
$powershell = (Resolve-Path -LiteralPath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe')).ProviderPath
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $identity.User.Value
$arguments = '-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $runner
$existing = @(Get-ScheduledTask -TaskPath $taskPath | Where-Object { $_.TaskName -ceq $taskName })
if ($existing.Count -gt 0 -and $existing[0].Description -cnotin @($description, $previousDescription)) {
    throw "Task '$taskPath$taskName' exists without this campaign's ownership description; no task was changed."
}

$proof = [ordered]@{
    status = 'planned'
    taskName = $taskName
    taskPath = $taskPath
    timezone = 'Asia/Seoul'
    hostTimezone = $timezone.Id
    times = $times
    user = $identity.Name
    userSid = $userSid
    logonType = 'InteractiveToken'
    executable = $powershell
    arguments = $arguments
    workingDirectory = $PSScriptRoot
    enabled = $true
    multipleInstances = 'IgnoreNew'
    startWhenAvailable = $false
    restartCount = 0
    recovery = 'Same cycle only; at most 16 attempts, 300 seconds apart, ending at the next KST slot or after 75 minutes. Authentication, security, ambiguous desktop and uncertain publish stop without retry.'
    report = 'Writes an evidence-only daily report after each cycle; the 18:00 cycle is that day''s final scheduled update.'
    desktopRequired = 'User must be signed in with an unlocked interactive desktop.'
    replacedExistingTask = ($existing.Count -eq 1)
    nextRunTime = $null
    postingStarted = $false
}

if (-not $PSCmdlet.ShouldProcess("$taskPath$taskName", 'Register 09:00,12:00,18:00 KST interactive-user campaign task')) {
    $proof | ConvertTo-Json -Depth 4
    return
}

$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $PSScriptRoot
$triggers = @($times | ForEach-Object { New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.Add([timespan]::Parse($_))) })
$principal = New-ScheduledTaskPrincipal -UserId $userSid -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 90) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$settings.StartWhenAvailable = $false
$settings.RestartCount = 0
$settings.Enabled = $true
Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description $description -Force | Out-Null
Enable-ScheduledTask -TaskName $taskName -TaskPath $taskPath | Out-Null

try {
    $saved = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath
    [xml]$xml = Export-ScheduledTask -TaskName $taskName -TaskPath $taskPath
    $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('t', $xml.DocumentElement.NamespaceURI)
    $savedTriggers = @($xml.SelectNodes('/t:Task/t:Triggers/*', $ns))
    $savedTimes = @($savedTriggers | ForEach-Object {
        $daily = $_.SelectSingleNode('t:ScheduleByDay/t:DaysInterval', $ns)
        $triggerEnabled = $_.SelectSingleNode('t:Enabled', $ns)
        $repeat = $_.SelectSingleNode('t:Repetition', $ns)
        if ($_.LocalName -ne 'CalendarTrigger' -or $null -eq $daily -or $daily.InnerText -ne '1' -or ($null -ne $triggerEnabled -and $triggerEnabled.InnerText -ne 'true') -or $null -ne $repeat) {
            throw 'Saved trigger is not an enabled, non-repeating daily trigger.'
        }
        ([datetime]::Parse($_.SelectSingleNode('t:StartBoundary', $ns).InnerText)).ToString('HH:mm')
    } | Sort-Object)
    if ($savedTriggers.Count -ne 3 -or ($savedTimes -join ',') -cne ($times -join ',')) { throw 'Saved trigger times differ from 09:00,12:00,18:00.' }
    $savedEnabled = $xml.SelectSingleNode('/t:Task/t:Settings/t:Enabled', $ns)
    $savedStartWhenAvailable = $xml.SelectSingleNode('/t:Task/t:Settings/t:StartWhenAvailable', $ns)
    $savedMultiple = $xml.SelectSingleNode('/t:Task/t:Settings/t:MultipleInstancesPolicy', $ns)
    if ($saved.State -ne 'Ready' -or ($null -ne $savedStartWhenAvailable -and $savedStartWhenAvailable.InnerText -eq 'true') -or $null -eq $savedMultiple -or $savedMultiple.InnerText -ne 'IgnoreNew') { throw 'Saved scheduling settings differ from the requested enabled, no-backlog, single-run policy.' }
    $savedLogon = $xml.SelectSingleNode('/t:Task/t:Principals/t:Principal/t:LogonType', $ns)
    $savedUser = $xml.SelectSingleNode('/t:Task/t:Principals/t:Principal/t:UserId', $ns)
    if ($null -eq $savedLogon -or $null -eq $savedUser -or $savedLogon.InnerText -ne 'InteractiveToken' -or $savedUser.InnerText -ne $userSid) { throw 'Saved principal differs from the current interactive user.' }
    if (@($saved.Actions).Count -ne 1 -or $saved.Actions[0].Execute -cne $powershell -or $saved.Actions[0].Arguments -cne $arguments -or $saved.Actions[0].WorkingDirectory -cne $PSScriptRoot) { throw 'Saved posting command differs from the requested runner.' }
    $proof.status = 'registered_verified'
    $proof.nextRunTime = (Get-ScheduledTaskInfo -TaskName $taskName -TaskPath $taskPath).NextRunTime.ToString('o')
    $proof | ConvertTo-Json -Depth 4
}
catch {
    # Never leave this just-installed task enabled after a failed readback.
    Disable-ScheduledTask -TaskName $taskName -TaskPath $taskPath | Out-Null
    throw "Campaign task readback failed and the task was disabled: $($_.Exception.Message)"
}
