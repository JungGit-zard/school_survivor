import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import {
  STAGE_FLOOR_OCCLUSION,
  accumulateStageFloorIrradiance,
  buildStageFloorLightMap,
  getStageFloorLightHalfExtent,
  getStageFloorLightMapTransform,
  prepareStageFloorLights,
  sampleStageFloorIrradiance,
  stageFloorLightMapProps,
  stageFloorOcclusionAt,
} from './stageFloorLightBake.js'
import { getStageLightingProfile, STAGE_LIGHTING_PROFILES } from './stageLightingProfile.js'

const PLAYABLE_STAGE_IDS = ['stage1', 'stage2', 'stage3', 'stage4']

const luminance = ([r, g, b]) => r + g + b

describe('바닥 색 구역 굽기 — stageLightingProfile 정본에서 유도', () => {
  it.each(PLAYABLE_STAGE_IDS)('%s의 색 구역 3개가 프로파일 target 위치에 그대로 남는다', (stageId) => {
    const profile = getStageLightingProfile(stageId)
    expect(profile).toHaveLength(3)
    const prepared = prepareStageFloorLights(profile)
    expect(prepared).toHaveLength(3)

    for (const light of profile) {
      const [tx, , tz] = light.target
      const atTarget = accumulateStageFloorIrradiance(prepared, tx, tz)
      // 구역 한가운데는 밝다.
      expect(luminance(atTarget)).toBeGreaterThan(0)

      // 구역은 그 색이다: 광원 색의 최대 채널이 바닥에서도 최대 채널이어야 한다.
      const lightColor = new THREE.Color(light.color)
      const channels = [lightColor.r, lightColor.g, lightColor.b]
      const dominant = channels.indexOf(Math.max(...channels))
      expect(atTarget.indexOf(Math.max(...atTarget))).toBe(dominant)
    }
  })

  it.each(PLAYABLE_STAGE_IDS)('%s는 각 광원의 distance 컷오프 밖에서 0이다', (stageId) => {
    const profile = getStageLightingProfile(stageId)

    for (const light of profile) {
      const [lx, , lz] = light.position
      const [tx, , tz] = light.target
      const single = prepareStageFloorLights([light])
      const beyond = light.distance + 1

      // 원뿔 축이 바닥에 닿는 지점(= target)은 반드시 켜져 있어야 한다.
      expect(luminance(accumulateStageFloorIrradiance(single, tx, tz))).toBeGreaterThan(0)
      expect(accumulateStageFloorIrradiance(single, lx + beyond, lz)).toEqual([0, 0, 0])
      expect(accumulateStageFloorIrradiance(single, lx, lz + beyond)).toEqual([0, 0, 0])
    }
  })

  it('angle이 넓을수록 바닥 구역 반경이 커진다 (angle → 반경 유도)', () => {
    const base = { position: [0, 7, 0], target: [0, 0, 0], color: '#ffffff', intensity: 100, distance: 40, penumbra: 0.2 }
    const narrow = prepareStageFloorLights([{ ...base, angle: 0.4 }])
    const wide = prepareStageFloorLights([{ ...base, angle: 0.9 }])
    // 좁은 원뿔의 바닥 반경(7·tan 0.4)과 넓은 원뿔의 반경(7·tan 0.9) 사이 지점.
    const probe = 7 * Math.tan(0.65)

    expect(accumulateStageFloorIrradiance(narrow, probe, 0)).toEqual([0, 0, 0])
    expect(luminance(accumulateStageFloorIrradiance(wide, probe, 0))).toBeGreaterThan(0)
  })

  it('penumbra가 클수록 가장자리가 넓게 페이드된다 (penumbra → 페이드 폭 유도)', () => {
    const base = { position: [0, 7, 0], target: [0, 0, 0], color: '#ffffff', intensity: 100, distance: 40, angle: 0.8 }
    const hard = prepareStageFloorLights([{ ...base, penumbra: 0.02 }])
    const soft = prepareStageFloorLights([{ ...base, penumbra: 0.9 }])
    const probe = 7 * Math.tan(0.4) // 원뿔 반경의 중간쯤

    const hardEdge = luminance(accumulateStageFloorIrradiance(hard, probe, 0))
    const softEdge = luminance(accumulateStageFloorIrradiance(soft, probe, 0))

    expect(hardEdge).toBeGreaterThan(0)
    expect(softEdge).toBeGreaterThan(0)
    expect(softEdge).toBeLessThan(hardEdge)
    // 정중앙은 두 설정이 같다 — penumbra는 가장자리만 바꾼다.
    expect(luminance(accumulateStageFloorIrradiance(soft, 0, 0)))
      .toBeCloseTo(luminance(accumulateStageFloorIrradiance(hard, 0, 0)))
  })

  it.each(PLAYABLE_STAGE_IDS)('%s는 굽는 범위 밖에서 정확히 0이다 (ClampToEdge 가장자리 보증)', (stageId) => {
    const profile = getStageLightingProfile(stageId)
    const prepared = prepareStageFloorLights(profile)
    const half = getStageFloorLightHalfExtent(profile)

    expect(half).toBeGreaterThan(0)
    for (const [x, z] of [[half, 0], [-half, 0], [0, half], [0, -half], [half, half]]) {
      expect(accumulateStageFloorIrradiance(prepared, x, z)).toEqual([0, 0, 0])
    }
  })

  it('half extent가 모든 광원의 distance 도달 범위를 덮는다', () => {
    for (const [stageId, profile] of Object.entries(STAGE_LIGHTING_PROFILES)) {
      const half = getStageFloorLightHalfExtent(profile)
      for (const light of profile) {
        const [lx, , lz] = light.position
        expect(half).toBeGreaterThanOrEqual(Math.abs(lx) + light.distance)
        expect(half).toBeGreaterThanOrEqual(Math.abs(lz) + light.distance)
      }
      // e6b93e7c added stage6-stage10 expansion profiles.
      expect(stageId).toMatch(/^stage(?:[1-4]|[6-9]|10)$/)
    }
  })

  it('Stage 4는 새 급식실 lightMap 프로필을 가지며 미지 스테이지만 굽지 않는다', () => {
    expect(getStageFloorLightHalfExtent(getStageLightingProfile('stage4'))).toBeGreaterThan(0)
    expect(prepareStageFloorLights(getStageLightingProfile('stage4'))).toHaveLength(3)
    // document가 없는 테스트 환경에서는 캔버스 생성만 생략된다. 프로필 자체는 Stage 4까지 존재한다.
    expect(buildStageFloorLightMap('stage4', { width: 18.72, depth: 32 })).toBeNull()
    expect(buildStageFloorLightMap('unknown-stage', { width: 200, depth: 200 })).toBeNull()
    expect(stageFloorLightMapProps(null)).toEqual({})
  })

  it('lightMap UV 변환이 월드 원점을 캔버스 중앙에 놓는다', () => {
    const span = 68
    const width = 200
    const depth = 200
    const { repeatX, repeatY, offsetX, offsetY } = getStageFloorLightMapTransform(span, width, depth)

    // planeGeometry uv: u = (x + w/2)/w, v = (h/2 - z)/h
    const sampleU = (x) => ((x + width / 2) / width) * repeatX + offsetX
    const sampleV = (z) => ((depth / 2 - z) / depth) * repeatY + offsetY

    expect(sampleU(0)).toBeCloseTo(0.5)
    expect(sampleV(0)).toBeCloseTo(0.5)
    // 굽는 영역의 양 끝이 텍스처 0과 1에 정확히 대응한다.
    expect(sampleU(-span / 2)).toBeCloseTo(0)
    expect(sampleU(span / 2)).toBeCloseTo(1)
    expect(sampleV(span / 2)).toBeCloseTo(0)
    expect(sampleV(-span / 2)).toBeCloseTo(1)
  })

  it('Stage 1 바닥(20 × 28.8)에서도 같은 월드 좌표 대응이 성립한다', () => {
    const span = 55
    const { repeatX, repeatY, offsetX, offsetY } = getStageFloorLightMapTransform(span, 20, 28.8)

    expect(((9 + 10) / 20) * repeatX + offsetX).toBeCloseTo((9 + span / 2) / span)
    expect(((14.4 - 5) / 28.8) * repeatY + offsetY).toBeCloseTo((span / 2 - 5) / span)
  })

  it('sampleStageFloorIrradiance는 prepare 경로와 같은 값을 낸다', () => {
    const profile = getStageLightingProfile('stage1')
    const prepared = prepareStageFloorLights(profile)

    expect(sampleStageFloorIrradiance(profile, 0, -9)).toEqual(
      accumulateStageFloorIrradiance(prepared, 0, -9),
    )
  })

  it('document가 없는 환경에서는 캔버스를 만들지 않는다', () => {
    expect(typeof document).toBe('undefined')
    expect(buildStageFloorLightMap('stage1', { width: 20, depth: 28.8 })).toBeNull()
  })
})

