import { describe, expect, it } from 'vitest'
import {
  B02_BLOCKADE_DAMAGE,
  B02_BLOCKADE_TELEGRAPH_MS,
  B02_BLOCKADE_STUN_MS,
  createB02CorridorBlockadeState,
  getB02CorridorBlockadeTrigger,
  advanceB02CorridorBlockade,
  consumeB02CorridorBlockadeHit,
  isPlayerInsideB02BlockadeLine,
  getB02CorridorBlockadeLineZs,
} from './b02CorridorBlockade.js'

describe('B02 복도 봉쇄선', () => {
  it('70%와 35% 임계치를 각 런에서 한 번씩만, 200초 전 chase 상태에서 시작한다', () => {
    const empty = createB02CorridorBlockadeState()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.71, elapsedMs: 199_999, chargeState: 'chase', state: empty })).toBeNull()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, elapsedMs: 199_999, chargeState: 'warn', state: empty })).toBeNull()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, elapsedMs: 200_000, chargeState: 'chase', state: empty })).toBeNull()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, elapsedMs: 199_999, chargeState: 'chase', state: empty })).toBe('seventy')

    const afterSeventy = { ...empty, triggeredSeventy: true }
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.34, elapsedMs: 199_999, chargeState: 'chase', state: afterSeventy })).toBe('thirtyFive')
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.20, elapsedMs: 199_999, chargeState: 'chase', state: { ...afterSeventy, triggeredThirtyFive: true } })).toBeNull()
  })

  it('1.2초 예고 뒤 세 통제선을 순서대로 활성화하고 1.2초 경직으로 끝낸다', () => {
    let state = createB02CorridorBlockadeState({ phase: 'telegraph', lineZs: [-4, 0, 4] })
    state = advanceB02CorridorBlockade(state, B02_BLOCKADE_TELEGRAPH_MS)
    expect(state.phase).toBe('active')
    expect(state.activeLineIndex).toBe(0)
    state = advanceB02CorridorBlockade(state, 1_500)
    expect(state.phase).toBe('stun')
    state = advanceB02CorridorBlockade(state, B02_BLOCKADE_STUN_MS)
    expect(state.phase).toBe('idle')
  })

  it('활성 통제선은 복도 폭 전체이며 한 시전에서 피해는 18 한 번만 허용한다', () => {
    expect(B02_BLOCKADE_DAMAGE).toBe(18)
    expect(isPlayerInsideB02BlockadeLine({ playerZ: 0.5, lineZ: 0, lineWidth: 1.2 })).toBe(true)
    expect(isPlayerInsideB02BlockadeLine({ playerZ: 0.61, lineZ: 0, lineWidth: 1.2 })).toBe(false)

    const active = {
      ...createB02CorridorBlockadeState({ phase: 'active', lineZs: [0, 3.6, 7.2] }),
      activeLineIndex: 0,
    }
    const firstHit = consumeB02CorridorBlockadeHit(active, 0)
    expect(firstHit.damage).toBe(18)
    expect(firstHit.state.damagedPlayer).toBe(true)
    expect(consumeB02CorridorBlockadeHit(firstHit.state, 0).damage).toBe(0)
  })

  it('보스가 복도 양 끝에 있어도 세 통제선은 서로 겹치지 않고 안전 간격을 유지한다', () => {
    for (const [bossZ, playerZ] of [[-18.5, -18.9], [18.5, 18.9]]) {
      const lineZs = getB02CorridorBlockadeLineZs({ bossZ, playerZ, halfZ: 19.2 })
      expect(new Set(lineZs).size).toBe(3)
      for (const z of lineZs) expect(Math.abs(z)).toBeLessThan(19.2)
      for (let index = 1; index < lineZs.length; index += 1) {
        expect(Math.abs(lineZs[index] - lineZs[index - 1])).toBeCloseTo(3.6, 8)
      }
    }
  })
})
