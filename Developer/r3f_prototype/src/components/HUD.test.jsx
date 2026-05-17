import { describe, expect, it } from 'vitest'
import { limitPencilUpgradeOptions } from './HUD.jsx'

describe('upgrade choice filtering', () => {
  it('limits pencil upgrade options to one card', () => {
    const options = [
      { key: 'pencilDamage' },
      { key: 'pencilCount' },
      { key: 'pencilPierce' },
      { key: 'unlockBag' },
      { key: 'maxHealth' },
    ]

    const filtered = limitPencilUpgradeOptions(options, () => 0.4)
    const pencilCount = filtered.filter((option) => option.key.startsWith('pencil')).length

    expect(pencilCount).toBe(1)
    expect(filtered.map((option) => option.key)).toContain('unlockBag')
    expect(filtered.map((option) => option.key)).toContain('maxHealth')
  })
})
