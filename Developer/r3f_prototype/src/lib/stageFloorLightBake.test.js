import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  accumulateStageFloorIrradiance,
  buildStageFloorLightMap,
  getStageFloorLightHalfExtent,
  getStageFloorLightMapTransform,
  prepareStageFloorLights,
  sampleStageFloorIrradiance,
  stageFloorLightMapProps,
} from './stageFloorLightBake.js'
import { getStageLightingProfile, STAGE_LIGHTING_PROFILES } from './stageLightingProfile.js'

const PLAYABLE_STAGE_IDS = ['stage1', 'stage2', 'stage3']

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
      expect(stageId).toMatch(/^stage[123]$/)
    }
  })

  it('Stage 4와 미지 스테이지는 굽지 않는다', () => {
    expect(getStageFloorLightHalfExtent(getStageLightingProfile('stage4'))).toBe(0)
    expect(prepareStageFloorLights(getStageLightingProfile('stage4'))).toEqual([])
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
