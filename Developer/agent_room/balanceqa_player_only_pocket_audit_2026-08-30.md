# 무적포켓(player-only pocket) 판정 감사 — balanceqa, 2026-08-30

- 대상 트리: `D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype` (브랜치 `claude-dev`, HEAD `5ceb2fa5`)
- 감사 시점 워킹트리: threemini 작업중 diff 3파일 (`stageObjectPlacements.js`, `stageObjectPlacements.test.js`, `stageObjectColliders.test.js`)
- 성격: **읽기 전용 리뷰.** 이 문서 외 어떤 파일도 만들거나 고치지 않았다. 커밋하지 않았다.
- **실플레이 검증은 하지 않았다.** 브라우저/디바이스 실행 없이 소스 독해 + 순수 모듈 헤드리스 시뮬레이션 + vitest만 사용했다. 아래 "실측"은 전부 코드에서 파생된 수치이며 손으로 플레이해 확인한 값이 아니다.

---

## 0. 감사 도중 트리가 움직였다 (먼저 읽을 것)

감사 시작 시점의 스캔 결과는 지시서에 적힌 8건과 달랐다. 이유는 threemini가 감사 중에 계속 커밋 전 수정을 넣고 있었기 때문이다. 지시서의 값 → 현재 값:

| 항목 | 지시서 | 현재 트리 |
|---|---|---|
| stage1 desk-se-01 +Z | 0.391 | 0.914 |
| stage1 chair-west-02 \| desk-mid-03 | 관통 | Z 0.873 |
| stage1 desk-mid-02 \| chair-mid-02 | 0.671 | 0.897 |
| stage3 exit-door-east-wall +X | 0.590 | 0.890 |
| stage4 trayrack-north-east-inner \| shelfcart-east-north | 0.626 | 0.876 |
| stage4 preptable-east-south-counter \| trayrack-south-east | 0.812 | 0.862 |
| stage4 preptable-south-serving-left \| right | 0.633 | 0.853 |
| stage4 preptable-south-serving-left \| crates-south-center-stack | 0.684 | 0.854 |

threemini는 `stageObjectColliders.test.js`의 포켓 검사도 stage4 전용 → stage1~4 전 스테이지로 확대했고, 관통 쌍을 위반으로 승격시켰다. **현재 이 검사는 4스테이지 모두 0건으로 통과한다(20/20 PASS).** 아래 판정은 전부 이 "0건 통과" 상태를 대상으로 한 것이다.

---

## 1. 판정 임계값 `OPEN_GAP_MIN = 0.847`이 충분한가 — **조치필요**

### 코드 근거

- `enemySimulation.js:315-323` `collidesEnemyObstacle`은 장애물 AABB를 `radius`만큼 사방으로 확장한 **축정렬 점 포함 검사**다. 원이 아니라 한 변 `2r`인 정사각형과 동치다. 따라서 폭 `g`인 직선 통로의 좀비 중심 자유 폭은 `g - 2r`.
- E01 반경 0.3733 → 0.847 통로의 자유 폭은 **0.100**. 좀비 중심이 통로 중앙 ±0.050 안에 들어와야 한다.
- 이동은 경로탐색이 아니라 `enemySimulation.js:428-467` `moveEnemyWithObstacleSlideInto`의 4단 폴백(전진 → X만 → Z만 → 접선 ±)뿐이다.
- 분리력: `enemySimulation.js:697-703`. 거리 0.8 미만이면 `(0.8 - d) * 0.85`(최대 0.68 units/s)를 속도에 그대로 더한다. 자유 폭 0.100에서는 두 마리만 겹쳐도 즉시 옆벽으로 밀린다.
- 막히면 `enemySimulation.js:731-742`: 500ms 뒤 detour(속도 90° 회전, 420ms) → 1200ms 뒤 `findNearestFreeEnemyPositionInto(..., startGlobal=true)`로 아레나 전역 33×33 표본 중 첫 빈 칸으로 **텔레포트**. 즉 좁은 통로에 오래 낀 좀비는 통로를 뚫는 게 아니라 멀리 치워진다.

### 실측 (헤드리스 시뮬, 25초, 접근 오프셋 7종)

