---
title: "Weapon meta-progression infrastructure + restore 2 + add 3 weapons"
type: feat
status: active
date: 2026-05-19
---

# Weapon meta-progression infrastructure + restore 2 + add 3 weapons

## Summary

영구 누적·런별 기록 인프라(`school_survivor:playerRecords`)와 OR-조건 무기 해금 평가기(`school_survivor:weaponUnlocks`)를 깐 뒤, 1차 9종 정본에 이미 포함되어 있으나 코드에서 임시 제거된 `guidedMissile`·`starlink`를 복원하고, 정본 확장 무기 `compassBlade`·`umbrellaGuard`·`eraserBomb`을 추가한다. 카드 풀은 계정 해금 + 최소 레벨 게이트로 필터되며, 새 해금은 결과창에서만 한 번에 표시되어 전투 중 카드 풀이 바뀌지 않게 한다.

---

## Problem Frame

현재 게임은 5분 생존 루프가 안정화됐고 코인상점/패시브 시스템이 막 들어갔지만, 무기 카탈로그는 정본 9종 중 7종만 코드에 살아 있고 누적 해금 시스템 자체가 없다. `Planner/current_game_rules.md` §6 작업 우선순위 메모는 "메타프로그레션 기획 → 해금 무기 복원 → 코인상점 패시브" 순서를 명시하며, 현재 그 두 번째 단계 직전에 와 있다. 동시에 `Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_expansion_unlock_plan_2026-05-10.md`가 1차 확장 무기 3종을 정의해 두었으므로, 메타프로그레션 인프라 위에 5종(복원 2 + 신규 3)을 함께 올리는 것이 인프라를 두 번 깔지 않는 효율적 경로다.

---

## Requirements

- **R1.** 영구 저장소에 누적 기록 10키(`totalRuns`/`totalKills`/`totalGold`/`totalSurvivalSeconds`/`bestSurvivalSeconds`/`stage1Clears`/`bossKills`/`totalLevelUps`/`totalPickups`/`weaponMasterCount`)와 본 런 카운터(`runKills`/`runLevelUps`/`runSurvivalSeconds`)가 일관되게 갱신된다. 본 런 골드는 기존 store 필드 `goldSession`을 그대로 사용하며 별도 `runGold` 필드를 만들지 않는다. (정본: `weapon_expansion_unlock_plan_2026-05-10.md` §3-2, §10-3)
- **R2.** OR-조건 무기 해금 평가기는 카탈로그의 `condition` 또는 `conditionAny` 배열을 받아 해금 상태를 결정하며, **결과창 진입 시점(`phase → 'gameover' | 'cleared'`)에만** 평가한다. (정본: 같은 문서 §7 "전투 중 갑자기 카드 풀을 바꾸지 않는다")
- **R3.** 본 플랜에서 와이어업하는 5종 무기 해금 조건(아래 표) 모두 1회 이상 사용자가 달성 가능한 경로로 평가된다.

  | 무기 | 실력 조건 | 누적 조건 |
  |---|---|---|
  | `guidedMissile` | — | 1차안: `totalRuns` ≥ 5 (메타프로그레션 정본 도입 시 확정) |
  | `starlink` | — | 1차안: `totalRuns` ≥ 10 ∨ `totalKills` ≥ 5000 |
  | `compassBlade` | 한 판 처치 80 | 누적 처치 200 |
  | `umbrellaGuard` | 한 판 최고 생존 90초 | 누적 생존 5분 |
  | `eraserBomb` | 한 판 골드 80 | 누적 골드 200 |
- **R4.** 레벨업 카드 풀은 (a) 계정 해금 상태, (b) `minLevelToAppear`, (c) 무기 슬롯 4개 미만, (d) 미보유 무기만 신규 획득 카드로 등장 — 4개 필터를 모두 통과한 무기만 후보로 한다.
- **R5.** 결과창은 새로 해금된 무기를 시각 강조와 함께 1회 표시하고, 다음 `resetGame()` 호출 시 알림 상태가 비워진다.
- **R6.** `guidedMissile` Lv.1 스탯 `damage:16 / cooldown:4000ms / range:22 / radius:1.6`, `starlink` Lv.1 스탯 `damage:28 / cooldown:3800ms / strikeCenter ≤ 5units / strikeRadius:1.2` (정본: `Bang_Rules.md` §5).
- **R7.** 신규 3종 Lv.1 스탯은 정본대로 — `compassBlade` `damage:7 / 회전 반경 1.15 / 초당 2.5타`, `umbrellaGuard` `damage:5 / cooldown:1800ms / radius:1.0 / 약 넉백`, `eraserBomb` `damage:26 / cooldown:3000ms / radius:1.35` (정본: `weapon_expansion_unlock_plan_2026-05-10.md` §5).
- **R8.** Lv.5까지 강화 카드와 등장 레벨 게이트(`compassBlade`/`umbrellaGuard` Lv.3+, `eraserBomb` Lv.4+, `guidedMissile` Lv.6+, `starlink` Lv.8+) 모두 작동한다.

---

## Scope Boundaries

- 진화 무기 시스템은 본 플랜에서 다루지 않는다 (2차 성장 시스템 후보).
- Bestiary/도감 화면(미해금 무기를 실루엣으로 보여주는 컬렉션 UI)은 본 플랜 밖.
- 카드 풀 가중치 4분 후 전환(55/25/20 → 65/15/20, `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` §8)은 별 플랜.
- 4차/5차 확장 무기(`notebookBoomerang`/`chalkLine`/`deskPush`/`lockerDoor`/`cleaningMop`/`broadcastSpeaker`/`fireExtinguisher`) 7종 추가는 본 플랜 밖.
- `guidedMissile`/`starlink`의 최종 해금 조건 수치는 1차안만 적용 — 메타프로그레션 정본 도입 시 별 PR로 재조정.

### Deferred to Follow-Up Work

- 7종 확장 무기 추가 — 본 플랜의 인프라가 충분히 검증된 후 별 플랜.
- 진화 무기 메커닉 도입 — 무기 14종 카탈로그가 안정화되고 5분 안에 Lv.5 도달이 가능한지 데이터 확인 후.
- Bestiary/도감 UI — 본 플랜의 `weaponCatalog`가 단일 진실로 정립된 뒤 UI만 얹는 별 플랜.

