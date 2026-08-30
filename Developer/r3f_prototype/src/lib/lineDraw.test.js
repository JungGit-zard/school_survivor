import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, enemyPool } from './refs.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable } from './upgrades.js'
import {
  applyLineDrawStrike,
  buildCutLine,
  canCutEntity,
  createLineDrawRuntime,
  doesMovementCrossLine,
  pruneExpiredCutLines,
  rotateLineDrawFacing90,
  segmentsIntersect,
  spawnCutLine,
  updateCutLineCrossings,
} from './lineDraw.js'

const noSight = () => false
const wpn = (over = {}) => ({ active: false, level: 0, ...over })

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
})

function spawnPooled(x, z) {
  const hit = vi.fn(() => true)
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 999, maxHp: 999 })
  enemyPool.setHitHandler(handle, hit)
  return { handle, hit }
}

function moveTo(handle, x, z) {
  enemyPool.posX[handle.index] = x
  enemyPool.posZ[handle.index] = z
}

// +x 방향으로 (0,0) → (6,0) 절단선 하나만 깔린 런타임.
function runtimeWithLine({ nowMs = 0, durationMs = 2000 } = {}) {
  const runtime = createLineDrawRuntime()
  spawnCutLine(runtime, {
    origin: { x: 0, z: 0 },
    facing: { x: 1, z: 0 },
    range: 6,
    nowMs,
    durationMs,
  })
  return runtime
}

function tick(runtime, nowMs, over = {}) {
  return updateCutLineCrossings(runtime, { nowMs, sightBlocker: noSight, ...over })
}

describe('선긋기 카탈로그 정본', () => {
  it('기획 §2 확정 스탯을 그대로 담는다', () => {
    const b = WEAPON_CATALOG.lineDraw.base
    expect(b).toMatchObject({
      damage: 20,
      cooldown: 4200,
      range: 6.0,
      width: 0.22,
      knockback: 0,
      critChance: 0.35,
      critMultiplier: 2.0,
      lineDurationMs: 2000,
      lineCrossDamage: 14,
      lineCrossCooldownMs: 600,
    })
    expect(WEAPON_CATALOG.lineDraw.label).toBe('선긋기')
    expect(WEAPON_CATALOG.lineDraw.minLevelToAppear).toBe(8)
  })

  // 기획 초안의 pierce: Infinity는 쓸 수 없다. gameplaySoak.js:208이 "무기 스탯은 전부 유한수"를
  // 요구해 카드 획득 즉시 터지고(실측: seed 1 frame 225 "무기 lineDraw pierce 비유한값"),
  // JSON.stringify도 Infinity를 null로 떨어뜨린다. 999로 낮췄고 그 상태를 여기서 고정한다.
  it('base 스탯은 전부 유한수다 — Infinity는 소크 불변식과 JSON 양쪽에서 깨진다', () => {
    const b = WEAPON_CATALOG.lineDraw.base
    expect(b.pierce).toBe(999)
    for (const [field, value] of Object.entries(b)) {
      if (typeof value === 'number') expect(Number.isFinite(value), field).toBe(true)
    }
    expect(JSON.parse(JSON.stringify(b))).toEqual(b)
  })
})

