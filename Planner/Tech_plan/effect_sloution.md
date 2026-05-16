# Effect Solution — 아이템↔효과 매칭 구조

> 게임 내 모든 아이템(적/무기/드랍/이벤트)과 매칭된 VFX 효과를 한 곳에서 관리하는 레지스트리 구조 안내.
> 기반 플랜: `Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md` §4–§6

작성일: 2026-05-10

---

## 1. 레지스트리 정의 (Single Source of Truth)

[src/lib/itemEffects.js](../../Developer/r3f_prototype/src/lib/itemEffects.js)

| 라인 | 심볼 | 역할 |
|---|---|---|
| L18–L40 | `ITEM_EFFECTS` | 모든 아이템↔효과 매핑 테이블. **한눈에 보는 곳** |
| L45 | `triggerItemVfx(itemId, hookName, payload)` | 호출부가 쓰는 단 하나의 진입점 |
| L57 | `getEffectByItem(itemId, hookName?)` | 정방향 조회 (item → effect) |
| L62 | `getItemsByEffectType(vfxType)` | 역방향 조회 (effect → items[]) |
| L73 | `listItemIds()` | 등록된 모든 아이템 키 enumeration (스튜디오용) |

### 데이터 형식

```js
ITEM_EFFECTS = {
  <itemId>: {
    kind:  'enemy' | 'weapon' | 'drop' | 'event',
    hooks: {
      <hookName>: { type: '<vfxType>', ...defaults }
    }
  }
}
```

- **hookName 컨벤션**: `onWarn` / `onHit` / `onSpawn` / `onDeath` / `onPickup` / `onLevelUp`
- **정적 부분**(spec)은 레지스트리에 저장. **동적 페이로드**(x, z, angle, length, life…)는 호출부에서 `triggerItemVfx`에 전달.
- payload가 spec 키와 충돌하면 **payload가 이긴다** (특수 케이스에서 색상 등을 덮어쓰기 위함).

### 등록 예시 (현재)

```js
E05: { kind: 'enemy', hooks: { onWarn: { type: 'chargeWarningLine', color: VFX_COLORS.chargeOrange } } },
B01: { kind: 'enemy', hooks: { onWarn: { type: 'chargeWarningLine', color: VFX_COLORS.dangerRed } } },
```

Weapons / Drops / Events 섹션은 placeholder 주석으로 자리만 잡아둠 — Phase 4 마이그레이션 시점에 채운다.

---

## 2. 현재 소비처 (호출부)

