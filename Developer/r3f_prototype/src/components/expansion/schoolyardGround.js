import * as THREE from 'three'
import { getToonGradient } from '../../lib/toon.js'
import trackUrl from '../../assets/textures/schoolyard/track.jpg?url'
import grassUrl from '../../assets/textures/schoolyard/grass.jpg?url'
import sandUrl from '../../assets/textures/schoolyard/sand.jpg?url'
import pavingUrl from '../../assets/textures/schoolyard/paving.jpg?url'
import kerbUrl from '../../assets/textures/schoolyard/kerb.jpg?url'

// Stage 6 「운동장」 textured ground (2026-11-17 v3; field floor 2026-11-21): CC0 ambientCG maps
// (src/assets/textures/schoolyard/PROVENANCE.json). The whole field floor — striped pitch, the surround
// inside the arena and the outfield beyond it — is the Grass004 photo in its real colour (Terry picked it:
// 「이걸로 깔아라」); the 4-lane athletics track with its concrete kerb, the sand long-jump pit and worn
// goalmouths and the paved gate walk keep their detail maps. Everything is flat (no colliders) and derived
// from the arena size + goal data, so it follows whatever stage 6 bounds the stage data defines.
// One draw call per mesh, same meshes as before.
//
// Detail maps are plain multipliers (mean 0.80, no colour space); the toon material colour sets each such
// surface's average tone. grass.jpg is an sRGB colour map: its material colour is only a light tint.
// Colours were checked in the browser against real telegraphs: yellow cue ≥ 20 ΔE and red ≥ 33.5 ΔE on
// every surface a telegraph can hit.
export const SCHOOLYARD_GROUND_COLORS = Object.freeze({
  // Measured 2026-11-17 on the textured surfaces (start-of-windup telegraphs, 0.4 opacity; ΔE76 mean /
  // darkest 10% / lightest 10% of the ground under the circle, white paint excluded):
  //   track yellow 29.3/30.5/27.6  red 35.4/34.5/36.0      sand  yellow 22.3/24.4/20.9  red 34.7/35.1/34.5
  // grass / grassStripe: tint over the Grass004 photo and the darker mowing band of the pitch. The photo's
  // light blades are yellow-olive, so the tint darkens and cools it slightly to keep the yellow cue (2026-11-21,
  // same method, screen pixels at the spawn view / beside the sand pit):
  //   grass yellow 25.4/30.7/20.7 · 24.2/29.0/20.4  red 42.7/42.9/42.4 · 42.7/42.8/42.7
  //   (light tint #C4D8C2 gave yellow 15.8 on the lightest 10%)
  grass: '#98B8B0', grassStripe: '#84A298', track: '#3F86A8', kerb: '#DCD9CF', sand: '#5C6A5E',
  paving: '#C9C2B4', line: '#F7F4EA',
})
// World units per texture repeat.
const TILE = Object.freeze({ grass: 4, track: 2.2, kerb: 1.6, sand: 2.4, paving: 2.6 })
const DETAIL_MEAN = 0.8
const URLS = { grass: grassUrl, track: trackUrl, kerb: kerbUrl, sand: sandUrl, paving: pavingUrl }
// Colour (sRGB) maps; the others are grayscale detail multipliers.
const COLOUR_MAPS = new Set(['grass'])
// Grass repeat breaker: the same map sampled again, rotated and ~5× / ~14× larger, modulates brightness
// (±20 % at most) around the map's mean linear luminance (PROVENANCE.json meanLinearLuminance). Two extra
// texture reads in the ground shader, no extra draw call, no extra texture.
const GRASS_MACRO = Object.freeze({ scale: 0.19, scale2: 0.071, mean: 0.1054, gain: 1.6 })

// Heights (top faces) — all below the telegraph decals (y 0.035+).
const Y = Object.freeze({ outfield: -0.03, paving: -0.022, dirt: -0.012, track: -0.004, kerb: -0.0035, turf: -0.004, sand: -0.0025, marks: 0.0015, digits: 0.002 })

