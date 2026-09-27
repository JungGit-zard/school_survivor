import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./VFXLayer.jsx', import.meta.url), 'utf8')
const criticalSection = source.slice(
  source.indexOf('export function CriticalHitBurst'),
  source.indexOf('// ── 효과 2: ChargeWarningLine'),
)

describe('CriticalHitBurst one-star VFX', () => {
  it('uses one large star shape for critical hits instead of ring and multi-shard burst', () => {
    expect(criticalSection).toContain('<shapeGeometry args={[starShape]} />')
    expect(criticalSection).toContain('const outer = 1')
    expect(criticalSection).toContain('const inner = 0.45')
    expect(criticalSection).toContain('event.baseScale ?? 0.34')
    expect(criticalSection).toContain('event.growScale ?? 0.30')
    expect(criticalSection).not.toContain('ringGeometry')
    expect(criticalSection).not.toContain('shardAngles.map')
    expect(criticalSection).not.toContain('criticalFlashMatRef')
  })
})
