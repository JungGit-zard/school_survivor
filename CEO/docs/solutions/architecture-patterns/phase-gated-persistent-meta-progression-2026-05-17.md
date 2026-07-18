---
title: "Phase-gated persistent meta-progression in a Zustand R3F game"
date: 2026-05-17
category: architecture-patterns
module: passive-upgrades
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "Adding any persistent meta-progression (영구 성장 재화/패시브) that survives across runs"
  - "MVP scope is locked smaller than the full design (e.g., 5 of 8 passives, Lv.3 of Lv.5)"
  - "Phase 2 must be reachable by a one-line toggle, not a refactor"
tags: [passive-upgrades, zustand, localstorage, r3f, meta-progression, phase-gating]
related_components: [coin-shop, useGameStore, pickup, weapons]
---

# Phase-gated persistent meta-progression in a Zustand R3F game

## Context

Escape! zombie school은 5분 세션 모바일 서바이버 게임으로, CEO 리뷰가 패시브 카탈로그를 **8종 × Lv.5 → MVP 5종 × Lv.3**으로 축소해 락했다. 구현팀이 다음 두 가지를 동시에 만족해야 했다:

1. MVP만 깔끔하게 출시 — 2차 패시브(armor / cooldown / greed)와 Lv.4–5는 노출 금지.
2. 2차 확장이 코드 리팩터 없이 **한 줄 토글**로 열려야 함.

전형적인 함정은 (a) 5종만 하드코딩해 2차 때 카탈로그·상점·저장 계층 전부 손대거나, (b) 8종 전부 노출하고 UI에서만 비활성화해 저장 데이터가 흐트러지는 것. 두 경로 모두 "MVP 단순성"과 "2차 진입 비용"을 동시에 잃는다.

## Guidance

영구 패시브 시스템은 **4-레이어 분리**로 짠다. 각 레이어가 한 가지만 안다.