describe('절단선 선분 구성과 수명', () => {
  it('런타임 선긋기 방향은 플레이어 진행 방향에서 정확히 시계방향 90도로 회전한다', () => {
    expect(rotateLineDrawFacing90({ x: 0, z: 1 })).toEqual({ x: 1, z: -0 })
    expect(rotateLineDrawFacing90({ x: 1, z: 0 })).toEqual({ x: 0, z: -1 })

    const line = buildCutLine({ origin: { x: 2, z: 1 }, facing: rotateLineDrawFacing90({ x: 0, z: 3 }), range: 6, nowMs: 100, durationMs: 2000 })
    expect(line.ax).toBe(2)
    expect(line.az).toBe(1)
    expect(line.bx).toBeCloseTo(8, 10)
    expect(line.bz).toBeCloseTo(1, 10)
  })

  it('플레이어 발밑에서 전방으로 range만큼 뻗는다', () => {
    const line = buildCutLine({ origin: { x: 2, z: 1 }, facing: { x: 0, z: 3 }, range: 6, nowMs: 100, durationMs: 2000 })
    expect(line.ax).toBe(2)
    expect(line.az).toBe(1)
    expect(line.bx).toBeCloseTo(2, 10)
    expect(line.bz).toBeCloseTo(7, 10) // facing이 정규화되므로 길이는 정확히 range
    expect(line.expiresMs).toBe(2100)
  })

  it('만료된 선만 걷어내고 그 목록을 돌려준다', () => {
    const runtime = createLineDrawRuntime()
    spawnCutLine(runtime, { origin: { x: 0, z: 0 }, facing: { x: 1, z: 0 }, range: 6, nowMs: 0, durationMs: 2000 })
    spawnCutLine(runtime, { origin: { x: 0, z: 0 }, facing: { x: 0, z: 1 }, range: 6, nowMs: 1500, durationMs: 2000 })

    expect(pruneExpiredCutLines(runtime, 1900)).toEqual([])
    expect(runtime.lines).toHaveLength(2)

    const expired = pruneExpiredCutLines(runtime, 2000)
    expect(expired).toHaveLength(1)
    expect(expired[0].startMs).toBe(0)
    expect(runtime.lines).toHaveLength(1)
  })
})

// ── 이 무기의 핵심 사양 ──────────────────────────────────────────────────────
describe('선분 교차 판정 — 가로지른 것만 잘린다', () => {
  const line = { ax: 0, az: 0, bx: 6, bz: 0 }

  it('선을 가로지르는 이동은 교차로 친다', () => {
    expect(doesMovementCrossLine({ x: 2, z: -1 }, { x: 2, z: 1 }, line)).toBe(true)
    expect(doesMovementCrossLine({ x: 2, z: 1 }, { x: 2, z: -1 }, line)).toBe(true) // 반대 방향도 동일
    expect(doesMovementCrossLine({ x: 1, z: -0.5 }, { x: 3, z: 0.5 }, line)).toBe(true) // 비스듬한 횡단
  })

  it('선 위에 가만히 서 있는 적은 교차가 아니다 (장판이 아니다)', () => {
    // 이동 선분 길이가 0이라 어떤 선과도 교차하지 않는다.
    expect(doesMovementCrossLine({ x: 2, z: 0 }, { x: 2, z: 0 }, line)).toBe(false)
    expect(doesMovementCrossLine({ x: 0, z: 0 }, { x: 0, z: 0 }, line)).toBe(false)
    expect(doesMovementCrossLine({ x: 6, z: 0 }, { x: 6, z: 0 }, line)).toBe(false)
  })

  it('선을 따라 나란히 미끄러지는 이동(공선)도 교차가 아니다', () => {
    expect(doesMovementCrossLine({ x: 1, z: 0 }, { x: 4, z: 0 }, line)).toBe(false)
    expect(doesMovementCrossLine({ x: 1, z: 2 }, { x: 4, z: 2 }, line)).toBe(false) // 평행
  })

  it('선 옆을 스치기만 하고 넘지 않은 이동은 교차가 아니다', () => {
    expect(doesMovementCrossLine({ x: 2, z: -2 }, { x: 2, z: -0.2 }, line)).toBe(false)
    // 선분 바깥(x > 6)에서 z를 넘어도 절단선 밖이라 안 맞는다.
    expect(doesMovementCrossLine({ x: 7, z: -1 }, { x: 7, z: 1 }, line)).toBe(false)
  })

  it('segmentsIntersect는 길이 0·평행 선분을 모두 false로 돌린다', () => {
    const a = { x: 0, z: 0 }
    const b = { x: 6, z: 0 }
    expect(segmentsIntersect(a, a, a, b)).toBe(false)
    expect(segmentsIntersect({ x: 0, z: 1 }, { x: 6, z: 1 }, a, b)).toBe(false)
    expect(segmentsIntersect({ x: 3, z: -1 }, { x: 3, z: 1 }, a, b)).toBe(true)
  })
})