`EnemySimulationRuntime.step`을 그대로 돌려 통로 반대편(z > 통로 깊이)에 도달한 개체 수를 셌다.

| 틈 | E01 단독 | E01 4마리 동시 | E02 단독 | E06 단독 |
|---:|---:|---:|---:|---:|
| 0.750 | 1/7 | 7/28 | 0/7 | 0/7 |
| **0.847** | **3/7 (43%)** | **10/28 (36%)** | **0/7** | **0/7** |
| 0.900 | 3/7 | 10/28 | 0/7 | 0/7 |
| 1.000 | 4/7 | 10/28 | 0/7 | 0/7 |
| 1.200 | 5/7 | 17/28 | 3/7 | 1/7 |
| 1.400 | 6/7 | 21/28 | 3/7 | 4/7 |
| 1.600 | 7/7 | 25/28 | 5/7 | 5/7 |
| 2.000 | 7/7 | 26/28 | 6/7 | 7/7 |
| 2.500 | 7/7 | 28/28 | 7/7 | 7/7 |

추가로 `sightBlocked[index] = 1`을 강제하면(= stage2 분실물 게시판 뒤 상황, `enemySimulation.js:661-666`이 속도를 순수 측면 스트레이프로 덮어씀) **틈 2.5에서도 통과 0/7**이다. 시야가 끊긴 상태에서는 폭과 무관하게 접근 자체를 안 한다.

### 판정

0.847은 "기하학적으로 E01이 들어갈 수 있다"는 하한일 뿐 **실주행 통과 보장선이 아니다.** 단독 E01조차 접근 각도에 따라 절반 이상 실패하고, E05 이상은 폭 자체가 부족하다.

**권고값**: 스테이지에 실제로 나오는 **최대 근접 좀비 직경 + 0.35**.

| 스테이지 | 최대 근접 좀비 | 직경 | 권고 OPEN_GAP_MIN |
|---|---|---:|---:|
| stage1 | E06 | 1.1947 | 1.55 |
| stage2 | RZT | 1.3141 | 1.66 |
| stage3 | E06 | 1.1947 | 1.55 |
| stage4 | E06 | 1.1947 | 1.55 |

전 스테이지 공통 단일값을 쓰려면 **1.70**을 권고한다(실측 100% 통과선 1.6~2.0의 하단, RZT 1.3141 + 0.386).

단, 1.70으로 올리면 현재 트리 위반이 stage1 6 / stage2 1 / stage3 12 / stage4 17건으로 폭증한다. 그래서 **틈 폭 규칙만으로는 해결이 안 되고 항목 5의 근본 원인부터 고쳐야 한다.**

---

## 2. 최소 좀비 직경 0.747이 정본인가 — **조치필요 (상수 근거 오류)**

`enemySimulation.js:311-313`
```js
export function enemyCollisionRadius(type) {
  return ENEMY_RUNTIME_SCALE[type] ? 0.28 * ENEMY_RUNTIME_SCALE[type] * ENEMY_SIZE_MULTIPLIER : 0
}
```
`ENEMY_RUNTIME_SCALE`(`enemySimulation.js:60`)에서 실제로 계산한 값:

| 타입 | scale | 반경 | 직경 |
|---|---:|---:|---:|
| E03 러너 | 0.75 | 0.2800 | **0.5600** |
| RZC | 0.78 | 0.2912 | 0.5824 |
| E04 원거리 | 0.90 | 0.3360 | 0.6720 |
| RZG | 0.92 | 0.3435 | 0.6869 |
| **E01 / E07** | 1.00 | 0.3733 | **0.7467** |
| RZL | 1.08 | 0.4032 | 0.8064 |
| **E05 차저** | 1.15 | 0.4293 | **0.8587** |
| E02 탱커 | 1.40 | 0.5227 | 1.0453 |
| E06 거대 | 1.60 | 0.5973 | 1.1947 |
| RZT 바바리 | 1.76 | 0.6571 | 1.3141 |
| B01~B04 | (0) | **0** | — |

판정 3건:

