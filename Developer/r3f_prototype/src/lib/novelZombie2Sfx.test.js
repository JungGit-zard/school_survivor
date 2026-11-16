import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ENEMY_ABILITY_SFX, NOVEL2_ABILITY_SFX, resetEnemyAbilitySfx } from './enemyAbilitySfx.js'
import { cueNovel2Transitions, resetNovel2Sfx } from './novelZombie2Sfx.js'
import { subscribeSfx } from './sfxEvents.js'
import { POLYPHONY_COOLDOWN, SOUND_MAP } from './sfxRegistry.js'
import { NOVEL2_ROWS, NOVEL2_TYPE_CODES } from './novelZombie2Content.js'
import { N2_STATE_APPROACH, N2_STATE_ATTACK, N2_STATE_TELEGRAPH } from './novelZombie2Behavior.js'

// 종 → 순간 → 음원 id. 바꾸면 이 표도 함께 바꾼다(의도한 변경인지 확인하는 핀).
const EXPECTED = {
  E89: { telegraph: 'stage2GuardWhistle', hit: 'gagMegaphone' },
  E90: { pickup: 'gagCardFlick' },
  E91: { telegraph: 'gagWindup', hit: 'gagChomp' },
  E92: { telegraph: 'gagMegaphone', hit: 'gagSwoosh' },
  E95: { telegraph: 'gagRopeWhirr', hit: 'gagPaintSplat' },
  E98: { telegraph: 'gagWindup', hit: 'gagChomp', gulp: 'gagPotionBlorp' },
  E100: { telegraph: 'gagSplitSquelch', leap: 'gagSwoosh', cling: 'gagPaintSplat' },
  E101: { scan: 'gagRopeWhirr', copy: 'gagBlinkPop', telegraph: 'gagWindup', hit: 'gagCardFlick' },
  E102: { telegraph: 'gagRopeWhirr', glide: 'gagSneakerSqueak' },
  E104: { telegraph: 'gagWindup', roll: 'gagBallThwack', impact: 'gagBallThwack' },
  E106: { telegraph: 'gagWindup', hit: 'gagSwoosh' },
}

let heard
let unsubscribe
let now

beforeEach(() => {
  heard = []
  now = 0
  resetEnemyAbilitySfx({ now: () => now })
  resetNovel2Sfx()
  unsubscribe = subscribeSfx((event) => heard.push(event))
})

afterEach(() => {
  unsubscribe()
  resetEnemyAbilitySfx()
  resetNovel2Sfx()
})

function fakeWorld(slots) {
  const n = 8
  const pool = {
    active: new Uint8Array(n), generation: new Uint16Array(n), type: new Uint8Array(n), state: new Uint8Array(n),
    posX: new Float32Array(n), posZ: new Float32Array(n), highestActive: slots.length - 1,
  }
  const rt = {
    slotGen: new Int32Array(n).fill(-1), bagBooks: new Uint8Array(n), eatCount: new Uint8Array(n), mochiPhase: new Uint8Array(n),
    ballPhase: new Uint8Array(n), copierMode: new Uint8Array(n), cavRole: new Uint8Array(n), cavSolo: new Uint8Array(n),
    copyOwner: new Int16Array(n).fill(-1), ballX: new Float32Array(n), ballZ: new Float32Array(n), ballHits: [],
  }
  slots.forEach((id, index) => {
    pool.active[index] = 1
    pool.generation[index] = 3
    pool.type[index] = NOVEL2_TYPE_CODES[id]
    pool.state[index] = N2_STATE_APPROACH
    rt.slotGen[index] = 3
  })
  return { pool, rt }
}

function frame(world) {
  now += 16
  cueNovel2Transitions(world.pool, world.rt, 0, 0)
}

describe('신규 좀비 2차 신호음 배정', () => {
  it('종 → 순간 → 음원 표가 핀과 같고, 스테이지 1~6 구현 종만 담는다', () => {
    const actual = Object.fromEntries(Object.entries(NOVEL2_ABILITY_SFX)
      .map(([id, moments]) => [id, Object.fromEntries(Object.entries(moments).map(([moment, cue]) => [moment, cue.id]))]))
    expect(actual).toEqual(EXPECTED)
    for (const id of Object.keys(NOVEL2_ABILITY_SFX)) {
      expect(NOVEL2_ROWS[id]?.implemented, id).toBe(true)
      expect(['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'], id).toContain(NOVEL2_ROWS[id].stageId)
      // 시뮬레이션의 novel2 예고 훅이 같은 순간을 한 번 더 울리지 않게 기존 표에는 넣지 않는다.
      expect(ENEMY_ABILITY_SFX[id], id).toBeUndefined()
    }
  })

  it('모든 음원이 등록돼 있고, 무기·피격음보다 조용하며, 새 음원에는 쿨다운이 있다', () => {
    for (const [id, moments] of Object.entries(NOVEL2_ABILITY_SFX)) {
      for (const [moment, cue] of Object.entries(moments)) {
        expect(SOUND_MAP[cue.id], `${id}.${moment}`).toBeTruthy()
        expect(cue.volume, `${id}.${moment}`).toBeLessThanOrEqual(moment === 'telegraph' || moment === 'scan' ? 0.32 : 0.42)
      }
    }
    expect(SOUND_MAP.gagChomp).toBe('/sfx/enemies/gagChomp.ogg')
    expect(POLYPHONY_COOLDOWN.gagChomp).toBeGreaterThanOrEqual(180)
  })
})

describe('엣지에서만 낸다', () => {
  it('E91 미믹: 예고가 여러 프레임 이어져도 예고 1번, 물기 1번', () => {
    const world = fakeWorld(['E91'])
    frame(world)
    world.pool.state[0] = N2_STATE_TELEGRAPH
    for (let k = 0; k < 30; k += 1) frame(world)
    world.pool.state[0] = N2_STATE_ATTACK
    for (let k = 0; k < 30; k += 1) frame(world)
    expect(heard.map((event) => event.id)).toEqual(['gagWindup', 'gagChomp'])
  })

  it('E106 기마전: 기수만 울리고 같은 엣지를 따라 하는 말은 조용하다', () => {
    const world = fakeWorld(['E106', 'E106', 'E106', 'E106'])
    world.rt.cavRole.set([1, 2, 2, 2])
    frame(world)
    for (let index = 0; index < 4; index += 1) world.pool.state[index] = N2_STATE_TELEGRAPH
    frame(world)
    now += 1000
    for (let index = 0; index < 4; index += 1) world.pool.state[index] = N2_STATE_ATTACK
    frame(world)
    expect(heard.map((event) => event.id)).toEqual(['gagWindup', 'gagSwoosh'])
  })

  it('E90 도둑은 가방에 책이 늘 때만, E104 공은 구를 때·멈출 때·좀비를 칠 때', () => {
    const world = fakeWorld(['E90', 'E104'])
    frame(world)
    world.rt.bagBooks[0] = 1
    frame(world)
    now += 1000
    world.rt.ballPhase[1] = 2
    frame(world)
    now += 1000
    world.rt.ballHits.push(5, 1, 60, 1, 1)
    frame(world)
    world.rt.ballHits.length = 0
    now += 1000
    world.rt.ballPhase[1] = 3
    frame(world)
    expect(heard.map((event) => event.id)).toEqual(['gagCardFlick', 'gagBallThwack', 'gagBallThwack', 'gagBallThwack'])
    for (const event of heard) expect(event.volume).toBeLessThanOrEqual(0.42)
  })
})
