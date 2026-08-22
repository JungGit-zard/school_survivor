// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import WeaponModal from './WeaponModal.jsx'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { _resetForTests as resetWeaponUnlocks } from '../lib/weaponUnlocks.js'

describe('WeaponModal encyclopedia', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    resetWeaponUnlocks()
  })

  it('opens a requested weapon detail and exposes unlock-state filters', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<WeaponModal onClose={() => {}} initialWeaponId="guidedMissile" newlyUnlockedWeaponIds={['guidedMissile']} />)
      })

      expect(container.querySelector('[data-testid="weapon-detail-guidedMissile"]')).not.toBeNull()
      act(() => {
        container.querySelector('[data-testid="weapon-detail-back"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(container.querySelector('[data-testid="weapon-filter-all"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-filter-unlocked"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-filter-locked"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-filter-new"]')).not.toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('keeps runtime combination weapons out of the account-locked filter', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<WeaponModal onClose={() => {}} />)
      })
      expect(container.querySelector('[data-testid="weapon-account-unlock-count"]').textContent).toMatch(/\/17$/)
      expect(container.querySelector('[data-testid="weapon-status-bikittyCutter"]').textContent).toContain('런 중 조합')
      act(() => {
        container.querySelector('[data-testid="weapon-filter-locked"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(container.querySelector('[data-testid="weapon-row-bikittyCutter"]')).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })
})
