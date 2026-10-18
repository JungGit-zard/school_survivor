[CmdletBinding()]
param([string]$ServiceRoot = (Join-Path $env:LOCALAPPDATA 'hermes/gateway-service'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Never elevate, stop a service, or invoke a scheduled task from this script.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'ADMINISTRATOR_REQUIRED: No changes made. Run this reviewed script from an administrator PowerShell session. Automatic elevation is intentionally not attempted.'
}

$ServiceRoot = [IO.Path]::GetFullPath($ServiceRoot)
$wrapper = Join-Path $ServiceRoot 'Hermes_Gateway_HiddenRun.vbs'
$reviewedWrapper = Join-Path $PSScriptRoot 'Hermes_Gateway_HiddenRun.vbs'
foreach ($path in @($wrapper, $reviewedWrapper)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required reviewed wrapper is missing: $path" }
}
if ((Get-FileHash -LiteralPath $wrapper -Algorithm SHA256).Hash -cne (Get-FileHash -LiteralPath $reviewedWrapper -Algorithm SHA256).Hash) {
    throw 'WRAPPER_HASH_MISMATCH: Canonical wrapper differs from the reviewed sibling file. No tasks changed.'
}

$names = @('Hermes_Gateway', 'Hermes_Gateway_Watchdog', 'Hermes_Gateway_HourlyRestart')
$wscript = Join-Path $env:SystemRoot 'System32/wscript.exe'
$sourcePaths = @('Hermes_Gateway.cmd', 'Hermes_Gateway_Watchdog.cmd', 'Hermes_Gateway_HourlyRestart.ps1')
$sourceHashes = @{}
foreach ($name in $sourcePaths) {
    $path = Join-Path $ServiceRoot $name
    $sourceHashes[$name] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
}

# Validate all three existing actions before changing any action.
$plans = @(foreach ($name in $names) {
    $task = Get-ScheduledTask -TaskName $name
    if (@($task.Actions).Count -ne 1) { throw "Unexpected action count: $name" }
    $old = $task.Actions[0]
    $execute = $old.Execute
    $arguments = [string]$old.Arguments
    if ($name -eq 'Hermes_Gateway_HourlyRestart') {
        if ([IO.Path]::GetFileName($execute) -ine 'powershell.exe') { throw 'Unexpected hourly restart executable.' }
        $fileMatch = [regex]::Match($arguments, '(?i)(?:^|\s)-File\s+("[^"]+"|''[^'']+''|\S+)')
        if (-not $fileMatch.Success) { throw 'Hourly restart has no explicit -File target.' }
        $file = $fileMatch.Groups[1].Value.Trim([char[]]@([char]34, [char]39))
        if ([IO.Path]::GetFullPath($file) -ine (Join-Path $ServiceRoot 'Hermes_Gateway_HourlyRestart.ps1')) {
            throw 'Hourly restart -File target differs from the canonical service script.'
        }
        if ($arguments -match '(?i)(?:^|\s)-WindowStyle\s+(\S+)') {
            if ($Matches[1] -ine 'Hidden') { throw 'Unexpected pre-existing hourly WindowStyle.' }
        } else { $arguments = '-WindowStyle Hidden ' + $arguments }
    } else {
        $target = Join-Path $ServiceRoot ($name + '.cmd')
        $expectedArguments = '"' + $wrapper + '" "' + $target + '"'
        if ($execute -ieq $target -and [string]::IsNullOrWhiteSpace($arguments)) {
            $execute = $wscript
            $arguments = $expectedArguments
        } elseif ($execute -ine $wscript -or $arguments -cne $expectedArguments) {
            throw "Unexpected existing task action: $name. No actions changed."
        }
    }
    [xml]$xml = Export-ScheduledTask -TaskName $name
    [pscustomobject]@{name=$name;old=$old;execute=$execute;arguments=$arguments;xml=$xml}
})

$backup = Join-Path $ServiceRoot ('task-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-cmdflash-' + $PID)
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($plan in $plans) { $plan.xml.OuterXml | Set-Content -LiteralPath (Join-Path $backup ($plan.name + '.before.xml')) -Encoding Unicode }
foreach ($name in $sourcePaths) { Copy-Item -LiteralPath (Join-Path $ServiceRoot $name) -Destination (Join-Path $backup $name) }
Copy-Item -LiteralPath $wrapper -Destination (Join-Path $backup 'Hermes_Gateway_HiddenRun.vbs')

$changed = @()
try {
    foreach ($plan in $plans) {
        [xml]$fresh = Export-ScheduledTask -TaskName $plan.name
        if ($fresh.Task.Actions.OuterXml -cne $plan.xml.Task.Actions.OuterXml) { throw "Task action changed concurrently: $($plan.name)" }
        $options = @{Execute=$plan.execute;Argument=$plan.arguments}
        if ($plan.old.WorkingDirectory) { $options.WorkingDirectory = $plan.old.WorkingDirectory }
        $action = New-ScheduledTaskAction @options
        Set-ScheduledTask -TaskName $plan.name -Action $action | Out-Null
        $changed += $plan
        [xml]$after = Export-ScheduledTask -TaskName $plan.name
        foreach ($section in @('Principals', 'Triggers', 'Settings')) {
            if ($plan.xml.Task.$section.OuterXml -cne $after.Task.$section.OuterXml) { throw "Unexpected non-action change: $($plan.name)/$section" }
        }
        $readback = (Get-ScheduledTask -TaskName $plan.name).Actions[0]
        if ($readback.Execute -ine $plan.execute -or [string]$readback.Arguments -cne $plan.arguments) { throw "Action readback mismatch: $($plan.name)" }
        $after.OuterXml | Set-Content -LiteralPath (Join-Path $backup ($plan.name + '.after.xml')) -Encoding Unicode
    }
    foreach ($name in $sourcePaths) {
        if ((Get-FileHash -LiteralPath (Join-Path $ServiceRoot $name) -Algorithm SHA256).Hash -cne $sourceHashes[$name]) { throw "Original script bytes changed concurrently: $name" }
    }
    $result = [pscustomobject]@{
        status='future_task_actions_hidden';backupDirectory=$backup
        tasks=@($plans.name);originalScriptHashes=$sourceHashes
        principalTriggersSettingsUnchanged=$true;originalScriptsUnchanged=$true
        serviceStopped=$false;liveTasksTriggered=$false
        actualFutureWindowAbsenceVerified=$false
    }
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backup 'result.json') -Encoding UTF8
    $result | ConvertTo-Json -Depth 5
} catch {
    $failure = $_
    foreach ($plan in @($changed | Sort-Object name -Descending)) {
        try { Set-ScheduledTask -TaskName $plan.name -Action $plan.old | Out-Null }
        catch { Write-Warning "Action rollback failed for $($plan.name): $($_.Exception.Message)" }
    }
    throw $failure
}
