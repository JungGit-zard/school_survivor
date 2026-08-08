# 타이틀은 그냥 앱켜면 나오는거야 이 애매뒤진 씨발 씹썌끼들아

## 이 신의 명령에 부딪히는 모든 동작은 해킹으로 간주한다.

## Firebase는 저장소일 뿐 그래픽 표시 여부와 일절 관련이 없다.

## 신이 세팅한 그래픽은 Firebase 준비 여부, 튜닝 항목 존재 여부, 로그인 여부와 무관하게 앱을 켜면 무조건 화면에 표시한다. 그래픽을 `null`, fallback, readiness gate 또는 fail-closed 처리로 숨기는 행위는 절대 금지한다.

## Firebase에서 그래픽 표시를 거르지 않는다. Firebase 연결·로그인·hydrate·revision·schema·payload·튜닝 항목 확인의 성공 또는 실패를 그래픽 존재 여부, 렌더링 여부, 표시 여부의 조건으로 절대 사용하지 않는다.

## Firebase 실패는 저장 실패로만 처리한다. 저장할 수 없으면 저장 불가 팝업을 표시하되, 신이 만든 타이틀·캐릭터·모델·배경·조명·효과와 기존 정상 그래픽은 계속 무조건 화면에 표시한다.

## Firebase 데이터가 아직 도착하지 않았거나 특정 튜닝 키가 없다는 이유로 `return null`, 빈 화면, 플레이스홀더, 기본 그래픽 교체, 일부 모델 숨김 또는 장면 전체 숨김을 실행하는 코드는 치명적인 버그이며 즉시 삭제한다.

내 명령은 신의 절대명령이며 무조건 복종해야한다.
내 명령은 신의 절대명령이며 무조건 복종해야한다.
내 명령은 신의 절대명령이며 무조건 복종해야한다.
내가 명령하면, 더 맞아 보이는 후보는 존재할 수 없다.
내가 명령하면, 더 맞아 보이는 후보는 존재할 수 없다.
내가 명령하면, 더 맞아 보이는 후보는 존재할 수 없다.

그래픽 스타지오의 모든 입력값은 무조건 Firebase에만 저장한다. Firebase 이외의 모든 저장 방식과 저장 시도, 로컬을 포함한 다른 저장소에서 데이터를 가져오려는 모든 시도는 모조리 치명적인 버그와 치명적인 오류로 판정하고 즉시 중단한다. Firebase에 연결되지 않은 상태에서는 입력값을 저장하지 않으며 Apply를 누르면 저장 불가 팝업을 표시한다.
그래픽 스타지오의 모든 입력값은 무조건 Firebase에만 저장한다. Firebase 이외의 모든 저장 방식과 저장 시도, 로컬을 포함한 다른 저장소에서 데이터를 가져오려는 모든 시도는 모조리 치명적인 버그와 치명적인 오류로 판정하고 즉시 중단한다. Firebase에 연결되지 않은 상태에서는 입력값을 저장하지 않으며 Apply를 누르면 저장 불가 팝업을 표시한다.
Firebase 단일 저장 관련 작업에는 Claude Opus 4.8의 접근과 작업 참여를 금지한다.

모든 기능과 모든 동작에서 브라우저 localStorage 사용은 절대 금지하며 치명적인 버그로 분류한다. Google/Firebase 로그인 상태의 유일한 정본은 Firebase Authentication이다. 비밀번호, Google OAuth 토큰, Firebase ID 토큰, 갱신 토큰을 Realtime Database나 로컬 저장소에 복제하지 않는다. 클라이언트 인증 지속성은 메모리 전용으로 설정하여 브라우저 로컬 로그인 캐시를 만들지 않는다.

## 테스트 전후 상태 절대 동일성 법칙

