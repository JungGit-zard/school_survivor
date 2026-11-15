// @vitest-environment node
// 2차 신규 좀비(E89~E106) Kenney Mini Characters 2.0(CC0) 몸체: 표·팔레트·포즈·실제 GLB 추출 계약. 2026-11-15, threemini.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { createOutlineGeometry } from './projectileZombieShotGeometry.js'
import {
  MINI_BODY_IDS, MINI_PALETTE, MINI_PALETTE_SLOTS, MINI_PALETTE_SLOT_INDEX, MINI_PART_KEYS, MINI_PROP_IDS,
  MINI_ZOMBIE_FIRST_TYPE_CODE, MINI_ZOMBIE_TYPE_IDS, MINI_ZOMBIE_VISUALS, MINI_ZOMBIE_VISUAL_BY_TYPE, MINI_ZOMBIE_VISUAL_IDS,
  MINI_MODEL_HEIGHT, miniDefaultVariantIndex, miniPaletteKeyAt, miniPaletteRectOf, miniPaletteSlotRect, miniRemapUv, miniVariantRemap,
} from './miniZombieRoster.js'
import { MINI_POSE_LIFT, MINI_POSE_PROP_LIFT, MINI_POSE_ROOT_YAW, MINI_POSE_STYLES, createMiniPose, fillMiniZombiePose } from './miniZombiePose.js'
import { MINI_ARM_REST_TILT, buildMiniVariant, readMiniZombieScene } from './miniZombieGeometry.js'

const GLB_URL = new URL('../assets/models/kenney_mini/mini_zombies_kenney.glb', import.meta.url)
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const VISUALS = MINI_ZOMBIE_VISUAL_IDS.map((visualId) => [visualId, MINI_ZOMBIE_VISUALS[visualId]])
const ALL_VARIANTS = VISUALS.flatMap(([visualId, visual]) => visual.variants.map((variant, index) => [`${visualId}#${index}`, visualId, visual, variant, index]))
// 행 표(novelZombie2Content.js)는 트리에 있을 때만 대조한다(스테이징 단독 실행에서는 빈 객체).
const NOVEL2_MODULES = import.meta.glob('./novelZombie2Content.js', { eager: true })

// 실제 GLB를 node에서 읽는다: meshopt 디코더 + 텍스처는 자리표시(이미지 디코딩은 브라우저 일이다).
let _raw = null
async function loadRaw() {
  if (_raw) return _raw
  const bytes = readFileSync(GLB_URL)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
  await MeshoptDecoder.ready
  const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject))
  _raw = { gltf, raw: readMiniZombieScene(gltf.scene) }
  return _raw
}

