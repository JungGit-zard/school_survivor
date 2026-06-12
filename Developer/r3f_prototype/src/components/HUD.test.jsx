// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  UpgradeIcon,
  getNextUnlockPreview,
  getUpgradeChoiceDesc,
  getUpgradeChoiceLabel,
  getWeaponUpgradeIconSrc,
  limitDuplicateWeaponUpgradeOptions,
  limitPencilUpgradeOptions,
} from './HUD.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { _resetForTests as resetWeaponUnlocks, setUnlocked } from '../lib/weaponUnlocks.js'

afterEach(() => {
  resetWeaponUnlocks()
})

describe('upgrade choice filtering', () => {
  it('labels run weapon acquisition as 획득, not account 해금', () => {
    expect(getUpgradeChoiceLabel({ key: 'acquireBag' })).toContain('획득')
    expect(getUpgradeChoiceLabel({ key: 'acquireChibiko' })).toBe('치비코 획득')
    expect(getUpgradeChoiceDesc({ key: 'acquireBell', desc: '벨 스킬 해금' })).toBe('벨 스킬 획득')
  })

  it('limits pencil upgrade options to one card', () => {
    const options = [
      { key: 'pencilDamage' },
      { key: 'pencilCount' },
      { key: 'pencilPierce' },
      { key: 'acquireBag' },
      { key: 'maxHealth' },
    ]

    const filtered = limitPencilUpgradeOptions(options, () => 0.4)
    const pencilCount = filtered.filter((option) => option.key.startsWith('pencil')).length

    expect(pencilCount).toBe(1)
    expect(filtered.map((option) => option.key)).toContain('acquireBag')
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

  it('does not preview account-locked weapons as next run cards', () => {
    const weapons = buildWeaponsWithStarterWeaponsOwned()

    expect(getNextUnlockPreview('gameover', weapons)).toBeNull()

    setUnlocked('guidedMissile')

    expect(getNextUnlockPreview('gameover', weapons)).toMatchObject({
      weapon: 'guidedMissile',
      minLevel: 4,
    })
  })
})

function buildWeaponsWithStarterWeaponsOwned() {
  const weapons = {}
  for (const [id, entry] of Object.entries(WEAPON_CATALOG)) {
    weapons[id] = {
      ...entry.base,
      label: entry.label,
      active: isStarter(id),
      level: isStarter(id) ? 1 : 0,
    }
  }
  return weapons
}

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
      'chibiko',
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
