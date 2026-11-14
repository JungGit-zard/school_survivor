import * as THREE from 'three'
import { toonMat } from './toon.js'
import { createTemplateInstanceLayer, markInstanceUpload } from './templateInstanceLayer.js'

export { relativeMatrixInto } from './templateInstanceLayer.js'

// 주먹밥 몸통 층 = 공용 템플릿 인스턴스 층(축척 1로 쓴다).
export function createOnigiriBodyLayer(initialCapacity = 16) {
  return createTemplateInstanceLayer(initialCapacity, 'onigiriBodyInstances')
}

// 오니기리 렌더 비용 완화(2026-11-13) — 게임플레이(투척·탐색·피격·바운스·대기)는 건드리지 않는다.
//
// 예전: 주먹밥 1개 = 메시 12개(그리기 호출 12회) + 재질 5개·지오메트리 12개를 투척마다 새로 만들었고,
// 쌀알 터짐 1번 = 쌀알 16개가 각자 재질을 가진 메시 16개였다. 주먹밥은 상한 없이 떠서 기다릴 수 있다.
//
// 지금: Studio 튜닝이 적용된 OnigiiriModel **1벌**(보이지 않는 템플릿)을 그대로 두고, 그 안의 메시마다
// InstancedMesh 1개를 만들어 모든 주먹밥을 한 번에 그린다. 지오메트리·재질은 템플릿 메시의 것을 그대로
// 참조하고(복제·대체 모델 없음), 템플릿 루트 기준 각 메시의 상대 행렬(Studio 루트·파츠 변형, 외곽선 두께
// 배율 포함)을 매 프레임 다시 읽는다. Studio가 재질을 분리하거나 데칼 메시를 붙이면 그 변화도 따라간다.
// 그리기 호출: 주먹밥 N개 → 12N회에서 템플릿 메시 수(기본 12)회로.

// ── 쌀알 터짐: 모든 터짐의 쌀알을 InstancedMesh 1개로 ──
// 예전 쌀알 1개 = 자기 재질(투명, 불투명도만 다름) + 구 지오메트리. 지금은 같은 재질 1개에 인스턴스별
// 불투명도 속성(instanceOpacity)을 더해, 쌀알마다 다르던 페이드를 그대로 재현한다.
export const ONIGIRI_BURST_GRAINS = 16
export const ONIGIRI_BURST_LIFE_MS = 430
export const ONIGIRI_GRAIN_FLIGHT_MS = 360

export function createOnigiriGrainMaterial() {
  const mat = toonMat(0xfffbef, 0.2)
  mat.transparent = true
  mat.opacity = 1
  mat.depthWrite = false
  mat.toneMapped = false
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvInstanceOpacity = instanceOpacity;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vInstanceOpacity );')
  }
  mat.customProgramCacheKey = () => 'onigiri-grain-instance-opacity'
  return mat
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _gp = new THREE.Vector3()
const _ge = new THREE.Euler()
const _gs = new THREE.Vector3()

// 쌀알 1개의 그 시각 자세 — 예전 OnigiriBurstGrain 프레임 코드와 같은 식.
// 지연(delayMs) 전에는 처음 놓인 그대로(중심, 회전 0, 축척 1, 불투명).
export function grainPoseInto(outMatrix, grain, ageMs) {
  const age = ageMs - grain.delayMs
  let opacity = 1
  if (age < 0) {
    _gp.set(grain.x, 0.12, grain.z)
    _ge.set(0, 0, 0)
    _gs.set(grain.size * 1.65, grain.size * 0.9, grain.size)
  } else {
    const t = Math.min(1, age / ONIGIRI_GRAIN_FLIGHT_MS)
    const pop = Math.sin(t * Math.PI)
    const dist = grain.speed * t
    opacity = Math.max(0, 1 - t)
    _gp.set(
      grain.x + Math.cos(grain.angle) * dist,
      0.12 + pop * grain.lift,
      grain.z + Math.sin(grain.angle) * dist,
    )
    _ge.set(t * grain.spin, grain.angle, t * grain.spin * 0.6)
    const s = 1 + pop * 0.35
    _gs.set(s * grain.size * 1.65, s * grain.size * 0.9, s * grain.size)
  }
  _q.setFromEuler(_ge)
  outMatrix.compose(_gp, _q, _gs)
  return opacity
}

export function createOnigiriGrainLayer(initialCapacity = ONIGIRI_BURST_GRAINS * 2) {
  const group = new THREE.Group()
  group.name = 'onigiriGrainInstances'
  const material = createOnigiriGrainMaterial()
  let capacity = Math.max(1, Math.floor(initialCapacity))
  let geometry = null
  let opacity = null
  let mesh = null

  function build() {
    if (mesh) {
      group.remove(mesh)
      mesh.dispose()
      geometry.dispose()
    }
    geometry = new THREE.SphereGeometry(1, 8, 5)
    opacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
    geometry.setAttribute('instanceOpacity', opacity)
    mesh = new THREE.InstancedMesh(geometry, material, capacity)
    mesh.frustumCulled = false
    mesh.matrixAutoUpdate = false
    mesh.renderOrder = 7
    mesh.count = 0
    group.add(mesh)
  }
  build()

  return {
    group,
    material,
    get capacity() { return capacity },
    get count() { return mesh.count },
    get mesh() { return mesh },
    opacityAt(i) { return opacity.getX(i) },

    // 살아 있는 터짐 전부의 쌀알을 이 시각(nowMs) 자세로 다시 쓴다. 쌀알은 터짐당 16개로 적다.
    writeBursts(bursts, nowMs) {
      let needed = 0
      for (let b = 0; b < bursts.length; b += 1) needed += bursts[b].grains.length
      if (needed > capacity) {
        while (capacity < needed) capacity *= 2
        build()
      }
      let i = 0
      for (let b = 0; b < bursts.length; b += 1) {
        const burst = bursts[b]
        const age = nowMs - burst.startMs
        for (let g = 0; g < burst.grains.length; g += 1) {
          opacity.setX(i, grainPoseInto(_m, burst.grains[g], age))
          mesh.setMatrixAt(i, _m)
          i += 1
        }
      }
      mesh.count = i
      mesh.visible = i > 0
      markInstanceUpload(mesh.instanceMatrix, i, 16)
      markInstanceUpload(opacity, i, 1)
    },

    // GPU 자원만 놓는다. 객체는 그대로라 다시 그리면 three가 다시 올린다(StrictMode 재마운트 안전).
    dispose() {
      mesh.dispose()
      geometry.dispose()
      material.dispose?.()
    },
  }
}
