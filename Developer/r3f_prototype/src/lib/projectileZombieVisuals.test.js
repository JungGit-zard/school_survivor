import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ENEMY_TYPE_CODES, ENEMY_TYPE_NAMES, enemyTypeFromCode } from './enemyEntityPool.js'
import {
  PROJECTILE_ZOMBIE_FIRST_TYPE_CODE, PROJECTILE_ZOMBIE_MAX_PROPS, PROJECTILE_ZOMBIE_PROP_PARENTS, PROJECTILE_ZOMBIE_PROP_SHAPES,
  PROJECTILE_ZOMBIE_STATE, PROJECTILE_ZOMBIE_TYPES, PROJECTILE_ZOMBIE_VISUALS, getProjectileZombieTelegraphProgress,
  isProjectileZombieTypeCode, projectileZombieIndex,
} from './projectileZombieVisuals.js'
import { FACE_CATALOG, PROJECTILE_FACE_FRAGMENT_SHADER, composePooledFaceMatrix } from './projectileZombieFace.js'
import { EXPANSION_STAGE_VISUALS } from './expansionVisuals.js'
import { ZOMBIE_PALETTE, buildPosedZombieParts, buildPosedZombiePartsFromRig, POSED_ZOMBIE_RIGS } from '../components/ZombieMesh.jsx'
import { phase, resolvePooledZombieVisual } from '../components/ZombieInstanceLayer.jsx'

const IDS = ['E46', 'E47', 'E48', 'E49', 'E50', 'E51', 'E52', 'E53', 'E54', 'E55', 'E56', 'E57', 'E58', 'E59', 'E60']
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]))

describe('projectile zombie registry (typeCode 49-63)', () => {
  it('registers E46-E60 at fixed codes 49-63 without moving any older code', () => {
    expect(PROJECTILE_ZOMBIE_TYPES).toEqual(IDS)
    IDS.forEach((id, index) => {
      expect(ENEMY_TYPE_CODES[id]).toBe(49 + index)
      expect(ENEMY_TYPE_NAMES[49 + index]).toBe(id)
      expect(enemyTypeFromCode(49 + index)).toBe(id)
      expect(isProjectileZombieTypeCode(49 + index)).toBe(true)
      expect(projectileZombieIndex(49 + index)).toBe(index + 1)
    })
    expect(PROJECTILE_ZOMBIE_FIRST_TYPE_CODE).toBe(49)
    expect(ENEMY_TYPE_CODES.E45).toBe(48)
    expect(ENEMY_TYPE_CODES.E08).toBe(16)
    expect(isProjectileZombieTypeCode(48)).toBe(false)
    expect(isProjectileZombieTypeCode(64)).toBe(false)
  })

  it('renders every code 49-63 through the pooled renderer with its own palette, face and props', () => {
    for (let code = 49; code <= 63; code += 1) {
      const visual = resolvePooledZombieVisual(code)
      expect(visual.name).toBe(IDS[code - 49])
      expect(visual.partCount).toBe(10)
      expect(visual.paletteIsE01Fallback).toBe(false)
      expect(visual.faceId).toBe(code - 48)
      expect(visual.hidesEyeSlots).toBe(true)
      expect(visual.propCount).toBeGreaterThanOrEqual(1)
      expect(visual.propCount).toBeLessThanOrEqual(PROJECTILE_ZOMBIE_MAX_PROPS)
    }
    // older types are unchanged
    expect(resolvePooledZombieVisual(37).faceId).toBe(0)
    expect(resolvePooledZombieVisual(1).hidesEyeSlots).toBe(false)
  })

  it('maps the 14-17 state contract to body-pose phases', () => {
    const pool = { state: new Uint8Array(1) }
    const at = (state) => { pool.state[0] = state; return phase(pool, 0) }
    expect(at(PROJECTILE_ZOMBIE_STATE.APPROACH)).toBe('normal')
    expect(at(PROJECTILE_ZOMBIE_STATE.TELEGRAPH)).toBe('warn')
    expect(at(PROJECTILE_ZOMBIE_STATE.FIRE)).toBe('charge')
    expect(at(PROJECTILE_ZOMBIE_STATE.RECOVER)).toBe('stun')
    // existing codes untouched
    expect(at(2)).toBe('warn'); expect(at(9)).toBe('charge'); expect(at(13)).toBe('stun'); expect(at(1)).toBe('normal')
  })

  it('derives telegraph progress 0..1 from stateTimer counting down from telegraphMs', () => {
    const code = ENEMY_TYPE_CODES.E55
    const total = PROJECTILE_ZOMBIE_VISUALS.E55.telegraphMs
    expect(getProjectileZombieTelegraphProgress(code, PROJECTILE_ZOMBIE_STATE.TELEGRAPH, total)).toBe(0)
    expect(getProjectileZombieTelegraphProgress(code, PROJECTILE_ZOMBIE_STATE.TELEGRAPH, total / 2)).toBeCloseTo(0.5)
    expect(getProjectileZombieTelegraphProgress(code, PROJECTILE_ZOMBIE_STATE.TELEGRAPH, 0)).toBe(1)
    expect(getProjectileZombieTelegraphProgress(code, PROJECTILE_ZOMBIE_STATE.FIRE, 0)).toBe(0)
    expect(getProjectileZombieTelegraphProgress(1, PROJECTILE_ZOMBIE_STATE.TELEGRAPH, 0)).toBe(0)
  })

  it('keeps the POSED E34-E45 builder output identical after the rig-object refactor', () => {
    for (const type of Object.keys(POSED_ZOMBIE_RIGS)) {
      expect(buildPosedZombieParts(type)).toEqual(buildPosedZombiePartsFromRig(POSED_ZOMBIE_RIGS[type]))
    }
  })
})

