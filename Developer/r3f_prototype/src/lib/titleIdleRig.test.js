import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  PLAYER_RIG,
  TITLE_PLAYER_RIG_CHANNELS,
  TITLE_ZOMBIE_RIG_CHANNELS,
  ZOMBIE_RIG,
  createTitleIdleRig,
  runWithTitleIdleRig,
  setTitlePlayerHeadTilt,
} from './titleIdleRig.js'

// 메시 useFrame 흉내: 머리 x·z와 팔은 매 프레임 절대값으로 덮어쓰고, 머리 y와 눈 scale은 건드리지 않는다.
function makeParts() {
  const parts = { head: new THREE.Group(), armL: new THREE.Group(), armR: new THREE.Group() }
  parts.head.rotation.set(0.1, 0.05, -0.02)
  parts.armL.rotation.set(-1.15, 0, 0.12)
  parts.armR.rotation.set(-1.15, 0, -0.12)
  return parts
}
function meshStep(parts) {
  return (state) => {
    const t = state.clock.elapsedTime
    parts.head.rotation.x = 0.1 + Math.sin(t) * 0.02
    parts.head.rotation.z = Math.sin(t * 1.6) * 0.07
    parts.armL.rotation.x = -1.15 + Math.sin(t * 2.8) * 0.06
    parts.armR.rotation.x = -1.15 - Math.sin(t * 2.8) * 0.06
  }
}
const snapshot = (parts) => Object.values(parts).flatMap((n) => [...n.position.toArray(), n.rotation.x, n.rotation.y, n.rotation.z, ...n.scale.toArray()])

describe('optional title idle rig', () => {
  it('without the prop the mesh frame is exactly the original frame', () => {
    const plain = makeParts()
    const wrapped = makeParts()
    for (let i = 0; i < 30; i += 1) {
      const state = { clock: { elapsedTime: i * 0.016 } }
      meshStep(plain)(state)
      runWithTitleIdleRig(null, wrapped, meshStep(wrapped), state, 0.016)
      expect(snapshot(wrapped)).toEqual(snapshot(plain))
    }
  })

  it('adds offsets on top of the mesh animation and restores exactly when offsets go neutral', () => {
    const plain = makeParts()
    const rigged = makeParts()
    const rig = createTitleIdleRig(TITLE_ZOMBIE_RIG_CHANNELS)
    for (let i = 0; i < 40; i += 1) {
      const state = { clock: { elapsedTime: i * 0.016 } }
      rig.channels[ZOMBIE_RIG.headY].value = i < 20 ? 0.4 : 0
      rig.channels[ZOMBIE_RIG.headX].value = i < 20 ? -0.2 : 0
      rig.channels[ZOMBIE_RIG.armLX].value = i < 20 ? 0.1 : 0
      meshStep(plain)(state)
      runWithTitleIdleRig(rig, rigged, meshStep(rigged), state, 0.016)
      if (i < 20) {
        expect(rigged.head.rotation.y).toBeCloseTo(plain.head.rotation.y + 0.4, 12)
        expect(rigged.head.rotation.x).toBeCloseTo(plain.head.rotation.x - 0.2, 12)
        expect(rigged.armL.rotation.x).toBeCloseTo(plain.armL.rotation.x + 0.1, 12)
      }
    }
    expect(snapshot(rigged)).toEqual(snapshot(plain))
  })

  it('tilts Rosari head parts together around the head and blinks via eye scale, then restores', () => {
    const names = ['head', 'hairTop', 'hairFr', 'hairSL', 'hairSR', 'hairTail', 'hairClip', 'eyeL', 'eyeR']
    const parts = Object.fromEntries(names.map((name, i) => {
      const g = new THREE.Group()
      g.position.set((i - 4) * 0.1, 1.2 + i * 0.05, 0.2)
      return [name, g]
    }))
    const before = snapshot(parts)
    const rig = createTitleIdleRig(TITLE_PLAYER_RIG_CHANNELS)
    rig.headTilt = 0.07
    rig.beforeApply = (r) => setTitlePlayerHeadTilt(r, r.headTilt)
    rig.channels[PLAYER_RIG.eyeL].value = 0.1
    rig.channels[PLAYER_RIG.eyeR].value = 0.1
    const noop = () => {}
    runWithTitleIdleRig(rig, parts, noop, {}, 0)
    expect(parts.eyeL.scale.y).toBeCloseTo(0.1, 12)
    expect(parts.hairTop.rotation.z).toBeCloseTo(0.07, 12)
    // 머리카락 윗부분은 머리 중심을 축으로 같이 돌아 옆으로 밀린다.
    expect(parts.hairTop.position.x).not.toBeCloseTo(before[names.indexOf('hairTop') * 9], 6)

    rig.headTilt = 0
    rig.channels[PLAYER_RIG.eyeL].value = 1
    rig.channels[PLAYER_RIG.eyeR].value = 1
    runWithTitleIdleRig(rig, parts, noop, {}, 0)
    snapshot(parts).forEach((value, i) => expect(value).toBeCloseTo(before[i], 12))
  })

  it('only the title passes idleRig; meshes default it to null', () => {
    const src = fileURLToPath(new URL('..', import.meta.url))
    const files = []
    const walk = (dir) => readdirSync(dir).forEach((name) => {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.jsx?$/.test(name) && !/\.test\./.test(name)) files.push(full)
    })
    walk(src)
    const passers = files.filter((file) => /idleRig=\{/.test(readFileSync(file, 'utf8'))).map((file) => file.replace(/\\/g, '/').split('/src/')[1])
    expect(passers).toEqual(['components/TitleScene3D.jsx'])
    for (const mesh of ['ZombieMesh.jsx', 'DogeMesh.jsx', 'PlayerMesh.jsx']) {
      const source = readFileSync(join(src, 'components', mesh), 'utf8')
      expect(source).toContain('idleRig = null')
      expect(source).toContain('runWithTitleIdleRig(idleRig,')
    }
  })
})
