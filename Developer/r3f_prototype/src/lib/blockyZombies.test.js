// 블록 좀비 18종(E71~E88, Kenney Blocky Characters 2.0 CC0) 등록·비주얼·소리·로스터·순환 계약. 2026-11-14.
import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'
import { resolvePooledZombieVisual } from '../components/ZombieInstanceLayer.jsx'
import { BLOCKY_MODEL_FIT, BLOCKY_MODEL_FOOT_Y, blockyAtlasOffset, blockyAtlasUv } from '../components/BlockyZombieLayer.jsx'
import {
  BLOCKY_ZOMBIE_FIRST_TYPE_CODE,
  BLOCKY_ZOMBIE_LAST_TYPE_CODE,
  BLOCKY_ZOMBIE_TYPES,
  BLOCKY_ZOMBIE_VISUALS,
  blockyZombieAtlasCell,
  blockyZombieTelegraphMs,
} from './blockyZombieRoster.js'
import { BLOCKY_POSE_ROOT_ROLL, BLOCKY_ZOMBIE_ARM_REACH, createBlockyPose, fillBlockyZombiePose } from './blockyZombiePose.js'
import { KENNEY_BLOCKY_ATLAS, KENNEY_BLOCKY_LETTERS, KENNEY_BLOCKY_PARTS } from './kenneyBlockyGeometry.js'
import { ENEMY_TYPE_CODES, ENEMY_TYPE_NAMES, createEnemyEntityPool, enemyTypeFromCode } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_RUNTIME_SPEED, ENEMY_SIZE_MULTIPLIER, ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE, ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH, createEnemySimulationRuntime } from './enemySimulation.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS, PZ_STATE, isHealableTypeCode, resetProjectileZombieBehaviorState, isProjectileZombieType, projectileZombieTelegraphMs, spawnProjectileZombieTelegraphDecal, spawnProjectileZombieVolley } from './projectileZombieBehavior.js'
import { createProjectileZombieShotPool } from './projectileZombieShotPool.js'
import { PROJECTILE_ZOMBIE_TYPES } from './projectileZombieVisuals.js'
import { ENEMY_ABILITY_SFX, enemyAbilitySfxForCode } from './enemyAbilitySfx.js'
import { SOUND_MAP } from './sfxRegistry.js'
import { getZombieTypeLabel, isKnownZombieType } from './zombieEncyclopedia.js'
import { setLocale } from './i18n.js'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { getBurstEventsForStage } from './burstEvents.js'
import { JARMOB_HP_TYPES } from '../components/Enemies.jsx'
import { createRosterRotation, getStageRotationDebuts, getStageRotationRoster, noteRosterRotationSpawn, pickRosterRotationType } from './stageRosterRotation.js'

