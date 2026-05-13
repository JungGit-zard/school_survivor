# Claude Project Instructions

## Mandatory Session Continuity

Before planning, editing, testing, or summarizing work in this repository, read:

1. `project_develop_policy.md`
2. `Bang_Rules.md`
3. `AGENTS.md`
4. `SESSION_CONTINUITY.md`
5. The newest Markdown file in `Session_Logs/`

Follow `SESSION_CONTINUITY.md` strictly.

## 3-Hour Summary Requirement

Every 3 hours of active project work or active conversation, write a Markdown session summary to `Session_Logs/`.

The summary must record:

- Important conversation content.
- Program usage records.
- Commands, tests, builds, browser checks, screenshots, and results.
- Generated tools, components, documents, assets, and their purposes.
- Changed files and pending Git status.
- Unresolved issues and next-session instructions.

Do not open or continue a new substantial session without reading the latest summary in `Session_Logs/`.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
