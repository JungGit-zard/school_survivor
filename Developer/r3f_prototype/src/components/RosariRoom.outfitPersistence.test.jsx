// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const scene = vi.hoisted(() => ({ props: null }))
const outfit = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }))
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => { scene.props = children.props.children.props; return null },
  useFrame: vi.fn(), useThree: vi.fn(),
}))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }) }))
vi.mock('../lib/titleSettings.js', () => ({
  loadPlayerOutfit: () => outfit.load(),
  savePlayerOutfit: (id) => outfit.save(id),
}))
import RosariRoom from './RosariRoom.jsx'

describe('Rosari wardrobe persists titleSettings.playerOutfit', () => {
  let container, root
  const buttonByText = (text) => [...container.querySelectorAll('button')].find((node) => node.textContent === text)
  const mount = () => act(() => root.render(<RosariRoom onBack={vi.fn()} />))
  const openWardrobe = () => {
    act(() => scene.props.onNearWardrobeChange(true))
    act(() => buttonByText('옷장 열기').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  }
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    outfit.load.mockReset().mockReturnValue('default')
    outfit.save.mockReset().mockResolvedValue(true)
    container = document.createElement('div'); document.body.append(container)
    root = createRoot(container)
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

  it('starts from the saved outfit', () => {
    outfit.load.mockReturnValue('winter')
    mount()
    expect(scene.props.outfitId).toBe('winter')
    openWardrobe()
    expect(container.textContent).toContain('현재 착용: 동복')
  })

  it('writes the setting on selection and skips re-selecting the current outfit', async () => {
    mount()
    openWardrobe()
    act(() => buttonByText('학교 교복').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(outfit.save).not.toHaveBeenCalled()
    await act(async () => buttonByText('동복').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(outfit.save).toHaveBeenCalledExactlyOnceWith('winter')
    expect(scene.props.outfitId).toBe('winter')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('reverts the room and shows an alert when the save fails', async () => {
    outfit.save.mockResolvedValue(false)
    mount()
    openWardrobe()
    await act(async () => buttonByText('동복').dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(scene.props.outfitId).toBe('default')
    expect(container.querySelector('[role="alert"]').textContent).toContain('저장하지 못했어요')
  })
})
