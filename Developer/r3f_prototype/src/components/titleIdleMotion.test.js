import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  TITLE_IDLE_ACTORS,
  TITLE_IDLE_PERIOD_MAX,
  TITLE_IDLE_PERIOD_MIN,
  TITLE_BLINK_CLOSED_SCALE,
  TITLE_BLINK_MAX_GAP,
  TITLE_BLINK_MIN_GAP,
  computeTitleIdleOffsets,
  computeTitleIdleRig,
  createTitleActorRig,
  createTitleIdleOffsets,
  titleBlinkScale,
} from './titleIdleMotion.js'
import { PLAYER_RIG } from '../lib/titleIdleRig.js'
import { applyTitleIdleFrame } from './TitleScene3D.jsx'

describe('title idle motion', () => {
  it('gives every character its own period (1.6–3.2s) and phase so nobody moves in sync', () => {
    const periods = TITLE_IDLE_ACTORS.map((actor) => actor.period)
    const phases = TITLE_IDLE_ACTORS.map((actor) => actor.phase.toFixed(3))
    expect(periods.every((p) => p >= TITLE_IDLE_PERIOD_MIN && p <= TITLE_IDLE_PERIOD_MAX)).toBe(true)
    expect(new Set(periods.map((p) => p.toFixed(3))).size).toBe(periods.length)
    expect(new Set(phases).size).toBe(phases.length)

    const out = createTitleIdleOffsets()
    const zombies = TITLE_IDLE_ACTORS.filter((actor) => actor.kind === 'zombie')
    const sways = zombies.map((actor) => computeTitleIdleOffsets(actor, 4.2, out).rz.toFixed(4))
    expect(new Set(sways).size).toBe(sways.length)
  })

  it('keeps motion small and Rosari breathing within 2% scale / 0.03 units', () => {
    const out = createTitleIdleOffsets()
    const player = TITLE_IDLE_ACTORS.find((actor) => actor.id === 'player')
    for (let t = 0; t < 12; t += 0.05) {
      computeTitleIdleOffsets(player, t, out)
      expect(Math.abs(out.y)).toBeLessThanOrEqual(0.03)
      expect(Math.abs(out.sy - 1)).toBeLessThanOrEqual(0.02)
      expect(out.rx + out.ry + out.rz).toBe(0)
      TITLE_IDLE_ACTORS.forEach((actor) => {
        computeTitleIdleOffsets(actor, t, out)
        expect(Math.abs(out.rx) + Math.abs(out.ry) + Math.abs(out.rz)).toBeLessThan(0.6)
        expect(Math.abs(out.sy - 1)).toBeLessThanOrEqual(0.04)
      })
    }
  })

  it('makes the boss breathe up to 2% and the glancing zombies look over at different times', () => {
    const out = createTitleIdleOffsets()
    const boss = TITLE_IDLE_ACTORS.find((actor) => actor.kind === 'boss')
    let maxBreath = 0
    for (let t = 0; t < 20; t += 0.05) maxBreath = Math.max(maxBreath, computeTitleIdleOffsets(boss, t, out).sx - 1)
    expect(maxBreath).toBeGreaterThan(0.005)

    const glancers = TITLE_IDLE_ACTORS.filter((actor) => actor.glance)
    expect(glancers.length).toBeGreaterThanOrEqual(2)
    expect(glancers.length).toBeLessThanOrEqual(3)
    expect(new Set(glancers.map((actor) => actor.eventOffset.toFixed(2))).size).toBe(glancers.length)
  })

  it('reduced motion puts every wrapper back to the static pose', () => {
    const nodes = TITLE_IDLE_ACTORS.map((actor) => ({ actor, node: new THREE.Group() }))
    const out = createTitleIdleOffsets()
    applyTitleIdleFrame(nodes, 3.7, false, out)
    expect(nodes.some(({ node }) => node.rotation.z !== 0 || node.position.y !== 0)).toBe(true)

    applyTitleIdleFrame(nodes, 3.7, true, out)
    nodes.forEach(({ node }) => {
      expect(node.position.toArray()).toEqual([0, 0, 0])
      expect([node.rotation.x, node.rotation.y, node.rotation.z]).toEqual([0, 0, 0])
      expect(node.scale.toArray()).toEqual([1, 1, 1])
    })
  })

  it('blinks Rosari every 2.5–5s, eyes to 0.1 for about 120ms, and reduced motion neutralises the rigs', () => {
    const player = TITLE_IDLE_ACTORS.find((actor) => actor.id === 'player')
    const rig = createTitleActorRig(player)
    const starts = []
    let closedTime = 0
    let lastStart = rig.blinkStart
    for (let t = 0; t < 40; t += 0.005) {
      computeTitleIdleRig(player, t, rig)
      if (rig.blinkStart !== lastStart) { starts.push(rig.blinkStart); lastStart = rig.blinkStart }
      if (rig.channels[PLAYER_RIG.eyeL].value <= TITLE_BLINK_CLOSED_SCALE + 1e-9) closedTime += 0.005
    }
    const gaps = starts.slice(1).map((s, i) => s - starts[i])
    expect(gaps.length).toBeGreaterThan(5)
    gaps.forEach((gap) => {
      expect(gap).toBeGreaterThanOrEqual(TITLE_BLINK_MIN_GAP)
      expect(gap).toBeLessThanOrEqual(TITLE_BLINK_MAX_GAP)
    })
    expect(new Set(gaps.map((g) => g.toFixed(2))).size).toBeGreaterThan(2)
    expect(closedTime / starts.length).toBeGreaterThan(0.1)
    expect(closedTime / starts.length).toBeLessThan(0.14)
    expect(titleBlinkScale(10, 0)).toBe(1)

    const zombie = TITLE_IDLE_ACTORS.find((actor) => actor.glance)
    const zrig = createTitleActorRig(zombie)
    const nodes = [{ actor: zombie, node: new THREE.Group(), rig: zrig }, { actor: player, node: new THREE.Group(), rig }]
    const out = createTitleIdleOffsets()
    applyTitleIdleFrame(nodes, 7.3, false, out)
    expect(zrig.channels.some((ch) => ch.value !== 0)).toBe(true)
    applyTitleIdleFrame(nodes, 7.3, true, out)
    ;[zrig, rig].forEach((r) => r.channels.forEach((ch) => expect(ch.value).toBe(ch.prop === 'scale' ? 1 : 0)))
    expect(rig.headTilt).toBe(0)
  })

  it('turns only the glancing zombies heads toward Rosari, never the whole body', () => {
    const out = createTitleIdleOffsets()
    const glancer = TITLE_IDLE_ACTORS.find((actor) => actor.glance)
    const rig = createTitleActorRig(glancer)
    let maxHeadYaw = 0
    for (let t = 0; t < 20; t += 0.05) {
      computeTitleIdleRig(glancer, t, rig)
      maxHeadYaw = Math.max(maxHeadYaw, Math.abs(rig.channels[0 + 1].value))
      expect(Math.abs(computeTitleIdleOffsets(glancer, t, out).ry)).toBe(0)
    }
    expect(maxHeadYaw).toBeGreaterThan(0.35)
  })

  it('drives all idle wrappers from one useFrame and leaves PlayerMesh internals alone', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
    const driver = source.slice(source.indexOf('function TitleIdleDriver'), source.indexOf('function TitleCameraRig'))
    expect(driver.match(/useFrame\(/g)).toHaveLength(1)
    expect(source).toContain("prefers-reduced-motion: reduce")
    expect(source).toContain('<group ref={idleRef}>\n        <PlayerMesh groupRef={meshGroup} movingRef={movingRef} outfit={outfit} idleRig={idleRig} />')
  })
})
