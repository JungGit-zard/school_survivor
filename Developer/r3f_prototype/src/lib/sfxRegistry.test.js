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
  compassQuack: 180,
  umbrellaHit: 140,
  eraserHit: 160,
  lanternTick: 120,
}

const howlPlay = vi.fn(() => 7)
const howlRate = vi.fn()
const howlVolume = vi.fn()
const howlConfigs = []
let studioSfxTunings = {}

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

vi.mock('./studioRuntimeState.js', () => ({
  getFirebaseStudioRuntimeDataset: (key) => key === 'sfxTunings' ? studioSfxTunings : {},
  setFirebaseStudioRuntimeDataset: (key, value) => {
    if (key === 'sfxTunings') studioSfxTunings = value
    return value
  },
}))

describe('playSfx', () => {
  beforeEach(() => {
    howlPlay.mockClear()
    howlRate.mockClear()
    howlVolume.mockClear()
    howlConfigs.length = 0
    studioSfxTunings = {}
    vi.resetModules()
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

  it('registers the compass duck quack hit sound', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('compassQuack')

    expect(howlConfigs[0].src).toEqual(['/sfx/weapons/compassQuack.ogg', '/sfx/weapons/compassQuack.mp3'])
    expect(statSync(new URL('../../public/sfx/weapons/compassQuack.ogg', import.meta.url)).size).toBeGreaterThan(1000)
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

  it('registers flask and lantern ticks as dedicated non-reused hit assets', async () => {
    const { SOUND_MAP } = await import('./sfxRegistry.js')

    expect(SOUND_MAP.flaskTick).toBe('/sfx/weapons/flaskTick.ogg')
    expect(SOUND_MAP.lanternTick).toBe('/sfx/weapons/lanternTick.ogg')
    expect(SOUND_MAP.flaskTick).not.toBe(SOUND_MAP.chibikoHit)
    expect(SOUND_MAP.lanternTick).not.toBe(SOUND_MAP.chibikoHit)
  })

  it('registers newly audited gameplay feedback cues', async () => {
    const { SOUND_MAP, POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')

    expect(SOUND_MAP).toMatchObject({
      dogeDeath: '/sfx/enemies/dogeDeath.ogg',
      dogeEscape: '/sfx/enemies/dogeEscape.ogg',
      chestDrop: '/sfx/events/chestDrop.ogg',
      chestOpen: '/sfx/events/chestOpen.ogg',
      textbookLand: '/sfx/events/textbookLand.ogg',
      textbookCollect: '/sfx/ui/textbookCollect.ogg',
    })
    expect(POLYPHONY_COOLDOWN).toEqual(expect.objectContaining({
      dogeDeath: 180,
      dogeEscape: 240,
      chestDrop: 160,
      chestOpen: 320,
      textbookLand: 120,
      textbookCollect: 55,
    }))
  })

  it('registers the RZL run-crew coach whistle cue', async () => {
    const { SOUND_MAP, POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')
    expect(SOUND_MAP.rzlWhistle).toBe('/sfx/events/rzlWhistle.ogg')
    expect(POLYPHONY_COOLDOWN).toEqual(expect.objectContaining({ rzlWhistle: 600 }))
  })

  it('registers the Bikitty cutter ratchet, snap and reload as dedicated weapon assets', async () => {
    const { SOUND_MAP, POLYPHONY_COOLDOWN } = await import('./sfxRegistry.js')

    expect(SOUND_MAP).toMatchObject({
      bikittyCutterFire: '/sfx/weapons/bikittyCutterFire.ogg',
      bikittyCutterSnap: '/sfx/weapons/bikittyCutterSnap.ogg',
      bikittyCutterReload: '/sfx/weapons/bikittyCutterReload.ogg',
    })
    expect(POLYPHONY_COOLDOWN).toEqual(expect.objectContaining({
      bikittyCutterFire: 40,
      bikittyCutterSnap: 220,
      bikittyCutterReload: 600,
    }))

    for (const id of ['bikittyCutterFire', 'bikittyCutterSnap', 'bikittyCutterReload']) {
      // 커터칼 계열 기존 음원의 alias가 아니라 전용 음원이어야 한다.
      expect(SOUND_MAP[id]).not.toBe(SOUND_MAP.boxCutterFire)
      expect(SOUND_MAP[id]).not.toBe(SOUND_MAP.boxCutterHit)
      for (const extension of ['ogg', 'mp3']) {
        const assetPath = SOUND_MAP[id].replace(/\.ogg$/, `.${extension}`)
        const assetUrl = new URL(`../../public${assetPath}`, import.meta.url)
        expect(statSync(assetUrl).size, `${id} ${extension}`).toBeGreaterThan(1000)
      }
    }
  })

  it('passes the whole 0.8-1.6 blade-stage pitch ladder through without clamping', async () => {
    const now = vi.spyOn(performance, 'now')
    const { playSfx } = await import('./sfxRegistry.js')
    // 1단(낮음) → 8단(높음). playSfx의 rate clamp는 0.5~2.0이라 이 범위는 전부 통과해야 한다.
    const ladder = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.45, 1.6]

    ladder.forEach((rate, index) => {
      now.mockReturnValue(index * 2400)   // 실제 무기 공격 간격
      playSfx('bikittyCutterFire', 0.5, { rate })
      howlConfigs[0].onend(7)             // 전투 voice 반납
    })

    // 8단 딸깍이 하나도 누락되지 않는다 — cooldown 40ms도, voice cap도 이를 막지 않는다.
    expect(howlPlay).toHaveBeenCalledTimes(ladder.length)
    expect(howlRate.mock.calls.map(([rate]) => rate)).toEqual(ladder)
  })

  it('collapses same-frame duplicate Bikitty cues without touching the next attack', async () => {
    const now = vi.spyOn(performance, 'now')
    const { playSfx } = await import('./sfxRegistry.js')

    for (const [id, cooldown] of [
      ['bikittyCutterFire', 40],
      ['bikittyCutterSnap', 220],
      ['bikittyCutterReload', 600],
    ]) {
      const playsBefore = howlPlay.mock.calls.length
      const config = () => howlConfigs.find((entry) => entry.src[0] === `/sfx/weapons/${id}.ogg`)

      now.mockReturnValue(0)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} initial`).toBe(playsBefore + 1)
      config().onend(7)

      now.mockReturnValue(cooldown - 1)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} same-frame duplicate`).toBe(playsBefore + 1)

      now.mockReturnValue(cooldown)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} after cooldown`).toBe(playsBefore + 2)
      config().onend(7)
    }
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
      howlConfigs.find((config) => config.src[0] === `/sfx/weapons/${id}.ogg`)?.onend(7)

      now.mockReturnValue(duration - 1)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} duration - 1`).toBe(playsBefore + 1)

      now.mockReturnValue(duration)
      playSfx(id)
      expect(howlPlay.mock.calls.length, `${id} duration`).toBe(playsBefore + 2)
      howlConfigs.find((config) => config.src[0] === `/sfx/weapons/${id}.ogg`)?.onend(7)
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

  it('drops low-priority combat voices at the global cap and releases a voice only once', async () => {
    const { COMBAT_VOICE_CAP, playSfx } = await import('./sfxRegistry.js')
    howlPlay.mockImplementationOnce(() => 1)
      .mockImplementationOnce(() => 2)
      .mockImplementationOnce(() => 3)
      .mockImplementationOnce(() => 4)
      .mockImplementationOnce(() => 5)
      .mockImplementationOnce(() => 6)

    for (let index = 0; index < COMBAT_VOICE_CAP; index++) playSfx(`pencilFire`)
    playSfx('rulerFire')
    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP)

    howlConfigs[0].onend(1)
    howlConfigs[0].onstop(1)
    playSfx('rulerFire')
    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP + 1)

    howlConfigs[1].onplayerror(7)
    howlConfigs[1].onend(7)
    playSfx('boxCutterFire')
    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP + 2)
  })

  it('releases every voice token for a logical ID after a load error', async () => {
    const { COMBAT_VOICE_CAP, playSfx } = await import('./sfxRegistry.js')
    howlPlay.mockImplementation((() => {
      let id = 0
      return () => ++id
    })())

    for (let index = 0; index < COMBAT_VOICE_CAP; index++) playSfx('pencilFire')
    playSfx('rulerFire')
    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP)

    howlConfigs[0].onloaderror(null, 'mock load error')
    howlConfigs[0].onloaderror(null, 'duplicate mock load error')
    playSfx('rulerFire')

    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP + 1)
    expect(howlConfigs.at(-1).src).toEqual(['/sfx/weapons/rulerFire.ogg', '/sfx/weapons/rulerFire.mp3'])
  })

  it('always plays protected danger cues even when combat voices reach the cap', async () => {
    const { COMBAT_VOICE_CAP, isProtectedSfx, playSfx } = await import('./sfxRegistry.js')
    howlPlay.mockImplementation((() => {
      let id = 0
      return () => ++id
    })())

    for (let index = 0; index < COMBAT_VOICE_CAP; index++) playSfx(`pencilFire`)
    playSfx('bossWarning')
    playSfx('playerHit')
    playSfx('matildaCountdownEnd')
    playSfx('bossRoar')
    playSfx('matildaDash')

    expect(isProtectedSfx('bossWarning')).toBe(true)
    expect(isProtectedSfx('playerHit')).toBe(true)
    expect(isProtectedSfx('matildaCountdownEnd')).toBe(true)
    expect(isProtectedSfx('bossRoar')).toBe(true)
    expect(isProtectedSfx('matildaDash')).toBe(true)
    expect(howlPlay).toHaveBeenCalledTimes(COMBAT_VOICE_CAP + 5)
  })
})