```
┌─ Catalog (단일 진실) ─────────────────────────────────────────┐
│ src/lib/passiveCatalog.js                                       │
│  • PASSIVE_CATALOG: 8종 모두 등록, enabled:true|false 플래그    │
│  • BASE_PRICES: [20, 45, 90, 160, 260]  ← Lv.4-5 가격도 미리   │
│  • getMvpPassiveIds() = filter(enabled=true)                    │
│  • getPriceFor(id, nextLevel) → maxLevel 검사 포함             │
└─────────────────────────────────────────────────────────────────┘
              ↓ catalog만 읽음. 데이터 X
┌─ Storage (순수, side-effect 격리) ───────────────────────────┐
│ src/lib/passiveUpgrades.js                                      │
│  • STORAGE_KEY = 'school_survivor:passiveUpgrades'              │
│  • load(): 카탈로그 키만 노출, 미지정 키는 디스크 보존         │
│  • purchase(id, currentGold) → {ok, nextLevel, price, nextGold}│
│    enabled 검사, maxLevel 검사, 잔액 검사 모두 여기서          │
└─────────────────────────────────────────────────────────────────┘
              ↓ Zustand 액션이 호출
┌─ Store integration ────────────────────────────────────────────┐
│ src/store/useGameStore.js                                       │
│  • buildInitialPlayer(levels), buildInitialWeapons(levels)      │
│  • spendGold, purchasePassive, passiveVersion 카운터            │
│  • resetGame()이 매번 fresh load → 런 시작 시점에 적용         │
└─────────────────────────────────────────────────────────────────┘
              ↓ React 컴포넌트가 selector로 읽음
┌─ UI (얇은 표현 레이어) ───────────────────────────────────────┐
│ src/components/CoinShop.jsx                                     │
│  • getMvpPassiveIds()로 카드 리스트 결정 (필터 안 함)          │
│  • 3-상태 버튼: [구매] / [코인 부족] / [최대]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 규칙

1. **카탈로그는 항상 전체 사양을 알고 있다.** MVP만 알지 않는다. 2차 패시브도 `enabled:false`로 등록해 둔다.
2. **저장 계층은 카탈로그를 신뢰한다.** `purchase()`는 `enabled=false`면 `{ok:false, reason:'disabled'}`를 반환. UI가 실수로 호출해도 차단된다.
3. **저장 형식은 forward-compat.** 클라이언트가 모르는 키(`futureKey: 5` 등)는 디스크에 보존하되 `getLevel()`엔 노출하지 않는다. 두 클라이언트 버전이 같은 저장소를 써도 데이터가 깨지지 않는다.
4. **런 시작 시점 1회 적용.** `resetGame()`이 `getAllLevels()`를 다시 읽어 `player`, `weapons`, 마그넷 반경, growth multiplier를 한 번에 빌드. 게임 루프 중에 패시브 값을 다시 읽지 않는다.
5. **UI는 MVP/2차를 분기하지 않는다.** `CoinShop`은 `getMvpPassiveIds()`가 주는 리스트를 그대로 렌더한다 (구매 가능·코인 부족·최대 같은 카드 자체 상태 분기는 별개).

### 사용 규칙 (혼동 차단)

- **`getMvpPassiveIds()` → UI 리스트용.** 상점 카드, 인벤토리 화면, 도감 등 사람이 볼 리스트는 반드시 이걸 사용. `enabled=false` 패시브는 자동 제외.
- **`getAllLevels()` → 런 시작 효과 적용용.** `resetGame()` 안에서 `buildInitialPlayer`, `buildInitialWeapons`, magnet 갱신에만 호출. 디스에이블 키도 0으로 포함하므로 (그리고 과거 빌드가 저장한 값이 있을 수 있어) 디스플레이에 쓰면 잠긴 패시브가 새어 나간다.

### 부수 효과 위치 — 마그넷 풀 반경 (모듈 싱글톤)

`pickup.js`의 `_pullRadius` / `_pullRadiusSq`는 모듈 레벨 mutable. `setMagnetMultiplier(mult)`가 둘을 동시에 갱신한다. **제약**:

- 한 번에 한 게임 인스턴스만 동작하는 단일 브라우저 탭 환경에서만 안전.
- 테스트 격리: 마그넷 의존 테스트는 `beforeEach`에서 `setMagnetMultiplier(1)` 호출 필수 (스위트 간 누수 방지).
- SSR/prerender 컨텍스트에는 `pickup.js`를 import하지 말 것 (요청 간 상태 공유 위험).
- 동시 두 게임 인스턴스 시나리오(리플레이, 핫 리로드 엣지 케이스)는 깨진다.

지금은 의도된 단순화. 위 시나리오가 생기면 모듈 싱글톤을 store 슬라이스로 옮기면 된다.

### 2차 확장 진입 비용 (정확한 그림)

**카탈로그 enabled 한 줄로 열리는 것**:
- 상점 카드 3개 추가 노출 (UI 코드 변경 0)
- `purchase('armor', ...)` 호출 통과 (저장 계층 변경 0)
- 카탈로그 가격·라벨 즉시 적용 (가격 테이블 변경 0)

```js
// passiveCatalog.js
armor:    { ..., enabled: true },   // false → true
cooldown: { ..., enabled: true },
greed:    { ..., enabled: true },
```

Lv.5까지 풀려면 한 줄 더: `maxLevel: 3 → 5`. `BASE_PRICES`에 인덱스 3, 4 이미 있어 가격 테이블도 그대로.

**여기서 끝나지 않는다 — 2차 패시브의 효과 적용 코드는 여전히 작성해야 한다.** 카탈로그 토글이 끝이 아니라 시작점이다:

- `armor` → `damagePlayer`에서 `Math.max(1, amount - armorLevel)` 추가
- `cooldown` → 무기 cooldown 읽는 곳에서 `cooldown * (1 - 0.03·Lv)` 적용
- `greed` → `gainGold`에서 `amount * (1 + 0.05·Lv)` 적용

세 곳 모두 Phase 1 코드에 `// PHASE_2_APPLY` 마커를 남겨 둔다. 토글이 카드 노출만 처리하고 게임 스탯은 별개로 손대야 한다는 사실이 문서·코드·리뷰에서 한꺼번에 보이게.

