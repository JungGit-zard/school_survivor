# 스폰 캐치업(0ea6e6b) 검증 — balanceqa 2026-08-22

검증 대상: `0ea6e6b` "feat: cap the empty-arena gap at 2 seconds by pulling the spawn schedule forward"
작업 트리: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype` (공유 워크트리, 코드 미수정·미커밋)

## 검증 방법과 그 한계 (먼저 읽어라)

**실측**과 **모델**을 구분한다.

- **실측(테스트 실행)**: `npx vitest run src/lib/burstEvents.test.js --maxWorkers=1 --no-file-parallelism` → 1 file / **58 tests 전부 통과**.
- **모델(시뮬레이션)**: 임시 하네스 `src/lib/__qa_spawnCatchUpSim.test.js`를 만들어 프레임 루프를 재현했다.
  **정본 함수를 그대로 import**해서 돌렸다 — `nextPendingSpawnSec`, `advanceSpawnCatchUp`,
  `shouldScheduleOvertimeReinforcement`, `overtimeReinforcementCountForTick`, `clampZombieSpawnRequest`,
  `shouldSpawnDoge`, `getRuntimeBurstEventsForStage`. 재구현한 건 플레이어 킬 속도와 RAF 순서뿐이다.
  검증 후 파일은 삭제했다(작업 트리에 남기지 않았다).
- 모델의 이상화: (a) 한 배치의 좀비가 `killSec` 뒤 **동시에** 죽는다, (b) spawnDrain은 3마리/프레임,
  (c) 스케줄 enqueue는 다음 프레임까지 `scheduleCount`에 남는다(RAF 순서 최악 가정), (d) 60fps 고정.
- **브라우저 실플레이 검수는 하지 않았다.** 구글 로그인이 게임 시작 필수 조건이라 헤드리스로 런을 못 띄운다.
  아래 어떤 항목도 실기기·실브라우저에서 확인한 게 아니다.
- 밸런스 비교는 전부 **통제 A/B**로만 했다(같은 하네스에서 `disableCatchUp` 플래그만 토글).
  `stageBalanceProbe` 단발 실행은 비결정적이라 근거로 쓰지 않았다.

---

## 1. 스폰 유실 (MAX_ENEMIES = 150) — **관찰 (조건부 PASS)**

### 핵심 구조

캐치업은 **아레나가 빈 프레임에만** 점프한다. 점프 직후 `clampZombieSpawnRequest`가 보는
`counts`는 `{pooledActive:0, specialActive:0, pooledQueued:0}`이다. 그래서 **캐치업이 직접 유발한
스폰은 요청량이 150을 넘지 않는 한 절대 깎이지 않는다.** 점프 폭도 `nextPendingSpawnSec`이
"다음 후보 1개"까지만 잡으므로 여러 앵커가 한 프레임에 몰려 터지는 일도 없다.

### 통제 A/B (stage1 / stage4, killSec 0.5, 240초 런)

| 시나리오 | 캐치업 ON clampLoss | OFF clampLoss | ON maxConcurrent | OFF maxConcurrent |
|---|---|---|---|---|
| 끝까지 잘 잡음 | **0** | 0 | 99 | 14 |
| 20초 뒤 손놓음 | **31** | 0 | 150 | 83 |
| 40초 뒤 손놓음 | **75** | 0 | 150 | 74 |
| 90초 뒤 손놓음 | **99** | 0 | 150 | 49 |

### 유실이 나는 유일한 경로

전부 **오버타임 보강 웨이브**다. 버스트 표 이벤트와 보스는 **한 번도 깎이지 않았다**
(모든 stall 시나리오에서 `bossClamped: null`).

- stage1 / stall@20s 최초 유실: 실시간 207.7s, `overtime#3`, 요청 30 → 승인 29, 생존 121 (**-1**)
- stage1 / stall@90s 최악: 실시간 181.8s, `overtime#24`, 요청 51 → 승인 3, 생존 147 (**-48**)
- stage4 / stall@20s: 실시간 237.6s, `overtime#4`, 요청 30 → 승인 **0**, 생존 150 (**-30, 웨이브 통째로 소멸**)
- 240초 런 기준 총 유실 상한: **99마리**