1. **`SMALLEST_ZOMBIE_DIAMETER = 0.747`은 최소가 아니다.** 실제 최소는 E03 0.5600이고 E03은 stage1(72s), stage2(24s), stage3(24s), stage4(150s) 전부에 나온다. 과탐지 방향이라 안전하지만 상수명·주석의 사실관계가 틀렸다.
2. **주석의 "B04 반경도 0.747"은 오해를 부른다.** 값 자체는 맞다(scale 2.0). 그러나 `ENEMY_RUNTIME_SCALE[9..12] = 0`이라 `enemyCollisionRadius(B01~B04) = 0`이고, 보스는 애초에 풀 시뮬을 쓰지 않는다. 보스/마틸다는 `Enemy.jsx:1619-1627`의 Rapier `RigidBody`(`lockRotations`) + `CuboidCollider(colArgs)`이고, `Enemy.jsx:117,266-275` 기준 반extent = `BASE_COL[0.14, 0.26, 0.10] × 2.0 × 4/3` = **[0.3733, 0.6933, 0.2667]** → X 전폭 0.747, Z 전폭 0.533. 즉 "B04까지 들어옴"이라는 통과 기준은 사실상 E01과 같은 폭을 요구하는 것이고, 정작 막히는 건 E05·E02·E06·RZT다. (마틸다는 `sensor={isMatilda}`라 프랍을 통과한다.)
3. **지금 남은 틈은 E05를 배제한다.** 현재 트리의 잔여 틈 0.853 / 0.854 (stage4 배식대·크레이트)는 **E05 직경 0.8587보다 좁다.** 0.862 / 0.873 / 0.876 / 0.890 / 0.897 / 0.914도 E05는 자유 폭 0.003~0.055로 사실상 불통이고 E02 이상은 전부 불가다.

### 스테이지별 등장 타입 (BURST 표 + Bang_Rules 300s 혼합 보강 기준)

- stage1: E01 E02 E03 E05 E06 E07 + B01 (`burstEvents.js:100-118`, E04 제외는 Bang_Rules 2026-05-09 조항)
- stage2: E01 E02 E03 E04 E05 E06 E07 RZT RZG + B02 (`burstEvents.js:130-147`, `Enemies.jsx:754`)
- stage3: E01 E02 E03 E04 E05 E06 E07 RZL RZC + B03 (`burstEvents.js:180-194`, `Enemies.jsx:527`)
- stage4: E01 E02 E03 E04 E05 E06 E07 + B04 (`burstEvents.js:227-245`)

---

## 3. stage3 탈출문 특수 케이스 — **PASS (개방이 유일 해, 트리거는 안 깨짐)**

- **탈출 트리거와 무관하다.** 스테이지 탈출은 `Game.jsx:117-119, 222`의 `EscapePortal`(시각 `stageConfig.escapePortalSec = 210`)이 담당한다. `gymExitDoor`는 어떤 클리어/탈출 판정에도 참여하지 않는다.
- **조사 대사 트리거는 프랍 상대 좌표다.** `studentProximity.js:63-92` `getInvestigationTargets`가 `getStageObjectFootprint(item)`으로 판정 박스를 프랍 자신의 `position`/`rotation`/`scale`에서 파생한다. 절대좌표 하드코딩이 없으므로 문을 어디로 옮겨도 `investigation.gymExitDoor` 판정면이 함께 움직인다. 접촉 여유는 `OBJECT_CONTACT_MARGIN = 0.25`.
- **밀폐(벽 밀착)는 불가능하다.** `stageObjectColliders.test.js:181-185`가 stage3 시야 AABB 전부를 벽에서 `wallInset = 0.4` 이상 안쪽으로 강제한다. 0.4는 포켓 구간 `[0.272, 0.847)` 한가운데라, 벽에 붙이는 순간 이 회귀 테스트가 깨지고 동시에 새 포켓이 된다.
- 따라서 **개방만이 해**이며 threemini의 `6.8 → 6.5`(gap 0.590 → 0.890) 방향은 옳다. 다만 0.890은 항목 2에 따라 E05 이상 불통이므로 **1.30 이상**을 권고한다. `wallInset` 상한(maxX ≤ 7.1)과 중앙 코어 회피(|x| − halfX ≥ 3.6)를 함께 만족하는 범위는 문 halfX가 0.11이므로 x ≤ 6.99이고, 1.30 확보에는 x ≤ 6.09가 필요하다 — 여유 있다.

