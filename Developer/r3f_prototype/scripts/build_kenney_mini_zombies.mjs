// Bake Kenney "Mini Characters 2.0" (CC0) into ONE meshopt GLB for the 18 novel-2 zombies (E89~E106). 2026-11-15, threemini.
//
// Same toolchain as the KayKit furniture GLB: @gltf-transform 4.5.1 (core/functions/extensions) + meshoptimizer
// (EXT_meshopt_compression + KHR_mesh_quantization), sharp for the PNG. Reads the pack as DATA only (GLB/PNG parsing),
// never executes anything from it. The roster module (src/lib/miniZombieRoster.js) is the single source for
// which bodies/props go in and for the palette slot colours painted into the atlas.
//
// Output GLB layout
//   body__<body>__<part>   rigid part of a skinned Kenney body (rigid weights verified: every vertex has one joint at 1.0)
//                          positions in MODEL space (bind pose = rest pose; inverse binds are pure translations),
//                          extras.mini = { body, part, parent: 'root'|'torso', pivot: [x,y,z] model-space joint, skinCell }
//   body__textbook__<part> procedural textbook mimic (torso = bottom cover + pages, head = hinged top cover + teeth + eyes)
//   prop__<id>             props in their own local frame (origin = attach point), extras.mini = { prop }
//   one material "mini_zombie_colormap" + one embedded 512x512 PNG (Kenney colormap, Kenney cells desaturated, custom
//   slots painted into the unused row-0 / row-1 cols 10..15 area)
//   (all of the above are merged into ONE node / ONE primitive with a uint8 _PART attribute; the names/extras above live in
//   the node extras table mini.parts — see lib/miniZombieGeometry.js readMiniZombieScene)
//
// Toolchain is NOT in package.json: point --tool at an `npx @gltf-transform/cli@4` cache node_modules (it brings
// @gltf-transform/*, meshoptimizer and sharp). Re-run, then re-check PROVENANCE.json sha/bytes (src/assets/models/kenney_mini).
//
// usage (from Developer/r3f_prototype):
//   node scripts/build_kenney_mini_zombies.mjs --tool <node_modules with @gltf-transform, meshoptimizer, sharp>
//     --pack "<...>/Models/GLB format" --roster src/lib/miniZombieRoster.js --out src/assets/models/kenney_mini/mini_zombies_kenney.glb
//     [--stats <...>/bake_stats.json] [--raw <...>/uncompressed.glb] [--desaturate 0.2]
//     [--normals on] (default off: normals dropped + vertices welded; the runtime rebuilds FLAT normals like the blocky
//     layer does — 252 KB -> 95 KB) [--qpos 14] [--qtex 8] (UVs all sit at palette-cell centres, 8 bits is ±1 px)
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => (arg.startsWith('--') ? [...acc, [arg.slice(2), all[i + 1]]] : acc), []))
for (const key of ['tool', 'pack', 'roster', 'out']) if (!args[key]) throw new Error(`missing --${key}`)
const req = createRequire(join(resolve(args.tool), 'noop.cjs'))
const { NodeIO, Document } = req('@gltf-transform/core')
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions')
const { meshopt, prune, dedup, weld } = req('@gltf-transform/functions')
const { MeshoptEncoder, MeshoptDecoder } = req('meshoptimizer')
const sharp = req('sharp')
const roster = await import(pathToFileURL(resolve(args.roster)).href)
const {
  MINI_BODY_IDS, MINI_PACK_PROPS, MINI_PROP_IDS, MINI_JOINT_TO_PART, MINI_PALETTE, MINI_PALETTE_SLOTS,
  miniPaletteSlotRect, miniPaletteKeyAt, miniRemapUv, MINI_ZOMBIE_VISUALS,
} = roster
const DESAT = Number(args.desaturate ?? 0.2)

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// ── bodies/props actually referenced by the roster ──────────────────────────────
const usedBodies = new Set(); const usedProps = new Set()
for (const visual of Object.values(MINI_ZOMBIE_VISUALS)) {
  for (const variant of visual.variants) {
    usedBodies.add(variant.body)
    for (const p of [...(variant.props ?? []), ...(variant.loose ?? [])]) usedProps.add(p.prop)
  }
}
for (const body of usedBodies) if (body !== 'textbook' && !MINI_BODY_IDS.includes(body)) throw new Error(`roster body ${body} not in MINI_BODY_IDS`)
for (const prop of usedProps) if (!MINI_PROP_IDS.includes(prop)) throw new Error(`roster prop ${prop} not in MINI_PROP_IDS`)

