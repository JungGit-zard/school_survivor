# Escape! zombie school 서브에이전트 시스템 연결 정본

생성: 2026-07-03 10:13 KST  
소유: Terry / Hana Agent Room operations  
프로젝트: `D:/JungSil/2.Minigame_project/school_survivor-integration`  
Durable board: `escape-zombie-school`

## 1. 결론

이 프로젝트의 서브에이전트는 단순 문서 목록이 아니라 아래 3층으로 연결된다.

1. **프로젝트 내부 연결 장소**
   - `AGENTS.md`
   - `project_develop_policy.md`
   - `Developer/agent_room/game_development_kanban_process.md`
   - `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
   - `Developer/agent_room/antigravity_ide_subagent_handoff.md`
   - 이 문서: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
   - Claude Code 자동발현 레이어: `.claude/agents/` (2026-07-04 추가 — §10 참조)
2. **Hermes 전역 Agent Room 정본**
   - Registry: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`
   - Agent TOMLs: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/`
   - Workspaces: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/`
3. **실행 가능한 Hermes/Kanban 런타임**
   - Board: `escape-zombie-school`
   - Real spawnable profiles: `threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`

따라서 IDE/Codex/Antigravity/Hermes가 이 프로젝트 루트에서 작업할 때는 프로젝트 내부 문서를 통해 Agent Room을 발견하고, 실제 자동 투입은 Hermes Kanban 보드와 spawnable profile을 통해 수행한다.

## 2. 자동 개입 트리거

다음 요청은 직접 혼자 처리하지 말고 `escape-zombie-school` Kanban 라우팅을 먼저 확인한다.

### 명시 트리거

- `서브에이전트`, `미니에이전트`, `agent room`, `subagent`
- `자동호출`, `자동투입`, `자동배치`, `auto dispatch`, `auto deploy`
- `칸반`, `보드`, `Hermes`, `Kanban`
- `검수`, `QA`, `리뷰`, `validation wave`
- `릴리즈 준비`, `Google Play`, `내부 테스트`, `AAB`
- `마일스톤`, `통합 작업`, `/goal`, `Ralph mode`

### 역할 기반 암시 트리거

- 그래픽 + 개발 + QA가 함께 필요한 작업
- UI/HUD/메뉴/모바일 터치/반응형 레이아웃 작업
- 난이도/밸런스/스테이지/무기/카드 풀 조정
- Firebase/Auth/백엔드/개인정보/계정삭제
- 출시/스토어/정책/내부테스트
- BM/수익화/광고/IAP/제품 범위
- 영문 카피/현지화
- 장시간 정리, 다중 파일 리팩터, 독립 검증이 필요한 작업

작은 오타 수정, 한 파일 읽기, 좁은 단일 변경은 직접 처리 가능하다. 단, Terry가 명시적으로 서브에이전트 투입을 말하면 작은 작업도 라우팅한다.

## 3. 역할 → 실제 실행 프로필 매핑

- 그래픽/R3F/Three.js/toon rendering/VFX → `threemini`
- UI/HUD/UX/모바일 최적화/터치 타깃/반응형/접근성 → `uimini`
- 게임 루프/스테이지/레벨링/난이도/무기·카드 풀 → `levelmini`
- QA/리스크/밸런스 검증/모바일 브라우저 검수/최종 acceptance → `balanceqa`
- 비즈니스 모델/수익화/제품 범위 → `bizmini`
- Google Play/내부테스트/AAB/정책/출시 readiness → `launchmini`
- Firebase/Auth/DB/API/개인정보/계정삭제/anti-cheat boundary → `backendmini`
- 영문 카피/스토어 문구/현지화 → `englishgradmini`
- 운영 장부/agent-room hygiene/스모크 테스트/환경 정리 → `madangsue`
- 리마인더/예약/알림 위생 → `jabdareminder`

금지: `planner`, `reviewer`, `game-developer`, `graphic_designer`, `balance_qa`, `qa-reviewer`, `product-manager` 같은 placeholder를 Kanban assignee로 그대로 쓰지 않는다.

## 4. 실행 명령 정본

프로젝트 루트에서 사용한다.

```bash
hermes kanban --board escape-zombie-school stats
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school list
```

카드 생성/실행:

```bash
hermes kanban --board escape-zombie-school create "<title>" --assignee <real_profile> --body "<body>"
hermes kanban --board escape-zombie-school dispatch
hermes kanban --board escape-zombie-school show <task_id>
hermes kanban --board escape-zombie-school runs <task_id>
```