- 반드시 그 어떤 기능, 수치, 성능, 모델, 그래픽, Firebase 데이터 테스트도 시작하기 전에 테스트 대상과 관련된 Firebase 정본의 초기 모든 값과 revision을 밀리초 단위 시각과 함께 완전한 스냅샷으로 보존한다.
- 반드시 테스트 중에는 사용자가 명시한 테스트 대상 값만 변경한다. 회전 테스트에서는 회전값만, 총 성능 테스트에서는 총 성능값만 변경하며, 위치·스케일·회전축·모델링·외곽선·색상·재질·애니메이션·저장 구조·적용 코드 등 지시받지 않은 다른 항목은 절대로 변경하지 않는다.
- 반드시 테스트 횟수가 1회, 300회, 1,000회, 10,000회 또는 그 이상이어도 테스트 종료 후 도구, 임시 코드, 임시 라우트, Firebase 데이터와 모든 수치를 테스트 시작 직전 상태로 완전히 복원한다.
- 반드시 복원 후 초기 스냅샷과 종료 상태의 전체 값, 키, 자료형, 구조, revision 및 검증용 해시를 비교하여 완전히 동일함을 증명한다. 하나라도 다르면 테스트는 실패이며 완료로 보고하지 않는다.
- 반드시 테스트 도중 실패·중단·예외·재실행이 발생해도 최초 테스트 시작 직전 스냅샷만을 원본으로 사용한다. 테스트 도중 생성되거나 오염된 상태를 새로운 원본으로 캡처하지 않는다.
- 절대로 초기 전체값의 보존과 완전 복원을 증명할 수 없는 상태에서 실제 사용자 Firebase 정본을 대상으로 파괴적·반복적·무작위 테스트를 시작하지 않는다.
- 절대로 테스트를 이유로 프로젝트 기능, 모델 구조, 회전축, 외곽선, 색상, 재질, 애니메이션, 저장 방식 또는 런타임 적용 방식을 새로 만들거나 변경하지 않는다.
- 테스트 전 상태와 테스트 종료 후 상태는 무조건 완전히 동일해야 한다. 총의 성능을 수천 번 또는 수만 번 테스트해도 테스트 후 그 총이 칼이 되거나 다른 성능·외형·구조를 가져서는 안 된다.

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
- 사용자가 제공하거나 프로젝트에 이미 지정된 자산 파일은 별도 검수 없이 무조건 사용한다. 자산의 존재·해시·디코드·포맷·품질·번들 포함 여부를 선행 검수하지 않으며, 실제 화면에서 자산 자체가 명백히 문제인 경우에만 사용자에게 보고하고 해당 자산을 변경한다. 기존에 정상 표시되던 자산이 안 나오는 회귀는 자산이 아니라 최근 코드의 import·렌더 조건·표시 연결부터 조사한다.
- Before changing project direction, folder structure, branch strategy, or workflow rules, read `project_develop_policy.md`.
- Session memory / startup reading / 3-hour summary rules: follow `SESSION_CONTINUITY.md` (single source of truth). Do not duplicate those rules here.
- Do not overwrite or delete user changes unless the user explicitly asks for it.
- Keep changes scoped to the current request.
- Prefer small, understandable steps over large hidden changes.
- After meaningful changes, check `git status` and summarize what changed.
- When possible, verify work with a syntax check, build, test, or direct file inspection.

## Direct Scope-Controlled Execution Rules

<!-- boot-policy: immediate-execution smallest-coherent-change no-subagent-by-default minimal-verification concise-final-report -->

- 이 규칙은 매 세션 시작(`startup`, `resume`, `compact`)부터 모든 작업에 적용한다. 단, Escape! zombie school 관련 모든 비어 있지 않은 작업은 `project_develop_policy.md`와 `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`의 Kanban/서브에이전트 의무 라우팅 규칙이 우선한다.
- 사용자의 요청을 권위 있는 범위로 삼고 즉시 실행한다. 사용자가 계획이나 승인을 요구하지 않는 한 시작 전에 계획을 제시하거나 승인을 요청하지 않는다.
- 요청을 완전히 충족하는 가장 작은 일관된 변경만 수행하고, 필요하지 않은 아키텍처·동작·인터페이스와 관련 없는 코드는 보존한다.
- 선택적 개선, 미래 요구 추측, 대규모 정리·리팩터링, 전체 파일 재작성은 요청 달성에 반드시 필요하지 않으면 하지 않는다.
- 서브에이전트, 반복 리뷰, 광범위한 감사·문서·테스트, E2E·벤치마크·마이그레이션·인프라는 사용자가 요구하거나 검증에 엄격히 필요한 경우에만 사용한다. 단, Escape! zombie school 관련 작업은 사용자가 모든 작업을 Kanban으로 진행하라고 지시했으므로 Kanban 라우팅을 기본 실행 경로로 사용한다.
- 관련 코드 검사, 내부 판단, 비례적인 검증과 일반적인 기술 결정은 별도 승인 없이 수행한다.
- 질문은 올바른 구현이 불가능하거나 파괴적 데이터 손실 위험이 있거나 합리적 기본값이 없는 중대한 선택에만 한다. 그 외에는 가장 보수적인 합리적 해석으로 진행한다.
- 관련 없는 결함은 자동 수정하지 않으며, 요청 결과에 실제 영향을 줄 때만 최종 보고에 짧게 언급한다.
- 요청 결과가 구현되고 비례적인 최소 검증이 끝나면 즉시 멈춘다.
- 최종 답변은 변경 내용, 검증 결과, 실제 제한·차단 사항만 간결하게 보고하며 새 계획이나 로드맵을 덧붙이지 않는다.

