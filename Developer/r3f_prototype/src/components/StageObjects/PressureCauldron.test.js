import fs from 'node:fs'
import React from 'react'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import PressureCauldron from './PressureCauldron.jsx'
import { GRAPHICS_STUDIO_CATALOG, normalizeStudioTuning } from '../../lib/graphicsStudioConfig.js'
import { getStudioTransformProps } from '../StudioTunedGroup.jsx'
import { STAGE_PROP_TYPES } from '../../lib/stagePropPlacements.js'

function elementTypeName(element) {
  if (typeof element?.type === 'string') return element.type
  return element?.type?.name ?? null
}

function getElementChildren(element) {
  return React.Children.toArray(element?.props?.children)
}

function findElementByName(element, targetName) {
  if (!React.isValidElement(element)) return null
  if (element.props?.name === targetName) return element
  for (const child of getElementChildren(element)) {
    const found = findElementByName(child, targetName)
    if (found) return found
  }
  return null
}

function getDirectChildComponentLines(source, groupName) {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.includes(`<group name="${groupName}"`))
  if (start < 0) return []
  const indent = lines[start].match(/^\s*/)[0]
  const childIndent = `${indent}  `
  const componentLines = []

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === `${indent}</group>`) break
    if (!line.startsWith(childIndent) || line.startsWith(`${childIndent}  `)) continue
    const match = line.match(/<(Cylinder|Box|group)\b/)
    if (match) componentLines.push(line.trim())
  }
  return componentLines
}

function getDirectChildComponentTypesFromSource(source, groupName) {
  return getDirectChildComponentLines(source, groupName)
    .map((line) => line.match(/<(Cylinder|Box|group)\b/)[1])
}

function getDirectChildComponentTypesFromModel(groupName) {
  const priorDocument = globalThis.document
  if (!priorDocument) {
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: '', fillRect: () => {} }),
      }),
    }
  }
  try {
    const root = PressureCauldron({})
    const group = findElementByName(root, groupName)
    return getElementChildren(group)
      .map(elementTypeName)
      .filter((type) => ['Cylinder', 'Box', 'group'].includes(type))
  } finally {
    if (!priorDocument) delete globalThis.document
  }
}

