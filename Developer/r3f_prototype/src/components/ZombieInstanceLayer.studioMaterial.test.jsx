// 풀 좀비(ZombieInstanceLayer)가 스튜디오 재질 튜닝·기본 발광, E07 넘침 몸통의 루트 변환,
// 미니 체력바·스폰 연기 Studio 아이템을 스튜디오/StudioTunedGroup과 같은 값으로 받는지 확인한다.
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

let frameCb = null
const effects = []
vi.mock('react', async (orig) => {
  const real = await orig()
  return { ...real, useMemo: (f) => f(), useRef: (v) => ({ current: v }), useEffect: (f) => { effects.push(f) }, useLayoutEffect: (f) => { f() } }
})
vi.mock('../lib/toon.js', async (orig) => ({ ...(await orig()), getToonGradient: () => new THREE.DataTexture(new Uint8Array(4), 1, 1) }))
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb) => { frameCb = cb },
  useThree: () => ({ camera: new THREE.PerspectiveCamera() }),
  useLoader: () => new THREE.Texture(),
}))

globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } }
const {
  default: ZombieInstanceLayer, MATERIAL_STRIDE, POSED_SLOT_BASE, buildPooledStudioMaterialTable,
  installInstanceEmissive, installInstanceOutline, resolvePooledZombieVisual,
} = await import('./ZombieInstanceLayer.jsx')
const { PROCEDURAL_FACE_ZOMBIE_CAPACITY } = await import('./PooledEnemyVisuals.js')
const { applyStudioTuning, tuneStudioColorInto } = await import('./StudioTunedGroup.jsx')
const { DEFAULT_STUDIO_TUNING, normalizeStudioTuning } = await import('../lib/graphicsStudioConfig.js')
const { commitFirebaseStudioRuntime } = await import('../lib/studioRuntimeState.js')
const { enemyPool, playerPos } = await import('../lib/refs.js')

function collect(el, out = []) {
  if (!el) return out
  if (Array.isArray(el)) { el.forEach((x) => collect(x, out)); return out }
  if (el.props?.object) out.push({ object: el.props.object, renderOrder: el.props.renderOrder })
  if (el.props?.children) collect(el.props.children, out)
  return out
}

const tree = ZombieInstanceLayer({ resetKey: 0 })
const primitives = collect(tree)
const bodies = primitives.map((x) => x.object).filter((x) => x.userData?.instanceEmissive)
const outlines = primitives.map((x) => x.object).filter((x) => x.userData?.instanceOutline)
const bars = [20, 21, 22, 23].map((order) => primitives.find((x) => x.renderOrder === order).object)
const smoke = primitives.find((x) => x.renderOrder === 100).object
const mm = new THREE.Matrix4(); const pos = new THREE.Vector3(); const col = new THREE.Vector3(); const c = new THREE.Color()

function setTunings(tunings) {
  commitFirebaseStudioRuntime({ tunings }, { revision: 1 })
  effects.forEach((effect) => effect())
}
function clearPool() {
  for (let i = 0; i <= enemyPool.highestActive; i++) if (enemyPool.active[i]) enemyPool.despawnIndex(i, enemyPool.generation[i])
}
function spawn(type, x, z, extra = {}) {
  expect(enemyPool.spawnInto({}, { type, x, y: 0, z, hp: 10, maxHp: 10, visualScale: 1, runDirX: 1, runDirZ: 0, spawnTimer: 5000, ...extra })).toBe(true)
}
function frame() { frameCb({}, 0.016) }
function xScale(mesh, slot) { mesh.getMatrixAt(slot, mm); return col.setFromMatrixColumn(mm, 0).length() }
function translation(mesh, slot) { mesh.getMatrixAt(slot, mm); return pos.setFromMatrixPosition(mm).clone() }

const E01_TUNING = { color: '#3070ff', colorStrength: 0.6, brightness: 1.5, saturation: 0.7, emissiveIntensity: 0.7, outlineColor: '#ff00ff', outlineOpacity: 0.5, outlineThickness: 2.2 }
const e01 = resolvePooledZombieVisual(1)
const e01Hex = (role) => (role === 'skin' ? e01.palette.skin : role === 'eye' ? e01.palette.eye : role === 'foot' ? 0x1a1a1a : e01.palette.body)
playerPos.set(0, 0, 0)