---

## 4. 밀폐(<0.272) 처리의 부작용 — **PASS (현재는 밀폐 처리 0건)** + 관찰 2건

- 현재 threemini diff 7건은 **전부 프랍을 안쪽으로 당기는 개방 처리**다. 밀폐로 간 건은 없다. 따라서 "플레이어가 갇힌다" 부작용은 현 시점에 존재하지 않는다.
- **stage1 중앙 스폰존 규칙** (`stageObjectPlacements.js:5-6`, 검사 `stageObjectPlacements.test.js:58`, `:265`): 이동된 3건 모두 `|x| >= 6`을 유지한다 — desk-se-01 `x=7.043`, chair-west-02 `x=-6.2`, chair-mid-02 `x=7.918`. 규칙 위반 아님.
  - **주의(오귀속 방지):** 그런데 이 테스트는 지금 FAIL이다. 원인은 이번 작업과 무관한 **기존 5건**이다: `stage1-chair-nw-01 [-4.418,0,-11.61]`, `stage1-desk-ne-01 [-3.567,0,8.968]`, `stage1-student-south-01 [-5.796,0,-0.031]`, `stage1-student-nw-01 [-5.715,0,-2.374]`, `user-classPresidentStudent-msl7serx-1 [-4.54,0,-6.587]`. 같은 파일의 다른 5개 실패(31개 프랍 기대 vs 실제 21개 등)도 전부 선행 회귀다. **포켓 수정 탓으로 기록하지 말 것.**
- **stage4 시작점 `[0, 0, 7]`** (`playerStartPosition.js:2`): 최근접 프랍 표면거리 5.480(중앙 가마솥), 다음이 6.044/6.117(남쪽 배식대). 갇힘·끼임 위험 없음.
- 도달성 플러드필에서 플레이어 도달 성분은 스테이지당 1개(21.1만~21.9만 셀)로, 이동으로 새로 고립된 플레이어 구역은 생기지 않았다.

---

## 5. 놓친 무적 유형 — **조치필요 (3종, 5-1이 근본 원인)**

### 5-1. 회전 프랍의 AABB 코너 = 구조적 무적지대 (P0, 가장 큼)

**좀비와 플레이어가 서로 다른 프랍 형상을 본다.**

- 좀비: `stageObjectColliders.js:427-435`의 `getStageObjectSightObstacles`가 각 파트를 **월드 AABB**로 접어버린다(`halfX = |m0|hx + |m4|hy + |m8|hz`, `rotationY: 0`). 이걸 `collidesEnemyObstacle`이 축정렬로 검사한다.
- 플레이어: `StageObjectColliderLayer.jsx:23-28`이 `part.rotation`을 그대로 넘긴 **진짜 회전 OBB**를 Rapier에 등록한다.

→ 회전된 프랍마다 `AABB − OBB` 차이인 네 코너 영역이 **플레이어는 걸어 들어가고 좀비는 원리적으로 절대 못 오는** 지대가 된다. 45° 회전에서 최대가 된다. 이건 좌표를 옮겨서 없앨 수 있는 종류가 아니다.

**실측 — 도달성 플러드필 (격자 0.05, 현재 트리, 3회 재현 동일)**

모델: 플레이어 자유공간 = 회전 OBB를 0.136(`Player.jsx:287` `CuboidCollider args=[0.136,0.32,0.136]`) 팽창한 여집합, 좀비 자유공간 = `collidesEnemyObstacle`과 동일한 AABB 팽창 여집합. 포켓 = 플레이어 시작점에서 도달 가능하면서, 반경 `contactDistance(E01) = 0.28×4/3 = 0.3733`(`enemySimulation.js:100-102`) 안에 좀비 도달 셀이 **하나도 없는** 칸.

