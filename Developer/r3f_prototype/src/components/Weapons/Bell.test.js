import { describe, expect, it } from 'vitest'
import { BELL_KNOCKBACK } from './Bell.jsx'

describe('bell combat tuning', () => {
  it('uses one-and-a-half times the previous zombie knockback strength', () => {
    expect(BELL_KNOCKBACK).toBe(4.8 * 1.5)
  })
})
