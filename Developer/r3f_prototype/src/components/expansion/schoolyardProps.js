import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonMat, outlineMat } from '../../lib/toon.js'

// Stage 6 「운동장」 hand-built props: football goals, assembly podium, flagpoles, PA horn poles,
// jungle gym and bleachers. Each prop is ONE merged vertex-coloured toon mesh + ONE merged
// inverted-hull outline (constant-thickness, built per part), so a prop costs two draw calls no
// matter how many bars it has. Flags (vertex-shader wave) and goal nets (fragment-shader grid)
// are one extra mesh each for the whole stage. Everything here is visual-only: no colliders,
// no claims — the caller keeps the original footprints/claims and the goal colliders untouched.

export const SCHOOLYARD_PROP_IDS = Object.freeze(['goals','podium','flagpoles','paHorns','jungleGym','grandstand'])
// Solid-triangle ceiling per prop (outline hulls are reported separately, same order of size).
export const SCHOOLYARD_PROP_TRIANGLE_BUDGET = Object.freeze({goals:500,podium:500,flagpoles:500,paHorns:500,jungleGym:900,grandstand:900})

const OUTLINE = .03
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1,1,1)
const _up = new THREE.Vector3(0,1,0), _dir = new THREE.Vector3(), _c = new THREE.Color(), _n = new THREE.Vector3()

const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3

// Studio isolates materials with clone(), which drops onBeforeCompile; keep the shader patch on clones.
function keepShaderOnClone(material) {
 material.clone = function cloneWithShaderPatch() {
  const copy = Object.getPrototypeOf(this).clone.call(this)
  copy.onBeforeCompile = this.onBeforeCompile
  copy.customProgramCacheKey = this.customProgramCacheKey
  keepShaderOnClone(copy)
  return copy
 }
 return material
}
// Studio's material pass sets emissive = material.color; with a white base that would wash every prop
// out, so the emissive term is multiplied by the vertex colour (same per-colour lift as toonMat).
const VERTEX_COLOUR_EMISSIVE = `#include <emissivemap_fragment>
#ifdef USE_COLOR
 totalEmissiveRadiance *= vColor.rgb;
#endif`

// One shared vertex-colour toon material for every prop solid (stencil-writing like toonMat).
let _propSolidMat = null
export function getSchoolyardPropMaterial() {
 if (!_propSolidMat) {
  _propSolidMat = toonMat('#ffffff', .06)
  _propSolidMat.vertexColors = true
  _propSolidMat.name = 'schoolyard-prop-toon'
  _propSolidMat.onBeforeCompile = (shader) => {
   shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', VERTEX_COLOUR_EMISSIVE)
  }
  _propSolidMat.customProgramCacheKey = () => 'schoolyard-prop-toon-v1'
  keepShaderOnClone(_propSolidMat)
 }
 return _propSolidMat
}
// Inverted-hull outline WITHOUT the stencil test: the schoolyard ground is toon paint that writes the
// stencil everywhere, so stencil-tested hulls never show over it. Depth alone keeps the rim only;
// where parts meet, the hulls leave a hand-drawn contour line. stencilFunc stays NotEqual so Studio
// still recognises it as an outline material (isOutlineMaterial).
let _propOutlineMat = null
export function getSchoolyardOutlineMaterial() {
 if (!_propOutlineMat) {
  _propOutlineMat = outlineMat()
  _propOutlineMat.stencilWrite = false
  _propOutlineMat.transparent = false
  _propOutlineMat.opacity = 1
  _propOutlineMat.depthWrite = true
  _propOutlineMat.name = 'schoolyard-prop-outline'
 }
 return _propOutlineMat
}

