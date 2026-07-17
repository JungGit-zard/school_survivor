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
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -ge 9222 -and $_.LocalPort -le 9999 } |
        ForEach-Object { $_.OwningProcess }
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