---

## Context & Research

### Relevant Code and Patterns

- `Developer/r3f_prototype/src/store/useGameStore.js` — `BASE_WEAPONS` (lines 65-73), `buildInitialWeapons(levels)` (might passive 곱하기), `resetGame()`, gold/passive localStorage helpers.
- `Developer/r3f_prototype/src/lib/passiveUpgrades.js` — forward-compat localStorage 계층의 정본 패턴 (`STORAGE_KEY`/`readRaw`/`writeRaw`/`load`/`getAllLevels`/`_resetForTests`). 새 records/unlocks 모듈이 이 형태를 정확히 mirror한다.
- `Developer/r3f_prototype/src/lib/upgrades.js` — `UPGRADE_EFFECTS` 카드 키→무기 변환 정본, `applyUpgradeToWeapon`, `isUpgradeAvailable`, `MAX_OWNED_WEAPONS=4`, `MAX_WEAPON_LEVEL=5`.
- `Developer/r3f_prototype/src/components/HUD.jsx` — `UPGRADES` 배열(카드 풀 UI source), `pickThree(level, weapons, player)`, `UpgradeIcon` 스위치, gameover/cleared 모달의 `nextUnlock` 블록(해금 알림의 시각 레퍼런스).
- `Developer/r3f_prototype/src/components/Weapons/Pencil.jsx`, `StunGun.jsx`, `Tumbler.jsx` — 각각 자동추적/체인/궤도 무기 패턴. 신규 무기 별로 가장 가까운 레퍼런스 컴포넌트.
- `Developer/r3f_prototype/src/components/Enemy.jsx` line 141 — `_enemyDead = true` 전이 지점. 본 런 처치 카운터의 자연스러운 hook point.
- `Developer/r3f_prototype/src/components/Game.jsx` lines 62-68 — 무기 마운트 명시. 신규 무기 import + 추가 필요.

### Institutional Learnings

- [`docs/solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md`](../solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md) — 4-레이어 분리(Catalog / Storage / Store integration / UI), forward-compat 저장(미지정 키 보존), 카탈로그-신뢰 UI, "두 박자" 토글 규율. 본 플랜의 weapon 인프라는 이 패턴을 그대로 mirror한다.
- [`docs/solutions/architecture-patterns/result-gated-passive-shop-flow-2026-05-17.md`](../solutions/architecture-patterns/result-gated-passive-shop-flow-2026-05-17.md) — `screen`(App 라우팅)과 `phase`(Zustand 런 상태)를 별 축으로 유지. 본 플랜의 해금 알림은 결과창 modal 안 phase 기반으로 동작하며 `screen` 축은 건드리지 않는다.

### External References

본 플랜에서는 외부 리서치 없음. 정본 plannering 문서와 기존 코드 패턴이 충분.

---

## Key Technical Decisions

- **Records와 Unlocks를 두 개의 localStorage 키로 분리** (`school_survivor:playerRecords` + `school_survivor:weaponUnlocks`): 의도가 다르고 마이그레이션도 독립. records는 매 런 갱신, unlocks는 결과창에서만 갱신. 합치면 핫스팟 충돌 우려.
- **카운터는 store가 소유, 평가기는 외부 모듈 순수 함수**: store는 상태 변경, `weaponCatalog.js`의 `evaluateUnlocks(records)`는 입력 → 해금 ID 배열 반환. 테스트 격리에 유리.
- **`bossKills`는 mid-run 직접 누적**: `Enemy.jsx`에서 B01 사망 전이 시 `playerRecords.incrementRecord('bossKills', 1)`을 즉시 호출. 결과창 snapshot에는 포함되지 않음 (mid-run에 이미 cumulative에 반영됨). 다른 누적 키와 흐름이 다르다는 점에 주의 — `bossKills`만 mid-run 직접 누적, 나머지는 run-end snapshot.
- **카탈로그는 12종 전부 등록(7종 base + 2종 복원 + 3종 신규)**: 본 플랜 진행 중 다른 무기 추가 PR이 동시 진행되더라도 base 7종이 카탈로그에서 빠지는 일 없도록 인프라 단계부터 12종 정본화. base 7종은 `unlockConditions: 'starter'` 같은 sentinel로 표시.
- **해금 평가는 phase 전이 1회**: `phase → 'gameover' | 'cleared'` 전이 시점에 1회만 평가하고 `newlyUnlockedWeaponIds` 배열을 store에 저장. 카드 풀이 mid-run 변하지 않도록 강제 (정본 §7). 호출 사이트는 정확히 두 곳: `damagePlayer`의 HP≤0 분기와 `clearStage` 액션. 둘 다 공통 helper `_onRunEnd()`를 호출.
- **`buildInitialWeapons(levels)` 확장**: 카탈로그 12종 모두에 대해 base 스탯 클로닝 + might passive 곱하기. 현재의 7종 하드코딩을 카탈로그-주도로 교체.
- **Triple-sync는 카탈로그 정의로 흡수, 등록은 명시적**: 카탈로그 entry가 `cardEffects` 필드에 카드 효과를 declarative하게 보유한다. 단 `upgrades.js`의 `UPGRADE_EFFECTS`와 `HUD.jsx`의 `UPGRADES` UI 배열은 **자동 생성하지 않고** 카탈로그를 import해 명시적으로 wiring한다 — 자동 생성은 HMR/테스트 격리 측면에서 트레이드오프가 커 1차에서는 보수적으로 간다. 따라서 U5/U6/U7은 신규 카탈로그 entry 추가 + `upgrades.js`/`HUD.jsx` 등록 라인 추가를 함께 수행한다.
- **Damage 반올림**: `buildInitialWeapons`의 1자리 반올림은 보존 (`Math.round(d*10)/10`).
- **`resetGame()`은 records를 건드리지 않음**: passives와 동일 의미적 분류. `runSession` 카운터만 0 reset.

---

## Open Questions

### Resolved During Planning