### 장기 런(1,200초, 스테이지 종료 조건 없음)

`durationSec 240`은 런타임 종료 조건이 아니다(`grep durationSec` 결과 stageConfig / stageMultiHzParity /
audioDiagnostics 외 소비자 없음). 즉 탈출하지 않으면 무한히 이어진다.

- 오버타임 escalation은 상한이 없어 `overtime#125`에서 요청 153 > 150이 되고, **아레나가 완전히
  비어 있어도(live 0)** 3마리가 깎이기 시작한다. 최초 도달: killSec 0 → 실시간 341s, 0.5 → 408s, 2 → 616s.
- 1,200초 누적 유실: 46,665 / 28,920 / 7,626마리. tick 428에서는 요청 456 → 승인 150(**-306**).

### 판정

**블로커 아님.** 유실분은 전부 "동시에 존재할 수 없었던 좀비"다 — 150 동시성 천장이 제 일을 한 것이고,
캐치업이 밸런스 표를 갉아먹은 게 아니다. 다만 다음 두 가지는 사실로 기록한다.

1. 캐치업 OFF에서는 유실이 **0**이었다. 유실 자체는 이번 변경이 처음 만든 현상이다
   (변경 전 오버타임 tick 0의 실시간 발화 시각은 240s = 사실상 런 밖).
2. 오버타임 escalation 곡선은 tick 125 이후 **장식**이 된다. 150에서 포화한다.
   무한모드 난이도를 tick으로 계속 올릴 생각이면 이 포화점을 알고 있어야 한다.

---

## 2. 총 HP 예산 불변 — **PASS**

### 정적 확인 (실측)

`0ea6e6b`의 변경 파일 5개에 `burstEvents.js`는 없다(`git show 0ea6e6b --stat`).
`burstEvents.test.js` 58/58 통과 — 여기에 `expect(totals).toEqual([3710, 4838, 6271, 8169])`가 들어 있다.

### 런타임 전달량 확인 (모델)

정적 표가 안 변한 것과 "런타임이 실제로 그만큼 스폰하는가"는 다른 문제다. 하네스로
버스트 표 유래 스폰만(오버타임 제외) HP를 적산했다. 세 가지 킬 속도 = 캐치업 강도 3단계다:

| stage | killSec 0 (캐치업 최대) | killSec 2 | killSec ∞ (캐치업 미발화) | 정본 |
|---|---|---|---|---|
| stage1 | 3,710 | 3,710 | 3,710 | 3,710 |
| stage2 | 4,838 | 4,838 | 4,838 | 4,838 |
| stage3 | 6,271 | 6,271 | 6,271 | 6,271 |
| stage4 | 8,169 | 8,169 | 8,169 | 8,169 |

**완전 일치.** 반복 버스트(스3 25초 보강)도 유실되지 않는다 — `nextPendingSpawnSec`이 반복 tick을
후보에 넣으므로 점프가 tick을 건너뛰지 않고, 설령 건너뛰어도 `SCHEDULE_BURST` 핸들러가
`firstTick..lastTick`을 전부 백필한다(`Enemies.jsx:1546-1562`).

오버타임은 지시대로 총량 계산에서 제외했다.

---

## 3. 보스 조기 등장의 2차 효과 — **FAIL (P1, 판단 필요)**

### 3-1. "보스 살아있는데 압박 꺼짐 / 보스 없는데 압박 켜짐"