describe('잔류 절단선 통과 판정 (EntityPool 실물)', () => {
  it('선을 가로지른 적만 lineCrossDamage를 받는다', () => {
    const runtime = runtimeWithLine()
    const crosser = spawnPooled(2, -1)

    expect(tick(runtime, 0)).toBe(0) // 첫 프레임은 직전 위치가 없어 판정하지 않는다
    moveTo(crosser.handle, 2, 1)
    expect(tick(runtime, 16)).toBe(1)

    expect(crosser.hit).toHaveBeenCalledTimes(1)
    expect(crosser.hit.mock.calls[0][0]).toBe(WEAPON_CATALOG.lineDraw.base.lineCrossDamage)
  })

  it('선 위에 가만히 서 있기만 한 적은 몇 프레임이 지나도 맞지 않는다', () => {
    const runtime = runtimeWithLine()
    const stander = spawnPooled(2, 0) // 절단선 바로 위

    for (const t of [0, 16, 32, 48, 64, 500, 1200]) expect(tick(runtime, t)).toBe(0)
    expect(stander.hit).not.toHaveBeenCalled()
  })

  it('넉백 0으로 들어간다 — 자를 대고 그은 직선이라 밀리지 않는다', () => {
    const runtime = runtimeWithLine()
    const crosser = spawnPooled(2, -1)
    tick(runtime, 0)
    moveTo(crosser.handle, 2, 1)
    tick(runtime, 16)

    expect(crosser.hit.mock.calls[0][1]).toMatchObject({ knockback: 0, knockbackMs: 0 })
  })

  it('절단선이 만료되면 더 이상 아무도 잘리지 않는다', () => {
    const runtime = runtimeWithLine({ nowMs: 0, durationMs: 2000 })
    const crosser = spawnPooled(2, -1)
    tick(runtime, 0)

    pruneExpiredCutLines(runtime, 2000)
    moveTo(crosser.handle, 2, 1)
    expect(tick(runtime, 2016)).toBe(0)
    expect(crosser.hit).not.toHaveBeenCalled()
  })

  it('여러 선을 한 프레임에 동시에 넘어도 절단은 1회다', () => {
    const runtime = runtimeWithLine()
    // 같은 자리에 선을 하나 더 겹쳐 긋는다(쿨다운 감소로 선이 겹치는 상황).
    spawnCutLine(runtime, { origin: { x: 0, z: 0 }, facing: { x: 1, z: 0 }, range: 6, nowMs: 0, durationMs: 2000 })
    const crosser = spawnPooled(2, -1)

    tick(runtime, 0)
    moveTo(crosser.handle, 2, 1)
    expect(tick(runtime, 16)).toBe(1)
    expect(crosser.hit).toHaveBeenCalledTimes(1)
  })
})

