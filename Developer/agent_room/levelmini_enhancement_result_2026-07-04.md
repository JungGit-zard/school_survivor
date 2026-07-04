# Level_Mini enhancement result — 2026-07-04

프로젝트: Escape! zombie school
Kanban task: `t_dbaebd56`
역할: Level_Mini / 레벨미니
작업 시각: 2026-07-04 10:34 KST
범위: gameplay loop, stage flow, difficulty curve, weapon/card progression, session pacing
코드 변경: 없음
커밋/푸시: 없음

## 1. 수행 요약

이번 30분 self-upgrade 패스는 Stage 1 모바일/playable loop 안정화 우선순위를 레벨미니 지식으로 재정렬했다. 신규 콘텐츠 확장보다 240초(4분) 1판 루프의 시작, 성장, 보스 조우, 클리어/게임오버, 보상 반영을 Balance_QA_Mini가 측정 가능한 관문으로 쪼개는 데 집중했다.

핵심 결론:

1. Stage 1 안정화 판단은 48초, 144초, 192초, 240초/사망 관문별 실측값으로 한다.
2. 카드 풀/무기 확장은 Go 조건이 아니며, 현행 코드 드리프트는 QA 측정용 임시 정본과 런칭 정본을 분리해야 한다.
3. 거리/범위 수치는 반드시 units와 블록을 병기한다. 기준은 1블록 = 4 units.
4. Balance_QA_Mini 다음 slice는 390x844 또는 실제 Android/WebView 기준 Stage 1 10런 계측이다.

## 2. 읽은 주요 파일

프로젝트 필수/정책:

- `AGENTS.md`
- `project_develop_policy.md`
- `Bang_Rules.md`
- `Planner/current_game_rules.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/game_development_kanban_process.md`

레벨미니 전역 정본:

- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Level_Mini.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/README.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/ledger.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/knowledge_base.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/learning_transfer_manifest.md`

Stage 1 관련 Planner 산출물:

- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`
- `Planner/auto_deploy_stage1_loop_leveling_plan_2026-06-24.md`
- `Planner/stage1_weapon_roster_card_pool_drift_resolution_2026-06-24.md`

## 3. 변경/생성한 파일

전역 레벨미니 workspace:

- 생성: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/iterations/iteration_20260704_103405_KST_Level_Mini_stage1_loop_pacing_self_upgrade.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/ledger.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/source_index.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/knowledge_base.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/web_minigame_leveling_planner/knowledge/learning_transfer_manifest.md`

프로젝트 로컬 산출물:

- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/levelmini_enhancement_result_2026-07-04.md`

게임 코드 변경은 없다.

## 4. Stage 1 관문별 QA 핸드오프

Balance_QA_Mini는 다음 관문을 같은 계정 상태(clean account / 실제 누적 계정 / unlock-all)로 분리해 기록한다.

| 관문 | 시간 | 핵심 검증 |
|---|---:|---|
| 초반 학습 | 0–48초 | 이동, 자동 공격, 첫 교과서 XP, 첫 카드 선택, 30초 내 사망률 |
| 첫 압박 | 48–96초 | E02/E03 도입 후 HP, Lv, 보유 무기 수, 카드 선택 성공 |
| 돌진 전환 | 96–168초 | E05 경고/회피 가능성, 144초 +3골드 1회 지급 |
| 보스 전 압박 | 168–192초 | E06/동시 적 76 구간 판독성, 입력 지연, WebGL context lost |
| 보스/클리어 | 192–240초 | B01 투사체 없음, 240초 생존 클리어, +8골드/누적 골드 반영 |

거리/범위 기준:

- 1블록 = 4 units.
- 일반 적 스폰 링: 8.5–12.5 units = 2.125–3.125 블록.
- 골드 폴백 링: 3.0–6.0 units = 0.75–1.5 블록.
- `pencilThrow` 사거리: 22 units = 5.5 블록.
- `schoolBag` range 0.633 units = 0.15825 블록, triggerRange 1.0 unit = 0.25 블록.
- `scienceFlask` range 2 units = 0.5 블록, splash radius 1.6 units = 0.4 블록.
- `bell` radius 1.7 units = 0.425 블록.
- `onigiri` range 18 units = 4.5 블록, bounceRange 4.5 units = 1.125 블록.

## 5. 남은 블로커 / 다음 slice

블로커:

- 이번 패스는 코드 변경과 실기기 QA를 수행하지 않았다.
- Stage 1 런칭 정본 9종과 현행 코드 확장 카드 풀의 충돌은 아직 제품 결정/개발 수정이 필요하다.
- 작업트리에 기존 미커밋 변경이 있으므로 커밋/배포 판단은 하지 않았다.

다음 slice:

- Balance_QA_Mini: Stage 1 240초 모바일/390x844 또는 실제 Android/WebView 10런 계측.
- Level_Mini 후속: QA 실측을 받아 XP 드랍률, 카드 풀 폭, E05/E06 압박, 마일스톤 보상 중 하나만 조정 후보로 선정.

## 6. 실행 확인

실행한 확인 명령:

```bash
date '+%Y-%m-%d %H:%M:%S %Z' && git status --short --branch
```

초기 결과 요약:

- 현재 브랜치: `feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics`
- 기존 변경 존재: `AGENTS.md`, `Developer/agent_room/game_development_kanban_process.md`, `Developer/agent_room/subagent_system_wiring_2026-07-03.md` 등.
- 본 카드에서는 게임 코드 변경 없음.
