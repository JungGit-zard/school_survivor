// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Rosari wardrobe outfit (titleSettings.playerOutfit) on the title-screen player.
// The title must dress the same PlayerMesh the '단순' in-game player uses, recolored from the
// shared wardrobe palette (rosariOutfits.js), and stay untouched for the default outfit.

const captured = vi.hoisted(() => ({ playerMeshProps: [] }))

vi.mock('@react-three/fiber', () => ({ useFrame: () => {}, useThree: () => ({ camera: { position: { set() {} }, lookAt() {} } }) }))
vi.mock('../lib/toon.js', async (importOriginal) => ({ ...(await importOriginal()), toonMat: () => ({ dispose() {} }) }))
vi.mock('./DogeMesh.jsx', () => ({ DancingDoge: () => null }))
vi.mock('./MatildaMesh.jsx', () => ({ default: () => null }))
vi.mock('./ZombieMesh.jsx', () => ({ default: () => null }))
vi.mock('./StageObjects/ClassroomChair.jsx', () => ({ default: () => null }))
vi.mock('./StageObjects/ClassroomDesk.jsx', () => ({ default: () => null }))
vi.mock('./StageObjects/UnconsciousStudent.jsx', () => ({ default: () => null }))
vi.mock('./Weapons/CompassBlade.jsx', () => ({ CompassBladeModel: () => null }))
vi.mock('./Weapons/Chibiko.jsx', () => ({ ChibikoModel: () => null }))
vi.mock('./Weapons/StarlinkSatellite.jsx', () => ({ StarlinkSatelliteModel: () => null, ZomlonbiskModel: () => null }))
vi.mock('./StudioTunedGroup.jsx', () => {
  const Pass = ({ children }) => <>{children}</>
  return {
    default: Pass,
    getStudioTransformProps: () => ({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }),
    StudioTuningPreviewProvider: Pass,
    StudioTuningRuntimeProvider: Pass,
    StudioTuningSnapshotProvider: Pass,
  }
})
vi.mock('./PlayerMesh.jsx', () => ({
  default: (props) => {
    captured.playerMeshProps.push(props)
    return <div data-testid="title-player-mesh" data-outfit={props.outfit} />
  },
}))

import TitleScene3D from './TitleScene3D.jsx'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { _resetGuestSessionSettingsForTests, saveGuestSessionSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { resolvePlayerMeshGarmentColor } from '../lib/playerMeshOutfits.js'
import { resolveRosariOutfit } from '../lib/rosariOutfits.js'

let container, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(console, 'error').mockImplementation(() => {}) // lowercase three.js tags rendered by react-dom
  _resetFirebaseProgressForTests()
  _resetGuestSessionSettingsForTests()
  captured.playerMeshProps.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  try { act(() => root.unmount()) } catch { /* outline disposal expects a three.js group */ }
  container.remove()
  vi.restoreAllMocks()
})

const titlePlayerOutfit = () => container.querySelector('[data-testid="title-player-mesh"]')?.getAttribute('data-outfit')

describe('title player wears the Rosari wardrobe outfit', () => {
  it('dresses the title player in winter when a guest chose 동복', () => {
    saveGuestSessionSettings({ playerOutfit: 'winter' })
    act(() => root.render(<TitleScene3D />))
    expect(titlePlayerOutfit()).toBe('winter')
  })

  it('dresses the title player in winter when the hydrated account chose 동복', () => {
    _seedHydratedFirebaseProgressForTests()
    saveTitleSettings({ playerOutfit: 'winter' })
    act(() => root.render(<TitleScene3D />))
    expect(titlePlayerOutfit()).toBe('winter')
  })

  it.each([
    ['nothing chosen', () => {}],
    ['default chosen', () => saveGuestSessionSettings({ playerOutfit: 'default' })],
  ])('keeps the default uniform when %s', (_label, arrange) => {
    arrange()
    act(() => root.render(<TitleScene3D />))
    expect(titlePlayerOutfit()).toBe('default')
  })

  it('leaves the Graphics Studio title preview on the default uniform', () => {
    saveGuestSessionSettings({ playerOutfit: 'winter' })
    act(() => root.render(<TitleScene3D studioTuning={{}} />))
    expect(titlePlayerOutfit()).toBe('default')
  })
})

describe('PlayerMesh garment colors come from the shared wardrobe palette', () => {
  const winter = resolveRosariOutfit('winter').colors
  const hex = (value) => parseInt(value.slice(1), 16)

  it('recolors blazer, shirt, skirt and legwear blocks for winter', () => {
    expect(resolvePlayerMeshGarmentColor('blazer', 0xd42020, 'winter')).toBe(hex(winter.blazer))
    expect(resolvePlayerMeshGarmentColor('shirt', 0xf4f4f4, 'winter')).toBe(hex(winter.shirt))
    expect(resolvePlayerMeshGarmentColor('skirt', 0x2d8cff, 'winter')).toBe(hex(winter.skirt))
    expect(resolvePlayerMeshGarmentColor('legwear', 0xebebf2, 'winter')).toBe(hex(winter.legwear))
  })

  it.each(['default', undefined, 'summer'])('keeps every original block color for outfit %s', (outfit) => {
    for (const [slot, base] of [['blazer', 0xd42020], ['shirt', 0xf4f4f4], ['skirt', 0x2d8cff], ['legwear', 0xebebf2]]) {
      expect(resolvePlayerMeshGarmentColor(slot, base, outfit)).toBe(base)
    }
  })

  it('wires those slots into the PlayerMesh garment blocks', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(`${process.cwd()}/src/components/PlayerMesh.jsx`, 'utf8')
    expect(source).toContain("outfit = 'default' }) {")
    expect(source.match(/color=\{garment\('blazer', 0xd42020\)\}/g)).toHaveLength(3)
    expect(source.match(/color=\{garment\('shirt', 0xf4f4f4\)\}/g)).toHaveLength(1)
    expect(source.match(/color=\{garment\('skirt', 0x2d8cff\)\}/g)).toHaveLength(1)
    expect(source.match(/color=\{garment\('legwear', 0xebebf2\)\}/g)).toHaveLength(2)
    // hair clip shares the shirt white but is not a garment
    expect(source).toContain('<Block size={[0.25, 0.16, 0.2]} position={[0, 0, 0]} color={0xf4f4f4} emissive={0.08} />')
  })
})
