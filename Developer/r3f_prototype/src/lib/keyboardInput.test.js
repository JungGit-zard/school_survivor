// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { moveKeys, resetMoveKeys, applyMoveKey, initKeyboardInput } from './keyboardInput.js'

describe('keyboardInput', () => {
  let dispose

  beforeEach(() => {
    dispose = initKeyboardInput()
  })

  afterEach(() => {
    dispose?.()
    resetMoveKeys()
  })

  it('keydown/keyup이 이동 키 상태를 갱신한다 (WASD + 화살표)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))
    expect(moveKeys.down).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))
    expect(moveKeys.down).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
    expect(moveKeys.up).toBe(true)
  })

  it('이동 키가 아닌 코드는 무시한다', () => {
    expect(applyMoveKey('KeyQ', true)).toBe(false)
    expect(moveKeys).toEqual({ up: false, down: false, left: false, right: false })
  })

  it('창 blur 시 모든 키 상태를 리셋한다 — 알트탭 keyup 유실 시 6시 자동 이동 방지', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    expect(moveKeys.down).toBe(true)
    expect(moveKeys.right).toBe(true)

    // 알트탭: keyup은 다른 창에서 발생해 게임 창에 도달하지 않는다
    window.dispatchEvent(new Event('blur'))

    expect(moveKeys).toEqual({ up: false, down: false, left: false, right: false })
  })

  it('dispose 후에는 키 이벤트를 반영하지 않는다', () => {
    dispose()
    dispose = null
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    expect(moveKeys.up).toBe(false)
  })
})
