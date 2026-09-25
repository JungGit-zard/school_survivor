import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getPooledEnemyVisibility, setSlotOpacity } from './PooledEnemyVisuals.js'
import * as THREE from 'three'
import { installInstanceAlpha } from './ZombieInstanceLayer.jsx'

const source = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')

describe('ZombieInstanceLayer pooled visibility', () => {
  it('never exposes a revealed body for inactive slots', () => {
    expect(getPooledEnemyVisibility(0, 1000)).toEqual({ smoke: false, body: false, health: false, cue: false })
    expect(getPooledEnemyVisibility(1, 300).body).toBe(true)
  })

  it('does not allocate Three objects, spread arrays, or Object.keys in its frame loop', () => {
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
})

describe('ZombieInstanceLayer GPU prefix uploads', () => {
  it('marks only active meshes, uploads each required active prefix, and keeps static attributes untouched', () => {
    expect(source).toContain('function markMatrix(mesh, count, reset = false)')
    expect(source).toContain('function markMatrixAndColor(mesh, count, reset = false)')
    expect(source).toContain('function markMatrixAndAlpha(mesh, count, reset = false)')
    expect(source).toContain('mesh.visible = count > 0')
    expect(source).toContain('matrix.addUpdateRange(0, reset ? matrix.array.length : count * 16)')
    expect(source).toContain('color.addUpdateRange(0, reset ? color.array.length : count * 3)')
    expect(source).toContain('alpha.addUpdateRange(0, reset ? alpha.array.length : count)')
    expect(source).toMatch(/markMatrixAndColor\(all\.body\[i\],\s*counts\[i\]\)/)
    expect(source).toMatch(/markMatrix\(all\.out\[i\],\s*counts\[i\]\)/)
    expect(source).toContain('markMatrix(all.shadow,bodyCount)')
    expect(source).toMatch(/markMatrix\(all\.bars\[0\],\s*healthCount\)/)
    expect(source).toMatch(/markMatrix\(all\.bars\[1\],\s*healthCount\)/)
    expect(source).toMatch(/markMatrixAndAlpha\(all\.bars\[2\],\s*healthCount\)/)
    expect(source).toMatch(/markMatrix\(all\.bars\[3\],\s*healthCount\)/)
    expect(source).toMatch(/markMatrixAndAlpha\(all\.smoke,\s*smokeCount\)/)
    expect(source).toMatch(/markMatrixAndColor\(all\.cue\[i\],\s*cueCount\)/)
    expect(source).not.toContain('function mark(meshes)')
    expect(source).not.toContain('function markOne(x)')
  })

  it('fully uploads cleared buffers while hiding every pooled primitive during a reset', () => {
    expect(source).toContain('markMatrixAndColor(all.body[i], 0, true)')
    expect(source).toContain('markMatrix(all.out[i], 0, true)')
    expect(source).toContain('markMatrix(all.bars[0], 0, true)')
    expect(source).toContain('markMatrix(all.bars[1], 0, true)')
    expect(source).toContain('markMatrixAndAlpha(all.bars[2], 0, true)')
    expect(source).toContain('markMatrix(all.bars[3], 0, true)')
    expect(source).toContain('markMatrixAndColor(all.cue[i], 0, true)')
    expect(source).toContain('markMatrix(all.shadow, 0, true)')
    expect(source).toContain('markMatrixAndAlpha(all.smoke, 0, true)')
  })
})
