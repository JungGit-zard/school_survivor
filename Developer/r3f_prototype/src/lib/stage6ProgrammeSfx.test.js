import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STAGE6_ANNOUNCE_SFX, STAGE6_CELEBRATION_SFX, cueStage6Celebration, cueStage6Programme, resetStage6ProgrammeSfx } from './stage6ProgrammeSfx.js'
import { STAGE6_PROGRAMME } from './stage6Programme.js'
import { subscribeSfx } from './sfxEvents.js'
import { POLYPHONY_COOLDOWN, SOUND_MAP } from './sfxRegistry.js'
import { enemyTypeToCode } from './enemyEntityPool.js'

const DT = 1 / 60
let heard
let unsubscribe

beforeEach(() => {
  heard = []
  resetStage6ProgrammeSfx()
  unsubscribe = subscribeSfx((event) => heard.push(event))
})

afterEach(() => {
  unsubscribe()
  resetStage6ProgrammeSfx()
})

const announces = () => heard.filter((event) => event.id === STAGE6_ANNOUNCE_SFX.id)

function play(gameKey, fromSec, toSec, store = { runKills: 0, bossDefeated: false }, pool = null, stageId = 'stage6') {
  for (let sec = fromSec; sec <= toSec + 1e-9; sec += DT) cueStage6Programme(stageId, gameKey, sec, pool, store)
}

describe('운동회 순서표 안내 방송 — 게임 시계 엣지', () => {
  it('한 판 0~215초: 항목마다 정확히 한 번, rate 3종을 돌려 쓴다', () => {
    play(1, 0, 215)
    expect(announces()).toHaveLength(STAGE6_PROGRAMME.length)
    expect(announces().map((event) => event.rate)).toEqual(STAGE6_PROGRAMME.map((_, i) => STAGE6_ANNOUNCE_SFX.rates[i % 3]))
    expect(new Set(announces().map((event) => event.rate)).size).toBe(3)
  })

  it('시계가 멈춘 동안(일시정지·레벨업·대화 — 같은 초가 반복돼도) 다시 내지 않는다', () => {
    play(1, 0, 6)
    expect(announces()).toHaveLength(1)
    for (let k = 0; k < 600; k += 1) cueStage6Programme('stage6', 1, 6, null, { runKills: 0 })
    expect(announces()).toHaveLength(1)
    play(1, 6, 17)
    expect(announces()).toHaveLength(2) // 내빈 입장 16초
  })

  it('다시 시작하면 첫 항목(개회식 5초)을 빠뜨리지도 두 번 내지도 않는다', () => {
    play(1, 0, 100)
    const before = announces().length
    play(2, 0, 4.9)
    expect(announces()).toHaveLength(before)
    play(2, 4.9, 5.2)
    expect(announces()).toHaveLength(before + 1)
    play(2, 5.2, 15)
    expect(announces()).toHaveLength(before + 1)
  })

  it('같은 gameKey라도 시계가 되감기면 0초부터 다시 센다', () => {
    play(1, 0, 40)
    const before = announces().length
    play(1, 0, 6)
    expect(announces()).toHaveLength(before + 1)
  })

  it('따라잡기로 한 스텝에 여러 항목이 지나가면 마지막 항목만 한 번', () => {
    cueStage6Programme('stage6', 1, 0, null, {})
    cueStage6Programme('stage6', 1, 50, null, {})
    expect(announces()).toHaveLength(1)
  })

  it('스테이지 6이 아니면 아무것도 내지 않는다', () => {
    play(1, 0, 60, undefined, null, 'stage5')
    expect(heard).toHaveLength(0)
  })
})

describe('축하 순간', () => {
  it('공굴리기 대장이 풀에서 사라지면 북 연타 한 번, 교장 처치는 함성 한 번', () => {
    const pool = { active: new Uint8Array(4), type: new Uint8Array(4), highestActive: 0 }
    pool.active[0] = 1
    pool.type[0] = enemyTypeToCode('E104')
    const store = { runKills: 0, bossDefeated: false }
    cueStage6Programme('stage6', 1, 1, pool, store)
    pool.active[0] = 0
    cueStage6Programme('stage6', 1, 1.1, pool, store)
    cueStage6Programme('stage6', 1, 1.2, pool, store)
    store.bossDefeated = true
    cueStage6Programme('stage6', 1, 1.3, pool, store)
    cueStage6Programme('stage6', 1, 1.4, pool, store)
    expect(heard.map((event) => event.id)).toEqual(['stage6DrumRollHit', 'stage6CrowdCheer'])
  })

  it('0.6초 안 4마리 처치면 함성 한 번, 4초 쿨다운, 판 시작 기준선은 지금 처치 수', () => {
    const store = { runKills: 40 }
    cueStage6Programme('stage6', 1, 1, null, store) // 이전 판 처치 수가 남아 있어도 축하하지 않는다
    for (let k = 1; k <= 4; k += 1) { store.runKills += 1; cueStage6Programme('stage6', 1, 1 + k * 0.1, null, store) }
    for (let k = 1; k <= 4; k += 1) { store.runKills += 1; cueStage6Programme('stage6', 1, 2 + k * 0.1, null, store) }
    store.runKills += 4
    cueStage6Programme('stage6', 1, 5.6, null, store)
    expect(heard.filter((event) => event.id === 'stage6CrowdCheer')).toHaveLength(2)
  })

  it('결승 테이프는 호루라기 + 함성', () => {
    expect(cueStage6Celebration('finishTape')).toBe(true)
    expect(cueStage6Celebration('nope')).toBe(false)
    expect(heard.map((event) => event.id)).toEqual(['stage6RelayWhistle', 'stage6CrowdCheer'])
  })
})

describe('등록·음량', () => {
  it('모든 음원이 등록돼 있고 0.22~0.42 음량, 새 음원은 음원 길이 이상 쿨다운', () => {
    const cues = [STAGE6_ANNOUNCE_SFX, ...Object.values(STAGE6_CELEBRATION_SFX).flat()]
    for (const cue of cues) {
      expect(SOUND_MAP[cue.id], cue.id).toBeTruthy()
      expect(cue.volume, cue.id).toBeGreaterThanOrEqual(0.22)
      expect(cue.volume, cue.id).toBeLessThanOrEqual(0.42)
    }
    for (const id of ['stage6ProgAnnounce', 'stage6CrowdCheer', 'stage6DrumRollHit']) {
      expect(SOUND_MAP[id]).toBe(`/sfx/events/${id}.ogg`)
      expect(POLYPHONY_COOLDOWN[id], id).toBeGreaterThanOrEqual(1150)
    }
  })
})
