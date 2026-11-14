import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import {
  TEXTBOOK_COLLECTED, TEXTBOOK_FLOOR_Y, TEXTBOOK_LANDED, TEXTBOOK_SCALE, createTextbookItem, stepTextbookItem,
} from './xpTextbookField.js'
import { stepMagnetPull, setMagnetMultiplier } from './pickup.js'
import { playerPos } from './refs.js'
import { createTemplateInstanceLayer } from './templateInstanceLayer.js'

// 2026-11-13 XP 교과서 인스턴스 층 전환: 움직임이 예전 XpTextbook 컴포넌트와 **완전히 같은지** 고정한다.
// 아래 oldTextbook은 전환 전 XpTextbook.jsx useFrame 본문을 그대로 옮긴 기준 구현이다.
function oldTextbook(pos, land) {
  const FLOOR_Y = 0.13, TOSS_MS = 460, HOP_HEIGHT = 0.85
  const easeOut = (t) => 1 - (1 - t) * (1 - t)
  const group = new THREE.Group()
  group.position.set(pos[0], FLOOR_Y, pos[2])
  const s = { collected: false, pRef: { current: { x: pos[0], y: FLOOR_Y, z: pos[2] } }, seed: pos[0] * 11.3 + pos[2] * 7.7, floatSec: 0, tossMs: 0, landed: false }
  const events = []
  function step(delta) {
    if (s.collected) return
    if (!s.landed) {
      s.tossMs += delta * 1000
      const t = Math.min(1, s.tossMs / TOSS_MS)
      const e = easeOut(t)
      const x = pos[0] + (land.x - pos[0]) * e
      const z = pos[2] + (land.z - pos[2]) * e
      const hop = Math.sin(t * Math.PI) * HOP_HEIGHT
      s.pRef.current.x = x
      s.pRef.current.z = z
      group.position.set(x, FLOOR_Y + hop, z)
      const spin = (1 - t) * 18 + 2
      group.rotation.x += delta * spin
      group.rotation.y += delta * spin * 0.7
      group.rotation.z += delta * spin * 0.5
      if (t >= 1) {
        s.landed = true
        s.pRef.current.x = land.x
        s.pRef.current.y = FLOOR_Y
        s.pRef.current.z = land.z
        group.rotation.set(0, 0, 0)
        events.push('land')
      }
      return
    }
    const result = stepMagnetPull(s.pRef, delta)
    if (result === 'collected') { s.collected = true; events.push('collect'); return }
    s.floatSec += delta
    const t = s.floatSec * 1.8 + s.seed
    const bobY = Math.sin(t) * 0.06
    const bobZ = Math.cos(t * 0.8) * 0.04
    const p = s.pRef.current
    group.position.set(p.x, p.y + bobY, p.z + bobZ)
    group.rotation.y = s.floatSec * 0.6
  }
  return { group, step, events, state: s }
}

afterEach(() => {
  playerPos.set(0, 0.32, 0)
  setMagnetMultiplier(1)
})

describe('XP textbook layer frame order (review F1/F2)', () => {
  const source = readFileSync(new URL('../components/XpTextbook.jsx', import.meta.url), 'utf8')
  const layerSource = source.slice(source.indexOf('export function XpTextbookLayer'))

  it('syncs the Studio template before the playing gate, and re-checks the phase after every collect', () => {
    const syncAt = layerSource.indexOf('layer.syncTemplate(templateRef.current)')
    const gateAt = layerSource.indexOf("if (useGameStore.getState().phase !== 'playing') return")
    expect(syncAt).toBeGreaterThan(-1)
    expect(syncAt).toBeLessThan(gateAt)
    // 수집 직후(주석 줄만 사이에 두고) 바로 phase를 다시 확인해 루프를 멈춘다.
    const collectAt = layerSource.indexOf('onCollectRef.current(item.id)')
    const breakAt = layerSource.indexOf("if (useGameStore.getState().phase !== 'playing') break")
    expect(collectAt).toBeGreaterThan(-1)
    expect(breakAt).toBeGreaterThan(collectAt)
    const between = layerSource.slice(collectAt + 'onCollectRef.current(item.id)'.length, breakAt)
    expect(between.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('//'))).toEqual([])
  })
})

