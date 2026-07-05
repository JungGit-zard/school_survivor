// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applySavedStudioPartTunings, applyStudioTuning, getStudioTransformProps } from './StudioTunedGroup.jsx'
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

    expect(bodyMat.color.getHexString()).toBe('ff0000')
    expect(bodyMat.emissiveIntensity).toBe(0.4)
    expect(outlineMat.color.getHexString()).toBe('00ff00')
    expect(outlineMat.opacity).toBe(0.5)
    expect(outline.scale.x).toBeCloseTo(1.12)
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

  it('applies confirmed stable-id part tuning to matching runtime meshes', () => {
    const root = new THREE.Group()
    const wrapper = new THREE.Group()
    const faceTexture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial())
    faceTexture.userData.studioPartId = 'b02-face-texture'
    wrapper.add(faceTexture)
    root.add(wrapper)

    applySavedStudioPartTunings(root, 'zombie-b02', {
      'zombie-b02::part::id:b02-face-texture': {
        scale: 1.2,
        scaleX: 1.5,
        positionX: 0.25,
        positionY: -0.15,
        rotationY: 30,
      },
    })

    expect(faceTexture.scale.x).toBeCloseTo(1.8)
    expect(faceTexture.scale.y).toBeCloseTo(1.2)
    expect(faceTexture.position.x).toBeCloseTo(0.25)
    expect(faceTexture.position.y).toBeCloseTo(-0.15)
    expect(faceTexture.rotation.y).toBeCloseTo(Math.PI / 6)
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
})
