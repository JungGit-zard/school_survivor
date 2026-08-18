# 탈출 포기 시 무한 생존 모드 — 설계 및 리스크 분석

- 작성: Balance_QA_Mini (balanceqa)
- 날짜: 2026-08-19
- 범위: 설계·리스크 분석만. **이 턴에 소스 파일은 한 줄도 편집하지 않았다.**
- 확정 방식: **2번안 — 탈출 포기 시 무한 생존.** 포탈에 진입하지 않으면 스테이지가 끝나지 않고 마틸다 추격이 계속된다.

## 표기 규칙

각 항목 앞에 근거 등급을 붙인다. 이 문서에서 **[실측]** 은 "내가 이 세션에서 해당 파일을 직접 읽었거나 테스트를 직접 실행해 확인한 사실"만을 뜻한다.

- **[실측-정적]** — 이 세션에서 소스를 직접 읽어 확인. 파일:행 표기.
- **[실측-테스트]** — 이 세션에서 vitest를 직접 실행해 통과/실패를 확인.
- **[추정]** — 코드에서 유도한 산술 모델 또는 설계 판단. 런타임으로 재현하지 않았다.
- **[미검증]** — 확인이 필요하지만 이 세션에서 확인하지 않은 항목.

---

# 0. 헤드라인 — 이 작업의 전제가 하나 틀렸다

## 0.1 240초 자동 클리어는 **존재하지 않는다**

**[실측-정적]** 런타임 어디에도 `durationSec`(240)에 도달했을 때 스테이지를 끝내는 코드가 없다. 게임을 끝내는 경로는 정확히 두 개뿐이다.

| 경로 | 트리거 | 호출 사슬 |
|---|---|---|
| 클리어 | 탈출 포탈 흡입 완료 | `EscapePortal.jsx:123` → `clearStageAndStartNext()` (`useGameStore.js:1013`) |
| 게임오버 | HP 0 또는 마틸다 접촉 | `useGameStore.js:330 killPlayer` / `damagePlayer` HP≤0 분기 → `_onRunEnd('gameover')` |

**[실측-정적]** `clearStage` / `clearStageAndStartNext`의 전체 호출처를 grep으로 확인한 결과:

```
src/components/EscapePortal.jsx:50    const clearStageAndStartNext = useGameStore((s) => s.clearStageAndStartNext)
src/components/EscapePortal.jsx:123   clearStageAndStartNext()
src/store/useGameStore.js:1018        get().clearStage()        ← clearStageAndStartNext 내부의 "다음 스테이지 없음" 분기
```

즉 **런타임에서 `clearStage`를 부르는 것은 포탈 하나뿐이다.**

**[실측-정적]** `getStageDurationSec` / `durationSec`의 소비처도 전량 확인했다. 게임플레이 루프는 한 곳도 없다.

```
src/lib/stageConfig.js:146-148   getStageDurationSec 정의
src/lib/stageConfig.js:182       어드민 override
src/lib/stageMultiHzParity.js:17,96,269,270,308,363   ← 결정성 검증 하네스(테스트 전용)
```

**[실측-정적]** `Game.jsx`의 고정스텝 블록(`Game.jsx:88-106`)이 시간으로 하는 일은 정확히 세 가지뿐이다.

```jsx
// Game.jsx:91-105
const elapsedMs = advanceRuntimeTime(fixedDelta * 1000)
checkSurvivalMilestone(elapsedMs)                                     // :92
const gs = useGameStore.getState()
const stageConfig = getStageConfig(currentStageId)
// 스테이지 설정 시간에 자동 클리어 대신 탈출구 등장
if (!gs.escapePortalActive && elapsedMs >= stageConfig.escapePortalSec * 1000) {   // :97
  activateEscapePortal()
  emitSfx({ id: 'portalAppear' })
}
if (!gs.matildaSpawned && elapsedMs >= stageConfig.matildaWarningSec * 1000) {     // :102
  spawnMatilda()
}
```

`:96`의 주석 "스테이지 설정 시간에 자동 클리어 **대신** 탈출구 등장"이 명시적 근거다. 자동 클리어는 과거에 제거됐다.

### 결론

**[추정]** 2번안의 종료 조건 부분은 **이미 구현돼 있다.** 지금 게임을 켜고 210초에 열린 포탈을 무시하면, 240초가 지나도 스테이지는 끝나지 않고 마틸다에게 잡힐 때까지 계속된다. 별도 코드 변경 없이 그렇게 동작한다.

**[미검증]** 이 사실을 브라우저 실플레이로 240초 이상 재현하지는 않았다. 근거는 전량 정적 추적이다. D1의 첫 작업 항목을 "실플레이 240초 초과 확인"으로 둔 이유가 이것이다.

## 0.2 그래서 진짜 문제는 종료 조건이 아니라 **240초 이후 세계가 비어 있다는 것**

무한 구간은 이미 들어갈 수 있는데, 들어가면 세 가지 벽에 부딪힌다.

