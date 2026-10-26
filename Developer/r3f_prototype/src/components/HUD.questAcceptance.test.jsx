// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HUD from './HUD.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
let root, container
const [quest] = getStageQuestDefinitions('stage1')
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  useGameStore.setState({ phase: 'paused', pauseSource: 'dialogue', introDialogue: null, studentDialogue: null, questToast: { type: 'started', questId: quest.id } })
})
afterEach(() => { act(() => root.unmount()); container.remove() })
function render(dialogue = false) {
  if (dialogue) useGameStore.setState({studentDialogue:{dialogueId:quest.startDialogueId,subjectType:'quest',subjectName:quest.giver.name}})
  act(() => root.render(<HUD />))
}
describe('quest acceptance layout regression', () => {
  it('does not render the acceptance message and objective a second time beside the portrait', () => {
    render()
    const popup=container.querySelector('[data-testid="quest-start-popup"]')
    expect(popup.querySelectorAll('strong')).toHaveLength(2) // title + reward, not a duplicate title column
    expect(popup.querySelectorAll('small')).toHaveLength(1)
  })
  it.each([false,true])('constrains the %s dialogue variant to the safe viewport between top HUD and bottom controls', dialogue => {
    render(dialogue)
    const popup=container.querySelector(dialogue?'[data-testid="quest-dialogue-popup"]':'[data-testid="quest-start-popup"]')
    const viewport=popup.closest('[data-testid="quest-banner-viewport"]')
    expect(viewport).not.toBeNull()
    expect(viewport.style.top).toContain('safe-area-inset-top')
    expect(viewport.style.bottom).toContain('safe-area-inset-bottom')
    expect(viewport.style.left).toContain('safe-area-inset-left')
    expect(viewport.style.right).toContain('safe-area-inset-right')
    expect(popup.style.position).toBe('relative')
    expect(popup.style.transform).toBe('none')
    expect(popup.style.maxHeight).toBe('100%')
    expect(popup.style.overflowY).toBe('auto')
    // jsdom drops mixed-unit min() widths; assert the equivalent hard containing bound.
    // The browser matrix additionally measures actual width at every viewport.
    expect(popup.style.maxWidth).toBe('100%')
  })
  it('lets dialogue content scroll without dismissing and provides a keyboard accessible continue button', () => {
    render(true)
    const popup=container.querySelector('[data-testid="quest-dialogue-popup"]')
    act(()=>popup.querySelector('[aria-live]').dispatchEvent(new Event('pointerdown',{bubbles:true})))
    expect(useGameStore.getState().studentDialogue).not.toBeNull()
    const next=popup.querySelector('button')
    expect(next).not.toBeNull()
    expect(next.style.minHeight).toBe('44px')
    act(()=>next.click())
    expect(useGameStore.getState().studentDialogue).toBeNull()
    expect(useGameStore.getState().questToast).toBeNull()
  })
  it('continues when the panel body itself is tapped, as the "tap to continue" hint promises', () => {
    render(true)
    const popup=container.querySelector('[data-testid="quest-dialogue-popup"]')
    act(()=>popup.querySelector('[aria-live]').click())
    expect(useGameStore.getState().studentDialogue).toBeNull()
    expect(useGameStore.getState().questToast).toBeNull()
  })
})
