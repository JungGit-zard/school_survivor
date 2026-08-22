import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_ZOMBIE_DEATH_SFX,
  ZOMBIE_DEATH_SFX_IDS,
  deathSfxId,
  randomZombieDeathSfxId,
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

  it('chooses normal zombie death voices from one shared action-point pool, not enemy type mapping', () => {
    const rngValues = [0, 0.2, 0.4, 0.6, 0.8]
    expect(rngValues.map((value) => randomZombieDeathSfxId(() => value))).toEqual(ZOMBIE_DEATH_SFX_IDS)

    const normalZombieTypes = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'RZG', 'RZT', 'RZL', 'RZC']
    for (const type of normalZombieTypes) {
      expect(deathSfxId(type, false, () => 0)).toBe('zombieDeathGrunt')
      expect(deathSfxId(type, false, () => 0.2)).toBe('zombieDeathHeavy')
      expect(deathSfxId(type, false, () => 0.4)).toBe('zombieDeathShriek')
      expect(deathSfxId(type, false, () => 0.6)).toBe('zombieDeathGurgle')
      expect(deathSfxId(type, false, () => 0.8)).toBe('zombieDeathBellow')
    }
  })

  it('keeps every generated death voice reachable for any ordinary zombie', () => {
    const ordinaryType = 'E01'
    const reachable = new Set([0, 0.2, 0.4, 0.6, 0.8].map((value) => deathSfxId(ordinaryType, false, () => value)))
    expect([...reachable].sort()).toEqual([...ZOMBIE_DEATH_SFX_IDS].sort())
  })

  it('keeps Matilda and boss deaths ahead of the normal zombie random pool', () => {
    expect(deathSfxId('E06', true, () => 0.8)).toBe('matildaDeath')
    expect(deathSfxId('B01', false, () => 0.8)).toBe('bossDeath')
    expect(deathSfxId('B04', false, () => 0.8)).toBe('bossDeath')
  })

  it('falls back to the shared pool even for an unknown non-boss type', () => {
    expect(deathSfxId('E99', false, () => 0)).toBe(DEFAULT_ZOMBIE_DEATH_SFX)
    expect(deathSfxId(undefined, false, () => 0.8)).toBe('zombieDeathBellow')
  })

  it('does not keep a normal-zombie type-to-death-sound assignment table', () => {
    const source = readSource('./enemyDeathSfx.js')
    expect(source).not.toContain('ENEMY_DEATH_SFX_BY_TYPE')
    expect(source).not.toContain("E01: 'zombieDeathGrunt'")
    expect(source).not.toContain("E06: 'zombieDeathBellow'")
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