const IDS = BLOCKY_ZOMBIE_TYPES
const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('블록 좀비 18종 등록', () => {
  it('E71~E88이 typeCode 76~93에 연속으로 앉고(75 = B10 그대로), 풀·런타임·ENEMY_STATS·잡몹 HP 집합에 다 있다', () => {
    expect(IDS).toHaveLength(18)
    expect([BLOCKY_ZOMBIE_FIRST_TYPE_CODE, BLOCKY_ZOMBIE_LAST_TYPE_CODE]).toEqual([76, 93])
    expect(enemyTypeFromCode(75)).toBe('B10')
    IDS.forEach((id, i) => {
      expect(ENEMY_TYPE_CODES[id], id).toBe(76 + i)
      expect(ENEMY_TYPE_NAMES[76 + i]).toBe(id)
      expect(isProjectileZombieType(76 + i), id).toBe(true)
      expect(PROJECTILE_ZOMBIE_BEHAVIORS[76 + i].id).toBe(id)
      expect(ENEMY_STATS[id]?.hp, id).toBeGreaterThan(0)
      expect(ENEMY_RUNTIME_HP[76 + i], id).toBe(ENEMY_STATS[id].hp)
      expect(ENEMY_RUNTIME_SPEED[76 + i], id).toBeCloseTo(ENEMY_STATS[id].speed, 5)
      expect(JARMOB_HP_TYPES.has(id), id).toBe(true)
    })
    expect(isProjectileZombieType(75)).toBe(false)
  })

  it('역할이 고르게 나뉜다(근접·원거리·지원·빠른 종 3기 이상씩), 고체력(hp ≥ 70) 종은 2기 이하, hp는 host 사다리 값만 쓴다', () => {
    const roles = IDS.reduce((acc, id) => ({ ...acc, [BLOCKY_ZOMBIE_VISUALS[id].role]: (acc[BLOCKY_ZOMBIE_VISUALS[id].role] ?? 0) + 1 }), {})
    for (const role of ['melee', 'ranged', 'support', 'fast']) expect(roles[role], role).toBeGreaterThanOrEqual(3)
    expect(IDS.filter((id) => ENEMY_STATS[id].hp >= 70).length).toBeLessThanOrEqual(2)
    for (const id of IDS) expect([8, 10, 16, 32, 70], id).toContain(ENEMY_STATS[id].hp)
    // 지원형은 공격하지 않고, 원거리형만 탄을 쏜다.
    for (const id of IDS) {
      const behavior = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
      const role = BLOCKY_ZOMBIE_VISUALS[id].role
      if (role === 'support') expect(Boolean(behavior.heal || behavior.shield), id).toBe(true)
      if (role === 'melee') expect(behavior.shot, id).toBe(null)
      if (role === 'ranged') expect(behavior.shot, id).not.toBe(null)
    }
  })

  it('예고는 18프레임(300ms) 이상이고 행동 모듈이 같은 길이를 쓴다', () => {
    for (const id of IDS) {
      const code = ENEMY_TYPE_CODES[id]
      expect(BLOCKY_ZOMBIE_VISUALS[id].telegraphMs, id).toBeGreaterThanOrEqual(300)
      expect(projectileZombieTelegraphMs(code)).toBe(blockyZombieTelegraphMs(code))
      expect(projectileZombieTelegraphMs(code)).toBe(BLOCKY_ZOMBIE_VISUALS[id].telegraphMs)
    }
  })

  it('지원형 셋은 서로를 회복·방패하지 않고, 나머지 블록 좀비는 회복·방패 대상이다', () => {
    for (const id of IDS) {
      const behavior = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[id]]
      expect(isHealableTypeCode(ENEMY_TYPE_CODES[id]), id).toBe(!(behavior.heal || behavior.shield))
    }
  })

  it('브랜드·실존 인물 이름이 아니라 학교 코미디 이름을 ko·en·ja 세 언어로 갖고, 도감·조우 허용 목록·DB 규칙에 있다', () => {
    const rules = JSON.parse(read('../../database.rules.json')).rules
    const expression = rules.users.$uid.progress.encounteredZombieTypes.$zombieType['.validate']
    const accept = (type) => Function('$zombieType', 'newData', `return (${expression})`)(type, { val: () => 1 })
    const firebaseProgress = read('./firebaseProgress.js')
    for (const id of IDS) {
      expect(isKnownZombieType(id), id).toBe(true)
      expect(ko[`zombie.${id}`], id).toBe(BLOCKY_ZOMBIE_VISUALS[id].label)
      expect(typeof en[`zombie.${id}`], id).toBe('string')
      expect(typeof ja[`zombie.${id}`], id).toBe('string')
      setLocale('ko'); expect(getZombieTypeLabel(id)).toBe(BLOCKY_ZOMBIE_VISUALS[id].label)
      setLocale('en'); expect(getZombieTypeLabel(id)).toBe(en[`zombie.${id}`])
      expect(accept(id), id).toBe(true)
      expect(firebaseProgress).toContain(`'${id}'`)
    }
    setLocale('ko')
    expect(accept('E89')).toBe(false)
  })
})