| 스테이지 | 현행 AABB 틈 검사 위반 | 실제 E01 접촉 불가 포켓 |
|---|---:|---|
| stage1 | 0건 | 0덩어리 (0.00 u²) |
| stage2 | **0건** | **18덩어리 (2.31 u²)** |
| stage3 | 0건 | **29덩어리 (2.06 u²)** |
| stage4 | 0건 | **33덩어리 (0.70 u²)** |

**stage2는 현행 검사가 0건인데 실제 포켓이 18개다.** 검사기가 구조적으로 못 잡는다는 직접 증거다.

최대 덩어리 위치와 원인 프랍:

| 스테이지 | 포켓 범위 | 면적 | 인접 프랍(yaw) |
|---|---|---:|---|
| stage2 | x[-5.28,-4.47] z[-0.47,0.23] | 0.338 u² | `stage2-lost-found-board-left-south-copy-3` (0.75 ≈ 45°) |
| stage2 | x[-3.72,-3.02] z[-11.72,-11.02] | 0.300 u² | `...copy-2` (0.80) |
| stage2 | x[4.48,5.23] z[5.48,6.13] | 0.300 u² | `...copy-1` (0.73) |
| stage3 | x[4.38,5.48] z[-5.62,-5.17] | 0.300 u² | `stage3-mats-east-stack` (-0.38) |
| stage3 | x[5.33,6.43] z[-4.42,-3.97] | 0.300 u² | 동일 |
| stage4 | x[7.46,7.57] z[10.08,10.83] | 0.068 u² | `stage4-preptable-east-south-counter` (-1.71) |

**적이 클수록 급증**(같은 방법, 반경/접촉거리만 교체):

| 기준 적 | stage1 | stage2 | stage3 | stage4 |
|---|---:|---:|---:|---:|
| E01 (r 0.3733) | 0 셀 | 924 셀 | 825 셀 | 278 셀 |
| E05 (r 0.4293) | 18 | 1008 | 1170 | 1222 |
| E02 (r 0.5227) | 429 | 1318 | 2252 | 2499 |
| E06 (r 0.5973) | 444 | 1170 | 2743 | 2298 |

### 5-2. 쌍 검사가 "모서리 인접" 쌍을 통째로 건너뛴다 (P2)

`stageObjectColliders.test.js:377-379`
```js
const separatingGap = gapX > gapZ ? gapX : gapZ
const overlapsOtherAxis = gapX > gapZ ? gapZ < 0 : gapX < 0
if (!overlapsOtherAxis) continue
```
두 프랍이 수직축에서 전혀 겹치지 않으면(모서리끼리 대각으로 마주보면) 검사 자체를 건너뛴다. 주석은 "대각선으로 비켜 갈 수 있으므로"라고 하지만, `collidesEnemyObstacle`은 두 축 확장 AABB가 모두 겹치면 대각 통과도 막는다. 즉 `gapX < 2r` **그리고** `gapZ < 2r`이면 좀비에게는 완전 밀폐다.

현재 트리에서 해당 쌍 1건:
```
stage4-sink-north-east-collider | stage4-crates-north-east-corner-collider   gx=0.263  gz=0.440
```
좀비(2r = 0.747)는 두 축 모두 막히고, 플레이어(2×0.136 = 0.272)는 gz = 0.440으로 통과 가능 — 정확히 비대칭 조건이다.

### 5-3. 원거리·광역이 포켓을 완전 무적으로 만들지는 않는다 (관찰, 완화 요인)

