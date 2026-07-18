본 프로젝트 전체의 그 어떤 자리,어떤코드,그 어떤 문서의 그 어떤 부분에도 B02 라는 글자를 쓸 수없고 발견되면 치명적인 에러로 즉시 판단, 해당문서,파일,요소를 파괴,삭제 한다.

﻿# Escape! zombie school Codex Instructions

모델링 요구가 있으면 모델링과 동시에 그래픽스타지오에 적용한다.

적용하기전
/D:/JungSil/2.Minigame_project/school_survivor-integration/ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md
의 문서를 무조건 숙지한다.

문서에 작성된 방법이외의 그 어떤 스타지오상 파라미터 변형방법은 그 어떤 경우도 무조건 금지하며 치명적인 버그로 즉시 분류하고 무조건 즉시 삭제한다.

그 어떤 수십개의 다른 브렌치, 경로 이외 외부에서 유입된 파일도 3d모델링이 신규 감지되면 즉시 확인하고 위와 다를경우 전량폐기 할것.

애초에 손댈것도 없었던 너무나 당연한 방법 이외엔 모조리 버그다.

## Communication

- Always respond in Korean unless the user explicitly asks for another language.
- Explain concepts for a beginner. When using technical terms, briefly define them in plain language.
- If the user asks for an explanation, prefer examples from this project over abstract theory.
- Keep progress updates short and clear while working.

## Project Context

- This project is a game project named Escape! zombie school.
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

## 모델 역할 분담: Advisor / Worker

- 이 역할 분담은 매 세션 시작(`startup`, `resume`, `compact`)부터 무조건 적용한다.
- Sol(메인 세션)은 Advisor다. 요구사항 분석, 작업 분해, 설계 결정, Worker 작업 브리프 작성, diff 직접 확인, 테스트 직접 실행, 최종 커밋 승인과 사용자 보고를 담당한다.
- Terra는 Worker다. 코드 작성과 수정, 테스트 작성 등 구현 작업 전부를 담당한다. Agent 도구로 위임할 때는 `model=terra`를 지정하고, 서로 독립적인 작업은 병렬로 위임한다.
- Advisor가 작성하는 브리프에는 이미 파악한 컨텍스트, 파일 경로, 프로젝트 컨벤션, 알려진 함정, 완료 기준과 통과해야 할 테스트를 포함한다.
- Advisor는 Worker의 완료 보고만 믿지 않고 diff와 테스트를 직접 검증한다. 검증 실패는 수정 브리프로 Worker에게 재위임하며, 한두 줄의 사소한 마무리처럼 위임 오버헤드가 더 큰 경우에만 직접 수정할 수 있다.

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
- `docs/solutions/` — documented solutions to past problems (bugs, best practices, architecture/design patterns, conventions), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.
- `CONCEPTS.md` — shared project vocabulary for canonical visual state, release gates, and other project-specific terms.
- For Google login failures in Android AAB / Play internal testing, check `docs/solutions/integration-issues/capacitor-android-firebase-google-login-aab.md` first.
- For Graphics Studio Apply-state loss, old title models, missing title outlines, or AAB visual parity, check `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md` before changing defaults or packaging a release.
- For any Stage 2 boss/B02 model, part, scale, placement, Studio-state, or persistence change, check `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md` first. Stop immediately if the task would recover, reference, or transform an obsolete implementation.
- For UI work, consider layout, readability, keyboard/mouse interaction, and mobile or desktop fit.
- For gameplay work, consider player controls, feedback, state changes, difficulty, and failure cases.
- For R3F/Rapier vampire-survivor-like stability work, performance regression, monster disappearance, or physics anomalies, treat `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md` as the mandatory Agent-Ready checklist and run its §6 diagnostic protocol before proposing fixes.

## Subagent Usage

