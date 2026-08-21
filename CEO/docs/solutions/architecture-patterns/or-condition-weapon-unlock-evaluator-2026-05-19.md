---
title: "OR-condition unlock evaluator with result-screen gating"
date: 2026-05-19
category: architecture-patterns
module: weapon-meta-progression
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "Persistent meta-progression with both per-run and cumulative trigger conditions (e.g., 한 판 처치 80 ∨ 누적 처치 200)"
  - "Unlock evaluation must NOT mutate gameplay state mid-run (card pool stays stable during a run)"
  - "Newly-unlocked items need a one-time alert on a result screen, surviving screen navigation but dying on next run start"
  - "Some cumulative counters (boss kills, rare events) are simpler to increment directly mid-run than to snapshot at run-end"
applies_when_not:
  - "Single-axis unlock conditions only (cumulative-only or per-run-only) — evaluator is trivial; this pattern is overkill"
  - "Mid-run unlock effects are desired (e.g., reaching X kills mid-run unlocks a new card in the same run) — this pattern explicitly prevents that"
tags: [weapons, meta-progression, zustand, localstorage, or-conditions, unlock-evaluator]
related_components: [player-records, weapon-catalog, weapon-unlocks, store, enemy]
---

# OR-condition unlock evaluator with result-screen gating

## Context

`Escape! zombie school`의 무기 12종 중 5종은 **per-run OR cumulative** 조건으로 해금된다 (예: `compassBlade`는 "한 판 처치 80" 또는 "누적 처치 200" 둘 중 하나). 직전에 적립한 [phase-gated-persistent-meta-progression-2026-05-17.md](phase-gated-persistent-meta-progression-2026-05-17.md)의 4-레이어 패턴(catalog/storage/store/UI)이 패시브 업그레이드에 잘 들어맞았지만, 무기 해금엔 추가 결정 4개가 더 필요했다:

1. 두 종류의 카운터(per-run vs cumulative)를 어떻게 같은 평가기로 처리할 것인가
2. 평가 시점이 잘못되면 더블카운트가 발생하는데 어떻게 막을 것인가
3. 결과창 알림을 누가 언제 만들고 언제 비울 것인가
4. 모든 카운터가 같은 라이프사이클을 따라야 하는가, 예외가 있는가

이 문서는 그 4개 결정의 정본을 담는다. Phase 1 (U1-U4) 구현은 통과 후 8 파일·106 테스트로 검증됐다.

## Guidance

### 규칙 1. 두 storage 키를 분리한다

```
school_survivor:playerRecords   ← 무엇이 일어났는가 (10키 카운터)
school_survivor:weaponUnlocks   ← 무엇이 영구히 얻어졌는가 (해금된 ID 집합)
```

이유:
- 라이프사이클이 다르다 — records는 mid-run에 갱신, unlocks는 결과창에서만 갱신.
- 의미가 다르다 — records는 데이터, unlocks는 도장(stamp).
- 마이그레이션도 독립 — records 형식이 바뀌어도 unlocks는 그대로.

합치면 동시 mid-run 갱신과 result-screen 갱신이 같은 객체를 두고 다투게 된다. 분리가 단순함.

### 규칙 2. 평가는 snapshot **전에** — 합본 객체로

OR-조건 평가의 입력은 cumulative + per-run의 합본이다:

```js
const evalInput = {
  ...loadPlayerRecords(),                  // cumulative
  runKills: s.runKills,                    // per-run (store)
  runGold: s.goldSession,                  //   (기존 store 필드 재사용)
  runLevelUps: s.runLevelUps,
  runSurvivalSeconds: Math.floor(s.elapsedMs / 1000),
}

const nextUnlocked = evaluateUnlocks(evalInput)  // 평가 먼저!
//   → catalog의 OR 분기를 순회. 각 {type, value}에 대해 evalInput[type] >= value면 unlock.
//   → starter 무기는 항상 unlock으로 반환.

const diff = newSet(nextUnlocked) - prevUnlockedOnDisk - starterIds

// ─── 평가가 끝난 다음에야 snapshot ───
snapshotPlayerRecords({ runKills, runGold, runLevelUps, runSurvivalSeconds })
```

