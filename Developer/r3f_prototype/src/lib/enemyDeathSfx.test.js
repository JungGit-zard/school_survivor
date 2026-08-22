import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_ZOMBIE_DEATH_SFX,
  ENEMY_DEATH_SFX_BY_TYPE,
  ZOMBIE_DEATH_SFX_IDS,
  deathSfxId,
} from './enemyDeathSfx.js'

// sfxRegistry는 Howler를 끌어온다. 여기서는 SOUND_MAP/쿨다운 데이터만 보면 되므로 막아둔다.
vi.mock('howler', () => ({
  Howl: vi.fn(function HowlMock() {
    return { play: vi.fn(), rate: vi.fn(), volume: vi.fn() }
  }),
}))
vi.mock('./studioRuntimeState.js', () => ({
  getFirebaseStudioRuntimeDataset: () => ({}),
  setFirebaseStudioRuntimeDataset: (_key, value) => value,
}))

const readSource = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('zombie death voices', () => {
  it('registers all five death voices with an OGG and an MP3 fallback', async () => {
    const { SOUND_MAP } = await import('./sfxRegistry.js')

    expect(ZOMBIE_DEATH_SFX_IDS).toHaveLength(5)
    for (const id of ZOMBIE_DEATH_SFX_IDS) {
      expect(SOUND_MAP[id], `${id} must be registered`).toBe(`/sfx/enemies/${id}.ogg`)
      for (const extension of ['ogg', 'mp3']) {
        const assetUrl = new URL(`../../public/sfx/enemies/${id}.${extension}`, import.meta.url)
        expect(statSync(assetUrl).size, `${id} ${extension}`).toBeGreaterThan(1000)
      }
    }
  })

  it('gives every death voice a polyphony cooldown shorter than its own clip', async () => {
    // 쿨다운이 음원 길이보다 길면 연속 처치에서 사망음이 통째로 사라진다.
    // 반대로 한 프레임(16.7ms)보다 짧으면 같은 프레임 중복 emit을 못 거른다.
    const { POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')
    const clipMs = {
      zombieDeathGrunt: 340,
      zombieDeathHeavy: 600,
      zombieDeathShriek: 300,
      zombieDeathGurgle: 480,
      zombieDeathBellow: 820,
    }
    for (const id of ZOMBIE_DEATH_SFX_IDS) {
      expect(POLYPHONY_COOLDOWN[id], `${id} cooldown`).toBeGreaterThan(17)
      expect(POLYPHONY_COOLDOWN[id], `${id} cooldown vs clip`).toBeLessThan(clipMs[id])
    }
  })

  it('retires the two generic death cues the five voices replaced', async () => {
    const { SOUND_MAP, POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')

    for (const retired of ['zombieDeath', 'zombieHeavyDeath']) {
      expect(SOUND_MAP[retired], `${retired} must be gone`).toBeUndefined()
      expect(POLYPHONY_COOLDOWN[retired]).toBeUndefined()
    }
  })

  it('routes each zombie type to the voice that matches its build', () => {
    // 배분 축은 덩치와 속도다. 이 표가 바뀌면 소리만 듣고 무엇이 죽었는지 못 가린다.
    expect(deathSfxId('E01')).toBe('zombieDeathGrunt')
    expect(deathSfxId('E07')).toBe('zombieDeathGrunt')
    expect(deathSfxId('RZG')).toBe('zombieDeathGrunt')

    expect(deathSfxId('E02')).toBe('zombieDeathHeavy')
    expect(deathSfxId('E05')).toBe('zombieDeathHeavy')
    expect(deathSfxId('RZT')).toBe('zombieDeathHeavy')

    expect(deathSfxId('E03')).toBe('zombieDeathShriek')
    expect(deathSfxId('RZL')).toBe('zombieDeathShriek')
    expect(deathSfxId('RZC')).toBe('zombieDeathShriek')

    expect(deathSfxId('E04')).toBe('zombieDeathGurgle')

    // 거대 좀비 단독. 다른 타입이 이 소리를 같이 쓰면 "가장 큰 놈" 신호가 희석된다.
    expect(deathSfxId('E06')).toBe('zombieDeathBellow')
    const bellowTypes = Object.entries(ENEMY_DEATH_SFX_BY_TYPE)
      .filter(([, id]) => id === 'zombieDeathBellow')
      .map(([type]) => type)
    expect(bellowTypes).toEqual(['E06'])
  })

  it('actually splits the roster five ways instead of collapsing into one cue', () => {
    const used = new Set(Object.values(ENEMY_DEATH_SFX_BY_TYPE))
    expect([...used].sort()).toEqual([...ZOMBIE_DEATH_SFX_IDS].sort())
  })

  it('keeps Matilda and boss deaths ahead of the zombie voices', () => {
    expect(deathSfxId('E06', true)).toBe('matildaDeath')
    expect(deathSfxId('B01')).toBe('bossDeath')
    expect(deathSfxId('B04')).toBe('bossDeath')
  })

  it('falls back to the plain grunt for an unmapped type', () => {
    expect(deathSfxId('E99')).toBe(DEFAULT_ZOMBIE_DEATH_SFX)
    expect(deathSfxId(undefined)).toBe(DEFAULT_ZOMBIE_DEATH_SFX)
  })

  it('maps every non-boss enemy type in ENEMY_STATS, so a new zombie cannot slip in silently', () => {
    const source = readSource('../components/Enemy.jsx')
    const block = source.slice(source.indexOf('export const ENEMY_STATS = {'))
    const declared = [...block.matchAll(/^ {2}([A-Z][A-Z0-9]{2}): \{/gm)].map(([, type]) => type)

    expect(declared.length).toBeGreaterThan(10)
    const unmapped = declared
      .filter((type) => !type.startsWith('B'))
      .filter((type) => !ENEMY_DEATH_SFX_BY_TYPE[type])
    expect(unmapped, `unmapped enemy types: ${unmapped.join(', ')}`).toEqual([])
  })

  it('routes both death call sites through the shared dispatch', () => {
    // 예전에는 Enemies.jsx가 삼항식으로 규칙을 복제해 갖고 있었다.
    // 풀링 경로와 개별 경로가 서로 다른 소리를 내는 사고를 막는 회귀 가드다.
    const pooled = readSource('../components/Enemies.jsx')
    const single = readSource('../components/Enemy.jsx')

    for (const [name, source] of [['Enemies.jsx', pooled], ['Enemy.jsx', single]]) {
      expect(source, `${name} must import the shared dispatch`).toContain(
        "import { deathSfxId } from '../lib/enemyDeathSfx.js'",
      )
      expect(source, `${name} must emit through it`).toContain('emitSfx({ id: deathSfxId(')
      expect(source, `${name} must not hardcode a death ID`).not.toContain("'zombieHeavyDeath'")
      expect(source, `${name} must not hardcode a death ID`).not.toContain("'zombieDeath'")
    }
  })
})