describe('블록 좀비 비주얼', () => {
  it('Kenney 글자 18개를 한 번씩, 아틀라스 칸 0~17에 하나씩 쓴다', () => {
    const cells = IDS.map((id) => blockyZombieAtlasCell(id))
    expect([...new Set(cells)].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i))
    expect(IDS.map((id) => BLOCKY_ZOMBIE_VISUALS[id].letter).sort()).toEqual([...KENNEY_BLOCKY_LETTERS])
    for (const id of IDS) expect(KENNEY_BLOCKY_LETTERS[blockyZombieAtlasCell(id)]).toBe(BLOCKY_ZOMBIE_VISUALS[id].letter)
  })

  it('풀 렌더러는 블록 타입을 파트 0개(그림자·체력바·연기만)로 다루고, 대표색은 E01 폴백이 아니다', () => {
    for (const id of IDS) {
      const visual = resolvePooledZombieVisual(ENEMY_TYPE_CODES[id])
      expect(visual.name).toBe(id)
      expect(visual.blocky).toBe(true)
      expect(visual.partCount).toBe(0)
      expect(visual.projectileIndex).toBe(0)
      expect(visual.paletteIsE01Fallback).toBe(false)
      expect(ZOMBIE_PALETTE[id]?.body, id).toBeTypeOf('number')
    }
  })

  it('지오메트리는 6파트 강체 박스 한 벌(143정점/72삼각형)이고 UV는 칸 안에 머문다', () => {
    expect(KENNEY_BLOCKY_PARTS.map((part) => part.key)).toEqual(['legL', 'legR', 'torso', 'armL', 'armR', 'head'])
    expect(KENNEY_BLOCKY_PARTS.reduce((n, part) => n + part.position.length / 3, 0)).toBe(143)
    expect(KENNEY_BLOCKY_PARTS.reduce((n, part) => n + part.index.length / 3, 0)).toBe(72)
    expect(KENNEY_BLOCKY_PARTS.filter((part) => part.parent === 'torso').map((part) => part.key)).toEqual(['armL', 'armR', 'head'])
    for (const part of KENNEY_BLOCKY_PARTS) {
      for (const value of part.uv) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1) }
      expect(Math.max(...part.index)).toBeLessThan(part.position.length / 3)
    }
    const { width, height, cell, gutter, cols, rows } = KENNEY_BLOCKY_ATLAS
    expect([width, height]).toEqual([cols * (cell + 2 * gutter), rows * (cell + 2 * gutter)])
    // 마지막 칸(17)의 UV 끝이 아틀라스 안에 있다.
    const [ox, oz] = blockyAtlasOffset(17)
    const [u, v] = blockyAtlasUv(1, 1)
    expect(ox + u).toBeLessThanOrEqual(1)
    expect(oz + v).toBeLessThanOrEqual(1)
  })

  it('UV는 glTF 규칙(위가 v 0)이라 텍스처를 뒤집지 않는다: 머리 정면(+Z) 정점은 텍스처 얼굴 칸(128~256px)에 앉는다', () => {
    const head = KENNEY_BLOCKY_PARTS.find((part) => part.key === 'head')
    let front = 0
    for (let i = 0; i < head.position.length / 3; i += 1) {
      if (head.normal[i * 3 + 2] < 0.5 || Math.abs(head.normal[i * 3 + 1]) > 0.5) continue
      front += 1
      expect(head.uv[i * 2]).toBeGreaterThanOrEqual(0.12); expect(head.uv[i * 2]).toBeLessThanOrEqual(0.25)
      expect(head.uv[i * 2 + 1]).toBeGreaterThanOrEqual(0.11); expect(head.uv[i * 2 + 1]).toBeLessThanOrEqual(0.25)
    }
    expect(front).toBeGreaterThanOrEqual(2)
  })

  it('공용 좀비 키(발 −0.63 ~ 머리 1.06)에 맞춘다', () => {
    let top = -Infinity
    for (const part of KENNEY_BLOCKY_PARTS) {
      const parentY = part.parent === 'torso' ? KENNEY_BLOCKY_PARTS.find((p) => p.key === 'torso').pivot[1] : 0
      for (let i = 1; i < part.position.length; i += 3) top = Math.max(top, parentY + part.pivot[1] + part.position[i])
    }
    expect(BLOCKY_MODEL_FOOT_Y + top * BLOCKY_MODEL_FIT).toBeCloseTo(1.06, 2)
  })

  it('아틀라스 PNG 한 장은 350KB 이하이고 출처 기록(CC0·zip 해시)이 함께 있다', () => {
    const atlas = new URL('../assets/models/kenney_blocky/kenney_blocky_zombie_atlas.png', import.meta.url)
    expect(statSync(atlas).size).toBeLessThanOrEqual(350 * 1024)
    const provenance = JSON.parse(read('../assets/models/kenney_blocky/PROVENANCE.json'))
    expect(provenance.license.id).toBe('CC0-1.0')
    expect(provenance.source.url).toBe('https://kenney.nl/assets/blocky-characters')
    expect(provenance.source.zip?.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(provenance.membersUsed.filter((m) => /texture-[a-r]\.png$/.test(m.member))).toHaveLength(18)
    expect(read('../assets/models/kenney_blocky/License.txt')).toContain('Creative Commons Zero')
  })

  it('좀비 포즈: 평시엔 두 팔을 앞으로 뻗고 비틀거리며, 예고·공격·회복 포즈가 평시와 다르다(충돌 인형은 회복 때 넘어진다)', () => {
    const out = createBlockyPose()
    for (const id of IDS) {
      const { style, role } = BLOCKY_ZOMBIE_VISUALS[id]
      const normal = Array.from(fillBlockyZombiePose(out, style, 'normal', 1.3, role === 'fast'))
      expect(normal.every(Number.isFinite), id).toBe(true)
      expect(normal[9]).toBeLessThan(-1) // armL 앞으로
      expect(normal[12]).toBeLessThan(-1) // armR 앞으로
      for (const phase of ['warn', 'charge', 'stun']) {
        const posed = Array.from(fillBlockyZombiePose(out, style, phase, 1.3, role === 'fast'))
        expect(posed.every(Number.isFinite), `${id} ${phase}`).toBe(true)
        expect(posed, `${id} ${phase}`).not.toEqual(normal)
      }
    }
    expect(BLOCKY_ZOMBIE_ARM_REACH).toBeLessThan(-1)
    expect(fillBlockyZombiePose(out, 'tumble', 'stun', 0)[BLOCKY_POSE_ROOT_ROLL]).toBeGreaterThan(1)
  })
})