// ── palette ────────────────────────────────────────────────────────────────────
const colormapPath = join(args.pack, 'Textures', 'colormap.png')
const colormapBytes = readFileSync(colormapPath)
const { data: px, info } = await sharp(colormapBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
if (info.width !== MINI_PALETTE.size || info.height !== MINI_PALETTE.size) throw new Error(`colormap is ${info.width}x${info.height}`)
const W = info.width
function isSlotArea(x, y) { return y < 128 || (y < 256 && x >= 320) }
// 1) Kenney cells: desaturate toward luminance (same intent as the blocky atlas "채도 −30%"; milder because the
//    Kenney palette is pastel). Slot area is checked to be unused (black) first.
for (let y = 0; y < W; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4
    if (isSlotArea(x, y)) {
      if (px[i] + px[i + 1] + px[i + 2] > 6) throw new Error(`slot area not empty at ${x},${y}`)
      continue
    }
    const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    for (let k = 0; k < 3; k += 1) px[i + k] = Math.round(px[i + k] + (l - px[i + k]) * DESAT)
  }
}
// 2) custom slots: vertical gradient like Kenney's odd columns (top lighter, bottom darker).
for (let s = 0; s < MINI_PALETTE_SLOTS.length; s += 1) {
  const [, hex] = MINI_PALETTE_SLOTS[s]
  const r = miniPaletteSlotRect(s)
  const base = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
  for (let y = 0; y < r.height; y += 1) {
    const t = y / (r.height - 1)
    const k = 1.07 - 0.25 * t
    for (let x = 0; x < r.width; x += 1) {
      const i = ((r.y + y) * W + r.x + x) * 4
      for (let c = 0; c < 3; c += 1) px[i + c] = Math.max(0, Math.min(255, Math.round(base[c] * k)))
      px[i + 3] = 255
    }
  }
}
const atlasPng = await sharp(px, { raw: { width: W, height: W, channels: 4 } }).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()

// ── output document ─────────────────────────────────────────────────────────────
const out = new Document()
const buffer = out.createBuffer('mini')
const texture = out.createTexture('mini_zombie_colormap').setImage(atlasPng).setMimeType('image/png')
const material = out.createMaterial('mini_zombie_colormap').setBaseColorTexture(texture).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(false)
const scene = out.createScene('mini_zombies')
const stats = { nodes: [], bodies: {}, props: {} }

// Everything goes into ONE primitive (one node) with a per-vertex part id (_PART, uint8). One accessor set compresses
// far better with meshopt than 100+ tiny meshes (first try: 109 nodes -> 419 KB, 167 KB of it JSON). The part table
// (names, pivots, parents, skin cells) rides in the node extras; the runtime splits by _PART once at load.
const merged = { position: [], normal: [], uv: [], part: [], index: [] }
const partTable = []
function addMesh(name, { position, normal, uv, index }, extras) {
  const id = partTable.length
  if (id > 255) throw new Error('more than 256 parts')
  const base = merged.position.length / 3
  merged.position.push(...position); merged.normal.push(...normal); merged.uv.push(...uv)
  for (let i = 0; i < position.length / 3; i += 1) merged.part.push(id)
  for (const i of index) merged.index.push(base + i)
  partTable.push({ id, name, ...extras })
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < position.length; i += 1) { const a = i % 3; min[a] = Math.min(min[a], position[i]); max[a] = Math.max(max[a], position[i]) }
  stats.nodes.push({ id, name, verts: position.length / 3, tris: index.length / 3, min: min.map((v) => +v.toFixed(4)), max: max.map((v) => +v.toFixed(4)) })
}
function flushMerged() {
  const acc = (type, array) => out.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  const prim = out.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', Float32Array.from(merged.position)))
    .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(merged.uv)))
    .setAttribute('_PART', acc('SCALAR', Uint8Array.from(merged.part)))
    .setIndices(acc('SCALAR', (merged.position.length / 3 > 65535 ? Uint32Array : Uint16Array).from(merged.index)))
    .setMaterial(material)
  if (args.normals === 'on') prim.setAttribute('NORMAL', acc('VEC3', Float32Array.from(merged.normal)))
  const mesh = out.createMesh('mini_zombies').addPrimitive(prim)
  scene.addChild(out.createNode('mini_zombies').setMesh(mesh).setExtras({ mini: { version: 1, parts: partTable } }))
}

