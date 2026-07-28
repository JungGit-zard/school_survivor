import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./ProceduralFaceTestZombie.jsx', import.meta.url), 'utf8')

describe('ProceduralFaceTestZombie contracts', () => {
  it('draws the complete face with one shader plane and no image-backed path', () => {
    expect(source).toContain('<shaderMaterial')
    expect(source).toContain('fragmentShader={FACE_FRAGMENT_SHADER}')
    expect(source).toContain('<planeGeometry args={[0.54, 0.48]} />')
    expect(source).toContain('float leftEye')
    expect(source).toContain('float brows')
    expect(source).toContain('float nose')
    expect(source).toContain('float mouth')
    expect(source).toContain('float smile = softLine')
    expect(source).toContain('float mouth = clamp(smile, 0.0, 1.0);')
    expect(source).toContain('vec2(-0.14, -0.15)')
    expect(source).toContain('vec2(0.14, -0.15)')
    expect(source).toContain('float scar')
    expect(source).not.toMatch(/TextureLoader|useLoader|CanvasTexture|sampler2D|texture\s*\(|texture2D\s*\(|assets\/faces/i)
  })

  it('keeps the face non-focusable, non-tunable, transparent outside the face, and off raycasting', () => {
    expect(source).toContain('studioNonFocusable: true, studioNonTunable: true')
    expect(source).toContain('raycast={disableRaycast}')
    expect(source).toContain('depthWrite={false}')
    expect(source).toContain('toneMapped={false}')
    expect(source).toContain('position={[0, 0, 0.251]}')
    expect(source).toContain('float faceMask')
  })

  it('uses E01-compatible cached toon box helpers with readable fixed-order part names', () => {
    expect(source).toContain('getCachedBoxGeo')
    expect(source).toContain('getCachedToonMat')
    expect(source).toContain('getSharedOutlineMat')
    expect(source).toContain('inflateScale')
    expect(source).toContain('name="procedural-face-head"')
    expect(source).toContain('name="procedural-face-body"')
    expect(source).toContain('name="procedural-face-arm-left"')
    expect(source).toContain('name="procedural-face-arm-right"')
    expect(source).toContain('name="procedural-face-leg-left"')
    expect(source).toContain('name="procedural-face-leg-right"')
  })

  it('shares the Zombie E01 canonical numeric child-path contract with a fixed pivot-to-visual part order', () => {
    expect(source).not.toContain('studioPartId')
    expect(source).toContain('<group name={name} position={position} rotation={rotation}>')
    expect(source).toContain('<group name={`${name}-visual`}>')

    const partMarkers = [
      'procedural-face-head',
      'procedural-face-body',
      'procedural-face-arm-left',
      'procedural-face-arm-right',
      'procedural-face-leg-left',
      'procedural-face-leg-right',
    ]
    const partIndexes = partMarkers.map((marker) => source.indexOf(marker))

    expect(partIndexes.every((index) => index >= 0)).toBe(true)
    expect(partIndexes.every((index, position) => position === 0 || index > partIndexes[position - 1])).toBe(true)
  })

  it('keeps the numeric-path fill mesh as the parent of its outline and face children', () => {
    const zombiePartSource = source.match(/function ZombiePart[\s\S]*?\n}\n\nfunction ProceduralFace/)
    const fillMeshHierarchy = zombiePartSource?.[0].match(/<mesh renderOrder=\{2\}[\s\S]*?<\/mesh>/)

    expect(fillMeshHierarchy).not.toBeNull()
    expect(fillMeshHierarchy?.[0]).toContain('studioRenderOutline')
    expect(fillMeshHierarchy?.[0]).toContain('{children}')
  })

  it('updates only the shader time uniform each frame without React state', () => {
    expect(source).toContain('useFrame(({ clock }) =>')
    expect(source).toContain('materialRef.current.uniforms.uTime.value = clock.getElapsedTime()')
    expect(source).not.toContain('useState')
    expect(source).not.toContain('setState')
  })

  it('keeps eyes open between short blinks and limits the shader alpha to face features', () => {
    expect(source).toContain('float blinkAmount = pow(max(0.0, sin(uTime * 0.7)), 20.0);')
    expect(source).toContain('float eyeHeight = mix(0.065, 0.008, blinkAmount);')
    expect(source).toContain('float pupils = leftEye * softCircle')
    expect(source).toContain('rightEye * softCircle')
    expect(source).toContain('vec3(1.0, 0.93, 0.68)')
    expect(source).toContain('vec3(0.055, 0.025, 0.06)')
    expect(source).toContain('vec3(0.86, 0.12, 0.18)')
    expect(source).toContain('float alpha = faceMask * max(max(eyeMask, darkFeatures), scarMask);')
    expect(source).not.toContain('max(0.2,')
  })
})