// ── Shared layout of the track and pitch (also used for claims/tests) ──
export function getSchoolyardTrackLayout({ halfX, halfZ, trackX = null }, goals = []) {
  const k = halfX / 12 // 1 on the original 24-wide board
  const lanes = 4, laneW = 0.54 * k, band = lanes * laneW, kerbW = 0.16 * k
  // Track centre line = the relay lane x from the stage data (layout.trackLanePointsUnits; relay zombies run
  // there), else the gameplay default half-width − 3.
  const R = Number.isFinite(trackX) && trackX > band ? trackX : halfX - 3, Ri = R - band / 2, Ro = R + band / 2
  const zc = Math.max(0.5, halfZ - Ro - 1.0 * k)
  const turfR = Ri - kerbW
  const touchX = turfR - 0.4 * k
  const goalLineZ = goals.length ? Math.min(...goals.map((g) => Math.abs(g.zUnits) - g.halfZUnits)) : zc
  return { k, lanes, laneW, band, kerbW, R, Ri, Ro, zc, turfR, touchX, goalLineZ }
}

// ── geometry helpers (flat, y-up, world-xz UVs) ──
function flatGeometry(positions, indices, { y, tile, colors = null }) {
  const n = positions.length / 2, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const x = positions[i * 2], z = positions[i * 2 + 1]
    pos.set([x, y, z], i * 3); nor.set([0, 1, 0], i * 3); uv.set([x / tile, -z / tile], i * 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  if (colors) g.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(colors), 3))
  g.setIndex(indices)
  g.computeBoundingSphere()
  return g
}
// Ensure upward winding (counter-clockwise seen from +y) for a triangle list.
function upTris(P, idx) {
  const out = []
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]]
    const cross = (P[b * 2] - P[a * 2]) * (P[c * 2 + 1] - P[a * 2 + 1]) - (P[b * 2 + 1] - P[a * 2 + 1]) * (P[c * 2] - P[a * 2])
    out.push(...(cross < 0 ? [a, b, c] : [a, c, b])) // x right, z down (towards camera): y-up needs cross < 0
  }
  return out
}
// Stadium path samples: param along right straight (z -zc→zc), bottom curve (θ 0→π), left straight, top curve.
function stadiumSamples(zc, curveSegs = 64, straightSegs = 8) {
  const s = []
  for (let i = 0; i < straightSegs; i++) s.push({ kind: 'S', side: 1, z: -zc + (2 * zc * i) / straightSegs })
  for (let i = 0; i < curveSegs; i++) s.push({ kind: 'C', cz: zc, t: (Math.PI * i) / curveSegs })
  for (let i = 0; i < straightSegs; i++) s.push({ kind: 'S', side: -1, z: zc - (2 * zc * i) / straightSegs })
  for (let i = 0; i < curveSegs; i++) s.push({ kind: 'C', cz: -zc, t: Math.PI + (Math.PI * i) / curveSegs })
  return s
}
const at = (smp, r) => (smp.kind === 'S' ? [smp.side * r, smp.z] : [r * Math.cos(smp.t), smp.cz + r * Math.sin(smp.t)])
// Closed ring between radii r1 < r2 (or an open arc between sample indices).
function ringStrip(P, I, zc, r1, r2, samples = stadiumSamples(zc)) {
  const base = P.length / 2, n = samples.length
  for (const smp of samples) { P.push(...at(smp, r1)); P.push(...at(smp, r2)) }
  const tris = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = base + i * 2, b = a + 1, c = base + j * 2, d = c + 1
    tris.push(a, b, c, c, b, d)
  }
  I.push(...upTris(P, tris))
}
function quad(P, I, corners) { // 4 [x,z] corners in order
  const b = P.length / 2
  for (const c of corners) P.push(...c)
  I.push(...upTris(P, [b, b + 1, b + 2, b, b + 2, b + 3]))
}
function rect(P, I, cx, cz, w, d, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hd = d / 2
  const pt = (x, z) => [cx + x * c + z * s, cz - x * s + z * c]
  quad(P, I, [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)])
}
// Filled stadium (convex): fan around the centre.
function stadiumFill(P, I, zc, r, colorsOut = null, colorAt = null) {
  const samples = stadiumSamples(zc, 64, 12), b = P.length / 2
  P.push(0, 0); if (colorsOut) colorsOut.push(...colorAt(0, 0))
  for (const smp of samples) { const [x, z] = at(smp, r); P.push(x, z); if (colorsOut) colorsOut.push(...colorAt(x, z)) }
  const tris = []
  for (let i = 0; i < samples.length; i++) tris.push(b, b + 1 + i, b + 1 + ((i + 1) % samples.length))
  I.push(...upTris(P, tris))
}
// Ragged ellipse (worn patch), deterministic.
function raggedEllipse(P, I, cx, cz, rx, rz, seed) {
  const n = 28, b = P.length / 2
  P.push(cx, cz)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, j = 0.82 + 0.18 * Math.abs(Math.sin(a * 3 + seed) * Math.cos(a * 5 - seed * 1.7))
    P.push(cx + Math.cos(a) * rx * j, cz + Math.sin(a) * rz * j)
  }
  const tris = []
  for (let i = 0; i < n; i++) tris.push(b, b + 1 + i, b + 1 + ((i + 1) % n))
  I.push(...upTris(P, tris))
}