// ── Kenney bodies: split rigid skin by joint ────────────────────────────────────
for (const body of [...usedBodies].filter((b) => b !== 'textbook').sort()) {
  const doc = await io.read(join(args.pack, `character-${body}.glb`))
  const skin = doc.getRoot().listSkins()[0]
  const joints = skin.listJoints()
  const jointNames = joints.map((j) => j.getName())
  const pivots = Object.fromEntries(joints.map((j) => [j.getName(), j.getWorldTranslation()]))
  const parts = Object.fromEntries(Object.values(MINI_JOINT_TO_PART).map((key) => [key, { position: [], normal: [], uv: [], index: [] }]))
  let softVerts = 0; let mixedTris = 0
  const headComponents = []
  for (const node of doc.getRoot().listNodes().filter((n) => n.getMesh())) {
    for (const prim of node.getMesh().listPrimitives()) {
      const P = prim.getAttribute('POSITION').getArray(); const N = prim.getAttribute('NORMAL').getArray()
      const UV = prim.getAttribute('TEXCOORD_0').getArray(); const I = prim.getIndices().getArray()
      const J = prim.getAttribute('JOINTS_0').getArray(); const Wt = prim.getAttribute('WEIGHTS_0').getArray()
      const n = P.length / 3
      const partOf = new Array(n)
      for (let i = 0; i < n; i += 1) {
        let best = 0; let bw = -1
        for (let c = 0; c < 4; c += 1) if (Wt[i * 4 + c] > bw) { bw = Wt[i * 4 + c]; best = J[i * 4 + c] }
        if (bw < 0.999) softVerts += 1
        const key = MINI_JOINT_TO_PART[jointNames[best]]
        if (!key) throw new Error(`${body}: vertex on joint ${jointNames[best]}`)
        partOf[i] = key
      }
      // connected components (index-shared + same-position) for face-feature detection
      const parent = Int32Array.from({ length: n }, (_, i) => i)
      const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] } return a }
      for (let t = 0; t < I.length; t += 3) { const a = find(I[t]); parent[find(I[t + 1])] = a; parent[find(I[t + 2])] = a }
      const byPos = new Map()
      for (let i = 0; i < n; i += 1) { const k = `${P[i * 3].toFixed(4)},${P[i * 3 + 1].toFixed(4)},${P[i * 3 + 2].toFixed(4)}`; if (byPos.has(k)) parent[find(i)] = find(byPos.get(k)); else byPos.set(k, i) }
      const comp = new Map()
      for (let i = 0; i < n; i += 1) {
        if (partOf[i] !== 'head') continue
        const r = find(i); const c = comp.get(r) ?? { verts: [], keys: new Set(), min: [9, 9, 9], max: [-9, -9, -9] }
        c.verts.push(i); c.keys.add(miniPaletteKeyAt(UV[i * 2], UV[i * 2 + 1]))
        for (let a = 0; a < 3; a += 1) { c.min[a] = Math.min(c.min[a], P[i * 3 + a]); c.max[a] = Math.max(c.max[a], P[i * 3 + a]) }
        comp.set(r, c)
      }
      // face features = small flat pieces on the head front plane inside the face area: eyes (upper pair) and mouth (lower).
      // Kenney draws them in r3c7 (dark) except the zombie (yellow r3c1 eyes, r2c5 teeth) and female-f (r1c5 lashes).
      // Eyes: every vertex goes to the 'eye' slot. Mouth: only the component's majority cell goes to 'mouth' (teeth stay).
      const uvOut = Float32Array.from(UV)
      for (const c of comp.values()) {
        headComponents.push(c)
        const flatFront = c.max[2] - c.min[2] < 2e-3 && c.min[2] > 0.15
        const inFace = Math.max(Math.abs(c.min[0]), Math.abs(c.max[0])) < 0.13 && c.min[1] > 0.37 && c.max[1] < 0.53
        if (!(flatFront && inFace && c.verts.length <= 24)) continue
        const slot = (c.min[1] + c.max[1]) / 2 > 0.445 ? 'eye' : 'mouth'
        c.feature = slot
        const counts = {}
        for (const i of c.verts) { const k = miniPaletteKeyAt(UV[i * 2], UV[i * 2 + 1]); counts[k] = (counts[k] ?? 0) + 1 }
        const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        for (const i of c.verts) {
          if (slot === 'mouth' && miniPaletteKeyAt(UV[i * 2], UV[i * 2 + 1]) !== majority) continue
          const [u, v] = miniRemapUv(UV[i * 2], UV[i * 2 + 1], slot); uvOut[i * 2] = u; uvOut[i * 2 + 1] = v
        }
      }
      // emit per-part geometry (remapped vertex indices)
      const remap = new Int32Array(n).fill(-1)
      for (let t = 0; t < I.length; t += 3) {
        const key = partOf[I[t]]
        if (partOf[I[t + 1]] !== key || partOf[I[t + 2]] !== key) mixedTris += 1
        const part = parts[key]
        for (let k = 0; k < 3; k += 1) {
          const i = I[t + k]
          if (remap[i] < 0 || parts[partOf[i]] !== part) {
            remap[i] = part.position.length / 3
            part.position.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])
            part.normal.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2])
            part.uv.push(uvOut[i * 2], uvOut[i * 2 + 1])
          }
          part.index.push(remap[i])
        }
      }
    }
  }
  if (softVerts || mixedTris) throw new Error(`${body}: ${softVerts} soft-weighted vertices, ${mixedTris} triangles span parts — rigid split invalid`)
  const features = headComponents.filter((c) => c.feature)
  const eyes = features.filter((c) => c.feature === 'eye').length; const mouths = features.filter((c) => c.feature === 'mouth').length
  // skin = cell of the head-cube component (bbox ≈ x ±0.16, y 0.343..0.661)
  const cube = [-0.16, 0.343, -0.162, 0.16, 0.661, 0.158]
  const scored = headComponents.map((c) => ({ c, d: Math.abs(c.min[0] - cube[0]) + Math.abs(c.min[1] - cube[1]) + Math.abs(c.min[2] - cube[2]) + Math.abs(c.max[0] - cube[3]) + Math.abs(c.max[1] - cube[4]) + Math.abs(c.max[2] - cube[5]) }))
    .sort((a, b) => a.d - b.d)
  const skinComp = scored[0]
  if (!skinComp || skinComp.d > 0.03 || skinComp.c.keys.size !== 1) throw new Error(`${body}: head cube not found (d=${skinComp?.d})`)
  const skinCell = [...skinComp.c.keys][0]
  const torsoPivot = pivots.torso
  for (const [joint, key] of Object.entries(MINI_JOINT_TO_PART)) {
    const parentKey = ['armL', 'armR', 'head'].includes(key) ? 'torso' : 'root'
    addMesh(`body__${body}__${key}`, parts[key], { body, part: key, parent: parentKey, pivot: pivots[joint].map((v) => +v.toFixed(6)), skinCell })
  }
  stats.bodies[body] = { skinCell, eyes, mouths, torsoPivot: torsoPivot.map((v) => +v.toFixed(4)), tris: Object.values(parts).reduce((t, p) => t + p.index.length / 3, 0), sha256: sha256(readFileSync(join(args.pack, `character-${body}.glb`))) }
  if (eyes !== 2 || mouths !== 1) console.warn(`WARN ${body}: face features eyes=${eyes} mouths=${mouths}`)
}

