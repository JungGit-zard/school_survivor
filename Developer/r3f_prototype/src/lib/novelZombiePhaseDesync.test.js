import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  EnemyEntityPool,
  NOVEL_CYCLE_PHASE_SPREAD_MS,
  NOVEL_SPAWN_PHASE_SPREAD_MS,
  getNovelCyclePhaseOffsetMs,
  getNovelSpawnPhaseOffsetMs,
  isNovelPhaseTypeCode,
  novelPhaseFraction,
} from './enemyEntityPool.js'
import {
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_MS,
  createEnemySimulationRuntime,
} from './enemySimulation.js'
import { NOVEL_TYPE_MAX, NOVEL_TYPE_MIN } from './novelZombieBehavior.js'
import { POSED_ZOMBIE_TYPES } from '../components/ZombieMesh.jsx'

const BOUNDS = { halfX: 9.36, halfZ: 16 }
// 플레이어 무적 520ms. 같은 프레임에 몰린 히트는 하나만 남고 나머지는 버려지므로,
// "마릿수가 늘어도 압력이 안 늘던" 결함은 raw 접촉 합이 아니라 **이 적용 피해**에서 드러난다.
const IFRAME_MS = 520

// formation 'ring' 재현 — 거리까지 균등해서 동기가 절대 깨지지 않는 최악 조건이다.
function appliedDps(type, count, { seconds = 60, ring = 2.0 } = {}) {
  const pool = new EnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  for (let k = 0; k < count; k += 1) {
    const angle = (k / count) * Math.PI * 2
    pool.spawn({
      type,
      x: Math.cos(angle) * ring,
      y: 0,
      z: Math.sin(angle) * ring,
      hp: 1e9,
      maxHp: 1e9,
      visualScale: ENEMY_SIZE_MULTIPLIER,
      spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1,
    })
  }
  const delta = 1 / 60
  const frames = Math.round(seconds / delta)
  const hits = []
  let applied = 0
  let iframe = 0
  for (let frame = 0; frame < frames; frame += 1) {
    iframe = Math.max(0, iframe - delta * 1000)
    hits.length = 0
    runtime.step(pool, {
      delta,
      playerX: 0,
      playerZ: 0,
      ...BOUNDS,
      elapsedSec: 10 + frame * delta,
      activeProjectileCount: 0,
      onContact: (_i, _g, _x, _y, _z, value) => { hits.push(value) },
    })
    for (const value of hits) {
      if (iframe <= 0) {
        applied += value
        iframe = IFRAME_MS
      }
    }
  }
  return applied / seconds
}

describe('위상 오프셋 헬퍼는 결정론적이다', () => {
  it('Math.random을 쓰지 않고 슬롯 index만으로 재현된다', () => {
    // 위상 헬퍼 구간만 본다(파일 다른 곳의 기존 Math.random 사용은 내 변경이 아니다).
    const source = fs.readFileSync(new URL('./enemyEntityPool.js', import.meta.url), 'utf8')
    const start = source.indexOf('const NOVEL_PHASE_TYPE_MIN')
    const end = source.indexOf('export class EnemyEntityPool')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(source.slice(start, end)).not.toContain('Math.random')
    for (let index = 0; index < 64; index += 1) {
      expect(getNovelSpawnPhaseOffsetMs(index)).toBe(getNovelSpawnPhaseOffsetMs(index))
      expect(getNovelCyclePhaseOffsetMs(index)).toBe(getNovelCyclePhaseOffsetMs(index))
    }
  })

  it('슬롯 0의 오프셋은 정확히 0이라 1기 측정이 수정 전과 같다', () => {
    expect(novelPhaseFraction(0)).toBe(0)
    expect(getNovelSpawnPhaseOffsetMs(0)).toBe(0)
    expect(getNovelCyclePhaseOffsetMs(0)).toBe(0)
  })

  it('위상이 [0, spread) 안에 머물고 인접 슬롯끼리 뭉치지 않는다', () => {
    const fractions = []
    for (let index = 0; index < 32; index += 1) {
      const fraction = novelPhaseFraction(index)
      expect(fraction).toBeGreaterThanOrEqual(0)
      expect(fraction).toBeLessThan(1)
      expect(getNovelSpawnPhaseOffsetMs(index)).toBeLessThan(NOVEL_SPAWN_PHASE_SPREAD_MS)
      expect(getNovelCyclePhaseOffsetMs(index)).toBeLessThan(NOVEL_CYCLE_PHASE_SPREAD_MS)
      fractions.push(fraction)
    }
    // 황금비 저불일치 수열: 연속 슬롯이 서로 충분히 떨어진다.
    for (let index = 1; index < fractions.length; index += 1) {
      expect(Math.abs(fractions[index] - fractions[index - 1])).toBeGreaterThan(0.2)
    }
  })

  it('신규 12종 코드 구간만 대상으로 삼는다', () => {
    expect(NOVEL_TYPE_MIN).toBe(37)
    expect(NOVEL_TYPE_MAX).toBe(48)
    expect(POSED_ZOMBIE_TYPES).toHaveLength(NOVEL_TYPE_MAX - NOVEL_TYPE_MIN + 1)
    for (let code = 0; code <= 60; code += 1) {
      expect(isNovelPhaseTypeCode(code)).toBe(code >= NOVEL_TYPE_MIN && code <= NOVEL_TYPE_MAX)
    }
  })

  it('호출자가 attackCooldown을 명시하면 그 값이 그대로 보존된다', () => {
    const pool = new EnemyEntityPool()
    const handle = pool.spawn({ type: 'E34', x: 0, y: 0, z: 0, hp: 1, maxHp: 1, attackCooldown: 77 })
    expect(pool.attackCooldown[handle.index]).toBe(77)
  })

  it('기존 타입은 위상 오프셋을 받지 않는다 (스테이지 1~4 밸런스 불변)', () => {
    const pool = new EnemyEntityPool()
    for (const type of ['E01', 'E02', 'E03', 'E05', 'E07']) {
      const handle = pool.spawn({ type, x: 0, y: 0, z: 0, hp: 1, maxHp: 1 })
      expect(pool.attackCooldown[handle.index], type).toBe(0)
    }
  })
})