// ── materials (module cache; textures are shared and never disposed, like the cached toon materials) ──
const _loader = new THREE.TextureLoader()
const _textures = new Map(), _materials = new Map()
function detailTexture(name) {
  if (!_textures.has(name)) {
    const t = _loader.load(URLS[name])
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = COLOUR_MAPS.has(name) ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 4
    t.name = `schoolyard-ground-${name}`
    _textures.set(name, t)
  }
  return _textures.get(name)
}
export function getSchoolyardGroundMaterial(surface, { map = surface, vertexColors = false, color = SCHOOLYARD_GROUND_COLORS[surface] } = {}) {
  const key = `${surface}|${map}|${vertexColors}|${color}`
  if (!_materials.has(key)) {
    // Detail maps: colour / mean so the textured average equals the chosen tone. Colour maps: plain tint.
    const c = new THREE.Color(color).multiplyScalar(map && !COLOUR_MAPS.has(map) ? 1 / DETAIL_MEAN : 1)
    const m = new THREE.MeshToonMaterial({ color: c, gradientMap: getToonGradient(), emissive: c.clone(), emissiveIntensity: 0.04 })
    if (map) { m.map = detailTexture(map); m.emissiveMap = m.map }
    if (map === 'grass') addGrassMacroVariation(m)
    m.vertexColors = vertexColors
    m.name = `schoolyard-ground-${surface}`
    // Stencil like toonMat (ground paint writes the stencil; outlines are not stencil-tested over it).
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
    _materials.set(key, m)
  }
  return _materials.get(key)
}

