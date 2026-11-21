// Stage 6 「운동장」 ground maps from CC0 ambientCG photo textures. 2026-11-17, threemini; grass 2026-11-21.
//
// Each source colour map is read as DATA (JPEG decode only) and written to src/assets/textures/schoolyard/:
//  - detail maps (<surface>.jpg: track, sand, paving, kerb): luminance -> light blur (drops photo noise)
//    -> posterise to a few soft levels (toon-friendly) -> normalised to mean 0.80 with a per-surface
//    amplitude -> 256 px grayscale JPEG. At runtime (schoolyardGround.js) the map is a plain multiplier
//    (no colour space) on a toon material whose colour sets the surface's average tone.
//  - colour maps (grass.jpg): the photo itself, real colour and grain, Lanczos-downsized to 512 px sRGB
//    JPEG. At runtime it is the sRGB map of the whole field floor (pitch, dirt surround, outfield) under a
//    light tint (Terry 2026-11-21 picked Grass004 for the field: 「이걸로 깔아라」).
//
// Toolchain is NOT in package.json: --tool = an `npx @gltf-transform/cli@4` cache node_modules (brings sharp).
// usage (from Developer/r3f_prototype):
//   node scripts/build_schoolyard_ground_textures.mjs --tool <node_modules> --src F:/ezs-work/assets_cc0/textures
//     --out src/assets/textures/schoolyard
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, arg, i, all) => (arg.startsWith('--') ? [...acc, [arg.slice(2), all[i + 1]]] : acc), []))
for (const key of ['tool', 'src', 'out']) if (!args[key]) throw new Error(`missing --${key}`)
const sharp = createRequire(join(resolve(args.tool), 'noop.cjs'))('sharp')
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const member = (id) => join(resolve(args.src), `ambientcg-${id}`, 'extracted', `${id}_1K-JPG_Color.jpg`)

// surface -> [ambientCG id, amplitude (std of the 0..1 multiplier), posterise levels, blur sigma]
const SURFACES = {
  track: ['Rubber003', 0.13, 7, 0.8],
  sand: ['Ground054', 0.12, 6, 1.6],
  paving: ['PavingStones128', 0.15, 7, 0.8],
  kerb: ['Concrete034', 0.09, 6, 1.6],
}
// colour map -> [ambientCG id, size px, JPEG quality]
const COLOUR_MAPS = {
  grass: ['Grass004', 512, 80],
}
const SIZE = 256, MEAN = 0.8

mkdirSync(resolve(args.out), { recursive: true })
const stats = {}
for (const [surface, [id, amp, levels, sigma]] of Object.entries(SURFACES)) {
  const bytes = readFileSync(member(id))
  const { data } = await sharp(bytes).grayscale().blur(sigma).resize(SIZE, SIZE, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })
  // posterise (soft: keep 25% of the in-step detail so edges stay painterly, not banded)
  const v = Float32Array.from(data, (x) => x / 255)
  let mean = 0
  for (const x of v) mean += x
  mean /= v.length
  let sd = 0
  for (const x of v) sd += (x - mean) ** 2
  sd = Math.sqrt(sd / v.length) || 1
  const out = Buffer.alloc(v.length)
  for (let i = 0; i < v.length; i++) {
    const z = (v[i] - mean) / sd // standard score
    const q = Math.round(z * levels / 3) * 3 / levels // levels across ±3 sd
    const soft = q * 0.75 + z * 0.25
    out[i] = Math.max(0, Math.min(255, Math.round((MEAN + soft * amp) * 255)))
  }
  const jpg = await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 1 } }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  writeFileSync(join(resolve(args.out), `${surface}.jpg`), jpg)
  stats[surface] = { source: `ambientCG ${id}`, member: `${id}_1K-JPG_Color.jpg`, memberSha256: sha256(bytes), bytes: jpg.byteLength, sha256: sha256(jpg), amplitude: amp, levels }
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
for (const [name, [id, size, quality]] of Object.entries(COLOUR_MAPS)) {
  const bytes = readFileSync(member(id))
  const { data, info } = await sharp(bytes).resize(size, size, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const jpg = await sharp(data, { raw: info }).jpeg({ quality, mozjpeg: true }).toBuffer()
  // Mean linear luminance (what the shader samples from an sRGB texture), used by the macro variation.
  const { data: dec } = await sharp(jpg).raw().toBuffer({ resolveWithObject: true })
  let lum = 0
  for (let i = 0; i < dec.length; i += 3) lum += (lin(dec[i] / 255) + lin(dec[i + 1] / 255) + lin(dec[i + 2] / 255)) / 3
  writeFileSync(join(resolve(args.out), `${name}.jpg`), jpg)
  stats[name] = { source: `ambientCG ${id}`, member: `${id}_1K-JPG_Color.jpg`, memberSha256: sha256(bytes), bytes: jpg.byteLength, sha256: sha256(jpg), kind: 'colour', size, quality, meanLinearLuminance: +(lum / (dec.length / 3)).toFixed(4) }
}
writeFileSync(join(resolve(args.out), 'PROVENANCE.json'), `${JSON.stringify({
  asset: 'Stage 6 schoolyard ground maps (Grass004 colour field floor; track, sand, paved walk, kerb detail maps)',
  created: '2026-11-17',
  updated: '2026-11-21',
  source: { site: 'ambientCG (https://ambientcg.com)', author: 'Lennart Demes / ambientCG', license: { id: 'CC0-1.0', url: 'https://docs.ambientcg.com/license/', attribution: 'not required' }, downloaded: '2026-11-17', archive: 'F:/ezs-work/assets_cc0/textures/ambientcg-<id>/ (zip + LICENSE_SNAPSHOT.md)' },
  maps: stats,
  modifications: [
    'Detail maps (track, sand, paving, kerb): only the 1K Color map of each material is used; it is converted to luminance, blurred, softly posterised, normalised to mean 0.80 with the listed amplitude and downsized to 256x256 grayscale JPEG. At runtime the map multiplies a toon material colour chosen per surface (schoolyardGround.js), so these files carry no colour of their own.',
    'grass.jpg (2026-11-21): the Grass004 1K Color map itself, real colour, Lanczos-downsized to 512x512 sRGB JPEG (quality 80). It covers the whole field floor (pitch, dirt surround, outfield) under a light tint, with a cheap in-shader macro variation from the same map to hide the repeat.',
    '2026-11-21: the former grayscale detail maps turf.jpg (Grass001), outfield.jpg (Grass004) and dirt.jpg (Ground048) were removed; nothing references them any more.',
  ],
  script: 'scripts/build_schoolyard_ground_textures.mjs (--src F:/ezs-work/assets_cc0/textures)',
}, null, 2)}\n`)
console.log(Object.entries(stats).map(([k, s]) => `${k}=${s.bytes}`).join(' '), 'total', Object.values(stats).reduce((t, s) => t + s.bytes, 0), 'grassMeanLin', stats.grass.meanLinearLuminance)
