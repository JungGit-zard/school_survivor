// Rosari's bedroom as a handful of merged, vertex-coloured meshes.
//
// Every part is described once (prop id, colour, shape, transform, outline flag). The builder bakes the
// transforms and merges the parts into:
//   - one toon mesh (lit furniture, ARCHIVE gradient, vertex colours, not tone-mapped),
//   - one unlit mesh (floor/walls, glass, sky, flat decals: exact authored colours),
//   - one outline hull mesh (every outlined part, screen-space 2 px like Rosari),
//   - one contact-shadow mesh (dark footprints under the floor props).
// Draw calls stay at 4 no matter how many parts the room has.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ROSARI_ROOM_FURNITURE as F, ROSARI_ROOM_SHELL as SHELL } from './rosariRoom.js'

export const ROSARI_BEDROOM_COLORS = Object.freeze({
  // unlit shell
  floor: '#fcefdc', floorLip: '#f3dcc4', backWall: '#ffd6e6', leftWall: '#e9dbfb', rightWall: '#f3e1fd',
  // toon furniture
  baseboard: '#e9a3c4',
  wardrobeBody: '#e58fbb', wardrobeDoor: '#f2aecd', wardrobeCrown: '#c96d9f', cream: '#fff3da', plum: '#a8577f',
  headboard: '#c9679a', bedBase: '#dc7fae', blanket: '#fff0b5', sheet: '#fffaf0', pillowLilac: '#dcc6ff', pillowPink: '#ffd0e4', bow: '#e2559b',
  wood: '#f0bf78', woodLight: '#f7d39b', woodDark: '#d99a5b',
  radioBody: '#7fd3c0',
  mirrorFrame: '#b779cf', bookBlue: '#5fa8ec', bookYellow: '#ffc94d', vase: '#94d07a', stem: '#6fb85a', flower: '#ff86b5', flowerCenter: '#ffd86b',
  windowFrame: '#fffaf2', curtain: '#c497e8',
  artFrame: '#b779cf', canvas: '#fff7df',
  bear: '#f2c99a', muzzle: '#fff1dc', bunny: '#ffb8d6', face: '#3d2230', bunnyNose: '#e05c95',
  pouf: '#f59cc4', poufTop: '#ffc8de',
  // unlit details
  glassSky: '#bfe6ff', cloud: '#ffffff', mirrorGlass: '#d8f1ff', shine: '#ffffff', seam: '#8c4a7f',
  rug: '#ef8cbc', rugInner: '#f9b9d6', outline: '#050209', dotPink: '#ff8fbd', dotBlue: '#8fd0ff', dotYellow: '#ffd86b',
  dial: '#fff3da', needle: '#e8403f', grille: '#4a2c45',
})

const C = ROSARI_BEDROOM_COLORS
const RAD = Math.PI / 180

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h)
const cylinder = (top, bottom, height, segments = 12) => new THREE.CylinderGeometry(top, bottom, height, segments)
const disc = (r, segments = 16) => new THREE.CircleGeometry(r, segments)

function heartShape(size) {
  // Classic two-lobe heart, point toward -y, centred on the origin.
  const s = size / 2.2
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.55 * s)
  shape.bezierCurveTo(0, 0.95 * s, -0.55 * s, 1.15 * s, -0.85 * s, 0.85 * s)
  shape.bezierCurveTo(-1.15 * s, 0.55 * s, -1.05 * s, 0.05 * s, -0.7 * s, -0.3 * s)
  shape.bezierCurveTo(-0.45 * s, -0.55 * s, -0.15 * s, -0.8 * s, 0, -1.05 * s)
  shape.bezierCurveTo(0.15 * s, -0.8 * s, 0.45 * s, -0.55 * s, 0.7 * s, -0.3 * s)
  shape.bezierCurveTo(1.05 * s, 0.05 * s, 1.15 * s, 0.55 * s, 0.85 * s, 0.85 * s)
  shape.bezierCurveTo(0.55 * s, 1.15 * s, 0, 0.95 * s, 0, 0.55 * s)
  return shape
}