- **E04 투사체는 프랍을 관통한다.** `enemyProjectilePool.js` 어디에도 장애물 판정이 없고, `enemySimulation`의 투사체 경로도 `obstacles`를 참조하지 않는다. 따라서 포켓 안에서도 E04에는 맞는다. (반대로 이건 "프랍이 총알을 막는다"는 플레이어 기대를 배신하는 별도 이슈다.)
- **B04 수프 폭발은 오히려 포켓을 피한다.** `b04SoupBlast.js:47` `if (obstacles.some(...overlapsObstacle)) continue` — 프랍과 겹치는 원을 버리므로 프랍 바로 옆 포켓은 원 배치에서 빠질 수 있다.
- **마틸다는 프랍을 통과한다.** `Enemy.jsx:1627` `<CuboidCollider args={colArgs} sensor={isMatilda} />`. 210초(`stageConfig.js` `MATILDA_SPAWN_SEC = 210`)부터는 포켓이 안전지대가 아니다.
- 결과적으로 포켓의 실효 이득 구간은 **0~210초**다. 그런데 탈출 포탈도 210초에 열린다(`ESCAPE_PORTAL_OPEN_SEC = 210`). **"숨어서 210초 대기 → 포탈로 클리어"** 경로가 성립하므로 심각도는 낮지 않다.
- **좀비 추적 포기는 stage2 게시판 한정이다.** `stageObjectColliders.js:270-292` `isStageObjectEnemyTrackingBlocked`는 `obstacle.type !== 'corridorLostFoundBoard'`면 즉시 continue한다. 그 외 프랍 뒤에서는 좀비가 계속 쫓아온다. 반면 플레이어 무기는 `weaponTargeting.js:9-16` `isPlayerWeaponSightBlocked`로 **모든** 프랍에 막힌다 — "플레이어는 못 쏘고 좀비는 온다"는 반대 방향 비대칭이며 무적은 아니다. 그러나 stage2 게시판 뒤는 좀비가 접근을 포기하고 측면 스트레이프만 하므로(`enemySimulation.js:661-666`), 5-1에서 가장 큰 포켓 3개가 전부 그 게시판 옆이라는 점이 겹쳐 **stage2 게시판 주변이 최고 위험 지점**이다.

---

## threemini가 반드시 반영해야 할 조치 목록

| # | 우선 | 조치 | 근거 |
|---|---|---|---|
| 1 | **P0** | 좀비 장애물 표현을 **회전 OBB로 통일**하거나(권장), 프랍 Rapier 콜라이더를 월드 AABB로 통일한다. 지금은 좀비=AABB / 플레이어=OBB라 **좌표 이동만으로는 절대 0이 되지 않는다.** 범위가 커서 별도 카드 + levelmini·balanceqa 동반 필요. | `stageObjectColliders.js:427-435` vs `StageObjectColliderLayer.jsx:23-28` |
| 2 | **P0** | 회귀 테스트를 "AABB 틈 폭"에서 **도달성 플러드필**로 교체 또는 병행한다. 현행 검사는 stage2 실제 포켓 18개를 0건으로 통과시킨다. | 본문 5-1 표 |
| 3 | P1 | `OPEN_GAP_MIN` 근거 수정. 0.747은 최소가 아니라 E01/E07 직경이고 실제 최소는 E03 0.560이다. 통과 기준은 그 스테이지 **최대** 근접 좀비(E06 1.195, stage2 RZT 1.314) + 여유로 잡아야 한다. 전 스테이지 공통값이면 **1.70**. | `enemySimulation.js:60,311-313` / 항목 1 실측표 |
| 4 | P1 | 현재 남은 틈 0.853 / 0.854 / 0.862 / 0.873 / 0.876 / 0.890 / 0.897 / 0.914를 **최소 1.30 이상**으로 재조정. 0.853·0.854는 **E05(0.8587)조차 못 들어간다.** | 항목 2 |
| 5 | P2 | 쌍 검사의 `if (!overlapsOtherAxis) continue`를 제거하고, 두 축 모두 `< 2r`이면 위반으로 잡는다. 현재 걸릴 쌍: `stage4-sink-north-east \| stage4-crates-north-east-corner` (gx 0.263 / gz 0.440). | `stageObjectColliders.test.js:377-379` |
| 6 | P2 | 테스트 주석 정정: `Player.jsx:162` → 실제 `Player.jsx:287`. "B04 반경도 0.747"은 값은 맞지만 보스는 풀 시뮬 밖(`ENEMY_RUNTIME_SCALE[9..12] = 0`)이라 오해를 부른다 — 보스는 Rapier `[0.3733, -, 0.2667]`임을 명시. | `stageObjectColliders.test.js:320-324` |
| 7 | 확인요 | Bang_Rules 2026-08-23 조항은 stage4 프랍을 **"X 위치만 재배치"**로 제한한다. `stage4-preptable-east-south-counter` `11.25 → 11.2`는 Z 변경이라 충돌한다. Terry 확인 필요. | `Bang_Rules.md:3` |