// ── procedural geometry helpers (blocky, Kenney-like) ───────────────────────────
function slotUv(slot, t) { // t 0 = top of gradient (light), 1 = bottom (dark)
  const r = miniPaletteSlotRect(slot); if (!r) throw new Error(`unknown slot ${slot}`)
  return [(r.x + r.width / 2) / MINI_PALETTE.size, (r.y + r.height * (0.12 + 0.76 * t)) / MINI_PALETTE.size]
}
function euler([x = 0, y = 0, z = 0] = []) { // three.js XYZ order rotation matrix (row-major 3x3)
  const a = Math.cos(x); const b = Math.sin(x); const c = Math.cos(y); const d = Math.sin(y); const e = Math.cos(z); const f = Math.sin(z)
  const ae = a * e; const af = a * f; const be = b * e; const bf = b * f
  return [c * e, -c * f, d, af + be * d, ae - bf * d, -b * c, bf - ae * d, be + af * d, a * c]
}
const mul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]
function createBuilder() {
  const g = { position: [], normal: [], uv: [], index: [] }
  function quad(corners, nrm, slot, ys) {
    const base = g.position.length / 3
    const span = Math.max(1e-6, ys[1] - ys[0])
    for (const p of corners) {
      g.position.push(...p); g.normal.push(...nrm)
      g.uv.push(...slotUv(slot, 1 - (p[1] - ys[0]) / span))
    }
    g.index.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return {
    g,
    // axis-aligned box min..max, then rotated (XYZ euler) about `pivot` and translated by `at`
    box(min, max, slot, { rot, pivot = [0, 0, 0], at = [0, 0, 0] } = {}) {
      const R = euler(rot)
      const tf = (p) => { const q = mul(R, [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]]); return [q[0] + pivot[0] + at[0], q[1] + pivot[1] + at[1], q[2] + pivot[2] + at[2]] }
      const [x0, y0, z0] = min; const [x1, y1, z1] = max
      const faces = [
        [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
      ]
      const normals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
      const ys = [y0 + at[1], y1 + at[1]]
      faces.forEach((f, k) => {
        const pts = f.map(tf)
        const ty = pts.map((p) => p[1]); const yr = [Math.min(...ty, ys[0]), Math.max(...ty, ys[1])]
        quad(pts, mul(R, normals[k]), slot, yr)
      })
    },
    // n-sided prism along Y (radius r, y0..y1), flat-shaded, then rotated/translated
    prism(r, y0, y1, sides, slot, { rot, at = [0, 0, 0], capSlot } = {}) {
      const R = euler(rot)
      const tf = (p) => { const q = mul(R, p); return [q[0] + at[0], q[1] + at[1], q[2] + at[2]] }
      const ring = (y) => Array.from({ length: sides }, (_, i) => { const a = (i / sides) * Math.PI * 2 + Math.PI / sides; return [Math.cos(a) * r, y, Math.sin(a) * r] })
      const lo = ring(y0); const hi = ring(y1)
      for (let i = 0; i < sides; i += 1) {
        const j = (i + 1) % sides
        const mid = (i + 0.5) / sides * Math.PI * 2 + Math.PI / sides
        quad([lo[j], lo[i], hi[i], hi[j]].map(tf), mul(R, [Math.cos(mid), 0, Math.sin(mid)]), slot, [y0 + at[1], y1 + at[1]])
      }
      for (const [y, ny, pts] of [[y1, 1, hi], [y0, -1, lo]]) {
        const base = g.position.length / 3
        const c = tf([0, y, 0])
        g.position.push(...c); g.normal.push(...mul(R, [0, ny, 0])); g.uv.push(...slotUv(capSlot ?? slot, ny > 0 ? 0.1 : 0.9))
        for (const p of pts) { g.position.push(...tf(p)); g.normal.push(...mul(R, [0, ny, 0])); g.uv.push(...slotUv(capSlot ?? slot, ny > 0 ? 0.1 : 0.9)) }
        for (let i = 0; i < sides; i += 1) { const a = base + 1 + i; const b = base + 1 + ((i + 1) % sides); if (ny > 0) g.index.push(base, b, a); else g.index.push(base, a, b) }
      }
    },
    // low-poly sphere (lat x lon), flat-shaded; bands = [[latFrom, latTo, slot]] recolour latitude rings
    sphere(r, centre, slot, { lat = 6, lon = 8, bands = [] } = {}) {
      const pt = (i, j) => { const th = (i / lat) * Math.PI; const ph = (j / lon) * Math.PI * 2; return [centre[0] + r * Math.sin(th) * Math.cos(ph), centre[1] + r * Math.cos(th), centre[2] + r * Math.sin(th) * Math.sin(ph)] }
      for (let i = 0; i < lat; i += 1) {
        const band = bands.find(([a, b]) => i >= a && i < b)
        for (let j = 0; j < lon; j += 1) {
          const p00 = pt(i, j); const p01 = pt(i, j + 1); const p10 = pt(i + 1, j); const p11 = pt(i + 1, j + 1)
          const c = [(p00[0] + p11[0]) / 2 - centre[0], (p00[1] + p11[1]) / 2 - centre[1], (p00[2] + p11[2]) / 2 - centre[2]]
          const l = Math.hypot(...c) || 1
          const corners = i === 0 ? [p00, p11, p10, p10] : i === lat - 1 ? [p00, p01, p10, p10] : [p00, p01, p11, p10]
          const base = g.position.length / 3
          for (const p of corners) { g.position.push(...p); g.normal.push(c[0] / l, c[1] / l, c[2] / l); g.uv.push(...slotUv(band ? band[2] : slot, 1 - (p[1] - (centre[1] - r)) / (2 * r))) }
          g.index.push(base, base + 1, base + 2)
          if (i !== 0 && i !== lat - 1) g.index.push(base, base + 2, base + 3)
        }
      }
    },
    ring(inner, thickness, height, y, slot, { axis = 'y', at = [0, 0, 0] } = {}) { // square ring around an axis (band / armband)
      const [hx, hz] = Array.isArray(inner) ? inner : [inner, inner]
      const o = thickness
      const rot = axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]
      const self = this
      const parts = [
        [[hx, y - height / 2, -hz - o], [hx + o, y + height / 2, hz + o]], [[-hx - o, y - height / 2, -hz - o], [-hx, y + height / 2, hz + o]],
        [[-hx, y - height / 2, hz], [hx, y + height / 2, hz + o]], [[-hx, y - height / 2, -hz - o], [hx, y + height / 2, -hz]],
      ]
      for (const [mn, mx] of parts) self.box(mn, mx, slot, { rot, at })
    },
  }
}