// Flat heart lying on the floor (extruded upward), point toward the camera (+z).
function floorHeart(size, thickness) {
  const geometry = new THREE.ExtrudeGeometry(heartShape(size), { depth: thickness, bevelEnabled: false, curveSegments: 6 })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// Tied-back curtain panel: full width under the rod, pinched at the tie, flared at the hem.
// side = -1 for the left panel (tied toward the left), +1 for the right one.
function curtainPanel(side) {
  const w = 0.36
  const shape = new THREE.Shape()
  const sx = (x) => (side < 0 ? x : -x)
  shape.moveTo(sx(0), 0)
  shape.lineTo(sx(w), 0)
  shape.quadraticCurveTo(sx(0.12), -0.3, sx(0.13), -0.62)
  shape.quadraticCurveTo(sx(0.16), -0.95, sx(0.27), -1.12)
  shape.lineTo(sx(0), -1.12)
  shape.lineTo(sx(0), 0)
  return new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 4 })
}

// Part list. Positions are in the prop's local frame; `at` is the prop's world origin.
// layer: 'toon' (lit, outlined unless outline:false), 'unlit' (exact colour), 'shadow' (contact shadow).
export function describeRosariBedroomParts() {
  const parts = []
  let at = [0, 0, 0]
  let prop = 'room'
  const add = (color, geometry, p = [0, 0, 0], { r = [0, 0, 0], s = [1, 1, 1], layer = 'toon', outline = layer !== 'shadow' } = {}) => {
    parts.push({ prop, color, geometry, position: [at[0] + p[0], at[1] + p[1], at[2] + p[2]], rotation: r, scale: s, layer, outline })
  }
  const decal = (color, geometry, p, options = {}) => add(color, geometry, p, { layer: 'unlit', outline: false, ...options })
  const flat = (color, geometry, p, options = {}) => add(color, geometry, p, { outline: false, ...options })
  const shadowRect = (x0, x1, z0, z1, grow = 0.06) => {
    for (const g of [0, grow]) {
      add('outline', new THREE.PlaneGeometry(x1 - x0 + g * 2, z1 - z0 + g * 2), [(x0 + x1) / 2, 0.012 + g * 0.002, (z0 + z1) / 2], { r: [-Math.PI / 2, 0, 0], layer: 'shadow' })
    }
  }
  const shadowEllipse = (x, z, rx, rz) => {
    for (const g of [0, 0.05]) add('outline', disc(1, 14), [x, 0.012 + g * 0.04, z], { r: [-Math.PI / 2, 0, 0], s: [rx + g, rz + g, 1], layer: 'shadow' })
  }

  // ---- room shell --------------------------------------------------------------------------------
  prop = 'room'
  const floorDepth = SHELL.frontZ + 3.15
  decal('floor', box(8.3, 0.08, floorDepth), [0, -0.03, (SHELL.frontZ - 3.15) / 2], { outline: true })
  decal('backWall', box(SHELL.sideX * 2, 3.05, 0.12), [0, 1.5, SHELL.backZ - 0.06], { outline: true })
  decal('leftWall', box(0.12, 3.05, 6.3), [-SHELL.sideX - 0.06, 1.5, 0], { outline: true })
  decal('rightWall', box(0.12, 3.05, 6.3), [SHELL.sideX + 0.06, 1.5, 0], { outline: true })
  // Baseboards stand 1.5 cm off the walls so their top edge gets an outline.
  add('baseboard', box(SHELL.sideX * 2 - 0.06, 0.14, 0.05), [0, 0.07, SHELL.backZ + 0.04])
  add('baseboard', box(0.05, 0.14, 6.05), [-SHELL.sideX + 0.04, 0.07, 0.125])
  add('baseboard', box(0.05, 0.14, 6.05), [SHELL.sideX - 0.04, 0.07, 0.125])

  // ---- wardrobe (against the back wall) -------------------------------------------------------------
  prop = 'wardrobe'
  at = [F.wardrobe.x, 0, F.wardrobe.z]
  add('wardrobeBody', box(1.35, 1.72, 0.7), [0, 0.94, 0])
  add('wardrobeCrown', box(1.48, 0.14, 0.74), [0, 1.86, 0.02])
  for (const x of [-0.58, 0.58]) for (const z of [-0.27, 0.27]) add('wardrobeCrown', box(0.12, 0.1, 0.12), [x, 0.05, z])
  add('wardrobeDoor', box(0.6, 1.5, 0.03), [-0.315, 0.96, 0.36])
  add('wardrobeDoor', box(0.6, 1.5, 0.03), [0.315, 0.96, 0.36])
  decal('seam', box(0.03, 1.5, 0.012), [0, 0.96, 0.36])
  add('cream', sphere(0.045, 10, 6), [-0.07, 0.98, 0.39])
  add('cream', sphere(0.045, 10, 6), [0.07, 0.98, 0.39])
  // a little heart on the crown
  flat('cream', new THREE.ExtrudeGeometry(heartShape(0.12), { depth: 0.012, bevelEnabled: false, curveSegments: 4 }), [0, 1.85, 0.39])
  shadowRect(-0.675, 0.675, -0.35, 0.35)

  // ---- bed (headboard against the back wall) -----------------------------------------------------
  prop = 'bed'
  at = [F.bed.x, 0, F.bed.z]
  add('headboard', box(2.18, 0.95, 0.16), [0, 0.475, -0.955])
  add('headboard', cylinder(0.45, 0.45, 0.16, 18), [0, 0.8, -0.955], { r: [Math.PI / 2, 0, 0] })
  add('cream', sphere(0.075, 10, 6), [-1.02, 0.99, -0.955])
  add('cream', sphere(0.075, 10, 6), [1.02, 0.99, -0.955])
  add('bedBase', box(2.0, 0.5, 1.75), [0, 0.25, 0])
  add('sheet', box(1.98, 0.08, 0.52), [0, 0.54, -0.6])
  add('blanket', box(2.06, 0.26, 1.32), [0, 0.59, 0.225])
  add('sheet', box(2.08, 0.05, 0.14), [0, 0.735, -0.37])
  add('pillowLilac', sphere(1, 14, 8), [-0.48, 0.66, -0.64], { s: [0.36, 0.1, 0.2] })
  add('pillowPink', sphere(1, 14, 8), [0.48, 0.66, -0.64], { s: [0.36, 0.1, 0.2] })
  // flat bow lying on the blanket: two lobes, knot and two tails
  add('bow', sphere(1, 12, 6), [-0.15, 0.735, 0.3], { r: [0, 0.35, 0], s: [0.16, 0.035, 0.09] })
  add('bow', sphere(1, 12, 6), [0.15, 0.735, 0.3], { r: [0, -0.35, 0], s: [0.16, 0.035, 0.09] })
  add('bow', box(0.05, 0.02, 0.2), [-0.06, 0.725, 0.42], { r: [0, -0.35, 0] })
  add('bow', box(0.05, 0.02, 0.2), [0.06, 0.725, 0.42], { r: [0, 0.35, 0] })
  add('bow', sphere(1, 10, 6), [0, 0.745, 0.3], { s: [0.06, 0.04, 0.06] })
  shadowRect(-1.0, 1.0, -1.03, 0.875)

  // ---- nightstand + retro radio --------------------------------------------------------------------
  prop = 'nightstand'
  at = [F.nightstand.x, 0, F.nightstand.z]
  add('wood', box(0.5, 0.44, 0.42), [0, 0.26, 0])
  add('woodDark', box(0.54, 0.04, 0.44), [0, 0.5, 0])
  for (const x of [-0.2, 0.2]) for (const z of [-0.16, 0.16]) add('woodDark', box(0.05, 0.06, 0.05), [x, 0.03, z])
  add('woodLight', box(0.4, 0.16, 0.02), [0, 0.3, 0.215])
  add('plum', sphere(0.03, 8, 6), [0, 0.3, 0.235])
  shadowRect(-0.25, 0.25, -0.21, 0.21)

  prop = 'radio'
  at = [F.nightstand.x, F.nightstand.top, F.nightstand.z - 0.02]
  add('radioBody', box(0.38, 0.2, 0.16), [0, 0.1, 0])
  add('cream', box(0.4, 0.03, 0.17), [0, 0.205, 0])
  add('cream', new THREE.TorusGeometry(0.066, 0.012, 6, 16), [-0.09, 0.095, 0.081])
  decal('grille', disc(0.058, 16), [-0.09, 0.095, 0.0815])
  decal('dial', box(0.13, 0.06, 0.01), [0.09, 0.135, 0.082])
  decal('needle', box(0.006, 0.05, 0.004), [0.07, 0.135, 0.089])
  add('plum', cylinder(0.022, 0.022, 0.025, 10), [0.05, 0.055, 0.088], { r: [Math.PI / 2, 0, 0] })
  add('plum', cylinder(0.022, 0.022, 0.025, 10), [0.13, 0.055, 0.088], { r: [Math.PI / 2, 0, 0] })
  add('plum', box(0.2, 0.022, 0.03), [0, 0.29, 0])
  add('plum', box(0.022, 0.08, 0.03), [-0.09, 0.25, 0])
  add('plum', box(0.022, 0.08, 0.03), [0.09, 0.25, 0])
  add('plum', cylinder(0.006, 0.006, 0.28, 6), [0.17, 0.33, -0.04], { r: [0, 0, -0.45] })
  add('bow', sphere(0.016, 8, 6), [0.232, 0.456, -0.04])

  // ---- vanity --------------------------------------------------------------------------------------
  prop = 'vanity'
  at = [F.vanity.x, 0, F.vanity.z]
  add('wood', box(1.28, 0.35, 0.55), [0, 0.45, 0])
  for (const x of [-0.56, 0.56]) for (const z of [-0.2, 0.2]) add('woodDark', box(0.09, 0.3, 0.09), [x, 0.15, z])
  add('woodLight', box(0.52, 0.22, 0.02), [-0.31, 0.45, 0.28])
  add('woodLight', box(0.52, 0.22, 0.02), [0.31, 0.45, 0.28])
  add('plum', sphere(0.03, 8, 6), [-0.31, 0.45, 0.3])
  add('plum', sphere(0.03, 8, 6), [0.31, 0.45, 0.3])
  // mirror: base block on the desk, ring standing in it, glass, shine, solid back
  add('mirrorFrame', box(0.36, 0.05, 0.16), [0, 0.648, -0.12])
  add('mirrorFrame', new THREE.TorusGeometry(0.36, 0.035, 8, 24), [0, 1.02, -0.12])
  decal('mirrorGlass', disc(0.335, 24), [0, 1.02, -0.116])
  decal('shine', box(0.05, 0.3, 0.002), [-0.1, 1.08, -0.113], { r: [0, 0, -0.6] })
  flat('mirrorFrame', disc(0.34, 20), [0, 1.02, -0.124], { r: [0, Math.PI, 0] })
  // books stacked on the desk top (y 0.625), inside its depth
  add('bookBlue', box(0.28, 0.06, 0.2), [-0.42, 0.652, 0.12], { r: [0, 0.25, 0] })
  add('bookYellow', box(0.26, 0.06, 0.2), [-0.4, 0.709, 0.12], { r: [0, -0.12, 0] })
  // vase with a flower
  add('vase', cylinder(0.055, 0.04, 0.2, 10), [0.42, 0.722, 0.1])
  add('stem', cylinder(0.008, 0.008, 0.12, 5), [0.42, 0.86, 0.1])
  add('flower', sphere(0.085, 10, 8), [0.42, 0.95, 0.1])
  add('flowerCenter', sphere(0.032, 8, 6), [0.42, 0.95, 0.172])
  shadowRect(-0.64, 0.64, -0.275, 0.275)

  // ---- pouf (front-left corner) --------------------------------------------------------------------
  prop = 'pouf'
  at = [F.pouf.x, 0, F.pouf.z]
  add('pouf', cylinder(F.pouf.radius, F.pouf.radius - 0.02, 0.3, 16), [0, 0.15, 0])
  add('poufTop', cylinder(F.pouf.radius - 0.03, F.pouf.radius, 0.06, 16), [0, 0.32, 0])
  add('bow', sphere(0.05, 8, 6), [0, 0.355, 0])
  shadowEllipse(0, 0, F.pouf.radius, F.pouf.radius)

  // ---- plush toys on the floor (front-right corner) -------------------------------------------------
  prop = 'plush'
  at = [F.plush.x, 0, F.plush.z]
  // teddy bear
  add('bear', sphere(0.17, 14, 10), [0, 0.16, 0])
  add('bear', sphere(0.15, 14, 10), [0, 0.42, 0.02])
  add('bear', sphere(0.055, 10, 6), [-0.11, 0.54, 0])
  add('bear', sphere(0.055, 10, 6), [0.11, 0.54, 0])
  add('bear', sphere(1, 10, 6), [-0.16, 0.2, 0.05], { s: [0.06, 0.09, 0.06] })
  add('bear', sphere(1, 10, 6), [0.16, 0.2, 0.05], { s: [0.06, 0.09, 0.06] })
  add('bear', sphere(1, 10, 6), [-0.08, 0.04, 0.13], { s: [0.07, 0.05, 0.08] })
  add('bear', sphere(1, 10, 6), [0.08, 0.04, 0.13], { s: [0.07, 0.05, 0.08] })
  add('muzzle', sphere(1, 10, 6), [0, 0.39, 0.155], { s: [0.065, 0.05, 0.04] })
  add('face', sphere(0.022, 8, 6), [0, 0.41, 0.192])
  add('face', sphere(0.02, 8, 6), [-0.055, 0.46, 0.15])
  add('face', sphere(0.02, 8, 6), [0.055, 0.46, 0.15])
  // neck ribbon: two small lobes and a knot (not one flat ellipse, which read as lips)
  add('bow', sphere(1, 8, 6), [-0.05, 0.3, 0.14], { r: [0, 0, 0.3], s: [0.045, 0.028, 0.025] })
  add('bow', sphere(1, 8, 6), [0.05, 0.3, 0.14], { r: [0, 0, -0.3], s: [0.045, 0.028, 0.025] })
  add('bow', sphere(0.018, 8, 6), [0, 0.3, 0.155])
  // bunny
  add('bunny', sphere(0.15, 14, 10), [-0.55, 0.14, 0.05])
  add('bunny', sphere(0.13, 14, 10), [-0.55, 0.38, 0.06])
  add('bunny', sphere(1, 10, 6), [-0.6, 0.56, 0.05], { r: [0, 0, 0.15], s: [0.045, 0.12, 0.03] })
  add('bunny', sphere(1, 10, 6), [-0.5, 0.56, 0.05], { r: [0, 0, -0.15], s: [0.045, 0.12, 0.03] })
  add('bunny', sphere(1, 10, 6), [-0.62, 0.035, 0.16], { s: [0.06, 0.04, 0.07] })
  add('bunny', sphere(1, 10, 6), [-0.48, 0.035, 0.16], { s: [0.06, 0.04, 0.07] })
  add('face', sphere(0.018, 8, 6), [-0.595, 0.4, 0.175])
  add('face', sphere(0.018, 8, 6), [-0.505, 0.4, 0.175])
  add('bunnyNose', sphere(0.016, 8, 6), [-0.55, 0.37, 0.188])
  shadowEllipse(0, 0.02, 0.21, 0.2)
  shadowEllipse(-0.55, 0.07, 0.17, 0.17)

  // ---- heart rug (walkable floor decal) ----------------------------------------------------------
  prop = 'rug'
  at = [F.rug.x, 0, F.rug.z]
  decal('rug', floorHeart(1.62, 0.008), [0, 0.009, -0.01])
  decal('rugInner', floorHeart(1.05, 0.002), [0, 0.017, -0.03])

  // ---- window on the back wall over the bed -------------------------------------------------------
  prop = 'window'
  const wz = SHELL.backZ
  at = [F.window.x, F.window.y, 0]
  decal('glassSky', box(1.2, 0.84, 0.02), [0, 0, wz - 0.005])
  decal('cloud', disc(0.09, 14), [-0.28, 0.16, wz + 0.006])
  decal('cloud', disc(0.12, 14), [-0.15, 0.2, wz + 0.006])
  decal('cloud', disc(0.08, 14), [-0.03, 0.15, wz + 0.006])
  decal('cloud', disc(0.07, 14), [0.3, -0.12, wz + 0.006])
  decal('cloud', disc(0.09, 14), [0.4, -0.09, wz + 0.006])
  add('windowFrame', box(1.34, 0.07, 0.06), [0, 0.455, wz + 0.025])
  add('windowFrame', box(1.34, 0.07, 0.06), [0, -0.455, wz + 0.025])
  add('windowFrame', box(0.07, 0.98, 0.06), [-0.635, 0, wz + 0.025])
  add('windowFrame', box(0.07, 0.98, 0.06), [0.635, 0, wz + 0.025])
  add('windowFrame', box(0.04, 0.84, 0.03), [0, 0, wz + 0.012])
  add('windowFrame', box(1.2, 0.04, 0.03), [0, 0, wz + 0.012])
  add('wood', box(1.48, 0.06, 0.16), [0, -0.5, wz + 0.07])
  // rod, finials, curtains tied back to the sides
  add('plum', cylinder(0.018, 0.018, 1.86, 8), [0, 0.6, wz + 0.07], { r: [0, 0, Math.PI / 2] })
  add('plum', sphere(0.04, 8, 6), [-0.95, 0.6, wz + 0.07])
  add('plum', sphere(0.04, 8, 6), [0.95, 0.6, wz + 0.07])
  add('curtain', curtainPanel(-1), [-0.88, 0.6, wz + 0.03])
  add('curtain', curtainPanel(1), [0.88, 0.6, wz + 0.03])
  add('bow', box(0.15, 0.05, 0.08), [-0.815, -0.02, wz + 0.09])
  add('bow', box(0.15, 0.05, 0.08), [0.815, -0.02, wz + 0.09])

  // ---- framed picture ----------------------------------------------------------------------------
  prop = 'art'
  at = [F.art.x, F.art.y, 0]
  add('artFrame', box(0.92, 0.66, 0.05), [0, 0, wz + 0.03])
  flat('canvas', box(0.76, 0.5, 0.02), [0, 0, wz + 0.06])
  decal('dotYellow', disc(0.07, 14), [0.24, 0.13, wz + 0.0705])
  decal('dotPink', disc(0.12, 16), [-0.16, -0.05, wz + 0.0705])
  decal('dotBlue', disc(0.15, 16), [0.12, -0.08, wz + 0.071])

  return parts
}