| # | 벽 | 근거 |
|---|---|---|
| B1 | **랭킹 제출이 300초에서 차단된다.** RTDB 보안 규칙이 `timeMs <= 300000`을 강제한다. 초과 시 PERMISSION_DENIED이며 `.catch(() => {})`가 조용히 삼킨다. | **[실측-정적]** `database.rules.json:195,218` / `useGameStore.js:615` |
| B2 | **스1·2·4는 216초 이후 300초까지 신규 잡몹 스폰이 0이다.** 버스트 표 마지막 이벤트가 216초, 오버타임 시작이 300초. | **[실측-정적]** `burstEvents.js:124,156,194` / `Enemies.jsx:1039` |
| B3 | **곡선이 시간에 따라 강해지지 않는다.** 30초당 30마리 고정 요청 + 동시 150 상한 = 플레이어 DPS에 자동으로 맞춰지는 음의 피드백. 난이도는 오르는 게 아니라 **내려간다.** | **[실측-정적]** `Enemies.jsx:1039-1041,1445-1457` + **[추정]** 산술 모델(§D2'.1) |

---

# 1. 현재 종료·클리어 판정 흐름 (실측 기술)

## 1.1 시간축 정본

**[실측-정적]** `src/lib/stageConfig.js`

```
:6    STAGE_DURATION_SEC = 240
:7    BOSS_SPAWN_CENTER_SEC = 150
:9    ESCAPE_PORTAL_OPEN_SEC = 210
:11   MATILDA_SPAWN_SEC = 210
:12   MATILDA_WARNING_SEC = MATILDA_SPAWN_SEC - 5   → 205
```

**[실측-정적]** 네 스테이지 모두 `durationSec: STAGE_DURATION_SEC`(240), `escapePortalSec: ESCAPE_PORTAL_OPEN_SEC`(210), `bossWarningSec: 150`, `matildaSec: 210`, `matildaWarningSec: 205`로 동일하다. (`stageConfig.js:26,31,49,55,73,81,100,108`)

**[실측-정적]** 마틸다는 205초에 `spawnMatilda()`로 **대사만** 띄우고(`Game.jsx:102`), 실체는 `Enemies.jsx:1402-1414`의 `createMatildaEntryGrace`가 `(matildaSec - matildaWarningSec) * 1000` = 5000ms 뒤, 즉 **정확히 210초**에 스폰한다. 브리프의 "포탈 개방과 마틸다 등장이 같은 210초"는 실측과 일치한다.

## 1.2 클리어 경로 (유일)

**[실측-정적]** `src/components/EscapePortal.jsx`

```
:76    useFrame — phase !== 'playing' 이면 즉시 return (클리어 후 재발화 차단)
:90-99 플레이어와 포탈 중심 거리 < PORTAL_TRIGGER_RADIUS(0.6) → 흡입 시작
:107   advancePortalSuctionClock — 고정 스텝 흡입 진행
:120-124  completedNow && !clearedRef.current
            → clearedRef.current = true
            → emitSfx({ id: 'escapePortalClear' })
            → clearStageAndStartNext()
```

**[실측-정적]** `src/store/useGameStore.js`

```
:1007-1011  clearStage()
              set({ phase: 'cleared' }) → emitSfx('stageClear') → _onRunEnd('cleared')
:1013-1026  clearStageAndStartNext()
              phase !== 'playing' 이면 false
              getNextStageId 없으면 → clearStage() (스4 = 최종)
              있으면 → emitSfx → _onRunEnd('cleared') → resetGame(nextStageId, { preserveQuestJourney: true })
```

## 1.3 게임오버 경로

**[실측-정적]**

```
useGameStore.js:330-341  killPlayer(source)
   phase !== 'playing' 가드 → godMode 해제 → hp 0, phase 'gameover', deathCause=source
   → emitSfx('playerDeath') → vibrate → _onRunEnd('gameover')
Enemy.jsx:67    MATILDA_CONTACT_KILL_DELAY_MS = 0
Enemy.jsx:1001-1003  isMatildaBodyContact(...) → killPlayer('matilda')
```

즉 마틸다 접촉은 **딜레이 0의 즉사**이며, 플레이어 HP·무적프레임과 무관하다. (`matildaSpec.test.js:18-28`이 이를 잠근다 — **[실측-정적]**, 이 테스트는 이번에 실행하지 않았다.)

## 1.4 런 종료 시 기록·보상 확정 (`_onRunEnd`)

**[실측-정적]** `useGameStore.js:517-616`

| 순서 | 처리 | 행 |
|---|---|---|
| 1 | `runSurvivalSeconds = floor(elapsedMs / 1000)` — **상한 없음** | :520-521 |
| 2 | 누적 합본 계산(`totalRuns/totalKills/totalGold/totalLevelUps/totalSurvivalSeconds`) | :528-535 |
| 3 | `cleared`일 때만 `stage.clearRecordKey` +1 (평가용 합본) | :536-538 |
| 4 | 미션 이벤트 batch — `survival_updated`, `stage_cleared`, `special_enemy_survival` | :541-556 |
| 5 | 무기 해금 평가 → diff → `setWeaponUnlocked` | :558-566 |
| 6 | `snapshotPlayerRecords` (누적 스냅샷) | :576-581 |
| 7 | `bestSurvivalSeconds` + `stage.bestRecordKey` 최고기록 갱신 | :585-588 |
| 8 | `cleared`일 때만 `incrementPlayerRecord(stage.clearRecordKey, 1)` | :592 |
| 9 | 랭킹 제출 — `submitRun(...).catch(() => {})` | :605-615 |

**[실측-정적]** 골드는 `_onRunEnd`가 아니라 **런 도중에 즉시 확정**된다. `gainGold`(`:619-627`)가 매 코인 획득마다 `saveGoldTotal(nextTotal)` + `saveRuntimeProgress()`를 호출한다. **런이 게임오버로 끝나도 그때까지 먹은 골드는 이미 저장돼 있다.** 이것이 §D3.1 파밍 리스크의 뿌리다.

## 1.5 240초에 실제로 걸려 있는 것 = 마일스톤 하나뿐

**[실측-정적]** `stageConfig.js:38-42,60-64,86-90,114-118` — `survivalMilestones`의 마지막 항목이 `atMs: 240_000`이다(스1 gold 8 / 스2 10 / 스3 14 / 스4 18, 라벨 "…탈출 보너스").

**[실측-정적]** `useGameStore.js:701-708` `checkSurvivalMilestone`은 `survivalMilestonesHit` 배열로 중복 발화를 막는다. 따라서 **마일스톤 골드는 240초에 종료되며 무한 구간에서 추가 지급되지 않는다.** 무한 파밍이 마일스톤 골드를 늘리지는 못한다.

**[실측-정적]** `HUD.jsx:710-711` 타이머는 카운트업이다. `Math.floor(elapsed / 60000)` : `Math.floor((elapsed % 60000) / 1000)`. 240초를 넘기면 `04:01`, `05:00` … 으로 계속 증가하며 오버플로 처리가 없다.

**[미검증]** `styles.timer`(`HUD.jsx:1914`)의 폭이 3자리 분(`100:00`)까지 견디는지는 확인하지 않았다. 무한 모드에서 100분을 넘길 시나리오가 있다면 UI 회귀 확인이 필요하다.

## 1.6 240초 이후 실제로 살아 있는 시스템

**[실측-정적]** 시간 기반 런타임 스폰 경로 전수 확인 (`Enemies.jsx` 프레임 스케줄러 `:1669-1700`).

| 시스템 | 240초 이후 동작 | 근거 |
|---|---|---|
| 버스트 표 | **정지.** 스1 마지막 216초, 스2 216초, 스3 216초, 스4 216초 | `burstEvents.js:124,156,194` 및 스2 표 |
| 스3 반복 버스트(E01/E07 25초 주기) | **정지.** `endExclusiveSec = 150` | `burstEvents.js:16,21,22` |
| 보스 | 150초 1회. `bossPressure`는 210초에 꺼진다 | `Enemies.jsx:1653` |
| 마틸다 | 210초 1회, 재스폰 없음 | `Enemies.jsx:1402-1414` |
| 도지 | 60초 1회 | `Enemies.jsx:1676-1679` |
| **골드 코인** | **계속.** 20~28초 랜덤 간격으로 무한 | `Enemies.jsx:47-48,96-97,1669-1673` |
| **오버타임 보강** | 스3는 225초부터 계속 / 스1·2·4는 **300초부터** | `Enemies.jsx:303,1039-1041,1681-1686` |

**핵심 실측 결과:** 스1·2·4에서 **216초~300초 사이 84초 동안 신규 잡몹 스폰이 0**이다. 브리프가 말한 "60초 공백"은 실제로는 240초 기준 **60초**, 마지막 스폰 기준 **84초**다.

---

# D1. 종료 조건 변경 설계

## D1.1 최소 변경 경로 — 종료 로직은 손대지 않는다

**[추정]** §0.1의 실측에 따라, "포탈 진입 = 클리어 / 미진입 = 무한 지속"은 **현재 코드가 이미 하는 일**이다. 따라서 D1의 올바른 최소 변경 경로는 종료 로직 수정이 아니라 다음 4가지다.

### D1-a. 실플레이로 240초 초과 지속을 먼저 확인한다 (선행 필수)

**[미검증]** 코드상 자동 클리어는 없지만, 실제로 300초·600초까지 게임이 정상 지속되는지는 확인하지 않았다. **다른 어떤 작업보다 이걸 먼저 해야 한다** — 여기서 예상 밖의 종료가 나오면 이후 설계가 전부 무의미해진다.

권고 절차:
1. 어드민 밸런스 override(`stageConfig.js:182` `balance.stageDurationSec`)가 아니라 **정상 값 그대로** 스1을 시작한다.
2. 210초에 포탈이 열리면 **진입하지 않고** 회피만 한다.
3. 240 / 300 / 360 / 600초 시점 스크린샷 + 콘솔 에러 캡처.
4. 확인 항목: 스테이지 미종료, HUD 타이머 정상 증가, 오버타임 300초 첫 보강 시각, 콘솔 에러 0, 프레임레이트.

### D1-b. **소스 편집 없이 회귀 방지 테스트를 추가한다** (권고 1순위 코드 작업)

**[추정]** 현재 "240초에 안 끝난다"는 사실을 지키는 테스트가 없다. 실측 확인: `stageConfig.test.js`는 `getStageDurationSec(...) === 240`만 확인할 뿐(`stageConfig.test.js:22-24,33-34,73-74,102`), 240초에 phase가 바뀌지 않는다는 것은 아무도 잠그지 않는다.

이 상태에서는 누군가 "스테이지 시간이 240인데 왜 안 끝나지?"라며 자동 클리어를 되살릴 수 있다. 2번안의 유일한 실질 방어선이 테스트다.

추가할 테스트 (신규 파일 `src/components/Game.endlessMode.test.jsx` 권고):
- `phase === 'playing'`에서 elapsed를 600초까지 진행시켜도 `phase`가 `'cleared'`로 바뀌지 않는다.
- `escapePortalActive`는 210초에 true가 되고 그 뒤 유지된다.
- 포탈 흡입 완료만이 `phase === 'cleared'`를 만든다.

### D1-c. RTDB `timeMs <= 300000` 규칙을 확장한다 (B1 해소)

**[실측-정적]** `database.rules.json:195` 및 `:218`

```
newData.child('timeMs').val() <= 300000
&& newData.child('score').val() >= (newData.child('timeMs').val() / 1000) - 1
&& newData.child('score').val() <= (timeMs/1000 + stageBonus + clearBonus) * (cleared ? 1.2 : 1)
```

**[추정]** 300초를 넘긴 런은 규칙 위반으로 거부되고, `useGameStore.js:615`의 `.catch(() => {})`가 이를 조용히 삼킨다. 플레이어에게는 "기록이 안 올라간다"는 침묵의 버그로 보인다. 게다가 스1·2·4의 오버타임 시작 시각(300초)과 이 상한이 **정확히 같은 초**라는 것은 우연이며, "무한 구간에 진입한 순간 랭킹이 죽는다"는 최악의 조합이다.

권고 처리는 §D4-2에서 선택지로 제시한다. 어떤 안을 택하든 **`database.rules.json`, `useGameStore.js`의 점수 계산, 미배포 `functions/src/ranking.js` 세 곳을 함께 고쳐야 한다** — `rankingScorePolicy.js:5-12` 주석이 이 3중 동기화를 명시한다(**[실측-정적]**).

### D1-d. 무한 구간임을 플레이어에게 알린다 (UX)

**[실측-정적]** 네 스테이지 `description`이 모두 `'3분 30초 후 열린 탈출구로 탈출하기'`다(`stageConfig.js:25,48,72,99`). 무한 구간의 존재를 어디에서도 알리지 않는다.

**[추정]** 최소 개입 권고: 240초를 넘긴 시점부터 HUD 타이머 옆에 무한 구간 배지(예: `OVERTIME`)를 표시한다. 새 화면이나 새 모드 선택 UI는 만들지 않는다 — 2번안의 장점이 "모드 선택 없이 플레이어 행동으로 갈린다"는 것이기 때문이다. 실작업은 uimini 담당.

## D1.2 240초 시점 처리 분기

**[실측-정적]** 240초에 걸려 있는 처리는 마일스톤 골드 1건뿐이며(§1.5), 이미 1회성이고 중복 방지가 되어 있다. **분기할 것이 없다.** 타이머 종료·결과창·기록 저장은 240초와 아무 관계가 없다 — 전부 `_onRunEnd`에 묶여 있고 `_onRunEnd`는 포탈/사망에서만 불린다.

**[추정]** 따라서 "240초 시점 처리를 어떻게 분기할 것인가"라는 질문은 **현 코드에서는 성립하지 않는다.** 이것이 2번안이 저렴한 이유다.

## D1.3 무한 구간 사망 시 기록·보상 처리

### 현재 상태 (실측)

**[실측-정적]** 무한 구간에서 죽으면 `killPlayer` → `_onRunEnd('gameover')`가 그대로 돈다. `phaseName !== 'cleared'`이므로:

- `stageXClears`는 **증가하지 않는다** (`:536-538`, `:592`). → **기존 클리어 카운트와 충돌 없음. 안전.**
- `bestSurvivalSeconds` / `stageXBestSurvivalSec`는 **무한 구간 시간으로 갱신된다** (`:585-588`). → **충돌 발생.**
- `totalSurvivalSeconds` 누적도 무한히 늘어난다 (`:534`).
- 랭킹은 300초 벽에 막혀 제출 실패 (§D1-c).

### 충돌 판정

**[추정]** `bestSurvivalSeconds`의 의미가 붕괴한다. 지금 이 값은 "240초 스테이지를 얼마나 버텼나"이며 상한이 사실상 240 부근이다. 무한 모드가 열리면 같은 키에 3,000초·10,000초가 들어와 **240초 스테이지의 생존 성취가 영원히 갱신 불가능한 노이즈가 된다.**

**[실측-정적]** 이 키를 읽는 곳이 해금 평가(`evaluateUnlocks`의 `runSurvivalSeconds`, `useGameStore.js:531,558`)와 `stage1Survival180Runs`(`:589-591`) 등이므로, 무한 시간이 흘러들어가면 해금 조건이 첫 무한런 한 번으로 전부 뚫린다.

### 권고 (근거 포함)

**[추정]** **무한 구간 시간을 별도 키로 분리한다.** 기존 키는 240초에서 잘라 저장한다.

```
setBestPlayerRecord(stage.bestRecordKey, Math.min(runSurvivalSeconds, 240))   // 기존 의미 보존
setBestPlayerRecord('endlessBestSeconds_' + stageId, runSurvivalSeconds)      // 신규
```

근거 셋:
1. **해금 시스템 보호.** `evaluateUnlocks`가 생존 시간을 조건으로 쓰므로(**[실측-정적]** `:558`) 무한 시간이 들어가면 무기 해금 커브가 통째로 무너진다. 클램프가 이걸 원천 차단한다.
2. **기존 기록 보존.** 이미 저장된 플레이어들의 `bestSurvivalSeconds`(최대 240 근처)와 새 값이 같은 축에 남는다. 마이그레이션이 필요 없다.
3. **랭킹 규칙과 정합.** RTDB `timeMs <= 300000` 상한을 그대로 두는 안(§D4-2 A안)을 택하면 240 클램프와 자연스럽게 맞물린다.

**[추정]** 무한 구간의 골드·XP 보상 처리는 §D3.1에서 별도로 다룬다 — 여기가 이 설계 전체에서 가장 위험한 지점이다.

---

# D2'. 기존 무한 곡선 검증

## D2'.0 정본 실측 재확인

**[실측-정적]** `src/components/Enemies.jsx`

```
:303   STAGE3_OVERTIME_REINFORCEMENT_START_SEC = 225
:305   getOvertimeReinforcementStartSec(stageId) → stage3면 225, 그 외 OVERTIME_REINFORCEMENT_START_SEC
:309   overtimeReinforcementTick = floor((elapsedSec - startSec) / 30)
:315   shouldScheduleOvertimeReinforcement — tick > lastFiredTick 일 때만 발화(중복 방지)
:1039  OVERTIME_REINFORCEMENT_START_SEC = 300
:1040  OVERTIME_REINFORCEMENT_INTERVAL_SEC = 30
:1041  OVERTIME_REINFORCEMENT_COUNT = 30
:1042  STAGE1_OVERTIME_MIXED_TYPES = ['E01','E02','E03','E05','E06','E07']      ← E04 제외
:1043  DEFAULT_OVERTIME_MIXED_TYPES = ['E01','E02','E03','E04','E05','E06','E07']
:1445-1457  SCHEDULE_OVERTIME 핸들러 — clampZombieSpawnRequest(30, totalZombieCounts())
            → buildOvertimeMixedReinforcementEntries → spawnPosForBurstType → addEnemies(batch, true, token)
:1681-1686  프레임 스케줄러 배선
:324-333    clampZombieSpawnRequest(requested, counts, max = MAX_CONCURRENT_ZOMBIES)
            total = pooledActive + specialActive + pooledQueued
            return min(wanted, max(0, max - total))
:1038       MAX_CONCURRENT_ZOMBIES = MAX_ENEMIES
```

**[실측-정적]** `src/lib/enemyEntityPool.js:2` — `MAX_ENEMIES = 150`.

**[실측-테스트]** 이 세션에서 직접 실행:

```
npx vitest run --maxWorkers=1 --no-file-parallelism src/components/Enemies.test.jsx -t "overtime"
→ Test Files 1 passed (1) / Tests 5 passed | 88 skipped (93) / Duration 1.92s
```

통과한 5건 (verbose 실측):
1. `starts Stage 3 exactly at 225s while other stages stay at 300s, with deterministic 30s ticks`
2. `uses 30 injected-random ordinary E01-E07 picks and preserves the Stage 1 no-E04 rule`
3. `caps concurrent pooled plus special plus deferred zombies at exactly 150 without deleting existing zombies`
4. `wires overtime through the frame scheduler and pooled drain path`
5. `consumes Stage 3 repeating burst descriptors through the existing RAF queue without using one-shot fired slots`

**즉 기존 곡선은 명세대로 정확히 구현돼 있고 테스트로 잠겨 있다. 구현 결함은 없다.** 아래 검증은 "구현이 틀렸다"가 아니라 "명세가 무한 구간을 상정하고 만들어지지 않았다"에 대한 것이다.

## D2'.1 판정 ①: 이 곡선은 무한 구간에서 난이도가 오르지 않는다

### 산술

**[실측-정적]** 요청량은 30마리 / 30초 = **1마리/초로 시간 불변**이다. 증가항이 없다.

**[추정]** 오버타임 풀은 균등 추첨(`buildOvertimeMixedReinforcementEntries`, `Enemies.jsx:324-333`)이므로 1마리당 기대 HP는 다음과 같다.

| 스테이지 | 풀 | 평균 기본 HP | `STAGE_HP_MULTIPLIER` | 적용 평균 HP | 정상상태 유지 필요 DPS |
|---|---|---|---|---|---|
| 스1 | E01,E02,E03,E05,E06,E07 | (8+70+10+70+320+16)/6 = **82.3** | 1.0 | 82.3 | **≈ 82 DPS** |
| 스2 | +E04 | (8+70+10+32+70+320+16)/7 = **75.1** | 1.2 | 90.2 | **≈ 90 DPS** |
| 스3 | 동일 | 75.1 | 1.44 | 108.2 | **≈ 108 DPS** |
| 스4 | 동일 | 75.1 | 1.728 | 129.8 | **≈ 130 DPS** |

(ENEMY_STATS 원본 HP는 **[실측-정적]** `Enemy.jsx:287-307`, 배율은 **[실측-정적]** `Enemies.jsx:772`.)

**[실측-정적]** 참고: E06(hp 320)이 스1 풀 전체 HP의 **64.8%**(320/494)를 차지한다. 오버타임 압력의 실질 대부분이 E06 한 타입에서 나온다.

### 무엇이 일어나는가

**[추정]** 세 국면이 순서대로 온다.

1. **DPS < 필요 DPS 구간** — 좀비가 쌓여 150에 도달한다. 이때부터 `clampZombieSpawnRequest`가 남는 슬롯만 채우므로 **실제 스폰율 = 실제 처치율**이 된다. 압력이 더 이상 증가하지 않고 고정된다.
2. **레벨업 진행** — 무한 구간에서 XP는 계속 들어온다. 오버타임 1틱의 기대 XP는 스1 기준 `(4+15+5+15+56+8)/6 × 30 = 515 XP / 30초 ≈ 17.2 XP/초`(**[추정]**, XP 값은 **[실측-정적]** `Enemy.jsx:287-307`). 플레이어 DPS는 단조 증가한다.
3. **DPS > 필요 DPS 구간** — 좀비 수가 150 아래로 떨어지고, 이후 영원히 회복되지 않는다. **난이도가 시간에 따라 하락한다.**

### 판정

**[추정]** **하드락(진행 불가)은 발생하지 않는다.** 오히려 반대 문제다 — **자연스러운 종료로 수렴하지 않고 영구 교착(무한 안정 상태)에 수렴한다.**

보조 실측 근거 둘:

- **[실측-정적]** 풀링 좀비는 rapier 물리 바디를 갖지 않는다. `enemyBodies`(`refs.js`)에 등록되는 것은 `Enemy.jsx`(특수 적)와 `DancingDogeEvent.jsx`뿐이며, `ZombieInstanceLayer.jsx`에는 `RigidBody`/`Collider`가 하나도 없다(grep 결과 0건). 좀비 사이의 유일한 상호작용은 `enemySimulation.js:668-700`의 **소프트 분리 속도 보정**(반경 0.8, 계수 0.85)이다.
- **[추정]** 따라서 **좀비 150마리가 플레이어를 물리적으로 가둘 수 없다.** 플레이어는 좀비를 그냥 통과한다. 유일한 압력은 접촉 피해이고, 접촉 쿨다운은 `ENEMY_CONTACT_COOLDOWN_MS = 500`(**[실측-정적]** `enemySimulation.js:12`)이다.

**[추정]** 접촉 DPS 상한 산술: 접촉 가능한 동시 인원은 분리 반경 0.8이 강제하는 기하 때문에 플레이어 주변 4~6마리 수준으로 수렴한다. 스1 최악(전원 E06, damage 20)이라도 `6 × 20 × 2 = 240 DPS`가 상한이다. 그런데 레벨업 선택지에는 **상한 없는 `maxHealth`**가 있다(§D3.4). 즉 시간이 갈수록 접촉 DPS는 고정, 플레이어 최대 HP는 무한 증가 → **잡몹이 플레이어를 죽일 수 없는 상태에 반드시 도달한다.**

**결론: "못 치운다"가 아니라 "안 죽는다"로 수렴한다. 목표와 정반대다.**

## D2'.2 판정 ②: 스1·2·4의 300초 시작 — 도달 가능성과 공백

### 도달 가능성

**[추정]** 브리프의 "300초 시작이 실질적으로 도달 불가"는 **부분적으로만 맞다.** §0.1에서 확인했듯 240초 자동 종료가 없으므로, 포탈을 무시하면 300초는 **지금도 도달 가능하다.** 다만 (a) 그렇게 플레이할 이유를 게임이 제시하지 않고, (b) 216~300초에 스폰이 0이라 그 84초가 텅 비어 있으며, (c) 300초를 넘기는 순간 랭킹 제출이 죽으므로 — **사실상 아무도 도달하지 않는 코드**인 것은 맞다.

**[추정]** 스3의 225초는 다르다. 240초 스테이지 안에 들어오므로 **이미 정상 클리어 런에서도 발화하고 있다.** 스3만 210~240초 구간에 30마리가 추가로 얹혀 있는 상태다. (스3는 "죽은 코드"가 아니다.)

### 216~300초 공백 정밀 실측

**[실측-정적]** 스테이지별 마지막 신규 스폰과 오버타임 첫 발화 사이 간격:

| 스테이지 | 마지막 버스트 | 오버타임 tick0 | **신규 스폰 공백** |
|---|---|---|---|
| 스1 | 216초 (E05×3) | 300초 | **84초** |
| 스2 | 216초 (E05×3) | 300초 | **84초** |
| 스3 | 216초 (E05×3) | **225초** | **9초 (사실상 없음)** |
| 스4 | 216초 (E05×4) | 300초 | **84초** |

(**[실측-정적]** `burstEvents.js:124,156,194` 및 스2 버스트 표; `Enemies.jsx:303,1039`)

### 이 공백이 왜 위험한가

**[추정]** 이 84초는 "심심한 구간"이 아니라 **익스플로잇의 입구**다.

1. 216초 이후 신규 좀비가 0이므로, 플레이어는 남은 좀비를 정리하고 나면 **마틸다와 단둘이 남는다.**
2. 마틸다 HP는 210초 시점 플레이어 DPS × 1800초로 **스폰 순간 1회 고정**된다(**[실측-정적]** `Enemies.jsx:1471-1480` 주석 S3, `matildaSpec.test.js:66-67,81`이 `estimatePlayerDps × MATILDA_ATTACK_SECONDS(1800)`을 잠근다).
3. 방해 요소가 0인 84초 동안 원거리·자동 무기로 마틸다를 안전하게 깎을 수 있다.
4. 마틸다는 **재스폰되지 않는다** — `spawnMatilda`는 `matildaSpawned: true`를 세우는 1회성이고(**[실측-정적]** `useGameStore.js:989`), `Enemies.jsx:1402-1414`의 useEffect도 1회만 예약한다.

**[추정]** 즉 **마틸다를 죽이면 무한 구간의 유일한 사망 원인이 영구히 사라진다.** §D2'.1과 합치면: 잡몹은 플레이어를 죽일 수 없고(무한 maxHP), 마틸다는 없어졌고, 골드 코인은 20~28초마다 계속 떨어지고, 골드는 획득 즉시 Firebase에 저장된다 → **완전 AFK 골드 파밍 루프.** 이것이 이 설계의 최대 리스크다(§D3.1).

### 권고 (근거 포함)

**[추정]** **권고: 스1·2·4의 오버타임 시작을 300초 → 240초로 옮긴다. 스3의 225초는 사용자 확정값이므로 그대로 둔다.**

즉 상수 하나만 바꾼다: `Enemies.jsx:1039  OVERTIME_REINFORCEMENT_START_SEC = 300 → 240`.

결과 케이던스:
- 스1·2·4: 240 → 270 → 300 → 330 …
- 스3: 225 → 255 → 285 → 315 … (무변경)

근거 다섯:

1. **240초 이전 밸런스를 한 톨도 건드리지 않는다.** 스테이지 총 HP 사다리(3,710 / 4,823 / 6,270 / 8,151, 1.3배)는 240초 완주 기준 집계다. 225초로 통일하면 스1·2·4의 210~240 구간에 30마리가 들어가 사다리가 즉시 깨진다. 240초 시작은 사다리 밖이므로 **회귀 위험 0**이다.
2. **공백 84초를 60초로 줄이고, 그 60초를 "포탈 앞에서 갈지 말지 결정하는 시간"으로 남긴다.** 210~240은 원래 탈출 판단 구간이다. 여기에 압력을 더 얹으면 정상 클리어 난이도가 올라간다.
3. **240초 = "원래 끝났어야 할 시각"이라 서사적으로 정확하다.** 무한 구간 시작을 210(포탈 개방)에 두면 아직 탈출할 사람까지 벌하게 된다.
4. **변경점이 상수 1개.** 기존 tick 계산·클램프·풀·테스트를 전부 재사용한다. 스테이지 분기는 이미 `getOvertimeReinforcementStartSec`(`:305`)에 있으므로 구조 변경도 없다.
5. **B1(랭킹 300초 벽)과의 우연한 일치를 끊는다.** 현재는 무한 압력 시작과 랭킹 사망이 같은 초에 겹쳐 원인 진단이 어렵다.

**[추정]** 시작 시각 통일(전 스테이지 동일 값)은 **권고하지 않는다.** 스3 225는 2026-08-18 사용자 확정값이고(`Planner/stage3_overtime_225_seconds_2026-08-18.md`, **[실측-정적]**), 통일하려면 그 확정을 뒤집거나 나머지 셋의 240 이전 밸런스를 깨야 한다. 둘 다 이득보다 비용이 크다.

## D2'.3 판정 ③: 기존 곡선 대비 변경점 제안 (최소)

**[추정]** 전면 재설계는 하지 않는다. §D2'.1의 "난이도가 오르지 않는다" 문제를 고치는 **최소 변경점 2개**만 제안한다.

### 변경점 1 (필수) — 시작 시각

`Enemies.jsx:1039` `OVERTIME_REINFORCEMENT_START_SEC = 300` → `240`. 근거는 §D2'.2.

### 변경점 2 (권고) — 수가 아니라 **질**을 올린다

**[추정]** 150 상한이 구조적으로 마릿수 증가를 막으므로, 압력을 올릴 수 있는 축은 **개체 HP** 하나뿐이다. 기존 `stageHpOverride`가 이미 `statOverride`로 HP를 주입하는 배선이 있으므로(**[실측-정적]** `Enemies.jsx:1453`), 여기에 tick 스칼라 하나를 곱하는 것이 전부다.

```
endlessHpScale(tick) = 1 + 0.12 × tick        // 30초마다 +12%p (선형, 복리 아님)
적용 HP = round(ENEMY_STATS[type].hp × STAGE_HP_MULTIPLIER[stage] × endlessHpScale(tick))
```

체감 (**[추정]**, 240초 시작 기준):

| 경과 | tick | 배율 |
|---|---|---|
| 240초 | 0 | 1.00 |
| 5분 (390초) | 5 | 1.60 |
| 10분 (540초) | 10 | 2.20 |
| 20분 (840초) | 20 | 3.40 |
| 30분 (1140초) | 30 | 4.60 |

근거 셋:
1. **무기 레벨 상한이 5**이고 동시 보유 무기가 8개(**[실측-정적]** `upgrades.js:185-186` `MAX_OWNED_WEAPONS = 8`, `MAX_WEAPON_LEVEL = 5`)이므로 **플레이어 DPS에는 유한한 천장이 있다.** HP만 무한히 오르면 반드시 어느 시점에 처치율이 스폰율 아래로 떨어지고, 150 상한이 차고, 접촉 피해가 이긴다. **"못 치운다"로 수렴한다 — 요구사항과 정확히 일치.**
2. **선형이며 복리가 아니다.** 복리(×1.12^n)는 20틱에 9.6배로 절벽을 만든다. 선형은 완만해서 "서서히 못 버티게 된다"는 체감을 만든다.
3. **곡선 구조를 바꾸지 않는다.** 마릿수·간격·풀·클램프·스폰 위치가 전부 그대로다. `statOverride`에 스칼라 하나가 추가될 뿐이다.

### 변경하지 말 것 — 속도 스케일러

**[추정]** 속도 증가는 **넣지 말 것을 권고한다.** 마틸다 돌진 속도가 `player.speed × 2.8`로 고정돼 있는데(**[실측-정적]** `Enemies.jsx:1483`), 잡몹까지 빨라지면 회피 공간이 0이 되어 "서서히 밀린다"가 아니라 "갑자기 즉사한다"가 된다. 이건 자연스러운 종료가 아니라 절벽이다.

### 변경하지 말 것 — 150 상한

**[추정]** `MAX_ENEMIES = 150`은 `enemyEntityPool.js`의 `Uint8Array`/`Float32Array` 고정 크기 버퍼 전체의 기준이고(**[실측-정적]** `enemyEntityPool.js:68-75`), 모바일 성능 예산이기도 하다. 무한 모드를 위해 이걸 올리는 것은 스테이지 1 모바일 플레이어블 루프 안정성이라는 현재 최우선 과제와 정면 충돌한다. 건드리지 않는다.

---

# D3. 밸런스·안정성 리스크 판정

## D3.1 [P0] 무한 파밍 악용 — 골드가 런 도중에 영구 저장된다

### 실측

**[실측-정적]** `useGameStore.js:619-627`

```js
gainGold: (amount) => {
  if (!amount) return
  const { goldSession, goldTotal } = get()
  const nextTotal = goldTotal + amount
  saveGoldTotal(nextTotal)                                    // ← 즉시 영구 저장
  set({ goldSession: goldSession + amount, goldTotal: nextTotal })
  saveRuntimeProgress()                                       // ← 즉시 영구 저장
},
```

**[실측-정적]** `GoldCoin.jsx:157`이 픽업 시 `gainGold(value)`를 호출한다. **런이 게임오버로 끝나도 그때까지 먹은 골드는 이미 계정에 들어가 있다.**

**[실측-정적]** 골드 코인은 `GOLD_INTERVAL_MIN_MS = 20_000` ~ `GOLD_INTERVAL_MAX_MS = 28_000` 랜덤 간격으로 **무한히** 스폰된다(`Enemies.jsx:47-48,96-97,1669-1673`). 시간 상한이 없다.

**[실측-정적]** 처치 보너스 골드도 있다(`Enemies.jsx:1218`, `:1594` — `bonus.gold` 만큼 `dropGoldCoin`).

### 익스플로잇 체인 (추정)

**[추정]** §D2'.2 + §D2'.1을 합치면 다음 루프가 성립한다.

```
210초  마틸다 스폰 (HP = 그 시점 DPS × 1800, 이후 재계산 없음)
216초  신규 잡몹 스폰 정지
216~300초  방해 없이 마틸다를 원거리 무기로 처치
       → 유일한 사망 원인 소멸 (재스폰 없음)
이후   maxHealth 무한 업그레이드로 접촉 피해 무력화
       → 골드 코인 20~28초마다 무한 획득, 획득 즉시 계정 저장
       → 조작 없이 방치 가능
```

**[추정]** 마일스톤 골드는 240초에서 끝나므로(§1.5) 이 경로로는 늘지 않는다. 문제는 **코인 스폰과 처치 보너스 골드**다.

### 권고 (근거 포함)

**[추정]** **권고 A (필수, 최소): 240초 이후 획득 골드는 계정에 적립하지 않는다.**

구현: `Enemies.jsx`의 골드 코인 스케줄러(`:1669-1673`)를 240초에 정지시킨다. 또는 `gainGold`에서 `getRuntimeElapsedMs() > 240_000`이면 `goldSession`만 올리고 `saveGoldTotal`/`saveRuntimeProgress`를 건너뛴다.

근거 셋:
1. **경제 보호가 무한 모드의 재미보다 우선한다.** 코인샵 가격 체계 전체가 "한 런 = 최대 240초"를 전제로 설계됐다. 무한 골드는 이 전제를 즉시 무효화한다.
2. **무한 모드의 보상은 시간 기록이어야지 재화가 아니다.** 2번안은 "탈출을 포기하고 더 버틴다"는 도전이지 "파밍 모드"가 아니다. 재화 보상을 붙이는 순간 정상 클리어보다 파밍이 최적 전략이 되어 **게임의 주 루프가 죽는다.**
3. **되돌리기가 불가능하다.** 골드는 획득 즉시 Firebase에 저장되므로, 나중에 "무한 골드는 버그였다"고 판단해도 회수할 수 없다. 열기 전에 막아야 한다.

**[추정]** **권고 B (필수): 마틸다 처치를 무한 구간의 종료로 처리한다.**

마틸다가 죽는 순간 런을 종료(`clearStage` 또는 전용 `endlessComplete` 처리)한다. 근거: 마틸다는 무한 구간의 유일한 사망 원인이고, 이걸 제거한 뒤에도 게임이 계속되면 익스플로잇 루프가 열린다. "마틸다를 이겼다"는 것은 명백한 성취이므로 종료 + 보상이 자연스러운 처리다.

**[미검증]** 마틸다가 실제로 처치 가능한지는 확인하지 않았다. HP = DPS×1800이고 84초의 방해 없는 구간이 있으므로 **부분적으로만 깎을 수 있다**는 것이 산술적 예상이지만, 무한 구간에서 레벨업으로 DPS가 3~4배가 되면 남은 시간에 충분히 처치 가능하다는 것도 산술적으로 성립한다. **소크 테스트로 확인해야 한다(§D3.2 시나리오 S3).**

**[추정]** **권고 C (선택): XP 자체는 그대로 둔다.** XP는 런 안에서만 유효하고 계정에 남지 않는다(**[실측-정적]** `resetGame`에서 `player`가 재구축된다, `useGameStore.js:1035-1040`). 단 생존 시간이 **해금 평가에 들어간다**는 것은 별개 문제이며, §D1.3의 240초 클램프가 이걸 함께 막는다.

## D3.2 [P1] 성능·누수 리스크와 소크 테스트 시나리오

### 실측 — 이미 막혀 있는 것

**[실측-정적]** 다음은 무한 실행에서도 무한 증가하지 않는다.

| 항목 | 상한 | 근거 |
|---|---|---|
| 좀비 엔티티 | 150 (고정 TypedArray) | `enemyEntityPool.js:2,68-75` |
| 특수 적 | 3 | `Enemies.jsx:1044 MAX_SPECIAL_ENEMIES` |
| 런타임 큐 | 256 | `Enemies.jsx:1045 MAX_RUNTIME_QUEUE`, `pushBounded` `:1073` |
| 사망 붕괴 연출 | 12 | `Enemies.jsx:1212,1587` (`pushBounded(..., 12)`) |
| 적 투사체 | `MAX_ENEMY_PROJECTILES` | `enemyProjectilePool.js` |
| 이웃 탐색 | 3×3 셀, 최대 24명 | `enemySimulation.js:670-676` — O(N²) 악화 방지 |

**[추정]** 구조적으로 잘 막혀 있다. 30초에 30마리씩 무한 churn을 돌려도 풀 슬롯이 재사용되므로 **엔티티 누수는 설계상 발생하지 않는다.**

### 미검증 리스크

**[미검증]** 다음은 확인하지 않았다.

- **generation 랩어라운드.** `enemyEntityPool.js:47`이 핸들을 `generation * MAX_ENEMIES + index`로 인코딩하는데, `generation`이 `Uint16Array`(**[실측-정적]** `:69`)라 슬롯당 65,536회 재사용 후 랩어라운드한다. 랩어라운드 시 stale 핸들이 유효 핸들로 오인될 수 있다. **[추정]** 30초당 30마리 churn 기준 수 시간 규모에서 도달 가능하다. **진짜 버그 후보이며 S1 소크로 반드시 확인해야 한다.**
- `_uid`, `_textbookId`, `_coinId`, `_collapseId`, `_chestId`가 모듈 스코프 단조 증가 정수다(**[실측-정적]** `Enemies.jsx:1029-1034`). 오버플로 위험은 없으나 매 스폰마다 React key 문자열이 생성되므로 GC 압력이 된다. 실측 필요.
- 플레이어가 안 먹은 텍스트북/코인 오브젝트의 체류 시간과 누적 여부.
- 무한 구간에서 `saveRuntimeProgress()`가 코인마다 호출되므로(**[실측-정적]** `useGameStore.js:625`) Firebase 쓰기가 20~28초마다 무한 발생한다. Spark 무료 플랜 쿼터 리스크. §D3.1 권고 A를 적용하면 함께 해소된다.

### 소크 테스트 시나리오 (권고)

**[추정]** 다음 3종을 요구한다. 모두 실행 전이며, **이 세션에서는 하나도 돌리지 않았다.**

**S1 — 헤드리스 장시간 시뮬레이션 (필수)**
- 하네스: `src/lib/gameplaySoak.js`(**[실측-정적]** 존재 확인). 실제 정본 모듈로 프레임 루프를 돌리고 매 프레임 불변식을 검사한다.
- 시나리오: 스1·스4 각각 **1,800초(30분)** 고정스텝 실행, 오버타임 시작 240초 적용.
- 합격 기준: `pool.activeCount <= 150` 유지, `liveProxyCount === activeCount`, `events.dropped === 0`, `hitQueue.dropped === 0`(**[실측-정적]** 불변식 정의 `Enemies.jsx:1105`), 힙 증가율이 시간에 대해 선형이 아닐 것.
- 특히 확인: **generation 랩어라운드**가 30분 안에 발생하는지, 발생 시 잘못된 피격/사망이 나오는지.

**S2 — 브라우저 실플레이 소크 (필수)**
- gstack browse 헤드리스, 360×640 모바일 뷰포트.
- 스1에서 포탈 무시, 600초까지 진행. 60초 간격 스크린샷 + FPS + 콘솔.
- 합격 기준: 콘솔 에러 0, 240/270/300초에 오버타임 보강 관측, 30 FPS 이상 유지, HUD 타이머 정상 표시.

**S3 — 마틸다 처치 가능성 실측 (필수, §D3.1 권고 B의 전제)**
- 스1에서 210초에 마틸다 스폰 후, 포탈 무시하고 마틸다에게 지속 딜만 넣는다.
- 측정: 마틸다 스폰 시 HP 값, 600초 시점 잔여 HP, 처치까지 걸린 시간.
- 판정: 처치 가능하면 권고 B를 반드시 구현. 처치 불가능하면(HP가 DPS 성장보다 빠르게 커지는 구조는 아니므로 **[추정]** 가능성 낮음) 권고 B는 선택 사항으로 격하.

## D3.3 [P1] 기록 보드 분리 필요성 — **필요하다**

**[추정]** §D1.3에서 이미 결론냈다. 재정리하면:

| 키 | 무한 모드 영향 | 권고 |
|---|---|---|
| `stageXClears` | **없음.** `cleared`에서만 증가 | 무변경 |
| `bestSurvivalSeconds` / `stageXBestSurvivalSec` | **의미 붕괴.** 240초 기준 성취가 노이즈가 됨 | **240초 클램프** |
| `totalSurvivalSeconds` | 무한 증가 | **240초 클램프** (해금 평가 입력) |
| `stage1Survival180Runs` | 무한 런 1회로 조건 충족 — 의미는 유지 | 무변경 (180 < 240) |
| 랭킹 `score` / `timeMs` | **제출 불가** (300초 벽) | §D4-2 결정 필요 |
| **신규** `endlessBestSeconds_stageX` | — | **신설 권고** |

**[실측-정적]** `stageConfig.js:27-28,50-51,74-75,101-102`가 `clearRecordKey`/`bestRecordKey`를 스테이지 설정에 두고 있으므로, `endlessBestRecordKey`를 같은 자리에 추가하는 것이 기존 컨벤션에 맞다.

## D3.4 [P1] 레벨업 선택지 고갈 — 하드락은 아니지만 무의미해진다

### 실측

**[실측-정적]** `HUD.jsx:361-366`

```js
function pickThree(level, weapons, player) {
  const available = UPGRADES.filter((u) => isUpgradeAvailable(UPGRADE_EFFECTS[u.key], level, weapons, player))
  const limited = limitDuplicateWeaponUpgradeOptions(available)
  const shuffled = [...limited].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}
```

**[실측-정적]** `HUD.jsx:1288-1317`의 레벨업 오버레이는 `choices.map(...)`만 렌더한다. `choices`가 비면 **버튼이 0개인 모달이 뜨고**, `levelupChoicesReady`는 `onAnimationEnd`에 의존하는데(`:808` `if (index !== choices.length - 1) return`) 그 콜백이 영원히 안 온다. `phase`는 `'levelup'`에 고정되고 `Game.jsx:89`의 `phase === 'playing'` 게이트가 닫혀 게임이 멈춘다.

### 판정: 하드락은 발생하지 않는다

**[실측-정적]** `upgrades.js:180-181`

```js
moveSpeed:      { kind: 'player', stat: 'speed', capMultiplier: 1.8 },
maxHealth:      { kind: 'player' },
```

**[실측-정적]** `upgrades.js:207-213` — `kind === 'player'`이고 `stat !== 'speed'`이면 무조건 `return true`. 즉 **`maxHealth`는 영원히 선택 가능**하므로 `available`이 빌 수 없다.

**[추정]** **따라서 하드락은 없다. 대신 두 가지가 생긴다.**

1. **무기 8개 × 레벨 5 = 40회 픽 이후 선택지가 `maxHealth` 하나로 수렴한다.** `moveSpeed`도 1.8배에서 멈춘다. 매 레벨업이 "선택 없는 확인 클릭"이 된다.
2. **`maxHealth`가 무한 증가하므로 잡몹이 플레이어를 죽일 수 없게 된다** (§D2'.1 결론의 근거).

**[추정]** 도달 시점 산술: XP 임계값은 `t(n) = 25.67 × 1.12^(n-1) - 16.67` (`xpCurve.js`의 `t(n+1) = ceil(1.12·t(n) + 2)`, 시작 9에서 유도 — **[실측-정적]** `xpCurve.js:23-32`). 레벨 45까지 누적 XP ≈ **30,400**. 오버타임만으로 초당 17.2 XP(§D2'.1)면 **약 29분**. 실제로는 240초 이전 XP가 더해지므로 더 빠르다.

### 권고

**[추정]** **선택지 고갈 자체는 고치지 않는다** — 30분 후의 문제이고, §D2'.3 변경점 2(HP 스케일러)를 적용하면 그 전에 런이 끝난다. 다만 `maxHealth`가 무한이라는 점은 HP 스케일러 설계의 전제이므로 **기록해 둔다.** 만약 HP 스케일러를 채택하지 않고 대신 `maxHealth`에 캡을 거는 방향으로 간다면, 그때는 `choices`가 빌 수 있으므로 **`pickThree`의 빈 배열 가드가 필수**가 된다.

## D3.5 [P2] 스폰 위치 규칙 — 마틸다 "방패" 문제 재판정

### 브리프의 전제를 실측으로 정정한다

브리프는 "플레이어와 마틸다 사이에 스폰된 좀비는 방패가 되어 공짜 XP가 된다"고 했다. **[실측-정적]** 확인 결과 **물리적 방패는 성립하지 않는다.**

근거 셋:
1. **[실측-정적]** `Enemies.jsx:1053-1057` `isPooledEnemyType`은 보스 타입을 명시적으로 제외한다. 마틸다는 `type: 'B01'`로 스폰되므로(`Enemies.jsx:1494`) **풀링 시뮬레이션이 아니라 `Enemy.jsx` 특수 적 경로**를 탄다.
2. **[실측-정적]** 좀비 사이의 유일한 상호작용인 소프트 분리(`enemySimulation.js:668-700`)는 **풀 내부 인덱스끼리만** 돈다. 마틸다는 풀에 없으므로 이 코드가 그를 밀어내지 않는다.
3. **[실측-정적]** 풀링 좀비는 rapier 바디를 갖지 않는다(`ZombieInstanceLayer.jsx`에 `RigidBody`/`Collider` 0건). `enemyBodies`에는 `Enemy.jsx`와 `DancingDogeEvent.jsx`만 등록한다.

**[추정]** 결론: **마틸다는 좀비 무리를 그대로 통과한다. 좀비는 마틸다를 1cm도 늦추지 못한다.** 브리프가 걱정한 "방패 → 공짜 XP" 시나리오는 현 구현에서 발생하지 않는다.

### 그럼에도 스폰 위치는 문제다 — 다른 이유로

**[실측-정적]** `Enemies.jsx:255-274`

```js
function spawnPosOnValidRing(type, bounds, minRadius, maxRadius, taken, random, obstacles, scaleOverride) {
  ...
  const offset = randomPointOnSpawnRing(minRadius, maxRadius, random)
  const pos = [playerPos.x + offset.x, y, playerPos.z + offset.z]
  ...
}
export function randomSpawnPos(type, ...) {
  return spawnPosOnValidRing(type, bounds, SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS, ...)   // 4.0 ~ 6.5
}
```

**[실측-정적]** `Enemies.jsx:128-131` — `SPAWN_MIN_RADIUS = 4.0`, `SPAWN_MAX_RADIUS = 6.5`, E04는 `5.5 ~ 7.5`.

**[실측-정적]** 이 함수는 **마틸다 위치를 전혀 참조하지 않는다.** 플레이어 중심 균등 360° 링이다.

**[추정]** 무한 구간에서 이것이 만드는 실제 문제는 세 가지다.

1. **시야 차폐.** 마틸다는 `scale: 2.0`(**[실측-정적]** `Enemy.jsx:311`)이라 완전히 가려지지는 않지만, 150마리가 화면을 채우면 **어느 방향에서 오는지 읽기 어려워진다.** 즉사기의 접근을 못 읽는 것은 "어려움"이 아니라 "불공정"이다.
2. **탈출 경로 노이즈.** 좀비가 물리적으로 막지는 않지만 접촉 피해가 있으므로 플레이어는 무리를 피해 움직인다. 이때 마틸다가 오는 쪽으로 몰릴 수 있다.
3. **마틸다 반대편 스폰이 안전지대를 만든다.** 균등 링이므로 30마리 중 절반은 마틸다 반대편에 떨어진다. 플레이어는 그쪽으로 도망치면서 그 좀비들을 정리 — **압력이 아니라 XP 공급원**이 된다.

### 권고 — 스폰 위치 규칙 (근거 포함)

**[추정]** 무한 구간(240초 이후)에서만 적용하는 각도 편향을 권고한다. 240초 이전은 무변경.

```
마틸다가 살아 있으면:
  θ_matilda = atan2(matilda.z - player.z, matilda.x - player.x)
  스폰 각도 θ를 뽑되, |angleDiff(θ, θ_matilda)| < 45° 인 후보는 재추첨 (최대 8회)
  → 마틸다 진행 축의 ±45° 부채꼴을 비운다
반경은 기존 4.0~6.5 유지.
```

근거 셋:
1. **시야를 보장한다.** 마틸다가 오는 축이 비어 있으면 플레이어가 즉사기를 항상 볼 수 있다. 즉사 메카닉의 최소 공정성 요건이다.
2. **좀비의 역할을 "발 묶기"로 되돌린다.** 마틸다 축이 비고 나머지 315°가 채워지면, 플레이어가 도망칠 수 있는 방향이 **마틸다 쪽뿐**이 된다. 물리적 차단 없이 순수 위협 압력만으로 브리프가 원한 "발을 묶어 마틸다에게 잡히게 하기"를 달성한다.
3. **기존 함수 재사용.** `spawnPosOnValidRing`은 이미 `SPAWN_CANDIDATE_TRIES` 재추첨 루프를 돈다(`:259`). 각도 조건 하나를 `isValidSpawnPosition` 옆에 추가하면 되고, 실패 시 fallback 경로도 이미 있다(`:266-269`).

**[추정]** 반대로 **반경은 절대 줄이지 말 것.** 4.0 미만으로 내리면 플레이어 발밑 스폰이 되어 회피 불가 피해가 된다.

## D3.6 [P2] 스테이지별 곡선 분리 필요성 — **불필요. 공통 곡선 + 기존 배율로 충분하다**

**[추정]** 판정: **공통 곡선 + `STAGE_HP_MULTIPLIER` 재사용으로 충분하다.**

근거 넷:
1. **[실측-정적]** `STAGE_HP_MULTIPLIER = { stage2: 1.2, stage3: 1.44, stage4: 1.728 }`(`Enemies.jsx:772`)가 이미 오버타임 스폰의 `stageHpOverride`에 적용되고 있다(`Enemies.jsx:1453`). 스테이지 차등이 **이미 걸려 있다.**
2. **[추정]** §D2'.1 표대로 정상상태 필요 DPS가 스1 82 → 스4 130으로 자동 차등화된다. 추가 분기 없이 난이도 사다리가 유지된다.
3. **[실측-정적]** 타입 풀 차등(스1만 E04 제외)도 이미 있다(`Enemies.jsx:1042-1043`).
4. **[추정]** 스테이지별 곡선을 따로 만들면 상수가 4배로 늘고, 정상 클리어 밸런스와 무한 구간 밸런스가 서로 얽혀 회귀 추적이 불가능해진다. 현재 최우선 과제(스테이지 1 모바일 루프 안정성)와 정면으로 어긋난다.

**[추정]** 예외 하나: 시작 시각만은 스테이지별로 다르게 유지한다(스3 225 / 나머지 240). 이건 사용자 확정값 존중이며 `getOvertimeReinforcementStartSec`(**[실측-정적]** `:305`)에 이미 분기 구조가 있다.

---

# D4. 미결 쟁점 — 선택지와 권고

각 항목에 내 권고와 근거를 붙였다. 결정 전에는 구현에 착수하지 않는 것을 권고한다.

## D4-1. 무한 구간의 골드 획득

| 안 | 내용 | 결과 |
|---|---|---|
| A | 240초 이후 골드 코인 스폰 정지 | 파밍 원천 차단, 구현 최소 |
| B | 골드는 계속 나오되 계정 적립 없이 `goldSession`만 | 화면 연출 유지, 코드 분기 1곳 |
| C | 현행 유지 (무한 적립) | 경제 붕괴 |

**권고: A.**
**근거:** (1) 코인샵 가격 체계 전체가 "한 런 ≤ 240초"를 전제로 설계됐고, 무한 골드는 이 전제를 즉시 무효화한다. (2) 골드는 획득 즉시 Firebase에 저장되므로(**[실측-정적]** `useGameStore.js:619-627`) 사후 회수가 불가능하다 — 열기 전에 막아야 한다. (3) B안은 코인이 보이는데 안 쌓이는 상태라 플레이어가 버그로 오해한다. (4) A안은 스케줄러 조건 1줄이라 가장 싸다.

## D4-2. 랭킹 `timeMs <= 300000` 상한 처리

| 안 | 내용 | 비용 | 리스크 |
|---|---|---|---|
| A | 상한 유지. 무한 런은 `timeMs`를 240,000으로 클램프해 제출 | 클라 1곳 | 무한 기록이 랭킹에 안 남음 |
| B | 상한을 크게 올림 (예: 3,600,000) | rules + 클라 + functions **3곳** | 안티치트 상한이 60배 느슨해짐 |
| C | 무한 모드 전용 랭킹 노드 신설 | rules + 클라 + UI **대규모** | 범위 폭증 |
| D | 현행 유지 | 0 | **300초 초과 시 침묵 실패 — 사용자에게 원인 불명 버그로 보임** |

**권고: A (즉시) + C (별도 과제로 분리).**
**근거:** (1) D안은 절대 안 된다 — `.catch(() => {})`(**[실측-정적]** `useGameStore.js:615`)가 실패를 삼켜 원인 불명의 "기록이 안 올라감" 버그가 된다. (2) B안은 안티치트 상한을 60배 넓히는 것이라, 클라 직접쓰기 모델(Spark 무료, Cloud Function 미배포)에서 **점수 조작에 대한 유일한 방어선을 스스로 무너뜨린다** — 점수 상한이 `timeMs`에 종속돼 있기 때문이다. (3) A안은 §D1.3의 240초 클램프와 동일한 값이라 정합적이고, 변경이 클라 1곳이다. (4) 무한 생존 시간을 정말 겨루게 하려면 C가 맞지만, 그건 랭킹 UI·규칙·시즌 처리까지 건드리는 별도 과제다. 지금 최우선인 스테이지 1 모바일 루프 안정성과 경쟁시키면 안 된다.
**주의:** 어떤 안이든 `rankingScorePolicy.js:5-12`(**[실측-정적]**)가 명시한 **3중 동기화**(`database.rules.json` / 클라 / 미배포 `functions/src/ranking.js`)를 지켜야 한다. backendmini 필수 참여.

## D4-3. 오버타임 시작 시각

| 안 | 스1·2·4 | 스3 | 240초 이전 밸런스 영향 |
|---|---|---|---|
| A | **240** | 225 (유지) | **없음** |
| B | 225 (통일) | 225 | 스1·2·4 210~240에 30마리 추가 — **총 HP 사다리 파괴** |
| C | 300 (현행) | 225 | 없음. 대신 84초 공백 존치 |

**권고: A.**
**근거:** (1) 240 이전을 건드리지 않으므로 총 HP 사다리(3,710/4,823/6,270/8,151)에 회귀 위험이 0이다. (2) 240초는 "원래 끝났어야 할 시각"이라 무한 구간의 시작으로 의미가 정확하다. (3) 공백을 84초 → 60초로 줄이면서, 남은 60초는 원래 목적인 "탈출 판단 시간"으로 보존된다. (4) 변경점이 상수 1개(`Enemies.jsx:1039`)이고 스테이지 분기 구조는 이미 존재한다. (5) B안은 사용자 확정값(스3 225)을 나머지에 확대 적용하는 것이지만, 스3만 그 부담을 지도록 확정된 값이므로 확대 해석은 월권이다.

## D4-4. 무한 구간 난이도 상승 방식

| 안 | 내용 | "못 치운다"로 수렴? |
|---|---|---|
| A | 현행 유지 (30마리/30초 고정) | **아니오 — 영구 교착** |
| B | HP 선형 스케일러 `1 + 0.12n` | 예 |
| C | HP + 속도 동시 스케일 | 예, 그러나 절벽 |
| D | 150 상한 인상 | 예, 그러나 성능 예산 위반 |

**권고: B.**
**근거:** (1) A안은 §D2'.1 산술대로 난이도가 시간에 따라 **하락**한다 — 요구사항 위반. (2) 무기 레벨 상한 5 × 8슬롯(**[실측-정적]** `upgrades.js:185-186`)이라 플레이어 DPS에 유한한 천장이 있으므로, HP만 올려도 반드시 처치율이 스폰율 아래로 떨어진다. (3) C안의 속도 증가는 마틸다 돌진(`player.speed × 2.8`, **[실측-정적]** `Enemies.jsx:1483`)과 겹쳐 회피 공간을 0으로 만든다 — "자연스러운 종료"가 아니라 "예고 없는 즉사"다. (4) D안은 `MAX_ENEMIES`가 TypedArray 고정 크기의 기준이고(**[실측-정적]** `enemyEntityPool.js:68-75`) 모바일 성능 예산이므로 현재 최우선 과제와 충돌한다.
**계수 0.12는 [추정]이다.** S1 소크 테스트 결과로 재조정해야 한다.

## D4-5. 마틸다 처치 시 처리

| 안 | 내용 |
|---|---|
| A | 마틸다 처치 = 무한 구간 종료(특별 클리어) + 보상 |
| B | 마틸다 처치 후에도 계속 (현행) |
| C | 마틸다 처치 불가로 만듦 (HP 무한 재계산) |

**권고: A.**
**근거:** (1) B안은 §D3.1의 AFK 파밍 루프를 그대로 연다 — 유일한 사망 원인이 사라지고 재스폰이 없다(**[실측-정적]** `useGameStore.js:989`, `Enemies.jsx:1402-1414`). (2) C안은 "노력이 보상받지 않는다"는 최악의 피드백이며, `matildaSpec.test.js`가 잠근 HP 산식(`DPS × 1800`, **[실측-정적]**)을 뒤집어야 한다. (3) A안은 "즉사 보스를 이겼다"는 명확한 성취를 종료 조건으로 승격시켜, 무한 모드에 **도달 가능한 목표**를 준다. 무한 모드가 "언제 끝날지 모르는 것"이 아니라 "두 가지 결말 중 하나"가 된다.
**전제:** 소크 시나리오 S3(§D3.2)로 처치 가능성을 먼저 실측해야 한다.

## D4-6. 무한 생존 기록 키

| 안 | 내용 |
|---|---|
| A | `bestSurvivalSeconds`를 240으로 클램프 + `endlessBestSeconds_stageX` 신설 |
| B | 기존 키에 그대로 기록 |
| C | 무한 기록을 아예 저장 안 함 |

**권고: A.**
**근거:** (1) B안은 `evaluateUnlocks`가 `runSurvivalSeconds`를 입력으로 받으므로(**[실측-정적]** `useGameStore.js:531,558`) 무한런 1회로 무기 해금 커브가 전부 뚫린다. (2) B안은 기존 플레이어의 240초 기반 최고기록을 영구히 무의미하게 만든다. (3) C안은 무한 모드에 아무 보상이 없어 플레이 동기가 0이 된다 — §D4-1에서 골드를 막았으므로 **기록만이 유일한 보상**이다. (4) A안은 `stageConfig`의 기존 `bestRecordKey` 컨벤션(**[실측-정적]** `stageConfig.js:28,51,75,102`)에 `endlessBestRecordKey`를 추가하는 형태라 구조가 그대로다.

---

# 구현 위임용 작업 분해

**모든 항목은 D4 결정 이후 착수한다.** 순서와 의존관계를 지킬 것.

## Phase 0 — 검증 (구현 착수 전 필수, 차단 조건)

| # | 작업 | 파일 | 담당 | 의존 |
|---|---|---|---|---|
| 0-1 | 실플레이 600초 지속 확인 (D1-a). 스1 포탈 무시, 240/300/360/600초 스크린샷 + 콘솔 | 없음 (검증) | **balanceqa** | 없음 |
| 0-2 | 소크 S3 — 마틸다 처치 가능성 실측 | 없음 (검증) | **balanceqa** | 0-1 |

**0-1이 실패하면(240초에 뭔가로 끝나면) 이 설계 전체를 재작성해야 한다.** 반드시 먼저 한다.

## Phase 1 — 회귀 방어선

| # | 작업 | 파일 | 담당 | 의존 |
|---|---|---|---|---|
| 1-1 | 무한 지속 회귀 테스트 신설: 600초까지 `phase !== 'cleared'`, 포탈 흡입만이 클리어 | `src/components/Game.endlessMode.test.jsx` (신규) | **balanceqa** | 0-1 |

**Phase 1을 Phase 2보다 먼저 한다.** 이후 모든 변경이 이 테스트를 깨지 않는지로 검증된다.

## Phase 2 — 익스플로잇 차단 (P0)

| # | 작업 | 파일 | 담당 | 의존 |
|---|---|---|---|---|
| 2-1 | 240초 이후 골드 코인 스폰 정지 (D4-1 A안) | `src/components/Enemies.jsx` (골드 스케줄러 `:1669-1673`) | **levelmini** | D4-1 결정 |
| 2-2 | 랭킹 제출 `timeMs` 240,000 클램프 (D4-2 A안) | `src/store/useGameStore.js:605-615` | **backendmini** | D4-2 결정 |
| 2-3 | 기록 키 분리 — `bestRecordKey` 240 클램프 + `endlessBestRecordKey` 신설 (D4-6 A안) | `src/lib/stageConfig.js`, `src/store/useGameStore.js:585-588` | **backendmini** | D4-6 결정 |
| 2-4 | 마틸다 처치 시 무한 구간 종료 (D4-5 A안) | `src/store/useGameStore.js` (`recordBossDefeat` 인근 `:993-1005`), `src/components/Enemy.jsx` | **levelmini** | 0-2, D4-5 결정 |

**2-2와 2-3은 같은 함수(`_onRunEnd`)를 건드린다. 같은 담당에게 묶어 보내거나 순차 처리할 것.** 공유 워크트리이므로 동시 편집 금지.

## Phase 3 — 곡선 조정 (P1, 순차)

| # | 작업 | 파일 | 담당 | 의존 |
|---|---|---|---|---|
| 3-1 | `OVERTIME_REINFORCEMENT_START_SEC` 300 → 240 (D4-3 A안) | `src/components/Enemies.jsx:1039` | **levelmini** | D4-3 결정, Phase 2 |
| 3-2 | 3-1의 기존 테스트 갱신 — `starts Stage 3 exactly at 225s while other stages stay at 300s` 이름·기대값 수정 | `src/components/Enemies.test.jsx` | **levelmini** | 3-1 |
| 3-3 | 무한 구간 HP 스케일러 `1 + 0.12n` (D4-4 B안) | `src/components/Enemies.jsx` (`stageHpOverride` 호출부 `:1453`) | **levelmini** | 3-1, D4-4 결정 |
| 3-4 | 3-3 계수 검증 소크 (S1) 후 계수 재조정 | 없음 (검증) → 필요 시 3-3 | **balanceqa** | 3-3 |

**3-2는 3-1과 반드시 같은 커밋이어야 한다.** 3-1만 하면 **[실측-테스트]** 로 통과를 확인한 5건 중 1건이 즉시 실패한다.

## Phase 4 — 스폰 위치·UX (P2)

| # | 작업 | 파일 | 담당 | 의존 |
|---|---|---|---|---|
| 4-1 | 무한 구간 마틸다 축 ±45° 스폰 배제 (D3.5) | `src/components/Enemies.jsx:255-274` | **levelmini** | Phase 3 |
| 4-2 | HUD 무한 구간 배지 (D1-d) | `src/components/HUD.jsx` | **uimini** | Phase 3 |
| 4-3 | 타이머 3자리 분 레이아웃 확인 (`HUD.jsx:1914`) | `src/components/HUD.jsx` | **uimini** | 4-2 |
| 4-4 | 무한 구간 진입/마틸다 처치 사운드 확인 | — | **soundmini** | 4-2, 2-4 |

**사운드·보이스 관련 변경이 발생하면 완료 전 soundmini 참여가 필수다** (프로젝트 라우팅 규칙).

## Phase 5 — 최종 검증

| # | 작업 | 담당 | 의존 |
|---|---|---|---|
| 5-1 | 소크 S1 (헤드리스 1,800초 × 스1·스4) — generation 랩어라운드 포함 | **balanceqa** | Phase 4 |
| 5-2 | 소크 S2 (브라우저 600초, 360×640) | **balanceqa** | Phase 4 |
| 5-3 | 전체 회귀: `npx vitest run --maxWorkers=1 --no-file-parallelism` | **balanceqa** | 5-1, 5-2 |
| 5-4 | acceptance 판정 및 `Quaility_Assurance/` 기록 생성 | **balanceqa** | 5-3 |

---

# 검증 기록 — 이 세션에서 실제로 한 것과 안 한 것

## 실제로 실행한 것

```
npx vitest run --maxWorkers=1 --no-file-parallelism src/components/Enemies.test.jsx -t "overtime"
→ Test Files 1 passed (1)
→ Tests 5 passed | 88 skipped (93)
→ Duration 1.92s
```

verbose 재실행으로 통과 테스트 5건의 이름을 확인했다(§D2'.0에 전량 기재).

## 실제로 읽은 파일 (정적 근거의 출처)

`src/components/Game.jsx`(전체), `src/components/EscapePortal.jsx`(전체), `src/components/Enemies.jsx`(부분: 47-131, 255-345, 1020-1060, 1100-1140, 1400-1500, 1640-1700 + grep), `src/components/Enemy.jsx`(부분: 282-340 + grep), `src/components/HUD.jsx`(부분: 355-400, 795-830, 1175-1195, 1285-1330 + grep), `src/store/useGameStore.js`(부분: 330-341, 500-640, 980-1070 + grep), `src/lib/stageConfig.js`(전체), `src/lib/burstEvents.js`(1-45 + grep), `src/lib/xpCurve.js`(전체), `src/lib/upgrades.js`(부분: 177-215), `src/lib/rankingScorePolicy.js`(전체), `src/lib/enemySimulation.js`(부분: 660-700 + grep), `src/lib/enemyEntityPool.js`(grep), `src/lib/gameplaySoak.js`(1-60), `database.rules.json`(grep), `Planner/stage3_overtime_225_seconds_2026-08-18.md`(전체), `Planner/all_stages_overtime_mixed_30_max_150_2026-08-09.md`(전체), `AGENTS.md`(1-120).

## 실행하지 않은 것 — 결론에 사용하지 않았다

- 브라우저 실플레이. **240초 초과 지속을 눈으로 확인하지 않았다.** §0.1의 결론은 전량 정적 추적이다.
- 전체 vitest 스위트.
- 소크 테스트 S1/S2/S3 — 전부 미실행이며 §D3.2는 실행 계획이다.
- `matildaSpec.test.js`, `stageConfig.test.js`, `burstEvents.test.js` — 읽기만 했고 실행하지 않았다.
- 프로파일링·메모리 측정. §D3.2의 누수 판정은 코드 구조 기반 추정이다.
- generation 랩어라운드 실증. 가능성만 산술로 제기했다.

## 편집한 파일

이 문서 하나. `src/` 아래 어떤 파일도 편집하지 않았다. `burstEvents.js`, `burstEvents.test.js`, `waveTimelines.js`는 읽기만 했다.