**이 순서가 결정적이다.** 만약 snapshot이 평가보다 먼저 일어나면:
- per-run `runKills: 80`이 `totalKills += 80`로 cumulative에 합쳐진 후,
- 평가기가 `evalInput.runKills = 80` AND `evalInput.totalKills += 80`을 둘 다 본다 → 한 번의 적 처치가 두 OR 분기를 동시에 활성화.
- 다음 런에서 `runKills: 0`인데 cumulative에 이미 누적된 `totalKills`로 시작점이 어긋난다.

평가 전 합본은 단방향이라 안전하다 — cumulative는 이전 런들의 합산, per-run은 이번 런의 합산, 둘 다 카운트되어도 같은 사건을 두 번 세지 않는다.

### 규칙 3. 평가는 phase 전이 1회만

평가 호출 사이트는 정확히 두 곳:
- `damagePlayer`의 HP≤0 분기 (gameover 전이)
- `clearStage` 액션 (cleared 전이)

두 사이트가 같은 store 내부 helper `_onRunEnd(phaseName)`을 호출. 다른 곳에서는 평가하지 않는다. 카드 풀이 mid-run에 바뀌면 (a) 플레이어 의사결정이 흔들리고, (b) 레벨업 카드 풀 메모이제이션이 깨진다 (`HUD.jsx`의 `choices` memo는 `levelUpChoiceSerial` 기준).

### 규칙 4. `newly-unlocked` 알림은 store가 한 번에 계산해 보관

```js
set({ newlyUnlockedWeaponIds: diff })  // 결과창에서 UI가 읽음
// ...
resetGame() {
  set({ newlyUnlockedWeaponIds: [] })  // 다음 런 시작 시 비움
}
```

- UI는 diff를 계산하지 않는다 — 단지 배열을 렌더할 뿐.
- 결과창 modal이 닫혀도(코인상점 진입 등) 알림 데이터는 store에 살아 있다 — screen 축은 phase 축과 독립([result-gated-passive-shop-flow-2026-05-17.md](result-gated-passive-shop-flow-2026-05-17.md)).
- `resetGame()`이 다음 런 진입의 단일 경로이므로 알림 소멸도 거기서 한 곳.

### 규칙 5. 기본은 snapshot 흐름, mid-run 직접 누적은 예외 — 신중히

기본 흐름은 mid-run에 per-run 카운터만 갱신하고 run-end에 snapshot으로 cumulative로 합친다. 이번 구현에서 `bossKills`는 한 가지 예외로 처리했으나, **이 예외는 보수적으로 다뤄야 한다** — 코드 리뷰가 cargo-cult 위험을 정확히 지적했다.

```js
// Enemy.jsx 사망 hook 안:
store.recordKill(type)
if (type === 'B01') store.recordBossKill()  // ← mid-run 직접 cumulative 누적
```

`recordBossKill()` 직접 누적의 단기 이점:
- B01은 한 런 ≤ 1회 발생 → 더블카운트 위험이 콘텐츠 인바리언트(spawn 규칙)에 의해 막힘.
- per-run `runBossKills` 카운터를 따로 두면 store 필드 증가, reset 추가, snapshot 매핑 추가, evaluator 입력 합본 추가 — 4곳 변경.

위 이점의 비용:
- 콘텐츠 인바리언트("B01 한 런 1회")가 깨지면 (멀티-보스 웨이브, 미드런 부활 등) 더블카운트가 silent하게 돌아온다. 코드 안의 `assert/guard` 없음.
- mid-run에 disk 쓰기가 발생 → 런 중 크래시 시 다음 런이 같은 위치에서 시작하면 같은 보스 처치가 두 번 누적될 수 있다.
- "예외"라는 사실 자체를 문서로 영구히 부담해야 한다.

**대안**: `runBossKills` 도 per-run 카운터로 등록하고 snapshot 흐름을 따르게 만든다. 3-4 곳에 라인을 추가하는 일이며, 이 패턴을 새로 학습하는 다음 사람에게 일관된 모델을 준다.

**현재 구현은 단기 단순성을 택했지만**, 본 문서는 *기본 흐름이 정상 경로*임을 강하게 권장한다. 새 카운터 추가 시:
- 발생 횟수가 분명히 1 이하이고
- 콘텐츠 인바리언트가 stable하며
- per-run 변형이 catalog에 절대 등장하지 않을 것이 확실한 경우에만 예외 검토.

위 세 조건 중 하나라도 흔들리면 snapshot 흐름이 정답이다.

### 규칙 6. Starter sentinel은 catalog에, no-op은 storage에