function createPropBuilder() {
 const solids = [], hulls = []
 const orient = (r, axis) => axis ? _q.setFromUnitVectors(_up, _dir.fromArray(axis).normalize()) : _q.setFromEuler(_e.set(r[0], r[1], r[2]))
 const place = (geo, p, r, axis) => {
  geo.deleteAttribute('uv')
  const flat = geo.index ? geo.toNonIndexed() : geo
  if (flat !== geo) geo.dispose()
  return flat
 }
 const finish = (solid, hull, p, r, axis, color, capColor) => {
  // Paint before transforming so cap detection can use the primitive's local normals.
  const pos = solid.attributes.position, nor = solid.attributes.normal, colors = new Float32Array(pos.count * 3)
  const base = _c.set(color).clone(), cap = capColor ? new THREE.Color(capColor) : null
  for (let i = 0; i < pos.count; i++) {
   const c = cap && nor.getY(i) < -.5 ? cap : base
   colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  solid.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  _m.compose(_p.fromArray(p), orient(r, axis), _s)
  solid.applyMatrix4(_m); solids.push(solid)
  if (hull) { hull.applyMatrix4(_m); hull.deleteAttribute('normal'); hulls.push(hull) }
 }
 const api = {
  box(size, p, color, { r = [0,0,0], axis = null, t = OUTLINE, outline = true } = {}) {
   const solid = place(new THREE.BoxGeometry(...size), p, r, axis)
   const hull = outline ? place(new THREE.BoxGeometry(size[0] + t * 2, size[1] + t * 2, size[2] + t * 2), p, r, axis) : null
   finish(solid, hull, p, r, axis, color)
  },
  // Cylinder/cone along local +y (or along `axis`); capColor paints the -y cap (horn mouths, pot soil).
  cyl(rTop, rBottom, h, p, color, { r = [0,0,0], axis = null, seg = 6, t = OUTLINE, outline = true, capColor = null } = {}) {
   const solid = place(new THREE.CylinderGeometry(rTop, rBottom, h, seg), p, r, axis)
   const hull = outline ? place(new THREE.CylinderGeometry(rTop + t, rBottom + t, h + t * 2, seg), p, r, axis) : null
   finish(solid, hull, p, r, axis, color, capColor)
  },
  ball(radius, p, color, { t = OUTLINE, outline = true, scale = [1,1,1] } = {}) {
   const solid = place(new THREE.IcosahedronGeometry(radius, 0).scale(...scale), p, [0,0,0])
   const hull = outline ? place(new THREE.IcosahedronGeometry(radius + t, 0).scale(...scale), p, [0,0,0]) : null
   finish(solid, hull, p, [0,0,0], null, color)
  },
  // Thin bar between two points (rails, bars, slanted supports).
  bar(a, b, thick, color, opts = {}) {
   const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb)
   const mid = va.clone().add(vb).multiplyScalar(.5)
   api.box([thick, len, thick], mid.toArray(), color, { ...opts, axis: vb.clone().sub(va).toArray() })
  },
  build(name) {
   const group = new THREE.Group(); group.name = name
   const solidGeo = mergeGeometries(solids), hullGeo = hulls.length ? mergeGeometries(hulls) : null
   solids.forEach((g) => g.dispose()); hulls.forEach((g) => g.dispose())
   const solid = new THREE.Mesh(solidGeo, getSchoolyardPropMaterial()); solid.name = `${name}-solid`
   solid.userData.schoolyardOwnedGeometry = true
   group.add(solid)
   let hullTriangles = 0
   if (hullGeo) {
    const hull = new THREE.Mesh(hullGeo, getSchoolyardOutlineMaterial()); hull.name = `${name}-outline`; hull.renderOrder = 1
    hull.userData.schoolyardOwnedGeometry = true
    group.add(hull); hullTriangles = triCount(hullGeo)
   }
   group.userData.schoolyardPropTriangles = { solid: triCount(solidGeo), outline: hullTriangles }
   return group
  },
 }
 return api
}