describe('2차 좀비 Kenney Mini 표', () => {
  it('18종 E89~E106(typeCode 94~111)이 visualId 하나씩, 스테이지마다 3종·치프 1종', () => {
    expect(MINI_ZOMBIE_TYPE_IDS).toHaveLength(18)
    expect(MINI_ZOMBIE_FIRST_TYPE_CODE).toBe(94)
    expect(Object.keys(MINI_ZOMBIE_VISUAL_BY_TYPE).sort()).toEqual([...MINI_ZOMBIE_TYPE_IDS].sort())
    for (let stage = 1; stage <= 6; stage += 1) {
      const rows = VISUALS.filter(([, v]) => v.stage === stage)
      expect(rows, `stage ${stage}`).toHaveLength(3)
      expect(rows.filter(([, v]) => v.chief), `stage ${stage}`).toHaveLength(1)
    }
  })

  it('트리의 NOVEL2_ROWS와 visualId·치프 여부가 같다(트리 안에서만)', () => {
    const content = Object.values(NOVEL2_MODULES)[0]
    if (!content) return
    expect(content.NOVEL2_TYPE_IDS).toEqual(MINI_ZOMBIE_TYPE_IDS)
    expect(content.NOVEL2_FIRST_TYPE_CODE).toBe(MINI_ZOMBIE_FIRST_TYPE_CODE)
    for (const id of MINI_ZOMBIE_TYPE_IDS) {
      const row = content.NOVEL2_ROWS[id]
      expect(MINI_ZOMBIE_VISUAL_BY_TYPE[id], id).toBe(row.visualId)
      expect(Boolean(MINI_ZOMBIE_VISUALS[row.visualId].chief), id).toBe(Boolean(row.chief))
    }
  })

  it('몸·소품·슬롯 이름이 모두 실재하고, 이동보조·의료 보조기구는 하나도 안 쓴다', () => {
    const forbidden = /wheelchair|cane|crutch|hearing|aid_|defibrillator/i
    for (const [key, , visual, variant] of ALL_VARIANTS) {
      expect([...MINI_BODY_IDS, 'textbook'], key).toContain(variant.body)
      expect(MINI_POSE_STYLES, key).toContain(variant.style ?? visual.style)
      for (const prop of [...(variant.props ?? []), ...(variant.loose ?? [])]) {
        expect(MINI_PROP_IDS, key).toContain(prop.prop)
        expect(prop.prop).not.toMatch(forbidden)
        if (prop.part) expect(MINI_PART_KEYS, key).toContain(prop.part)
        for (const to of Object.values(prop.recolor ?? {})) expect(MINI_PALETTE_SLOT_INDEX[to], `${key} ${to}`).toBeTypeOf('number')
      }
      for (const slot of [variant.skin, variant.eye, variant.mouth].filter(Boolean)) expect(MINI_PALETTE_SLOT_INDEX[slot], `${key} ${slot}`).toBeTypeOf('number')
      for (const [from, to] of Object.entries(variant.recolor ?? {})) {
        expect(miniPaletteRectOf(from), `${key} ${from}`).not.toBe(null)
        expect(MINI_PALETTE_SLOT_INDEX[to], `${key} ${to}`).toBeTypeOf('number')
      }
    }
    expect(JSON.stringify(MINI_ZOMBIE_VISUALS)).not.toMatch(forbidden)
  })

  it('치프는 그 스테이지 다른 종보다 확실히 크다(1.4 이상)', () => {
    for (let stage = 1; stage <= 6; stage += 1) {
      const rows = VISUALS.filter(([, v]) => v.stage === stage).map(([, v]) => v)
      const chief = rows.find((v) => v.chief)
      expect(chief.scale, `stage ${stage}`).toBeGreaterThanOrEqual(1.4)
      for (const other of rows.filter((v) => !v.chief)) expect(chief.scale - other.scale, `stage ${stage} ${other.id}`).toBeGreaterThanOrEqual(0.1)
    }
  })

  it('같은 스테이지에서 같은 몸을 두 종이 쓰면 리컬러와 소품이 둘 다 다르다', () => {
    for (let stage = 1; stage <= 6; stage += 1) {
      const variants = VISUALS.filter(([, v]) => v.stage === stage).flatMap(([visualId, v]) => v.variants.map((variant) => ({ visualId, variant })))
      for (let a = 0; a < variants.length; a += 1) {
        for (let b = a + 1; b < variants.length; b += 1) {
          const A = variants[a]; const B = variants[b]
          if (A.visualId === B.visualId || A.variant.body !== B.variant.body) continue
          expect(JSON.stringify(A.variant.recolor), `${A.visualId}/${B.visualId}`).not.toBe(JSON.stringify(B.variant.recolor))
          expect(JSON.stringify(A.variant.props ?? []) + JSON.stringify(A.variant.loose ?? []), `${A.visualId}/${B.visualId}`)
            .not.toBe(JSON.stringify(B.variant.props ?? []) + JSON.stringify(B.variant.loose ?? []))
        }
      }
    }
  })

  it('짝·편대 종은 개체마다 몸을 고른다(짝 = 슬롯 짝홀, 편대 = 4슬롯마다 기수 1)', () => {
    expect(miniDefaultVariantIndex('pair', 10, 2)).toBe(0)
    expect(miniDefaultVariantIndex('pair', 11, 2)).toBe(1)
    expect([0, 1, 2, 3].map((i) => miniDefaultVariantIndex('formation', i, 2))).toEqual([0, 1, 1, 1])
    expect(miniDefaultVariantIndex('single', 7, 1)).toBe(0)
  })
})

describe('팔레트 슬롯', () => {
  it('슬롯 칸은 512² 안, 서로 겹치지 않고, Kenney가 쓰는 칸(1행 0~9열, 2·3행)을 건드리지 않는다', () => {
    const seen = new Set()
    MINI_PALETTE_SLOTS.forEach(([name], index) => {
      const r = miniPaletteSlotRect(index)
      expect(r.x + r.width).toBeLessThanOrEqual(MINI_PALETTE.size)
      expect(r.y === 0 || (r.y === 128 && r.x >= 320), name).toBe(true)
      const key = `${r.x},${r.y}`; expect(seen.has(key), name).toBe(false); seen.add(key)
      // 슬롯 가운데 UV가 다시 같은 슬롯 이름으로 읽힌다
      expect(miniPaletteKeyAt((r.x + r.width / 2) / 512, (r.y + 64) / 512)).toBe(name)
    })
    expect(MINI_PALETTE_SLOTS.length).toBeLessThanOrEqual(88)
  })

  it('칸 옮기기는 칸 안 상대 위치(그라디언트 높이)를 지킨다', () => {
    const u = (5 * 32 + 16) / 512; const v = (2 * 128 + 100) / 512 // r2c5, 칸 위에서 100px
    expect(miniPaletteKeyAt(u, v)).toBe('r2c5')
    const [nu, nv] = miniRemapUv(u, v, 'zGreen')
    expect(miniPaletteKeyAt(nu, nv)).toBe('zGreen')
    const r = miniPaletteSlotRect('zGreen')
    expect(nv * 512 - r.y).toBeCloseTo(100, 0)
    expect(miniVariantRemap({ skin: 'zGreen', eye: 'eyeRed', recolor: { r1c1: 'teamBlue' } }, 'r2c5')).toEqual({ r2c5: 'zGreen', eye: 'eyeRed', r1c1: 'teamBlue' })
  })
})