- **`guidedMissile`/`starlink` 정확한 해금 조건 수치**: 1차안(누적 플레이 5회 / 10회 또는 누적 처치 5000) 적용. 메타프로그레션 정본 도입 PR에서 재조정. (Phase 0.5 사용자 확인)
- **본 플랜의 카탈로그 스키마 범위**: 10키 전부 카운터로 깔되, 5종 무기 해금에 필요한 5키만 평가기에 와이어업. 나머지는 dead-storage로 두고 후속 무기에서 사용. (Phase 0.7 confirmation)
- **카운터 hooks 위치**: `runKills`는 `Enemy.jsx _enemyDead` 전이, `runGold`은 `gainGold` 기존 호출, `runLevelUps`는 `gainXp`의 level-up 분기, `runSurvivalSeconds`는 `elapsedMs / 1000` 결과창 진입 시 snapshot, `bossKills`는 `Enemy.jsx`에서 `_enemyType === 'B01'` 체크 (B01 xp=0이라 XP 기반 hook은 부적합).
- **해금 알림 표시 위치**: HUD modal `nextUnlock` 블록 위에 newly-unlocked 카드. 같은 modal style을 재사용.

### Deferred to Implementation

- **`Missile.jsx`/`Starlink.jsx`의 정확한 visual 모델**: 기존 git 브랜치에 잔존하더라도 본 plan은 정확한 메시 구현을 명시하지 않음. 구현 시 `StunGun.jsx`의 `LightningBoltModel` 패턴을 참고하여 새로 그릴 것 (R3F 카툰 outline 일관성).
- **카드 풀 weight 조정 4분 후 전환** (55/25/20 → 65/15/20): 본 플랜 밖. 별 플랜에서 검증.
- **5종 무기의 진화 형태**: 본 플랜 밖.
- **새 무기의 VFX 디테일** (eraserBomb 먼지 폭발 파티클, compassBlade 회전 트레일): 구현 시 `lib/vfxPalette.js` / `VFXLayer.jsx` 패턴을 따라 적용. 사전 결정 불필요.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─ weaponCatalog.js ────────────────────────────────────────────────────┐
│ WEAPON_CATALOG = {                                                     │
│   pencilThrow: { base:{damage:8,cooldown:1100,…},                      │
│                  unlockConditions: 'starter',                          │
│                  minLevelToAppear: 1,                                  │
│                  cardEffects: {damage:+3, projectileCount:+1, …} },    │
│   guidedMissile: { base:{damage:16,cooldown:4000,…},                   │
│                    unlockConditions: [{type:'totalRuns',value:5}],     │
│                    minLevelToAppear: 6 },                              │
│   compassBlade: { base:{damage:7,…},                                   │
│                   unlockConditions: [{type:'runKills',value:80},       │
│                                       {type:'totalKills',value:200}], │
│                   minLevelToAppear: 3 },                               │
│   … (12 entries total)                                                 │
│ }                                                                      │
│ getAllWeaponIds() / getStarterIds() / evaluateUnlocks(evalInput)       │
│ — UPGRADE_EFFECTS / UPGRADES UI 배열은 upgrades.js / HUD.jsx에서 명시  │
│   import해 wiring (자동 생성 X — HMR/테스트 격리 보수성 우선)            │
└────────────────────────────────────────────────────────────────────────┘
                ↓                                       ↓
┌─ playerRecords.js ──────────────────┐  ┌─ weaponUnlocks.js ───────────┐
│ KEY: 'school_survivor:playerRecords'│  │ KEY: 'school_survivor:        │
│ load / increment(key,n) /           │  │       weaponUnlocks'          │
│ setBestIfHigher(key,v) /            │  │ load / isUnlocked(id) /       │
│ snapshot(runCounters)               │  │ setUnlocked(id) /             │
│ — 10 cumulative + 4 run counters   │  │ getAllUnlocked()              │
└─────────────────────────────────────┘  └───────────────────────────────┘
                ↓                                       ↓
┌─ useGameStore.js ────────────────────────────────────────────────────┐
│ runKills, runLevelUps  (per-run counters, reset on resetGame)         │
│ newlyUnlockedWeaponIds: []  (set on phase→gameover/cleared, clear on  │
│                              resetGame)                               │
│ damagePlayer/gainXp/gainGold → 본 런 카운터 증가                       │
│ phase 전이 → snapshot to cumulative, evaluate unlocks, diff           │
└──────────────────────────────────────────────────────────────────────┘
                ↓                                       ↓
┌─ Enemy.jsx ─────────────────┐         ┌─ HUD.jsx ──────────────────┐
│ _enemyDead 전이 시           │         │ pickThree: 카탈로그 +       │
│  ↳ runKills++,               │         │  weaponUnlocks 필터 통과한  │
│  ↳ enemyType==='B01' →       │         │  카드만 풀에 포함            │
│     bossKills++              │         │ gameover modal: newly-      │
└──────────────────────────────┘         │  unlocked 알림 카드 렌더    │
                                         └─────────────────────────────┘
```

핵심 흐름 — 결과창 도달 시:

```
phase: playing → gameover/cleared
  ↓
runCounters snapshot → playerRecords.increment (totalRuns, totalKills, totalGold,
                                                  totalLevelUps, totalSurvivalSeconds)
                       playerRecords.setBestIfHigher (bestSurvivalSeconds)
  ↓
prevUnlocked = weaponUnlocks.getAllUnlocked()
newUnlocked = weaponCatalog.evaluateUnlocks(records)
diff = newUnlocked − prevUnlocked
  ↓
weaponUnlocks.setUnlocked(...diff)
useGameStore.set({ newlyUnlockedWeaponIds: diff })
  ↓
