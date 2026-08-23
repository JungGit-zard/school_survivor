import { describe, expect, it } from 'vitest'
import {
  B02_BLOCKADE_DAMAGE,
  B02_BLOCKADE_TELEGRAPH_MS,
  B02_BLOCKADE_ACTIVE_MS,
  B02_BLOCKADE_STUN_MS,
  createB02CorridorBlockadeState,
  getB02CorridorBlockadeTrigger,
  advanceB02CorridorBlockade,
  consumeB02CorridorBlockadeHit,
  isPlayerInsideB02BlockadeLine,
  getB02CorridorBlockadeLineZs,
} from './b02CorridorBlockade.js'

describe('B02 복도 봉쇄선', () => {
  it('70%와 35% 임계치를 각 런에서 한 번씩만, chase 상태에서 시작한다', () => {
    const empty = createB02CorridorBlockadeState()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.71, chargeState: 'chase', state: empty })).toBeNull()
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, chargeState: 'warn', state: empty })).toBeNull()
    // 경과 시간은 더 이상 시전을 막지 않는다 — HP 임계에 닿으면 무조건 발현한다.
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, elapsedMs: 600_000, chargeState: 'chase', state: empty })).toBe('seventy')
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.70, chargeState: 'chase', state: empty })).toBe('seventy')

    const afterSeventy = { ...empty, triggeredSeventy: true }
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.34, elapsedMs: 199_999, chargeState: 'chase', state: afterSeventy })).toBe('thirtyFive')
    expect(getB02CorridorBlockadeTrigger({ hpRatio: 0.20, elapsedMs: 199_999, chargeState: 'chase', state: { ...afterSeventy, triggeredThirtyFive: true } })).toBeNull()
  })

  it('1.2초 예고 → 1.5초 동시 활성 → 1.2초 경직으로 끝난다', () => {
    let state = createB02CorridorBlockadeState({ phase: 'telegraph', lineZs: [-3, 3] })
    state = advanceB02CorridorBlockade(state, B02_BLOCKADE_TELEGRAPH_MS)
    expect(state.phase).toBe('active')
    state = advanceB02CorridorBlockade(state, B02_BLOCKADE_ACTIVE_MS - 1)
    expect(state.phase).toBe('active')
    state = advanceB02CorridorBlockade(state, 1)
    expect(state.phase).toBe('stun')
    state = advanceB02CorridorBlockade(state, B02_BLOCKADE_STUN_MS)
    expect(state.phase).toBe('idle')
    expect(state.lineZs).toEqual([])
  })

  it('선을 밟으면 18을 맞고, 같은 선 위에서 비벼도 연타당하지 않는다', () => {
    expect(B02_BLOCKADE_DAMAGE).toBe(18)
    expect(isPlayerInsideB02BlockadeLine({ playerZ: 0.5, lineZ: 0, lineWidth: 1.2 })).toBe(true)
    expect(isPlayerInsideB02BlockadeLine({ playerZ: 0.61, lineZ: 0, lineWidth: 1.2 })).toBe(false)

    const active = createB02CorridorBlockadeState({ phase: 'active', lineZs: [-3, 3] })
    const first = consumeB02CorridorBlockadeHit(active, -3)
    expect(first.damage).toBe(18)
    expect(first.state.damagedLines).toEqual([true, false])
    expect(consumeB02CorridorBlockadeHit(first.state, -3).damage).toBe(0)
  })

  it('보스 영역을 넘어 들어갔다 나오면 선마다 한 번씩 두 번 맞는다', () => {
    // 들어갈 때 뒤쪽 선, 나올 때 앞쪽 선 — 시전 최대 피해는 36이다.
    let state = createB02CorridorBlockadeState({ phase: 'active', lineZs: [-3, 3] })
    const entering = consumeB02CorridorBlockadeHit(state, -3)
    state = entering.state
    expect(consumeB02CorridorBlockadeHit(state, 0).damage).toBe(0)  // 안쪽은 안전
    const leaving = consumeB02CorridorBlockadeHit(state, 3)
    expect(entering.damage + leaving.damage).toBe(B02_BLOCKADE_DAMAGE * 2)
    expect(leaving.state.damagedLines).toEqual([true, true])
  })

  it('선은 보스 앞뒤 3.0에 하나씩 놓이고, 복도 밖으로 나가는 선은 버린다', () => {
    expect(getB02CorridorBlockadeLineZs({ bossZ: 0, halfZ: 19.2 })).toEqual([-3, 3])
    expect(getB02CorridorBlockadeLineZs({ bossZ: 5, halfZ: 19.2 })).toEqual([2, 8])

    // 복도 끝에 몰리면 바깥으로 나가는 선 하나가 사라지고, 남은 선은 항상 경계 안이다.
    for (const bossZ of [-18.5, 18.5]) {
      const lineZs = getB02CorridorBlockadeLineZs({ bossZ, halfZ: 19.2 })
      expect(lineZs.length).toBe(1)
      for (const z of lineZs) expect(Math.abs(z)).toBeLessThan(19.2)
    }
  })
})
