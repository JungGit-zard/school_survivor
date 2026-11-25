// @vitest-environment jsdom
// Same bug class as balanceqa F1 (OnigiriMiniRosari.reacquire.runtime.test.jsx), other weapons.
// GuidedMissile / SharkMissile / Chibiko keep their in-flight shots in a list (missiles state +
// activeMissilesRef / useDeferredProjectileState). When a replacement card drops the weapon while a
// shot is in the air, the component renders null and the projectile unmounts without calling
// onExplode / onExpire, so the entry stays in the list. Re-acquiring the weapon in the same run
// remounted that stale shot with fresh refs: it relaunched from its ORIGINAL throw point, flew to
// its old target and dealt damage again, and it held the weapon's single-shot gate meanwhile.
import React, { act } from 'react'
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = vi.hoisted(() => new Set())
vi.mock('@react-three/fiber', async () => {
  const ReactModule = await import('react')
  return {
    useFrame: (cb) => {
      const ref = ReactModule.useRef(cb)
      ref.current = cb
      ReactModule.useEffect(() => {
        const run = (state, delta) => ref.current(state, delta)
        frameCallbacks.add(run)
        return () => { frameCallbacks.delete(run) }
      }, [])
    },
  }
})
vi.mock('../StudioTunedGroup.jsx', () => ({
  default: () => null,
  composeStudioPartPosition: (_el, _axis, base, extra = 0) => base + extra,
  composeStudioPartRotation: (_el, _axis, base, extra = 0) => base + extra,
  composeStudioPartScale: (_el, _axis, base, extra = 1) => base * extra,
}))
vi.mock('../../lib/sfxEvents.js', () => ({ emitSfx: vi.fn(), subscribeSfx: vi.fn(() => () => {}) }))
vi.mock('../../lib/toon.js', async (importOriginal) => ({
  ...(await importOriginal()),
  toonMat: () => ({ transparent: false, opacity: 1 }),
  outlineMat: () => ({}),
  inflateScale: (v) => v,
}))

import { GuidedMissile } from './Missile.jsx'
import { SharkMissileWeapon } from './SharkMissile.jsx'
import { ChibikoWeapon } from './Chibiko.jsx'
import { ScienceFlaskSplash } from './Flask.jsx'
import { EraserBombWeapon } from './EraserBomb.jsx'
import { StunGunWeapon } from './StunGun.jsx'
import { UmbrellaGuardWeapon } from './UmbrellaGuard.jsx'
import { WEAPON_CATALOG } from '../../lib/weaponCatalog.js'
import { enemyPool, playerPos } from '../../lib/refs.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { useGameStore } from '../../store/useGameStore.js'

const STEP = 1 / 60
// useDeferredProjectileState commits on requestAnimationFrame; run those inside the frame's act().
const rafQueue = []
function flushRaf() {
  while (rafQueue.length) rafQueue.shift()(0)
}
let root = null
let container = null
let elapsed = 0
let savedState = null

function patchGroups() {
  container.querySelectorAll('group, mesh').forEach((el) => {
    if (el.position instanceof THREE.Vector3) return
    el.position = new THREE.Vector3()
    el.rotation = new THREE.Euler()
    el.scale = new THREE.Vector3(1, 1, 1)
    el.userData = {}
    el.material = { opacity: 1 }
    Object.defineProperty(el, 'children', { value: [], configurable: true }) // Object3D-style array
  })
}

function runSeconds(seconds) {
  const frames = Math.round(seconds / STEP)
  for (let i = 0; i < frames; i += 1) {
    elapsed += STEP
    const state = { clock: { elapsedTime: elapsed }, camera: new THREE.PerspectiveCamera() }
    patchGroups()
    act(() => { [...frameCallbacks].forEach((cb) => cb(state, STEP)); flushRaf() })
  }
  patchGroups()
}

function setWeapon(id, active) {
  act(() => {
    useGameStore.setState((s) => ({
      weapons: { ...s.weapons, [id]: { ...WEAPON_CATALOG[id].base, active } },
    }))
  })
  patchGroups()
}

function fireCount(sfxId) {
  return vi.mocked(emitSfx).mock.calls.filter(([event]) => event?.id === sfxId).length
}

beforeEach(() => {
  savedState = useGameStore.getState()
  frameCallbacks.clear()
  enemyPool.reset()
  vi.mocked(emitSfx).mockClear()
  elapsed = 100 // past every weapon cooldown measured from lastFire 0
  playerPos.set(0, 0.32, 0)
  container = document.createElement('div')
  root = createRoot(container)
  rafQueue.length = 0
  vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  act(() => { root.unmount() })
  root = null
  container = null
  enemyPool.reset()
  useGameStore.setState(savedState, true)
  vi.unstubAllGlobals()
})

function renderedNodeCount() {
  return container.querySelectorAll('*').length
}

describe.each([
  ['guidedMissile', GuidedMissile, 'missileFire', 4],
  ['sharkMissile', SharkMissileWeapon, 'sharkFire', 4],
  ['chibiko', ChibikoWeapon, 'chibikoFire', 4],
  ['scienceFlask', ScienceFlaskSplash, 'flaskFire', 1.8], // flask range 2
  ['eraserBomb', EraserBombWeapon, 'eraserFire', 4],
  ['stunGun', StunGunWeapon, 'stunGunFire', 4],
  ['umbrellaGuard', UmbrellaGuardWeapon, 'umbrellaFire', 4],
])('%s dropped mid-flight -> re-acquired in the same run', (id, Weapon, fireSfx, targetX) => {
  it('does not resurrect the shot that was in the air when the weapon was dropped', () => {
    useGameStore.setState({ phase: 'playing' })
    setWeapon(id, true)
    act(() => { root.render(<Weapon />) })
    patchGroups()
    const idleNodes = renderedNodeCount() // weapon mounted, no shot in the air

    // Unkillable far target so the first shot is still in the air when the weapon is dropped.
    const handle = enemyPool.spawn({ type: 'E01', x: targetX, y: 0, z: 0, hp: 1e9, maxHp: 1e9 })
    enemyPool.setHitHandler(handle, () => true)

    runSeconds(0.1)
    expect(fireCount(fireSfx)).toBe(1)
    expect(renderedNodeCount()).toBeGreaterThan(idleNodes) // the shot is on screen

    // Replacement card drops the weapon mid-flight, then the same run re-acquires it.
    setWeapon(id, false)
    runSeconds(0.5)
    setWeapon(id, true)
    // Nothing from before the drop comes back: same DOM as a freshly mounted, idle weapon.
    expect(renderedNodeCount()).toBe(idleNodes)

    // And the re-acquired weapon fires NEW shots on its own once its cooldown (missile/shark 6 s, flask 8.4 s,
    // Chibiko 1.1 s, counted from the pre-drop shot) has passed.
    runSeconds(10)
    expect(fireCount(fireSfx)).toBeGreaterThanOrEqual(2)
  })
})