// ── Football goals (the solid layout obstacles; drawn exactly on their collider rectangles) ──
function buildGoals(goals, C) {
 const b = createPropBuilder(), H = 1.4, HB = .95, T = .1
 const nets = []
 for (const goal of goals) {
  const { xUnits: x, zUnits: z, halfXUnits: hx, halfZUnits: hz } = goal, f = z < 0 ? 1 : -1
  const mouth = z + f * (hz - T / 2), back = z - f * (hz - T / 2)
  for (const s of [-1, 1]) {
   const px = x + s * (hx - T / 2)
   b.box([T, H, T], [px, H / 2, mouth], C.goal)                               // front post
   b.box([.07, HB, .07], [px, HB / 2, back], C.goal)                            // back post
   b.bar([px, .035, mouth], [px, .035, back], .07, C.goal)                      // ground side bar
   b.bar([px, H - .02, mouth], [px, HB - .02, back], .06, C.goal)               // sloped top-side bar
   b.box([.16, .05, .16], [px, .025, mouth], C.goalBase)                         // post foot
  }
  b.box([hx * 2, T, T], [x, H, mouth], C.goal)                                    // crossbar
  b.box([hx * 2 - .1, .07, .07], [x, HB - .02, back], C.goal)                      // back top bar
  b.box([hx * 2 - .1, .07, .07], [x, .035, back], C.goal)                          // back ground bar
  // Net panels hang just inside the frame: sloped roof, back curtain, two side wings.
  const ix = hx - .1, m = mouth - f * .06, k = back + f * .04
  nets.push([[x - ix, H - .07, m], [x + ix, H - .07, m], [x + ix, HB - .06, k], [x - ix, HB - .06, k]])
  nets.push([[x - ix, HB - .06, k], [x + ix, HB - .06, k], [x + ix, .02, k], [x - ix, .02, k]])
  for (const s of [-1, 1]) nets.push([[x + s * ix, H - .07, m], [x + s * ix, HB - .06, k], [x + s * ix, .02, k], [x + s * ix, .02, m]])
 }
 const group = b.build('schoolyard-prop-goals')
 group.add(createGoalNetMesh(nets, C.netStrand))
 return group
}

