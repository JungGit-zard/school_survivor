// Stage 6 운동회 순서표 — 순서·빈틈·실제 타임라인 대응(기획서 2번, 2026-11-19).
import { describe, expect, it } from 'vitest'
import { EXPANSION_HAZARDS, EXPANSION_STAGES } from './expansionContent.js'
import {
  STAGE6_CELEBRATION_MOMENTS,
  STAGE6_PROGRAMME,
  STAGE6_PROGRAMME_KINDS,
  getStage6ProgrammeEntriesStartedBetween,
  getStage6ProgrammeState,
  stage6ProgrammeTitle,
} from './stage6Programme.js'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

const S6 = EXPANSION_STAGES.stage6
const H06 = EXPANSION_HAZARDS.H06

describe('STAGE6_PROGRAMME data', () => {
  it('is strictly ordered with unique ids and known kinds', () => {
    const ids = STAGE6_PROGRAMME.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let i = 1; i < STAGE6_PROGRAMME.length; i += 1) {
      expect(STAGE6_PROGRAMME[i].startSec).toBeGreaterThan(STAGE6_PROGRAMME[i - 1].startSec)
    }
    const kinds = new Set(Object.values(STAGE6_PROGRAMME_KINDS))
    STAGE6_PROGRAMME.forEach((entry) => {
      expect(kinds.has(entry.kind)).toBe(true)
      expect(entry.titleKo).toMatch(/[가-힣]/)
      expect(entry.titleEn).toMatch(/^[A-Za-z]/)
    })
  })

  it('covers the run from the first assembly row to the exit with no stretch longer than 30 s', () => {
    expect(STAGE6_PROGRAMME[0].startSec).toBeLessThanOrEqual(10)
    expect(STAGE6_PROGRAMME.at(-1).startSec).toBe(S6.portalSec)
    expect(STAGE6_PROGRAMME.at(-1).kind).toBe(STAGE6_PROGRAMME_KINDS.closing)
    const gaps = STAGE6_PROGRAMME.slice(1).map((entry, i) => entry.startSec - STAGE6_PROGRAMME[i].startSec)
    expect(Math.max(...gaps)).toBeLessThanOrEqual(30)
    // 기획서가 짚은 "스테이지 사건 없는 25~29초 구간" 네 곳(0~29, 33~59, 93~119, 125~150)에 각각 항목이 하나 이상 있다.
    for (const [from, to] of [[0, 29], [33, 59], [93, 119], [125, 150]]) {
      expect(STAGE6_PROGRAMME.some((entry) => entry.startSec >= from && entry.startSec <= to)).toBe(true)
    }
  })

  it('announces only things that really happen at that time in the stage 6 timeline', () => {
    const hazardStarts = []
    for (let t = H06.firstSec; t < H06.endExclusiveSec; t += H06.intervalSec) hazardStarts.push(t)
    STAGE6_PROGRAMME.forEach((entry) => {
      const { source } = entry
      if (source.kind === 'event') {
        expect(S6.events.some((row) => row.sec === entry.startSec && row.type === source.type), `${entry.id} ${source.type}@${entry.startSec}`).toBe(true)
      } else if (source.kind === 'hazard') {
        expect(source.id).toBe('H06')
        expect(hazardStarts).toContain(entry.startSec)
      } else if (source.kind === 'boss') {
        expect(entry.startSec).toBe(S6.bossSec)
        expect(source.type).toBe(S6.bossId)
      } else if (source.kind === 'portal') {
        expect(entry.startSec).toBe(S6.portalSec)
      } else {
        throw new Error(`unknown source kind ${source.kind}`)
      }
    })
  })

  it('names the real signature rows: assembly rows, E104 ball roll, E21 relay, E106 cavalry, B05', () => {
    const at = (id) => STAGE6_PROGRAMME.find((entry) => entry.id === id)
    expect(at('ballRoll')).toMatchObject({ startSec: 72, source: { type: 'E104' } })
    expect(at('cavalry')).toMatchObject({ startSec: 192, source: { type: 'E106' } })
    expect(at('relay')).toMatchObject({ startSec: 124, source: { type: 'E21' } })
    expect(S6.events.find((row) => row.sec === 124 && row.type === 'E21').formation).toBe('track_lanes')
    expect(at('principal')).toMatchObject({ startSec: 150, kind: 'boss' })
    for (const id of ['opening', 'allSchool', 'teamsMarch']) {
      const entry = at(id)
      expect(S6.events.find((row) => row.sec === entry.startSec && row.type === 'E19').formation).toBe('assembly_row')
    }
  })

  it('is frozen data', () => {
    expect(Object.isFrozen(STAGE6_PROGRAMME)).toBe(true)
    expect(Object.isFrozen(STAGE6_PROGRAMME[0])).toBe(true)
    expect(Object.isFrozen(STAGE6_CELEBRATION_MOMENTS.multiKill)).toBe(true)
  })

  it('has ko/en/ja HUD strings matching the data titles', () => {
    STAGE6_PROGRAMME.forEach((entry) => {
      const key = `hud.stage6.programme.${entry.id}`
      expect(ko[key]).toBe(entry.titleKo)
      expect(en[key]).toBe(entry.titleEn)
      expect(ja[key]).toBeTruthy()
    })
    for (const key of ['label', 'ready', 'nextIn', 'announce', 'shout.multiKill', 'shout.chiefDown', 'shout.bossDown']) {
      for (const dict of [ko, en, ja]) expect(dict[`hud.stage6.programme.${key}`], key).toBeTruthy()
    }
  })
})