describe('projectile zombie palettes and silhouettes', () => {
  const visuals = IDS.map((id) => PROJECTILE_ZOMBIE_VISUALS[id])

  it('gives all 15 species a unique uniform colour scheme', () => {
    const signatures = new Set(visuals.map((v) => `${v.palette.top}:${v.palette.bottom}:${v.palette.accent}`))
    expect(signatures.size).toBe(15)
    for (let a = 0; a < 15; a += 1) {
      for (let b = a + 1; b < 15; b += 1) {
        const pa = visuals[a].palette; const pb = visuals[b].palette
        // top/bottom pair distance in RGB: clearly different uniforms at gameplay distance
        const pairDistance = Math.hypot(dist(pa.top, pb.top), dist(pa.bottom, pb.bottom))
        expect(pairDistance, `${IDS[a]} vs ${IDS[b]}`).toBeGreaterThan(60)
        expect(dist(pa.top, pb.top), `${IDS[a]} vs ${IDS[b]} top`).toBeGreaterThan(30)
      }
    }
  })

  it('does not reuse any existing 48-type body colour as a uniform top', () => {
    const existing = Object.entries(ZOMBIE_PALETTE).filter(([type]) => !IDS.includes(type))
    expect(existing.length).toBeGreaterThanOrEqual(28)
    // E19-E33 expansion zombies take their coat from the stage palette
    for (const [stage, visual] of Object.entries(EXPANSION_STAGE_VISUALS)) existing.push([stage, { body: parseInt(String(visual.coat).slice(1), 16) }])
    for (const id of IDS) {
      const top = PROJECTILE_ZOMBIE_VISUALS[id].palette.top
      for (const [type, pal] of existing) expect(dist(top, pal.body), `${id} vs ${type}`).toBeGreaterThan(25)
    }
  })

  it('keeps props minimal, valid and thick enough to read (local >= 0.06)', () => {
    for (const id of IDS) {
      const { props } = PROJECTILE_ZOMBIE_VISUALS[id]
      expect(props.length).toBeGreaterThanOrEqual(1)
      expect(props.length).toBeLessThanOrEqual(PROJECTILE_ZOMBIE_MAX_PROPS)
      for (const item of props) {
        expect(PROJECTILE_ZOMBIE_PROP_SHAPES).toContain(item.shape)
        expect(PROJECTILE_ZOMBIE_PROP_PARENTS).toContain(item.parent)
        expect(Math.min(...item.size)).toBeGreaterThanOrEqual(0.06)
      }
      // the main feature must read on a ~30 CSS px tall zombie (0.3 local = about 6 CSS px)
      expect(Math.max(...props.map((item) => Math.max(...item.size))), id).toBeGreaterThanOrEqual(0.3)
      expect(PROJECTILE_ZOMBIE_VISUALS[id].rig.head.scale).toEqual([1.25, 1.25, 1.25])
    }
  })
})

