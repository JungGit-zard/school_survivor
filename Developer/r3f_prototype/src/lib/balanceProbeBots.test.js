import { describe, expect, it } from 'vitest'
import {
  BOT_IDLE,
  BOT_KITE,
  BOT_KITE_DODGE,
  botSpecLabel,
  createBot,
  decideBotMove,
  DODGE_REACTION_MS,
  kiteVariantSpecs,
  orbitDirection,
  PERSONAL_SPACE,
  PERSONAL_SPACE_GAIN,
  PORTAL_MODE_REFUSE,
  WALL_MARGIN,
} from './balanceProbeBots.js'

function fakePool(points) {
  return {
    highestActive: points.length - 1,
    active: points.map(() => 1),
    posX: points.map((p) => p[0]),
    posZ: points.map((p) => p[1]),
  }
}

function world(overrides = {}) {
  return {
    nowMs: 0,
    player: { x: 0, z: 0 },
    pool: fakePool([]),
    specials: [],
    telegraphs: [],
    portal: { active: false, x: 0, z: 0 },
    suction: false,
    moveBounds: { minX: -9, maxX: 9, minZ: -13, maxZ: 13 },
    ...overrides,
  }
}

describe('balanceProbeBots', () => {
  it('KITE 변형은 반경 3·4·6u × 시계·반시계 6개다', () => {
    const specs = kiteVariantSpecs()
    expect(specs).toHaveLength(6)
    expect(new Set(specs.map(botSpecLabel)).size).toBe(6)
    expect(specs.map((s) => s.radius).sort()).toEqual([3, 3, 4, 4, 6, 6])
    expect(specs.filter((s) => s.direction === -1)).toHaveLength(3)
  })

  it('원 선회: 반경 위에서는 순수 접선, 방향 부호가 회전 방향을 정한다', () => {
    const out = { x: 0, z: 0 }
    orbitDirection(out, { x: 4, z: 0 }, { x: 0, z: 0 }, 4, 1)
    expect(out.x).toBeCloseTo(0, 6)
    expect(out.z).toBeCloseTo(1, 6) // 반시계: +x 위치에서 +z로
    orbitDirection(out, { x: 4, z: 0 }, { x: 0, z: 0 }, 4, -1)
    expect(out.z).toBeCloseTo(-1, 6)
    orbitDirection(out, { x: 1, z: 0 }, { x: 0, z: 0 }, 4, 1)
    expect(out.x).toBeGreaterThan(0) // 반경 안쪽이면 바깥으로 벌어진다
  })

  it('KITE는 무리 중심 기준으로 돌고, 붙은 적에게서는 밀려난다', () => {
    const bot = createBot({ kind: BOT_KITE, radius: 4, direction: 1 })
    const out = { x: 0, z: 0 }
    expect(decideBotMove(bot, world({ player: { x: 4, z: 0 }, pool: fakePool([[0, 0]]) }), out)).toBe('orbit')
    expect(out.z).toBeGreaterThan(0.9)
    decideBotMove(bot, world({ player: { x: 4, z: 0 }, pool: fakePool([[0, 0], [4, 0.5]]) }), out)
    expect(out.z).toBeLessThan(0) // 바로 위(+z 0.5u)에 붙은 적을 피해 아래로
  })

  it('KITE_DODGE는 예고를 본 뒤 250ms가 지나야 직각으로 피한다', () => {
    const bot = createBot({ kind: BOT_KITE_DODGE, radius: 4, direction: 1 })
    expect(bot.reactionMs).toBe(DODGE_REACTION_MS)
    const telegraph = { id: 't1', kind: 'line', x: -3, z: 0.1, dirX: 1, dirZ: 0, length: 8, halfWidth: 0.5 }
    const out = { x: 0, z: 0 }
    const base = { player: { x: 0, z: 0 }, pool: fakePool([[-5, 0]]), telegraphs: [telegraph] }
    expect(decideBotMove(bot, world({ ...base, nowMs: 1000 }), out)).toBe('orbit')
    expect(decideBotMove(bot, world({ ...base, nowMs: 1240 }), out)).toBe('orbit')
    expect(decideBotMove(bot, world({ ...base, nowMs: 1251 }), out)).toBe('dodge')
    expect(Math.abs(out.z)).toBeGreaterThan(0.9) // 선(+x 방향)에 직각
    expect(out.z).toBeLessThan(0) // 플레이어는 선 축보다 아래(-z)에 있으므로 아래로 빠진다
    // 예고가 사라지면 원 복귀, 다시 나타나면 새 예고로 250ms를 다시 잰다.
    expect(decideBotMove(bot, world({ ...base, telegraphs: [], nowMs: 1300 }), out)).toBe('orbit')
    expect(decideBotMove(bot, world({ ...base, nowMs: 1400 }), out)).toBe('orbit')
  })

  it('KITE는 예고를 보지 않는다', () => {
    const bot = createBot({ kind: BOT_KITE, radius: 4, direction: 1 })
    const telegraph = { id: 't1', kind: 'circle', x: 0, z: 0, radius: 2 }
    const out = { x: 0, z: 0 }
    expect(decideBotMove(bot, world({ telegraphs: [telegraph], nowMs: 5000, pool: fakePool([[-4, 0]]) }), out)).toBe('orbit')
  })

  it('포탈 개방 후 rush 봇은 포탈로, refuse 봇은 계속 돌며 포탈을 피한다', () => {
    const out = { x: 0, z: 0 }
    const portal = { active: true, x: 5, z: 0 }
    const rush = createBot({ kind: BOT_KITE, radius: 4, direction: 1 })
    expect(decideBotMove(rush, world({ portal }), out)).toBe('portal')
    expect(out.x).toBeCloseTo(1, 6)
    const refuse = createBot({ kind: BOT_KITE, radius: 4, direction: 1, portalMode: PORTAL_MODE_REFUSE })
    expect(decideBotMove(refuse, world({ portal, player: { x: 4.5, z: 0 }, pool: fakePool([[0, 0]]) }), out)).toBe('orbit')
    expect(out.x).toBeLessThan(0) // 포탈(+x) 반대쪽으로 밀린다
    const idle = createBot({ kind: BOT_IDLE })
    expect(decideBotMove(idle, world(), out)).toBe('idle')
    expect(decideBotMove(idle, world({ portal }), out)).toBe('portal')
    expect(decideBotMove(idle, world({ portal, suction: true }), out)).toBe('hold')
  })

  it('KITE 거리 유지 상수는 고정이다(바꾸면 기준선을 새로 잰다). 개인 공간은 최소 선회 반경보다 작다', () => {
    expect([PERSONAL_SPACE, PERSONAL_SPACE_GAIN, WALL_MARGIN]).toEqual([1.6, 1.2, 1.5])
    expect(PERSONAL_SPACE).toBeLessThan(Math.min(...kiteVariantSpecs().map((s) => s.radius)))
  })

  it('포탈로 갈 때도 같은 거리 유지: 길 위에 붙은 적을 비켜 간다', () => {
    const out = { x: 0, z: 0 }
    const rush = createBot({ kind: BOT_KITE, radius: 4, direction: 1 })
    decideBotMove(rush, world({ portal: { active: true, x: 6, z: 0 }, pool: fakePool([[0.6, 0.3]]) }), out)
    expect(out.z).toBeLessThan(0)
  })

  it('고정 환경 위험(압력솥)은 KITE·IDLE·포탈 이동 모두 피한다', () => {
    const hazards = [{ id: 'c', kind: 'circle', x: 0, z: 0, radius: 3.2 }]
    const out = { x: 0, z: 0 }
    for (const spec of [{ kind: BOT_KITE, radius: 4, direction: 1 }, { kind: BOT_IDLE }]) {
      expect(decideBotMove(createBot(spec), world({ hazards, player: { x: 1, z: 0 } }), out)).toBe('hazard')
      expect(out.x).toBeGreaterThan(0.9)
    }
    expect(decideBotMove(createBot({ kind: BOT_IDLE }), world({ hazards, player: { x: 1, z: 0 }, portal: { active: true, x: -5, z: 0 } }), out)).toBe('hazard')
  })
})
