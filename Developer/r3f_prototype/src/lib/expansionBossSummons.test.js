// B05 '운동장 10바퀴' 소환 타이머(스펙 Part C C-6-4).
import { describe, expect, it } from 'vitest'
import { EXPANSION_BOSSES } from './expansionContent.js'
import { createBossSummonState, getBossSummonWarning, publishBossSummonWarning, stepBossSummon } from './expansionBossSummons.js'

const SUMMON = EXPANSION_BOSSES.B05.summon

// 보스 150초 등장 → 매 프레임 deltaMs씩 진행하며 (경과초 = 150 + age) 시각에 일어난 warn/fire를 모은다.
function run(seconds, { enrageAtSec = Infinity, enrageMs = 1500, playingUntil = Infinity } = {}) {
  const state = createBossSummonState(SUMMON)
  const events = []
  const dt = 1000 / 60
  for (let ms = dt; ms <= seconds * 1000 + 1e-6; ms += dt) {
    const sec = 150 + ms / 1000
    const enraged = sec >= enrageAtSec
    const enrageDone = enraged && sec >= enrageAtSec + enrageMs / 1000
    const r = stepBossSummon(state, SUMMON, { deltaMs: dt, playing: sec < playingUntil, enraged, enrageDone })
    if (r.warn) events.push(['warn', Math.round(sec * 10) / 10])
    if (r.fire) events.push(['fire', Math.round(sec * 10) / 10])
  }
  return { events, state }
}

describe('stepBossSummon', () => {
  it('데이터: E21×6 track_lanes, 경고 1.2초, 첫 12초, 30초 간격, 2페이즈 25초, 격노 즉시', () => {
    expect(SUMMON).toMatchObject({ type: 'E21', count: 6, formation: 'track_lanes', warningMs: 1200, firstDelayMs: 12000, intervalMs: 30000, phase2IntervalMs: 25000, summonOnEnrage: true })
  })

  it('150초 등장 보스는 162초에 첫 소환(160.8초 경고), 이후 192·222초', () => {
    const { events } = run(80)
    expect(events).toEqual([['warn', 160.8], ['fire', 162], ['warn', 190.8], ['fire', 192], ['warn', 220.8], ['fire', 222]])
  })

  it('격노 전환이 시작되면 경고, 전환(1.5초)이 끝나는 순간 1회 즉시 소환, 이후 25초 간격', () => {
    const { events } = run(60, { enrageAtSec: 170 })
    expect(events).toEqual([['warn', 160.8], ['fire', 162], ['warn', 170], ['fire', 171.5], ['warn', 195.3], ['fire', 196.5]])
  })

  it('정지(playing false) 중에는 진행하지 않는다', () => {
    const paused = run(40, { playingUntil: 155 })
    expect(paused.events).toEqual([])
    expect(paused.state.ageMs).toBeGreaterThan(4950)
    expect(paused.state.ageMs).toBeLessThanOrEqual(5000)
  })

  it('HUD 배너용 경고 발행은 버전이 오른다', () => {
    const before = getBossSummonWarning().version
    publishBossSummonWarning(3, 'B05')
    expect(getBossSummonWarning()).toMatchObject({ version: before + 1, gameKey: 3, bossType: 'B05' })
  })
})
