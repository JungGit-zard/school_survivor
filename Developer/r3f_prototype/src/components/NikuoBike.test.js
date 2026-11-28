import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { getStudioItemById } from '../lib/graphicsStudioConfig.js'
import { getPreviewFrame } from './GraphicsStudioPreview.jsx'
import { SLTERA_COLORS, SLTERA_DRIVER_BASE_PARTS, SLTERA_DRIVER_SCALE } from './SlteraCar.jsx'
import {
  NIKUO_BIKE_COLORS, NIKUO_BIKE_GLOW, NIKUO_BIKE_LIVERY, NIKUO_BIKE_PARTS, NIKUO_BIKE_PROFILE, NIKUO_BIKE_WHEELS,
  NIKUO_RIDER_BODY_PARTS, NIKUO_RIDER_HEAD, NIKUO_RIDER_HEAD_KEYS, NIKUO_RIDER_JOINTS,
  getNikuoBikeGeometries, nikuoRiderHeadMatrix, nikuoWheelSpin,
} from './NikuoBike.jsx'

const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3
const box = (g) => { g.computeBoundingBox(); return g.boundingBox.clone() }
const source = readFileSync(new URL('./NikuoBike.jsx', import.meta.url), 'utf8')
const part = (list, key) => list.find((p) => p[0] === key)

function wholeBikeBox() {
  const g = getNikuoBikeGeometries()
  const b = box(g.body)
  for (const [key, w] of [['frontWheel', NIKUO_BIKE_WHEELS.front], ['rearWheel', NIKUO_BIKE_WHEELS.rear]]) {
    b.union(box(g[key]).translate(new THREE.Vector3(0, w.radius, w.z)))
  }
  return b
}