`context.bossPressure`가 읽는 유일한 곳은 `enemySimulation.js:301` `isE04FireAllowed`의
`&& !context.bossPressure` 하나뿐이다(`Enemy.jsx:1299`의 같은 계산은 E04가 항상 pooled 경로라
도달하지 않는 죽은 분기다 — 다만 여전히 **실시간 `elapsedSec` 기준**이라 두 계산이 어긋나 있다).

- **보스 없이 압박 ON**: 이미 있던 형태지만 창이 3배 넓어졌다. 하한만 `spawnSec`, 상한은 실시간 210이다.
- **보스 살아있는데 압박 OFF**: 실시간 210 이후. 변경 전과 같은 형태다.
- **stage4**: `currentStageId !== 'stage4'` 로 면제 — 영향 없음. **PASS**.

### 3-2. 진짜 문제 — stage2 / stage3의 E04가 런 내내 발사 불가가 된다

두 게이트가 **서로 다른 시계**를 쓰게 되면서 겹쳐 막힌다.

- 발사 하한: `context.elapsedSec >= introSec` — `context.elapsedSec = sec` (**실시간**), stage2/3 introSec = **72**
- 발사 금지: `bossPressure` — 하한이 `spawnSec >= 150` (**스폰 시계**)

모델 결과(killSec 0.5):

| stage | 보스 실시간 등장 | bossPressure 창(실시간) | E04 발사 가능 창 |
|---|---|---|---|
| stage2 (ON) | 24.2s | [24.2, 210) | **없음** (72~210 전부 압박) |
| stage2 (OFF, 통제) | 150s | [150, 210) | 72~150 = 78초 |
| stage3 (ON) | 35.2s | [35.2, 210) | **없음** |
| stage3 (OFF, 통제) | 150s | [150, 210) | 78초 |

즉 빠르게 미는 플레이에서 **스테이지2·3의 원거리 좀비 E04는 한 발도 쏘지 못한다.**
E04는 `preferDist 5.5`에서 스트레이핑만 하고 접근하지 않으므로(`minDist 3.5`) 발사를 잃으면
위협도가 0이 된다 — HP 표에는 그대로 남아 있는데 실제로는 무해한 과녁이 된다.
`burstEvents.js:197`의 "E04는 등장마다 정확히 4마리 = 포화점" 튜닝 근거가 통째로 무효화된다.

이건 승인 사항 1번(보스 조기 등장)이 **의도한 결과가 아니라 그로부터 파생된 부작용**이라 결함으로 올린다.

**stage4 부작용(경미)**: 압박은 면제지만 introSec 18은 실시간이다. E04 스폰(표 24/144/168)은
캐치업으로 실시간 5~22초에 몰리는데 발사는 실시간 18초부터라, "보스 구간 원거리 벽"이라는
시그니처가 첫 25초 안으로 압축된다.

### 판정 근거가 되는 코드 경로

```
Enemies.jsx:1736  context.elapsedSec = sec                      // 실시간
Enemies.jsx:1737  context.e04IntroSec = getE04IntroSec(...)     // 72 (stage1/2/3), 18 (stage4)
Enemies.jsx:1740  context.bossPressure = ... spawnSec >= bossSpawnSec && sec < 210
enemySimulation.js:301  && !context.bossPressure
```

---

## 4. HUD 보스 경고 — **FAIL (P2)**

`HUD.jsx:933` `const warningSec = tableWarningSec - getSpawnCatchUpOffsetSec()`.
오프셋은 **불연속으로** 뛴다. 점프 한 번이 보스 시각을 넘어서면 그 프레임에 `warningSec <= elapsedSec`이
되어 `elapsedSec >= warningSec` 가지에 걸려 `null`을 반환하고, 같은 프레임에 보스가 스폰된다.

모델 측정 (stage1, HUD 조건식을 프레임마다 그대로 재현):

