import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PLAYER_MESH_LAYOUT, PLAYER_STENCIL_REF } from './PlayerMesh.jsx'

describe('PlayerMesh layout', () => {
  it('keeps the player head connected to the torso during idle and walk bobbing', () => {
    const bodyTop = PLAYER_MESH_LAYOUT.body.position[1] + PLAYER_MESH_LAYOUT.body.size[1] / 2
    const headLowestPointAtPeakBob =
      PLAYER_MESH_LAYOUT.head.baseY + PLAYER_MESH_LAYOUT.motion.maxHeadBobY - PLAYER_MESH_LAYOUT.head.size[1] / 2

    expect(headLowestPointAtPeakBob).toBeLessThanOrEqual(bodyTop)
  })

  it('derives animation limits from the shared head layout', () => {
    expect(PLAYER_MESH_LAYOUT.motion.maxHeadBobY).toBe(
      Math.max(PLAYER_MESH_LAYOUT.motion.idleBreatheY, PLAYER_MESH_LAYOUT.motion.walkBobY)
    )
  })

  it('uses one player-owned stencil layer in Studio, game, and title renders', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(PLAYER_STENCIL_REF).toBe(3)
    expect(source).toContain('material.stencilRef = PLAYER_STENCIL_REF')
    expect(source).toContain('usePlayerStencilMaterial(() => toonMat')
    expect(source).toContain('usePlayerStencilMaterial(() => outlineMat')
  })

  it('places the lantern prop at the right hand tip', () => {
    expect(PLAYER_MESH_LAYOUT.lantern.position).toEqual([0, -0.76, 0.2])
    expect(PLAYER_MESH_LAYOUT.lantern.bodySize).toEqual([0.34, 0.2, 0.24])
    expect(PLAYER_MESH_LAYOUT.lantern.headSize).toEqual([0.18, 0.24, 0.28])
    expect(PLAYER_MESH_LAYOUT.lantern.handleSize).toEqual([0.24, 0.06, 0.11])
  })

  it('renders a light cone from the hand flashlight model', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PlayerLanternLight')
    expect(source).toContain('coneGeometry')
    expect(PLAYER_MESH_LAYOUT.lantern.lightLength).toBeCloseTo(2.08 / 3 / 0.2664)
    expect(PLAYER_MESH_LAYOUT.lantern.lightRadius).toBeCloseTo((3.6 / 2) / 3 / 0.2664)
  })

  it('keeps the floor shadow visible on the classroom floor without drawing over the player body', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')
    const shadowMaterial = source.match(/const shadowMat[\s\S]*?new THREE\.MeshBasicMaterial\(\{([\s\S]*?)\}\)/)?.[1] ?? ''

    expect(PLAYER_MESH_LAYOUT.floorShadow.position[1]).toBeLessThan(-1.1)
    expect(PLAYER_MESH_LAYOUT.floorShadow.scale[0]).toBeGreaterThan(PLAYER_MESH_LAYOUT.floorShadow.scale[1])
    expect(PLAYER_MESH_LAYOUT.floorShadow.opacity).toBeGreaterThanOrEqual(0.4)
    expect(shadowMaterial).toContain('depthTest: true')
    expect(shadowMaterial).toContain('depthWrite: false')
    expect(shadowMaterial).toContain('polygonOffset: true')
    expect(source).toContain('position={PLAYER_MESH_LAYOUT.floorShadow.position}')
    expect(source).toContain('renderOrder={1}')
  })

  it('lifts the mesh so feet touch the floor and the shadow sits above it', () => {
    const RB_Y = 0.32 // Player.jsx RigidBody 높이(콜라이더 반높이)
    const scale = 0.2664 // PLAYER_MESH_SCALE
    const FEET_LOCAL_Y = -1.30 // 발바닥 최하단 로컬 y
    const lift = PLAYER_MESH_LAYOUT.floorLift

    const feetWorldY = RB_Y + lift + scale * FEET_LOCAL_Y
    const shadowWorldY = RB_Y + lift + scale * PLAYER_MESH_LAYOUT.floorShadow.position[1]

    expect(feetWorldY).toBeCloseTo(0, 2) // 발바닥이 바닥면 y=0에 닿음
    expect(shadowWorldY).toBeGreaterThan(0.012) // 그림자가 복도 바닥 레이어(최상단 0.012)보다 위
  })

  it('keeps leg outlines inside the animated leg rigs', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')
    const leftLeg = source.match(/<group ref=\{reg\('legL'\)\}[\s\S]*?<\/group>\s*<\/group>/)?.[0] ?? ''
    const rightLeg = source.match(/<group ref=\{reg\('legR'\)\}[\s\S]*?<\/group>\s*<\/group>/)?.[0] ?? ''

    expect(leftLeg.match(/<OutlineBlock/g)).toHaveLength(3)
    expect(rightLeg.match(/<OutlineBlock/g)).toHaveLength(3)
  })

  it('encodes the pink block survivor reference palette and compact proportions', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(PLAYER_MESH_LAYOUT.body.size).toEqual([0.68, 0.7, 0.46])
    expect(PLAYER_MESH_LAYOUT.head.size).toEqual([0.8, 0.68, 0.58])
    expect(source).toContain('color={0xff8fb0} emissive={0.18}')
    expect(source).toContain('color={0xd94070} emissive={0.14}')
    expect(source).toContain('color={0xcf2f77} emissive={0.12}')
    expect(source).toContain('color={0x005cff} emissive={0.18}')
    expect(source).toContain('color={0x2d8cff} emissive={0.2}')
    expect(source).toContain('color={0xffd100} emissive={0.26}')
  })

  it('preserves the source-controlled player Studio part key registration order', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')
    const registeredParts = Array.from(source.matchAll(/reg\('([^']+)'\)/g), (match) => match[1])

    expect(registeredParts).toEqual([
      'head',
      'hairTop',
      'hairFr',
      'hairSL',
      'hairSR',
      'hairTail',
      'hairClip',
      'eyeL',
      'eyeR',
      'bag',
      'slvL',
      'slvR',
      'lantern',
      'legL',
      'legR',
    ])
  })

  it('composes Studio part offsets into every animated player transform channel', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    const positionParts = [
      'head',
      'hairTop',
      'hairFr',
      'hairSL',
      'hairSR',
      'hairTail',
      'hairClip',
      'eyeL',
      'eyeR',
    ]
    const rotationChannels = {
      legL: ['x'],
      legR: ['x'],
      slvL: ['x', 'y', 'z'],
      slvR: ['x', 'y', 'z'],
      bag: ['x', 'z'],
    }

    positionParts.forEach((part) => {
      expect(source).toMatch(new RegExp(
        `composeStudioPartPosition\\(\\s*parts\\.${part},\\s*'y'`,
      ))
    })
    Object.entries(rotationChannels).forEach(([part, axes]) => {
      axes.forEach((axis) => {
        expect(source).toMatch(new RegExp(
          `composeStudioPartRotation\\(\\s*parts\\.${part},\\s*'${axis}'`,
        ))
      })
    })
    expect(source).toContain('captureStudioPartBaseTransform(el)')
    expect(source).not.toContain('parts.head.position.y = baseY + bob')
    expect(source).not.toContain('parts.legL.rotation.x = sw')
  })
})
