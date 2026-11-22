import { describe, expect, it } from 'vitest'
import { WAVE_SPECIAL_ROLE, WAVE_STANDARD } from './waveStandard.js'
import {
  WAVE_SPECIAL_HP_MUL_MAX, WAVE_SPECIAL_SCALE_MUL, createWaveComposer, getStageWave, hasWaveStandard, isWaveExemptType,
  noteWaveSpawn, pickWaveType, waveClassOf, waveIndexAt,
} from './waveComposition.js'
import { getBurstEventsForStage } from './burstEvents.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
const BASIC = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07']

function composer(stageId, alive = {}) {
  return createWaveComposer(stageId, {
    hpOf: (type) => ENEMY_STATS[type]?.hp ?? 0,
    statsOf: (type) => ENEMY_STATS[type] ?? null,
    aliveOf: (type) => alive[type] ?? 0,
  })
}
// pick + 바로 확정(실제 스폰)까지. 돌려준 entry에 최종 종·statOverride가 들어 있다.
function spawn(state, hostType, sec) {
  const entry = { type: pickWaveType(state, hostType, sec) }
  noteWaveSpawn(state, entry, sec)
  return entry
}
const hpOfEntry = (entry) => entry.statOverride?.hp ?? ENEMY_STATS[entry.type].hp

describe('웨이브 표준 표 (2026-11-21 Terry: 밥줄 1종 70% + 특수 2~3종)', () => {
  it('스테이지 1~6만 표가 있고 7~10은 옛 순환 그대로', () => {
    for (const id of STAGES) expect(hasWaveStandard(id), id).toBe(true)
    for (const id of ['stage7', 'stage8', 'stage9', 'stage10']) expect(hasWaveStandard(id), id).toBe(false)
  })

  it('스테이지마다 웨이브 10칸, 특수 3종 이하·역할 중복 없음', () => {
    for (const id of STAGES) {
      const waves = WAVE_STANDARD[id]
      expect(waves).toHaveLength(10)
      waves.forEach((wave, index) => {
        expect(wave.specials.length, `${id} W${index + 1}`).toBeGreaterThanOrEqual(1)
        expect(wave.specials.length, `${id} W${index + 1}`).toBeLessThanOrEqual(3)
        const roles = wave.specials.map((type) => WAVE_SPECIAL_ROLE[type])
        expect(roles.every(Boolean), `${id} W${index + 1} 역할 누락`).toBe(true)
        expect(new Set(roles).size, `${id} W${index + 1} 역할 중복 ${roles}`).toBe(roles.length)
        expect(wave.specials, `${id} W${index + 1}`).not.toContain(wave.fodder)
      })
    }
  })

  it('2026-11-22 게이트 뒤: 스테이지 1~5 밥줄은 전 구간 E01(가장 느리고 약한 추격 좀비), 스6은 E19', () => {
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) for (const wave of WAVE_STANDARD[id]) expect(wave.fodder, id).toBe('E01')
    for (const wave of WAVE_STANDARD.stage6.slice(0, 8)) expect(wave.fodder).toBe('E19')
  })

  it('보스(150초) 웨이브 W6은 특수 2종 이하', () => {
    for (const id of STAGES) expect(WAVE_STANDARD[id][5].specials.length, id).toBeLessThanOrEqual(2)
  })

  it('스테이지 1은 원거리·장판 역할을 쓰지 않는다', () => {
    for (const wave of WAVE_STANDARD.stage1) {
      for (const type of wave.specials) expect(['원거리', '장판·포격']).not.toContain(WAVE_SPECIAL_ROLE[type])
    }
  })

  it('그 스테이지 작성 표의 신규 종은 하나도 빠지지 않고 특수로 나온다(삭제 없음). 기본 종 E02~E07은 제 종으로 남을 수 있다', () => {
    for (const id of STAGES) {
      const used = new Set(WAVE_STANDARD[id].flatMap((wave) => [wave.fodder, ...wave.specials]))
      const roster = new Set()
      for (const evt of getBurstEventsForStage(id)) for (const type of [evt.type, ...(evt.mixedTypes ?? [])]) if (!isWaveExemptType(type)) roster.add(type)
      for (const type of roster) if (!BASIC.includes(type)) expect(used.has(type), `${id} ${type}`).toBe(true)
      for (const type of used) if (!isWaveExemptType(type) && !BASIC.includes(type)) expect(roster.has(type), `${id} 표에 없는 종 ${type}`).toBe(true)
    }
  })

  it('웨이브 번호: 30초 칸, 240초 이후 W9·W10 번갈아', () => {
    expect(waveIndexAt(0)).toBe(0)
    expect(waveIndexAt(29.9)).toBe(0)
    expect(waveIndexAt(30)).toBe(1)
    expect(waveIndexAt(239)).toBe(7)
    expect(waveIndexAt(240)).toBe(8)
    expect(waveIndexAt(270)).toBe(9)
    expect(waveIndexAt(300)).toBe(8)
    expect(waveIndexAt(335)).toBe(9)
    expect(getStageWave('stage1', 100).specials).toEqual(['E02', 'E66'])
  })
})

