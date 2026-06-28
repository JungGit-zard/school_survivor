import React from 'react'
import { describe, expect, it } from 'vitest'
import { StrikeVisual } from './Starlink.jsx'

describe('Starlink strike visual', () => {
  it('keeps the ground circle style while rendering it at half visual size', () => {
    const visual = StrikeVisual({ x: 0, z: 0, age: 240 })
    const groundGeometryArgs = findGeometryArgs(visual, new Set(['circleGeometry', 'ringGeometry']))

    expect(groundGeometryArgs).toEqual([
      [0.25, 32],
      [0.5, 32],
      [0.4, 0.525, 32],
      [0.425, 0.575, 32],
    ])
  })
})

function findGeometryArgs(element, geometryTypes) {
  if (!element || typeof element !== 'object') return []
  const own = geometryTypes.has(element.type) ? [element.props.args] : []

  const nested = []
  for (const child of React.Children.toArray(element.props?.children)) {
    nested.push(...findGeometryArgs(child, geometryTypes))
  }
  return [...own, ...nested]
}