function addGrassMacroVariation(m) {
  const { scale, scale2, mean, gain } = GRASS_MACRO, f = (x) => x.toFixed(4)
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 macroUv = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv;
        float macroA = dot(texture2D(map, macroUv * ${f(scale)}).rgb, vec3(0.3333));
        float macroB = dot(texture2D(map, macroUv.yx * ${f(scale2)} + 0.37).rgb, vec3(0.3333));
        diffuseColor.rgb *= clamp(1.0 + ${f(gain)} * (macroA + macroB - ${f(2 * mean)}), 0.8, 1.2);
      }`)
  }
  m.customProgramCacheKey = () => 'schoolyard-grass-macro-v1'
}

// Lane numbers 1..lanes as one small canvas atlas (generated, not downloaded). Null without a 2D canvas.
let _digits = null
function digitAtlas(lanes) {
  if (_digits !== null) return _digits
  _digits = false
  if (typeof document === 'undefined') return _digits
  const canvas = document.createElement('canvas'); canvas.width = 64 * lanes; canvas.height = 64
  const ctx = canvas.getContext?.('2d')
  if (!ctx || typeof ctx.fillText !== 'function') return _digits
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < lanes; i++) ctx.fillText(String(i + 1), 32 + i * 64, 34)
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  _digits = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, color: SCHOOLYARD_GROUND_COLORS.line })
  _digits.name = 'schoolyard-lane-numbers'
  return _digits
}

// ── builder ──
export function createSchoolyardGround({ halfX, halfZ, goals = [], trackX = null }) {
  const L = getSchoolyardTrackLayout({ halfX, halfZ, trackX }, goals)
  const { k, lanes, laneW, kerbW, Ri, Ro, zc, turfR, touchX, goalLineZ } = L
  const group = new THREE.Group(); group.name = 'schoolyard-textured-ground'
  let pieces = 0
  const add = (name, surface, P, I, opts = {}) => {
    const g = flatGeometry(P, I, { y: Y[opts.y ?? surface], tile: TILE[opts.tile ?? surface] ?? 3, colors: opts.colors ?? null })
    const mesh = new THREE.Mesh(g, opts.material ?? getSchoolyardGroundMaterial(surface, opts.matOpts))
    mesh.name = name; mesh.userData.schoolyardOwnedGeometry = true; mesh.matrixAutoUpdate = false
    group.add(mesh); pieces += I.length / 6
    return mesh
  }

  // Outfield grass (big, beyond anything the camera can frame) and the paved gate walk.
  { const P = [], I = []; rect(P, I, 0, 0, halfX * 2 + 80, halfZ * 2 + 80); add('schoolyard-ground-outfield', 'grass', P, I, { y: 'outfield' }) }
  { const P = [], I = []; rect(P, I, 0, halfZ + 4.2, 3.4, 8); add('schoolyard-ground-gate-walk', 'paving', P, I) }
  // Surround (the whole playable rectangle; track, turf and sand sit on top): the same Grass004 floor as the
  // outfield (world-space UVs, so no seam at the arena edge).
  { const P = [], I = []; rect(P, I, 0, 0, halfX * 2, halfZ * 2); add('schoolyard-ground-dirt', 'grass', P, I, { y: 'dirt' }) }
  // Track surface and the concrete kerb against the infield.
  { const P = [], I = []; ringStrip(P, I, zc, Ri, Ro); add('schoolyard-ground-track', 'track', P, I) }
  { const P = [], I = []; ringStrip(P, I, zc, turfR, Ri); add('schoolyard-ground-kerb', 'kerb', P, I) }
  // Grass004 pitch infield with mowing stripes (vertex tint bands across the pitch).
  {
    const P = [], I = [], colors = []
    const stripe = 1.6 * k, tintA = new THREE.Color(SCHOOLYARD_GROUND_COLORS.grass), tintB = new THREE.Color(SCHOOLYARD_GROUND_COLORS.grassStripe)
    const ratio = [tintB.r / tintA.r, tintB.g / tintA.g, tintB.b / tintA.b]
    // Band polygons (stadium ∩ [z0, z1]), coloured per band: exact edges, no interpolation across stripes.
    const zMax = zc + turfR, halfW = (z) => (Math.abs(z) <= zc ? turfR : Math.sqrt(Math.max(0, turfR * turfR - (Math.abs(z) - zc) ** 2)))
    const n = Math.ceil((2 * zMax) / stripe)
    for (let b = 0; b < n; b++) {
      const z0 = -zMax + b * stripe, z1 = Math.min(zMax, z0 + stripe), tint = b % 2 ? ratio : [1, 1, 1]
      const steps = 6, left = [], right = []
      for (let s = 0; s <= steps; s++) { const z = z0 + ((z1 - z0) * s) / steps, w = halfW(z); left.push([-w, z]); right.push([w, z]) }
      const base = P.length / 2
      for (const [x, z] of [...left, ...right.reverse()]) { P.push(x, z); colors.push(...tint) }
      const m = left.length * 2, tris = []
      for (let i = 1; i < m - 1; i++) tris.push(base, base + i, base + i + 1)
      I.push(...upTris(P, tris))
    }
    add('schoolyard-ground-turf', 'grass', P, I, { y: 'turf', colors, matOpts: { vertexColors: true } })
  }
  // Sand: worn goalmouths and the long-jump pit beside the right straight.
  {
    const P = [], I = []
    goals.forEach((g, i) => { const f = g.zUnits < 0 ? 1 : -1, front = g.zUnits + f * g.halfZUnits; raggedEllipse(P, I, g.xUnits, front + f * 0.75 * k, g.halfXUnits + 0.45 * k, 1.0 * k, i * 2.3 + 1) })
    const pitX = (Ro + halfX) / 2, pitW = Math.min(1.1 * k, (halfX - Ro) * 0.6), pz0 = 0.09 * halfZ, pz1 = 0.28 * halfZ
    rect(P, I, pitX, (pz0 + pz1) / 2, pitW, pz1 - pz0)
    add('schoolyard-ground-sand', 'sand', P, I)
    L.pit = { x: pitX, w: pitW, z0: pz0, z1: pz1 }
  }
  // White markings: lane lines, finish line, staggered 200 m starts, pitch lines, pit border + runway.
  {
    const P = [], I = [], lw = 0.05 * k
    for (let i = 0; i <= lanes; i++) { const r = Ri + i * laneW; ringStrip(P, I, zc, r - lw / 2, r + lw / 2) }
    const finishZ = zc - 0.25 * k
    rect(P, I, (Ri + Ro) / 2, finishZ, Ro - Ri, 0.1 * k)
    for (let i = 0; i < lanes; i++) { // stagger: lane i starts π(r_i − r_1) further round the bottom bend
      const r = Ri + (i + 0.5) * laneW, r1 = Ri + 0.5 * laneW, th = (Math.PI * (r - r1)) / r
      const tx = -Math.sin(th), tz = Math.cos(th), nx = Math.cos(th), nz = Math.sin(th), cx = r * nx, cz = zc + r * nz, hw = laneW / 2 - lw, ht = 0.05 * k
      quad(P, I, [[cx - nx * hw - tx * ht, cz - nz * hw - tz * ht], [cx + nx * hw - tx * ht, cz + nz * hw - tz * ht], [cx + nx * hw + tx * ht, cz + nz * hw + tz * ht], [cx - nx * hw + tx * ht, cz - nz * hw + tz * ht]])
    }
    // 100 m start line at the far end of the right straight
    rect(P, I, (Ri + Ro) / 2, -zc + 0.25 * k, Ro - Ri, 0.08 * k)
    // pitch
    const pw = 0.08
    for (const side of [-1, 1]) {
      rect(P, I, side * touchX, 0, pw, goalLineZ * 2)
      rect(P, I, 0, side * goalLineZ, touchX * 2 + pw, pw)
    }
    rect(P, I, 0, 0, touchX * 2, pw)
    const cr = Math.min(2.5 * k, touchX * 0.45)
    ringStrip(P, I, 0, cr - pw / 2, cr + pw / 2, Array.from({ length: 48 }, (_, i) => ({ kind: 'C', cz: 0, t: (i / 48) * Math.PI * 2 })))
    rect(P, I, 0, 0, 0.2, 0.2)
    for (const g of goals) {
      const f = g.zUnits < 0 ? 1 : -1, front = g.zUnits + f * g.halfZUnits
      const bw = Math.min(g.halfXUnits * 1.875, touchX - 0.2), bd = 3 * k, gw = g.halfXUnits + 0.2, gd = 1.1 * k
      rect(P, I, g.xUnits, front + f * bd, bw * 2, pw)
      for (const s of [-1, 1]) rect(P, I, g.xUnits + s * bw, front + f * bd / 2, pw, bd)
      rect(P, I, g.xUnits, front + f * gd, gw * 2, pw)
      for (const s of [-1, 1]) rect(P, I, g.xUnits + s * gw, front + f * gd / 2, pw, gd)
      rect(P, I, g.xUnits, front + f * 2.2 * k, 0.18, 0.18)
    }
    const { x, w, z0, z1 } = L.pit
    for (const s of [-1, 1]) rect(P, I, x + s * w / 2, (z0 + z1) / 2, 0.06, z1 - z0)
    rect(P, I, x, z1, w, 0.06); rect(P, I, x, z0 - 0.45 * k, w, 0.16 * k)
    for (const s of [-1, 1]) rect(P, I, x + s * w / 2, z0 - 0.3 * halfZ / 2 - 0.45 * k, 0.05, 0.3 * halfZ)
    add('schoolyard-ground-markings', 'line', P, I, { y: 'marks', matOpts: { map: null } })
  }
  // Lane numbers just past the finish line.
  const digits = digitAtlas(lanes)
  if (digits) {
    const P = [], I = [], uvs = [], size = 0.4 * k, z = zc - 0.25 * k - 0.45 * k
    for (let i = 0; i < lanes; i++) {
      const cx = Ri + (i + 0.5) * laneW, b = P.length / 2
      P.push(cx - size / 2, z - size / 2, cx + size / 2, z - size / 2, cx + size / 2, z + size / 2, cx - size / 2, z + size / 2)
      uvs.push(i / lanes, 1, (i + 1) / lanes, 1, (i + 1) / lanes, 0, i / lanes, 0)
      I.push(...upTris(P, [b, b + 1, b + 2, b, b + 2, b + 3]))
    }
    const mesh = add('schoolyard-ground-lane-numbers', 'line', P, I, { y: 'digits', material: digits })
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(uvs), 2))
    mesh.renderOrder = 2
  }
  group.updateMatrixWorld(true)
  for (const m of group.children) m.updateMatrix()
  group.userData.layout = L
  group.userData.pieces = pieces
  return group
}

export function disposeSchoolyardGround(group) {
  group?.traverse((node) => { if (node.userData.schoolyardOwnedGeometry) node.geometry?.dispose() })
}