**정직한 한 줄 요약**: "UI 노출·저장·가격은 토글, 게임 스탯은 작성." 두 박자다, 한 박자가 아니다.

## Why This Matters

같은 게임에서 두 가지 영구 진척 시스템(영구 패시브 + 결과화면→상점→재진입 흐름)이 동시에 들어가면 다음 함정이 흔하다:

1. **저장 형식 락인.** 5종 형태로 저장됐다가 2차 때 8종으로 바뀌면 마이그레이션 필요 → 보통 안 하고 그냥 reset 시키며 유저 손해.
2. **UI 분기.** MVP/2차를 UI에서 분기 처리하면 2차 출시 때 UI 코드도 손대야 하고, 새 패시브 추가 = UI 변경. 5분 게임에 비싸다.
3. **가격 곡선 재작성.** Lv.3 락이 가격을 다시 그리도록 강요하면, Lv.4-5 확장 때 또 가격 다시 그린다. 가격은 게임 경제 핵심이라 재작성 시 QA 다시 돈다.

이 패턴이 위 셋을 차단한다. 저장은 forward-compat, UI는 카탈로그 신뢰, 가격은 전체 그리고 컷오프만 변경.

또한 **CEO 락 범위를 코드 구조로 강제**한다. 만약 누군가 "그냥 armor도 같이 넣자"고 해도 `enabled:false` 한 줄을 토글해야 하므로, 그 결정이 코드 리뷰에서 명시적으로 보인다. 의도치 않은 범위 확장이 일어나지 않는다.

## When to Apply

- 영구 진척 카탈로그가 명시적으로 단계 분리되었을 때 (MVP / Phase 2 / Later 형태로 락된 경우).
- 같은 카탈로그가 여러 표시 모드를 가질 때 (예: 잠긴 상태로 보이기 / 완전 숨김).
- 저장 데이터가 두 클라이언트 버전 사이를 오갈 가능성이 있을 때 (모바일 자동 업데이트 환경).
- 게임 루프 중간이 아니라 **런 시작 1회 적용**이 자연스러운 영구 성장 (Vampire Survivors 계열의 "PowerUps").

다음 경우엔 과한 분리:
- 런 중간에 동적으로 변하는 일회성 스탯 (이건 `useGameStore`의 인-런 `applyUpgrade()`로 충분).
- 카탈로그가 5개 미만이고 영구 단계가 1단계라 phase 게이팅이 의미 없는 경우.

## Examples

### 카탈로그 — 8종 전체 등록, enabled로 컷오프

```js
// src/lib/passiveCatalog.js
export const PASSIVE_CATALOG = {
  magnet:    { id:'magnet',    label:'회수 반경', perLevel:8, priceMultiplier:1.0,  maxLevel:3, enabled:true  },
  moveSpeed: { id:'moveSpeed', label:'이동속도', perLevel:3, priceMultiplier:1.1,  maxLevel:3, enabled:true  },
  maxHp:     { id:'maxHp',     label:'체력',     perLevel:6, priceMultiplier:1.0,  maxLevel:3, enabled:true  },
  might:     { id:'might',     label:'공격력',   perLevel:4, priceMultiplier:1.25, maxLevel:3, enabled:true  },
  growth:    { id:'growth',    label:'학습력',   perLevel:5, priceMultiplier:1.1,  maxLevel:3, enabled:true  },
  armor:     { id:'armor',     label:'방어력',   perLevel:1, priceMultiplier:1.0,  maxLevel:3, enabled:false },
  cooldown:  { id:'cooldown',  label:'손놀림',   perLevel:3, priceMultiplier:1.25, maxLevel:3, enabled:false },
  greed:     { id:'greed',     label:'저금통',   perLevel:5, priceMultiplier:1.1,  maxLevel:3, enabled:false },
}

export const BASE_PRICES = [20, 45, 90, 160, 260]  // Lv.4-5 가격도 미리

const MVP_ORDER = ['magnet','moveSpeed','maxHp','might','growth']
export function getMvpPassiveIds() {
  return MVP_ORDER.filter(id => PASSIVE_CATALOG[id]?.enabled)
}
```

