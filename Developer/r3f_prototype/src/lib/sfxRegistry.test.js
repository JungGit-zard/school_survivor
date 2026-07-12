import { existsSync, statSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const AUDITED_WEAPON_COOLDOWNS = {
  pencilHit: 35,
  rulerHit: 55,
  boxCutterHit: 45,
  tumblerHit: 90,
  flaskHit: 100,
  flaskTick: 140,
  bellHit: 120,
  stunGunHit: 55,
  onigiriHit: 65,
  chibikoHit: 40,
  missileHit: 140,
  sharkHit: 180,
  starlinkHit: 90,
  starlinkFall: 500,
  starlinkExplosion: 650,
  compassFire: 110,
  compassHit: 180,
  umbrellaHit: 140,
  eraserHit: 160,
  lanternTick: 120,
}

const howlPlay = vi.fn(() => 7)
const howlRate = vi.fn()
const howlVolume = vi.fn()
const howlConfigs = []

vi.mock('howler', () => ({
  Howl: vi.fn(function HowlMock(config) {
    howlConfigs.push(config)
    return {
      play: howlPlay,
      rate: howlRate,
      volume: howlVolume,
    }
  }),
}))

describe('playSfx', () => {
  beforeEach(() => {
    howlPlay.mockClear()
    howlRate.mockClear()
    howlVolume.mockClear()
    howlConfigs.length = 0
    vi.resetModules()
    let storage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage[key] ?? null),
      setItem: vi.fn((key, value) => { storage[key] = String(value) }),
      removeItem: vi.fn((key) => { delete storage[key] }),
      clear: vi.fn(() => { storage = {} }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('plays Matilda spawn through the replaced audio asset', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('matildaSpawn', 0.8)

    expect(howlConfigs[0].src).toEqual(['/sfx/enemies/matildaSpawn.ogg', '/sfx/enemies/matildaSpawn.mp3'])
    expect(statSync(new URL('../../public/sfx/enemies/matildaSpawn.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(howlPlay).toHaveBeenCalledOnce()
    expect(howlRate).toHaveBeenCalledWith(1, 7)
  })

  it('registers the dedicated zombie spawn poof sound', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('zombieSpawn')

    expect(howlConfigs[0].src).toEqual(['/sfx/enemies/zombieSpawn.ogg', '/sfx/enemies/zombieSpawn.mp3'])
    expect(statSync(new URL('../../public/sfx/enemies/zombieSpawn.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(howlPlay).toHaveBeenCalledOnce()
  })

  it('registers dedicated Matilda dash and ho-ho laugh sounds', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('matildaDash')
    playSfx('matildaLaugh')

    expect(howlConfigs[0].src).toEqual(['/sfx/enemies/matildaDash.ogg', '/sfx/enemies/matildaDash.mp3'])
    expect(howlConfigs[1].src).toEqual(['/sfx/enemies/matildaLaugh.ogg', '/sfx/enemies/matildaLaugh.mp3'])
    expect(statSync(new URL('../../public/sfx/enemies/matildaDash.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(statSync(new URL('../../public/sfx/enemies/matildaLaugh.ogg', import.meta.url)).size).toBeGreaterThan(1000)
  })

  it('mutes gameplay SFX while an auth overlay is active', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('zombieDeath', 1, { authOverlayActive: true })

    expect(howlConfigs).toHaveLength(0)
    expect(howlPlay).not.toHaveBeenCalled()
  })

  it('still allows the auth click acknowledgement while an auth overlay is active', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('buttonClick', 0.8, { authOverlayActive: true })

    expect(howlConfigs[0].src).toEqual(['/sfx/ui/buttonClick.ogg', '/sfx/ui/buttonClick.mp3'])
    expect(howlPlay).toHaveBeenCalledOnce()
  })

  it('registers Starlink crash falling and explosion sounds', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('starlinkFall')
    playSfx('starlinkExplosion')

    expect(howlConfigs[0].src).toEqual(['/sfx/weapons/starlinkFall.ogg', '/sfx/weapons/starlinkFall.mp3'])
    expect(howlConfigs[1].src).toEqual(['/sfx/weapons/starlinkExplosion.ogg', '/sfx/weapons/starlinkExplosion.mp3'])
    expect(statSync(new URL('../../public/sfx/weapons/starlinkFall.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(statSync(new URL('../../public/sfx/weapons/starlinkExplosion.ogg', import.meta.url)).size).toBeGreaterThan(1000)
  })

  it('registers flask and lantern ticks as aliases of the short Chibiko hit asset', async () => {
    const { SOUND_MAP } = await import('./sfxRegistry.js')

    expect(SOUND_MAP.flaskTick).toBe('/sfx/weapons/chibikoHit.ogg')
    expect(SOUND_MAP.lanternTick).toBe('/sfx/weapons/chibikoHit.ogg')
  })

  it('keeps every registered OGG and MP3 fallback path backed by a public asset', async () => {
    const { SOUND_MAP } = await import('./sfxRegistry.js')

    for (const [id, oggPath] of Object.entries(SOUND_MAP)) {
      const mp3Path = oggPath.replace(/\.ogg$/, '.mp3')
      const oggUrl = new URL(`../../public${oggPath}`, import.meta.url)
      const mp3Url = new URL(`../../public${mp3Path}`, import.meta.url)

      expect(existsSync(oggUrl), `${id} OGG asset: ${oggPath}`).toBe(true)
      expect(existsSync(mp3Url), `${id} MP3 asset: ${mp3Path}`).toBe(true)
    }
  })

  it('publishes every audited weapon cooldown as read-only data', async () => {
    const { POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')

    expect(POLYPHONY_COOLDOWN).toEqual(expect.objectContaining(AUDITED_WEAPON_COOLDOWNS))
    expect(Object.isFrozen(POLYPHONY_COOLDOWN)).toBe(true)
  })

  it('suppresses each audited weapon sound at duration - 1 and allows it at duration', async () => {
    const now = vi.spyOn(performance, 'now')
    const { playSfx } = await import('./sfxRegistry.js')

    for (const [id, duration] of Object.entries(AUDITED_WEAPON_COOLDOWNS)) {
      const playsBefore = howlPlay.mock.calls.length
      now.mockReturnValue(0)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} initial`).toBe(playsBefore + 1)

      now.mockReturnValue(duration - 1)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} duration - 1`).toBe(playsBefore + 1)

      now.mockReturnValue(duration)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} duration`).toBe(playsBefore + 2)
    }
  })

  it('applies saved studio volume and rate tuning immediately on playback', async () => {
    const { playSfx, saveSfxTunings } = await import('./sfxRegistry.js')

    saveSfxTunings({ pencilFire: { volume: 0.5, rate: 1.25 } })
    playSfx('pencilFire', 0.8)

    expect(howlVolume).toHaveBeenCalledWith(0.4, 7)
    expect(howlRate).toHaveBeenCalledWith(1.25, 7)
  })

  it('restores a cached sound to the latest saved default pitch', async () => {
    const { playSfx, saveSfxTunings } = await import('./sfxRegistry.js')

    saveSfxTunings({ pencilFire: { volume: 1, rate: 1.35 } })
    playSfx('pencilFire')
    saveSfxTunings({ pencilFire: { volume: 1, rate: 1 } })
    playSfx('pencilFire')

    expect(howlRate).toHaveBeenLastCalledWith(1, 7)
  })
})