```js
// weaponCatalog.js
pencilThrow: { ..., unlockConditions: STARTER },  // sentinel 상수
compassBlade: { ..., unlockConditions: [{type:'runKills',value:80}, {type:'totalKills',value:200}] },

// evaluateUnlocks
if (entry.unlockConditions === STARTER) {
  out.add(id)  // 항상 unlock
}

// weaponUnlocks.js setUnlocked
if (isStarter(id)) return  // 디스크 쓰지 않음
```

- starter는 evaluator가 매번 반환하지만 disk에는 쓰지 않는다 → newly-unlocked diff에서 자연스럽게 빠진다 (prev가 disk 읽기라 starter는 prev에 없지만, evaluator 결과의 starter 분기는 별도 `isStarter()` 필터로 명시 제외).
- starter 무기의 추가/제거가 disk 마이그레이션을 일으키지 않는다.
- "기본 지급"이라는 의미를 코드 한 자리(`STARTER` 상수)에 모은다.

### 규칙 7. Catalog는 단일 진실, UI/upgrades wiring은 명시적

Catalog가 12종 entry의 base 스탯·해금 조건·등장 레벨·카드 효과를 한 번에 owns한다. 그러나:

- `upgrades.js`의 `UPGRADE_EFFECTS`와 `HUD.jsx`의 `UPGRADES` 배열은 **자동 생성하지 않고** catalog를 import해 명시적으로 wiring한다.

자동 생성을 거부하는 이유:
- HMR이 모듈 사이를 건너뛰면 stale 매핑이 남는다.
- 테스트가 catalog 변경에 의존하면 격리가 어렵다.
- 1차 구현 단순성 > 자동화 매력. 12종 × 5필드는 사람이 명시적으로 적어도 부담스럽지 않다.

대신 catalog가 진실이라는 규율은 지킨다 — `UPGRADE_EFFECTS` entry가 catalog와 어긋나면 그건 wiring 버그.

## Why This Matters

### 평가-snapshot 순서는 자명하지 않다

처음 짤 때 자연스러운 사고는 "런 끝났으니 먼저 카운터 누적시키고, 다음에 평가" — 시간 순서대로다. 하지만 그 순서가 OR-조건 평가를 망친다. **per-run과 cumulative가 같은 도메인(kills, gold, ...)을 가리키면 합본 평가 전에 합산이 일어나면 안 된다.** 이 순서를 코드 주석으로만 남기면 다음 사람이 "snapshot이 앞에 있어야 더 깔끔" 같은 PR로 깨뜨릴 위험이 있다. 본 문서가 이 순서의 *why*를 적어 둔 이유.

### 결과창 알림은 라이프사이클이 미묘하다

- 너무 빨리 비우면 → 알림이 modal 닫는 순간 사라짐
- 너무 늦게 비우면 → 다음 런에서 stale 알림 노출

올바른 지점은 `resetGame()` — 다음 런 시작의 단일 경로. modal 닫기·코인상점 진입·다시하기 버튼 등 중간 이벤트는 알림을 건드리지 않는다. 이 규율을 store-owned 필드로 강제하면 UI가 실수할 여지가 줄어든다.

### 예외 카운터(bossKills)를 명시화하지 않으면 시스템이 흐려진다

5달 후 새 카운터를 추가하는 사람이 "평소 흐름 따라 snapshot 등록"하면, B01 처치가 두 번 누적될 수 있다(per-run snapshot + recordBossKill 직접 호출). 예외를 *예외라고 적어 두는 것*이 정상 흐름과 동등한 결정이다.

### Starter sentinel은 작아 보이지만 4가지 결합 시 단순화한다

(1) 카탈로그가 모든 무기를 알고 (2) evaluator는 starter도 처리해야 하고 (3) storage layer는 starter를 저장하지 않고 (4) UI는 starter를 강조하지 않는다 — 이 네 가지를 매번 if-체크로 처리하면 4곳에서 같은 결정을 반복한다. `STARTER` 상수 하나로 catalog가 declare하고 나머지 3 레이어가 그것을 신뢰하면 코드가 짧다.

## When to Apply

- 메타프로그레션이 OR 조건을 쓸 때 (실력 조건 ∨ 누적 조건).
- 알림이 결과창 한 곳에만 1회 표시되어야 할 때.
- 한 런에 한 번 이하 발생하는 특수 이벤트(보스 처치, 1스테이지 클리어)가 카운터로 추적될 때.
- 카탈로그가 ID-based selection을 하는 UI(상점, 도감, 카드 풀) 여러 곳을 먹일 때.