// ── procedural textbook mimic body ──────────────────────────────────────────────
{
  const torso = createBuilder()
  torso.box([-0.17, 0, -0.125], [0.17, 0.024, 0.125], 'bookBlue') // bottom cover
  torso.box([-0.16, 0.024, -0.118], [0.16, 0.07, 0.11], 'pagesWhite') // page block
  torso.box([-0.16, 0.028, 0.11], [0.16, 0.066, 0.118], 'armRed') // red page edge (the clue)
  torso.box([-0.17, 0, -0.135], [0.17, 0.094, -0.125], 'bookBlue') // spine
  const head = createBuilder()
  head.box([-0.17, 0.07, -0.125], [0.17, 0.094, 0.125], 'bookBlue') // top cover (hinged at the spine)
  for (let k = 0; k < 6; k += 1) { const x = -0.125 + k * 0.05; head.box([x - 0.016, 0.046, 0.088], [x + 0.016, 0.07, 0.112], 'teeth', { rot: [0, 0, 0] }) }
  // eyes sit on the page block UNDER the lid: hidden while closed (dormant = looks like a real textbook), they show on
  // the 3-second lid peek (design "blink" clue) and when the lid opens to bite
  torso.box([-0.095, 0.0702, 0.035], [-0.035, 0.073, 0.085], 'eye') // inside the closed lid's volume (lid y 0.07..0.094)
  torso.box([0.035, 0.0702, 0.035], [0.095, 0.073, 0.085], 'eye')
  torso.box([-0.072, 0.0702, 0.05], [-0.058, 0.0735, 0.07], 'eyeDark')
  torso.box([0.058, 0.0702, 0.05], [0.072, 0.0735, 0.07], 'eyeDark')
  addMesh('body__textbook__torso', torso.g, { body: 'textbook', part: 'torso', parent: 'root', pivot: [0, 0, 0], skinCell: null })
  addMesh('body__textbook__head', head.g, { body: 'textbook', part: 'head', parent: 'torso', pivot: [0, 0.07, -0.125], skinCell: null })
  stats.bodies.textbook = { procedural: true, tris: (torso.g.index.length + head.g.index.length) / 3 }
}

