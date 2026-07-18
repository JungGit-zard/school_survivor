param(
    [ValidateSet('check', 'reserve')]
    [string]$Mode = 'check',
    [int]$Limit = 3
)

$visibleBrowserIds = @(
    Get-Process chrome, chromium -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        ForEach-Object { $_.Id }
)
$cdpBrowserIds = @(
    netstat -ano -p tcp 2>$null |
        ForEach-Object {
            if ($_ -match '^\s*TCP\s+\S+:(?<LocalPort>\d+)\s+\S+\s+LISTENING\s+(?<Pid>\d+)\s*$') {
                $localPort = [int]$Matches.LocalPort
                if ($localPort -ge 9222 -and $localPort -le 9999) {
                    [int]$Matches.Pid
                }
            }
        }
)
$headlessTestIds = @(
    Get-Process chrome-headless-shell -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Id }
)

$count = @($visibleBrowserIds + $cdpBrowserIds + $headlessTestIds | Sort-Object -Unique).Count
$nextCount = $count + [int]($Mode -eq 'reserve')

if ($nextCount -gt $Limit) {
    Write-Error "게임 Chrome/CDP/테스트 브라우저 제한 초과: 현재 $count, 실행 후 $nextCount, 최대 $Limit"
    exit 1
}

Write-Output "GAME_BROWSER_INSTANCES=$count LIMIT=$Limit MODE=$Mode"