describe('Nikuo supersport bike', () => {
  it('is about 2.1 long, low and narrow, at zombie scale with the rider on top', () => {
    const b = wholeBikeBox()
    const length = b.max.z - b.min.z
    expect(length).toBeGreaterThan(1.95)
    expect(length).toBeLessThan(2.25)
    expect(b.max.x - b.min.x).toBeLessThan(0.8)
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01) // tyres sit on y=0
    expect(b.max.y).toBeGreaterThan(1.45) // rider's regent crest
    expect(b.max.y).toBeLessThan(1.8)
  })

  it('has the supersport silhouette: low sharp nose, small raised screen, tank hump, high short tail', () => {
    const y = (z) => Math.max(...NIKUO_BIKE_PROFILE.filter(([pz]) => Math.abs(pz - z) < 0.09).map(([, py]) => py))
    const seatY = part(NIKUO_BIKE_LIVERY, 'seat')[2][1][1]
    const tailTop = Math.max(...NIKUO_BIKE_PROFILE.filter(([z]) => z < -0.8).map(([, py]) => py))
    const tankTop = Math.max(...NIKUO_BIKE_PROFILE.filter(([z]) => z > -0.1 && z < 0.35).map(([, py]) => py))
    expect(tailTop - seatY).toBeGreaterThan(0.12) // high tail kicks up behind the seat
    expect(tankTop).toBeGreaterThan(y(0.4)) // tank hump rises behind the cockpit dip
    const noseTip = NIKUO_BIKE_PROFILE.reduce((a, p) => (p[0] > a[0] ? p : a))
    expect(noseTip[1]).toBeLessThan(tankTop - 0.2) // nose tip drops low and forward
    const screen = part(NIKUO_BIKE_PARTS, 'windscreen')
    expect(screen[3][1]).toBeGreaterThan(y(0.64)) // screen stands above the upper fairing
    expect(screen[4][0]).toBeLessThan(-0.5) // and leans back
    // twin headlights, mirrored, and a full fairing that covers down below the wheel tops
    expect(NIKUO_BIKE_GLOW.filter((p) => p[6] === 'head')).toHaveLength(2)
    expect(Math.min(...NIKUO_BIKE_PROFILE.map(([, py]) => py))).toBeLessThan(0.3)
  })

  it('uses chunky forks, clip-ons, big twin front discs and a one-sided swingarm', () => {
    const { front, rear } = NIKUO_BIKE_WHEELS
    expect(rear.width).toBeGreaterThan(front.width)
    expect(part(NIKUO_BIKE_PARTS, 'forkUpperR')[2][0]).toBeGreaterThanOrEqual(0.045)
    expect(part(NIKUO_BIKE_PARTS, 'clipOnR')).toBeTruthy()
    expect(NIKUO_BIKE_PARTS.filter((p) => p[0].startsWith('swingarm'))).toHaveLength(1)
    expect(source).toMatch(/buildWheel\(FW, \[0\.075, -0\.075\], 0\.205/) // two front discs, outer r 0.205
    expect(0.205 / front.radius).toBeGreaterThan(0.65)
    // tricolour livery only
    expect(new Set(NIKUO_BIKE_LIVERY.map((p) => p[1]))).toEqual(new Set(['red', 'blue', 'seat', 'frame']))
    expect(NIKUO_BIKE_COLORS.red >> 16).toBeGreaterThan(0xc0)
    expect(NIKUO_BIKE_COLORS.blue & 0xff).toBeGreaterThan(0x80)
    expect(NIKUO_BIKE_COLORS.white & 0xff).toBeGreaterThan(0xe8)
  })

  it('carries the same Nikuo as the Sltera: head, shades, regent, headband and collar come from the car driver parts', () => {
    const baseKeys = SLTERA_DRIVER_BASE_PARTS.map((p) => p[0])
    for (const key of ['head', 'regent', 'regentCurl', 'duckTail', 'hairCap', 'headband', 'headbandKnot', 'headbandTailUp',
      'headbandTailDown', 'shadeLensL', 'shadeLensR', 'shadeBridge', 'shadeGlintL', 'coatCollar']) {
      expect(NIKUO_RIDER_HEAD_KEYS).toContain(key)
      expect(baseKeys).toContain(key)
    }
    expect(NIKUO_RIDER_HEAD.scale).toBe(SLTERA_DRIVER_SCALE)
    for (const k of ['skin', 'coat', 'band', 'hair', 'shades', 'lens', 'glint']) expect(NIKUO_BIKE_COLORS[k]).toBe(SLTERA_COLORS[k])
    // the moved head is the same size as the car's visible (1.5x) driver head and sits where the pose puts it
    const head = part(SLTERA_DRIVER_BASE_PARTS, 'head')
    const m = nikuoRiderHeadMatrix()
    const c = new THREE.Vector3(...head[3]).applyMatrix4(m)
    expect(c.toArray().map((v) => +v.toFixed(6))).toEqual(NIKUO_RIDER_HEAD.position)
    const edge = new THREE.Vector3(head[3][0] + head[2][0], head[3][1], head[3][2]).applyMatrix4(m)
    expect(edge.distanceTo(c)).toBeCloseTo(head[2][0] * SLTERA_DRIVER_SCALE, 6)
    // the coat torso/legs are white coat / dark pants, hands are skin
    expect(part(NIKUO_RIDER_BODY_PARTS, 'coatTorso')[5]).toBe('coat')
    expect(part(NIKUO_RIDER_BODY_PARTS, 'handR')[5]).toBe('skin')
  })

  it('rides in a forward tuck: hands on the clip-on grips, boots on the pegs', () => {
    const J = NIKUO_RIDER_JOINTS
    const lean = Math.atan2(J.neck[2] - J.pelvis[2], J.neck[1] - J.pelvis[1])
    expect(lean).toBeGreaterThan(Math.PI / 4) // torso tipped more than 45 degrees forward of upright
    const grip = part(NIKUO_BIKE_PARTS, 'gripR')
    expect(new THREE.Vector3(...J.hand).distanceTo(new THREE.Vector3(...grip[3]))).toBeLessThan(0.05)
    const peg = part(NIKUO_BIKE_PARTS, 'pegR')
    const boot = part(NIKUO_RIDER_BODY_PARTS, 'bootR')
    expect(Math.abs(boot[3][2] - peg[3][2])).toBeLessThan(0.06)
    expect(boot[3][1] - boot[2][1] / 2).toBeLessThan(peg[3][1] + 0.03) // sole rests on the peg
    expect(boot[3][0]).toBeGreaterThan(peg[3][0] - peg[2][2] / 2)
    // the head stays above and clear of the windscreen top edge
    const ws = part(NIKUO_BIKE_PARTS, 'windscreen')
    const wsTop = ws[3][1] + (ws[2][1] / 2) * Math.cos(ws[4][0])
    expect(NIKUO_RIDER_HEAD.position[1] - 0.15).toBeGreaterThan(wsTop)
  })

  it('spins the wheels forward with speed (top of the tyre moves +Z)', () => {
    const a = nikuoWheelSpin(6, NIKUO_BIKE_WHEELS.front.radius, 1 / 60)
    expect(a).toBeCloseTo(6 / NIKUO_BIKE_WHEELS.front.radius / 60, 9)
    const top = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), a)
    expect(top.z).toBeGreaterThan(0)
    expect(nikuoWheelSpin(0, 0.3, 1)).toBe(0)
  })

  it('stays within a low polygon and draw-call budget and builds geometry once', () => {
    const geos = getNikuoBikeGeometries()
    expect(getNikuoBikeGeometries()).toBe(geos)
    const model = tris(geos.body) + tris(geos.frontWheel) + tris(geos.rearWheel) + tris(geos.head) + tris(geos.tail)
    const hulls = tris(geos.bodyHull) + tris(geos.frontWheelHull) + tris(geos.rearWheelHull)
    expect(model).toBeLessThan(4500)
    expect(model + hulls).toBeLessThan(7500)
    // 8 meshes (body, 3 hulls, 2 wheels, headlights, tail light) + 2 headlamp halo sprites = 10 draw calls
    const meshes = source.match(/<mesh /g).length
    const sprites = NIKUO_BIKE_GLOW.filter((p) => p[6] === 'head').length
    expect(meshes).toBe(8)
    expect(source.match(/<sprite /g)).toHaveLength(1)
    expect(meshes + sprites).toBeLessThanOrEqual(12)
    expect(source).not.toMatch(/<(pointLight|spotLight|rectAreaLight)/)
    expect(source).not.toMatch(/<(planeGeometry|boxGeometry|sphereGeometry|cylinderGeometry)/)
  })

  it('carries no real brand text, badge or number plate', () => {
    expect(source).not.toMatch(/honda|cbr|fireblade|hrc|repsol|\bwing\b/i)
    expect(source).not.toMatch(/fillText|CanvasTexture|plate/i)
    const labels = [...source.matchAll(/LABEL = '([^']*)'/g)].map((m) => m[1])
    expect(labels).toEqual(['Nikuo Bike'])
  })

  it('is listed on the graphics viewer as a model-only actor preview', () => {
    const item = getStudioItemById('actor-nikuo-bike')
    expect(item).toMatchObject({ category: 'actor', previewKind: 'nikuoBike', source: 'components/NikuoBike.jsx' })
    expect(getPreviewFrame(item).target[1]).toBeGreaterThan(0.4)
    const preview = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    expect(preview).toContain("item.previewKind === 'nikuoBike'")
  })
})