describe('getStage6ProgrammeState', () => {
  it('before the first item: no current, next = opening', () => {
    const state = getStage6ProgrammeState(0)
    expect(state).toMatchObject({ current: null, index: -1, secondsToNext: 5 })
    expect(state.next.id).toBe('opening')
    expect(getStage6ProgrammeState(Number.NaN).index).toBe(-1)
    expect(getStage6ProgrammeState(-3).index).toBe(-1)
  })

  it('returns the item in progress, the next one, the countdown and progress', () => {
    const state = getStage6ProgrammeState(100)
    expect(state.current.id).toBe('teamsMarch')
    expect(state.next.id).toBe('parade')
    expect(state.secondsToNext).toBeCloseTo(8)
    expect(state.progress).toBeCloseTo(4 / 12)
    expect(getStage6ProgrammeState(72).current.id).toBe('ballRoll') // 경계는 새 항목 쪽
    expect(getStage6ProgrammeState(71.99).current.id).toBe('allSchool')
  })

  it('every second of the run maps to exactly one current item after the opening', () => {
    for (let sec = 5; sec <= 300; sec += 0.5) {
      const { current, next, index } = getStage6ProgrammeState(sec)
      expect(current).toBe(STAGE6_PROGRAMME[index])
      expect(current.startSec).toBeLessThanOrEqual(sec)
      if (next) expect(next.startSec).toBeGreaterThan(sec)
    }
  })

  it('after the closing ceremony the last item stays current with no next', () => {
    expect(getStage6ProgrammeState(260)).toMatchObject({ next: null, secondsToNext: null, progress: 1 })
    expect(getStage6ProgrammeState(260).current.id).toBe('closing')
  })
})

describe('getStage6ProgrammeEntriesStartedBetween', () => {
  it('reports items whose start lies in (prev, now]', () => {
    expect(getStage6ProgrammeEntriesStartedBetween(4.9, 5).map((e) => e.id)).toEqual(['opening'])
    expect(getStage6ProgrammeEntriesStartedBetween(5, 5.1)).toEqual([])
    expect(getStage6ProgrammeEntriesStartedBetween(63, 73).map((e) => e.id)).toEqual(['allSchool', 'ballRoll'])
  })

  it('returns nothing for rewinds or bad input', () => {
    expect(getStage6ProgrammeEntriesStartedBetween(80, 70)).toEqual([])
    expect(getStage6ProgrammeEntriesStartedBetween(Number.NaN, 70)).toEqual([])
  })

  it('fires each item exactly once over a stepped run', () => {
    const fired = []
    for (let sec = 0; sec < 250; sec += 1 / 60) fired.push(...getStage6ProgrammeEntriesStartedBetween(sec, sec + 1 / 60))
    expect(fired.map((e) => e.id)).toEqual(STAGE6_PROGRAMME.map((e) => e.id))
  })
})

describe('stage6ProgrammeTitle', () => {
  it('picks the Korean title for ko and English otherwise', () => {
    expect(stage6ProgrammeTitle(STAGE6_PROGRAMME[0], 'ko')).toBe('개회식')
    expect(stage6ProgrammeTitle(STAGE6_PROGRAMME[0], 'en')).toBe('Opening')
    expect(stage6ProgrammeTitle(null)).toBe('')
  })
})
