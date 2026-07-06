import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'
import { B01_BOSS_FACE_LAYOUT, B01_BOSS_VISUAL_PALETTE, B01_BOSS_VISUAL_PARTS, B02_BOSS_HEAD_LAYOUT, B02_BOSS_VISUAL_PALETTE, B02_BOSS_VISUAL_PARTS } from './ZombieMesh.jsx'

describe('Stage 1 boss visual reference', () => {
  it('defines B01 as the blocky green suit zombie boss at the current gameplay scale', () => {
    expect(ENEMY_STATS.B01).toMatchObject({
      hp: 1150,
      speed: 0.475,
      scale: 2,
      charger: true,
    })

    expect(B01_BOSS_VISUAL_PALETTE).toMatchObject({
      skin: 0x9fb87a,
      jacket: 0x1d2732,
      tie: 0x9f2222,
      pants: 0x5a351d,
      hair: 0x2f281f,
    })
    expect(B01_BOSS_VISUAL_PARTS).toEqual([
      'blockHead',
      'raggedHair',
      'simplifiedFace',
      'suitJacket',
      'whiteShirt',
      'redTie',
      'brownPants',
      'blackShoes',
      'forwardArms',
      'raggedTears',
    ])
  })

  it('keeps the B01 face simple and readable like the reference art', () => {
    expect(B01_BOSS_FACE_LAYOUT).toEqual({
      leftEye: { size: [0.12, 0.09, 0.035], position: [-0.14, 0.05, 0.265], color: 'dark' },
      rightEye: { size: [0.14, 0.105, 0.035], position: [0.14, 0.05, 0.265], color: 'light' },
      rightPupil: { size: [0.045, 0.045, 0.02], position: [0.14, 0.045, 0.292] },
      leftBrow: { size: [0.18, 0.055, 0.035], position: [-0.14, 0.14, 0.292], rotation: [0, 0, -0.14] },
      rightBrow: { size: [0.2, 0.055, 0.035], position: [0.14, 0.15, 0.292], rotation: [0, 0, 0.12] },
      mouth: { size: [0.18, 0.105, 0.04], position: [0.01, -0.16, 0.27] },
      tooth: { size: [0.055, 0.04, 0.035], position: [-0.005, -0.125, 0.295] },
      cheekShadow: { size: [0.07, 0.16, 0.035], position: [0.275, -0.02, 0.20] },
    })

    expect(B01_BOSS_FACE_LAYOUT.leftBrow.position[1]).toBeGreaterThan(B01_BOSS_FACE_LAYOUT.leftEye.position[1])
    expect(B01_BOSS_FACE_LAYOUT.rightBrow.position[1]).toBeGreaterThan(B01_BOSS_FACE_LAYOUT.rightEye.position[1])
  })

  it('uses Matilda idle by default but enables her movement pose in the enemy runtime path', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<MatildaMesh movementPose={animPhase !== \'stun\'} />')
  })

  it('keeps the B01 eye area clear of the old square side-hair blocks', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('position={[-0.23, 0.12, 0.16]}')
    expect(source).not.toContain('position={[0.24, 0.11, 0.12]}')
    expect(source).not.toContain('position={[0.03, 0.12, 0.18]}')
  })
})

describe('Studio part-edit freeze contract', () => {
  it('skips the animation frame loop entirely while frozen', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(source).toMatch(/useFrame\(\(state, delta\) => \{\s*if \(frozen\) return/)
  })

  it('captures the JSX rest pose and restores it when freezing for studio part editing', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    // ref 등록 시(애니메이션 시작 전) rest transform 캡처
    expect(source).toContain('userData.zombieRestRotation = el.rotation.clone()')
    expect(source).toContain('userData.zombieRestScale = el.scale.clone()')
    // frozen 진입 시 rest 복원 + 애니메이션 도중 캡처된 스튜디오 base 폐기 → rest 기준 재캡처
    expect(source).toContain('el.rotation.copy(el.userData.zombieRestRotation)')
    expect(source).toContain('delete el.userData.studioPartBaseRotation')
    expect(source).toContain('delete el.userData.studioPartBaseScale')
  })
})

describe('Stage 2 boss visual reference', () => {
  it('defines B02 as the female teacher zombie boss with a texture-only face', () => {
    expect(ENEMY_STATS.B02).toMatchObject({
      hp: 1150,
      speed: 0.475,
      scale: 2,
      charger: true,
    })

    expect(B02_BOSS_VISUAL_PALETTE).toMatchObject({
      skin: 0x8fb0d8,
      suit: 0x111923,
      skirt: 0x101821,
      hair: 0x171615,
    })
    expect(B02_BOSS_VISUAL_PARTS).toContain('singleFaceTexturePlane')
    expect(B02_BOSS_VISUAL_PARTS).not.toContain('modeledGlasses')
  })

  it('uses boss_02.webp for the face instead of modeling glasses and face parts', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import boss02FaceUrl from '../assets/enemies/boss_02.webp'")
    expect(source).toContain("studioPartId: 'b02-face-texture'")
    expect(source).toContain("studioPartId: 'b02-head'")
    expect(source).toContain("studioPartId: 'b02-body'")
    expect(source).toContain("studioPartId: 'b02-arm-l'")
    expect(source).toContain("studioPartId: 'b02-arm-r'")
    expect(source).toContain("studioPartId: 'b02-leg-l'")
    expect(source).toContain("studioPartId: 'b02-leg-r'")
    expect(source).toContain('studioTextureFit: true')
    expect(source).toContain('depthTest={false}')
    expect(source).toContain('<Boss02FaceTexture hitFlash={hitFlash} />')
    expect(source).not.toContain('B02_BOSS_FACE_LAYOUT')
  })

  it('keeps the B02 face side square and fits the texture plane to it', () => {
    expect(B02_BOSS_HEAD_LAYOUT.headSize[0]).toBe(B02_BOSS_HEAD_LAYOUT.headSize[1])
    expect(B02_BOSS_HEAD_LAYOUT.facePlaneSize).toEqual([
      B02_BOSS_HEAD_LAYOUT.headSize[0],
      B02_BOSS_HEAD_LAYOUT.headSize[1],
    ])
  })

  it('frames the B02 face like the concept art with 3D front hair and cropped face texture', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(B02_BOSS_HEAD_LAYOUT.faceTextureRepeat[0]).toBeLessThan(1)
    expect(B02_BOSS_HEAD_LAYOUT.faceTextureRepeat[1]).toBeLessThan(1)
    expect(source).toContain('position={[0, 0.35, 0.08]}')
    expect(source).toContain('position={[-0.37, 0.16, 0.16]}')
    expect(source).toContain('position={[0.37, 0.16, 0.16]}')
    expect(source).toContain('position={[-0.39, -0.04, -0.16]}')
    expect(source).toContain('position={[0.39, -0.04, -0.16]}')
    expect(source).toContain('position={[0, -0.02, -0.34]}')
  })
})
