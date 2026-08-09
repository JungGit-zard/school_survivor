# Madang_sue operations record — Three_Mini mandatory context centralization

Created: 2026-08-09 1544
Task: `t_d86b3010`
Worker: `madangsue`

## Goal

Centralize Three_Mini mandatory startup context under the project mandatory pre-command repository, then reduce the automatically loaded Three_Mini SOUL and Claude mirror body to a minimal pointer.

## Central repository

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/threemini_mandatory_context/START_HERE.md`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/threemini_mandatory_context/SOURCE_MANIFEST.json`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/threemini_mandatory_context/contents/`

The central repository contains copied policy bodies, not external-link placeholders. `SESSION_MEMORY.md` is represented by the latest single `## Session ...` entry only, matching the mandatory pre-command rule.

## Copied content files

- `contents/00_current_threemini_SOUL.md` — source `C:/Users/admin/AppData/Local/hermes/profiles/threemini/SOUL.md` before reduction
- `contents/01_AGENTS.md` — source `AGENTS.md`
- `contents/02_Bang_Rules.md` — source `Bang_Rules.md`
- `contents/03_CLAUDE.md` — source `CLAUDE.md`
- `contents/04_CONCEPTS.md` — source `CONCEPTS.md`
- `contents/05_codex_session_failure_postmortem_2026-08-08.md` — source `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `contents/06_escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md` — source `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `contents/07_manifest.json` — source `Developer/agent_room/mandatory_precommand/manifest.json`
- `contents/08_README.md` — source `Developer/agent_room/mandatory_precommand/README.md`
- `contents/09_graphics_studio_title_state_release_regression.md` — source `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
- `contents/10_project_develop_policy.md` — source `project_develop_policy.md`
- `contents/11_SESSION_CONTINUITY.md` — source `SESSION_CONTINUITY.md`
- `contents/12_SESSION_MEMORY_latest_entry.md` — source `SESSION_MEMORY.md` latest single entry only
- `contents/13_STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW.md` — source `STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW.md`

## Changed files

- `C:/Users/admin/AppData/Local/hermes/profiles/threemini/SOUL.md` — replaced with minimal repository pointer and imperative.
- `D:/JungSil/2.Minigame_project/school_survivor-integration/.claude/agents/threemini.md` — retained YAML frontmatter and replaced body with the same minimal pointer.
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Three_Mini.toml` — updated only `updated_at` and `[mandatory_precommand]` repository/start-here metadata; persona/capabilities were not changed.
- `Developer/agent_room/mandatory_precommand/manifest.json` — added `profileCentralizedRequired.threemini` pointing to the centralized `START_HERE.md`.
- `Developer/agent_room/mandatory_precommand/check-required-documents.ps1` — added auto-run centralized profile support and preserved UTF-8 BOM so Korean notice literals remain readable in Windows PowerShell.
- `Developer/agent_room/mandatory_precommand/threemini_mandatory_context/**` — added the dedicated central repository.
- `Developer/agent_room/madangsue_threemini_mandatory_context_centralization_2026-08-09.md` — this operations record.

## Verification

1. Madang_sue pre-command gate rerun after manifest change:
   - Command: `powershell -NoProfile -ExecutionPolicy Bypass -File Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile madangsue -Domain operations -TaskSummary threemini-context-centralization`
   - Result: exit 0; `matched_domains=[]`; `combined_receipt_sha256=9e273b35c821603e72598a5c9d69df7ad9ab000e24f5ef6f47b38f552f8341cc` after an unrelated concurrent `Bang_Rules.md` update changed the required-document receipt.

2. Three_Mini checker auto run:
   - Command: `powershell -NoProfile -ExecutionPolicy Bypass -File Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile threemini -Domain auto -TaskSummary "graphics startup context"`
   - Result: exit 0; `resolved_domains=[common, graphics]`; `matched_domains=[graphics]`; `match_evidence=[{domain: graphics, keyword: graphics}]`; `read_required` contains exactly one path: `Developer/agent_room/mandatory_precommand/threemini_mandatory_context/START_HERE.md`; domain is `profile:threemini:centralized`.

3. Central content integrity script:
   - Result: 14 records; missing `[]`; mismatches `[]`; `START_HERE.md` exists; `SOURCE_MANIFEST.json` exists; copied content total bytes `136887`; current copied `Bang_Rules.md` entry has 352 lines.

4. SOUL and mirror inspection:
   - `SOUL.md` is 7 lines and contains only the central repository path, START_HERE read imperative, and stop condition.
   - `.claude/agents/threemini.md` retains YAML frontmatter and uses the same minimal body.

5. Existing checker Vitest:
   - Command: `npm exec -- vitest run --root .. agent_room/mandatory_precommand/check-required-documents.test.js` from `Developer/r3f_prototype`.
   - Result: 1 test file passed, 1 test passed.

## Boundaries

- No commit or push was performed.
- Existing unrelated dirty source/gameplay/UI/asset changes were not modified intentionally.