| 위치 | 용도 |
|---|---|
| [src/components/Enemy.jsx:8](../../Developer/r3f_prototype/src/components/Enemy.jsx#L8) | `triggerItemVfx` import |
| [src/components/Enemy.jsx:240](../../Developer/r3f_prototype/src/components/Enemy.jsx#L240) | E05/B01 charge warn 진입 시 트리거 |

향후 wiring 대상(미연결):
- 9개 무기(Weapons.jsx) — `onHit` / 무기별 특수 효과
- 5개 비-charger 적 — `onDeath` 등
- 3개 드랍(textbook / goldCoin / lunchItems) — `onSpawn` (pickupPop)
- 글로벌 이벤트 — `onLevelUp`, `onStageClear`

---

## 3. 관련 인프라 (이미 구축, 변경 없음)

| 파일 | 역할 |
|---|---|
| [src/lib/vfxEvents.js](../../Developer/r3f_prototype/src/lib/vfxEvents.js) | `emitVfx` / `subscribeVfx` 모듈 레벨 이벤트 큐 (레지스트리가 내부적으로 호출) |
| [src/lib/vfxPalette.js](../../Developer/r3f_prototype/src/lib/vfxPalette.js) | `VFX_COLORS` 색상 상수 (레지스트리에서 참조) |
| [src/lib/vfxMath.js](../../Developer/r3f_prototype/src/lib/vfxMath.js) | `easeOutCubic` / `smoothStep` / `fadeAlpha` 헬퍼 |
| [src/components/VFXLayer.jsx](../../Developer/r3f_prototype/src/components/VFXLayer.jsx) | 이벤트 구독 후 실제 mesh 렌더. 현재 렌더러: `hitSpark` / `chargeWarningLine` / `pickupPop` |

상한: `VFXLayer.jsx`의 `MAX_ACTIVE = 80` (Plan §4-3 / §5).
재시작 정리: `gameKey` 증분 시 잔여 이벤트 클리어.

---

## 4. 데이터 흐름

```
게임 컴포넌트(Enemy/Weapon/Drop)
  └─ triggerItemVfx(itemId, hookName, payload)        ← itemEffects.js
         └─ ITEM_EFFECTS[itemId].hooks[hookName]      (정적 spec)
         └─ + payload                                 (동적 좌표/각도/수명)
         └─ emitVfx(merged)                           ← vfxEvents.js
                └─ subscribeVfx 콜백
                       └─ VFXLayer 상태에 push
                              └─ RENDERERS[type]가 실제 mesh 렌더  ← VFXLayer.jsx
```

---

## 5. 새 아이템/효과 추가 절차

1. **효과 타입 자체가 새 종류면**: `VFXLayer.jsx`의 `RENDERERS` 맵에 컴포넌트 등록 + `vfxPalette.js`에 색상 추가.
2. **기존 효과 타입에 새 아이템을 매핑**: `itemEffects.js`의 `ITEM_EFFECTS`에 항목 추가.
3. **호출부**: `triggerItemVfx(itemId, hookName, { x, z, ...dynamic })` 한 줄.

→ 효과/아이템 매핑은 **`itemEffects.js` 한 파일**만 보면 모두 확인 가능.

---

## 6. dev 안전장치

`triggerItemVfx`는 미등록 itemId/hookName 호출 시 dev 모드에서만 콘솔 경고:

```
[itemEffects] no 'onHit' hook on 'pencil'
```

production 빌드에서는 silent. 누락 매핑은 dev 콘솔 모니터로 즉시 검출.

---

## 7. 추후 확장 (스튜디오)

본 문서 v1 시점 미구현. 구현 시:

- `?studio=1` URL 파라미터 또는 dev 전용 라우트
- `listItemIds()` enumerate → 그리드(예: 10×10) 자동 배치
- 셀별로 실제 아이템 메시 + N초 주기로 등록된 hook 자동 트리거
- `getItemsByEffectType('hitSpark')`로 "이 효과를 쓰는 아이템들" 그룹 뷰

새 아이템 등록 시 자동으로 스튜디오에 노출됨 — 효과 누락/시각 어긋남 즉시 발견.

---

## 8. 마이그레이션 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-10 | `itemEffects.js` 신규 생성, `Enemy.jsx`의 `emitVfx({type: 'chargeWarningLine', ...})` 직접 호출을 `triggerItemVfx(type, 'onWarn', {...})`로 마이그레이션. 로컬 `CHARGE_WARN_COLOR` 맵 삭제 → 레지스트리로 이주 |
| 2026-05-10 | **카툰 외곽선 — Stencil Layer 기법 도입**: `toon.js`의 `toonMat`/`outlineMat`에 stencil write/test 추가. 다중 메쉬 모델(플라스크 등)에서 부품 간 seam에 그려지던 내부 외곽선이 사라지고 외곽 silhouette만 남도록 전역 적용 |
| 2026-05-10 | **외곽선 굵기 글로벌 곱수 도입**: `toon.js`에 `OUTLINE_THICKNESS_MULT = 2` + `inflateScale(s)` 헬퍼. 모든 외곽선 메쉬의 scale을 `inflateScale(...)`로 감싸 한 줄로 굵기 일괄 조절 가능 (현재 2배 굵기). 영향: PlayerMesh / ZombieMesh / Enemy / EnemyDeathCollapse / GoldCoin / XpTextbook / LunchItems / Weapons (FlaskModel·Pencil·Tumbler·Bell·Missile·Onigiri·StunGun·Starlink) |

---

## 9. 카툰 외곽선 — Outer Silhouette Only (Stencil Layer)

### 문제

`outlineMat`은 BackSide 인플레이션 헐(inverted hull) 방식. 다중 primitive로 구성된 모델은 부품마다 별도 헐을 만들기 때문에, **부품 사이 경계(seam)에 외곽선이 그려지는** 문제 발생.

예: 플라스크 = body cone + neck cylinder. 두 부품 각각의 인플레이션 헐이 만나는 곳에서 검은 라인이 보임.

### 레퍼런스

- [Delt06/toon-rp Wiki — Inverted Hull Outline](https://github.com/Delt06/toon-rp/wiki/Inverted-Hull-Outline) (Stencil Layer 섹션)
- [discourse.threejs.org — Edge Outline Material Rendering](https://discourse.threejs.org/t/edge-outline-material-rendering/8902)

> *"To prevent drawing them inside geometry, we can enable a certain Stencil Layer for the pass. We also have to set the same layer on the material used by geometry where we do not want inner outlines."* — Delt06 wiki

### 적용한 기법 — Stencil Layer

WebGL 스텐실 버퍼를 이용해 "지오메트리 픽셀에 외곽선을 그리지 않는다"를 강제.

**렌더 순서** (three.js 기본값으로 자동 보장):
1. 불투명(`toonMat`) 지오메트리 먼저 → 자기 픽셀에 `stencil = 1` 기록
2. 반투명(`outlineMat`) 인플레이션 헐 다음 → `stencil != 1`인 픽셀만 그림

**머티리얼 설정** ([src/lib/toon.js](../../Developer/r3f_prototype/src/lib/toon.js)):

```js
const OUTLINE_STENCIL_REF = 1

// 지오메트리: 자기 픽셀에 ref=1 기록 (ZPass 시 Replace)
toonMat:
  stencilWrite = true
  stencilRef   = 1
  stencilFunc  = AlwaysStencilFunc
  stencilZPass = ReplaceStencilOp

// 외곽선 헐: ref=1인 픽셀은 skip (NotEqual 테스트, ZPass=Keep으로 버퍼 변경 없음)
outlineMat:
  stencilWrite = true            // ⚠ three.js에서 이 플래그는 "stencil test enable" 스위치
  stencilRef   = 1
  stencilFunc  = NotEqualStencilFunc
  stencilZPass = KeepStencilOp   // 테스트 통과 시 버퍼 유지(쓰지 않음)
```

### 결과

- 부품 A의 헐이 부품 B의 픽셀에 들어가도 stencil 차단으로 **그려지지 않음** → seam에 검은 라인 사라짐
- 어느 부품의 픽셀도 없는 곳(외곽 빈 공간)에서만 헐이 보임 → **외곽 silhouette만 남음**
- 두 헬퍼만 수정했으므로 `toonMat`/`outlineMat`을 쓰는 **모든 모델**(Player / Zombie / LunchItems / GoldCoin / XpTextbook / Flask / EnemyDeathCollapse 등)에 자동 적용

### 전제 / 제약

- **R3F `<Canvas>`는 기본값으로 stencil 버퍼를 끔.** 반드시 `gl={{ stencil: true }}` 명시 필요. ([src/App.jsx](../../Developer/r3f_prototype/src/App.jsx))
  - 안 켜면 `stencilWrite`/`stencilFunc` 설정이 모두 no-op이 되어 외곽선이 부품마다 따로 그려지는 옛 동작으로 회귀한다 (= 사용자 보고된 "지저분한 외곽선" 증상).
- 매 프레임 stencil clear → 다음 프레임도 동일하게 동작 (three.js `autoClearStencil = true` 기본값).
- toonMat/outlineMat을 거치지 않고 직접 `new THREE.MeshToonMaterial({...})`로 만드는 경우는 이 효과 적용 안 됨 → 가능하면 헬퍼 사용 유지.
- 반투명 toonMat이 stencil을 덮어쓰는 경우는 현재 없음 (모두 불투명). 향후 반투명 토온 머티리얼이 필요하면 stencilWrite 처리 재검토 필요.
- 렌더 큐 순서: three.js는 항상 **opaque → transparent** 순으로 그림. `toonMat`(opaque)가 먼저 stencil=1 기록, `outlineMat`(transparent)가 그 후 NotEqual 테스트. `renderOrder` 값이 다르더라도 큐가 분리되어 있으므로 이 순서는 보장됨.

### 굵기 조절 — `inflateScale` 글로벌 곱수

외곽선 굵기는 인플레이션 헐의 mesh scale 오프셋 `(s - 1)`로 결정됨. 모든 호출부가 `lib/toon.js`의 `inflateScale(s)`을 거쳐 일관된 곱수 `OUTLINE_THICKNESS_MULT`를 적용한다.

```js
// lib/toon.js
export const OUTLINE_THICKNESS_MULT = 2   // ← 한 줄로 전역 굵기 조절

export function inflateScale(s) {
  if (Array.isArray(s)) return s.map(inflateScale)
  return 1 + (s - 1) * OUTLINE_THICKNESS_MULT
}
```

특성:
- `inflateScale(1.08)` → 1.16 (8% 인플레이션 → 16%)
- `inflateScale(1.0)` → 1.0 (스케일 무변화 케이스는 그대로 유지 → 좀비 눈처럼 외곽선 없는 부분 보존)
- `inflateScale([1.12, 1.06, 1.25])` → `[1.24, 1.12, 1.50]` (배열도 자동 처리)

호출부는 outline mesh의 `scale`을 `inflateScale(...)`로 감쌀 것 (직접 곱하지 말 것). 향후 굵기 변경은 상수 한 줄만 수정.