describe('웨이브 구성 규칙 v2 (몸의 급을 지킨다)', () => {
  it('손대지 않는 몸: 보스·치프·코인·크루·편대 종', () => {
    const state = composer('stage1')
    for (const type of ['B01', 'E89', 'E08', 'RZT', 'RZC', 'E105', 'E106']) expect(pickWaveType(state, type, 10)).toBe(type)
    expect(pickWaveType(null, 'E01', 10)).toBe('E01')
  })

  it('몸의 급: 원거리 · 거대(HP 200↑) · 무거움(HP 60↑) · 중간(HP 14↑) · 가벼움', () => {
    const state = composer('stage2')
    expect(waveClassOf(state, 'E04')).toBe('ranged')
    expect(waveClassOf(state, 'E46')).toBe('ranged')
    expect(waveClassOf(state, 'E02')).toBe('heavy')
    expect(waveClassOf(state, 'E06')).toBe('giant')
    expect(waveClassOf(state, 'E07')).toBe('mid')
    expect(waveClassOf(state, 'E01')).toBe('light')
    expect(waveClassOf(state, 'E03')).toBe('light')
  })

  it('가벼운 몸만 있을 때 약 70%가 밥줄, 나머지가 같은 급(가벼운) 특수', () => {
    const state = composer('stage1')
    const counts = {}
    for (let i = 0; i < 40; i += 1) {
      const entry = spawn(state, i % 4 === 0 ? 'E34' : 'E01', 5 + i * 0.2)
      counts[entry.type] = (counts[entry.type] ?? 0) + 1
    }
    expect(Object.keys(counts).sort()).toEqual(['E01', 'E34'])
    expect(counts.E01 / 40).toBeGreaterThanOrEqual(0.65)
    expect(counts.E01 / 40).toBeLessThanOrEqual(0.75)
  })

  it('밥줄은 바뀐 몸보다 빠르거나 세게 때리지 않는다, 무거운·원거리 몸은 밥줄이 되지 않는다', () => {
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      const state = composer(id)
      for (let w = 0; w < 8; w += 1) {
        for (const host of ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07']) {
          const entry = spawn(state, host, w * 30 + 1)
          if (['E02', 'E04', 'E05', 'E06'].includes(host)) expect(entry.type, `${id} W${w + 1} ${host}`).not.toBe('E01')
          // 위협(속도 × 접촉 피해)이 바뀐 몸 이하. (E03 → E01: 느려지고 피해는 6 → 8, 위협 7.3 → 4.2)
          if (entry.type === 'E01') expect(ENEMY_STATS.E01.speed * ENEMY_STATS.E01.damage).toBeLessThanOrEqual(ENEMY_STATS[host].speed * ENEMY_STATS[host].damage)
        }
      }
    }
  })

  it('무거운·원거리·중간 몸은 같은 급 특수로, 없으면 기본 종 그대로(신규 종은 같은 급 기본 종)', () => {
    const state = composer('stage1')
    // W4(90–120초): 특수 E02(탱크)·E66(분열, HP 16 = 중간). E05(무거움) → E02, E07(중간) → E66.
    expect(spawn(state, 'E05', 91).type).toBe('E02')
    expect(spawn(state, 'E07', 92).type).toBe('E66')
    // W1(0–30초): 특수 E34(가벼움)뿐. 기본 E07(중간)·E05(무거움)는 같은 급 특수가 없어 제 종 그대로(트렁크와 같은 위협),
    // 무거운 신규 종(E56)은 기본 덩치(E02)로, 신규 중간 종(E66)은 가벼운 특수(E34)로.
    const fresh = composer('stage1')
    expect(spawn(fresh, 'E66', 1).type).toBe('E34')
    expect(spawn(fresh, 'E07', 1).type).toBe('E07')
    expect(spawn(fresh, 'E56', 1).type).toBe('E02')
    expect(spawn(fresh, 'E05', 1).type).toBe('E05')
  })

  it('신규 특수 동시 생존 상한: 무거운 신규 특수가 3마리 살아 있으면 덩치 자리는 기본 종으로 남는다', () => {
    // 스3 W4(90–120초): 특수 E42(무거움)·E57(원거리).
    const capped = composer('stage3', { E42: 3 })
    expect(spawn(capped, 'E02', 91).type).toBe('E02')
    const open = composer('stage3')
    expect(spawn(open, 'E02', 91).type).toBe('E42')
  })

  it('그 웨이브에 없는 신규 종은 섞이지 않는다(밥줄·그 웨이브 특수·기본 종만)', () => {
    const state = composer('stage2')
    const allowed = new Set([...BASIC, WAVE_STANDARD.stage2[3].fodder, ...WAVE_STANDARD.stage2[3].specials])
    for (const host of ['E01', 'E03', 'E07', 'E37', 'E46', 'E02', 'E05', 'E06', 'E04', 'E57', 'E67']) {
      for (let i = 0; i < 5; i += 1) expect(allowed.has(spawn(state, host, 95 + i).type), host).toBe(true)
    }
  })

  it('특수는 강화형: 보기 크기 ×1.2, HP 강화는 가벼운·중간 특수만 기본의 최대 ×1.6', () => {
    const state = composer('stage1')
    const entry = { type: pickWaveType(state, 'E34', 3) }
    noteWaveSpawn(state, entry, 3)
    expect(entry.type).toBe('E34')
    expect(entry.statOverride.scale).toBeCloseTo(ENEMY_STATS.E34.scale * WAVE_SPECIAL_SCALE_MUL, 6)
    expect(WAVE_SPECIAL_HP_MUL_MAX).toBeLessThanOrEqual(1.6)
    const s2 = composer('stage1')
    s2.debt = 1000
    const buffed = spawn(s2, 'E34', 1)
    expect(buffed.type).toBe('E34')
    expect(hpOfEntry(buffed)).toBe(Math.round(ENEMY_STATS.E34.hp * WAVE_SPECIAL_HP_MUL_MAX))
    // 무거운 특수(E02)는 빚이 있어도 HP를 올리지 않는다(크기만).
    const heavy = spawn(s2, 'E02', 91)
    expect(heavy.type).toBe('E02')
    expect(hpOfEntry(heavy)).toBe(ENEMY_STATS.E02.hp)
  })

  it('HP 장부: 낸 HP + 남은 빚 = 원래 몸 HP 합', () => {
    const state = composer('stage3')
    let hpIn = 0
    let hpOut = 0
    const hosts = ['E01', 'E07', 'E03', 'E02', 'E05', 'E04', 'E06', 'E46', 'E37']
    for (let i = 0; i < 120; i += 1) {
      const host = hosts[i % hosts.length]
      hpIn += ENEMY_STATS[host].hp
      hpOut += hpOfEntry(spawn(state, host, i * 2))
    }
    expect(hpOut + state.debt).toBeCloseTo(hpIn, 0)
  })

  it('밥줄로 바뀐 가벼운 몸은 원래 HP를 그대로 받는다(E03 → E01 밥줄)', () => {
    const state = composer('stage1')
    let fodder = 0
    for (let i = 0; i < 20; i += 1) {
      const entry = spawn(state, 'E03', 91 + i * 0.5)
      if (entry.type !== 'E01') continue
      fodder += 1
      expect(entry.statOverride.hp).toBe(ENEMY_STATS.E03.hp)
    }
    expect(fodder).toBeGreaterThanOrEqual(12)
  })

  it('같은 옷 동시 10마리 규칙: 살아 있는 수가 한도에 닿은 특수는 고르지 않는다', () => {
    const state = composer('stage1', { E34: 999 })
    for (let i = 0; i < 20; i += 1) expect(spawn(state, 'E01', 2 + i * 0.1).type).toBe('E01')
  })

  it('실제로 스폰되지 않은 예약은 세지 않는다(같은 시각 안에서만 유효)', () => {
    const state = composer('stage1')
    for (let i = 0; i < 10; i += 1) pickWaveType(state, 'E01', 4)
    expect(state.bodies).toBe(0)
    spawn(state, 'E01', 5)
    expect(state.bodies).toBe(1)
    expect(state.pendingBodies).toBe(0)
  })

  it('결정론: 같은 입력이면 같은 결과', () => {
    const run = () => { const state = composer('stage5'); const out = []; for (let i = 0; i < 60; i += 1) out.push(spawn(state, ['E01', 'E03', 'E07', 'E02', 'E04'][i % 5], i * 4).type); return out.join(',') }
    expect(run()).toBe(run())
  })
})
