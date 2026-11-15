import { describe, expect, it } from 'vitest'
import { subscribeInuconGuard, triggerInuconGuard } from './inuconGuard.js'

describe('inuconGuard', () => {
  it('notifies every guard and stops after unsubscribe', () => {
    let count = 0
    const unsubscribe = subscribeInuconGuard(() => { count += 1 })
    triggerInuconGuard()
    triggerInuconGuard()
    unsubscribe()
    triggerInuconGuard()
    expect(count).toBe(2)
  })

  it('never lets a failing listener break the guard', () => {
    const unsubscribe = subscribeInuconGuard(() => { throw new Error('vfx') })
    expect(() => triggerInuconGuard()).not.toThrow()
    unsubscribe()
  })
})
