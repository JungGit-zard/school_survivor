// Bake the Stage 6 「운동장」 free-pack dressing into ONE small meshopt GLB. 2026-11-17, threemini.
//
// Packs (all CC0, raw downloads + licence snapshots under F:\ezs-work\assets_cc0\, survey in
// F:\ezs-work\backup\stage6_field_20261117\survey.md): Kenney Modular Buildings + Racing Kit, KayKit Forest /
// Platformer / Holiday Bits / City Builder Bits / Mini-Game Variety, Tiny Treats Fun Playground / Pretty Park.
//
// The packs are read as DATA only (glTF/GLB + PNG parsing); nothing from them is executed.
// Every model becomes one root node (name = the key below) with ONE primitive: POSITION, NORMAL, COLOR_0.
// Colours are baked into COLOR_0 (linear) so the whole dressing shares one untextured vertex-colour toon
// material with the hand-built schoolyard props (schoolyardProps.js) and merges into a few draw calls:
//   textured models (KayKit/Tiny Treats gradient atlas, Kenney colormap) -> atlas sampled at each vertex UV
//   material-colour models (Kenney Racing Kit)                           -> RECOLOUR table (no pastel guesswork)
// Each model is centred on x/z and stands on y = 0 in its own pack units (the runtime layout scales it).
//
// Toolchain is NOT in package.json: point --tool at an `npx @gltf-transform/cli@4` cache node_modules
// (@gltf-transform/*, meshoptimizer, sharp) — the same one build_kenney_mini_zombies.mjs uses.
//
// usage (from Developer/r3f_prototype):
//   node scripts/build_schoolyard_dressing.mjs --tool <node_modules> --packs F:/ezs-work/assets_cc0
//     --out src/assets/models/schoolyard/schoolyard_dressing.glb [--stats <file.json>]
//   (also rewrites PROVENANCE.json next to the GLB; License.txt there holds the pack licence texts)
import { createRequire } from 'node:module'
import { join, resolve, dirname } from 'node:path'
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => (arg.startsWith('--') ? [...acc, [arg.slice(2), all[i + 1]]] : acc), []))
for (const key of ['tool', 'packs', 'out']) if (!args[key]) throw new Error(`missing --${key}`)
const req = createRequire(join(resolve(args.tool), 'noop.cjs'))
const { NodeIO, Document } = req('@gltf-transform/core')
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions')
const { meshopt, prune, dedup, weld } = req('@gltf-transform/functions')
const { MeshoptEncoder, MeshoptDecoder } = req('meshoptimizer')
const sharp = req('sharp')

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

const KM = 'environment/kenney-modular-buildings/extracted/Models/GLB format'
const KR = 'environment/kenney-racing-kit/extracted/Models/GLTF format'
const KF = 'environment/kaylousberg-kaykit-forest/extracted/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf'
const KP = 'environment/kaylousberg-kaykit-platformer/extracted/KayKit_Platformer_Pack_1.0_FREE/Assets/gltf'
const KH = 'environment/kaylousberg-holiday-bits/extracted/KayKit_Holiday_Bits_1.0_FREE/Assets/gltf'
const KC = 'environment/kaylousberg-city-builder-bits/extracted/KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf'
const KV = 'characters/kaylousberg-kay-kit-mini-game-variety-pack/extracted/Models/gltf'
const TP = 'environment/tinytreats-fun-playground/extracted/Tiny_Treats_Fun_Playground_1.0_FREE/Assets/gltf'
const TK = 'environment/tinytreats-pretty-park/extracted/Tiny_Treats_Pretty_Park_1.0_FREE/Assets/gltf'

