import { describe, expect, it } from 'vitest'
import { getStudioTransformProps } from './StudioTunedGroup.jsx'

describe('StudioTunedGroup', () => {
  it('combines global scale, per-axis scale, and default rotation angles', () => {
    const transform = getStudioTransformProps({
      scale: 1.5,
      scaleX: 2,
      scaleY: 1,
      scaleZ: 0.5,
      rotationX: 90,
      rotationY: -90,
      rotationZ: 180,
    })

    expect(transform.scale).toEqual([3, 1.5, 0.75])
    expect(transform.rotation[0]).toBeCloseTo(Math.PI / 2)
    expect(transform.rotation[1]).toBeCloseTo(-Math.PI / 2)
    expect(transform.rotation[2]).toBeCloseTo(Math.PI)
  })
})
