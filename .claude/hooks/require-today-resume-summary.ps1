$ErrorActionPreference = 'Stop'

$projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
$summary = Join-Path $projectDir 'Developer\today_work_required_resume_summary_2026-07-17.md'

if (-not (Test-Path -LiteralPath $summary)) {
    Write-Error "필수 재개 요약 파일이 없습니다: $summary"
    exit 1
}

Write-Output '=== REQUIRED RESUME SUMMARY ==='
Get-Content -LiteralPath $summary -Raw -Encoding UTF8
Write-Output '=== END REQUIRED RESUME SUMMARY ==='