HUD modal: diff 표시
```

---

## Implementation Units

### U1. Player records storage layer

**Goal:** localStorage 영구 누적 기록 + 런 카운터의 read/write 계층. 본 플랜의 모든 후속 유닛이 의존.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `Developer/r3f_prototype/src/lib/playerRecords.js`
- Test: `Developer/r3f_prototype/src/lib/playerRecords.test.js`

**Approach:**
- `passiveUpgrades.js`를 정확히 mirror — `STORAGE_KEY`, `readRaw`, `writeRaw`, `load`, `getRecord(key)`, `_resetForTests`.
- 10키 누적 카운터 모두 0으로 초기화.
- `incrementRecord(key, n=1)` — 카탈로그 키만 갱신, 미지정 키는 보존.
- `setBestIfHigher(key, value)` — `bestSurvivalSeconds` 같은 max-of 필드용.
- `snapshot(runCounters)` — 본 런 카운터(`runKills`/`runGold`/`runLevelUps`/`runSurvivalSeconds`)를 받아 적절한 누적 키로 합산.

**Patterns to follow:**
- `Developer/r3f_prototype/src/lib/passiveUpgrades.js` (forward-compat localStorage 계층의 정본)

**Test scenarios:**
- Happy path: 빈 저장소에서 `load()`가 10키 모두 0으로 반환.
- Happy path: `incrementRecord('totalKills', 5)` → `load().totalKills === 5`.
- Happy path: `setBestIfHigher('bestSurvivalSeconds', 90)` 두 번 호출 (120, 80) → 120 유지.
- Edge case: 미지정 키 보존 — 디스크에 `{totalKills: 3, futureKey: 7}` 시드 후 `incrementRecord('totalKills', 1)` → 디스크에 `futureKey: 7` 잔존.
- Edge case: 잘못된 JSON 시 0으로 fallback, 예외 안 던짐.
- Edge case: `snapshot({runKills:50, runGold:30, runLevelUps:7, runSurvivalSeconds:240})` → totalKills/totalGold/totalLevelUps/totalSurvivalSeconds 각각 정확히 합산.

**Verification:**
- `npm test` 통과 + `playerRecords.test.js` 6+ 시나리오 그린.

---

### U2. Weapon catalog & unlock storage

**Goal:** 12종 무기의 단일 진실 카탈로그(스탯·해금 조건·카드 효과·등장 레벨), 그리고 영구 해금 상태 저장소.

**Requirements:** R2, R3, R6, R7, R8

**Dependencies:** U1

**Files:**
- Create: `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- Create: `Developer/r3f_prototype/src/lib/weaponUnlocks.js`
- Test: `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`
- Test: `Developer/r3f_prototype/src/lib/weaponUnlocks.test.js`

**Approach:**
- `weaponCatalog.js`: 12-entry `WEAPON_CATALOG` 객체. 각 entry는 `{ id, label, base: {…stats}, unlockConditions: 'starter' | [{type, value}, …], minLevelToAppear, cardEffects: {…} }`.
- 7종 base는 `unlockConditions: 'starter'`. `guidedMissile`/`starlink`는 1차안 누적 조건. 신규 3종은 OR 배열.
- 노출 함수: `getAllWeaponIds()` / `getStarterIds()` / `evaluateUnlocks(evalInput)` — 순수 함수.
- `evaluateUnlocks`는 `unlockConditions` 배열을 순회, 각 조건의 `evalInput[type] >= value`면 그 무기 해금. 미지정 type은 false 처리(다른 OR 분기 계속). `'starter'`는 항상 해금.
- 카탈로그는 본 플랜의 `BASE_WEAPONS` (현 useGameStore.js) 자리를 대체. base 스탯은 정확히 동일 값.
- `cardEffects` 필드는 카드 효과 declarative 정의. **`UPGRADE_EFFECTS`(upgrades.js)와 `UPGRADES`(HUD.jsx)는 자동 생성하지 않고, 카탈로그를 import해 명시적으로 wiring한다.** 1차 구현 단순성·HMR·테스트 격리 우선.
- `weaponUnlocks.js`: `STORAGE_KEY = 'school_survivor:weaponUnlocks'`, 형태는 `{ [weaponId]: 1 }` (해금된 무기 ID만 저장). starter 무기는 저장 안 함 (`evaluateUnlocks`가 항상 unlock으로 반환).

**Patterns to follow:**
- `passiveCatalog.js` + `passiveUpgrades.js` 4-레이어 패턴 ([docs/solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md](../solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md)).

**Test scenarios:**
- Happy path: `WEAPON_CATALOG`에 12개 entry, base 7종에 `unlockConditions: 'starter'`.
- Happy path: `evaluateUnlocks({totalKills: 200})` → `compassBlade` 포함 + 7종 starter.
- Happy path: `evaluateUnlocks({runKills: 80})` → `compassBlade` 해금 (OR 조건 첫 번째).
- Edge case: 빈 records → starter 7종만.
- Edge case: 모든 조건 만족 → 12종 전부.
- Edge case: 미지정 조건 type (e.g., `{type: 'fooBar'}`) → evaluator는 false로 처리, 다른 OR 분기로 평가 계속.
- Happy path: `weaponUnlocks.setUnlocked('compassBlade')` round-trip.
- Edge case: 미지정 무기 ID 저장 시 disk 보존 + `getAllUnlocked()`에는 카탈로그 키만 노출.

**Verification:**
- 두 테스트 파일 모두 그린. 12종 카탈로그의 base 스탯이 R6/R7 수치와 1:1 일치.

---

### U3. Per-run counters in store + Enemy kill hook

**Goal:** `runKills`/`runLevelUps`/`runGold`/`runSurvivalSeconds` 본 런 카운터를 store에 추가하고, Enemy 사망과 XP/gold 흐름에 연결.

**Requirements:** R1

**Dependencies:** U1, U2

**Files:**
- Modify: `Developer/r3f_prototype/src/store/useGameStore.js`
- Modify: `Developer/r3f_prototype/src/components/Enemy.jsx`
- Test (extend): `Developer/r3f_prototype/src/store/useGameStore.test.js` or new `useGameStore.records.test.js`