describe('lineCrossCooldownMs — 같은 적 재절단 간격', () => {
  it('쿨다운 안에 다시 넘으면 무시되고, 지나면 다시 잘린다', () => {
    const cooldownMs = WEAPON_CATALOG.lineDraw.base.lineCrossCooldownMs
    expect(cooldownMs).toBe(600)

    const runtime = runtimeWithLine({ durationMs: 10_000 })
    const crosser = spawnPooled(2, -1)

    tick(runtime, 0)
    moveTo(crosser.handle, 2, 1)
    expect(tick(runtime, 16)).toBe(1) // 1회차 절단

    moveTo(crosser.handle, 2, -1)
    expect(tick(runtime, 300)).toBe(0) // 300 - 16 = 284ms < 600ms → 무시
    moveTo(crosser.handle, 2, 1)
    expect(tick(runtime, 500)).toBe(0) // 여전히 쿨다운 안

    moveTo(crosser.handle, 2, -1)
    expect(tick(runtime, 700)).toBe(1) // 700 - 16 = 684ms ≥ 600ms → 다시 잘린다

    expect(crosser.hit).toHaveBeenCalledTimes(2)
  })

  it('canCutEntity는 직전 절단 기록이 없으면 항상 허용한다', () => {
    expect(canCutEntity(undefined, 0, 600)).toBe(true)
    expect(canCutEntity({ lastCutMs: NaN }, 0, 600)).toBe(true)
    expect(canCutEntity({ lastCutMs: 0 }, 599, 600)).toBe(false)
    expect(canCutEntity({ lastCutMs: 0 }, 600, 600)).toBe(true)
  })

  it('죽어서 사라진 적의 추적 항목은 다음 프레임에 자동으로 사라진다', () => {
    const runtime = runtimeWithLine()
    const enemy = spawnPooled(2, -1)
    tick(runtime, 0)
    expect(runtime.tracked.size).toBe(1)

    enemyPool.despawn(enemy.handle)
    tick(runtime, 16)
    expect(runtime.tracked.size).toBe(0)
  })
})

describe('긋는 순간의 직격 (통과 절단과 별개 판정)', () => {
  it('선상의 적 전원이 관통 제한 없이 damage를 즉시 받는다', () => {
    const a = spawnPooled(1, 0)
    const b = spawnPooled(3, 0)
    const c = spawnPooled(5, 0)
    const off = spawnPooled(3, 3) // 선 밖

    const hits = applyLineDrawStrike({
      origin: { x: 0, z: 0 },
      facing: { x: 1, z: 0 },
      range: 6,
      width: 0.22,
      damage: 20,
      knockback: 0,
      sightBlocker: noSight,
    })

    expect(hits).toBe(3)
    for (const e of [a, b, c]) {
      expect(e.hit).toHaveBeenCalledTimes(1)
      expect(e.hit.mock.calls[0][0]).toBe(20)
      expect(e.hit.mock.calls[0][1]).toMatchObject({ knockback: 0 })
    }
    expect(off.hit).not.toHaveBeenCalled()
  })

  it('직격은 이동 여부와 무관하다 — 선 위에 가만히 서 있어도 맞는다', () => {
    const stander = spawnPooled(2, 0)
    expect(applyLineDrawStrike({
      origin: { x: 0, z: 0 }, facing: { x: 1, z: 0 }, range: 6, width: 0.22, damage: 20, sightBlocker: noSight,
    })).toBe(1)
    expect(stander.hit).toHaveBeenCalledTimes(1)
  })
})