const PACKS = {
  'kenney-modular-buildings': { name: 'Modular Buildings', author: 'Kenney (www.kenney.nl)', url: 'https://kenney.nl/assets/modular-buildings', zip: 'environment/kenney-modular-buildings/modular-buildings.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip', snapshot: 'environment/kenney-modular-buildings/LICENSE_SNAPSHOT.md' },
  'kenney-racing-kit': { name: 'Racing Kit', author: 'Kenney (www.kenney.nl)', url: 'https://kenney.nl/assets/racing-kit', zip: 'environment/kenney-racing-kit/racing-kit.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip', snapshot: 'environment/kenney-racing-kit/LICENSE_SNAPSHOT.md' },
  'kaykit-forest': { name: 'KayKit Forest Nature Pack 1.0 (FREE)', author: 'Kay Lousberg (kaylousberg.com)', url: 'https://kaylousberg.itch.io/kaykit-forest', zip: 'environment/kaylousberg-kaykit-forest/kaykit-forest_Free.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'environment/kaylousberg-kaykit-forest/LICENSE_SNAPSHOT.md' },
  'kaykit-platformer': { name: 'KayKit Platformer Pack 1.0 (FREE)', author: 'Kay Lousberg (kaylousberg.com)', url: 'https://kaylousberg.itch.io/kaykit-platformer', zip: 'environment/kaylousberg-kaykit-platformer/kaykit-platformer_Free.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'environment/kaylousberg-kaykit-platformer/LICENSE_SNAPSHOT.md' },
  'kaykit-holiday-bits': { name: 'KayKit Holiday Bits 1.0 (FREE)', author: 'Kay Lousberg (kaylousberg.com)', url: 'https://kaylousberg.itch.io/holiday-bits', zip: 'environment/kaylousberg-holiday-bits/holiday-bits_Free.zip', license: 'CC0-1.0', licenseFile: 'itch page only (no License.txt in zip)', snapshot: 'environment/kaylousberg-holiday-bits/LICENSE_SNAPSHOT.md' },
  'kaykit-city-builder-bits': { name: 'KayKit City Builder Bits 1.0 (FREE)', author: 'Kay Lousberg (kaylousberg.com)', url: 'https://kaylousberg.itch.io/city-builder-bits', zip: 'environment/kaylousberg-city-builder-bits/city-builder-bits_Free.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'environment/kaylousberg-city-builder-bits/LICENSE_SNAPSHOT.md' },
  'kaykit-mini-game-variety': { name: 'KayKit Mini-Game Variety Pack (FREE)', author: 'Kay Lousberg (kaylousberg.com)', url: 'https://kaylousberg.itch.io/kay-kit-mini-game-variety-pack', zip: 'characters/kaylousberg-kay-kit-mini-game-variety-pack/kay-kit-mini-game-variety-pack.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'characters/kaylousberg-kay-kit-mini-game-variety-pack/LICENSE_SNAPSHOT.md' },
  'tinytreats-fun-playground': { name: 'Tiny Treats - Fun Playground 1.0 (FREE)', author: 'Tiny Treats (Isa Lousberg)', url: 'https://tinytreats.itch.io/fun-playground', zip: 'environment/tinytreats-fun-playground/fun-playground_Free.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'environment/tinytreats-fun-playground/LICENSE_SNAPSHOT.md' },
  'tinytreats-pretty-park': { name: 'Tiny Treats - Pretty Park 1.0 (FREE)', author: 'Tiny Treats (Isa Lousberg)', url: 'https://tinytreats.itch.io/pretty-park', zip: 'environment/tinytreats-pretty-park/pretty-park_Free.zip', license: 'CC0-1.0', licenseFile: 'License.txt in zip + itch page', snapshot: 'environment/tinytreats-pretty-park/LICENSE_SNAPSHOT.md' },
}

// Output node name -> source model. Keep in sync with SCHOOLYARD_DRESSING_NODES (src/components/expansion/schoolyardDressing.js).
const MODELS = [
  ['school_wall_windows', 'kenney-modular-buildings', `${KM}/building-windows.glb`],
  ['school_wall_door', 'kenney-modular-buildings', `${KM}/building-door-window.glb`],
  ['school_roof', 'kenney-modular-buildings', `${KM}/roof-flat-top.glb`],
  ['tent_long', 'kenney-racing-kit', `${KR}/tentLong.glb`],
  ['tent_small', 'kenney-racing-kit', `${KR}/tent.glb`],
  ['tree_round', 'kaykit-forest', `${KF}/Tree_1_A_Color1.gltf`],
  ['tree_tall', 'kaykit-forest', `${KF}/Tree_2_A_Color1.gltf`],
  ['bush_round', 'kaykit-forest', `${KF}/Bush_1_C_Color1.gltf`],
  ['bush_small', 'kaykit-forest', `${KF}/Bush_2_C_Color1.gltf`],
  ['hedge_long', 'tinytreats-pretty-park', `${TK}/hedge_straight_long.gltf`],
  ['flower_white', 'tinytreats-pretty-park', `${TK}/flower_A.gltf`],
  ['flower_pink', 'tinytreats-pretty-park', `${TK}/flower_B.gltf`],
  ['park_bench', 'tinytreats-pretty-park', `${TK}/bench.gltf`],
  ['street_lantern', 'tinytreats-pretty-park', `${TK}/street_lantern.gltf`],
  ['fence_long', 'tinytreats-fun-playground', `${TP}/fence_straight_long.gltf`],
  ['fence_post', 'tinytreats-fun-playground', `${TP}/fence_post.gltf`],
  ['slide', 'tinytreats-fun-playground', `${TP}/slide_A.gltf`],
  ['swing', 'tinytreats-fun-playground', `${TP}/swing_B_small.gltf`],
  ['seesaw', 'tinytreats-fun-playground', `${TP}/seesaw_small.gltf`],
  ['merry_go_round', 'tinytreats-fun-playground', `${TP}/merry_go_round.gltf`],
  ['sandbox', 'tinytreats-fun-playground', `${TP}/sandbox_round.gltf`],
  ['bin', 'tinytreats-pretty-park', `${TK}/trashcan.gltf`],
  ['hydrant', 'kaykit-city-builder-bits', `${KC}/firehydrant.gltf`],
  ['cone_blue', 'kaykit-platformer', `${KP}/blue/cone_blue.gltf`],
  ['cone_green', 'kaykit-platformer', `${KP}/green/cone_green.gltf`],
  ['big_ball_blue', 'kaykit-platformer', `${KP}/blue/ball_blue.gltf`],
  ['team_flag_blue', 'kaykit-platformer', `${KP}/blue/flag_A_blue.gltf`],
  ['team_flag_yellow', 'kaykit-platformer', `${KP}/yellow/flag_A_yellow.gltf`],
  ['sign_board', 'kaykit-platformer', `${KP}/neutral/sign.gltf`],
  ['football', 'kaykit-holiday-bits', `${KH}/football.gltf`],
  ['school_bell', 'kaykit-holiday-bits', `${KH}/bell.gltf`],
  ['hurdle', 'kaykit-mini-game-variety', `${KV}/barrierSmall.gltf.glb`],
]

// Material-colour models (Kenney Racing Kit): material name -> sRGB hex. Red canopies would read as a
// damage telegraph next to the arena, so the sports-day tents are school blue with white poles.
const RECOLOUR = {
  tent_long: { red: '#2F5FA8', grey: '#F4F6F8' },
  tent_small: { red: '#4C7FB8', grey: '#F4F6F8' },
  hurdle: { Metal: '#E8EEF2' }, // KayKit Mini-Game Variety ships this one with a flat material colour: painted white like a track hurdle
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const hexToLinear = (hex) => [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255))

const imageCache = new Map()
async function decodeImage(texture) {
  const bytes = texture.getImage()
  const key = sha256(bytes)
  if (!imageCache.has(key)) {
    const { data, info } = await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    imageCache.set(key, { data, w: info.width, h: info.height, sha256: key })
  }
  return imageCache.get(key)
}
// Bilinear sample with repeat wrap; returns sRGB 0..1.
function sample(img, u, v) {
  const x = (((u % 1) + 1) % 1) * img.w - 0.5, y = (((v % 1) + 1) % 1) * img.h - 0.5
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const px = (xx, yy) => { const i = ((((yy % img.h) + img.h) % img.h) * img.w + (((xx % img.w) + img.w) % img.w)) * 4; return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255] }
  const a = px(x0, y0), b = px(x0 + 1, y0), c = px(x0, y0 + 1), d = px(x0 + 1, y0 + 1)
  return [0, 1, 2].map((k) => (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c[k] * (1 - fx) + d[k] * fx) * fy)
}

const applyMat4 = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]
function normalMatrix(m) {
  const a = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]] // column-major 3x3
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = a
  const b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20
  const det = a00 * b01 + a01 * b11 + a02 * b21
  const inv = [b01, -a22 * a01 + a02 * a21, a12 * a01 - a02 * a11, b11, a22 * a00 - a02 * a20, -a12 * a00 + a02 * a10, b21, -a21 * a00 + a01 * a20, a11 * a00 - a01 * a10].map((v) => v / det)
  // transpose of inverse, still column-major
  return [inv[0], inv[3], inv[6], inv[1], inv[4], inv[7], inv[2], inv[5], inv[8]]
}

const out = new Document()
const buffer = out.createBuffer('dressing')
const material = out.createMaterial('schoolyard_dressing_vertex_colour').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1)
const outScene = out.createScene('schoolyard_dressing')
out.getRoot().setDefaultScene(outScene)
const stats = { models: [], images: [] }
const memberHashes = new Map()

