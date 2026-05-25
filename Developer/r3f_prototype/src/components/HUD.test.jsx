// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import {
  UpgradeIcon,
  getUpgradeChoiceDesc,
  getUpgradeChoiceLabel,
  getWeaponUpgradeIconSrc,
  limitDuplicateWeaponUpgradeOptions,
  limitPencilUpgradeOptions,
} from './HUD.jsx'

describe('upgrade choice filtering', () => {
  it('labels run weapon acquisition as 획득, not account 해금', () => {
    expect(getUpgradeChoiceLabel({ key: 'unlockBag' })).toContain('획득')
    expect(getUpgradeChoiceDesc({ key: 'unlockBell', desc: '벨 스킬 해금' })).toBe('벨 스킬 획득')
  })

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

  it('limits every weapon to one card in the three upgrade choices', () => {
    const options = [
      { key: 'umbrellaDamage' },
      { key: 'umbrellaRadius' },
      { key: 'onigiiriDamage' },
      { key: 'onigiiriBounce' },
      { key: 'maxHealth' },
    ]

    const filtered = limitDuplicateWeaponUpgradeOptions(options, () => 0.8)
    const umbrellaCount = filtered.filter((option) => option.key.startsWith('umbrella')).length
    const onigiriCount = filtered.filter((option) => option.key.startsWith('onigiiri')).length

    expect(umbrellaCount).toBe(1)
    expect(onigiriCount).toBe(1)
    expect(filtered.map((option) => option.key)).toContain('maxHealth')
  })
})

describe('weapon upgrade icon assets', () => {
  it('maps every weapon upgrade icon type to an image asset', () => {
    const weaponIconTypes = [
      'pencil',
      'ruler',
      'boxCutter',
      'tumbler',
      'flask',
      'bell',
      'stun',
      'onigiri',
      'missile',
      'starlink',
      'compassBlade',
      'umbrella',
      'eraser',
    ]

    for (const type of weaponIconTypes) {
      expect(getWeaponUpgradeIconSrc(type), `${type} icon`).toMatch(/wea_|weapon_icon|^data:image\//)
    }
  })

  it('leaves non-weapon upgrade icons on the fallback UI path', () => {
    expect(getWeaponUpgradeIconSrc('speed')).toBeNull()
    expect(getWeaponUpgradeIconSrc('health')).toBeNull()
  })

  it('falls back to the drawn weapon icon when an image asset fails to load', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(<UpgradeIcon type="pencil" />)
    })

    const image = container.querySelector('img')
    expect(image).not.toBeNull()

    act(() => {
      image.dispatchEvent(new Event('error', { bubbles: true }))
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-upgrade-fallback-icon="pencil"]')).not.toBeNull()

    act(() => {
      root.unmount()
    })
  })
})