| killSec | 보스 실시간 등장 | 보스 직전 마지막 점프 | 경고 노출 시간 |
|---|---|---|---|
| 0 | 20.38s | 20.38s (jump 3.97) | **0초** |
| 0.5 | 24.20s | 24.20s (jump 3.50) | **0.02초** |
| 2 | 36.20s | 36.20s (jump 2.00) | **1.00초** |
| 5 | 59.22s | 53.22s (jump 17.0) | 3.00초 (정상) |

경고가 3초 온전히 나오는 건 "보스 앵커 직전 3초 동안 점프가 없었을 때"뿐이다.
그런데 캐치업이 도는 상황은 정의상 아레나가 비어 있는 상황이고, 보스 앵커에는 대개 **점프로 도달한다.**
즉 **빠른 플레이일수록 보스 경고가 사라진다** — 필요할 때 없고 안 필요할 때 있다.

부수 사항: 카운트다운 숫자가 `3 → 1`처럼 건너뛸 수 있다(오프셋 단조 증가 → `warningSec` 단조 감소).
`HUD.jsx:979`의 `bossWarning` 변화 감지 SFX도 같이 안 울린다.
`useMemo` deps에 오프셋이 없지만 `elapsed`(100ms 주기, `gameRuntimeTime.js` PUBLISH_INTERVAL_MS=100)가
재계산을 끌어주므로 stale 문제는 최대 100ms — 실질 무해.

**허용 가능한가**: 아니라고 본다. 보스 경고는 "즉사급 위협 3초 전 고지"라는 UX 계약이다.
보스가 실시간 20초에 예고 없이 튀어나오는 건 승인 사항 1번(조기 등장)과 별개의 문제다.
조기 등장 자체는 유지하되 경고는 살릴 방법이 있다(아래 권고 참조).

---

## 5. 빈 화면 판정의 오탐 — **FAIL (P2, 명세 위반이나 안전 방향)**

`Enemies.jsx:1686-1689`
```
const liveEnemyCount = enemyPool.activeCount
  + enemiesRef.current.length
  + catchUpQueue.spawnDrain.count
  + catchUpQueue.scheduleCount
```

`scheduleCount`는 좀비와 무관한 종류도 센다: `SCHEDULE_GOLD`(1), `SCHEDULE_MATILDA`(6).
`advanceSpawnCatchUp`은 `liveEnemyCount !== 0`이면 `emptyForSec`을 **0으로 완전 리셋**한다.
따라서 골드 코인 스케줄이 `emptyForSec = 1.9x`인 프레임에 끼면 빈 시간이 처음부터 다시 센다.

모델 측정 (stage1, 골드 주기 24초, 위상을 0~24초 0.1초 간격으로 전수 스윕, 실제 화면에 보이는
좀비 수 `pooledActive + special == 0`인 연속 구간의 최댓값):

| killSec | 골드 없음 | 골드 24초 주기 (최악 위상) |
|---|---|---|
| 0.5 | 2.033초 | **4.033초** |
| 1 | 2.033초 | **4.017초** |
| 2 | 2.017초 | **4.033초** |

**명세 상한 2초 대비 정확히 2배까지 늘어난다.** 골드 코인 실주기는 20~28초 랜덤
(`GOLD_INTERVAL_MIN_MS/MAX_MS`)이라 매 런에서 몇 번은 걸린다.

모델 가정 명시: `enqueueScheduled` → `scheduleRuntimeFlush` → `requestAnimationFrame(flush)` 이고,
R3F 루프도 RAF다. flush가 다음 `useFrame`보다 **뒤에** 도는 순서를 가정했다. 이 순서를 브라우저에서
확인하지는 않았다. flush가 먼저 돌면 이 간섭은 사라진다.

반대 방향 오탐도 있다(이쪽은 **위험 방향**): 춤추는 도지(`doges` state)와 상자는 `liveEnemyCount`에
아예 안 들어간다. 도지가 화면에서 춤추는 동안에도 "비었다"로 보고 캐치업이 돈다.

---

## 6. 스테이지 리셋 누수 — **PASS (정적 확인, 런타임 미확인)**