function bakePart(part) {
  const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...part.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),
    new THREE.Vector3(...part.scale),
  )
  geometry.applyMatrix4(matrix)
  geometry.deleteAttribute('uv')
  geometry.clearGroups()
  return geometry
}

function colorize(geometry, hex) {
  const color = new THREE.Color(hex)
  const count = geometry.attributes.position.count
  const array = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    array[i * 3] = color.r
    array[i * 3 + 1] = color.g
    array[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(array, 3))
  return geometry
}

// Per-part bounds in world space (used by the collider/footprint tests).
export function measureRosariBedroomParts(parts = describeRosariBedroomParts()) {
  return parts.map((part) => {
    const geometry = bakePart(part)
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox.clone()
    geometry.dispose()
    return { ...part, bounds }
  })
}

/**
 * Build the bedroom meshes.
 * @param {{ gradientMap: THREE.Texture, hullMaterial: THREE.Material, weldOutlineNormals: (g: THREE.BufferGeometry) => THREE.BufferGeometry }} deps
 */
export function buildRosariBedroom({ gradientMap, hullMaterial, weldOutlineNormals }) {
  const parts = describeRosariBedroomParts()
  const layers = { toon: [], unlit: [], shadow: [] }
  const hulls = []
  for (const part of parts) {
    const baked = bakePart(part)
    if (part.outline) {
      hulls.push(weldOutlineNormals(baked.clone()))
    }
    layers[part.layer].push(colorize(baked, C[part.color]))
    part.geometry.dispose()
  }
  const merge = (list) => {
    const merged = mergeGeometries(list, false)
    for (const geometry of list) geometry.dispose()
    return merged
  }
  const group = new THREE.Group()
  group.name = 'rosari_bedroom'
  const materials = [
    new THREE.MeshToonMaterial({ name: 'rosari_bedroom_toon', vertexColors: true, gradientMap, toneMapped: false }),
    new THREE.MeshBasicMaterial({ name: 'rosari_bedroom_unlit', vertexColors: true, toneMapped: false }),
    new THREE.MeshBasicMaterial({ name: 'rosari_bedroom_shadow', color: '#4a2142', transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false }),
  ]
  const meshes = [
    new THREE.Mesh(merge(layers.toon), materials[0]),
    new THREE.Mesh(merge(layers.unlit), materials[1]),
    new THREE.Mesh(merge(layers.shadow), materials[2]),
    new THREE.Mesh(merge(hulls), hullMaterial),
  ]
  meshes[0].name = 'rosari_bedroom_toon'
  meshes[1].name = 'rosari_bedroom_unlit'
  meshes[2].name = 'rosari_bedroom_shadows'
  meshes[2].renderOrder = 1
  meshes[3].name = 'rosari_bedroom_outline'
  meshes[3].userData.isOutline = true
  meshes[3].frustumCulled = false
  for (const mesh of meshes) {
    mesh.matrixAutoUpdate = false
    group.add(mesh)
  }
  const dispose = () => {
    for (const mesh of meshes) mesh.geometry.dispose()
    for (const material of materials) material.dispose()
    hullMaterial.dispose()
  }
  return { group, parts, hullMaterial, dispose }
}
