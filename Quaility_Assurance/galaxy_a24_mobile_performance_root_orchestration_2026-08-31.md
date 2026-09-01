# Galaxy A24 모바일 성능 회귀 루트 오케스트레이션 기록 — balanceqa

- Kanban root: `t_7c04e091`
- 작성 시각: 2026-08-30 15:43:39 KST
- 작업 성격: Advisor/orchestration only. 런타임/소스/Firebase/인증/타이틀/오디오/그래픽 정본 변경 없음.
- 워크스페이스: `D:/JungSil/2.Minigame_project/school_survivor-integration`

## 1. 필수 게이트

실행 명령:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'mobile-performance-root'
```

결과:

- exit 0
- `resolved_domains`: `common`, `ui`, `qa`
- `matched_domains`: `ui`
- `match_evidence`: `mobile`
- `combined_receipt_sha256`: `8dd53c7df28201c5607136647d51bc0b3078d7fd83bade0453defd99756446c4`

읽은 READ_REQUIRED 문서:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/balanceqa_player_only_pocket_audit_2026-08-30.md`
- `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/mandatory_precommand/README.md`
- `Developer/agent_room/uimini_gameover_final_score_2026-08-24.md`
- `project_develop_policy.md`
- `Quaility_Assurance/weapon_replacement_prompt_hud_review_2026-08-30.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 단일 Entry: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`

추가로 성능/물리 진단 정본인 `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`를 읽고 §6 진단 프로토콜을 루트 카드/후속 synthesis 카드에 반영했다.

## 2. 수행한 보드/상태 확인

실행 명령:

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
git status --short --branch
```

결과 요약:

- `GSTACK_OK`
- 실제 spawn 가능한 프로필 확인: `backendmini`, `balanceqa`, `bizmini`, `corpopsmini`, `default`, `englishgradmini`, `jabdareminder`, `koreanvoicecontext`, `launchmini`, `levelmini`, `madangsue`, `soundmini`, `threemini`, `uimini`
- 보드 상태: `todo=30`, `running=2`, `blocked=133`, `done=429`, `ready=0`
- Git 브랜치: `zombie_only...origin/zombie_only`
- 작업트리는 이미 대량 dirty/untracked/deleted 상태였다. 본 루트 오케스트레이션은 기존 dirty worktree를 보존하고 이 QA 기록 외 런타임 파일을 수정하지 않았다.

## 3. 발견한 오케스트레이션 문제

루트 `t_7c04e091`의 기존 6개 자식이 모두 `parents=[t_7c04e091]`로 생성되어 있었다.

- `t_121d6991` — `threemini`, 렌더링/GPU hotspot 감사, status `todo`
- `t_14de9cb8` — `levelmini`, gameplay/Rapier hotspot 감사, status `todo`
- `t_676b37c0` — `launchmini`, Galaxy A24 Play v50 물리기기 baseline, status `todo`
- `t_8635e105` — `uimini`, React/HUD/mobile UI overhead 감사, status `todo`
- `t_93333ec5` — `backendmini`, Firebase/auth/listener overhead 감사, status `todo`
- `t_b9bcb1c8` — `balanceqa`, regression timeline/gates, status `todo`

이 구조에서는 루트가 running 상태로 남아 있는 동안 실제 감사 카드들이 실행되지 않는다. 따라서 루트가 구현/감사를 직접 수행하지 않고 오케스트레이션을 완료해 6개 감사를 해제하고, 별도 fan-in synthesis 카드를 만들어 모든 감사 완료 뒤 최종 종합을 수행하도록 재배선했다.

## 4. 생성한 fan-in synthesis 카드

생성 카드:

- `t_58cb6c76` — `Synthesize Galaxy A24 mobile performance evidence and rank fixes`
- assignee: `balanceqa`
- parents: `t_121d6991`, `t_14de9cb8`, `t_676b37c0`, `t_8635e105`, `t_93333ec5`, `t_b9bcb1c8`
- 목적: 6개 감사/측정/게이트 산출물을 모두 읽은 뒤 `Quaility_Assurance/galaxy_a24_mobile_performance_synthesis_2026-08-31.md`에 측정 사실과 추론을 분리하고, 결정론 baseline 존재 여부, 랭크된 falsifiable hypotheses, 최소 계측 매트릭스, 정량 pass/fail gate를 종합한다.

## 5. 현재 판정

- 루트 카드는 구현/측정 카드가 아니라 orchestration 카드로 처리한다.
- 현재 시점에는 Galaxy A24 slowdown 원인 또는 해결책을 verified로 판정하지 않는다.
- 실제 원인 후보와 수정 우선순위는 자식 감사/측정 카드가 완료되고 `t_58cb6c76` fan-in synthesis가 실행된 뒤에만 판정할 수 있다.
- `R3F/Rapier stability §6` 기준상 deterministic baseline, 활성 엔티티/풀/Rapier body/렌더 인스턴스/메모리/frame pacing 계측 전에는 fix를 승인하지 않는다.

## 6. 블로커와 관찰

### 블로커

- 없음. 루트 완료 후 6개 감사 카드가 실행 가능해져야 한다.

### 관찰

- 기존 작업트리가 매우 더러운 상태라, 모든 후속 worker는 `git status --short --branch`를 먼저 기록하고 본인 허용 산출물만 쓰며 기존 변경을 보존해야 한다.
- 물리기기 baseline 카드 `t_676b37c0`는 ADB 연결 여부에 따라 measured baseline 대신 정확한 ADB blocker와 준비 명령만 남길 수 있다. 이 경우 최종 synthesis는 baseline 부재를 명시해야 한다.
