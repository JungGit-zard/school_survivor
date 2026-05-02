# Session Continuity Protocol

This document is mandatory for BangBang Survivor work.

## Required Startup Read

At the start of every new agent session, read these files before planning or editing:

1. `project_develop_policy.md`
2. `Bang_Rules.md`
3. `AGENTS.md`
4. `CLAUDE.md`
5. The newest Markdown file in `Session_Logs/`

If `Session_Logs/` has no summary yet, create the first summary before ending the session.

## 3-Hour Summary Rule

Every 3 hours of active conversation or active project work, create or update a Markdown summary in `Session_Logs/`.

Use this filename format:

```text
Session_Logs/session_summary_YYYY-MM-DD_HHMM.md
```

If the exact start time is unknown, use the current local time.

## Required Summary Contents

Each 3-hour summary must include:

- Session date and local time.
- Current branch and latest known Git status.
- Important conversation points and user decisions.
- Project rules or policy decisions confirmed during the session.
- Program usage records, including important commands, builds, tests, dev server URLs, browser checks, and screenshots.
- Generated tools, components, scripts, documents, assets, and their purposes.
- Files created, edited, moved, or intentionally left untouched.
- Verification results and known warnings.
- Unresolved issues, next steps, and anything the next session must read first.

## Required End-of-Session Check

Before ending any substantial session:

1. Check whether 3 hours have passed since the last summary.
2. If yes, create a new summary or update the latest one.
3. Make sure the summary names the latest important files and decisions.
4. Run `git status --short --branch` and record notable pending changes.

## Force Rule

Do not rely only on chat memory for project continuity.
Important session knowledge must be preserved in `Session_Logs/` as Markdown text.