describe('projectile zombie procedural faces', () => {
  it('dispatches exactly 15 faces 1:1 with typeCodes and stays within 12 SDF primitives', () => {
    expect(FACE_CATALOG.map((f) => f.typeCode)).toEqual(IDS.map((_, i) => 49 + i))
    expect(FACE_CATALOG.map((f) => f.faceId)).toEqual(IDS.map((_, i) => i + 1))
    for (const face of FACE_CATALOG) {
      expect(face.prims).toBeLessThanOrEqual(12)
      expect(PROJECTILE_FACE_FRAGMENT_SHADER).toContain(`void face${face.faceId}(`)
      expect(PROJECTILE_FACE_FRAGMENT_SHADER).toContain(`if (id == ${face.faceId}) face${face.faceId}(p, acc);`)
    }
    expect(PROJECTILE_FACE_FRAGMENT_SHADER).not.toMatch(/texture2D|texture\(/)
    expect(PROJECTILE_FACE_FRAGMENT_SHADER).toContain('fwidth')
    expect(PROJECTILE_FACE_FRAGMENT_SHADER).toContain('vec3(1.0, 0.478, 0.102)') // #FF7A1A
  })

  it('applies the requested E52/E53 fixes (no goggle strap, no E53 eye outline, yellow/blue eyes)', () => {
    const body = (n) => PROJECTILE_FACE_FRAGMENT_SHADER.slice(PROJECTILE_FACE_FRAGMENT_SHADER.indexOf(`void face${n}(`), PROJECTILE_FACE_FRAGMENT_SHADER.indexOf(`void face${n + 1}(`))
    expect(body(7)).not.toContain('vec2(-0.5, 0.09)') // strap removed
    expect(body(7)).toContain('vec2(0.13)') // larger lenses (r 0.10 -> 0.13)
    expect(body(8)).not.toContain('strokeCov(abs(d)') // no eye outline
    expect(body(8)).toContain('vec3(0.949, 0.761, 0.188)') // yellow
    expect(body(8)).not.toContain('0.91, 0.263, 0.231') // old red
  })

  it('puts the face quad on the head front face and follows head pose and non-uniform scale', () => {
    const head = new THREE.Matrix4().compose(new THREE.Vector3(1, 2, 3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.9, -0.1)), new THREE.Vector3(0.333, 0.333, 0.333))
    const box = [1.25, 1.1, 1.3]
    const face = composePooledFaceMatrix(new THREE.Matrix4(), head, box)
    const center = new THREE.Vector3().setFromMatrixPosition(face)
    const expected = new THREE.Vector3(0, 0, (0.46 / 2) * box[2] + 0.006 * box[2]).applyMatrix4(head)
    expect(center.distanceTo(expected)).toBeLessThan(1e-5)
    const corner = new THREE.Vector3(0.5, 0.5, 0).applyMatrix4(face)
    const expectedCorner = new THREE.Vector3(0.26 * box[0], 0.24 * box[1], (0.23 + 0.006) * box[2]).applyMatrix4(head)
    expect(corner.distanceTo(expectedCorner)).toBeLessThan(1e-5)
  })
})
