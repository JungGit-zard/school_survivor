import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const { flashMat } = vi.hoisted(() => ({ flashMat: { isFlashSentinel: true } }))
vi.mock('../lib/toon.js', async (importOriginal) => ({ ...(await importOriginal()), getFlashMat: () => flashMat }))

const { setProceduralFaceSlotFlash } = await import('./ProceduralFaceZombieLayer.jsx')

describe('E07 face layer hit flash', () => {
  it('swaps body meshes to the flash material and restores the exact Studio-owned material', () => {
    const owned = new THREE.MeshToonMaterial({ color: 0x486d9b })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), owned)

    setProceduralFaceSlotFlash([mesh], true)
    expect(mesh.material).toBe(flashMat)
    expect(mesh.userData.studioNonTunable).toBe(true)

    // Repeated flash frames must not capture the flash material as the restore target.
    setProceduralFaceSlotFlash([mesh], true)
    setProceduralFaceSlotFlash([mesh], false)
    expect(mesh.material).toBe(owned)
    expect(mesh.userData.studioNonTunable).toBeUndefined()
    expect(owned.color.getHex()).toBe(0x486d9b)
  })
})
