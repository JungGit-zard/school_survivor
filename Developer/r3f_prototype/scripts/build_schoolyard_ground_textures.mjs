// Stage 6 「운동장」 ground detail maps from CC0 ambientCG photo textures. 2026-11-17, threemini.
//
// Each source colour map is read as DATA (JPEG decode only), turned into a small tiling grayscale
// "detail" map and written to src/assets/textures/schoolyard/<surface>.jpg:
//   luminance -> light blur (drops photo noise) -> posterise to a few soft levels (toon-friendly)
//   -> normalised to mean 0.80 with a per-surface amplitude -> 256 px JPEG.
// At runtime (schoolyardGround.js) the map is a plain multiplier (no colour space) on a toon material
// whose colour sets the surface's average tone, so detail and colour/contrast are tuned independently.
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

// surface -> [ambientCG id, amplitude (std of the 0..1 multiplier), posterise levels, blur sigma, crop fraction]
const SURFACES = {
  track: ['Rubber003', 0.13, 7, 0.8, 1],
  turf: ['Grass001', 0.13, 6, 3.0, 1],
  outfield: ['Grass004', 0.14, 6, 3.0, 1],
  sand: ['Ground054', 0.12, 6, 1.6, 1],
  dirt: ['Ground048', 0.13, 6, 2.2, 1],
  paving: ['PavingStones128', 0.15, 7, 0.8, 1],
  kerb: ['Concrete034', 0.09, 6, 1.6, 1],
}
const SIZE = 256, MEAN = 0.8

mkdirSync(resolve(args.out), { recursive: true })
const stats = {}
for (const [surface, [id, amp, levels, sigma]] of Object.entries(SURFACES)) {
  const file = join(resolve(args.src), `ambientcg-${id}`, 'extracted', `${id}_1K-JPG_Color.jpg`)
  const bytes = readFileSync(file)
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
writeFileSync(join(resolve(args.out), 'PROVENANCE.json'), `${JSON.stringify({
  asset: 'Stage 6 schoolyard ground detail maps (track, pitch turf, outfield grass, sand, dirt surround, paved walk, kerb)',
  created: '2026-11-17',
  source: { site: 'ambientCG (https://ambientcg.com)', author: 'Lennart Demes / ambientCG', license: { id: 'CC0-1.0', url: 'https://docs.ambientcg.com/license/', attribution: 'not required' }, downloaded: '2026-11-17', archive: 'F:/ezs-work/assets_cc0/textures/ambientcg-<id>/ (zip + LICENSE_SNAPSHOT.md)' },
  maps: stats,
  modifications: [
    'Only the 1K Color map of each material is used; it is converted to luminance, blurred, softly posterised, normalised to mean 0.80 with the listed amplitude and downsized to 256x256 grayscale JPEG.',
    'At runtime the map multiplies a toon material colour chosen per surface (schoolyardGround.js), so the shipped files carry no colour of their own.',
  ],
  script: 'scripts/build_schoolyard_ground_textures.mjs (--src F:/ezs-work/assets_cc0/textures)',
}, null, 2)}\n`)
console.log(Object.entries(stats).map(([k, s]) => `${k}=${s.bytes}`).join(' '), 'total', Object.values(stats).reduce((t, s) => t + s.bytes, 0))