완료 선언 기준:

```text
todo=0
ready=0
running=0
blocked=0
```

## 5. 필수 시작 문서

Kanban worker와 IDE-side resident agent는 역할에 따라 아래를 읽는다.

공통:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `Developer/agent_room/game_development_kanban_process.md`
- `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`

Antigravity:

- `Developer/agent_room/antigravity_ide_subagent_handoff.md`

모바일/UI:

- `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`

R3F/Rapier 안정성:

- `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`

## 6. 현재 구성 확인 결과

2026-07-03 10:13 KST 기준 확인:

- Hermes profiles 존재:
  - `threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`
- 각 profile `SOUL.md` 존재 확인.
- Board `escape-zombie-school` 존재 확인.
- Board 현재 상태:
  - `todo=0`
  - `ready=0`
  - `running=0`
  - `blocked=0`
  - `done=21`
- Project policy already mandates Kanban for multi-role/milestone/release/QA work.
- `AGENTS.md` already points subagent usage to the project-local Agent Room/Kanban docs.
- Antigravity smoke task previously verified: `t_9629b409` done by `madangsue`.

## 7. 보완 사항

이번 보완으로 다음 정본 연결을 추가한다.

1. 프로젝트 내부의 단일 연결 정본으로 이 문서를 추가한다.
2. `AGENTS.md`에서 이 문서를 Agent Room routing source로 참조하게 한다.
3. `game_development_kanban_process.md`의 시작 문서 목록에 이 문서를 추가한다.
4. `uimini`는 UI/HUD뿐 아니라 Mobile Optimization Resident로 명시 유지한다.

## 8. 한계와 정확한 의미

- `project_subagents/`에 있는 TOML들은 일부 IDE-local 역할 설명일 수 있다. 이것만으로 자동 실행된다고 말하지 않는다.
- 실제 자동 투입은 Hermes Kanban board가 real profile assignee를 spawn할 때 발생한다.
- IDE가 이 프로젝트 문서를 읽는 환경에서는 트리거 규칙에 따라 자동 라우팅해야 한다.
- Hermes/Kanban 외부의 특정 IDE vendor 내부 subagent API는 별도 검증 대상이다.

## 9. 운영 원칙

- 새 역할이 필요하면 먼저 Hermes 전역 `sub-agent-room/registry.toml`과 프로젝트 `Developer/agent_room/`을 확인해 중복 생성을 피한다.
- 기존 역할을 교육할 때는 새 프로필을 만들지 말고 해당 TOML, workspace, profile `SOUL.md`, 프로젝트 Agent Room 문서를 갱신한다.
- worker가 만든 코드 변경은 독립 검증 전 완료로 취급하지 않는다.
- commit/push/Google Play 제출은 Terry가 명시적으로 요청할 때만 한다.

## 10. Claude Code 자동발현 레이어 (2026-07-04 추가)

Claude Code(이 프로젝트 루트에서 실행되는 세션)는 `.claude/agents/*.md`를 읽어
관련 입력이 오면 해당 서브에이전트를 **자동 위임(auto-delegation)** 한다.
개발수행 핵심 5종을 Hermes 프로필의 **미러**로 배치했다 (새 역할 창조 아님):

| Claude Code 에이전트 | 미러 원본 (Hermes) | 자동발현 트리거 |
| --- | --- | --- |
| `threemini` | Three_Mini | Three.js/R3F, 툰 셰이딩, 좀비/보스 비주얼, VFX |
| `uimini` | UI_Mini | UI/HUD, 터치 타깃, 반응형, 모바일 최적화 |
| `levelmini` | Level_Mini | 웨이브/스폰/난이도/무기 풀/XP 페이싱 |
| `balanceqa` | Balance_QA_Mini | QA/검수/회귀/acceptance |
| `backendmini` | Backend_Mini | Firebase/Auth/클라우드 저장/보안 규칙 |

규칙:

- 페르소나 내용 수정은 Hermes 정본(TOML/SOUL.md)에서 먼저 하고 미러에 반영한다.
- Kanban 자동 투입(Hermes spawn)과 별개 레이어다 — Claude Code 세션 내부 위임용.
- `bizmini`/`launchmini`/`englishgradmini`/`madangsue`/`jabdareminder`는 개발수행
  범위 밖이라 미러하지 않았다. 필요 시 같은 패턴으로 추가한다.
