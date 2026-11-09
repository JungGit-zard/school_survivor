// @vitest-environment jsdom
// Wardrobe locked state + the outfit feature table, both driven by outfitCatalog.js only.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RosariWardrobeBody, { OutfitFeatureTable, OutfitTableButton } from './RosariWardrobePanel.jsx'
import { OUTFIT_IDS, getOutfit, getOutfitAbilities, listOutfits } from '../lib/outfitCatalog.js'
import { _resetGuestOutfitUnlocksForTests, grantOutfitUnlocksFromRecords } from '../lib/outfitUnlocks.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getLocale, setLocale, t } from '../lib/i18n.js'

let container, root, originalLocale
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  originalLocale = getLocale()
  setLocale('ko')
  // Guest session (not hydrated, no uid): ownership lives in this module's memory only.
  _resetFirebaseProgressForTests()
  _resetGuestOutfitUnlocksForTests()
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount()); container.remove()
  _resetGuestOutfitUnlocksForTests()
  _seedHydratedFirebaseProgressForTests()
  setLocale(originalLocale)
})

const optionFor = (id) => container.querySelector(`[role="group"] [data-outfit-id="${id}"]`)
const click = (node) => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })))

function renderBody(props = {}) {
  const onSelect = vi.fn()
  act(() => root.render(<RosariWardrobeBody currentOutfitId="default" onSelect={onSelect} saveFailed={false} {...props} />))
  return { onSelect }
}

describe('wardrobe locked state', () => {
  it('a new guest owns only the school uniform; the other five show a lock and their condition', () => {
    const { onSelect } = renderBody()
    expect([...container.querySelectorAll('[role="group"] button')].map((b) => b.dataset.outfitId)).toEqual(listOutfits().map((o) => o.id))
    expect(optionFor('default').getAttribute('aria-pressed')).toBe('true')
    expect(optionFor('default').hasAttribute('aria-disabled')).toBe(false)
    const expected = { winter: 'Stage 1 탈출 1회', raincoat: 'Stage 2 탈출 1회', gym: 'Stage 3 탈출 1회', apron: 'Stage 4 탈출 1회', grad: 'Stage 1~4 모두 탈출' }
    for (const [id, condition] of Object.entries(expected)) {
      const option = optionFor(id)
      expect(option.getAttribute('aria-disabled')).toBe('true')
      expect(option.dataset.outfitLocked).toBe('true')
      expect(option.querySelector('svg')).not.toBeNull()
      expect(option.textContent).toContain(condition)
      expect(option.getAttribute('aria-label')).toContain(condition)
      expect(option.style.minHeight).toBe('44px')
    }
    // Pressing a locked outfit previews it but never wears it.
    click(optionFor('gym'))
    expect(onSelect).not.toHaveBeenCalled()
    const detail = container.querySelector('[data-outfit-detail]')
    expect(detail.dataset.outfitDetail).toBe('gym')
    expect(detail.textContent).toContain('아직 없는 옷이에요')
    expect(detail.textContent).toContain('이동속도 +6%')
    expect(detail.textContent).toContain('최대 체력 -12')
    expect(container.textContent).toContain('로그인하면 옷이 계정에 저장돼요')
  })

  it('an unlocked outfit can be worn and shows one pro and one con line', () => {
    grantOutfitUnlocksFromRecords({ stage1Clears: 1 })
    const { onSelect } = renderBody()
    const winter = optionFor('winter')
    expect(winter.hasAttribute('aria-disabled')).toBe(false)
    expect(winter.getAttribute('aria-pressed')).toBe('false')
    click(winter)
    expect(onSelect).toHaveBeenCalledWith('winter')
    act(() => root.render(<RosariWardrobeBody currentOutfitId="winter" onSelect={onSelect} saveFailed={false} />))
    expect(container.querySelector('[data-outfit-wearing]').textContent).toBe('현재 착용: 동복받는 피해 -8% / 이동속도 -4%')
    const detail = container.querySelector('[data-outfit-detail]')
    expect([...detail.querySelectorAll('[data-outfit-ability]')].map((n) => [n.dataset.outfitAbility, n.textContent])).toEqual([
      ['pro', '장점받는 피해 -8%'],
      ['con', '단점이동속도 -4%'],
    ])
    expect(optionFor('raincoat').getAttribute('aria-disabled')).toBe('true')
  })

  it('the feature-table device is a 44px button', () => {
    const onOpenTable = vi.fn()
    act(() => root.render(<OutfitTableButton onOpen={onOpenTable} />))
    const device = container.querySelector('[data-outfit-table-open]')
    expect(device.textContent).toBe('의상 능력표')
    expect(device.style.minHeight).toBe('44px')
    click(device)
    expect(onOpenTable).toHaveBeenCalledTimes(1)
  })
})

describe('outfit feature table', () => {
  it('lists every released outfit from the catalog with condition, owned/locked, upside and downside', () => {
    grantOutfitUnlocksFromRecords({ stage2Clears: 1 })
    act(() => root.render(<OutfitFeatureTable onClose={() => {}} />))
    const rows = [...container.querySelectorAll('tbody tr')]
    // Stage 5·6 의상(prefect·sportsDay)도 외형이 생겨(2026-11-08) 표에 나온다.
    expect(rows.map((row) => row.dataset.outfitRow)).toEqual([...OUTFIT_IDS])
    for (const row of rows) {
      const id = row.dataset.outfitRow
      const outfit = getOutfit(id)
      expect(row.textContent).toContain(t(outfit.nameKey))
      const condition = outfit.unlock.labelKey ? t(outfit.unlock.labelKey, outfit.unlock.labelParams) : t('outfit.unlock.always')
      expect(row.textContent).toContain(condition)
      const owned = id === 'default' || id === 'raincoat'
      expect(row.dataset.outfitOwned).toBe(String(owned))
      expect(row.textContent).toContain(owned ? '보유' : '잠김')
      const lines = [...row.querySelectorAll('[data-outfit-ability]')]
      const abilities = getOutfitAbilities(id)
      if (abilities.length === 0) {
        expect(lines.map((n) => n.dataset.outfitAbility)).toEqual(['none'])
        expect(row.textContent).toContain('능력 없음')
      } else {
        expect(lines.map((n) => n.dataset.outfitAbility)).toEqual(['pro', 'con'])
        abilities.forEach((ability, i) => expect(lines[i].textContent).toContain(t(ability.labelKey, { v: ability.display })))
      }
    }
  })

  it('focuses the close button and closes from it', () => {
    const onClose = vi.fn()
    act(() => root.render(<OutfitFeatureTable onClose={onClose} />))
    const close = container.querySelector('[data-outfit-feature-table] button')
    expect(document.activeElement).toBe(close)
    expect(close.style.minHeight).toBe('44px')
    click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the table in English', () => {
    setLocale('en')
    act(() => root.render(<OutfitFeatureTable onClose={() => {}} />))
    const text = container.textContent
    for (const fragment of ['Outfit chart', 'Lunch Duty Apron', 'Escape all of Stages 1–4', 'XP gain +8%', 'Damage taken +8%', 'Locked', 'Owned']) {
      expect(text).toContain(fragment)
    }
  })
})