`Enemies.jsx:1197-1225`의 스테이지 useEffect 안에 `resetSpawnCatchUpState(spawnCatchUpRef.current)`와
`publishSpawnCatchUpOffsetSec(0)`이 들어 있고, deps는 `[currentStageId, gameKey]`다.

- **재시작/게임오버 후 재시작**: `useGameStore.js:1155` `gameKey: s.gameKey + 1` — 같은 스테이지를
  다시 시작해도 gameKey가 오르므로 effect가 재실행된다. **누수 없음.**
- **스테이지 전환**: `currentStageId` 변경 → 재실행.
- **언마운트 후 재마운트**(로비 왕복): 마운트 시 effect가 돌아 0으로 초기화된다.

모듈 전역 `publishedOffsetSec`이 Enemies effect에서만 0이 되므로, 새 런의 **첫 렌더**에서 HUD가
이전 런 오프셋을 읽을 수 있다(effect는 커밋 후 실행). 다만 그 순간 `elapsed = 0`이라
`warningSec = 150 - staleOffset`이 어떤 값이든 `0 < warningSec - 3` 또는 `0 >= warningSec`에 걸려
`null`이 나온다 → **화면에 보이는 결과 없음**. 1프레임짜리이기도 하다.

한계: 이건 **코드 경로 추론**이다. `Enemies.test.jsx:1397-1400`의 리셋 테스트는
`expect(source).toContain(...)` 문자열 검사라 effect가 실제로 도는지는 검증하지 않는다.
vitest environment가 `node`라 컴포넌트 마운트 테스트가 없고, 브라우저 실런도 못 돌렸다.
**"실제로 리셋된다"를 실측한 게 아니다.**

---

## 부수 관찰 (결함 아님)

- **CRLF 청소**: diff에 `overtimeReinforcementCountForTick` 본문과 상수 3줄이 내용 변화 없이 다시 쓰인
  것처럼 보이는데, 실제로는 CR 제거다. `0ea6e6b~1` blob에 CR 16개 → `0ea6e6b` blob에 CR 0개.
  `.gitattributes eol=lf` 방향으로 개선된 것이지 오염이 아니다.
- **반복 버스트의 미션 스폰 시각**: `Enemies.jsx:1560` `recordMissionBurstSpawns(store, batch, cache.id, spawnSec)`의
  `spawnSec`은 `repeatingBurstSecAtTick`가 준 **표 시각**이다. 단발 버스트는 이번 커밋에서 실시간 `sec`으로
  명시 고정했는데(주석까지 달았다) 반복 경로는 표 시각 그대로다. 현재는 무해하다 —
  `recordMissionSpecialEnemySpawn`이 받는 타입은 `['E03','RZT','RZG','RZL','RZC']`뿐이고
  반복 이벤트는 스3 E01/E07뿐이라 필터에서 전부 걸린다. 반복 이벤트에 E03/RZ*를 추가하는 순간 깨진다.
- **범위 밖**: `getE04IntroSec('stage3')`는 72를 반환하는데 `burstEvents.js:160` 주석은 "e04IntroSec 34 이후"를
  전제한다. 이번 커밋과 무관한 기존 불일치다.

---

## Acceptance 판정

**조건부 배포 가능 — 항목 3(P1)을 처리하거나 명시적으로 수용 결정한 뒤에 나가야 한다.**

핵심 메커니즘(오프셋 단조 증가, 점프 폭 산정, 총 HP 불변, 스폰 유실 없음, 리셋)은 건전하다.
승인된 설계(보스 조기·오버타임 조기·clamp 없음)로 인한 결과는 결함으로 올리지 않았다.
막는 건 **스테이지2·3의 E04가 실질적으로 무기를 잃는다**는 파생 부작용 하나다 — 이건 사용자가
승인한 "보스가 일찍 나온다"가 아니라, 그 때문에 원거리 좀비가 통째로 무해해지는 별개의 결과다.