---

## 실제로 실행한 명령과 출력

### A. 회귀 테스트 (프로젝트 트리)

```
cd D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype
npx vitest run --maxWorkers=1 --no-file-parallelism src/components/StageObjects/stageObjectColliders.test.js
→ Test Files  1 passed (1)
  Tests  20 passed (20)
```

```
npx vitest run --maxWorkers=1 --no-file-parallelism \
  src/components/StageObjects/stageObjectColliders.test.js \
  src/components/StageObjects/stageObjectPlacements.test.js
→ Tests  6 failed | 29 passed (35)
  실패 6건 전부 stageObjectPlacements.test.js, 전부 이번 포켓 작업과 무관한 선행 회귀:
   × keeps Stage 1 desks away from the central spawn/play zone
   × keeps exactly the 31 authored Stage 1 props that can enter the visible envelope  (21 vs 31)
   × renders every prepared stage2 prop at 110 percent of its authored scale
   × uses the dedicated red class-president student model without changing its authored placement
   × moves every Stage 2 prop into the interior blocker field
   × distributes props across each stage without occupying its central spawn lane
```

### B. 헤드리스 프로브 (전부 스크래치패드, 저장소 밖)

`.jsx` 파일은 평가하지 않고 상단 순수 데이터 `export const NAME = {…}`만 뽑아내는 Node ESM 로더 훅을 써서, 저장소에 파일을 만들지 않고 실제 모듈을 직접 import했다.

1. `gapprobe.mjs` / `gapsweep.mjs` — `EnemySimulationRuntime.step` 실주행. 통로 폭 × 적 타입 × 접근 오프셋 7종 × 25초. → 항목 1 표.
2. `scan.mjs` — `getStageObjectColliders` 월드 AABB로 벽/쌍 틈을 임계값 0.847 / 1.1 / 1.3 / 1.7 / 2.0에서 스캔. → 0단원, 항목 1 "위반 폭증" 수치.
3. `flood.mjs` / `flood2.mjs` — 격자 0.05 도달성 플러드필. 플레이어 OBB(0.136 팽창) vs 좀비 AABB(r 팽창), 접촉거리 안에 좀비 도달 셀이 없는 플레이어 도달 칸을 포켓으로 판정. **동일 입력 3회 재현 결과 완전 일치**(0 / 924 / 825 / 278 셀). → 항목 5-1.
4. `extra.mjs` — stage4 시작점 표면거리, 모서리 인접 쌍 탐색. → 항목 4, 5-2.
5. `rule.mjs` / `near.mjs` — stage1 중앙존 규칙 위반 목록, 포켓 인접 프랍 식별.

프로브 위치: `C:/Users/admin/AppData/Local/Temp/claude/D--JungSil-2-Minigame-project-school-survivor-integration/cb49fa9d-a2c0-424c-a825-608030f335cb/scratchpad/`

### C. 실행하지 않은 검증 (하지 않았음을 명시)

- **실플레이 검증 없음.** dev 서버 실행, 브라우저 조작, 실기기 확인 모두 하지 않았다. "플레이어가 실제로 그 0.2 units 슬롯에 조이스틱으로 들어갈 수 있는가"는 미확인이다.
- **Rapier 실물리 검증 없음.** 플레이어 자유공간은 `CuboidCollider args=[0.136,0.32,0.136]`에서 파생한 기하 모델이며 Rapier 솔버를 돌린 결과가 아니다.
- **보스 이동 검증 없음.** 보스는 풀 시뮬 밖이라 헤드리스로 돌릴 수 없었다. 보스 콜라이더 치수는 `Enemy.jsx` 독해로만 확인했고 실제 통과 여부는 미검증이다.
- **넉백/스턱 텔레포트 반영 없음.** 플러드필은 정적 도달성 모델이라, `findNearestFreeEnemyPositionInto(startGlobal=true)`가 낀 좀비를 우연히 포켓 안으로 옮기는 경우는 계산에 없다. 이는 비결정적 완화 요인이지 보장이 아니다.
- **전체 테스트 스위트 미실행.** 이번 감사는 `StageObjects` 2개 파일만 돌렸다.