describe('블록 좀비 소리', () => {
  it('18종 모두 공격·사망 개그가 있고(기존 21종 음원만), 투사체 25종과 합쳐도 (id, 피치)가 종마다 다르다', () => {
    const attack = new Set(); const death = new Set()
    for (const id of [...PROJECTILE_ZOMBIE_TYPES, ...IDS]) {
      const entry = ENEMY_ABILITY_SFX[id]
      expect(entry?.attack, `${id} attack`).toBeTruthy()
      expect(entry?.death, `${id} death`).toBeTruthy()
      attack.add(`${entry.attack.id}@${entry.attack.rate}`)
      death.add(`${entry.death.id}@${entry.death.rate}`)
    }
    expect(attack.size).toBe(PROJECTILE_ZOMBIE_TYPES.length + IDS.length)
    expect(death.size).toBe(PROJECTILE_ZOMBIE_TYPES.length + IDS.length)
    for (const id of IDS) {
      expect(enemyAbilitySfxForCode(ENEMY_TYPE_CODES[id])).toBe(ENEMY_ABILITY_SFX[id])
      for (const cue of Object.values(ENEMY_ABILITY_SFX[id])) {
        expect(cue.id, id).toMatch(/^gag[A-Z]/)
        expect(SOUND_MAP[cue.id], `${id} ${cue.id}`).toBeTruthy()
      }
    }
  })
})