// node 테스트 환경에는 document가 없어 캔버스 대신 putImageData 바이트만 받아 두는 가짜를 쓴다.
function bakeWithFakeCanvas(stageId, options) {
  let image = null
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (next) => { image = next },
      }),
    }),
  }
  try {
    const bake = buildStageFloorLightMap(stageId, options)
    return { bake, data: image?.data ?? null }
  } finally {
    delete globalThis.document
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

describe('P2 — stage4 작업등은 위험 경고색과 겹치지 않는다', () => {
  const stage4 = prepareStageFloorLights(getStageLightingProfile('stage4'))
  // 선형 RGB 기준 채도(HSV S)와 색상. HSL 채도는 흰색 근처에서 1로 튀어 쓰지 않는다.
  const chroma = ([r, g, b]) => {
    const max = Math.max(r, g, b)
    return { s: 1 - Math.min(r, g, b) / max, h: new THREE.Color(r / max, g / max, b / max).getHSL({}).h }
  }
  const colorChroma = (hex) => {
    const c = new THREE.Color(hex)
    return chroma([c.r, c.g, c.b])
  }

  it('가마솥 경고 링 반경 3.2 units(0.8블록)의 바닥 빛은 무채색에 가깝고 노랑이 아니다', () => {
    const warning = colorChroma('#FFE576')
    for (const [x, z] of [[3.2, 0], [-3.2, 0], [0, 3.2], [0, -3.2], [2.26, 2.26]]) {
      const baked = accumulateStageFloorIrradiance(stage4, x, z)
      expect(luminance(baked)).toBeGreaterThan(0)
      const floor = chroma(baked)
      expect(floor.s).toBeLessThan(0.2)
      // 경고 링은 진한 노랑이다. 바닥 빛과 채도 차이로 확실히 갈라진다.
      expect(warning.s - floor.s).toBeGreaterThan(0.5)
      // 냉백: 파랑 채널이 빨강 채널 이상(따뜻한 쪽으로 기울지 않음).
      expect(baked[2]).toBeGreaterThanOrEqual(baked[0])
    }
  })

  it('북쪽 구역은 E04 투사체 청록 #34D6B8과 색상(hue)이 분리된다', () => {
    const projectile = colorChroma('#34D6B8')
    const north = chroma(accumulateStageFloorIrradiance(stage4, 0, -10))
    expect(Math.abs(north.h - projectile.h)).toBeGreaterThan(0.08)
    expect(north.s).toBeLessThan(projectile.s / 2)
  })
})

describe('P1 — stage4 접지 음영·경계 띠 계수', () => {
  const box = { x: 0, z: 0, halfX: 1, halfZ: 0.5, cosY: 1, sinY: 0 }
  const occlusion = { boxes: [box], circles: [{ x: 5, z: 0, radius: 1.47 }], halfX: 9.36, halfZ: 16 }

  it('막힌 가구 발자국 가장자리가 주변 바닥보다 어둡고 falloff 밖은 그대로다', () => {
    expect(stageFloorOcclusionAt(occlusion, 0, 0)).toBeCloseTo(1 - STAGE_FLOOR_OCCLUSION.strength)
    expect(stageFloorOcclusionAt(occlusion, 1.2, 0)).toBeLessThan(1)
    expect(stageFloorOcclusionAt(occlusion, 1 + STAGE_FLOOR_OCCLUSION.falloff + 0.01, 0)).toBe(1)
  })

  it('OBB 회전을 따른다 — 90° 돌린 발자국은 z축으로 길다', () => {
    const turned = { ...occlusion, circles: [], boxes: [{ ...box, cosY: 0, sinY: 1 }] }
    expect(stageFloorOcclusionAt(turned, 0, 0.9)).toBeCloseTo(1 - STAGE_FLOOR_OCCLUSION.strength)
    expect(stageFloorOcclusionAt(turned, 1.2, 0)).toBe(1)
  })

  it('가마솥은 원형 발자국 음영만 있고 경고 반경 3.2 units에 테두리를 그리지 않는다', () => {
    const solo = { boxes: [], circles: [{ x: 0, z: 0, radius: 1.47 }], halfX: 9.36, halfZ: 16 }
    for (let i = 0; i < 32; i += 1) {
      const a = (i / 32) * Math.PI * 2
      expect(stageFloorOcclusionAt(solo, 3.2 * Math.cos(a), 3.2 * Math.sin(a))).toBe(1)
    }
    expect(stageFloorOcclusionAt(solo, 1.47, 0)).toBeCloseTo(1 - STAGE_FLOOR_OCCLUSION.strength)
    // 반경이 늘수록 단조 밝아진다(링 모양 극소 없음).
    let previous = 0
    for (let r = 1.47; r <= 3.2; r += 0.05) {
      const value = stageFloorOcclusionAt(solo, r, 0)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it('맵 네 변에 어두운 경계 띠가 있고 안쪽은 영향이 없다', () => {
    const empty = { boxes: [], circles: [], halfX: 9.36, halfZ: 16 }
    const edgeValue = 1 - STAGE_FLOOR_OCCLUSION.edgeStrength
    expect(stageFloorOcclusionAt(empty, 9.36, 0)).toBeCloseTo(edgeValue)
    expect(stageFloorOcclusionAt(empty, -9.36, 0)).toBeCloseTo(edgeValue)
    expect(stageFloorOcclusionAt(empty, 0, 16)).toBeCloseTo(edgeValue)
    expect(stageFloorOcclusionAt(empty, 0, -16)).toBeCloseTo(edgeValue)
    expect(stageFloorOcclusionAt(empty, 9.36 - STAGE_FLOOR_OCCLUSION.edgeWidth - 0.01, 0)).toBe(1)
    expect(stageFloorOcclusionAt(empty, 0, 0)).toBe(1)
  })
})

describe('P1 — 굽기 결과', () => {
  // 변경 전과 같은 rgb 경로 + 알파 255. stage1~3 바이트가 1바이트라도 바뀌면 이 해시가 깨진다.
  const STAGE_1_TO_3_BAKE_SHA256 = {
    stage1: '402d5661d88746457b98d71856da6de8fa16e3a0432a12e7a425765087f839e8',
    stage2: '9c897eb5c76eb668b5155be64166b85e0581daa1f57015b9c8035f2956195725',
    stage3: '08f9e2813a24671a3d4e075376c920e308b62f09e9d94c971a588a590f9497df',
  }
  const FLOOR_SIZES = { stage1: [20, 28.8], stage2: [200, 200], stage3: [200, 200] }

  it.each(['stage1', 'stage2', 'stage3'])('%s lightMap 픽셀은 바뀌지 않고 접지 음영 셰이더도 붙지 않는다', (stageId) => {
    const [width, depth] = FLOOR_SIZES[stageId]
    const { bake, data } = bakeWithFakeCanvas(stageId, { width, depth })
    expect(sha256(data)).toBe(STAGE_1_TO_3_BAKE_SHA256[stageId])
    expect(bake.occlusion).toBe(false)
    expect(stageFloorLightMapProps(bake).onBeforeCompile).toBeUndefined()
    for (let p = 3; p < data.length; p += 4) if (data[p] !== 255) throw new Error(`alpha ${p}`)
  })

  it('stage4 접지 음영은 알파에만 들어가고 rgb·intensity는 그대로다', () => {
    const occlusion = { boxes: [{ x: 0, z: -10, halfX: 1, halfZ: 1, cosY: 1, sinY: 0 }], circles: [], halfX: 9.36, halfZ: 16 }
    const plain = bakeWithFakeCanvas('stage4', { width: 18.72, depth: 32 })
    const occluded = bakeWithFakeCanvas('stage4', { width: 18.72, depth: 32, occlusion })
    expect(occluded.bake.intensity).toBe(plain.bake.intensity)
    expect(occluded.bake.occlusion).toBe(true)
    let dimmed = 0
    for (let p = 0; p < plain.data.length; p += 4) {
      expect(occluded.data[p]).toBe(plain.data[p])
      expect(occluded.data[p + 1]).toBe(plain.data[p + 1])
      expect(occluded.data[p + 2]).toBe(plain.data[p + 2])
      if (occluded.data[p + 3] < 255) dimmed += 1
    }
    expect(dimmed).toBeGreaterThan(0)
  })

  it('접지 음영 바닥 머티리얼은 같은 lightMap 알파를 전체 확산광에 곱한다(머티리얼·광원 추가 없음)', () => {
    const props = stageFloorLightMapProps({ texture: 'tex', intensity: 2, occlusion: true })
    expect(props.lightMap).toBe('tex')
    expect(props.lightMapIntensity).toBe(2)
    const shader = { fragmentShader: ['a', '#include <aomap_fragment>', 'b'].join('\n') }
    props.onBeforeCompile(shader)
    expect(shader.fragmentShader).toContain('texture2D( lightMap, vLightMapUv ).a')
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse *= stageFloorOcclusion')
    expect(shader.fragmentShader).toContain('reflectedLight.indirectDiffuse *= stageFloorOcclusion')
    expect(props.customProgramCacheKey()).toBe('stage-floor-occlusion')
    const material = new THREE.MeshLambertMaterial({ map: null, ...props, lightMap: null })
    expect(material.onBeforeCompile).toBe(props.onBeforeCompile)
    material.dispose()
  })
})
