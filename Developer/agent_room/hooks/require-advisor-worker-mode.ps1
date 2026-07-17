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
    Write-Error "Required Advisor/Worker policy is missing: $agentsPath"
    exit 1
}

$agentsContent = Get-Content -LiteralPath $agentsPath -Raw -Encoding UTF8
$roleHeading = "## $([char]0xBAA8)$([char]0xB378) $([char]0xC5ED)$([char]0xD560) $([char]0xBD84)$([char]0xB2F4): Advisor / Worker"
$sectionMatch = [regex]::Match(
    $agentsContent,
    "(?ms)^$([regex]::Escape($roleHeading))[ \t]*\r?\n(?<body>.*?)(?=^## |\z)"
)

if (-not $sectionMatch.Success) {
    Write-Error "AGENTS.md is missing the required Advisor / Worker section."
    exit 1
}

$section = $sectionMatch.Groups["body"].Value
$requiredPatterns = @(
    @{ Name = "Sol"; Pattern = "Sol" },
    @{ Name = "Advisor"; Pattern = "Advisor" },
    @{ Name = "Terra"; Pattern = "Terra" },
    @{ Name = "Worker"; Pattern = "Worker" },
    @{ Name = "model=terra"; Pattern = "model\s*=\s*[^\r\n]*\bterra\b" }
)

foreach ($requirement in $requiredPatterns) {
    if ($section -notmatch $requirement.Pattern) {
        Write-Error "AGENTS.md Advisor/Worker policy is incomplete: missing $($requirement.Name)."
        exit 1
    }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

@"
=== REQUIRED ADVISOR / WORKER MODE ===
- This mode is mandatory for every startup, resume, and compact session.
- Sol, the main session, is the Advisor: analyze requirements, decompose work, decide design, and write complete Worker briefs.
- Terra is the Worker: implement all code changes and tests. Delegate through the Agent tool with model=terra; parallelize independent work.
- Every brief must include known context, file paths, project conventions, pitfalls, completion criteria, and required tests.
- Sol must inspect the diff and run tests directly. Re-delegate failed work; Sol may directly handle only trivial one- or two-line finishing edits.
- Sol gives final approval and reports to the user.
=== END REQUIRED ADVISOR / WORKER MODE ===
"@