describe('동일 종 N기가 마릿수만큼 압력을 올린다 (ring 편대 최악 조건)', () => {
  // 결함 당시 실측: 12종 전부 3기·4기의 적용 dps가 1기와 **완전히 동일**했다.
  it.each(POSED_ZOMBIE_TYPES)('%s: 4기가 1기보다 강하다', (type) => {
    const one = appliedDps(type, 1)
    const four = appliedDps(type, 4)
    expect(one).toBeGreaterThan(0)
    // 수정 전에는 four === one 이었다(비율 1.00).
    expect(four, `${type} 1기=${one.toFixed(2)} 4기=${four.toFixed(2)}`).toBeGreaterThan(one * 1.05)
  })

  it.each(POSED_ZOMBIE_TYPES)('%s: 3기가 1기보다 약하지 않다', (type) => {
    const one = appliedDps(type, 1)
    const three = appliedDps(type, 3)
    expect(three, `${type} 1기=${one.toFixed(2)} 3기=${three.toFixed(2)}`).toBeGreaterThanOrEqual(one)
  })

  it('ring 편대에서 상태 위상이 실제로 흩어진다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const count = 4
    for (let k = 0; k < count; k += 1) {
      const angle = (k / count) * Math.PI * 2
      pool.spawn({
        type: 'E42',
        x: Math.cos(angle) * 2,
        y: 0,
        z: Math.sin(angle) * 2,
        hp: 1e9,
        maxHp: 1e9,
        visualScale: ENEMY_SIZE_MULTIPLIER,
        spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1,
      })
    }
    const delta = 1 / 60
    let framesWithMixedState = 0
    for (let frame = 0; frame < 60 * 60; frame += 1) {
      runtime.step(pool, {
        delta, playerX: 0, playerZ: 0, ...BOUNDS,
        elapsedSec: 10 + frame * delta, activeProjectileCount: 0, onContact: () => {},
      })
      const states = new Set()
      for (let k = 0; k < count; k += 1) states.add(pool.state[k])
      if (states.size > 1) framesWithMixedState += 1
    }
    // 수정 전에는 네 기가 항상 같은 상태라 0프레임이었다.
    expect(framesWithMixedState).toBeGreaterThan(60 * 60 * 0.5)
  })
})

describe('가독성 계약과 불변식은 그대로다', () => {
  it('위상 오프셋은 예고 길이를 건드리지 않는다', () => {
    const behaviorSource = fs.readFileSync(new URL('./novelZombieBehavior.js', import.meta.url), 'utf8')
    const simulationSource = fs.readFileSync(new URL('./enemySimulation.js', import.meta.url), 'utf8')
    // 오프셋은 attackCooldown(= 다음 주기 시작 시각)에만 더해진다.
    expect(simulationSource).toContain('pool.attackCooldown[index] += getNovelCyclePhaseOffsetMs(index)')
    expect(simulationSource).not.toMatch(/telegraphMs\s*[*+-]/)
    // 예고 길이 정본은 그대로 p.telegraphMs 한 곳에서만 읽힌다.
    expect(behaviorSource).toContain('pool.stateTimer[index] = p.telegraphMs')
    // levelmini 불변식 5의 입력(trigger/reach/contactDist)에 손대지 않았다.
    expect(simulationSource).not.toContain('p.trigger')
  })

  it('12종 전원 1기 dps가 0보다 크다 (불변식 5 회귀 방지)', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      expect(appliedDps(type, 1, { seconds: 20 }), type).toBeGreaterThan(0)
    })
  })
})