// ── props ───────────────────────────────────────────────────────────────────────
const PROP_BUILDERS = {
  // ring around the arm axis (X in bind pose); arm sleeve cross-section ≈ 0.11 (y) × 0.13 (z)
  armband(b) { b.ring([0.062, 0.072], 0.014, 0.045, 0, 'armRed', { axis: 'x' }) },
  whistle(b) { b.box([-0.018, -0.015, 0], [0.018, 0.015, 0.06], 'silver'); b.box([-0.01, -0.02, 0.06], [0.01, 0.02, 0.07], 'silver'); b.box([-0.012, 0.015, 0.01], [0.012, 0.03, 0.03], 'conductorGold') },
  // held at the chest: stick goes forward-down to the floor (torso pivot 0.176 above floor; chest anchor ≈ 0.08 above pivot)
  mop(b) {
    const rot = [-Math.PI * 0.27, 0, 0]
    b.box([-0.013, -0.36, -0.013], [0.013, 0.06, 0.013], 'woodBrown', { rot, at: [0.02, 0, 0.06] })
    const tip = mul(euler(rot), [0, -0.36, 0])
    b.box([-0.11, -0.03, -0.045], [0.11, 0.012, 0.045], 'mopHead', { at: [0.02 + tip[0], tip[1], 0.06 + tip[2]] })
    for (let k = 0; k < 7; k += 1) b.box([-0.1 + k * 0.032, -0.05, -0.04], [-0.084 + k * 0.032, -0.03, 0.04], 'mopHead', { at: [0.02 + tip[0], tip[1], 0.06 + tip[2]] })
  },
  basketball(b) { b.sphere(0.075, [0, 0.075, 0], 'ballOrange', { lat: 6, lon: 8, bands: [[3, 4, 'ballLine']] }) },
  potLid(b) { b.prism(0.2, 0, 0.03, 8, 'lidGrey'); b.box([-0.03, 0.03, -0.03], [0.03, 0.07, 0.03], 'lidDark'); b.box([0.2, 0.0, -0.04], [0.25, 0.025, 0.04], 'lidDark'); b.box([-0.25, 0.0, -0.04], [-0.2, 0.025, 0.04], 'lidDark') },
  bib(b) { b.box([-0.11, -0.13, 0], [0.11, 0.01, 0.014], 'bibWhite'); b.box([-0.11, -0.13, 0.014], [0.11, -0.115, 0.018], 'armRed'); b.box([-0.03, -0.06, 0.014], [0.03, -0.03, 0.02], 'armRed') },
  spoon(b) { b.box([-0.012, -0.03, -0.008], [0.012, 0.13, 0.008], 'silver'); b.box([-0.035, 0.13, -0.045], [0.035, 0.155, 0.035], 'silver') },
  copierHead(b) {
    b.box([-0.25, -0.18, -0.2], [0.25, 0.18, 0.2], 'copierGrey')
    b.box([-0.23, 0.18, -0.18], [0.23, 0.21, 0.18], 'lidDark') // scanner lid
    b.box([-0.17, 0.02, 0.2], [-0.05, 0.08, 0.208], 'eye') // two "eyes" = status lights (take the variant eye colour)
    b.box([0.05, 0.02, 0.2], [0.17, 0.08, 0.208], 'eye')
    b.box([-0.2, -0.1, 0.2], [0.2, -0.07, 0.208], 'mouth') // paper slot
    b.box([0.25, -0.12, -0.12], [0.33, -0.1, 0.12], 'pagesWhite') // paper tray
  },
  officeChair(b) {
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2
      b.box([0, 0.012, -0.012], [0.15, 0.032, 0.012], 'chairBlack', { rot: [0, a, 0] })
      b.box([0.13, 0, -0.022], [0.17, 0.03, 0.022], 'shadowBlack', { rot: [0, a, 0] })
    }
    b.box([-0.018, 0.03, -0.018], [0.018, 0.12, 0.018], 'silver')
    b.box([-0.14, 0.12, -0.13], [0.14, 0.155, 0.12], 'chairBlack')
    b.box([-0.13, 0.155, -0.16], [0.13, 0.4, -0.125], 'chairBlack')
  },
  coffeePot(b) {
    b.box([-0.012, -0.03, -0.012], [0.012, 0.0, 0.05], 'coffeeDark') // grip
    b.box([-0.055, -0.15, 0.03], [0.055, -0.03, 0.14], 'coffeeDark')
    b.box([-0.058, -0.04, 0.027], [0.058, -0.02, 0.143], 'silver')
    b.box([-0.012, -0.08, 0.14], [0.012, -0.055, 0.18], 'coffeeDark') // spout
  },
  headband(b) { b.ring([0.176, 0.176], 0.014, 0.04, 0, 'white') },
  ankleBand(b) { b.ring([0.072, 0.07], 0.014, 0.032, 0, 'armRed') },
  cap(b) { b.box([-0.18, 0, -0.18], [0.18, 0.06, 0.18], 'armRed'); b.box([-0.12, 0, 0.18], [0.12, 0.015, 0.3], 'armRed'); b.box([-0.03, 0.06, -0.03], [0.03, 0.075, 0.03], 'white') },
  giantBall(b) { b.sphere(0.5, [0, 0.5, 0], 'giantBallRed', { lat: 8, lon: 12, bands: [[3, 5, 'giantBallWhite']] }) },
  ropeHandle(b) { b.box([-0.018, -0.05, -0.018], [0.018, 0.03, 0.018], 'woodBrown'); b.box([-0.007, -0.16, -0.007], [0.007, -0.05, 0.007], 'white') },
}
for (const prop of [...usedProps].sort()) {
  if (MINI_PACK_PROPS[prop]) {
    const file = `${MINI_PACK_PROPS[prop]}.glb`
    const doc = await io.read(join(args.pack, file))
    const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0]
    const g = { position: Array.from(prim.getAttribute('POSITION').getArray()), normal: Array.from(prim.getAttribute('NORMAL').getArray()), uv: Array.from(prim.getAttribute('TEXCOORD_0').getArray()), index: Array.from(prim.getIndices().getArray()) }
    addMesh(`prop__${prop}`, g, { prop, source: file })
    stats.props[prop] = { source: file, tris: g.index.length / 3, sha256: sha256(readFileSync(join(args.pack, file))) }
  } else {
    if (!PROP_BUILDERS[prop]) throw new Error(`no builder for prop ${prop}`)
    const b = createBuilder(); PROP_BUILDERS[prop](b)
    addMesh(`prop__${prop}`, b.g, { prop, source: 'procedural' })
    stats.props[prop] = { source: 'procedural', tris: b.g.index.length / 3 }
  }
}

