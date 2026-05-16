# BangBang Survivor Codex Instructions

## Communication

- Always respond in Korean unless the user explicitly asks for another language.
- Explain concepts for a beginner. When using technical terms, briefly define them in plain language.
- If the user asks for an explanation, prefer examples from this project over abstract theory.
- Keep progress updates short and clear while working.

## Project Context

- This project is a game project named BangBang Survivor.
- Treat `project_develop_policy.md` as the highest-priority project policy document. Any non-empty rule written there is mandatory.
- Before making planning, implementation, asset, QA, or Git workflow decisions, check whether `project_develop_policy.md` contains relevant rules.
- If `project_develop_policy.md` conflicts with other project notes, follow `project_develop_policy.md` and mention the conflict to the user.
- If `project_develop_policy.md` is empty or missing relevant rules, use `AGENTS.md`, planning documents, and the user's latest request as guidance.
- Treat `main` as the stable branch.
- Use feature branches for new work, such as `feature/player-movement` or `feature/combat-system`.
- Use fix branches for bug fixes, such as `fix/collision-bug`.
- Check the planning documents in `Planner/` before making gameplay or content decisions.
- Use `project_develop_policy.md` for project-wide development policy. Do not weaken, bypass, or reinterpret it through another project note.

## Working Rules

- Before editing code or documents, inspect the existing files and structure.
- Before changing project direction, folder structure, branch strategy, or workflow rules, read `project_develop_policy.md`.
- Session memory / startup reading / 3-hour summary rules: follow `SESSION_CONTINUITY.md` (single source of truth). Do not duplicate those rules here.
- Do not overwrite or delete user changes unless the user explicitly asks for it.
- Keep changes scoped to the current request.
- Prefer small, understandable steps over large hidden changes.
- After meaningful changes, check `git status` and summarize what changed.
- When possible, verify work with a syntax check, build, test, or direct file inspection.

## Game Development Rules

- Prioritize playable behavior over decorative structure.
- Keep gameplay systems understandable for a solo beginner project.
- Role-based work must be performed and recorded in the matching workspace folder.
- Planning work must be performed and documented in `Planner/`.
- Development work must be performed and documented in `Developer/`.
- Graphic and visual design work must be performed and documented in `Graphic_designer/`.
- Quality assurance, test planning, review logs, and validation work must be performed and documented in `Quaility_Assurance/`.
- CEO, product direction, technical strategy, business judgment, and high-level decision work must be performed and documented in `CEO/`.
- Do not place role-specific planning, development, graphics, QA, or CEO records outside their assigned workspace folder unless the user explicitly asks for a different location.
- If a task spans multiple roles, create or update a record in each relevant workspace folder.
- For UI work, consider layout, readability, keyboard/mouse interaction, and mobile or desktop fit.
- For gameplay work, consider player controls, feedback, state changes, difficulty, and failure cases.

## Subagent Usage

- Use subagents only when the user explicitly asks for subagents or names a specific subagent.
- Codex subagents are not silently spawned by default. When the user explicitly asks to use subagents and the task includes graphics, visual QA, game art direction, asset implementation, readability, HUD visuals, Phaser/Three.js visual integration, or image/asset pipeline work, route that graphics portion to `graphic_designer`.
- The `graphic_designer` custom agent is defined in `.codex/agents/graphic-designer.toml`. Its working output and role records belong in `Graphic_designer/`; the agent configuration itself must stay in `.codex/agents/`.
- Useful project subagents include:
  - `graphic_designer` for game art direction, graphics implementation guidance, asset review, visual QA, readability, and Phaser/Three.js visual integration.
  - `game-developer` for gameplay systems and game-specific debugging.
  - `ui-designer` for HUD, layout, interaction, and visual direction.
  - `frontend-developer` for user-facing implementation.
  - `reviewer` for code review, bug risk, and missing tests.
  - `code-mapper` for understanding existing code structure before changes.
  - `security-auditor` for cheat prevention, score validation, and security review.
  - `websocket-engineer` for real-time or multiplayer features.

## Git Workflow

- Use `git status --short --branch` before and after meaningful work.
- Do not commit unless the user asks for a commit.
- Use clear commit messages, for example:
  - `Add project instructions`
  - `Add player movement`
  - `Fix enemy collision`
  - `Update main content plan`
- Never use destructive Git commands such as `git reset --hard` or forced checkout unless the user clearly requests them.
