# Stage 1 weapon roster / card-pool drift resolution — 2026-06-24

프로젝트: Escape! zombie school
역할: Level_Mini / Planner
Kanban task: t_227da1d0
범위: Stage 1 안정화용 무기 로스터·카드 풀 정본 판단, QA 측정 기준, Go/No-Go 영향 정리
결론: Stage 1 stabilization gate는 **No-Go 유지**. 코드 수정 없이 QA 측정용 임시 정본은 “현행 런타임 코드 기준”으로 잠그되, 1차 서비스/런칭 정본은 “9종 유지”로 보존하고 15종 런타임 노출은 제품 드리프트로 별도 수정/승인 전까지 Go 조건에 포함하지 않는다.

## 1. 읽은 파일

필수 시작/정책:
- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` 최신 구간
- `Planner/current_game_rules.md`

이번 판단 근거:
- `Planner/auto_deploy_stage1_loop_leveling_plan_2026-06-24.md`
- `Quaility_Assurance/auto_deploy_integration_gate_2026-06-24.md`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- 보조 확인: `Developer/r3f_prototype/src/components/HUD.jsx`, `Developer/r3f_prototype/src/store/useGameStore.js`

## 2. 상위 정책과 이번 산출물의 한계

- `project_develop_policy.md`는 게임 기획/콘텐츠 구조/규칙/난이도/진행 방식은 반드시 `Planner/`에 기록하라고 한다.
- `Bang_Rules.md`는 거리·크기·범위 수치를 기획서/코드에 적을 때 units와 블록을 병기하라고 한다. 기준은 1블록 = 4 units다.
- Stage 1 현재 우선순위는 신규 콘텐츠 확장이 아니라 모바일/playable 1판 루프 안정화다.
- 이번 작업은 Planner 판단 산출물만 만든다. 코드 변경, 커밋, 푸시는 하지 않는다.

## 3. 드리프트 요약

### D1. 1차 서비스 로스터 문서 vs 현재 코드 로스터

문서 정본:
- `Planner/current_game_rules.md` §6 lines 57-60: 1차 서비스 무기 카탈로그는 총 9종. 7종은 레벨 카드 게이트로 즉시 접근 가능, 2종은 계정 누적 조건 충족 시 카드 풀 진입.
- `Bang_Rules.md` lines 221: 1차 서비스 무기 총수는 9종 유지. 기본 카드 풀 7종 + 계정 해금 2종(`guidedMissile`, `starlink`).

현재 코드:
- `Developer/r3f_prototype/src/lib/weaponCatalog.js` lines 1-4 주석은 “14종”이라고 쓰지만 실제 `WEAPON_CATALOG` 엔트리는 15종이다.
- starter 즉시 해금 9종:
  - `pencilThrow`, `schoolBag`, `boxCutter`, `tumbler`, `scienceFlask`, `bell`, `stunGun`, `onigiri`, `chibiko`
- 누적/조건 해금 6종:
  - `guidedMissile`, `sharkMissile`, `starlink`, `compassBlade`, `umbrellaGuard`, `eraserBomb`

판단:
- 문서의 9종 정본과 현재 코드의 15종 카탈로그가 충돌한다.
- “14종”이라는 코드 주석 자체도 현재 실제 엔트리 수와 다르다.
- Stage 1 안정화 전에는 15종 확장을 제품 정본으로 승격하지 않는다.

### D2. 즉시 접근 카드 풀 7종 vs 현재 starter 9종

문서 정본:
- `Planner/current_game_rules.md` §6 lines 59-73: 즉시 접근 7종은 `pencilThrow`, `schoolBag`, `tumbler`, `scienceFlask`, `bell`, `stunGun`, `onigiri`다.

현재 코드:
- `weaponCatalog.js` lines 10-78: `boxCutter`, `chibiko`도 `unlockConditions: STARTER`다.
- `useGameStore.js` lines 40-55: 모든 `WEAPON_CATALOG` 엔트리에서 `startsActive`가 있는 무기만 시작 활성화하고, 나머지는 acquire 카드가 fire될 때 활성화한다. 즉 starter는 “시작 장착”이 아니라 “계정 해금 없이 카드 후보 가능” 의미다.

판단:
- 깨끗한 신규 계정 QA에서도 현재 코드는 `boxCutter`, `chibiko`가 카드 풀에 들어갈 수 있다.
- 따라서 QA가 실제 런타임을 측정할 때는 “문서상 7종”이 아니라 “현재 코드상 starter 9종”을 별도 컬럼으로 기록해야 한다.

### D3. 4-slot vs 8-slot

문서/코드:
- `Planner/current_game_rules.md` line 7: 한 판 보유 무기 슬롯 상한 8개.
- 같은 문서 line 87: 해금 무기는 4-보유 상한과 Lv.5 상한을 따른다고 되어 있어 문서 내부 충돌이 남아 있다.
- `Developer/r3f_prototype/src/lib/upgrades.js` lines 54-55: `MAX_OWNED_WEAPONS = 8`.
- `upgrades.js` lines 78-83: acquire 카드는 현재 active 무기 수가 8 미만일 때만 가능하다.

판단:
- QA 측정용 현재 런타임 정본은 8-slot이다.
- Planner 문서의 line 87 “4-보유 상한”은 폐기/수정 대상이다.
- Stage 1 안정화 전 신규 기능을 늘리지 않는다는 원칙과 별개로, 현재 코드가 이미 8-slot이므로 QA는 8-slot 기준으로 카드 분포를 기록한다.

### D4. onigiri Lv.6 vs Lv.8

문서 정본:
- `Planner/current_game_rules.md` lines 71: `onigiri`는 Lv.8 이상. 2026-05-17 정정으로 Bang_Rules 임시 Lv.6 표기 폐기.

현재 코드:
- `weaponCatalog.js` lines 65-70: `onigiri.minLevelToAppear = 8`.
- `Developer/r3f_prototype/src/lib/upgrades.js` line 28: `acquireOnigiri`의 `minLevel`은 6.
- `HUD.jsx` lines 172-176는 카드 후보를 `UPGRADES.filter((u) => isUpgradeAvailable(UPGRADE_EFFECTS[u.key], level, weapons, player))`로 고른다.
- `upgrades.js` lines 67-75는 `effect.minLevel`을 실제 등장 조건으로 사용한다.

판단:
- 현재 런타임에서 `onigiri` acquire 카드의 실제 등장 게이트는 Lv.6으로 봐야 한다.
- `weaponCatalog.js`의 `minLevelToAppear = 8`은 현재 HUD 카드 후보 로직에서 직접 쓰이지 않으므로 QA 측정 기준으로 쓰면 안 된다.
- 런칭 정본은 여전히 Lv.8이다. 코드가 정본과 충돌하므로 Stage 1 stabilization Go 이전에 수정 또는 Terry 승인 필요.

### D5. guidedMissile / starlink 게이트

문서 정본:
- `Planner/current_game_rules.md` lines 72-73: `guidedMissile`는 계정 누적 해금 후 Lv.6 이상(1차안), `starlink`는 계정 누적 해금 후 Lv.8 이상(1차안).
- `Planner/current_game_rules.md` lines 75-83: 두 무기는 일시 코드 제거 상태라고 되어 있으나 현재 코드는 복원되어 있어 문서가 오래됐다.

현재 코드:
- `weaponCatalog.js` lines 80-88: `guidedMissile` 조건은 `{ totalRuns: 5 }`, `minLevelToAppear: 4`.
- `upgrades.js` line 31: `acquireMissile.minLevel = 4`.
- `weaponCatalog.js` lines 107-117: `starlink` 조건은 `{ totalRuns: 10 }` 또는 `{ totalKills: 5000 }`, `minLevelToAppear: 8`.
- `upgrades.js` line 34: `acquireStarlink.minLevel = 8`.

판단:
- QA 측정용 현재 런타임 정본은 `guidedMissile` Lv.4, `starlink` Lv.8이다.
- 제품/런칭 정본은 1차 서비스 9종 유지라는 큰 틀만 유지하고, guidedMissile Lv.4 vs Lv.6은 드리프트로 기록한다.

## 4. 이번 카드의 정본 결정

### 4-1. Stage 1 stabilization QA measurement canonical rule

QA가 오늘부터 같은 기준으로 측정해야 할 룰은 다음과 같다.

1. 테스트 기준은 “현행 런타임 코드”다.
2. 한 판 시작 활성 무기는 `pencilThrow` 1개다.
3. 한 판 보유 무기 상한은 8개다.
4. 신규/무기해금 localStorage를 초기화한 clean account에서는 starter 9종이 카드 풀 후보가 된다.
5. non-starter 6종은 weapon unlock 상태 또는 기록 조건에 따라 카드 풀에 들어올 수 있으므로, QA는 clean account / unlock-all / 실제 누적 계정 조건을 분리 기록한다.
6. `onigiri`는 현재 런타임 측정에서는 Lv.6 acquire 가능으로 기록한다.
7. `guidedMissile`은 현재 런타임 측정에서는 계정 해금 후 Lv.4 acquire 가능으로 기록한다.
8. `starlink`는 현재 런타임 측정에서는 계정 해금 후 Lv.8 acquire 가능으로 기록한다.

이 룰은 “QA 측정용 임시 정본”이다. 런칭/제품 정본을 15종 확장으로 승인한다는 뜻이 아니다.

### 4-2. Stage 1 launch/product canonical rule

Stage 1 런칭/제품 정본은 다음 상태로 유지한다.

1. 1차 서비스 제품 정본은 9종 유지다.
2. 기본 카드 풀은 7종 + 계정 해금 2종이라는 `Planner/current_game_rules.md` / `Bang_Rules.md` 정책을 유지한다.
3. `boxCutter`, `chibiko`, `sharkMissile`, `compassBlade`, `umbrellaGuard`, `eraserBomb`의 Stage 1 런칭 포함 여부는 아직 승인되지 않은 확장으로 본다.
4. Stage 1 안정화 전에는 위 확장 무기들을 Go 조건이나 마케팅 claim에 포함하지 않는다.

## 5. Go / No-Go 영향

판정: **No-Go 유지**.

No-Go 사유:
- QA 측정 기준은 임시로 정했지만, 런칭 정본 9종과 코드상 15종이 불일치한다.
- clean account에서도 코드상 starter 9종이 될 수 있어 문서상 기본 7종 기준과 카드 분포가 다르다.
- `onigiri` 실제 acquire 게이트가 Lv.6으로 동작할 가능성이 높아 문서상 Lv.8 정본과 다르다.
- `guidedMissile` 실제 acquire 게이트가 Lv.4라 문서의 Lv.6 1차안과 다르다.
- 실제 Android/WebView 240초 1판 루프 검증이 아직 닫히지 않았다.

Go로 바꾸기 위한 최소 조건:
1. Terry/제품이 둘 중 하나를 선택한다.
   - A안: 런칭 정본 9종 유지 → Developer가 코드 카드 풀을 9종/기본 7종+해금 2종에 맞게 잠근다.
   - B안: 현재 코드 15종 확장 승인 → Planner/current_game_rules.md, Bang_Rules.md, QA 기준, 마케팅 claim을 모두 15종 기준으로 개정한다.
2. 위 선택 후 QA가 같은 기준으로 240초 1판 카드 분포 샘플을 재측정한다.
3. 모바일/Android/WebView 1판 루프 검증과 기존 integration gate의 P0 항목이 닫힌다.

Level_Mini 권고:
- Stage 1 안정화 우선순위상 A안을 권장한다.
- 즉, 런칭 정본은 9종 유지, 현재 코드의 15종 카탈로그는 실험/확장 상태로 격리한다.
- 단, 이 카드에서는 코드 수정하지 않는다.

## 6. QA 측정 체크리스트 — Balance_QA_Mini 핸드오프

### 6-1. 테스트 계정 상태를 반드시 분리

각 런 시작 전에 아래 상태를 기록한다.

| 구분 | 기록값 |
|---|---|
| 계정 상태 | clean account / 실제 누적 계정 / unlock-all dev cheat |
| localStorage weapon unlock 상태 | none / 일부 / all |
| player records | totalRuns, totalKills, stage1Clears, runSurvivalSeconds, totalSurvivalSeconds, runGold, totalGold |
| 시작 활성 무기 | 기대값: `pencilThrow` 1개 |
| active weapon cap | 기대값: 8 |
| 카드 후보 기준 | 현행 런타임 코드 기준 |

### 6-2. 카드 후보 로그

최소 10런, 가능하면 30회 level-up choice 로그를 기록한다.

| 항목 | 기록 방식 |
|---|---|
| 런 번호 | 1-10 |
| 시간 | 48s / 144s / 192s / 240s 또는 사망 시점 |
| 레벨 | Lv.n |
| 카드 3장 | key 3개 원문 기록 |
| acquire 카드 수 | 0-3 |
| 강화 카드 수 | 0-3 |
| player/passive 카드 수 | 0-3 |
| 새로 획득한 무기 | key |
| 현재 active 무기 수 | 1-8 |
| Lv.5 도달 무기 | key |
| starter 핵심 7종 중 보유 수 | 0-7 |
| code-starter 9종 중 보유 수 | 0-9 |
| non-starter 6종 노출 여부 | yes/no + key |

### 6-3. 핵심 관찰 포인트

P0/P1 경계:
- 카드 3장이 비어 있거나 3장 미만으로 뜬다.
- 보유 무기 8개 도달 후 acquire 카드가 계속 뜬다.
- active 무기 Lv.5 이후 해당 무기 강화 카드가 계속 뜬다.
- pending level-up 처리 후 다음 카드 선택이 누락된다.

P1 밸런스 이슈:
- clean account 240초 1판에서 starter 핵심 7종 중 주력 1개도 Lv.5에 도달하지 못하는 일이 반복된다.
- `boxCutter`/`chibiko`가 초반 카드 풀을 과도하게 넓혀 `schoolBag`/`tumbler` 방어 선택 체감을 약화한다.
- `onigiri`가 Lv.6에 너무 빨리 열려 Lv.8 정본 의도보다 카드 풀이 빨리 넓어진다.
- non-starter 6종이 unlock-all 상태에서 카드 풀을 너무 넓혀 핵심 무기 성장 분산을 만든다.

### 6-4. 거리/범위 기준 병기

QA가 무기 체감 메모를 남길 때는 아래처럼 units와 블록을 함께 쓴다. 1블록 = 4 units.

| 무기 | 현행 코드 주요 범위 | 블록 환산 |
|---|---:|---:|
| `pencilThrow` | range 22 units | 5.5 블록 |
| `schoolBag` | range 0.633 units, triggerRange 1.0 unit | 0.158 블록, 0.25 블록 |
| `boxCutter` | range 1.4 units, width 0.18 units | 0.35 블록, 0.045 블록 |
| `tumbler` | radius 1.0 unit | 0.25 블록 |
| `scienceFlask` | range 2 units, radius 1.6 units | 0.5 블록, 0.4 블록 |
| `bell` | radius 1.7 units | 0.425 블록 |
| `onigiri` | range 18 units, bounceRange 4.5 units | 4.5 블록, 1.125 블록 |
| `guidedMissile` | range 22 units, radius 1.6 units | 5.5 블록, 0.4 블록 |
| `sharkMissile` | range 28 units, radius 1.8 units | 7.0 블록, 0.45 블록 |
| `starlink` | strikeCenter 5 units, strikeRadius 1.2 units | 1.25 블록, 0.3 블록 |
| `compassBlade` | radius 1.15 units | 0.2875 블록 |
| `umbrellaGuard` | radius 1.25 units | 0.3125 블록 |
| `eraserBomb` | range 12 units, radius 1.35 units | 3.0 블록, 0.3375 블록 |
| `chibiko` | range 22 units, followDistance 0.72 units, sideOffset -0.28 units | 5.5 블록, 0.18 블록, -0.07 블록 |

## 7. 후속 의사결정 요청

Terry/제품 결정 필요:
- Stage 1 런칭 정본을 9종으로 잠글지, 현재 코드 15종 확장을 승인할지 결정 필요.

Level_Mini 권고안:
- A안 채택: 9종 유지.
- 이유: integration gate가 이미 Stage 1 모바일/playable loop No-Go를 냈고, 지금 콘텐츠 확장은 카드 분포와 성장 곡선을 더 불안정하게 만든다.

Developer 후속 범위 후보:
- 코드 수정이 승인되면 `weaponCatalog.js`, `upgrades.js`, `HUD.jsx` 카드 후보, 관련 테스트를 9종/기본 7종+해금 2종 기준으로 정렬한다.
- 특히 `onigiri` Lv.6/Lv.8, `guidedMissile` Lv.4/Lv.6, `boxCutter`/`chibiko` starter 여부를 명시적으로 잠근다.

## 8. 이번 카드에서 변경한 파일

생성:
- `Planner/stage1_weapon_roster_card_pool_drift_resolution_2026-06-24.md`

코드 변경 없음. 테스트 코드 변경 없음. 커밋/푸시 없음.
