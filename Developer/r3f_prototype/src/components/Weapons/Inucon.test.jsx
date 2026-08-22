import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INUCON_COMPANION_SCALE } from './Inucon.jsx'

describe('Inucon companion scale', () => {
  it('renders the runtime companion at twice the previous size', () => {
    expect(INUCON_COMPANION_SCALE).toBe(0.36)
  })

  it('uses the shared scale constant on all axes', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toContain('scale={[INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE]}')
    expect(source).not.toContain('scale={[0.18, 0.18, 0.18]}')
  })
})
