// Kenney "Blocky Characters 2.0"(CC0) → 블록 좀비 18종 자산 빌드. 2026-11-14.
//
//   node scripts/build_kenney_blocky_zombies.mjs <압축 푼 팩 폴더> [팩 zip]
//
// 하는 일(외부 의존 없음 — node:zlib·node:crypto만 쓴다):
//  1. 18개 GLB의 지오메트리(6파트 강체 박스, 노드 위치·UV·인덱스)가 전부 같은지 확인하고 한 벌만
//     src/lib/kenneyBlockyGeometry.js로 굽는다(GLB 18 × 113KB를 싣지 않는다. 애니메이션 클립은 쓰지 않는다 —
//     게임의 절차적 포즈가 6파트를 직접 돌린다).
//  2. 18장의 1024² 텍스처를 CELL²로 줄이고(면적 평균) 좀비 처리(전체 채도 −30% + 병색 틴트, 머리·팔·몸통의
//     살색은 회녹색으로)를 한 뒤 6×3 아틀라스 PNG 한 장으로 묶는다(칸 사이 GUTTER px 가장자리 복제).
//  3. 쓴 zip 멤버의 SHA-256을 PROVENANCE.json에 남긴다.
// 같은 입력이면 바이트 단위로 같은 출력이 나온다.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACK = process.argv[2]
const ZIP = process.argv[3]
if (!PACK) { console.error('usage: node scripts/build_kenney_blocky_zombies.mjs <pack dir> [pack.zip]'); process.exit(2) }

export const LETTERS = 'abcdefghijklmnopqr'.split('')
const CELL = 192
const GUTTER = 2
const COLS = 6
const ROWS = 3
const STRIDE = CELL + GUTTER * 2
const ATLAS_W = COLS * STRIDE
const ATLAS_H = ROWS * STRIDE
const OUT_ASSET_DIR = path.join(ROOT, 'src/assets/models/kenney_blocky')
const OUT_ATLAS = path.join(OUT_ASSET_DIR, 'kenney_blocky_zombie_atlas.png')
const OUT_GEOMETRY = path.join(ROOT, 'src/lib/kenneyBlockyGeometry.js')
const OUT_PROVENANCE = path.join(OUT_ASSET_DIR, 'PROVENANCE.json')

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