// Net = flat quads whose fragment shader keeps only a square grid of strands (discard elsewhere).
// World-unit coordinates keep every panel's cells the same size; fwidth keeps strands ≥ ~1px.
function createGoalNetMesh(quads, color) {
 const positions = [], gridUv = []
 for (const q of quads) {
  const [a, b2, c, d] = q.map((v) => new THREE.Vector3(...v))
  const u = b2.distanceTo(a), v = d.distanceTo(a)
  const uvs = [[0, 0], [u, 0], [u, v], [0, v]]
  for (const i of [0, 1, 2, 0, 2, 3]) { positions.push(...q[i]); gridUv.push(...uvs[i]) }
 }
 const geo = new THREE.BufferGeometry()
 geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
 geo.setAttribute('netUv', new THREE.Float32BufferAttribute(gridUv, 2))
 geo.computeVertexNormals()
 const mat = toonMat(color, .2, THREE.DoubleSide)
 mat.name = 'schoolyard-goal-net'
 mat.onBeforeCompile = (shader) => {
  shader.vertexShader = `attribute vec2 netUv;\nvarying vec2 vNetUv;\n${shader.vertexShader}`
   .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNetUv = netUv;')
  shader.fragmentShader = `varying vec2 vNetUv;\n${shader.fragmentShader}`
   .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  vec2 netG = vNetUv / 0.16;
  vec2 netW = fwidth(netG);
  vec2 netD = abs(fract(netG) - 0.5);
  vec2 netHalf = max(vec2(0.075), netW * 0.7);
  if (netD.x < 0.5 - netHalf.x && netD.y < 0.5 - netHalf.y) discard;`)
 }
 mat.customProgramCacheKey = () => 'schoolyard-goal-net-v1'
 keepShaderOnClone(mat)
 const mesh = new THREE.Mesh(geo, mat)
 mesh.name = 'schoolyard-prop-goals-net'
 mesh.userData.schoolyardOwnedGeometry = true
 mesh.userData.schoolyardOwnedMaterial = true
 mesh.userData.schoolyardPropTriangles = { solid: triCount(geo), outline: 0 }
 return mesh
}

// ── Assembly podium (조회대): deck, accent front panel, steps, railings, lectern, gooseneck mic ──
function buildPodium(z, halfZ, art, C) {
 const b = createPropBuilder(), top = 1.0, front = z + 1.2
 b.box([6, top, 2.4], [0, top / 2, z], C.podium, { t: .045 })
 b.box([5.7, .74, .06], [0, .45, front + .03], art.accent, { outline: false })        // accent front panel
 b.box([6.04, .1, .08], [0, .93, front + .04], art.trim, { outline: false })           // yellow lip
 // Two steps down to the field, same footprint as before, with yellow nosing.
 for (const [h, dz] of [[.67, .48], [.34, .2]]) {
  b.box([3, h, .3], [0, h / 2, -halfZ - dz], C.podium)
  b.box([3.02, .035, .07], [0, h + .017, -halfZ - dz + .12], art.trim, { outline: false })
 }
 // Railings on the back and both sides (the front stays open for the speaker).
 const rail = C.rail, railTop = top + .62, backZ = z - 1.12
 for (const x of [-2.9, -1.45, 0, 1.45, 2.9]) b.box([.07, .62, .07], [x, top + .31, backZ], rail)
 b.box([5.86, .07, .07], [0, railTop, backZ], rail)
 for (const s of [-1, 1]) {
  for (const dz of [-.1, .9]) b.box([.07, .62, .07], [s * 2.9, top + .31, z + dz], rail)
  b.box([.07, .07, 2.05], [s * 2.9, railTop, z - .1], rail)
 }
 // Lectern: wooden body, slanted reading top, school badge on the front.
 const lz = z + .4
 b.box([.95, 1.0, .55], [0, top + .5, lz], C.wood)
 b.box([1.05, .08, .66], [0, top + 1.04, lz - .02], C.woodLight, { r: [-.22, 0, 0] })
 b.cyl(.17, .17, .04, [0, top + .62, lz + .29], art.trim, { axis: [0, 0, 1], seg: 8 })
 b.box([.16, .16, .03], [0, top + .62, lz + .315], art.coat, { outline: false, r: [0, 0, Math.PI / 4] })
 // Gooseneck mic: base on the lectern top, three bending segments, black head facing the speaker.
 const mx = .3, my = top + 1.1, mz = lz + .12
 b.box([.12, .05, .12], [mx, my, mz], C.mic)
 const n0 = [mx, my, mz], n1 = [mx, my + .18, mz - .01], n2 = [mx - .05, my + .32, mz - .1], n3 = [mx - .11, my + .38, mz - .22]
 b.bar(n0, n1, .03, C.steel, { t: .018 }); b.bar(n1, n2, .03, C.steel, { t: .018 }); b.bar(n2, n3, .03, C.steel, { t: .018 })
 b.ball(.055, [mx - .13, my + .38, mz - .27], C.mic, { scale: [1, 1, 1.35], t: .02 })
 // Potted shrubs on the two front corners.
 for (const s of [-1, 1]) {
  b.cyl(.2, .15, .3, [s * 2.55, top + .15, front - .32], art.accent, { capColor: art.accent })
  b.ball(.26, [s * 2.55, top + .44, front - .32], C.leaf, { scale: [1, .85, 1] })
 }
 return b.build('schoolyard-prop-podium')
}

// ── PA poles: Korean schoolyard trumpet-horn speakers on a crossarm ──
function buildPaHorns(halfZ, C) {
 const b = createPropBuilder()
 for (const side of [-1, 1]) {
  const px = side * 3.4, pz = -halfZ - 1.2, armY = 3.72
  b.cyl(.065, .075, 4.2, [px, 2.1, pz], C.steel)
  b.box([.3, .12, .3], [px, .06, pz], C.cap)                                  // concrete footing
  b.box([.22, .3, .12], [px, 1.5, pz + .1], C.paBox)                          // amplifier box
  b.box([1.0, .07, .07], [px, armY, pz + .02], C.steel)                       // crossarm
  // Three horns: centre one looks at the field, the outer two splay out; all tip slightly down.
  for (const [ox, oy, yaw] of [[-.44, armY, -.6], [.44, armY, .6], [0, 4.02, 0]]) {
   const dir = new THREE.Vector3(Math.sin(yaw), -.22, Math.cos(yaw)).normalize()
   const base = new THREE.Vector3(px + ox, oy, pz + .07)
   const driver = base.clone().addScaledVector(dir, .05), horn = base.clone().addScaledVector(dir, .36)
   b.box([.08, .16, .08], [px + ox, oy + .04, pz + .04], C.steel, { t: .02 })  // bracket
   b.cyl(.075, .075, .17, driver.toArray(), C.steel, { axis: dir.clone().negate().toArray() })
   b.cyl(.05, .22, .48, horn.toArray(), C.horn, { axis: dir.clone().negate().toArray(), capColor: C.hornMouth })
  }
 }
 return b.build('schoolyard-prop-pa-horns')
}

// ── Flagpoles: ball finial, halyard rope, cleat, concrete base (flags themselves wave separately) ──
function buildFlagpoles(poles, art, C) {
 const b = createPropBuilder()
 for (const { x, z } of poles) {
  b.cyl(.04, .055, 5.5, [x, 2.75, z], C.pole)
  b.box([.34, .16, .34], [x, .08, z], C.cap)
  b.ball(.1, [x, 5.6, z], art.trim, { t: .022 })
  b.box([.016, 4.45, .016], [x + .055, 3.28, z + .03], C.rope, { outline: false })  // halyard
  b.box([.05, .14, .05], [x + .06, 1.05, z - .02], C.steel, { t: .015 })         // cleat
 }
 return b.build('schoolyard-prop-flagpoles')
}

// All flags in ONE mesh: per-vertex colour + pattern, a cheap travelling-sine wave in the vertex
// shader, and a black border ring (same wave) nudged behind the cloth in depth as its outline.
const FLAG_W = 1.0, FLAG_H = .62, FLAG_BORDER = .035, FLAG_SEGS = 8
function createFlagMesh(flags) {
 const positions = [], colors = [], flagData = [], border = []
 const black = new THREE.Color('#050209')
 const pushPlane = (f, w, h, x0, isBorder) => {
  const plane = new THREE.PlaneGeometry(w, h, FLAG_SEGS, 2).toNonIndexed()
  const pos = plane.attributes.position, color = isBorder ? black : new THREE.Color(f.color)
  for (let i = 0; i < pos.count; i++) {
   const lx = pos.getX(i) + w / 2 + x0, ly = pos.getY(i)
   positions.push(f.x + lx, f.y + ly, f.z)
   colors.push(color.r, color.g, color.b)
   flagData.push(lx / FLAG_W, ly / FLAG_H + .5, f.pattern, f.phase)
   border.push(isBorder ? 1 : 0)
  }
  plane.dispose()
 }
 for (const f of flags) {
  pushPlane(f, FLAG_W, FLAG_H, 0, false)
  pushPlane(f, FLAG_W + FLAG_BORDER * 2, FLAG_H + FLAG_BORDER * 2, -FLAG_BORDER, true)
 }
 const geo = new THREE.BufferGeometry()
 geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
 geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
 geo.setAttribute('flagData', new THREE.Float32BufferAttribute(flagData, 4))
 geo.setAttribute('flagBorder', new THREE.Float32BufferAttribute(border, 1))
 geo.computeVertexNormals()
 geo.computeBoundingSphere(); geo.boundingSphere.radius += .3
 const uniforms = {
  uFlagTime: { value: 0 },
  uFlagWhite: { value: new THREE.Color('#FFFDF5') },
  uFlagGold: { value: new THREE.Color('#F2C94C') },
  uFlagBlue: { value: new THREE.Color('#2F5FA8') },
 }
 const mat = toonMat('#ffffff', .06, THREE.DoubleSide)
 mat.vertexColors = true
 mat.name = 'schoolyard-flag-wave'
 mat.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = `uniform float uFlagTime;\nattribute vec4 flagData;\nattribute float flagBorder;\nvarying vec4 vFlagData;\nvarying float vFlagBorder;\n${shader.vertexShader}`
   .replace('#include <begin_vertex>', `#include <begin_vertex>
  vFlagData = flagData; vFlagBorder = flagBorder;
  float flagU = max(flagData.x, 0.0);
  transformed.z += sin(flagU * 5.2 - uFlagTime * 3.1 + flagData.w) * 0.15 * flagU;
  transformed.y -= flagU * flagU * 0.07;`)
   .replace('#include <project_vertex>', '#include <project_vertex>\n  gl_Position.z += flagBorder * 0.0002 * gl_Position.w;')
  shader.fragmentShader = `uniform vec3 uFlagWhite;\nuniform vec3 uFlagGold;\nuniform vec3 uFlagBlue;\nvarying vec4 vFlagData;\nvarying float vFlagBorder;\n${shader.fragmentShader}`
   .replace('#include <color_fragment>', `#include <color_fragment>
  if (vFlagBorder < 0.5) {
    vec2 flagQ = (vFlagData.xy - vec2(0.5)) * vec2(${(FLAG_W / FLAG_H).toFixed(4)}, 1.0);
    float flagR = length(flagQ);
    if (vFlagData.z > 0.5 && vFlagData.z < 1.5) {
      // School flag: white ring badge with a gold centre and a white book bar.
      if (flagR < 0.3) diffuseColor.rgb = uFlagWhite;
      if (flagR < 0.235) diffuseColor.rgb = uFlagGold;
      if (abs(flagQ.y) < 0.045 && abs(flagQ.x) < 0.14) diffuseColor.rgb = uFlagWhite;
    } else if (vFlagData.z > 1.5 && vFlagData.z < 2.5) {
      if (abs(flagQ.y) < 0.13) diffuseColor.rgb = uFlagBlue;
    } else if (vFlagData.z > 2.5) {
      if (abs(flagQ.y) < 0.11) diffuseColor.rgb = uFlagWhite;
    }
  }`)
   .replace('#include <emissivemap_fragment>', VERTEX_COLOUR_EMISSIVE)
 }
 mat.customProgramCacheKey = () => 'schoolyard-flag-wave-v1'
 keepShaderOnClone(mat)
 const mesh = new THREE.Mesh(geo, mat)
 mesh.name = 'schoolyard-prop-flags'
 mesh.userData.flagUniforms = uniforms
 mesh.userData.schoolyardOwnedGeometry = true
 mesh.userData.schoolyardOwnedMaterial = true
 mesh.userData.schoolyardPropTriangles = { solid: triCount(geo), outline: 0 }
 return mesh
}

// ── Jungle gym: classic 3×3×3-cell box frame in three bright colours ──
function buildJungleGym(gx, gz, C) {
 const b = createPropBuilder(), nodes = [-.72, -.24, .24, .72], levels = [.56, 1.1, 1.64], T = .065
 for (const dx of nodes) for (const dz of nodes) b.box([T, 1.66, T], [gx + dx, .83, gz + dz], C.gymPost, { t: .022 })
 for (const y of levels) for (const n of nodes) {
  b.box([1.5, T, T], [gx, y, gz + n], C.gymX, { t: .022 })
  b.box([T, T, 1.5], [gx + n, y + .001, gz], C.gymZ, { t: .022 })
 }
 return b.build('schoolyard-prop-jungle-gym')
}

// ── Bleachers: four stepped concrete tiers, coloured seat planks with aisle gaps, end and back rails ──
function buildGrandstand(halfX, C) {
 const b = createPropBuilder(), depth = .6, rise = .34, L = 24
 for (const side of [-1, 1]) {
  const inner = halfX + 1.5
  for (let tier = 0; tier < 4; tier++) {
   const cx = side * (inner + depth * (tier + .5)), h = rise * (tier + 1)
   b.box([depth, h, L], [cx, h / 2, 0], C.stone, { t: .04 })
   for (const [z0, z1] of [[-11.8, -4.35], [-3.65, 3.65], [4.35, 11.8]]) {
    b.box([.3, .07, z1 - z0], [cx - side * .08, h + .05, (z0 + z1) / 2], tier % 2 ? C.seatB : C.seatA, { t: .022 })
   }
  }
  const backX = side * (inner + depth * 4 - .06), topY = rise * 4
  for (const z of [-11.6, -3.9, 3.9, 11.6]) b.box([.06, .7, .06], [backX, topY + .35, z], C.rail, { t: .02 })
  b.box([.07, .07, 23.3], [backX, topY + .7, 0], C.rail, { t: .02 })
  for (const end of [-1, 1]) {
   const ez = end * 11.95, lowX = side * (inner + .1), lowY = rise + .7, highY = topY + .7
   b.box([.06, .7, .06], [lowX, rise + .35, ez], C.rail, { t: .02 })
   b.bar([lowX, lowY, ez], [backX, highY, ez], .07, C.rail, { t: .02 })
  }
 }
 return b.build('schoolyard-prop-grandstand')
}

export function createSchoolyardProps({ art, C, goals, halfX, halfZ }) {
 const group = new THREE.Group(); group.name = 'schoolyard-hand-built-props'
 const podiumZ = -halfZ - 1.8, flagZ = -halfZ - 1.5
 const flagColors = ['#2F5FA8', '#F2C94C', '#E04B4B']
 const poles = [-6.5, -8.0, -9.5].map((x) => ({ x, z: flagZ }))
 const props = {
  goals: buildGoals(goals, C),
  podium: buildPodium(podiumZ, halfZ, art, C),
  flagpoles: buildFlagpoles(poles, art, C),
  paHorns: buildPaHorns(halfZ, C),
  jungleGym: buildJungleGym(halfX + 2.5, halfZ - 4, C),
  grandstand: buildGrandstand(halfX, C),
 }
 const flags = createFlagMesh(poles.map(({ x, z }, i) => ({ x: x + .07, y: 5.0, z, color: flagColors[i], pattern: i + 1, phase: i * 1.9 })))
 props.flagpoles.add(flags)
 for (const id of SCHOOLYARD_PROP_IDS) group.add(props[id])
 const triangles = {}
 for (const id of SCHOOLYARD_PROP_IDS) {
  const t = { solid: 0, outline: 0 }
  props[id].traverse((node) => { const n = node.userData.schoolyardPropTriangles; if (n) { t.solid += n.solid; t.outline += n.outline } })
  triangles[id] = t
 }
 group.userData.schoolyardProps = props
 group.userData.propTriangles = triangles
 group.userData.flagUniforms = flags.userData.flagUniforms
 return group
}

export function animateSchoolyardProps(group, time, reducedMotion = false) {
 const uniforms = group?.userData.flagUniforms
 if (uniforms && !reducedMotion) uniforms.uFlagTime.value = time
}

export function disposeSchoolyardProps(group) {
 group?.traverse((node) => {
  if (node.userData.schoolyardOwnedGeometry) node.geometry?.dispose()
  if (node.userData.schoolyardOwnedMaterial) node.material?.dispose()
 })
}
