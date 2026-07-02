import { describe, it, expect, beforeEach } from 'vitest'
import { zombieVisualRegistry } from './zombieVisualRegistry.js'

const ENTRY = { x: 1, y: 0.3, z: 2, yaw: 0.5, type: 'E01', phase: 'chase', wt: 10, vs: 0.33, hitFlash: false }

describe('zombieVisualRegistry', () => {
  beforeEach(() => {
    for (const id of [...zombieVisualRegistry.entries.keys()]) zombieVisualRegistry.unregister(id)
  })

  it('register → update가 필드를 갱신한다', () => {
    zombieVisualRegistry.register(1, ENTRY)
    zombieVisualRegistry.update(1, { ...ENTRY, x: 9 })
    expect(zombieVisualRegistry.entries.get(1).x).toBe(9)
  })

  it('entry가 소실된 뒤 update가 오면 재생성한다 (자가치유 upsert — 투명 좀비 방지)', () => {
    zombieVisualRegistry.register(1, ENTRY)
    zombieVisualRegistry.unregister(1) // HMR 모듈 재평가 등으로 소실된 상황
    zombieVisualRegistry.update(1, { ...ENTRY, x: 7 })
    expect(zombieVisualRegistry.entries.has(1)).toBe(true)
    expect(zombieVisualRegistry.entries.get(1)).toMatchObject({ ...ENTRY, x: 7 })
  })

  it('unregister 이후 update가 없으면 부활하지 않는다 (유령 방지)', () => {
    zombieVisualRegistry.register(1, ENTRY)
    zombieVisualRegistry.unregister(1)
    expect(zombieVisualRegistry.entries.has(1)).toBe(false)
  })
})
