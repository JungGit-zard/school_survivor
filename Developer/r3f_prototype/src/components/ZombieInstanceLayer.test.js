import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getPooledEnemyVisibility } from './PooledEnemyVisuals.js'
import * as THREE from 'three'
import { installInstanceAlpha } from './ZombieInstanceLayer.jsx'

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
})