describe('XP textbook motion is unchanged by the instance layer', () => {
  it('toss, land, bob, magnet pull and collection match the old component frame by frame', () => {
    let seed = 99
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
    for (let trial = 0; trial < 40; trial += 1) {
      setMagnetMultiplier(trial % 3 === 0 ? 2.5 : 1)
      const pos = [(rand() - 0.5) * 10, 0, (rand() - 0.5) * 10]
      const land = { x: pos[0] + (rand() - 0.5) * 2, z: pos[2] + (rand() - 0.5) * 2 }
      const old = oldTextbook(pos, land)
      const item = createTextbookItem({ id: trial, pos, value: 3 }, land)
      expect(item.position.toArray()).toEqual(old.group.position.toArray())
      playerPos.set(pos[0] + 3, 0.32, pos[2])
      const events = []
      for (let frame = 0; frame < 400; frame += 1) {
        const delta = [1 / 60, 1 / 30, 1 / 144, 0.05][frame % 4]
        // 로자리가 천천히 다가간다 → 끌림·수집까지 간다.
        playerPos.x -= 0.01
        old.step(delta)
        const result = stepTextbookItem(item, delta)
        if (result === TEXTBOOK_LANDED) events.push('land')
        if (result === TEXTBOOK_COLLECTED && !events.includes('collect')) events.push('collect')
        if (old.state.collected) {
          expect(item.collected).toBe(true)
          break
        }
        expect(item.position.x).toBeCloseTo(old.group.position.x, 12)
        expect(item.position.y).toBeCloseTo(old.group.position.y, 12)
        expect(item.position.z).toBeCloseTo(old.group.position.z, 12)
        expect(item.rotation.x).toBeCloseTo(old.group.rotation.x, 12)
        expect(item.rotation.y).toBeCloseTo(old.group.rotation.y, 12)
        expect(item.rotation.z).toBeCloseTo(old.group.rotation.z, 12)
      }
      expect(events).toEqual(old.events)
    }
  })

  it('the instance matrix equals the old outer group (position, rotation, scale 0.8) times the model', () => {
    const template = new THREE.Group()
    const studio = new THREE.Group() // StudioTunedGroup 자리(루트 튜닝 흉내)
    studio.position.set(0, 0.01, 0)
    template.add(studio)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.26), new THREE.MeshBasicMaterial())
    mesh.position.set(0, 0.022, 0)
    studio.add(mesh)
    const layer = createTemplateInstanceLayer(4, 'xpTextbookInstances')
    layer.syncTemplate(template)

    const item = createTextbookItem({ id: 1, pos: [2, 0, -1], value: 5 }, { x: 2.4, z: -0.6 })
    for (let i = 0; i < 5; i += 1) stepTextbookItem(item, 0.05)
    const slot = layer.claim()
    layer.write(slot, item.position, item.rotation, TEXTBOOK_SCALE)

    const outer = new THREE.Group()
    outer.position.copy(item.position)
    outer.rotation.copy(item.rotation)
    outer.scale.setScalar(TEXTBOOK_SCALE)
    outer.add(template)
    outer.updateMatrixWorld(true)
    const got = new THREE.Matrix4()
    layer.parts[0].mesh.getMatrixAt(slot, got)
    for (let k = 0; k < 16; k += 1) expect(got.elements[k]).toBeCloseTo(mesh.matrixWorld.elements[k], 6) // 인스턴스 버퍼는 Float32
    expect(item.position.y).toBeGreaterThan(TEXTBOOK_FLOOR_Y) // 아직 날아가는 중
  })
})