**Approach:**
- Store: 초기 상태에 `runKills: 0`, `runLevelUps: 0` 추가. **본 런 골드는 별도 필드를 만들지 않고 기존 `goldSession`을 그대로 사용** — snapshot 시 `playerRecords.snapshot({runKills, runGold: goldSession, runLevelUps, runSurvivalSeconds})` 형태로 매핑 단계에서 이름만 부여.
- `runSurvivalSeconds`는 `Math.floor(elapsedMs/1000)` 결과창 진입 시 계산하므로 별 store 필드 불필요.
- `runKills`/`runLevelUps`는 `resetGame()`에서 0 reset (다른 런 카운터들과 동일 위치).
- 신규 액션 `recordKill(enemyType)` — store 내부에서 `runKills++` 처리.
- `Enemy.jsx`의 `_enemyDead = true` 전이 직후에 `useGameStore.getState().recordKill(enemyType)` 호출. `enemyType === 'B01'`이면 별 액션 `recordBossKill()`을 같이 호출 — 이쪽은 `playerRecords.incrementRecord('bossKills', 1)`을 mid-run 직접 호출. 다른 본 런 카운터와 달리 snapshot 경로를 거치지 않음 (B01은 한 런에 1회 이하 발생이라 즉시 누적이 안전).
- `gainXp`의 level-up 분기 안에서 `runLevelUps++`.

**Execution note:** Enemy 사망 hook은 회귀 위험이 있어 테스트를 먼저 작성하는 편이 안전 (test-first).

**Patterns to follow:**
- 기존 `goldSession` reset 패턴 (`useGameStore.js resetGame` 안의 `goldSession: 0`).
- `Enemy.jsx` line 141 부근 `_enemyDead` 전이 — 거기에 store 호출 한 줄 추가.

**Test scenarios:**
- Happy path: `recordKill()` 5번 호출 → `runKills === 5`.
- Happy path: `recordBossKill()` 1번 → `bossKills` 누적 +1 (playerRecords 통해).
- Edge case: `resetGame()` 후 `runKills`/`runLevelUps` 모두 0.
- Integration: Enemy 사망 → store `runKills` 증가 (jsdom + 모킹된 Rapier ref).
- Happy path: `gainXp` level-up 발생 시 `runLevelUps++` (기존 XP 테스트 확장).

**Verification:**
- 테스트 그린 + 게임 플레이 후 store inspector에서 `runKills`가 단조 증가.

---

### U4. Run-end unlock evaluator + newly-unlocked snapshot

**Goal:** `phase → 'gameover' | 'cleared'` 전이 1회에 누적 기록 갱신·해금 평가·diff 산출·store 알림 필드 set.

**Requirements:** R2, R5

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `Developer/r3f_prototype/src/store/useGameStore.js`
- Test: `Developer/r3f_prototype/src/store/useGameStore.unlocks.test.js`

**Approach:**
- store에 `newlyUnlockedWeaponIds: []` 필드 추가. `resetGame()`에서 빈 배열로 reset.
- `damagePlayer`의 HP≤0 분기와 `clearStage` 액션 두 곳이 phase 전이 지점. 두 곳에서 공통 helper `_onRunEnd()` 호출. 평가 순서가 본 unit의 정확성을 결정 — **본 런 카운터를 cumulative에 snapshot하기 *전*에** 합본 객체를 만들어 `evaluateUnlocks`에 전달한다:
  1. `runSurvivalSeconds = Math.floor(elapsedMs/1000)` 계산.
  2. **합본 만들기** (snapshot 전): `evalInput = {...playerRecords.load(), runKills, runGold: goldSession, runLevelUps, runSurvivalSeconds}`. 본 런 조건(`runKills: 80` 같은)이 이 합본에 노출돼 OR-조건 평가에 사용됨. **주의: `bossKills`는 이미 mid-run에 cumulative로 누적되어 `playerRecords.load()`에 들어 있다.**
  3. **평가**: `nextUnlocked = weaponCatalog.evaluateUnlocks(evalInput)`. starter 무기는 평가기 내부에서 항상 unlock 처리.
  4. **diff**: `prevUnlocked = weaponUnlocks.getAllUnlocked()`; `diff = nextUnlocked.filter(id => !starter.has(id) && !prevUnlocked.has(id))`.
  5. **저장 & alert**: `diff.forEach(id => weaponUnlocks.setUnlocked(id))`; `set({ newlyUnlockedWeaponIds: diff })`.
  6. **누적 snapshot** (평가 *후* — 다음 런 시작 시점부터 cumulative에 반영): `playerRecords.snapshot({runKills, runGold: goldSession, runLevelUps, runSurvivalSeconds})`.
  7. `playerRecords.setBestIfHigher('bestSurvivalSeconds', runSurvivalSeconds)`.
  8. 5분 클리어면 `playerRecords.incrementRecord('stage1Clears', 1)`.
- **순서 정리**: 합본 평가 → diff & 저장 → cumulative snapshot. 평가-후-snapshot 순서를 지키지 않으면 본 런 조건과 누적 조건이 더블카운트된다.

**Execution note:** 평가 순서가 미묘 (snapshot 직전 vs 직후) — test-first 권장.

**Technical design:**
```
_onRunEnd():
  rs = Math.floor(elapsedMs / 1000)

  // 1. 합본은 snapshot 전에. 본 런 카운터를 평가 입력에 포함.
  //    bossKills는 mid-run에 이미 cumulative에 들어 있어 records.load()로 들어온다.
  evalInput = {...records.load(),
               runKills, runGold: goldSession, runLevelUps,
               runSurvivalSeconds: rs}

  // 2. 평가 → diff → unlock 저장 → store 알림 필드 set
  nextUnlocked = catalog.evaluateUnlocks(evalInput)  // 12종 전부 평가
  prevUnlocked = unlocks.getAllUnlocked()             // 이전 런 종료 시점의 비-starter 해금
  diff = nextUnlocked.filter(id => !starter.has(id) && !prevUnlocked.has(id))
  diff.forEach(id => unlocks.setUnlocked(id))
  set({newlyUnlockedWeaponIds: diff})

  // 3. 평가 후에 누적 snapshot — 더블카운트 방지
  records.snapshot({runKills, runGold: goldSession, runLevelUps,
                    runSurvivalSeconds: rs})
  records.setBestIfHigher('bestSurvivalSeconds', rs)
  if (phase === 'cleared') records.incrementRecord('stage1Clears', 1)
```

**Patterns to follow:**
- 기존 `clearStage` 액션의 phase 전이 (`useGameStore.js`).
- `damagePlayer`의 HP≤0 분기 — `set({ player: { ...player, hp }, phase: 'gameover', pauseSource: null })`.