## 수정이 필요한 항목 (우선순위 · 코드는 건드리지 않았다)

**P1 — 항목 3. bossPressure / E04 시계 불일치**
- 증상: stage2·stage3에서 E04 발사 창이 0초가 된다(통제 OFF 대비 78초 → 0초).
- 원인: 발사 하한 `introSec 72`는 실시간, 압박 하한 `bossSpawnSec 150`은 스폰 시계.
- 선택지 (사용자 판단 필요, 권고 아님):
  (a) `context.e04IntroSec` 비교도 `spawnSec`으로 옮긴다 — 게이트 둘이 같은 시계를 쓴다.
      부작용: E04가 실시간 12초쯤부터 쏜다.
  (b) `bossPressure` 상한도 `spawnSec < escapePortalSec`으로 옮긴다 — 압박 창 길이가
      스폰 시계 기준 60초로 고정된다. 커밋 주석의 "상한은 실시간" 결정을 뒤집는 것이므로 승인 필요.
  (c) `bossPressure`를 `bossAliveCount > 0`으로 바꾼다 — 시계 문제 자체가 사라진다. 변경 범위 최대.
- 어느 쪽이든 `Enemy.jsx:1299`의 동일 계산(현재 실시간 기준, E04에는 도달하지 않는 죽은 분기)과
  `Enemies.test.jsx:1285-1289`의 소스 문자열 단언을 같이 맞춰야 한다.

**P2 — 항목 4. 보스 경고 소실**
- 증상: 빠른 플레이에서 경고 노출 0~0.02초. 보스가 예고 없이 등장한다.
- 방향(예시): 경고를 시각 비교가 아니라 "보스 스폰 예정 감지 시 3초 카운트다운 시작"으로 바꾸거나,
  보스 앵커까지 남은 스폰 시계 거리가 3초 이내면 캐치업 점프를 보스 앵커 -3초까지만 하고 나머지
  3초는 실시간으로 흘려보낸다. 후자는 빈 화면 2초 상한을 3초로 늘리므로 명세 충돌 — 승인 필요.

**P2 — 항목 5. 빈 화면 오탐**
- 증상: 골드 스케줄 간섭으로 빈 화면이 최대 4.03초(명세 2초의 2배).
- 방향: `liveEnemyCount`에 `scheduleCount` 전체를 넣지 말고 좀비를 만드는 종류만 센다
  (`SCHEDULE_BURST` / `SCHEDULE_OVERTIME` / `SCHEDULE_DOGE`). 별도 카운터 하나면 된다.
- 같이 볼 것: 도지·상자가 `liveEnemyCount`에 없어서, 도지가 화면에 있는데도 캐치업이 도는 반대쪽 오탐.

**P3 — 부수. 반복 버스트 미션 스폰 시각**
- `Enemies.jsx:1560`이 표 시각을 넘긴다. 지금은 타입 필터 덕에 무해하지만 잠복 결함이다.

## 재현 절차 (구현자용)

1. 하네스를 다시 만들 필요는 없다. 항목 3·4는 코드 경로만으로 재현 판정이 가능하다:
   `Enemies.jsx:1736-1740`을 읽고 `sec`과 `spawnSec`이 어느 게이트에 붙는지 확인하면 된다.
2. 실플레이 확인이 필요하면 stage2에서 5초·24초 웨이브를 2초 안에 전멸시키고
   HUD 경과 타이머가 30초를 지나기 전에 보스가 나오는지, 그때 보스 경고가 떴는지,
   그 뒤 E04가 한 발이라도 쏘는지 본다. 구글 로그인이 필요하므로 헤드리스로는 안 된다.
3. 항목 5는 골드 코인이 드랍되는 프레임 근처에서 아레나를 비우고 스톱워치로 빈 화면 시간을 잰다.
   2초를 넘으면 재현이다.