### 저장 — forward-compat + enabled 가드

```js
// src/lib/passiveUpgrades.js
export function purchase(id, currentGold) {
  if (!isValidPassiveId(id)) return { ok:false, reason:'unknownId' }
  const entry = PASSIVE_CATALOG[id]
  if (!entry.enabled) return { ok:false, reason:'disabled' }
  const nextLevel = getLevel(id) + 1
  if (nextLevel > entry.maxLevel) return { ok:false, reason:'maxLevel' }
  const price = getPriceFor(id, nextLevel)
  if (currentGold < price) return { ok:false, reason:'insufficient', price }
  persist(id, nextLevel)  // 미지정 키는 readRaw → merge → writeRaw로 보존
  return { ok:true, nextLevel, price, nextGold: currentGold - price }
}
```

### 적용 — 런 시작 1회

```js
// src/store/useGameStore.js
resetGame: () => {
  const levels = getAllLevels()
  applyMagnetPassive(levels)  // pickup.js의 mutable 반경 갱신
  set((s) => ({
    player: buildInitialPlayer(levels),        // maxHp, moveSpeed 흡수
    weapons: buildInitialWeapons(levels),      // might × damage
    growthMultiplier: buildGrowthMultiplier(levels),  // gainXp에서 곱함
    // ...
  }))
}
```

### UI — 카탈로그 신뢰, 분기 없음

```jsx
// src/components/CoinShop.jsx
const ids = getMvpPassiveIds()  // 2차 토글 시 자동으로 8개 반환
return ids.map(id => <PassiveCard ... />)
```

### 검증 — 매 레이어 단위 테스트

- `passiveCatalog.test.js` — 가격 공식, maxLevel 차단, MVP 필터링
- `passiveUpgrades.test.js` — round-trip, 잔액 부족, 최대레벨, disabled 차단, **미지정 키 보존**
- `pickup.test.js` — 자석 배율 → 반지름² 계산
- `useGameStore.passives.test.js` — 런 시작 시 maxHp/moveSpeed/might/growth 적용

```
Test Files  8 passed (8)
     Tests  54 passed (54)
```

## Cleanups applied (2026-05-18, post Phase 3 review)

ce-compound Phase 3 리뷰어가 짚은 항목 중 본 패턴 정합성에 가까운 4건을 같이 정리했다:

1. ✅ `passiveCatalog.js`의 `formatEffectLabel` 안 dead `sign` 삼항(`'+' : '+'`) 제거.
2. ✅ `passiveUpgrades.js`의 `purchase()`에서 도달 불가한 `noPrice` 분기 제거. 대신 `BASE_PRICES.length >= max(maxLevel)` 인바리언트를 주석으로 명시.
3. ✅ `passiveUpgrades.js`의 `load()` ↔ `getAllLevels` alias를 `getAllLevels` 하나로 통일. 테스트도 함께 업데이트.
4. ✅ `BASE_PRICES`를 `[20, 45, 90]`로 축소. Lv.4-5 가격은 phase 2 토글 시점에 `[160, 260]` 이어 붙이도록 주석에 명시. 본 문서 "2차 확장 진입 비용" 절도 이 그림과 일치.

테스트 9 파일 / 57 케이스 모두 통과 (Lv.4-5 가격 검사가 없으므로 BASE_PRICES 축소 영향 없음).

## Related

- 본 프로젝트의 `Planner/Index/compound_engineering_folder_structure_2026-05-16.md` — 컴파운드 엔지니어링 폴더 구조 정책
- `Planner/Essential_game_plan/passive_upgrade_catalog_plan_2026-05-17.md` — 원본 8종 × Lv.5 카탈로그 기획
- `CEO/ceo_review_passive_upgrade_catalog_2026-05-17.md` — MVP 락(5종 × Lv.3) 결정 근거
- `CEO/product_manager_review_passive_upgrade_catalog_2026-05-17.md` — PM 미결 사항(armor 잠금 표시 vs 숨김, coin = goldTotal 환산)
