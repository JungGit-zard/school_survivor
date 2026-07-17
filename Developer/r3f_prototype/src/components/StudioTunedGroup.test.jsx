// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  applySavedStudioPartTunings,
  applyStudioTuning,
  captureStudioPartBaseTransform,
  composeStudioPartPosition,
  composeStudioPartRotation,
  disposeStudioOwnedMaterials,
  getStudioTransformProps,
} from './StudioTunedGroup.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { saveStudioTunings } from '../lib/graphicsStudioConfig.js'

describe('StudioTunedGroup', () => {
  it('combines scale, position, and default rotation angles', () => {
    const transform = getStudioTransformProps({
      scale: 1.5,
      scaleX: 2,
      scaleY: 1,
      scaleZ: 0.5,
      positionX: 0.25,
      positionY: -0.5,
      positionZ: 1.2,
      rotationX: 90,
      rotationY: -90,
      rotationZ: 180,
    })

    expect(transform.scale).toEqual([3, 1.5, 0.75])
    expect(transform.position).toEqual([0.25, -0.5, 1.2])
    expect(transform.rotation[0]).toBeCloseTo(Math.PI / 2)
    expect(transform.rotation[1]).toBeCloseTo(-Math.PI / 2)
    expect(transform.rotation[2]).toBeCloseTo(Math.PI)
  })

  it('applies confirmed studio material tuning outside the studio preview', () => {
    const root = new THREE.Group()
    const bodyMat = new THREE.MeshToonMaterial({
      color: 0x223344,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x050209,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1,
    })
    outlineMat.stencilWrite = true
    outlineMat.stencilFunc = THREE.NotEqualStencilFunc
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bodyMat)
    const outline = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), outlineMat)

    root.add(body, outline)
    applyStudioTuning(root, {
      color: '#ff0000',
      colorStrength: 1,
      outlineColor: '#00ff00',
      outlineOpacity: 0.5,
      outlineThickness: 2,
      emissiveIntensity: 0.4,
    })

    expect(body.material.color.getHexString()).toBe('ff0000')
    expect(body.material.emissiveIntensity).toBe(0.4)
    expect(outline.material.color.getHexString()).toBe('00ff00')
    expect(outline.material.opacity).toBe(0.5)
    expect(bodyMat.color.getHexString()).toBe('223344')
    expect(outlineMat.color.getHexString()).toBe('050209')
    expect(outline.scale.x).toBeCloseTo(1.12)
  })

  it('does not mistake a regular BackSide fill for an outline during Apply', () => {
    const root = new THREE.Group()
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0xff66aa,
      side: THREE.BackSide,
    })
    const fill = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 4), fillMaterial)
    root.add(fill)

    applyStudioTuning(root, {
      color: '#ffffff',
      colorStrength: 0,
      outlineColor: '#000000',
      outlineOpacity: 1,
      outlineThickness: 1.4,
    })

    expect(fill.material).not.toBe(fillMaterial)
    expect(fill.material.color.getHex()).toBe(0xff66aa)
    expect(fill.material.opacity).toBe(1)
    expect(fill.scale.equals(new THREE.Vector3(1, 1, 1))).toBe(true)
  })

  it('updates game groups immediately when studio tuning is saved', () => {
    localStorage.clear()
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(<StudioTunedGroup itemId="player" materialTuning={false}><mesh /></StudioTunedGroup>)
    })
    expect(container.querySelector('group').getAttribute('scale')).toBe('1,1,1')

    act(() => {
      saveStudioTunings({ player: { scale: 1.5, scaleX: 2 } })
    })

    expect(container.querySelector('group').getAttribute('scale')).toBe('3,1.5,1.5')

    act(() => root.unmount())
  })

  it('requests a frame after studio tuning is applied for demand-rendered previews', () => {
    const source = readFileSync('src/components/StudioTunedGroup.jsx', 'utf8')

    expect(source).toContain("import { invalidate } from '@react-three/fiber'")
    expect(source).toContain('applySavedStudioPartTunings(groupRef.current, itemId, tunings, { materialTuning })')
    expect(source).toContain('invalidate()')
  })

  it('applies confirmed part focus tuning to game meshes', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    root.add(part)

    applySavedStudioPartTunings(root, 'player', {
      'player::part::0': {
        scale: 1.25,
        scaleX: 2,
        positionY: 0.75,
        rotationZ: 90,
      },
    })

    expect(part.scale.x).toBeCloseTo(2.5)
    expect(part.scale.y).toBeCloseTo(1.25)
    expect(part.position.y).toBeCloseTo(0.75)
    expect(part.rotation.z).toBeCloseTo(Math.PI / 2)
  })

  it('does not accumulate saved part position when Apply runs repeatedly', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    part.userData.studioPartId = 'sample-head'
    root.add(part)

    const tunings = {
      'zombie-e01::part::id:sample-head': {
        scale: 1.2,
        positionY: -0.4,
      },
    }

    applySavedStudioPartTunings(root, 'zombie-e01', tunings)
    applySavedStudioPartTunings(root, 'zombie-e01', tunings)

    expect(part.scale.x).toBeCloseTo(1.2)
    expect(part.position.y).toBeCloseTo(-0.4)
  })

  it('composes saved part offsets with animation without accumulating and clears removed tuning', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    part.position.set(0.2, 1.1, -0.3)
    part.rotation.set(0.1, -0.2, 0.3)
    root.add(part)
    const tunings = {
      'player::part::0': {
        positionY: 0.75,
        rotationX: 30,
      },
    }

    applySavedStudioPartTunings(root, 'player', tunings)
    applySavedStudioPartTunings(root, 'player', tunings)

    expect(composeStudioPartPosition(part, 'y', 1.1, 0.02)).toBeCloseTo(1.87)
    expect(composeStudioPartRotation(part, 'x', 0.1, -0.15)).toBeCloseTo(
      0.1 + THREE.MathUtils.degToRad(30) - 0.15,
    )
    expect(part.userData.studioPartPositionOffset.y).toBeCloseTo(0.75)
    expect(part.userData.studioPartRotationOffset.x).toBeCloseTo(THREE.MathUtils.degToRad(30))

    applySavedStudioPartTunings(root, 'player', {})

    expect(composeStudioPartPosition(part, 'y', 1.1, 0.02)).toBeCloseTo(1.12)
    expect(composeStudioPartRotation(part, 'x', 0.1, -0.15)).toBeCloseTo(-0.05)
    expect(part.position.y).toBeCloseTo(1.1)
    expect(part.rotation.x).toBeCloseTo(0.1)

    part.position.y = 1.12
    part.rotation.x = 0.25
    applySavedStudioPartTunings(root, 'player', {})

    expect(part.position.y).toBeCloseTo(1.12)
    expect(part.rotation.x).toBeCloseTo(0.25)
  })

  it('keeps the authored base when a part receives its first live Apply during animation', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    part.position.set(0.2, 1.1, -0.3)
    part.rotation.set(0.1, -0.2, 0.3)
    root.add(part)
    captureStudioPartBaseTransform(part)

    part.position.y = 1.13
    part.rotation.x = -0.4
    applySavedStudioPartTunings(root, 'player', {
      'player::part::0': {
        positionY: 0.75,
        rotationX: 30,
      },
    })

    expect(part.position.y).toBeCloseTo(1.85)
    expect(part.rotation.x).toBeCloseTo(0.1 + THREE.MathUtils.degToRad(30))
    expect(composeStudioPartPosition(part, 'y', 1.1, 0.02)).toBeCloseTo(1.87)
    expect(composeStudioPartRotation(part, 'x', 0.1, -0.15)).toBeCloseTo(
      0.1 + THREE.MathUtils.degToRad(30) - 0.15,
    )
  })

  it('does not reset a pre-captured animated part until that part has Studio tuning', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    part.position.y = 1.1
    part.rotation.x = 0.1
    root.add(part)
    captureStudioPartBaseTransform(part)

    part.position.y = 1.12
    part.rotation.x = 0.25
    applySavedStudioPartTunings(root, 'player', {})

    expect(part.position.y).toBeCloseTo(1.12)
    expect(part.rotation.x).toBeCloseTo(0.25)
  })

  it('has zero drift across repeated animation frames and alternating live Apply values', () => {
    const root = new THREE.Group()
    const part = new THREE.Group()
    const restPosition = new THREE.Vector3(0.2, 1.1, -0.3)
    const restRotation = new THREE.Vector3(0.1, -0.2, 0.3)
    const restScale = new THREE.Vector3(1.1, 0.8, 1.3)
    part.position.copy(restPosition)
    part.rotation.set(restRotation.x, restRotation.y, restRotation.z)
    part.scale.copy(restScale)
    root.add(part)
    captureStudioPartBaseTransform(part)

    const tuningA = {
      positionX: 0.25,
      positionY: 0.75,
      positionZ: -0.35,
      rotationX: 30,
      rotationY: -25,
      rotationZ: 15,
      scale: 1.2,
      scaleX: 1.1,
      scaleY: 0.9,
      scaleZ: 1.3,
    }
    const tuningB = {
      positionX: -0.5,
      positionY: -0.4,
      positionZ: 0.6,
      rotationX: -20,
      rotationY: 40,
      rotationZ: -35,
      scale: 0.85,
      scaleX: 0.75,
      scaleY: 1.25,
      scaleZ: 1.1,
    }
    const axes = ['x', 'y', 'z']
    const positionField = { x: 'positionX', y: 'positionY', z: 'positionZ' }
    const rotationField = { x: 'rotationX', y: 'rotationY', z: 'rotationZ' }
    const scaleField = { x: 'scaleX', y: 'scaleY', z: 'scaleZ' }
    const capturedBasePosition = part.userData.studioPartBasePosition.clone()
    const capturedBaseRotation = part.userData.studioPartBaseRotation.clone()
    const capturedBaseScale = part.userData.studioPartBaseScale.clone()
    let activeTuning = tuningA

    for (let frame = 0; frame < 100; frame += 1) {
      if (frame === 25) activeTuning = tuningB
      if (frame === 60) activeTuning = tuningA
      if (frame === 25 || frame === 60) {
        applySavedStudioPartTunings(root, 'player', {
          'player::part::0': activeTuning,
        })
      }
      if (frame === 0) {
        part.position.set(
          restPosition.x + 0.01,
          restPosition.y + 0.02,
          restPosition.z - 0.03,
        )
        part.rotation.set(
          restRotation.x + 0.15,
          restRotation.y - 0.08,
          restRotation.z + 0.04,
        )
        applySavedStudioPartTunings(root, 'player', {
          'player::part::0': activeTuning,
        })
      }

      const animationPosition = {
        x: Math.sin(frame * 0.17) * 0.01,
        y: Math.sin(frame * 0.37) * 0.02,
        z: Math.cos(frame * 0.23) * 0.03,
      }
      const animationRotation = {
        x: Math.cos(frame * 0.29) * 0.15,
        y: Math.sin(frame * 0.19) * 0.08,
        z: Math.cos(frame * 0.31) * 0.04,
      }
      axes.forEach((axis) => {
        part.position[axis] = composeStudioPartPosition(
          part,
          axis,
          restPosition[axis],
          animationPosition[axis],
        )
        part.rotation[axis] = composeStudioPartRotation(
          part,
          axis,
          restRotation[axis],
          animationRotation[axis],
        )

        expect(part.position[axis]).toBeCloseTo(
          restPosition[axis] + activeTuning[positionField[axis]] + animationPosition[axis],
          10,
        )
        expect(part.rotation[axis]).toBeCloseTo(
          restRotation[axis]
            + THREE.MathUtils.degToRad(activeTuning[rotationField[axis]])
            + animationRotation[axis],
          10,
        )
        expect(part.scale[axis]).toBeCloseTo(
          restScale[axis] * activeTuning.scale * activeTuning[scaleField[axis]],
          10,
        )
      })
      expect(part.userData.studioPartBasePosition.equals(capturedBasePosition)).toBe(true)
      expect(part.userData.studioPartBaseRotation.equals(capturedBaseRotation)).toBe(true)
      expect(part.userData.studioPartBaseScale.equals(capturedBaseScale)).toBe(true)
    }

    applySavedStudioPartTunings(root, 'player', {})
    const finalAnimationPosition = { x: 0.006, y: 0.013, z: -0.02 }
    const finalAnimationRotation = { x: -0.08, y: 0.05, z: -0.03 }
    axes.forEach((axis) => {
      part.position[axis] = composeStudioPartPosition(
        part,
        axis,
        restPosition[axis],
        finalAnimationPosition[axis],
      )
      part.rotation[axis] = composeStudioPartRotation(
        part,
        axis,
        restRotation[axis],
        finalAnimationRotation[axis],
      )

      expect(part.position[axis]).toBeCloseTo(
        restPosition[axis] + finalAnimationPosition[axis],
        10,
      )
      expect(part.rotation[axis]).toBeCloseTo(
        restRotation[axis] + finalAnimationRotation[axis],
        10,
      )
      expect(part.scale[axis]).toBeCloseTo(restScale[axis], 10)
    })
  })

  it('applies confirmed stable-id part tuning to matching runtime meshes', () => {
    const root = new THREE.Group()
    const wrapper = new THREE.Group()
    const topHairPlate = new THREE.Group()
    topHairPlate.userData.studioPartId = 'sample-hair'
    wrapper.add(topHairPlate)
    root.add(wrapper)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-hair': {
        scale: 1.2,
        scaleX: 1.5,
        positionX: 0.25,
        positionY: -0.15,
        rotationY: 30,
      },
    })

    expect(topHairPlate.scale.x).toBeCloseTo(1.8)
    expect(topHairPlate.scale.y).toBeCloseTo(1.2)
    expect(topHairPlate.position.x).toBeCloseTo(0.25)
    expect(topHairPlate.position.y).toBeCloseTo(-0.15)
    expect(topHairPlate.rotation.y).toBeCloseTo(Math.PI / 6)
    expect(wrapper.scale.x).toBeCloseTo(1)
  })

  it('applies confirmed group tuning even when studio preview added a wrapper path', () => {
    const root = new THREE.Group()
    const first = new THREE.Group()
    const second = new THREE.Group()
    root.add(first, second)

    applySavedStudioPartTunings(root, 'player', {
      'player::group::7.0+7.1': {
        scale: 1.4,
        positionX: -0.5,
      },
    })

    expect(first.scale.x).toBeCloseTo(1.4)
    expect(second.scale.x).toBeCloseTo(1.4)
    expect(first.position.x).toBeCloseTo(-0.5)
    expect(second.position.x).toBeCloseTo(-0.5)
  })

  it('keeps shared fill materials isolated between distinct parts', () => {
    const root = new THREE.Group()
    const body = new THREE.Group()
    const arm = new THREE.Group()
    body.userData.studioPartId = 'sample-body'
    arm.userData.studioPartId = 'sample-arm-l'
    const sharedSuit = new THREE.MeshToonMaterial({ color: 0x111923 })
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit)
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit)
    body.add(bodyMesh)
    arm.add(armMesh)
    root.add(body, arm)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-body': { color: '#ff0000', colorStrength: 1 },
    })

    expect(bodyMesh.material.color.getHexString()).toBe('ff0000')
    expect(armMesh.material.color.getHexString()).toBe('111923')
    expect(bodyMesh.material).not.toBe(armMesh.material)
    expect(sharedSuit.color.getHexString()).toBe('111923')
  })

  it('keeps independent part colors when their source material was shared', () => {
    const root = new THREE.Group()
    const left = new THREE.Group()
    const right = new THREE.Group()
    left.userData.studioPartId = 'sample-arm-l'
    right.userData.studioPartId = 'sample-arm-r'
    const sharedSuit = new THREE.MeshToonMaterial({ color: 0x111923 })
    const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit)
    const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit)
    left.add(leftMesh)
    right.add(rightMesh)
    root.add(left, right)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-arm-l': { color: '#ff0000', colorStrength: 1 },
      'zombie-e01::part::id:sample-arm-r': { color: '#0000ff', colorStrength: 1 },
    })

    expect(leftMesh.material.color.getHexString()).toBe('ff0000')
    expect(rightMesh.material.color.getHexString()).toBe('0000ff')
  })

  it('keeps shared outline materials isolated between distinct parts', () => {
    const root = new THREE.Group()
    const body = new THREE.Group()
    const skirt = new THREE.Group()
    body.userData.studioPartId = 'sample-body'
    skirt.userData.studioPartId = 'sample-skirt'
    const sharedOutline = new THREE.MeshBasicMaterial({
      color: 0x050209,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1,
    })
    sharedOutline.stencilWrite = true
    sharedOutline.stencilFunc = THREE.NotEqualStencilFunc
    const bodyOutline = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedOutline)
    const skirtOutline = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedOutline)
    body.add(bodyOutline)
    skirt.add(skirtOutline)
    root.add(body, skirt)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-body': {
        outlineColor: '#00ff00',
        outlineOpacity: 0.4,
      },
    })

    expect(bodyOutline.material.color.getHexString()).toBe('00ff00')
    expect(skirtOutline.material.color.getHexString()).toBe('050209')
    expect(skirtOutline.material.opacity).toBe(1)
    expect(bodyOutline.material).not.toBe(skirtOutline.material)
  })

  it('composes overlapping group and individual transforms independent of storage order', () => {
    const makeRoot = () => {
      const root = new THREE.Group()
      const head = new THREE.Group()
      const body = new THREE.Group()
      head.userData.studioPartId = 'sample-head'
      body.userData.studioPartId = 'sample-body'
      head.add(new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshToonMaterial({ color: 0x111923 }),
      ))
      root.add(head, body)
      return { root, head, body }
    }
    const individual = [
      'zombie-e01::part::id:sample-head',
      { positionX: 0.25, rotationY: 10, scale: 2, color: '#ff0000', colorStrength: 1 },
    ]
    const group = [
      'zombie-e01::group::id:sample-head+id:sample-body',
      { positionX: 0.75, rotationY: 30, scale: 1.5, color: '#0000ff', colorStrength: 1 },
    ]
    const first = makeRoot()
    const second = makeRoot()

    applySavedStudioPartTunings(first.root, 'zombie-e01', Object.fromEntries([individual, group]))
    applySavedStudioPartTunings(second.root, 'zombie-e01', Object.fromEntries([group, individual]))

    for (const { head, body } of [first, second]) {
      expect(head.position.x).toBeCloseTo(1)
      expect(head.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(40))
      expect(head.scale.x).toBeCloseTo(3)
      expect(head.children[0].material.color.getHexString()).toBe('ff0000')
      expect(body.position.x).toBeCloseTo(0.75)
      expect(body.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(30))
      expect(body.scale.x).toBeCloseTo(1.5)
    }
  })

  it('does not let a reset group mask an individual part tuning', () => {
    const root = new THREE.Group()
    const head = new THREE.Group()
    const body = new THREE.Group()
    head.userData.studioPartId = 'sample-head'
    body.userData.studioPartId = 'sample-body'
    const sharedSuit = new THREE.MeshToonMaterial({ color: 0x111923 })
    head.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit))
    body.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedSuit))
    root.add(head, body)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::group::id:sample-head+id:sample-body': {
        color: '#0000ff',
        colorStrength: 1,
      },
    })
    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-head': {
        positionX: 0.25,
        color: '#ff0000',
        colorStrength: 1,
      },
      'zombie-e01::group::id:sample-head+id:sample-body': {},
    })

    expect(head.position.x).toBeCloseTo(0.25)
    expect(head.children[0].material.color.getHexString()).toBe('ff0000')
    expect(body.children[0].material.color.getHexString()).toBe('111923')
  })

  it('uses copy-on-write only for non-default material tuning', () => {
    const root = new THREE.Group()
    const source = new THREE.MeshToonMaterial({ color: 0x223344 })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), source)
    root.add(mesh)

    applyStudioTuning(root, {})
    expect(mesh.material).toBe(source)

    applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })
    const isolated = mesh.material
    expect(isolated).not.toBe(source)
    expect(source.color.getHexString()).toBe('223344')

    applyStudioTuning(root, { color: '#00ff00', colorStrength: 1 })
    expect(mesh.material).toBe(isolated)
    expect(mesh.material.color.getHexString()).toBe('00ff00')

    applyStudioTuning(root, {})
    expect(mesh.material).toBe(isolated)
    expect(mesh.material.color.getHexString()).toBe('223344')
  })

  it('preserves released root-default emissive behavior without cloning fresh materials', () => {
    const root = new THREE.Group()
    const source = new THREE.MeshToonMaterial({
      color: 0x223344,
      emissive: 0x000000,
      emissiveIntensity: 0.07,
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), source)
    root.add(mesh)

    applyStudioTuning(root, {})

    expect(mesh.material).toBe(source)
    expect(mesh.material.emissiveIntensity).toBe(0.14)
  })

  it('re-isolates a replacement material without disposing its shared texture', () => {
    const root = new THREE.Group()
    const firstSource = new THREE.MeshToonMaterial({ color: 0x223344 })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), firstSource)
    root.add(mesh)
    applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })
    const firstIsolated = mesh.material
    const firstDispose = vi.spyOn(firstIsolated, 'dispose')

    const texture = new THREE.Texture()
    const dispose = vi.spyOn(texture, 'dispose')
    const replacement = new THREE.MeshToonMaterial({ color: 0x445566, map: texture })
    mesh.material = replacement
    applyStudioTuning(root, { color: '#0000ff', colorStrength: 1 })

    expect(mesh.material).not.toBe(replacement)
    expect(mesh.material).not.toBe(firstIsolated)
    expect(mesh.material.map).toBe(texture)
    expect(replacement.color.getHexString()).toBe('445566')
    expect(firstDispose).toHaveBeenCalledTimes(1)
    expect(dispose).not.toHaveBeenCalled()
  })

  it('disposes each replaced owned clone exactly once across source toggles', () => {
    const root = new THREE.Group()
    const sourceA = new THREE.MeshToonMaterial({ color: 0x223344 })
    const sourceB = new THREE.MeshToonMaterial({ color: 0x445566 })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceA)
    root.add(mesh)
    applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })

    const disposed = []
    for (const source of [sourceB, sourceA, sourceB]) {
      const previous = mesh.material
      const dispose = vi.spyOn(previous, 'dispose')
      disposed.push(dispose)
      mesh.material = source
      applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })
    }

    disposed.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1))
    expect(mesh.userData.studioOwnedMaterials).toHaveLength(1)
    expect(mesh.userData.studioOwnedMaterials[0]).toBe(mesh.material)
  })

  it('disposes remaining owned clones idempotently without disposing their textures', () => {
    const root = new THREE.Group()
    const texture = new THREE.Texture()
    const textureDispose = vi.spyOn(texture, 'dispose')
    const source = new THREE.MeshToonMaterial({ color: 0x223344, map: texture })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), source)
    root.add(mesh)
    applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })
    const owned = mesh.material
    const dispose = vi.spyOn(owned, 'dispose')

    disposeStudioOwnedMaterials(root)
    disposeStudioOwnedMaterials(root)

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(textureDispose).not.toHaveBeenCalled()
    expect(mesh.userData.studioOwnedMaterials).toEqual([])
  })

  it('disposes mounted consumer material clones once while retaining shared textures', () => {
    const threeRoot = new THREE.Group()
    const textureA = new THREE.Texture()
    const textureB = new THREE.Texture()
    const sourceA = new THREE.MeshToonMaterial({ color: 0x223344, map: textureA })
    const sourceB = new THREE.MeshToonMaterial({ color: 0x445566, map: textureB })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [sourceA, sourceB])
    threeRoot.add(mesh)

    applyStudioTuning(threeRoot, { color: '#ff0000', colorStrength: 1 })
    const [replacedClone, retainedClone] = mesh.material
    const replacedDispose = vi.spyOn(replacedClone, 'dispose')
    const retainedDispose = vi.spyOn(retainedClone, 'dispose')
    const replacementSource = new THREE.MeshToonMaterial({ color: 0x667788, map: textureA })
    mesh.material = [replacementSource, retainedClone]
    applyStudioTuning(threeRoot, { color: '#00ff00', colorStrength: 1 })
    const replacementClone = mesh.material[0]
    const replacementDispose = vi.spyOn(replacementClone, 'dispose')
    const textureADispose = vi.spyOn(textureA, 'dispose')
    const textureBDispose = vi.spyOn(textureB, 'dispose')

    expect(replacedDispose).toHaveBeenCalledOnce()

    const container = document.createElement('div')
    const reactRoot = createRoot(container)
    act(() => {
      reactRoot.render(
        <StudioTunedGroup itemId="consumer-cleanup-test" materialTuning={false}>
          <mesh ref={(node) => {
            if (!node) return
            const hostGroup = node.parentElement
            hostGroup.userData = threeRoot.userData
            hostGroup.traverse = (callback) => threeRoot.traverse(callback)
          }} />
        </StudioTunedGroup>,
      )
    })
    act(() => reactRoot.unmount())

    expect(replacedDispose).toHaveBeenCalledOnce()
    expect(retainedDispose).toHaveBeenCalledOnce()
    expect(replacementDispose).toHaveBeenCalledOnce()
    expect(textureADispose).not.toHaveBeenCalled()
    expect(textureBDispose).not.toHaveBeenCalled()
  })

  it('resets a part-owned clone without touching its shared-material neighbor', () => {
    const root = new THREE.Group()
    const head = new THREE.Group()
    const arm = new THREE.Group()
    head.userData.studioPartId = 'sample-head'
    arm.userData.studioPartId = 'sample-arm-l'
    const shared = new THREE.MeshToonMaterial({
      color: 0x111923,
      emissive: 0x000000,
      emissiveIntensity: 0.07,
    })
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared)
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared)
    head.add(headMesh)
    arm.add(armMesh)
    root.add(head, arm)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-head': { color: '#ff0000', colorStrength: 1 },
    })
    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::part::id:sample-head': {},
    })

    expect(headMesh.material).not.toBe(shared)
    expect(headMesh.material.color.getHexString()).toBe('111923')
    expect(armMesh.material).toBe(shared)
    expect(armMesh.material.emissiveIntensity).toBe(0.07)
    expect(shared.color.getHexString()).toBe('111923')
  })

  it('deduplicates repeated part keys inside an imported group key', () => {
    const root = new THREE.Group()
    const head = new THREE.Group()
    const body = new THREE.Group()
    head.userData.studioPartId = 'sample-head'
    body.userData.studioPartId = 'sample-body'
    root.add(head, body)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      'zombie-e01::group::id:sample-head+id:sample-head+id:sample-body': {
        positionX: 0.5,
        rotationY: 15,
        scale: 2,
      },
    })

    expect(head.position.x).toBeCloseTo(0.5)
    expect(head.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(15))
    expect(head.scale.x).toBeCloseTo(2)
  })

  it('does not tint explicitly non-tunable face texture materials', () => {
    const root = new THREE.Group()
    const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceMaterial)
    face.userData.studioNonTunable = true
    root.add(face)

    applyStudioTuning(root, { color: '#ff0000', colorStrength: 1 })

    expect(face.material).toBe(faceMaterial)
    expect(face.material.color.getHexString()).toBe('ffffff')
  })
})