describe('pressure cauldron landmark', () => {
  it('uses only depth-writing opaque toon surfaces and non-depth-writing outlines', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const renderingSource = fs.readFileSync(new URL('./propRendering.js', import.meta.url), 'utf8')
    expect(source).not.toContain('getStagePropToonMaterial')
    expect(source).toContain('getStagePropDepthWritingToonMaterial')
    expect(renderingSource).toContain('getCachedToonMat(color, emissiveIntensity, STAGE_PROP_SURFACE_SIDE, true)')
    expect(renderingSource).toContain('material.depthWrite = false')
  })

  it('contains every user-defined landmark part in the canonical shared model source', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    ;[
      'faceted-white-vessel',
      'yellow-top-handle',
      'gauge-and-red-indicator',
      'red-side-handwheel',
      'dark-industrial-base',
      'front-step-and-pipe',
      'side-control-housings',
    ].forEach((part) => expect(source).toContain(part))
  })

  it('keeps the close-up concept machinery and outlined primary silhouettes in the shared model', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')

    ;[
      'white-safety-valve',
      'gauge-ticks-and-needle',
      'lid-latches-and-hinges',
      'left-gray-control-cabinet',
      'right-white-auxiliary-housing',
      'front-twin-steps-and-pipes',
      'right-front-red-handwheel',
      'outlined = false',
      '{outline && (',
    ].forEach((part) => expect(source).toContain(part))
  })

  it('uses the exact 0.2 base scale seam for the shared runtime and Studio component', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const studioSource = fs.readFileSync(new URL('../StudioTunedGroup.jsx', import.meta.url), 'utf8')

    expect(source).toContain('export const PRESSURE_CAULDRON_BASE_SCALE = 0.2')
    expect(source).toContain('scale={scaleToBaseScale(scale)}')
    expect(source).toContain('value * PRESSURE_CAULDRON_BASE_SCALE')
    expect(source).toContain('transformPositionMultiplier={1 / PRESSURE_CAULDRON_BASE_SCALE}')
    expect(studioSource).toContain('transform.position.map((value) => value * transformPositionMultiplier)')
  })

  it('keeps cauldron item and part Studio transforms world-equal in runtime and preview', () => {
    const transform = getStudioTransformProps(normalizeStudioTuning({
      scale: 1.35,
      scaleX: 0.70,
      scaleY: 1.20,
      scaleZ: 1.55,
      positionX: 1.25,
      positionY: -0.50,
      positionZ: 0.80,
      rotationX: 15,
      rotationY: -35,
      rotationZ: 20,
    }))
    const partBasePosition = new THREE.Vector3(0.48, 1.10, -0.36)
    const partStudioPosition = new THREE.Vector3(0.22, -0.18, 0.31)
    const makePart = () => {
      const part = new THREE.Group()
      part.position.copy(partBasePosition).add(partStudioPosition)
      return part
    }

    const runtimeRoot = new THREE.Group()
    runtimeRoot.scale.setScalar(0.2)
    const runtimeStudio = new THREE.Group()
    runtimeStudio.position.fromArray(transform.position.map((value) => value / 0.2))
    runtimeStudio.rotation.fromArray(transform.rotation)
    runtimeStudio.scale.fromArray(transform.scale)
    const runtimePart = makePart()
    runtimeStudio.add(runtimePart)
    runtimeRoot.add(runtimeStudio)

    const previewStudio = new THREE.Group()
    previewStudio.position.fromArray(transform.position)
    previewStudio.rotation.fromArray(transform.rotation)
    previewStudio.scale.fromArray(transform.scale)
    const previewBase = new THREE.Group()
    previewBase.scale.setScalar(0.2)
    const previewPart = makePart()
    previewBase.add(previewPart)
    previewStudio.add(previewBase)

    runtimeRoot.updateMatrixWorld(true)
    previewStudio.updateMatrixWorld(true)
    runtimePart.matrixWorld.elements.forEach((value, index) => {
      expect(value).toBeCloseTo(previewPart.matrixWorld.elements[index], 8)
    })
  })

  it('keeps the seven existing primary group paths in their original sibling order', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const primaryGroups = [
      'pressure-cauldron-dark-industrial-base',
      'pressure-cauldron-faceted-white-vessel',
      'pressure-cauldron-yellow-top-handle',
      'pressure-cauldron-gauge-and-red-indicator',
      'pressure-cauldron-red-side-handwheel',
      'pressure-cauldron-front-step-and-pipe',
      'pressure-cauldron-side-control-housings',
    ]
    const topLevelNames = Array.from(source.matchAll(/^        <group name="(pressure-cauldron-[^"]+)"/gm))
      .map(([, name]) => name)
      .filter((name) => primaryGroups.includes(name))

    expect(topLevelNames).toEqual(primaryGroups)
  })

  it('preserves the HEAD direct-child primitive paths before appending new concept details', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')

    const expectedHeadPrefixes = {
      'pressure-cauldron-dark-industrial-base': ['Cylinder', 'Cylinder', 'Box', 'Box'],
      'pressure-cauldron-faceted-white-vessel': ['Cylinder', 'Cylinder', 'Cylinder', 'Cylinder'],
      'pressure-cauldron-yellow-top-handle': ['Box', 'Box', 'Box'],
      'pressure-cauldron-gauge-and-red-indicator': ['Cylinder', 'Cylinder', 'Box', 'Cylinder'],
      'pressure-cauldron-red-side-handwheel': ['Cylinder', 'Cylinder', 'Box', 'Box'],
      'pressure-cauldron-front-step-and-pipe': ['Box', 'Box', 'Cylinder'],
      'pressure-cauldron-side-control-housings': ['Box', 'Box', 'Box'],
    }

    Object.entries(expectedHeadPrefixes).forEach(([groupName, expectedPrefix]) => {
      expect(getDirectChildComponentTypesFromSource(source, groupName).slice(0, expectedPrefix.length)).toEqual(expectedPrefix)
      expect(getDirectChildComponentTypesFromModel(groupName).slice(0, expectedPrefix.length)).toEqual(expectedPrefix)
    })

    expect(getDirectChildComponentLines(source, 'pressure-cauldron-front-step-and-pipe').slice(0, 3)).toEqual([
      '<Box position={[-0.76, 0.28, 3.38]} scale={[1.10, 0.34, 0.76]} material={dark} outlined />',
      '<Box position={[-0.76, 0.51, 3.79]} scale={[1.10, 0.12, 0.10]} material={yellow} />',
      '<Cylinder position={[-1.26, 0.62, 3.08]} rotation={[0, Math.PI / 2, 0]} args={[0.14, 0.14, 0.82, 8]} material={dark} />',
    ])
    expect(getDirectChildComponentLines(source, 'pressure-cauldron-side-control-housings').slice(0, 3)).toEqual([
      '<Box position={[-3.46, 1.45, 0.18]} scale={[0.78, 2.18, 1.18]} material={gray} outlined />',
      '<Box position={[-2.98, 1.07, 0.84]} scale={[0.16, 0.32, 0.06]} material={yellow} />',
      '<Box position={[3.38, 0.92, -0.16]} scale={[1.24, 1.38, 1.58]} material={white} outlined />',
    ])
  })

  it('keeps game and Studio on the same canonical cauldron component and item id', () => {
    const modelSource = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const previewSource = fs.readFileSync(new URL('../GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    const layerSource = fs.readFileSync(new URL('./StageObjectLayer.jsx', import.meta.url), 'utf8')
    const catalogItem = GRAPHICS_STUDIO_CATALOG.find(({ id }) => id === 'stage-object-pressure-cauldron')

    expect(catalogItem).toMatchObject({
      category: 'stageObject',
      objectType: 'pressureCauldron',
      source: 'components/StageObjects/PressureCauldron.jsx',
    })
    expect(previewSource).toContain("objectType === 'pressureCauldron') return <PressureCauldron />")
    expect(modelSource).toContain('StudioTunedGroup itemId="stage-object-pressure-cauldron"')
    expect(layerSource).toContain('pressureCauldron: PressureCauldron')
    expect(STAGE_PROP_TYPES).toContain('pressureCauldron')
  })
})
