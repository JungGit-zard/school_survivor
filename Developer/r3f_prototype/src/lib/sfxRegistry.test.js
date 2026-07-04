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
})
