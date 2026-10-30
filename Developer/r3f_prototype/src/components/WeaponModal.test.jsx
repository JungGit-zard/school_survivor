// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import WeaponModal from './WeaponModal.jsx'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, setCloudProgressUser } from '../lib/firebaseProgress.js'
import { WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { _resetForTests as resetWeaponUnlocks, setUnlocked } from '../lib/weaponUnlocks.js'

describe('WeaponModal encyclopedia', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    resetWeaponUnlocks()
  })

  it.each(['loading', 'error'])('keeps absent records distinct from real zero: %s', (recordsStatus) => {
    const html = renderToStaticMarkup(<WeaponModal playerRecords={null} recordsStatus={recordsStatus} initialWeaponId="guidedMissile" onRetryRecords={() => {}} />)
    expect(html).toContain('기록 미수신')
    expect(html).toContain(recordsStatus === 'error' ? '기록 불러오기 실패' : '불러오는 중')
    expect(html).not.toMatch(/0\/\d+/)
    if (recordsStatus === 'error') expect(html).toContain('다시 시도')
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
      expect(container.querySelector('[data-testid="weapon-account-unlock-count"]').textContent).toMatch(/\/18$/)
      expect(container.querySelector('[data-testid="weapon-status-bikittyCutter"]').textContent).toContain('런 중 조합')
      act(() => {
        container.querySelector('[data-testid="weapon-filter-locked"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(container.querySelector('[data-testid="weapon-row-bikittyCutter"]')).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('renders the read-only guest catalog without hydrated Firebase progress', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      _resetFirebaseProgressForTests()
      act(() => {
        root.render(<WeaponModal onClose={() => {}} />)
      })

      expect(container.querySelector('[data-testid="weapon-filter-all"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-row-pencilThrow"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-icon-pencilThrow"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="weapon-account-unlock-count"]').textContent).toMatch(/^4\/18$/)
    } finally {
      act(() => root.unmount())
    }
  })

  // 2026-10-26 QA: render-time reads return read-only zero defaults before hydration
  // (readFirebasePlayerProgressOrDefault). Writes stay strict, so nothing is masked remotely.
  it('renders read-only defaults for signed-in account progress that has not hydrated yet', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      _resetFirebaseProgressForTests()
      setCloudProgressUser({ uid: 'signed-in-but-loading' })
      expect(() => {
        act(() => {
          root.render(<WeaponModal onClose={() => {}} />)
        })
      }).not.toThrow()
    } finally {
      act(() => root.unmount())
    }
  })

  it('shows real weapon icon assets for unlocked starter weapons instead of question marks', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<WeaponModal onClose={() => {}} />)
      })

      const starterRow = container.querySelector('[data-testid="weapon-row-pencilThrow"]')
      const starterIcon = starterRow.querySelector('[data-testid="weapon-icon-pencilThrow"]')
      expect(starterIcon).not.toBeNull()
      expect(starterIcon.getAttribute('src')).toContain('01_wea_pencil.png.webp')
      expect(starterRow.textContent).not.toMatch(/^\?/)

      const lockedRow = container.querySelector('[data-testid="weapon-row-guidedMissile"]')
      expect(lockedRow.querySelector('[data-testid="weapon-icon-guidedMissile"]')).toBeNull()
      expect(lockedRow.textContent).toContain('?')
    } finally {
      act(() => root.unmount())
    }
  })

  it('renders an icon for every visible weapon catalog entry', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      Object.keys(WEAPON_CATALOG).forEach((id) => setUnlocked(id))
      act(() => {
        root.render(<WeaponModal onClose={() => {}} />)
      })

      expect(Object.keys(WEAPON_CATALOG)).toHaveLength(21)
      for (const id of Object.keys(WEAPON_CATALOG)) {
        expect(container.querySelector(`[data-testid="weapon-icon-${id}"]`), `${id} icon`).not.toBeNull()
      }
    } finally {
      act(() => root.unmount())
    }
  })
})