// ── optimise + write ────────────────────────────────────────────────────────────
flushMerged()
if (args.raw) await io.write(resolve(args.raw), out)
await out.transform(dedup(), ...(args.normals === 'on' ? [] : [weld()]), prune({ keepExtras: true }), meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: Number(args.qpos ?? 14), quantizeNormal: 8, quantizeTexcoord: Number(args.qtex ?? 8) }))
const glb = await io.writeBinary(out)
writeFileSync(resolve(args.out), glb)
stats.output = { path: resolve(args.out), bytes: glb.byteLength, sha256: sha256(glb) }
stats.atlas = { width: W, height: W, pngBytes: atlasPng.byteLength, desaturate: DESAT, slots: MINI_PALETTE_SLOTS.length, sourceSha256: sha256(colormapBytes) }
stats.totals = { nodes: stats.nodes.length, tris: stats.nodes.reduce((t, n) => t + n.tris, 0), verts: stats.nodes.reduce((t, n) => t + n.verts, 0) }
const pkgVersion = (name) => JSON.parse(readFileSync(join(resolve(args.tool), name, 'package.json'), 'utf8')).version
stats.toolchain = { gltfTransform: pkgVersion('@gltf-transform/core'), functions: pkgVersion('@gltf-transform/functions'), meshoptimizer: pkgVersion('meshoptimizer'), sharp: pkgVersion('sharp'), node: process.version }
if (args.stats) writeFileSync(resolve(args.stats), JSON.stringify(stats, null, 2))
console.log(`wrote ${resolve(args.out)} bytes=${glb.byteLength} nodes=${stats.totals.nodes} tris=${stats.totals.tris} verts=${stats.totals.verts} atlasPng=${atlasPng.byteLength}`)