**Test scenarios:**
- Happy path: pre-run records 빈 상태에서 한 런 동안 `runKills=80` 후 gameover → `newlyUnlockedWeaponIds: ['compassBlade']`.
- Happy path: 한 번 해금된 무기는 다음 런에서 `newlyUnlockedWeaponIds`에 다시 포함되지 않음 (`prevUnlocked` 차감).
- Edge case: starter 무기는 절대 `newlyUnlockedWeaponIds`에 들어가지 않음.
- Edge case: 빈 런 (`runKills=0`) → diff 빈 배열.
- Happy path: 5분 클리어 시 `stage1Clears` 누적 +1.
- Integration: 두 무기 동시 해금 (`compassBlade` + `umbrellaGuard`) → diff 두 무기 포함, 둘 다 disk에 저장.
- Edge case: `resetGame()` 후 `newlyUnlockedWeaponIds === []`.

**Verification:**
- 테스트 그린. 의도된 phase 전이 외 위치에서 unlock 평가가 발생하지 않음.

---

### U5. Restore `guidedMissile`

**Goal:** 1차 9종 정본의 `guidedMissile` 무기 컴포넌트 복원 + 카탈로그 통합 + 카드 효과 등록.

**Requirements:** R6, R8

**Dependencies:** U2 (카탈로그가 weapon definition을 owns)

**Files:**
- Create: `Developer/r3f_prototype/src/components/Weapons/Missile.jsx`
- Modify: `Developer/r3f_prototype/src/components/Weapons/index.js` (barrel re-export)
- Modify: `Developer/r3f_prototype/src/components/Game.jsx` (마운트)
- Modify: `Developer/r3f_prototype/src/lib/weaponCatalog.js` (U2의 entry 채우기 — base 스탯 R6, cardEffects)
- Modify: `Developer/r3f_prototype/src/lib/upgrades.js` (U2가 자동 생성하지 못하는 부분 — `unlockMissile`/`missileDamage` 카드 키 매핑)
- Modify: `Developer/r3f_prototype/src/components/HUD.jsx` (`UpgradeIcon` 스위치 케이스 + `UPGRADES` 배열 추가)

**Approach:**
- 컴포넌트 패턴은 `Pencil.jsx`(자동 추적) + `Flask.jsx`(폭발) 합성. 가장 가까운 적 방향으로 천천히 호밍하다가 도달 시 `radius: 1.6` 폭발.
- Lv.1 스탯: `damage:16, cooldown:4000, range:22, radius:1.6`.
- Lv.5 성장 카드: 데미지 +6 (Lv.5 36 도달), 폭발 반경 +0.15 (최대 2.2).
- Role per `Weapons_modify.md` §4: 멀리 있거나 크게 뭉친 적 무리를 긴 쿨다운으로 크게 처리. 플라스크와 역할 분리.
- HUD 아이콘은 `HUD.jsx` 716-764 lines의 leftover `missileIcon` style 재사용.

**Patterns to follow:**
- `Developer/r3f_prototype/src/components/Weapons/Pencil.jsx` (자동 추적 투사체 패턴).
- `Developer/r3f_prototype/src/components/Weapons/Flask.jsx` (폭발 판정 패턴).
- `Bang_Rules.md` §5의 historic 수치.

**Test scenarios:**
- Happy path: 카탈로그에서 `guidedMissile` 조회 시 R6 스탯과 일치.
- Happy path: 카드 풀 필터 통과 시(언락 + Lv.6+) `unlockMissile` 카드 등장 가능.
- Edge case: 미사일은 가까운 적이 없을 때 발사 안 함 (no-op).
- Integration: Lv.1 unlock 카드 → 무기 슬롯 1++, `damage:16`/`cooldown:4000` 적용 (might passive 곱하기 후).
- Verification: 무기 4개 슬롯 차면 `unlockMissile` 카드 풀에서 제외.

**Verification:**
- 카탈로그 + Game.jsx + HUD 동기화. dev 서버에서 unlock 후 정상 발사 확인.

---

### U6. Restore `starlink`

**Goal:** 1차 9종 정본의 `starlink` 무기 컴포넌트 복원 + 카탈로그 통합.

**Requirements:** R6, R8

**Dependencies:** U2

**Files:**
- Create: `Developer/r3f_prototype/src/components/Weapons/Starlink.jsx`
- Modify: 동일 4파일 (`Weapons/index.js`, `Game.jsx`, `weaponCatalog.js`, `upgrades.js`, `HUD.jsx`)

**Approach:**
- 패턴: 플레이어 주변 5 units 안 무작위 지점에 낙뢰 strike. 영향 반경 1.2. `StunGun.jsx`의 `LightningBoltModel`과 같은 시각 언어 재사용.
- Lv.1 스탯: `damage:28, cooldown:3800, strikeCenter:5, strikeRadius:1.2`.
- Lv.5 성장: 데미지 +10 (Lv.5 68), strike 개수 +1 (최대 3개 동시).

**Patterns to follow:**
- `Developer/r3f_prototype/src/components/Weapons/StunGun.jsx` (체인 + 번개 비주얼).
- 같은 `Bang_Rules.md` §5 수치 정본.

**Test scenarios:**
- 동일 6 시나리오 카테고리, U5와 같은 형태.
- Edge case: strikeCenter가 모든 적 밖에 떨어지면 데미지 0 (no-target).
- Happy path: Lv.3 strike 개수 2개 가정 시 각각 독립 위치.

**Verification:**
- 동일 sync 확인.

---

### U7. Add `compassBlade` + `umbrellaGuard` + `eraserBomb`

**Goal:** 정본 확장 3종 신규 추가. 카탈로그·컴포넌트·카드 효과 전부 wiring.

**Requirements:** R7, R8

**Dependencies:** U2

**Files:**
- Create: `Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx`
- Create: `Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx`
- Create: `Developer/r3f_prototype/src/components/Weapons/EraserBomb.jsx`
- Modify: `Weapons/index.js`, `Game.jsx`, `weaponCatalog.js`, `upgrades.js`, `HUD.jsx`

