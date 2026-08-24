import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./StageLighting.jsx', import.meta.url), 'utf8')

describe('StageLighting static R3F contract', () => {
  it('renders profile lights only and attaches every SpotLight to its exact static Object3D target', () => {
    expect(source).toContain("import { useLayoutEffect, useRef } from 'react'")
    expect(source).toContain("import { getStageLightingProfile } from '../lib/stageLightingProfile.js'")
    expect(source).toContain('<spotLight')
    expect(source).toContain('<pointLight')
    expect(source).toContain('<object3D ref={targetRef} position={light.target} />')
    expect(source).toContain('lightRef.current.target = targetRef.current')
    expect(source).toContain('targetRef.current.updateMatrixWorld()')
    expect(source).toContain('castShadow={false}')
  })

  it('has no frame-driven, visible-helper, or allocation-based lighting path', () => {
    expect(source).not.toContain('useFrame')
    expect(source).not.toContain('setState')
    expect(source).not.toMatch(/new\s+THREE\./)
    expect(source).not.toMatch(/random/i)
    expect(source).not.toMatch(/helper/i)
    expect(source).not.toContain('mesh')
  })
})
