$ErrorActionPreference = "Stop"

$projectDir = if (-not [string]::IsNullOrWhiteSpace($env:CODEX_PROJECT_DIR)) {
    $env:CODEX_PROJECT_DIR
} elseif (-not [string]::IsNullOrWhiteSpace($env:CLAUDE_PROJECT_DIR)) {
    $env:CLAUDE_PROJECT_DIR
} else {
    (Get-Location).Path
}

$agentsPath = Join-Path $projectDir "AGENTS.md"
if (-not (Test-Path -LiteralPath $agentsPath -PathType Leaf)) {
    Write-Error "Required direct, scope-controlled execution policy is missing: $agentsPath"
    exit 1
}

$agentsContent = Get-Content -LiteralPath $agentsPath -Raw -Encoding UTF8
$roleHeading = "## Direct Scope-Controlled Execution Rules"
$sectionMatch = [regex]::Match(
    $agentsContent,
    "(?ms)^$([regex]::Escape($roleHeading))[ \t]*\r?\n(?<body>.*?)(?=^## |\z)"
)

if (-not $sectionMatch.Success) {
    Write-Error "AGENTS.md is missing the required direct, scope-controlled execution section."
    exit 1
}

$section = $sectionMatch.Groups["body"].Value
$requiredPatterns = @(
    @{ Name = "immediate execution"; Pattern = "immediate-execution" },
    @{ Name = "smallest coherent change"; Pattern = "smallest-coherent-change" },
    @{ Name = "subagent scope"; Pattern = "no-subagent-by-default" },
    @{ Name = "minimal verification"; Pattern = "minimal-verification" },
    @{ Name = "concise final report"; Pattern = "concise-final-report" }
)

foreach ($requirement in $requiredPatterns) {
    if ($section -notmatch $requirement.Pattern) {
        Write-Error "AGENTS.md direct execution policy is incomplete: missing $($requirement.Name)."
        exit 1
    }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

@"
=== REQUIRED DIRECT / SCOPE-CONTROLLED EXECUTION MODE ===
- Execute the user's authoritative request immediately; do not present a plan or ask for approval unless requested or genuinely blocked.
- Make the smallest coherent change that fully satisfies the request. Preserve unrelated architecture, behavior, interfaces, and code.
- Do not add optional improvements, speculative work, broad refactors, or whole-file rewrites unless strictly necessary.
- Use subagents, repeated reviews, broad audits/docs/tests, E2E, benchmarks, migrations, or infrastructure only when requested or strictly necessary.
- Ask only when correct implementation is impossible, destructive data loss is a real risk, or no reasonable default exists.
- Do not fix unrelated defects. Stop after implementation and proportionate minimum verification.
- Final response: only what changed, what was verified, and any genuine limitation or blocker; keep it concise.
=== END REQUIRED DIRECT / SCOPE-CONTROLLED EXECUTION MODE ===
"@