**Approach:**
- `compassBlade`: `Tumbler.jsx` 패턴(궤도 회전). 1개 칼날 시작, 반경 1.15. Lv.5 칼날 3개·반경 1.45. 회전 속도는 tumbler보다 빠르게.
- `umbrellaGuard`: `SchoolBag.jsx` 패턴(근접 트리거)에 넉백 추가. 플레이어 주변 1.0 반경. 1800ms 쿨다운에 1회 펄스 + 약 넉백 (`other.rigidBody._enemyHit(damage, {knockback: 'medium', knockbackMs: 200})`).
- `eraserBomb`: `Flask.jsx` 패턴(광역 폭발)을 슬로우 버전으로. cooldown 3000ms, radius 1.35. 타겟은 가장 큰 적 클러스터 중심 (간단히 `findClosestEnemy` 결과 위치).

**Patterns to follow:**
- 정본 stats: `weapon_expansion_unlock_plan_2026-05-10.md` §5-1~5-3.
- 각 컴포넌트는 가장 가까운 기존 무기 패턴.

**Test scenarios:**
- 각 무기별 동일 6 시나리오 (Happy path / Edge case / Integration).
- Happy path: `compassBlade` Lv.5 → 칼날 3개 동시 회전, 데미지 15.
- Edge case: `umbrellaGuard` 트리거 시 적이 없으면 no-op.
- Integration: `eraserBomb` 폭발 → 반경 안 모든 적에 damage 26 한 번에.
- Verification: 무기 슬롯 4개 차면 신규 무기 카드 표시 안 됨.

**Verification:**
- 세 무기 모두 dev 서버에서 unlock 후 발사·시각 확인. 무기 슬롯 충돌 없음.

---

### U8. Card pool filter + result-screen unlock notification

**Goal:** 카드 풀이 unlock 상태로 필터되고, 결과창에 신규 해금 무기가 1회 표시.

**Requirements:** R4, R5

**Dependencies:** U2, U4, U5, U6, U7

**Files:**
- Modify: `Developer/r3f_prototype/src/lib/upgrades.js` (`isUpgradeAvailable`에 unlock 체크 추가)
- Modify: `Developer/r3f_prototype/src/components/HUD.jsx` (`pickThree` + gameover/cleared modal 알림 블록)
- Test (extend): `Developer/r3f_prototype/src/components/HUD.test.jsx`

**Approach:**
- `isUpgradeAvailable(upgrade, level, weapons, player)`에 4번째 인자로 `unlockedSet` 전달 (또는 `weaponUnlocks.load()` 모듈 호출). `upgrade.kind === 'unlock'`인 카드의 무기 ID가 unlocked가 아니면 `false`.
- starter 무기는 `weaponCatalog.getStarterIds()`로 항상 unlocked 취급.
- `pickThree`는 `isUpgradeAvailable`만 사용하므로 한 곳 변경.
- HUD `gameover` modal (lines 366-395) + `cleared` modal (lines 413-442) 양쪽에 newly-unlocked 블록 삽입. `useGameStore((s) => s.newlyUnlockedWeaponIds)`로 구독.
- 표시 형태:
  ```
  ┌────────────────────────────────┐
  │  🆕 새 무기 해금!                │
  │  나침반 칼날                    │
  │  누적 처치 200마리 달성          │
  │  다음 판부터 카드에 등장          │
  └────────────────────────────────┘
  ```
  (해금 조건 라벨은 `weaponCatalog`에서 노출하거나, 1차안에서는 무기 라벨만 표시하고 조건은 카탈로그에서 lookup)
- styling은 `nextUnlock*` 기존 스타일 재사용.

**Patterns to follow:**
- `HUD.jsx`의 `nextUnlock` 블록 (lines 181-191 + 관련 스타일).
- `HUD.test.jsx`의 `limitPencilUpgradeOptions` 테스트 패턴.

**Test scenarios:**
- Happy path: `weaponUnlocks` 비어 있으면 starter 7종만 카드 풀에 등장 (unlock 카드 모두 제외).
- Happy path: `compassBlade` unlock 후 player Lv.3 이상 → `unlockCompassBlade` 카드가 후보에.
- Edge case: 무기 슬롯 4개 → unlock 카드 전부 제외.
- Edge case: 무기 Lv.5 → 해당 무기 강화 카드 제외 (기존 로직 유지).
- Happy path: `newlyUnlockedWeaponIds: ['compassBlade']` 일 때 gameover modal에 "나침반 칼날 해금!" 텍스트 렌더링.
- Edge case: `newlyUnlockedWeaponIds: []` → 알림 블록 렌더링 안 함.
- Integration: 1런 처치 80 달성 후 gameover → modal에 알림 표시 + 다음 런 시작 후 알림 사라짐.

**Verification:**
- 테스트 그린 + dev 서버에서 unlock 트리거 후 결과창에 정확히 1회 알림 표시.

---

## System-Wide Impact

