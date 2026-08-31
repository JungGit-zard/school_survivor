import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getPooledEnemyVisibility, setSlotOpacity } from './PooledEnemyVisuals.js'
import * as THREE from 'three'
import { installInstanceAlpha, markInstanceAttributePrefix, markInstancedMeshFullUpdate, markInstancedMeshPrefixUpdate } from './ZombieInstanceLayer.jsx'

describe('ZombieInstanceLayer pooled visibility', () => {
  it('never exposes a revealed body for inactive slots', () => {
    expect(getPooledEnemyVisibility(0, 1000)).toEqual({ smoke: false, body: false, health: false, cue: false })
    expect(getPooledEnemyVisibility(1, 300).body).toBe(true)
  })

  it('does not allocate Three objects, spread arrays, or Object.keys in its frame loop', () => {
    const source = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    const frame = source.slice(source.indexOf('useFrame((_,delta)'), source.indexOf('\n  return <>'))
    expect(frame).not.toContain('new THREE.')
    expect(frame).not.toContain('...')
    expect(frame).not.toContain('Object.keys')
    expect(frame).not.toContain('`')
    expect(frame).not.toContain('for(const')
    expect(frame).not.toContain('return {')
  })

  it('patches alpha after output_fragment so the output include cannot overwrite it', () => {
    const geo = new THREE.PlaneGeometry(1, 1); const mat = new THREE.MeshBasicMaterial({ transparent: true })
    installInstanceAlpha(geo, mat, 2)
    const shader = { vertexShader: '#include <begin_vertex>', fragmentShader: 'void main() {\n#include <output_fragment>\n}' }
    mat.onBeforeCompile(shader)
    expect(shader.fragmentShader.indexOf('#include <output_fragment>')).toBeLessThan(shader.fragmentShader.indexOf('gl_FragColor.a *= pooledInstanceAlpha'))
    geo.dispose(); mat.dispose()
  })

  it('writes slot opacity into the installed InstancedBufferAttribute backing array', () => {
    const geo = new THREE.PlaneGeometry(1, 1); const mat = new THREE.MeshBasicMaterial({ transparent: true })
    const alpha = installInstanceAlpha(geo, mat, 2)

    expect(setSlotOpacity(alpha, 1, .35)).toBeCloseTo(.35)
    expect(alpha.array[1]).toBeCloseTo(.35)
    geo.dispose(); mat.dispose()
  })

  it('keeps cluster culling disabled but compacts every visible zombie mesh to contiguous GPU slots', () => {
    const source = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    expect(source).toContain('x.frustumCulled = false')
    expect(source).toContain('const partRenderSlot=counts[slot]++')
    expect(source).toContain('all.body[slot].setMatrixAt(partRenderSlot,a)')
    expect(source).toContain('all.out[slot].setMatrixAt(partRenderSlot,a)')
    expect(source).toContain('all.body[i].count=counts[i]')
    expect(source).toContain('all.out[i].count=counts[i]')
    expect(source).toContain('all.shadow.count=bodyCount')
    expect(source).toContain('all.bars[i].count=healthCount')
    expect(source).toContain('all.smoke.count=smokeCount')
  })

  it('marks only positive-count prefix ranges for matrix, color, and alpha attributes', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ vertexColors: true })
    const mesh = new THREE.InstancedMesh(geometry, material, 4)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(12), 3)
    mesh.userData.instanceAlpha = new THREE.InstancedBufferAttribute(new Float32Array(4), 1)

    expect(markInstancedMeshPrefixUpdate(mesh, 0, { matrix: true, color: true, alpha: true })).toEqual({ matrix: false, color: false, alpha: false })
    expect(mesh.instanceMatrix.updateRanges).toEqual([])
    expect(mesh.instanceColor.updateRanges).toEqual([])
    expect(mesh.userData.instanceAlpha.updateRanges).toEqual([])

    expect(markInstancedMeshPrefixUpdate(mesh, 2, { matrix: true, color: true, alpha: true })).toEqual({ matrix: true, color: true, alpha: true })
    expect(mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 32 }])
    expect(mesh.instanceColor.updateRanges).toEqual([{ start: 0, count: 6 }])
    expect(mesh.userData.instanceAlpha.updateRanges).toEqual([{ start: 0, count: 2 }])
    geometry.dispose(); material.dispose()
  })

  it('leaves static alpha or color attributes unmarked when the frame path does not request them', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ vertexColors: true })
    const mesh = new THREE.InstancedMesh(geometry, material, 4)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(12), 3)
    mesh.userData.instanceAlpha = new THREE.InstancedBufferAttribute(new Float32Array(4), 1)

    markInstancedMeshPrefixUpdate(mesh, 3, { matrix: true, color: false, alpha: false })

    expect(mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 48 }])
    expect(mesh.instanceColor.updateRanges).toEqual([])
    expect(mesh.userData.instanceAlpha.updateRanges).toEqual([])
    geometry.dispose(); material.dispose()
  })

  it('reset marking still uploads full canonical buffers after clearing every update range', () => {
    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true })
    const mesh = new THREE.InstancedMesh(geometry, material, 4)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(12), 3)
    mesh.userData.instanceAlpha = new THREE.InstancedBufferAttribute(new Float32Array(4), 1)
    markInstanceAttributePrefix(mesh.instanceMatrix, 1, 16)
    markInstanceAttributePrefix(mesh.instanceColor, 1, 3)
    markInstanceAttributePrefix(mesh.userData.instanceAlpha, 1, 1)

    markInstancedMeshFullUpdate(mesh, { matrix: true, color: true, alpha: true })

    expect(mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 64 }])
    expect(mesh.instanceColor.updateRanges).toEqual([{ start: 0, count: 12 }])
    expect(mesh.userData.instanceAlpha.updateRanges).toEqual([{ start: 0, count: 4 }])
    geometry.dispose(); material.dispose()
  })
})