describe('2차 좀비 포즈', () => {
  const styles = [...new Set(ALL_VARIANTS.map(([, , visual, variant]) => variant.style ?? visual.style))]
  it.each(styles)('%s: 모든 상태에서 값이 유한하고, 예고·공격·회복이 평시와 다르다', (style) => {
    const out = createMiniPose()
    const normal = Array.from(fillMiniZombiePose(out, style, 'normal', 1.3, false, 0.2))
    expect(normal.every(Number.isFinite)).toBe(true)
    for (const phase of ['warn', 'charge', 'stun']) {
      const posed = Array.from(fillMiniZombiePose(out, style, phase, 1.3, false, 0.2))
      expect(posed.every(Number.isFinite), `${style} ${phase}`).toBe(true)
      expect(posed, `${style} ${phase}`).not.toEqual(normal)
    }
  })

  it('걷는 종은 평시에 두 팔이 앞으로 간다(좀비 문법), 의자·미믹·기수는 예외', () => {
    const out = createMiniPose()
    for (const style of styles.filter((s) => !['mimic', 'swivel', 'carry', 'serve', 'dribble'].includes(s))) {
      fillMiniZombiePose(out, style, 'normal', 0.7)
      expect(out[9], `${style} armL`).toBeLessThan(-0.8)
      expect(out[12], `${style} armR`).toBeLessThan(-0.8)
    }
  })

  it('종 고유 신호: 미믹 뚜껑이 공격에 열리고, 의자는 예고에 돌고, 드리블 공은 예고에 더 높고, 기수는 떠 있다', () => {
    const out = createMiniPose()
    expect(fillMiniZombiePose(out, 'mimic', 'charge', 1)[15]).toBeLessThan(-0.8)
    expect(fillMiniZombiePose(out, 'mimic', 'normal', 1.5)[15]).toBe(0)
    expect(Math.abs(fillMiniZombiePose(out, 'swivel', 'warn', 1)[MINI_POSE_ROOT_YAW])).toBeGreaterThan(1)
    const high = fillMiniZombiePose(out, 'dribble', 'warn', 0.25)[MINI_POSE_PROP_LIFT]
    expect(high).toBeGreaterThan(fillMiniZombiePose(out, 'dribble', 'normal', 0.25)[MINI_POSE_PROP_LIFT])
    expect(fillMiniZombiePose(out, 'rider', 'normal', 1)[MINI_POSE_LIFT]).toBeGreaterThan(0.1)
    expect(fillMiniZombiePose(out, 'threeLegged', 'stun', 1)[18]).toBeGreaterThan(1)
  })
})