// ── GLB ───────────────────────────────────────────────────────────────────────
function readGlb(file) {
  const buf = fs.readFileSync(file)
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`)
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen))
  const accessor = (index) => {
    const a = json.accessors[index]
    const view = json.bufferViews[a.bufferView]
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
    const out = []
    for (let i = 0; i < a.count * comps; i += 1) {
      if (a.componentType === 5126) out.push(bin.readFloatLE(offset + i * 4))
      else if (a.componentType === 5123) out.push(bin.readUInt16LE(offset + i * 2))
      else if (a.componentType === 5121) out.push(bin.readUInt8(offset + i))
      else throw new Error(`componentType ${a.componentType}`)
    }
    return out
  }
  return { json, accessor }
}

const PART_NODES = ['leg-left', 'leg-right', 'torso', 'arm-left', 'arm-right', 'head']
const PART_KEYS = ['legL', 'legR', 'torso', 'armL', 'armR', 'head']
const round = (v, d = 5) => { const r = Math.round(v * 10 ** d) / 10 ** d; return Object.is(r, -0) ? 0 : r }
const fract = (v) => v - Math.floor(v)

function extractGeometry(file) {
  const { json, accessor } = readGlb(file)
  const parts = PART_NODES.map((name, k) => {
    const nodeIndex = json.nodes.findIndex((n) => n.name === name)
    const node = json.nodes[nodeIndex]
    if (!node || node.mesh === undefined) throw new Error(`${file}: missing ${name}`)
    const parent = json.nodes.findIndex((n) => (n.children ?? []).includes(nodeIndex))
    const parentName = json.nodes[parent]?.name
    if (node.rotation && node.rotation.some((v, i) => Math.abs(v - [0, 0, 0, 1][i]) > 1e-6)) throw new Error(`${file}: ${name} has a rotation`)
    const scale = node.scale ?? [1, 1, 1]
    const prim = json.meshes[node.mesh].primitives[0]
    const pos = accessor(prim.attributes.POSITION)
    const nor = accessor(prim.attributes.NORMAL)
    const uv = accessor(prim.attributes.TEXCOORD_0)
    const index = accessor(prim.indices)
    // 노드 스케일(머리 0.1)은 정점에 굽는다. UV는 KHR_texture_transform이 오프셋 없이 반복(wrap)이라 frac을 취한다.
    // 한 면의 UV가 정수 경계를 넘지 않음을 확인한다(넘으면 frac이 면을 찢는다).
    for (let f = 0; f < index.length; f += 3) {
      const cells = new Set()
      for (let c = 0; c < 3; c += 1) cells.add(`${Math.floor(uv[index[f + c] * 2])},${Math.floor(uv[index[f + c] * 2 + 1])}`)
      if (cells.size !== 1) throw new Error(`${file}: ${name} face ${f / 3} straddles a UV tile`)
    }
    return {
      key: PART_KEYS[k],
      parent: parentName === 'torso' ? 'torso' : 'root',
      pivot: (node.translation ?? [0, 0, 0]).map((v) => round(v)),
      position: pos.map((v, i) => round(v * scale[i % 3])),
      normal: nor.map((v) => round(v, 4)),
      uv: uv.map((v) => round(fract(v), 5)),
      index,
    }
  })
  return parts
}

// ── PNG ───────────────────────────────────────────────────────────────────────
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let off = 8; let width = 0; let height = 0; let depth = 0; let type = 0; let palette = null; let trns = null
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const name = buf.toString('ascii', off + 4, off + 8); const data = buf.subarray(off + 8, off + 8 + len)
    if (name === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('interlaced PNG') }
    else if (name === 'PLTE') palette = data
    else if (name === 'tRNS') trns = data
    else if (name === 'IDAT') idat.push(data)
    off += 12 + len
  }
  if (depth !== 8) throw new Error(`bit depth ${depth}`)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = channels; const rowLen = width * bpp
  const px = Buffer.alloc(rowLen * height)
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (rowLen + 1)]; const src = y * (rowLen + 1) + 1; const dst = y * rowLen
    for (let x = 0; x < rowLen; x += 1) {
      const a = x >= bpp ? px[dst + x - bpp] : 0; const b = y > 0 ? px[dst - rowLen + x] : 0; const c = x >= bpp && y > 0 ? px[dst - rowLen + x - bpp] : 0
      let v = raw[src + x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      px[dst + x] = v & 255
    }
  }
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    if (type === 3) { const k = px[i]; rgba[i * 4] = palette[k * 3]; rgba[i * 4 + 1] = palette[k * 3 + 1]; rgba[i * 4 + 2] = palette[k * 3 + 2]; rgba[i * 4 + 3] = trns && k < trns.length ? trns[k] : 255 }
    else if (type === 2) { rgba.set([px[i * 3], px[i * 3 + 1], px[i * 3 + 2], 255], i * 4) }
    else if (type === 6) { rgba.set(px.subarray(i * 4, i * 4 + 4), i * 4) }
    else if (type === 0) { rgba.set([px[i], px[i], px[i], 255], i * 4) }
    else if (type === 4) { rgba.set([px[i * 2], px[i * 2], px[i * 2], px[i * 2 + 1]], i * 4) }
  }
  return { width, height, rgba }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(name, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(name, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
// RGB 8비트. 행마다 5개 필터 중 절댓값 합이 가장 작은 것을 고른다.
function encodePngRgb(width, height, rgb) {
  const rowLen = width * 3
  const out = Buffer.alloc((rowLen + 1) * height)
  const cand = Array.from({ length: 5 }, () => Buffer.alloc(rowLen))
  for (let y = 0; y < height; y += 1) {
    const row = rgb.subarray(y * rowLen, (y + 1) * rowLen); const prev = y > 0 ? rgb.subarray((y - 1) * rowLen, y * rowLen) : null
    let best = 0; let bestScore = Infinity
    for (let f = 0; f < 5; f += 1) {
      let score = 0
      for (let x = 0; x < rowLen; x += 1) {
        const a = x >= 3 ? row[x - 3] : 0; const b = prev ? prev[x] : 0; const c = x >= 3 && prev ? prev[x - 3] : 0
        let p = 0
        if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1
        else if (f === 4) { const q = a + b - c; const pa = Math.abs(q - a); const pb = Math.abs(q - b); const pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
        const v = (row[x] - p) & 255
        cand[f][x] = v; score += v < 128 ? v : 256 - v
      }
      if (score < bestScore) { bestScore = score; best = f }
    }
    out[y * (rowLen + 1)] = best
    cand[best].copy(out, y * (rowLen + 1) + 1)
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(out, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// ── 좀비 처리 ─────────────────────────────────────────────────────────────────
function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min
  let h = 0
  if (d > 0) { if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360 }
  return [h, max === 0 ? 0 : d / max, max]
}
// 살이 있을 수 있는 UV 구역(머리 십자, 팔 두 장, 몸통 십자). 다리(바지)는 빼서 갈색 바지가 초록이 되지 않게 한다.
function inSkinRegion(u, v) {
  return (u < 0.5 && v < 0.375) || (u >= 0.46 && v >= 0.515 && v < 0.755) || (u < 0.44 && v >= 0.665)
}
const ZOMBIE_SKIN = [0.50, 0.64, 0.44] // 회녹색(0x80a370 근처). 밝기는 원래 살색을 절반쯤만 따른다(창백한 연두가 되지 않게).
function zombify(r, g, b, u, v) {
  r /= 255; g /= 255; b /= 255
  const [h, s, val] = rgbToHsv(r, g, b)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  // 살색: 따뜻한 색상(8°~45°), 중간 채도. 빨간 셔츠(h<8, 고채도)·충돌인형 노랑(고채도)은 빠진다.
  if (inSkinRegion(u, v) && h >= 8 && h <= 38 && s >= 0.15 && s <= 0.66 && val >= 0.22) {
    const k = 0.72 + 0.28 * (lum / 0.62)
    const zr = ZOMBIE_SKIN[0] * k; const zg = ZOMBIE_SKIN[1] * k; const zb = ZOMBIE_SKIN[2] * k
    r = r * 0.18 + zr * 0.82; g = g * 0.18 + zg * 0.82; b = b * 0.18 + zb * 0.82
  } else {
    // 그 밖: 채도 30% 빼고 살짝 병색(초록·회색) 틴트. 옷 색은 알아볼 만큼 남긴다.
    r = lum + (r - lum) * 0.7; g = lum + (g - lum) * 0.7; b = lum + (b - lum) * 0.7
    r *= 0.92; g *= 0.99; b *= 0.88
  }
  const clamp = (x) => Math.max(0, Math.min(255, Math.round(x * 255)))
  return [clamp(r), clamp(g), clamp(b)]
}

function downsample(img, size) {
  const step = img.width / size
  const out = new Float32Array(size * size * 3)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0; let g = 0; let b = 0; let n = 0
      for (let sy = Math.floor(y * step); sy < Math.floor((y + 1) * step); sy += 1) {
        for (let sx = Math.floor(x * step); sx < Math.floor((x + 1) * step); sx += 1) {
          const i = (sy * img.width + sx) * 4
          r += img.rgba[i]; g += img.rgba[i + 1]; b += img.rgba[i + 2]; n += 1
        }
      }
      out[(y * size + x) * 3] = r / n; out[(y * size + x) * 3 + 1] = g / n; out[(y * size + x) * 3 + 2] = b / n
    }
  }
  return out
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
const glbDir = path.join(PACK, 'Models', 'GLB format')
const geometries = LETTERS.map((letter) => extractGeometry(path.join(glbDir, `character-${letter}.glb`)))
const reference = JSON.stringify(geometries[0])
geometries.forEach((geo, i) => { if (JSON.stringify(geo) !== reference) throw new Error(`character-${LETTERS[i]} geometry differs from character-a`) })

const atlas = Buffer.alloc(ATLAS_W * ATLAS_H * 3)
const members = []
LETTERS.forEach((letter, index) => {
  const file = path.join(glbDir, 'Textures', `texture-${letter}.png`)
  const bytes = fs.readFileSync(file)
  members.push({ member: `Models/GLB format/Textures/texture-${letter}.png`, bytes: bytes.length, sha256: sha256(bytes) })
  const small = downsample(decodePng(bytes), CELL)
  const col = index % COLS; const row = Math.floor(index / COLS)
  for (let y = -GUTTER; y < CELL + GUTTER; y += 1) {
    for (let x = -GUTTER; x < CELL + GUTTER; x += 1) {
      const sx = Math.min(CELL - 1, Math.max(0, x)); const sy = Math.min(CELL - 1, Math.max(0, y))
      const s = (sy * CELL + sx) * 3
      const [r, g, b] = zombify(small[s], small[s + 1], small[s + 2], (sx + 0.5) / CELL, (sy + 0.5) / CELL)
      const d = ((row * STRIDE + GUTTER + y) * ATLAS_W + col * STRIDE + GUTTER + x) * 3
      atlas[d] = r; atlas[d + 1] = g; atlas[d + 2] = b
    }
  }
})
for (const letter of LETTERS) {
  const bytes = fs.readFileSync(path.join(glbDir, `character-${letter}.glb`))
  members.push({ member: `Models/GLB format/character-${letter}.glb`, bytes: bytes.length, sha256: sha256(bytes), use: letter === 'a' ? 'geometry (identical in all 18, verified)' : 'geometry identity check only' })
}
const license = fs.readFileSync(path.join(PACK, 'License.txt'))
members.push({ member: 'License.txt', bytes: license.length, sha256: sha256(license) })

fs.mkdirSync(OUT_ASSET_DIR, { recursive: true })
const png = encodePngRgb(ATLAS_W, ATLAS_H, atlas)
fs.writeFileSync(OUT_ATLAS, png)
fs.writeFileSync(path.join(OUT_ASSET_DIR, 'License.txt'), license)

const geo = geometries[0]
const lines = [
  '// 생성 파일 — 손으로 고치지 않는다. scripts/build_kenney_blocky_zombies.mjs가 Kenney "Blocky Characters 2.0"(CC0)',
  '// GLB에서 뽑았다. 18종 모두 같은 지오메트리(6파트 강체 박스)라 한 벌만 싣는다. 출처: src/assets/models/kenney_blocky/PROVENANCE.json',
  '// 좌표: Kenney 모델 단위(키 2.7, 발바닥 y 0, 정면 +Z). pivot = 부모 기준 노드 위치. uv = 텍스처 한 장 기준(위가 v 0).',
  `export const KENNEY_BLOCKY_LETTERS = Object.freeze(${JSON.stringify(LETTERS)})`,
  `export const KENNEY_BLOCKY_ATLAS = Object.freeze({ cell: ${CELL}, gutter: ${GUTTER}, cols: ${COLS}, rows: ${ROWS}, width: ${ATLAS_W}, height: ${ATLAS_H} })`,
  'export const KENNEY_BLOCKY_PARTS = Object.freeze([',
  ...geo.map((p) => `  Object.freeze({ key: '${p.key}', parent: '${p.parent}', pivot: Object.freeze(${JSON.stringify(p.pivot)}),\n    position: ${JSON.stringify(p.position)},\n    normal: ${JSON.stringify(p.normal)},\n    uv: ${JSON.stringify(p.uv)},\n    index: ${JSON.stringify(p.index)} }),`),
  '])',
  '',
]
fs.writeFileSync(OUT_GEOMETRY, lines.join('\n'))

const zipInfo = ZIP && fs.existsSync(ZIP) ? (() => { const b = fs.readFileSync(ZIP); return { file: path.basename(ZIP), bytes: b.length, sha256: sha256(b) } })() : null
const provenance = {
  asset: 'Kenney Blocky Characters 2.0 — 18 characters as Escape! zombie school blocky zombies (E71-E88)',
  source: { url: 'https://kenney.nl/assets/blocky-characters', pack: 'Blocky Characters (2.0)', author: 'Kenney (www.kenney.nl)', created: '2025-06-10', downloaded: '2026-11-14', zip: zipInfo },
  license: { id: 'CC0-1.0', url: 'http://creativecommons.org/publicdomain/zero/1.0/', attribution: 'not required; credit "Kenney (www.kenney.nl), CC0" given here and in License.txt', file: 'License.txt (verbatim from the pack)' },
  membersUsed: members,
  outputs: [
    { path: 'src/assets/models/kenney_blocky/kenney_blocky_zombie_atlas.png', bytes: png.length, sha256: sha256(png), note: `18 textures box-downsampled 1024->${CELL}, zombie bake (desaturate 30% + sickly tint; warm skin hues in head/arm/torso UV regions -> grey-green), packed ${COLS}x${ROWS} with ${GUTTER}px edge-clamped gutters, RGB PNG` },
    { path: 'src/lib/kenneyBlockyGeometry.js', note: 'part pivots/positions (head 0.1 node scale baked)/normals/fract(uv)/indices of character-a.glb; animations not used' },
  ],
  generator: 'scripts/build_kenney_blocky_zombies.mjs',
  modifications: 'Textures recoloured as zombies and downscaled; no brand names or real-person likeness added.',
}
fs.writeFileSync(OUT_PROVENANCE, `${JSON.stringify(provenance, null, 2)}\n`)
console.log(JSON.stringify({ atlasBytes: png.length, atlas: `${ATLAS_W}x${ATLAS_H}`, geometryBytes: fs.statSync(OUT_GEOMETRY).size, parts: geo.map((p) => `${p.key}:${p.position.length / 3}v/${p.index.length / 3}t`) }))