for (const [name, packId, rel] of MODELS) {
  const file = join(resolve(args.packs), rel)
  const doc = await io.read(file)
  memberHashes.set(rel, sha256(readFileSync(file)))
  const P = [], N = [], C = [], I = []
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const meshNodes = []
  scene.traverse((node) => { if (node.getMesh()) meshNodes.push(node) })
  for (const node of meshNodes) {
    const m = node.getWorldMatrix(), nm = normalMatrix(m)
    for (const prim of node.getMesh().listPrimitives()) {
      if (prim.getMode() !== 4) throw new Error(`${name}: non-triangle primitive`)
      const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL')
      const mat = prim.getMaterial(), base = mat?.getBaseColorFactor() ?? [1, 1, 1, 1]
      const tex = mat?.getBaseColorTexture()
      const texInfo = mat?.getBaseColorTextureInfo()
      const uv = tex ? prim.getAttribute(`TEXCOORD_${texInfo?.getTexCoord() ?? 0}`) : null
      let flat = null
      if (!tex) {
        const table = RECOLOUR[name]
        const hex = table?.[mat?.getName()]
        if (!hex) throw new Error(`${name}: untextured material "${mat?.getName()}" has no RECOLOUR entry`)
        flat = hexToLinear(hex)
      }
      const img = tex ? await decodeImage(tex) : null
      if (img && !stats.images.includes(img.sha256)) stats.images.push(img.sha256)
      const offset = P.length / 3
      const e = [], n = [], t = []
      for (let i = 0; i < pos.getCount(); i += 1) {
        pos.getElement(i, e)
        P.push(...applyMat4(m, e[0], e[1], e[2]))
        if (nor) {
          nor.getElement(i, n)
          const nx = nm[0] * n[0] + nm[3] * n[1] + nm[6] * n[2], ny = nm[1] * n[0] + nm[4] * n[1] + nm[7] * n[2], nz = nm[2] * n[0] + nm[5] * n[1] + nm[8] * n[2]
          const len = Math.hypot(nx, ny, nz) || 1
          N.push(nx / len, ny / len, nz / len)
        } else throw new Error(`${name}: missing normals`)
        if (img) {
          uv.getElement(i, t)
          const s = sample(img, t[0], t[1])
          C.push(...s.map((c, k) => srgbToLinear(c) * base[k]))
        } else C.push(...flat)
      }
      const idx = prim.getIndices()
      if (idx) for (let i = 0; i < idx.getCount(); i += 1) I.push(offset + idx.getScalar(i))
      else for (let i = 0; i < pos.getCount(); i += 1) I.push(offset + i)
    }
  }
  // Centre on x/z, stand on y = 0.
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]) }
  const shift = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k += 1) P[i + k] -= shift[k]
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]].map((v) => +v.toFixed(4))
  const acc = (type, array) => out.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  const prim = out.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(P)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(N)))
    .setAttribute('COLOR_0', acc('VEC3', new Float32Array(C)))
    .setIndices(acc('SCALAR', P.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I)))
    .setMaterial(material)
  const node = out.createNode(name).setMesh(out.createMesh(name).addPrimitive(prim)).setExtras({ pack: packId, source: rel.split('/').pop(), size })
  outScene.addChild(node)
  stats.models.push({ node: name, pack: packId, member: rel, tris: I.length / 3, size, recolour: RECOLOUR[name] ?? null })
}