- **Interaction graph:** `Enemy._enemyDead → store.recordKill → playerRecords.increment` (mid-run). `phase 전이 → _onRunEnd → playerRecords.snapshot + weaponCatalog.evaluateUnlocks + weaponUnlocks.setUnlocked → store.newlyUnlockedWeaponIds → HUD modal` (run-end).
- **Error propagation:** localStorage 부재 환경(jsdom 없는 node 테스트)에서 모든 storage 모듈은 silent no-op. evaluateUnlocks는 입력 sanity check 없이 records를 신뢰 (records 자체가 sanitize됨).
- **State lifecycle risks:** `newlyUnlockedWeaponIds`가 `resetGame()`에서 비워지지 않으면 다음 런 결과창에 stale 알림 표시. resetGame이 책임진다.
- **API surface parity:** 본 플랜이 변경한 카탈로그-주도 `buildInitialWeapons`는 기존 인-런 강화 카드 시스템(`UPGRADE_EFFECTS`)과 동일 인터페이스를 유지해야 한다. `applyUpgradeToWeapon`은 무기 레벨과 stats를 변경하므로, 카탈로그가 강화 카드를 generate해도 결과 weapon 객체 형태는 변하지 않는다.
- **Integration coverage:** Enemy 사망 → kill 카운터 → unlock 평가 → 카드 풀 필터 → 결과창 알림은 unit 테스트만으로 검증 안 됨. dev 서버 수동 검증과 가능하면 1개 통합 테스트 추가.
- **Unchanged invariants:** `MAX_OWNED_WEAPONS = 4`, `MAX_WEAPON_LEVEL = 5`, `STAGE_DURATION_SEC = 300` 모두 유지. `goldTotal` localStorage 키와 passives 키도 별 영향 없음.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 카탈로그-주도 `buildInitialWeapons`로 교체 시 기존 7종 base 스탯이 미세하게 어긋남 (반올림 등) | U2 테스트에 7종 base 스탯이 정확히 현 `BASE_WEAPONS` 값과 일치하는 케이스 추가. might passive Lv.0에서 동일성 검증. |
| 본 런 조건 평가(`runKills: 80`)가 snapshot 직후 cumulative에 합쳐져 더블카운트될 위험 | `_onRunEnd`에서 합본 객체 만들 때 cumulative와 run을 명시적으로 분리해 전달. 테스트에 시나리오 추가. |
| Enemy.jsx 사망 hook이 회귀로 깨질 가능성 (Rapier 콜백 타이밍) | U3 통합 테스트에 sensor-trigger 시퀀스 시뮬레이션 케이스 추가. 변경된 코드 line 주석으로 의도 명시. |
| `guidedMissile`/`starlink`의 1차안 해금 조건이 너무 빨라/느려 카드 풀 등장 시점이 의도와 어긋남 | 메타프로그레션 정본 도입 PR에서 1차안 수치 재조정. 본 플랜에서는 1차안 수치를 `weaponCatalog.js` 한 곳에 모아 둠으로써 1줄 변경 가능. |
| 결과창 알림이 modal layout을 깨거나 button row와 겹침 | `nextUnlock` 블록과 동일 스타일 + 위쪽에만 삽입. 알림 블록 max-height 제한 추가. dev 서버 수동 검증. |
| 카탈로그 변경이 패시브 코인상점(`passiveCatalog.js`)과 충돌 | 둘은 별 카탈로그 (passives vs weapons)라 독립. 단 might passive multiplier가 신규 무기에도 동일 적용되어야 함을 U2/U5/U6/U7 테스트에 명시. |

---

## Phased Delivery

### Phase 1 — 인프라 (U1-U4)

- `playerRecords` + `weaponCatalog` + `weaponUnlocks` 모듈
- store 카운터 + 사망 hook + run-end evaluator
- 이 단계에서 신규 무기 코드는 0줄. 단지 기존 7종을 카탈로그로 옮기고 evaluator가 항상 starter 7종을 unlock으로 반환.
- 통과 기준: `npm test` 그린 + 인-게임 처치 카운트가 결과창 콘솔에서 확인 가능.

### Phase 2 — 복원 (U5-U6)

- `guidedMissile`·`starlink` 컴포넌트 + 카탈로그 entry + 카드 효과 + HUD 아이콘.
- 통과 기준: dev 서버에서 카탈로그 1차안 조건 임시 0으로 낮춰 강제 unlock 후 발사·시각 확인.

### Phase 3 — 확장 + UX (U7-U8)

- `compassBlade`·`umbrellaGuard`·`eraserBomb` 추가.
- 카드 풀 필터 + 결과창 알림.
- 통과 기준: 1런 처치 80 달성 → 결과창에 `compassBlade` 해금 알림 → 다음 런 카드 풀에 등장.

---

## Documentation / Operational Notes

- 본 플랜 산출물 정리는 `/ce-compound`로 1런 처치/생존 → 해금/알림 흐름을 별 learning 문서로 적립.
- `Bang_Rules.md` §5에 `guidedMissile`/`starlink` Lv.5 성장 수치가 historic으로 남아 있다면 본 플랜의 결정 수치(데미지 +6/+10 등)와 동기화. 두 정본 충돌은 본 플랜이 권한.
- `Planner/current_game_rules.md` §6의 "코드 일시 제거 → 복원 필요" 메모는 본 플랜 종료 후 "복원 완료"로 갱신.
- `Planner/Index/planner_documents_by_field_2026-05-14.md` §5 무기 분야 표에 본 플랜 산출물 추가.

---

## Sources & References

- **Origin planner docs:**
  - [`Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_expansion_unlock_plan_2026-05-10.md`](../../Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_expansion_unlock_plan_2026-05-10.md) — 10종 확장안, OR 해금 정책, §3-2 누적 키 스키마, §5 신규 3종 스탯
  - [`Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`](../../Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md) — 9종 정본, §2 카드 등장 레벨, §8 카드 풀 설계
  - [`Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/Weapons_modify.md`](../../Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/Weapons_modify.md) — `guidedMissile` 역할 재정의 (광역 무리 처리)
  - [`Planner/current_game_rules.md`](../../Planner/current_game_rules.md) §6 — 1차 9종 정본 + 복원 메모
  - [`Bang_Rules.md`](../../Bang_Rules.md) §5 — `guidedMissile`/`starlink` historic Lv.1 스탯
- **Institutional learnings:**
  - [`docs/solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md`](../solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md)
  - [`docs/solutions/architecture-patterns/result-gated-passive-shop-flow-2026-05-17.md`](../solutions/architecture-patterns/result-gated-passive-shop-flow-2026-05-17.md)
- **Related code paths:**
  - `Developer/r3f_prototype/src/store/useGameStore.js` (BASE_WEAPONS, gainGold, gainXp, resetGame)
  - `Developer/r3f_prototype/src/lib/upgrades.js` (UPGRADE_EFFECTS, isUpgradeAvailable)
  - `Developer/r3f_prototype/src/components/HUD.jsx` (UPGRADES, pickThree, nextUnlock, modal)
  - `Developer/r3f_prototype/src/components/Enemy.jsx` line 141 (_enemyDead hook)
  - `Developer/r3f_prototype/src/components/Game.jsx` lines 62-68 (weapon mount)
  - `Developer/r3f_prototype/src/lib/passiveUpgrades.js` (forward-compat localStorage pattern)
