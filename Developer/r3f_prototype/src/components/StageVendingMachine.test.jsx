import React from 'react'
import { describe, expect, it } from 'vitest'
import { Matrix4, Euler, Quaternion, Vector3 } from 'three'
import StageVendingMachine from './StageVendingMachine.jsx'

function collect(node, parent = new Matrix4(), output = []) {
  if (!React.isValidElement(node)) return output
  if (typeof node.type === 'function') return collect(node.type(node.props), parent, output)
  const matrix = parent.clone().multiply(new Matrix4().compose(
    new Vector3(...(node.props.position ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(node.props.rotation ?? [0, 0, 0]))),
    new Vector3(1, 1, 1),
  ))
  const children = React.Children.toArray(node.props.children)
  if (node.type === 'mesh') {
    const geometry = children.find(c => React.isValidElement(c) && /Geometry$/.test(c.type))
    output.push({ geometry, matrix })
  }
  children.forEach(child => collect(child, matrix, output))
  return output
}
describe('approved vending silhouette geometry', () => {
  it('three colored bottles lie fully in front of glass, without intersection', () => {
    const meshes = collect(StageVendingMachine({}))
    const glass = meshes.find(m => m.geometry?.props.args.join(',') === '0.52,1.05,0.035')
    const bottles = meshes.filter(m => m.geometry?.props.args.join(',') === '0.11,0.3,0.04')
    expect(bottles).toHaveLength(3)
    const glassFront = new Vector3(0, 0, 0.035 / 2).applyMatrix4(glass.matrix).z
    for (const bottle of bottles) {
      expect(new Vector3(0, 0, -0.04 / 2).applyMatrix4(bottle.matrix).z).toBeGreaterThan(glassFront)
    }
  })
  it('coin disk cylinder axis faces front Z rather than up Y', () => {
    const coin = collect(StageVendingMachine({})).find(m => m.geometry?.type === 'cylinderGeometry')
    expect(Math.abs(new Vector3(0, 1, 0).transformDirection(coin.matrix).z)).toBeCloseTo(1)
  })
})