await out.transform(dedup(), weld(), prune({ keepExtras: true }), meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeNormal: 8, quantizeColor: 8 }))
const glb = await io.writeBinary(out)
const outPath = resolve(args.out)
writeFileSync(outPath, glb)
const pkgVersion = (n) => JSON.parse(readFileSync(join(resolve(args.tool), n, 'package.json'), 'utf8')).version
stats.output = { file: outPath, bytes: glb.byteLength, sha256: sha256(glb), nodes: stats.models.length, triangles: stats.models.reduce((t, m) => t + m.tris, 0) }
stats.members = Object.fromEntries(memberHashes)
stats.zips = Object.fromEntries(Object.entries(PACKS).map(([id, p]) => {
  const zipPath = join(resolve(args.packs), p.zip)
  const bytes = readFileSync(zipPath)
  return [id, { file: p.zip.split('/').pop(), bytes: bytes.byteLength, sha256: sha256(bytes) }]
}))
stats.packs = PACKS
stats.toolchain = { gltfTransform: pkgVersion('@gltf-transform/core'), functions: pkgVersion('@gltf-transform/functions'), meshoptimizer: pkgVersion('meshoptimizer'), sharp: pkgVersion('sharp'), node: process.version }
if (args.stats) { writeFileSync(resolve(args.stats), JSON.stringify(stats, null, 2)) }