describe('pooled zombie Studio material table', () => {
  it('stays off when no material value is tuned (rev 1952 shape: transform-only entries)', () => {
    expect(buildPooledStudioMaterialTable(1, 'zombie-e01', {})).toBeNull()
    expect(buildPooledStudioMaterialTable(1, 'zombie-e01', { 'zombie-e01::part::0.0.0.0.1': { scale: 1.15 } })).toBeNull()
    expect(buildPooledStudioMaterialTable(4, 'zombie-e04', { 'zombie-e04': { positionX: 0.03 } })).toBeNull()
  })

  it('bakes exactly what applyStudioTuning gives each box part (colour, emissive, outline colour/opacity/thickness)', () => {
    const table = buildPooledStudioMaterialTable(1, 'zombie-e01', { 'zombie-e01': E01_TUNING })
    e01.partRoles.forEach((role, j) => {
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96 })
      outlineMaterial.stencilFunc = THREE.NotEqualStencilFunc
      const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial({ color: e01Hex(role), emissive: e01Hex(role), emissiveIntensity: 0.12 }))
      const hull = new THREE.Mesh(new THREE.BoxGeometry(), outlineMaterial)
      applyStudioTuning(new THREE.Group().add(body, hull), E01_TUNING)
      const o = j * MATERIAL_STRIDE
      expect(table[o]).toBeCloseTo(body.material.color.r, 6)
      expect(table[o + 1]).toBeCloseTo(body.material.color.g, 6)
      expect(table[o + 2]).toBeCloseTo(body.material.color.b, 6)
      expect(table[o + 3]).toBeCloseTo(body.material.emissiveIntensity, 6)
      expect(table[o + 4]).toBeCloseTo(hull.material.color.r, 6)
      expect(table[o + 5]).toBeCloseTo(hull.material.color.g, 6)
      expect(table[o + 6]).toBeCloseTo(hull.material.color.b, 6)
      expect(table[o + 7]).toBeCloseTo(hull.material.opacity, 6)
      expect(table[o + 8]).toBeCloseTo(hull.scale.x, 6)
    })
  })

  it('repaints only the parts a part/group entry names, part after group, and ignores transform-only entries', () => {
    const table = buildPooledStudioMaterialTable(1, 'zombie-e01', {
      'zombie-e01': { brightness: 1.4 },
      'zombie-e01::group::0.0.0': { color: '#0000ff', colorStrength: 1 },
      'zombie-e01::part::0.0.0': { color: '#ff0000', colorStrength: 1, emissiveIntensity: 0.5 },
      'zombie-e01::part::0.3.0': { scale: 1.3 },
    })
    // slot 0 = head: the part entry wins over the group entry on the same path
    expect([table[0], table[1], table[2]].map((v) => Number(v.toFixed(6)))).toEqual([1, 0, 0])
    expect(table[3]).toBeCloseTo(0.5, 6)
    // slot 6 = right arm: transform-only entry keeps the root tint
    const ref = tuneStudioColorInto(new THREE.Color(), new THREE.Color(e01.palette.body), normalizeStudioTuning({ brightness: 1.4 }))
    const o = 6 * MATERIAL_STRIDE
    expect(table[o]).toBeCloseTo(ref.r, 6)
    expect(table[o + 1]).toBeCloseTo(ref.g, 6)
    expect(table[o + 2]).toBeCloseTo(ref.b, 6)
    expect(table[o + 3]).toBeCloseTo(DEFAULT_STUDIO_TUNING.emissiveIntensity, 6)
  })
})