describe('선긋기 획득 카드 등장 조건 (requiresActiveWeapons 복수형)', () => {
  it('자와 커터칼 둘 다를 요구하고 계정 해금은 요구하지 않는다', () => {
    expect(UPGRADE_EFFECTS.acquireLineDraw).toEqual({
      weapon: 'lineDraw',
      kind: 'acquire',
      minLevel: 8,
      requiresActiveWeapons: ['schoolBag', 'boxCutter'],
      skipAccountUnlock: true,
    })
  })

  it('자만 보유 false / 커터칼만 보유 false / 둘 다 보유 true', () => {
    const rulerOnly = { schoolBag: wpn({ active: true, level: 1 }), boxCutter: wpn(), lineDraw: wpn() }
    const cutterOnly = { schoolBag: wpn(), boxCutter: wpn({ active: true, level: 1 }), lineDraw: wpn() }
    const neither = { schoolBag: wpn(), boxCutter: wpn(), lineDraw: wpn() }
    const both = {
      schoolBag: wpn({ active: true, level: 1 }),
      boxCutter: wpn({ active: true, level: 1 }),
      lineDraw: wpn(),
    }

    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, neither)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, rulerOnly)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, cutterOnly)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, both)).toBe(true)
  })

  it('둘 다 보유해도 Lv.8 미만이면 등장하지 않는다', () => {
    const both = {
      schoolBag: wpn({ active: true, level: 1 }),
      boxCutter: wpn({ active: true, level: 1 }),
      lineDraw: wpn(),
    }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 7, both)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, both)).toBe(true)
  })

  it('이미 획득했으면 다시 나오지 않는다', () => {
    const owned = {
      schoolBag: wpn({ active: true, level: 1 }),
      boxCutter: wpn({ active: true, level: 1 }),
      lineDraw: wpn({ active: true, level: 1 }),
    }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireLineDraw, 8, owned)).toBe(false)
  })

  it('강화 카드 3종은 선긋기 보유 시에만 뜬다', () => {
    const base = WEAPON_CATALOG.lineDraw.base
    const owned = { lineDraw: wpn({ active: true, level: 1, ...base }) }
    const notOwned = { lineDraw: wpn({ active: false, ...base }) }

    for (const key of ['lineDrawDamage', 'lineDrawDuration', 'lineDrawCrit']) {
      expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], 8, notOwned)).toBe(false)
      expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], 8, owned)).toBe(true)
    }
  })

  it('절단선 지속 강화는 4000ms 상한에서 멈춘다', () => {
    const capped = { lineDraw: wpn({ active: true, level: 1, lineDurationMs: 4000 }) }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.lineDrawDuration, 8, capped)).toBe(false)
  })
})

// 복수형을 새로 넣으면서 기존 단수형이 죽지 않았는지 확인한다. 하나코(치비코 선행)와
// 바이키티 커터칼(커터칼 선행)이 단수형의 유일한 사용처다.
describe('회귀 — 단수형 requiresActiveWeapon은 그대로 동작한다', () => {
  it('하나코는 치비코 보유 여부만 본다', () => {
    expect(UPGRADE_EFFECTS.acquireHanako.requiresActiveWeapon).toBe('chibiko')
    expect(UPGRADE_EFFECTS.acquireHanako.requiresActiveWeapons).toBeUndefined()

    const without = { chibiko: wpn(), hanako: wpn() }
    const with_ = { chibiko: wpn({ active: true, level: 1 }), hanako: wpn() }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireHanako, 8, without)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireHanako, 8, with_)).toBe(true)
  })

  it('바이키티 커터칼은 커터칼 보유 여부만 본다', () => {
    expect(UPGRADE_EFFECTS.acquireBikittyCutter.requiresActiveWeapon).toBe('boxCutter')
    expect(UPGRADE_EFFECTS.acquireBikittyCutter.requiresActiveWeapons).toBeUndefined()

    const without = { boxCutter: wpn(), bikittyCutter: wpn() }
    const with_ = { boxCutter: wpn({ active: true, level: 1 }), bikittyCutter: wpn() }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, without)).toBe(false)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireBikittyCutter, 6, with_)).toBe(true)
  })

  it('단수형과 복수형이 한 카드에 함께 있으면 둘 다 만족해야 한다', () => {
    const effect = {
      weapon: 'lineDraw',
      kind: 'acquire',
      requiresActiveWeapon: 'chibiko',
      requiresActiveWeapons: ['schoolBag', 'boxCutter'],
      skipAccountUnlock: true,
    }
    const partial = {
      chibiko: wpn({ active: true, level: 1 }),
      schoolBag: wpn({ active: true, level: 1 }),
      boxCutter: wpn(),
      lineDraw: wpn(),
    }
    const full = { ...partial, boxCutter: wpn({ active: true, level: 1 }) }
    expect(isUpgradeAvailable(effect, 8, partial)).toBe(false)
    expect(isUpgradeAvailable(effect, 8, full)).toBe(true)
  })
})
