import { statSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const howlPlay = vi.fn(() => 7)
const howlRate = vi.fn()
const howlConfigs = []

vi.mock('howler', () => ({
  Howl: vi.fn(function HowlMock(config) {
    howlConfigs.push(config)
    return {
      play: howlPlay,
      rate: howlRate,
    }
  }),
}))

describe('playSfx', () => {
  beforeEach(() => {
    howlPlay.mockClear()
    howlRate.mockClear()
    howlConfigs.length = 0
    vi.resetModules()
  })

  it('plays Matilda spawn through the replaced audio asset', async () => {
    const { playSfx } = await import('./sfxRegistry.js')

    playSfx('matildaSpawn', 0.8)

    expect(howlConfigs[0].src).toEqual(['/sfx/enemies/matildaSpawn.ogg', '/sfx/enemies/matildaSpawn.mp3'])
    expect(statSync(new URL('../../public/sfx/enemies/matildaSpawn.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(howlPlay).toHaveBeenCalledOnce()
    expect(howlRate).not.toHaveBeenCalled()
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
})
