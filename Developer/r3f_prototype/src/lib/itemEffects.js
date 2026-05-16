// 게임 내 모든 아이템(적/무기/드랍/이벤트)과 매칭된 VFX 효과를 등록하는 단일 레지스트리.
// 호출부는 triggerItemVfx(itemId, hookName, payload) 한 줄로 효과를 발사하고,
// 어떤 효과를 누가 어떤 시점에 쓰는지는 이 파일만 보면 알 수 있다.
// 근거: Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md §4–§6

import { emitVfx } from './vfxEvents.js'
import { VFX_COLORS } from './vfxPalette.js'

// 항목 형식
//   <itemId>: {
//     kind:  'enemy' | 'weapon' | 'drop' | 'event',
//     hooks: {
//       <hookName>: { type: '<vfxType>', ...defaults }   // VFXLayer 이벤트의 정적 부분
//     }
//   }
// hookName 컨벤션: onWarn / onHit / onSpawn / onDeath / onPickup / onLevelUp
// 동적 페이로드(x, z, angle, length, ...)는 호출부에서 triggerItemVfx에 넘긴다.
export const ITEM_EFFECTS = {
  // ── Enemies ───────────────────────────────────────────────────────────
  E05: {
    kind: 'enemy',
    hooks: {
      onWarn: { type: 'chargeWarningLine', color: VFX_COLORS.chargeOrange },
    },
  },
  B01: {
    kind: 'enemy',
    hooks: {
      onWarn: { type: 'chargeWarningLine', color: VFX_COLORS.dangerRed },
    },
  },

  // ── Weapons ───────────────────────────────────────────────────────────
  // (Phase 4 마이그레이션 시점에 pencil/stunGun/onigiri 등 등록)

  // ── Drops ─────────────────────────────────────────────────────────────
  // (pickupPop wiring 시점에 textbook/goldCoin 등 등록)

  // ── Events ────────────────────────────────────────────────────────────
  // (levelUp/stageClear 같은 글로벌 이벤트 등록)
}

// 효과 발사. spec(레지스트리 정적값) + payload(호출부 동적값) → emitVfx.
// payload가 spec 키와 충돌하면 payload가 이긴다(특수 케이스에서 색상 등을 덮어쓰기 위해).
export function triggerItemVfx(itemId, hookName, payload = {}) {
  const spec = ITEM_EFFECTS[itemId]?.hooks?.[hookName]
  if (!spec) {
    if (import.meta.env?.DEV) {
      console.warn(`[itemEffects] no '${hookName}' hook on '${itemId}'`)
    }
    return
  }
  emitVfx({ ...spec, ...payload })
}

// 직접 조회: 아이템 → 효과.
export const getEffectByItem = (itemId, hookName) =>
  hookName ? ITEM_EFFECTS[itemId]?.hooks?.[hookName] : ITEM_EFFECTS[itemId]

// 역조회: 특정 vfx type을 사용하는 모든 (item, hook) 쌍.
// 향후 스튜디오 씬에서 "이 효과를 쓰는 아이템들" 그리드 렌더에 사용.
export function getItemsByEffectType(vfxType) {
  const out = []
  for (const [itemId, item] of Object.entries(ITEM_EFFECTS)) {
    for (const [hookName, spec] of Object.entries(item.hooks ?? {})) {
      if (spec.type === vfxType) out.push({ itemId, hookName, kind: item.kind })
    }
  }
  return out
}

// 등록된 모든 itemId 목록(스튜디오 그리드 enumeration용).
export const listItemIds = () => Object.keys(ITEM_EFFECTS)