다음 경우엔 과한 패턴:
- 단일 축 평가(누적-only 또는 per-run-only) — evaluator가 단순 비교라 합본 단계 불필요.
- 알림이 필요 없는 진척(예: 진척도 바만 보이고 unlock은 자동 노출) — newly-unlocked diff 보관 불필요.
- 카운터가 3개 이하 — 두 키 분리도 과함.

## Examples

### Catalog: OR 조건 + starter sentinel

```js
// src/lib/weaponCatalog.js
export const STARTER = 'starter'

export const WEAPON_CATALOG = {
  pencilThrow: { ..., unlockConditions: STARTER, minLevelToAppear: 1 },
  compassBlade: {
    ...,
    unlockConditions: [
      { type: 'runKills', value: 80 },     // 실력
      { type: 'totalKills', value: 200 },  // 누적
    ],
    minLevelToAppear: 3,
  },
}

export function evaluateUnlocks(evalInput) {
  const out = new Set(STARTER_IDS)
  for (const id of ALL_IDS) {
    if (out.has(id)) continue
    const conds = WEAPON_CATALOG[id].unlockConditions
    if (conds === STARTER) { out.add(id); continue }
    for (const cond of conds) {
      const v = Number(evalInput[cond.type])
      if (Number.isFinite(v) && v >= cond.value) {
        out.add(id); break  // OR — 첫 분기 통과 시 종료
      }
    }
  }
  return out
}
```

### Store: 평가 → diff → snapshot 순서

```js
// src/store/useGameStore.js
_onRunEnd: (phaseName) => {
  const s = get()
  const runSurvivalSeconds = Math.floor(s.elapsedMs / 1000)

  // 1. 합본 (snapshot 전!)
  const evalInput = {
    ...loadPlayerRecords(),
    runKills: s.runKills,
    runGold: s.goldSession,
    runLevelUps: s.runLevelUps,
    runSurvivalSeconds,
  }

  // 2. 평가 → diff (starter / 이미 unlock 제외)
  const nextUnlocked = evaluateUnlocks(evalInput)
  const prevUnlocked = getAllUnlocked()
  const diff = []
  for (const id of nextUnlocked) {
    if (isStarter(id)) continue
    if (prevUnlocked.has(id)) continue
    diff.push(id)
  }
  diff.forEach((id) => setWeaponUnlocked(id))

  // 3. 평가 후 snapshot — 더블카운트 방지
  snapshotPlayerRecords({ runKills: s.runKills, runGold: s.goldSession,
                          runLevelUps: s.runLevelUps, runSurvivalSeconds })
  setBestPlayerRecord('bestSurvivalSeconds', runSurvivalSeconds)
  if (phaseName === 'cleared') incrementPlayerRecord('stage1Clears', 1)

  set({ newlyUnlockedWeaponIds: diff })  // UI가 결과창에서 읽음
},

resetGame: () => {
  // ... 다른 reset
  set({ newlyUnlockedWeaponIds: [] })   // 다음 런 진입 시 1회 비움
},
```

### Enemy: 일반 처치 vs 보스 처치 분기

```jsx
// src/components/Enemy.jsx — _enemyDead = true 직후
const store = useGameStore.getState()
store.recordKill(type)                   // 본 런 카운터 +1
if (type === 'B01') store.recordBossKill()  // mid-run 직접 cumulative 누적
```

### 평가-snapshot 순서를 실제로 잡아주는 테스트

⚠️ **첫 작성한 테스트는 false-witness였다** — `compassBlade`(per-run + cumulative 두 분기 모두 보유)로는 어떤 순서든 같은 결과가 나와 ordering 회귀를 잡지 못한다. 다음이 정직한 테스트:

```js
// starlink는 cumulative-only 조건 (totalKills >= 5000)을 가진다.
// pre-seed로 cumulative를 임계 직전에 둔다.
localStorage.setItem(RECORDS_KEY, JSON.stringify({ totalKills: 4920 }))

// 본 런에 처치 80 — 누적 끝에서 한 번에 5000을 넘게 만든다.
useGameStore.setState({ runKills: 80 })
useGameStore.getState()._onRunEnd('gameover')

// 정답 순서 (평가 → snapshot)의 평가는 합본 {totalKills:4920, runKills:80}을 보고
//   starlink 조건 totalKills:5000 → 4920 미달이므로 unlock 안 함.
//   compassBlade도 runKills:80 = 80 → unlock.
// 역순 (snapshot → 평가)의 경우 snapshot이 먼저 totalKills를 4920+80=5000로 만들어
//   평가가 starlink 조건 충족으로 보고 잘못 unlock 시킨다.

const ids = useGameStore.getState().newlyUnlockedWeaponIds
expect(ids).toContain('compassBlade')
expect(ids).not.toContain('starlink')   // ← 이 한 줄이 ordering을 진짜 가둔다
```

핵심: ordering 회귀를 잡으려면 cumulative-only 분기를 가진 무기가 임계 직전 pre-seed 상태에서 본 런 카운터만으로 임계를 넘기는 시나리오가 필요하다. compassBlade처럼 두 분기 모두 가진 무기는 어느 순서든 같은 결과를 내므로 false-witness가 된다.

본 패턴 적용 시 회귀 테스트 1개는 위 형태로 반드시 추가할 것.

## Known gaps (post-review, partially fixed)

ce-compound Phase 3 리뷰어가 짚은 항목으로, 본 패턴 자체는 영향 없지만 코드 정리·강화 시 같이 처리할 것:

### 본 적립과 함께 적용한 정정

- ✅ False-witness 테스트 제거 + cumulative-only 분기를 가진 `starlink`로 ordering 회귀 테스트 재작성 (`useGameStore.unlocks.test.js`).
- ✅ `recordKill(_enemyType)` 시그니처 거짓말 제거 — 인자 드롭. 호출자(`Enemy.jsx`)도 함께 갱신.
- ✅ `set({ newlyUnlockedWeaponIds: Object.freeze(diff) })` — 외부 mutate 방지.

### 남은 강화 후보 (별 PR)

- `evaluateUnlocks`가 `cond.value: 0` / 빈 `cond.type`을 silent-pass — 임계 0인 조건은 모든 카운터를 통과해 자동 해금. 카탈로그 작성자 오타 한 번에 무기 12종 전부 해금되는 위험. `weaponCatalog` 모듈 로드 시 `validateCatalog()`로 `cond.type` 화이트리스트 + `cond.value > 0` assert 권장.
- `WEAPON_CATALOG`의 entry 수가 12임을 잠그는 테스트가 없다 — `expect(Object.keys(WEAPON_CATALOG).length).toBe(12)` 추가하면 의도치 않은 추가/제거가 잡힌다.
- store가 `isStarter` + `getAllUnlocked` + `evaluateUnlocks` 세 모듈에서 import — `weaponUnlocks.computeUnlockTransition(evalInput) → { newlyUnlocked, allUnlocked }` 한 함수로 응축하면 store가 starter 의미를 알 필요 없어진다.
- mid-run `recordBossKill` 직접 disk 쓰기 → 크래시 후 같은 위치 재시작 시 재누적 위험. spawn 인바리언트가 "B01 ≤ 1/런"을 보장하므로 콘텐츠 인바리언트 깨질 때만 문제. 규칙 5의 신중 모드와 같이 다뤄야.

## Related

- [`phase-gated-persistent-meta-progression-2026-05-17.md`](phase-gated-persistent-meta-progression-2026-05-17.md) — 4-레이어 패턴의 정본. 본 문서는 이 패턴 위에 unlock 평가 specifics를 더한다.
- [`result-gated-passive-shop-flow-2026-05-17.md`](result-gated-passive-shop-flow-2026-05-17.md) — screen vs phase 축 분리. 결과창 알림 라이프사이클의 근거.
- `Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_expansion_unlock_plan_2026-05-10.md` — OR 정책 정본, 누적 키 스키마.
- `docs/plans/2026-05-19-001-feat-weapon-meta-progression-expansion-plan.md` — Phase 1 (U1-U4) 산출물의 정본 플랜. U5-U8(무기 컴포넌트 5종 + 카드 풀 필터 + 결과창 알림 UI)은 본 문서 작성 시점 아직 미구현.
- 구현 코드: `Developer/r3f_prototype/src/lib/playerRecords.js`, `weaponCatalog.js`, `weaponUnlocks.js`, `src/store/useGameStore.js`, `src/components/Enemy.jsx`.