describe('블록 좀비 스테이지 배분', () => {
  it('18종 모두 스1~스6 중 한 곳 이상의 로스터(작성된 첫 등장)에 있고, 스테이지마다 2종 이상 새 얼굴이 들어온다', () => {
    const seen = new Set()
    for (const stageId of STAGES) {
      const fresh = getStageRotationRoster(stageId).filter((type) => IDS.includes(type))
      expect(fresh.length, stageId).toBeGreaterThanOrEqual(2)
      fresh.forEach((type) => seen.add(type))
    }
    expect([...seen].sort()).toEqual([...IDS])
  })

  it('스1에 들어간 블록 좀비는 탄이 없다(스1 원거리 금지)', () => {
    for (const type of getStageRotationRoster('stage1').filter((t) => IDS.includes(t))) {
      expect(PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES[type]].shot, type).toBe(null)
    }
  })

  it('스7~스10 초안 표에는 블록 좀비가 없다', () => {
    for (const stageId of ['stage7', 'stage8', 'stage9', 'stage10']) {
      expect(getBurstEventsForStage(stageId).filter((evt) => IDS.includes(evt.type)), stageId).toEqual([])
    }
  })

  it.each(STAGES)('%s: 데뷔한 블록 좀비는 정규 리스폰(리필 20마리, 25초마다)으로 데뷔 뒤 다시 나온다', (stageId) => {
    const hpOf = (type) => ENEMY_STATS[type]?.hp ?? 0
    const state = createRosterRotation(stageId, { hpOf })
    const debuts = getStageRotationDebuts(stageId)
    const blocky = Object.keys(debuts).filter((type) => IDS.includes(type))
    const rotated = new Map()
    for (let sec = 15; sec < 240; sec += 25) {
      for (let k = 0; k < 20; k += 1) {
        const host = k % 2 ? 'E01' : 'E07'
        const type = pickRosterRotationType(state, host, sec)
        noteRosterRotationSpawn(state, type, sec)
        if (type !== host) rotated.set(type, [...(rotated.get(type) ?? []), sec])
      }
    }
    for (const type of blocky) {
      const secs = rotated.get(type) ?? []
      expect(secs.length, `${stageId} ${type}`).toBeGreaterThan(0)
      expect(Math.min(...secs), `${stageId} ${type}`).toBeGreaterThanOrEqual(debuts[type])
    }
  })
})

describe('블록 좀비 행동(공용 투사체 좀비 경로)', () => {
  const DT = 1 / 60
  // 방패·회복·분열 표는 슬롯 세대로 개체를 구분하는 모듈 전역이라, 판마다 비운다(런타임은 refs.resetRuntimeRefs가 부른다).
  function world() { resetProjectileZombieBehaviorState(); return { pool: createEnemyEntityPool(), runtime: createEnemySimulationRuntime(), shots: createProjectileZombieShotPool(), handle: { index: -1, generation: 0 } } }
  function spawn(w, type, x, z, extra = {}) {
    const stats = ENEMY_STATS[type]
    expect(w.pool.spawnInto(w.handle, { type, x, y: 0.3, z, hp: stats.hp, maxHp: stats.hp, visualScale: (stats.scale ?? 1) * ENEMY_SIZE_MULTIPLIER, spawnTimer: 3000, ...extra }), type).toBe(true)
    return w.handle.index
  }
  function run(w, seconds, onStep) {
    const event = {}
    for (let frame = 0; frame < Math.round(seconds / DT); frame += 1) {
      w.runtime.step(w.pool, { delta: DT, playerX: 0, playerZ: 0, halfX: 60, halfZ: 60, elapsedSec: 30 + frame * DT, activeProjectileCount: 0, stageId: 'stage2', e04IntroSec: 0, bossPressure: false, projectileZombieShotCount: w.shots.hostileCount })
      while (w.runtime.events.drainInto(event)) {
        if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH) spawnProjectileZombieTelegraphDecal(w.shots, w.pool, event.index, event.generation)
        else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE) spawnProjectileZombieVolley(w.shots, w.pool, event.index, event.generation)
      }
      w.shots.step(DT, 0, 0, () => true, null, null)
      onStep?.()
    }
  }

  it.each(IDS)('%s: 다가와 예고 → 발사/돌진/순간이동/지원 → 회복을 한 바퀴 돈다', (type) => {
    const w = world()
    const support = BLOCKY_ZOMBIE_VISUALS[type].role === 'support'
    const index = spawn(w, type, 3.2, 0)
    // 지원형은 다친 아군이 곁에 있어야 예고한다.
    if (support) spawn(w, 'E01', 3.6, 0.3, { hp: 2 })
    const states = new Set()
    run(w, 9, () => { if (w.pool.active[index]) states.add(w.pool.state[index]) })
    expect([...states].sort(), type).toEqual(expect.arrayContaining([PZ_STATE.APPROACH, PZ_STATE.TELEGRAPH, PZ_STATE.FIRE, PZ_STATE.RECOVER]))
  })
})