describe('실제 GLB(mini_zombies_kenney.glb)', () => {
  it('meshopt GLB 한 개, 128KB 이하, 노드 1·프리미티브 1, PNG 아틀라스 512² 한 장', () => {
    const glb = readFileSync(GLB_URL)
    expect(glb.length).toBeLessThanOrEqual(128 * 1024)
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
    expect(json.extensionsRequired).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']))
    expect(json.extensionsUsed).not.toContain('KHR_texture_transform') // UV 칸 계산이 텍스처 변환 없이 맞아야 한다
    expect(json.meshes).toHaveLength(1); expect(json.meshes[0].primitives).toHaveLength(1)
    expect(json.images).toHaveLength(1); expect(json.images[0].mimeType).toBe('image/png')
    const view = json.bufferViews[json.images[0].bufferView]
    const binStart = 20 + glb.readUInt32LE(12) + 8
    const png = glb.subarray(binStart + (view.byteOffset ?? 0), binStart + (view.byteOffset ?? 0) + view.byteLength)
    expect(png.readUInt32BE(16)).toBe(512); expect(png.readUInt32BE(20)).toBe(512)
  })

  it('파트 표: Kenney 15명 × 6파트 + 교과서 2파트 + 소품, 피부 칸이 몸마다 있다', async () => {
    const { raw } = await loadRaw()
    expect(Object.keys(raw.bodies).sort()).toEqual([...MINI_BODY_IDS, 'textbook'].sort())
    for (const body of MINI_BODY_IDS) {
      expect(Object.keys(raw.bodies[body].parts).sort(), body).toEqual([...MINI_PART_KEYS].sort())
      expect(raw.bodies[body].skinCell, body).toMatch(/^r[1-3]c\d+$/)
    }
    expect(Object.keys(raw.bodies.textbook.parts).sort()).toEqual(['head', 'torso'])
    const usedProps = new Set(ALL_VARIANTS.flatMap(([, , , v]) => [...(v.props ?? []), ...(v.loose ?? [])].map((p) => p.prop)))
    for (const prop of usedProps) expect(raw.props[prop], prop).toBeTruthy()
  })

  it('몸 키는 공통(발 0 ~ 머리 위 ≈ 0.67)이고 머리 위 피벗은 몸통 자식이다', async () => {
    const { raw } = await loadRaw()
    for (const body of MINI_BODY_IDS) {
      const head = raw.bodies[body].parts.head
      head.geometry.computeBoundingBox()
      expect(head.parent, body).toBe('torso')
      expect(head.geometry.boundingBox.max.y, body).toBeGreaterThan(MINI_MODEL_HEIGHT - 0.03)
      expect(head.geometry.boundingBox.max.y, body).toBeLessThan(MINI_MODEL_HEIGHT + 0.2) // 머리 묶음·모자(female-a 0.78, male-c 0.79, worker 안전모 0.82)
      raw.bodies[body].parts.legL.geometry.computeBoundingBox()
      expect(raw.bodies[body].parts.legL.geometry.boundingBox.min.y, body).toBeCloseTo(0, 2)
    }
  })

  it.each(ALL_VARIANTS.map(([key]) => key))('%s: 변형 빌드 — 파트·외곽선·면 법선, 피부는 좀비색, 눈은 지정색', async (key) => {
    const [, , visual, variant] = ALL_VARIANTS.find(([k]) => k === key)
    const { raw } = await loadRaw()
    const built = buildMiniVariant(raw, variant, createOutlineGeometry)
    expect(built.parts.map((p) => p.key)).toEqual(variant.body === 'textbook' ? ['torso', 'head'] : [...MINI_PART_KEYS])
    const keys = new Set()
    for (const part of built.parts) {
      const { geometry, outlineGeometry } = part
      expect(geometry.index, part.key).toBe(null) // 풀린(면 법선) 지오메트리
      expect(geometry.attributes.normal.count).toBe(geometry.attributes.position.count)
      expect(Array.from(geometry.attributes.position.array).every(Number.isFinite), part.key).toBe(true)
      expect(outlineGeometry.attributes.position.count).toBe(geometry.attributes.position.count)
      const uv = geometry.attributes.uv
      for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
    }
    const skinCell = raw.bodies[variant.body].skinCell
    if (variant.skin && skinCell) {
      expect(keys.has(skinCell), `${key} skin ${skinCell} left`).toBe(false)
      expect(keys.has(variant.skin), `${key} ${variant.skin}`).toBe(true)
    }
    if (variant.eye) expect(keys.has(variant.eye), `${key} eye`).toBe(true)
    for (const from of Object.keys(variant.recolor ?? {})) expect(keys.has(from), `${key} ${from} left`).toBe(false)
    expect(built.loose).toHaveLength((variant.loose ?? []).length)
    void visual
  })

  it('팔은 쉬는 자세로 내려 둔다(어깨 아래로), 소품은 손·머리 위치에 붙는다', async () => {
    const { raw } = await loadRaw()
    const built = buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-coffee-runner'].variants[0], null)
    const armR = built.parts.find((p) => p.key === 'armR').geometry
    armR.computeBoundingBox()
    expect(armR.boundingBox.min.y).toBeLessThan(-0.2) // 피벗(어깨)에서 아래로
    expect(MINI_ARM_REST_TILT).toBeGreaterThan(0.9)
    const copier = buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-photocopier'].variants[0], null).parts.find((p) => p.key === 'head').geometry
    copier.computeBoundingBox()
    expect(copier.boundingBox.max.x - copier.boundingBox.min.x).toBeGreaterThan(0.48) // 복사기 상자가 머리를 덮는다
  })
})

describe('출처', () => {
  it('CC0 출처 기록과 원본 License.txt가 GLB 옆에 있다', () => {
    const provenance = JSON.parse(read('../assets/models/kenney_mini/PROVENANCE.json'))
    expect(provenance.license.id).toBe('CC0-1.0')
    expect(provenance.source.url).toBe('https://kenney.nl/assets/mini-characters')
    expect(provenance.source.zip.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(provenance.membersUsed.filter((m) => /character-.+\.glb$/.test(m.member))).toHaveLength(MINI_BODY_IDS.length)
    expect(provenance.membersUsed.some((m) => /wheelchair|cane|crutch|hearing|defibrillator/.test(m.member))).toBe(false)
    expect(read('../assets/models/kenney_mini/License.txt')).toContain('Creative Commons Zero')
  })
})