describe('ZombieInstanceLayer Studio material frame path', () => {
  it('gives Studio-backed bodies the Studio default emissive and keeps non-Studio types (E46, E08) at zero', () => {
    setTunings({})
    clearPool(); spawn('E01', 0, 1); spawn('E46', 1.5, 1); spawn('E08', -1.5, 1)
    frame()
    expect(bodies[0].count).toBe(1)
    expect(bodies[0].userData.instanceEmissive.array[0]).toBeCloseTo(DEFAULT_STUDIO_TUNING.emissiveIntensity, 6)
    expect(bodies[0].userData.instanceEmissive.updateRanges).toEqual([{ start: 0, count: 1 }])
    expect(bodies[POSED_SLOT_BASE].count).toBe(1)
    expect(bodies[POSED_SLOT_BASE].userData.instanceEmissive.array[0]).toBe(0)
    const coin = resolvePooledZombieVisual(16).slotBase
    expect(bodies[coin].count).toBe(1)
    expect(bodies[coin].userData.instanceEmissive.array[0]).toBe(0)
    // default outline stays static: no per-frame outline upload
    expect(outlines[0].userData.instanceOutline.updateRanges).toEqual([])
  })

  it('paints instances from the table, writes outline colour/alpha while tuned, and restores the default outline after', () => {
    setTunings({ 'zombie-e01': E01_TUNING })
    clearPool(); spawn('E01', 0, 1)
    frame()
    const table = buildPooledStudioMaterialTable(1, 'zombie-e01', { 'zombie-e01': E01_TUNING })
    bodies[0].getColorAt(0, c)
    expect(c.r).toBeCloseTo(table[0], 6); expect(c.g).toBeCloseTo(table[1], 6); expect(c.b).toBeCloseTo(table[2], 6)
    expect(bodies[0].userData.instanceEmissive.array[0]).toBeCloseTo(0.7, 6)
    const outline = outlines[0].userData.instanceOutline
    expect(Array.from(outline.array.slice(0, 4)).map((v) => Number(v.toFixed(5)))).toEqual([table[4], table[5], table[6], table[7]].map((v) => Number(v.toFixed(5))))
    expect(outline.updateRanges).toEqual([{ start: 0, count: 4 }])
    // hull scale = inflate(head 1.08) × Studio outline thickness factor
    expect(xScale(outlines[0], 0) / xScale(bodies[0], 0)).toBeCloseTo((1 + (1.08 - 1) * 2) * table[8], 5)

    setTunings({})
    const base = new THREE.Color(DEFAULT_STUDIO_TUNING.outlineColor)
    expect(Array.from(outline.array.slice(0, 4))).toEqual(Array.from(new Float32Array([base.r, base.g, base.b, DEFAULT_STUDIO_TUNING.outlineOpacity])))
    frame()
    bodies[0].getColorAt(0, c)
    expect(c.getHex()).toBe(new THREE.Color(e01.palette.skin).getHex())
  })

  it('E07 bodies beyond the face-layer slots take the E07 Studio root transform', () => {
    expect(resolvePooledZombieVisual(15).studioTuned).toBe(true)
    clearPool()
    for (let i = 0; i < PROCEDURAL_FACE_ZOMBIE_CAPACITY + 1; i++) spawn('E07', -8 + i * 0.5, 1)
    setTunings({})
    frame()
    expect(bodies[3].count).toBe(1)
    const plain = xScale(bodies[3], 0)
    expect(bodies[3].userData.instanceEmissive.array[0]).toBeCloseTo(DEFAULT_STUDIO_TUNING.emissiveIntensity, 6)
    setTunings({ 'zombie-procedural-face-test': { scale: 2 } })
    frame()
    expect(xScale(bodies[3], 0) / plain).toBeCloseTo(2, 5)
    setTunings({})
  })

  it('pooled health bars follow ui-mini-health-bar the way MiniHealthBar does', () => {
    setTunings({})
    clearPool(); spawn('E01', 1, 1, { hp: 5, maxHp: 10 })
    frame()
    expect(translation(bars[1], 0).toArray().map((v) => Number(v.toFixed(5)))).toEqual([1, 0.72, 1])
    expect(xScale(bars[1], 0)).toBeCloseTo(0.32, 5)
    expect(bars[1].material.color.getHex()).toBe(0xd72832)

    const barTuning = { positionY: 0.5, scale: 2, color: '#2060ff', colorStrength: 0.85 }
    setTunings({ 'ui-mini-health-bar': barTuning })
    frame()
    expect(translation(bars[1], 0).toArray().map((v) => Number(v.toFixed(5)))).toEqual([1, 0.5 + 2 * 0.72, 1])
    expect(xScale(bars[1], 0)).toBeCloseTo(0.64, 5)
    // half-full fill: left-anchored offset is in the bar's own (Studio-scaled) frame
    expect(translation(bars[3], 0).x).toBeCloseTo(1 - 2 * (0.32 * 0.5) / 2, 5)
    expect(xScale(bars[3], 0)).toBeCloseTo(2 * 0.32 * 0.5, 5)
    const expected = tuneStudioColorInto(new THREE.Color(), new THREE.Color(0xd72832), normalizeStudioTuning(barTuning))
    expect(bars[1].material.color.r).toBeCloseTo(expected.r, 6)
    expect(bars[1].material.color.b).toBeCloseTo(expected.b, 6)
    setTunings({})
    expect(bars[1].material.color.getHex()).toBe(0xd72832)
  })

  it('pooled spawn puffs follow vfx-zombie-spawn-puff around their own anchor', () => {
    setTunings({})
    clearPool(); spawn('E01', 1, 1, { spawnTimer: 100 })
    frame()
    const t = 100 / 850
    const size = 0.333 * (1.7 + (1 - (1 - t) * (1 - t)) * (3.1 - 1.7))
    expect(translation(smoke, 0).y).toBeCloseTo(0.333 * (1 + t * 0.32), 5)
    expect(xScale(smoke, 0)).toBeCloseTo(size, 5)
    setTunings({ 'vfx-zombie-spawn-puff': { scale: 2, positionY: 0.3, color: '#ff30ff', colorStrength: 0.8 } })
    frame()
    const p = translation(smoke, 0)
    expect([p.x, p.z]).toEqual([1, 1])
    expect(p.y).toBeCloseTo(0.3 + 2 * 0.333 * (1 + t * 0.32), 5)
    expect(xScale(smoke, 0)).toBeCloseTo(2 * size, 5)
    expect(smoke.material.color.getHex()).not.toBe(0xffffff)
    setTunings({})
    expect(smoke.material.color.getHex()).toBe(0xffffff)
  })
})

