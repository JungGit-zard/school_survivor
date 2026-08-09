# Escape! zombie school — Mandatory Pre-command Repository

Created: 2026-08-08
Owner: Madang_sue / Agent Room operations
Project root: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Board: `escape-zombie-school`

This directory is the canonical mandatory pre-command repository for Escape! zombie school subagents.
It replaces the loose file `Developer/agent_room/subagent_mandatory_precommand_document_list_2026-08-08.md`.
Do not copy policy bodies into this directory; `manifest.json` stores canonical repository paths so the source documents remain the only policy bodies.

## Mandatory first command

Run this before any task command in this repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "Developer/agent_room/mandatory_precommand/check-required-documents.ps1" -Profile <name> -Domain auto -TaskSummary "<safe short keyword summary>"
```

Use a real profile name: `threemini`, `uimini`, `levelmini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`, or `corpopsmini`.

The checker always includes `common`. With `-Domain auto`, it maps the profile to its domain and verifies both `common` and that profile domain. When `-TaskSummary` is present, it also scans the manifest `taskKeywords` and adds matched domains before outputting `matched_domains` and `match_evidence`.
Use an explicit domain only when a task spans or overrides the profile's normal lane:
`common`, `aab`, `graphics`, `ui`, `gameplay`, `qa`, `backend`, `audio`, `corporate`, `localization`, or `operations`.

## Profile-specific always-required documents

`manifest.json` may define `profileAlwaysRequired.<profile>` entries. These entries are appended for the matching profile after the selected common/domain documents, regardless of whether the checker was called with `-Domain auto`, `-Domain common`, or any explicit domain.

Current profile-specific rule:

- `launchmini` must always read `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md` before any Escape! zombie school task command. This is a generic reusable AAB/physical Android/Google login preflight; version-specific values, including v28, belong only in worked examples inside that document.

Profile-specific entries must not be used to force unrelated profiles to read launchmini-only policy. The checker appends them for the matching profile on `-Domain auto`, `-Domain common`, and every explicit domain.

## Common reading rule

Every subagent must read the selected `READ_REQUIRED` files emitted by the checker before its first task command. Do not pass the raw user command as `TaskSummary`; the agent must pass only a safe, short, keyword-style summary such as `AAB versionCode upload`, `weapon icon HUD`, or `stage boss QA`.
`SESSION_MEMORY.md` is special: read only the latest single `## Session ...` entry unless the user explicitly asks for older context or the current task cites a specific older Session/Entry.

## AAB / Google Play gate

For `launchmini` or `-Domain aab`, the checker requires both 2026-08-08 documents:

- `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `Developer/agent_room/codex_session_responsibility_reflection_2026-08-08.md`

It also requires the relevant AAB solution/readiness docs, including Android Google login AAB and Graphics Studio release-regression solution records.

## Output contract

The checker prints JSON with:

- `profile`
- `domain`
- `resolved_domains`
- `read_required[]` entries containing exact repository-relative `path`, `sha256`, and `why`
- `combined_receipt_sha256`

It exits nonzero if the central directory, manifest, selected required files, or selected globs are missing.