// PROVENANCE.json next to the GLB (same shape as src/assets/models/kenney_mini/PROVENANCE.json).
const DOWNLOADED = { 'kaykit-mini-game-variety': '2026-11-15' }
const provenance = {
  asset: 'Stage 6 schoolyard (운동장) free-pack dressing - school block, trees, bushes, hedges, flower beds, lamps, bench, bin, hydrants, playground set, sports-day tents and kit, school fence and gate pillars',
  created: '2026-11-17',
  packs: Object.entries(PACKS).map(([id, p]) => ({ id, pack: p.name, author: p.author, url: p.url, license: { id: p.license, url: 'http://creativecommons.org/publicdomain/zero/1.0/', statement: p.licenseFile }, downloaded: DOWNLOADED[id] ?? '2026-11-17', zip: stats.zips[id], licenseSnapshot: `F:/ezs-work/assets_cc0/${p.snapshot}` })),
  license: { id: 'CC0-1.0', url: 'http://creativecommons.org/publicdomain/zero/1.0/', attribution: 'not required; credits in License.txt', file: 'License.txt (pack License.txt texts verbatim, itch page licence field for Holiday Bits which ships none)' },
  nodes: stats.models.map((m) => ({ node: m.node, pack: m.pack, member: m.member.split('/extracted/')[1] ?? m.member, memberSha256: stats.members[m.member], triangles: m.tris, size: m.size, ...(m.recolour ? { recolour: m.recolour } : {}) })),
  modifications: [
    `Only the ${stats.models.length} models listed under nodes are included (one root node each, named by our key).`,
    'Each model: all mesh nodes flattened (world matrix baked), centred on x/z, standing on y = 0, all primitives merged into one primitive.',
    'Textures dropped: the KayKit / Tiny Treats gradient atlases and the Kenney colormap were sampled (bilinear) at every vertex UV and stored as linear vertex colours (COLOR_0); UVs dropped.',
    'Material-colour models recoloured from a fixed table (RECOLOUR in the build script): Kenney Racing Kit tentLong/tent red -> #2F5FA8/#4C7FB8 school blue, grey -> #F4F6F8; KayKit Mini-Game Variety barrierSmall Metal -> #E8EEF2 (white hurdle).',
    'One shared untextured material; @gltf-transform dedup + weld + prune + meshopt (EXT_meshopt_compression + KHR_mesh_quantization, position 14 bit, normal 8 bit, colour 8 bit).',
  ],
  output: { file: 'schoolyard_dressing.glb', bytes: stats.output.bytes, sha256: stats.output.sha256, nodes: stats.output.nodes, triangles: stats.output.triangles, textures: 0, toolchain: stats.toolchain, script: 'scripts/build_schoolyard_dressing.mjs (--packs F:/ezs-work/assets_cc0)' },
  runtime: 'src/components/expansion/schoolyardDressing.js (layout + merge into 8 region chunks, vertex-colour toon + inverted-hull outline shared with schoolyardProps.js)',
}
writeFileSync(join(dirname(outPath), 'PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`)
console.log(`wrote ${outPath} bytes=${glb.byteLength} nodes=${stats.output.nodes} tris=${stats.output.triangles}`)