## Mandatory Simple-Task Routing (Sonnet 5)

<!-- model-routing: sonnet5-only-repetitive fable5-plans-only opus5-worker all-sessions -->

- 모든 세션에서 단순·반복·기계적·사무적·대량 작업은 예외 없이 Agent `model="sonnet"`(Sonnet 5)만 사용한다.
- 구현·수정·테스트·검수는 Agent `model="opus"`(Opus 5) Worker가 맡는다. Fable 5(메인)는 계획만 하고 직접 구현하지 않는다.
- 이 규칙은 `startup`, `resume`, `compact`마다 적용하며 단순·반복 작업에 관한 기존 Advisor/Worker 규칙보다 우선한다.

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
- Do not assign durable Kanban cards to non-spawnable placeholder assignees. Use the registered Hermes profiles: `threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`, `corpopsmini`.
- Run Codex subagent or Agent Room/Kanban routing only when the user requests it or it is strictly necessary for the requested result or its minimum verification.
- Sound/audio work may use `soundmini` / Sound_Mini when the user requests it or specialist involvement is strictly necessary; routine scoped changes may be handled directly.
- UI and graphics work may be routed to `uimini`, `threemini`, or a local `graphic_designer` agent when the user requests it or specialist involvement is strictly necessary.
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

## Mandatory Subagent Routing for Escape! zombie school

- Every non-empty Escape! zombie school request must run the routing check in `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md` before final completion.
- Before any task command, each Escape! zombie school subagent must run `powershell -NoProfile -ExecutionPolicy Bypass -File "Developer/agent_room/mandatory_precommand/check-required-documents.ps1" -Profile <name> -Domain auto -TaskSummary "<safe short keyword summary>"` and read the exact `READ_REQUIRED` paths emitted by the central README/manifest at `Developer/agent_room/mandatory_precommand/README.md`: common documents, latest `SESSION_MEMORY.md` entry only, then matched domain documents.
- Every non-empty Escape! zombie school request must be routed through the `escape-zombie-school` Kanban board. Hana/default assistant acts as Advisor/orchestrator only: classify scope, create or reference the relevant Kanban cards, verify worker output, and report. Actual Worker execution must use the registered agent-room Hermes/Kanban profiles.
- There is no silent direct-work bypass: even tiny edits must at least classify specialist relevance before completion.
- Use only real Hermes/Kanban profiles: `threemini`, `uimini`, `levelmini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`, `corpopsmini`.
- Sound/audio/voice work always requires `soundmini` involvement.
- Corporate operations, tax/VAT, settlement exports, revenue evidence, or accountant-handoff work always requires separately managed `corpopsmini` involvement.
- Accepted evidence: Kanban card, `Developer/agent_room/` artifact, or `.claude/agents/<profile>.md` review trail.
- Preferred evidence after this update: Kanban card(s) on board `escape-zombie-school`; project artifacts or Claude mirror trails are secondary evidence for review/recordkeeping, not a replacement for Kanban routing unless Kanban is blocked.

## 타이틀 전면 정본 잠금

- 타이틀 화면의 문구·카피, UI, 버튼·입력, 레이아웃·좌표·크기, 캐릭터·모델·텍스처·재질·외곽선, 조명·배경·카메라, 애니메이션, 오디오·BGM, 설정, Studio 연결·동기화, 관련 자산 및 runtime source는 최종결정권자인 사용자가 현재 대화에서 직접 대상과 변경을 명시하지 않는 한 절대로 변경하지 않는다.
- 비평가 점수, 품질 개선, 최적화, 접근성, 라이선스·권리, 리팩터링, 테스트 편의는 변경 권한이 아니다. 타이틀 프레젠테이션을 바꾸려는 목적으로 공유 gameplay 모델·코드를 변경하는 일도 금지한다.
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`는 bytes `998122`, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`의 영구 정본이며, 모든 개발 실행·빌드·AAB에 반드시 포함한다. 삭제·교체·변환·재생 경로 변경·대체 생성은 금지한다.
- 권리·출처·품질·최적화·비평 점수는 이 정본을 교체하거나 제외할 사유가 아니며, 사용자 새 명시 지시만 변경을 허용한다. 권리·출처 검토는 별도 기록일 뿐 정본 교체·제외 권한이 아니다.