- Use subagents when the user explicitly asks for subagents, names a specific subagent, asks for autonomous agent deployment, or requests milestone-level multi-role game development work.
- For Escape! zombie school milestone work, use `Developer/agent_room/game_development_kanban_process.md` and the `escape-zombie-school` Kanban board as the default durable development process.
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md` is the project-local canonical wiring document that connects this repository, the global Hermes sub-agent room, and the runnable Kanban profiles.
- IDE-side resident agents must read `Developer/agent_room/ide_agent_subagent_autocall_handoff.md` when deciding whether Terry's IDE command should auto-call the registered Hermes/Kanban subagents.
- IDE-side resident agents must also read `Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md`; it is the latest handoff for deciding whether any Escape! zombie school request should auto-involve all relevant registered subagents instead of being handled by one agent alone.
- Antigravity IDE resident agents must also read `Developer/agent_room/antigravity_ide_subagent_handoff.md`; it contains the Antigravity-specific trigger rules, real spawnable profile names, Kanban CLI examples, smoke-test evidence, and the pasteable persistent-instruction block.
- When the user asks to use two or more agents for discussion, review, planning, implementation, comparison, or game development execution, run an Agent Room/Kanban routing check before selecting agents.
- The durable Agent Room/Kanban routing check is defined in `Developer/agent_room/`. Local Codex agent config files may exist in some checkouts, but Hermes/Kanban profiles are the canonical spawnable route for this project.
- Subagents do not replace methodology. If Superpowers, Compound Engineering, g-stack, Kanban, or `project_develop_policy.md` applies to the request, the selected agents must work inside that methodology instead of bypassing it.
- If a new case-specific agent or temporary agent team is created, record its persona, role, main viewpoint, authority, methodology gates, and output folder in `Developer/agent_room/` using a `.toh` record.
- Do not assign durable Kanban cards to non-spawnable placeholder assignees. Use the registered Hermes profiles: `threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`.
- Codex subagents are not silently spawned for tiny one-step edits. For multi-role game development waves, Kanban dispatch is allowed because the user has requested this process for the project.
- Sound/audio work is a hard exception to the tiny-edit shortcut: any Escape! zombie school SFX, BGM, voice, chiptune, WebAudio/ZzFX/jsfxr, Howler `SOUND_MAP`, `public/sfx`, audio parameter, cooldown/polyphony, or audio licensing change must involve `soundmini` / Sound_Mini before the change is finalized. Leave a `soundmini` Kanban card, `soundmini` artifact, or Claude `.claude/agents/soundmini.md` review trail.
- When the task includes UI, HUD, menus, responsive layout, touch targets, interaction states, readability, or accessibility, route that UI portion to `uimini`; when it includes graphics, visual QA, game art direction, asset implementation, Phaser/Three.js visual integration, or image/asset pipeline work, route that graphics portion to `threemini` or a local `graphic_designer` agent if one is available.
- Graphic working output and role records belong in `Graphic_designer/`, regardless of whether the work is routed to Hermes `threemini` or a local IDE/Codex graphics agent.
- Useful project subagents/profiles include:
  - `agent-room-executor` or the Hermes/Kanban routing docs for choosing between saved agents, newly created case agents, Superpowers, Compound Engineering, g-stack, and project-native policy.
  - `threemini` / `graphic_designer` for game art direction, graphics implementation guidance, asset review, visual QA, readability, and Phaser/Three.js visual integration.
  - `uimini` for minigame UI/HUD/UX implementation guidance, responsive layout, mobile touch targets, interaction states, accessibility, menus, overlays, and small safe UI fixes.
  - `levelmini` for gameplay loop, leveling, difficulty, stage structure, and weapon/card pool planning.
  - `balanceqa` / `reviewer` for QA gates, code review, bug risk, missing tests, integration synthesis, and validation.
  - `backendmini` for backend boundaries, Firebase, privacy, account deletion, and future architecture.
  - `launchmini` for Google Play, internal testing, release readiness, policy, and AAB gates.
  - `bizmini` for product scope, business model, monetization, and strategic tradeoffs.
  - `englishgradmini` for English copy and localization readiness.
  - `madangsue` and `jabdareminder` for operations, ledgers, scheduling, reminders, and agent-room hygiene.
  - `soundmini` / `Sound_Mini` for free/low-size game SFX, BGM loops, 8-bit/chiptune direction, WebAudio/ZzFX/jsfxr pipelines, pseudo-voice/voice-bark design, and audio licensing checks.
  - `game-developer` for gameplay systems and game-specific debugging when using Codex-local agents rather than Hermes Kanban.
  - `ui-designer` for HUD, layout, interaction, and visual direction.
  - `frontend-developer` for user-facing implementation.
  - `code-mapper` for understanding existing code structure before changes.
  - `security-auditor` for cheat prevention, score validation, and security review.
  - `websocket-engineer` for real-time or multiplayer features.

## Git Workflow

- Use `git status --short --branch` before and after meaningful work.
- Do not commit unless the user asks for a commit.
- If the user says `뻐꾸기`, interpret it as the combined workflow: pull, commit, and push, in that order when safe.
- Use clear commit messages, for example:
  - `Add project instructions`
  - `Add player movement`
  - `Fix enemy collision`
  - `Update main content plan`
- Never use destructive Git commands such as `git reset --hard` or forced checkout unless the user clearly requests them.