describe('pooled Studio shader patches (three r164 chunks)', () => {
  it('multiplies emissive by the instance colour and instance intensity after emissivemap_fragment', () => {
    const geometry = new THREE.BoxGeometry(); const material = new THREE.MeshToonMaterial()
    installInstanceEmissive(geometry, material, 2)
    const shader = { vertexShader: THREE.ShaderLib.toon.vertexShader, fragmentShader: THREE.ShaderLib.toon.fragmentShader }
    expect(shader.fragmentShader).toContain('#include <emissivemap_fragment>')
    material.onBeforeCompile(shader)
    expect(shader.vertexShader).toContain('pooledInstanceEmissive = instanceEmissive;')
    const chunk = shader.fragmentShader.indexOf('#include <emissivemap_fragment>')
    expect(shader.fragmentShader.indexOf('totalEmissiveRadiance *= vColor;')).toBeGreaterThan(chunk)
    expect(shader.fragmentShader.indexOf('totalEmissiveRadiance *= pooledInstanceEmissive;')).toBeGreaterThan(chunk)
    expect(material.customProgramCacheKey()).toBe('pooled-zombie-emissive-v1')
    geometry.dispose(); material.dispose()
  })

  it('multiplies outline colour and alpha by the instance vec4 after color_fragment, defaulting to the Studio outline', () => {
    const geometry = new THREE.BoxGeometry(); const material = new THREE.MeshBasicMaterial()
    const attribute = installInstanceOutline(geometry, material, 2)
    const base = new THREE.Color(DEFAULT_STUDIO_TUNING.outlineColor)
    expect(Array.from(attribute.array.slice(4, 8))).toEqual(Array.from(new Float32Array([base.r, base.g, base.b, DEFAULT_STUDIO_TUNING.outlineOpacity])))
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader }
    material.onBeforeCompile(shader)
    expect(shader.vertexShader).toContain('pooledInstanceOutline = instanceOutline;')
    expect(shader.fragmentShader.indexOf('diffuseColor *= pooledInstanceOutline;')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <color_fragment>'))
    expect(material.customProgramCacheKey()).toBe('pooled-zombie-outline-v1')
    geometry.dispose(); material.dispose()
  })

  it('gives every pooled body and outline mesh its own geometry so per-instance attributes never leak between meshes', () => {
    const geometries = new Set([...bodies, ...outlines].map((mesh) => mesh.geometry))
    expect(geometries.size).toBe(bodies.length + outlines.length)
  })
})
