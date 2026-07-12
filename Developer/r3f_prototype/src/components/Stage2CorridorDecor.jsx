import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { toonMat } from '../lib/toon.js'

// ─────────────────────────────────────────────────────────────────────────
// Stage2 '복도' 저녁 무드 데코 (P0 4종 + 조명 연출)
//
// 기획 정본: Graphic_designer/stage2_corridor_theme_makeover_plan_2026-07-12.md
// 컨셉: "비상등이 붉게 도는 저녁, 대피가 끊긴 학교 복도 — 반쯤 열린 교실 문,
//        나뒹구는 신발·시험지, 힘겹게 깜빡이는 형광등."
//
// 성능 원칙(r3f_rapier_vampire_survivor_stability_rules):
//  - 콜라이더 없음(non-blocking 장식). 물리 벽은 기존 맵 경계(x=±7.5)가 수행.
//  - castShadow/receiveShadow=false (그림자 예산 절약, RULE-2.5).
//  - useFrame 안에서 setState/new 금지 — material.emissiveIntensity uniform만 변형
//    (RULE-0.1, RULE-0.2). 형광등 깜빡임·비상등 호흡은 실제 광원 없이 자체발광 토글.
//  - 바닥 데칼은 타입별 InstancedMesh 3개로 묶어 드로우콜 축소(RULE-2.1 정신).
//
// 배치 규칙(기획 §5 stage2 정본):
//  R2. 벽면 장식 프랍 |x| >= 6.0.  R4. 중앙 통로(|x|<4.5)엔 y>0.6 프랍 금지
//  (천장 프랍 y>=3.0 예외).  R5. 저상 데칼(y<0.03)은 중앙 통로 포함 어디든 가능.
// ─────────────────────────────────────────────────────────────────────────

const MESH_RENDERING = Object.freeze({ castShadow: false, receiveShadow: false })
const MAX_OPEN_RAD = Math.PI / 4 // 열린 문짝 통로 침범 방지 상한 45°

// 벽면 부착 X (|x|=7.44 >= 6.0). 벽 x=±7.5보다 살짝 안쪽에 매입.
const DOOR_WALL_X = 7.44
// 교실 문 배치 — 좌우 벽 번갈아 4개, In-Progress 프랍(locker -14.2 / cart z2.8 /
// board 13.4)과 z가 겹치지 않게. 하나는 책상 바리케이드.
export const CORRIDOR_DOORS = [
  { side: 'left', z: -11, open: 0.5, barricade: false },
  { side: 'right', z: -6, open: 0.68, barricade: true },
  { side: 'left', z: 5, open: 0.42, barricade: false },
  { side: 'right', z: 12, open: 0.6, barricade: false },
]

// 천장 형광등 바 — x=0 중앙선 위 등간격 6개(z 스텝 6), y=3.45(>=3.0 → R4 예외).
// flicker=true 인 소수만 깜빡이고 나머진 상시 점등(과한 깜빡임 금지, 기획 §4).
export const CORRIDOR_CEILING_LIGHTS = [
  { z: -16, flicker: false },
  { z: -10, flicker: true },
  { z: -4, flicker: false },
  { z: 2, flicker: false },
  { z: 8, flicker: true },
  { z: 14, flicker: false },
]
const CEILING_LIGHT_Y = 3.45

// EXIT 비상 유도등 — 복도 양 끝 + 중간 1개, 벽 상단 y=2.6, |x|=7.1(>=6.0). 초록 발광.
export const CORRIDOR_EXIT_SIGNS = [
  { x: 7.1, z: 18.4, arrowDir: 1 }, // 남쪽(포탈 방향) 화살표
  { x: -7.1, z: -18.4, arrowDir: -1 }, // 북쪽 끝벽 방향
  { x: 7.1, z: 0, arrowDir: 1 }, // 중간 안내
]
const EXIT_SIGN_Y = 2.6

// 비상등 레드 호흡 글로우(2순위) — 벽면 얇은 판, emissive 사인파 호흡. |x|=7.46.
export const CORRIDOR_EMERGENCY_GLOWS = [
  { x: -7.46, z: 17.5, phase: 0 },
  { x: 7.46, z: -17.5, phase: Math.PI },
]
const EMERGENCY_GLOW_Y = 1.3

// ── 바닥 데칼(신발·시험지·책) 시드 고정 산포 ──────────────────────────────
// 결정론적(seeded) 배치라 테스트·리플레이가 재현 가능. y<0.03 저상이라 R5 예외
// (중앙 통로 포함 어디든 가능, 이동/시야/투사체 간섭 0).
function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 타입별 데칼 개수(총 18개, 15~20 목표 내). 전부 position.y < 0.03.
const DEBRIS_PLAN = [
  { type: 'paper', count: 8, y: 0.016 },
  { type: 'book', count: 4, y: 0.026 },
  { type: 'shoe', count: 6, y: 0.024 },
]

export function buildCorridorDebris(seed = 0x5c0011a2) {
  const rng = mulberry32(seed)
  const items = []
  for (const { type, count, y } of DEBRIS_PLAN) {
    for (let i = 0; i < count; i += 1) {
      const x = (rng() * 2 - 1) * 6.8 // 중앙 통로 포함 (저상 데칼 예외)
      const z = (rng() * 2 - 1) * 18 // 플레이 영역 장축
      const rotY = rng() * Math.PI * 2
      const tilt = (rng() * 2 - 1) * 0.12
      items.push({ type, position: [x, y, z], rotation: [tilt, rotY, tilt * 0.5] })
    }
  }
  return items
}

// ── 로컬 프리미티브(브리프 승인: PropBox류 로컬 구현) ────────────────────────
function PropBox({ position = [0, 0, 0], rotation = [0, 0, 0], size, material }) {
  return (
    <mesh {...MESH_RENDERING} position={position} rotation={rotation} material={material} scale={size}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  )
}

// 교실 문(반쯤 열림). 로컬 프레임: 벽 x=0 면에 부착, +x가 통로 방향.
// 좌측 벽은 rotation 0(+x=통로), 우측 벽은 y회전 π로 +x를 -x(통로)에 매핑.
function ClassroomDoor({ side, z, open, barricade, mats }) {
  const isLeft = side === 'left'
  const worldX = isLeft ? -DOOR_WALL_X : DOOR_WALL_X
  const groupRot = isLeft ? 0 : Math.PI
  const openAngle = -Math.min(Math.abs(open), MAX_OPEN_RAD) // 통로(+x) 쪽으로 스윙
  return (
    <group position={[worldX, 0, z]} rotation={[0, groupRot, 0]} name={`corridor-door-${side}-${z}`}>
      {/* 문틀(프레임) */}
      <PropBox position={[-0.02, 1.08, 0]} size={[0.12, 2.18, 1.26]} material={mats.frame} />
      {/* 열린 문 안쪽 어둠(교실 내부 실루엣) */}
      <PropBox position={[0.02, 1.03, 0]} size={[0.06, 1.96, 1.02]} material={mats.dark} />
      {/* 문짝 — 경첩(로컬 z=-0.5) 기준 회전 */}
      <group position={[0.05, 1.02, -0.5]} rotation={[0, openAngle, 0]}>
        <PropBox position={[0, 0, 0.47]} size={[0.06, 1.9, 0.92]} material={mats.leaf} />
        {/* 유리창(반투명 느낌의 밝은 발광) */}
        <PropBox position={[0.04, 0.45, 0.47]} size={[0.045, 0.52, 0.5]} material={mats.glass} />
        {/* 손잡이 */}
        <PropBox position={[0.06, 0, 0.82]} size={[0.05, 0.08, 0.1]} material={mats.handle} />
      </group>
      {/* 책상 바리케이드(하나만) */}
      {barricade && (
        <group position={[0.55, 0, 0.1]} rotation={[0, 0, 0.18]}>
          <PropBox position={[0, 0.42, 0]} size={[0.72, 0.08, 0.5]} material={mats.deskTop} />
          <PropBox position={[0, 0.2, 0]} size={[0.12, 0.44, 0.42]} material={mats.deskLeg} />
        </group>
      )}
    </group>
  )
}

// 타입별 데칼 instanced mesh 1개. 정적이라 최초 1회 행렬 세팅.
const _m = new THREE.Matrix4()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _s = new THREE.Vector3()

function DebrisInstances({ items, geoArgs, material }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < items.length; i += 1) {
      const { position, rotation } = items[i]
      _p.set(position[0], position[1], position[2])
      _e.set(rotation[0], rotation[1], rotation[2])
      _q.setFromEuler(_e)
      _s.set(1, 1, 1)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [items])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      frustumCulled={false}
      {...MESH_RENDERING}
      material={material}
    >
      <boxGeometry args={geoArgs} />
    </instancedMesh>
  )
}

export default function Stage2CorridorDecor() {
  // ── 정적 머티리얼(공유) ──
  const doorMats = useMemo(
    () => ({
      frame: toonMat(0x6b7a80, 0.03),
      dark: toonMat(0x1a2326, 0),
      leaf: toonMat(0x9c6a37, 0.03),
      glass: toonMat(0xbcd0d4, 0.14),
      handle: toonMat(0xaebfc1, 0.06),
      deskTop: toonMat(0xc9a86a, 0.03),
      deskLeg: toonMat(0x4e5a60, 0.02),
    }),
    [],
  )
  const exitSignMat = useMemo(() => toonMat(0x3bd16a, 0.9), [])
  const exitArrowMat = useMemo(() => toonMat(0xecfff2, 0.5), [])
  const debrisPaperMat = useMemo(() => toonMat(0xf0e4c3, 0.02), [])
  const debrisBookMat = useMemo(() => toonMat(0x8a5a34, 0.03), [])
  const debrisShoeMat = useMemo(() => toonMat(0x35454a, 0.02), [])

  // ── 애니메이션 머티리얼(개별 인스턴스, useFrame에서 emissiveIntensity 변형) ──
  // 형광등: 등마다 독립 깜빡임을 위해 개별 material. 위상 다르게 부여.
  const lightMats = useMemo(
    () => CORRIDOR_CEILING_LIGHTS.map(() => toonMat(0xdfe6ea, 0.9)),
    [],
  )
  const glowMats = useMemo(
    () => CORRIDOR_EMERGENCY_GLOWS.map(() => toonMat(0xe0432b, 0.3)),
    [],
  )

  const debris = useMemo(() => buildCorridorDebris(), [])
  const debrisByType = useMemo(
    () => ({
      paper: debris.filter((d) => d.type === 'paper'),
      book: debris.filter((d) => d.type === 'book'),
      shoe: debris.filter((d) => d.type === 'shoe'),
    }),
    [debris],
  )

  // 단일 useFrame: 형광등 깜빡임 + 비상등 호흡. setState/new 없음(RULE-0.1/0.2).
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < lightMats.length; i += 1) {
      const cfg = CORRIDOR_CEILING_LIGHTS[i]
      const m = lightMats[i]
      if (!cfg.flicker) {
        m.emissiveIntensity = 0.9
        continue
      }
      // 두 사인 합 임계로 불규칙한 순간 dip 생성(등마다 위상 offset). 대부분 0.95, 가끔 0.12.
      const phase = i * 2.7
      const v = Math.sin(t * 13.0 + phase) + Math.sin(t * 7.3 + phase * 1.7)
      m.emissiveIntensity = v > 1.45 ? 0.12 : 0.95
    }
    for (let i = 0; i < glowMats.length; i += 1) {
      const phase = CORRIDOR_EMERGENCY_GLOWS[i].phase
      // 완만 호흡 0.14~0.44.
      glowMats[i].emissiveIntensity = 0.29 + 0.15 * Math.sin(t * 1.15 + phase)
    }
  })

  return (
    <group name="stage2-corridor-decor">
      {/* 교실 문 4개(하나는 책상 바리케이드) */}
      {CORRIDOR_DOORS.map((d) => (
        <ClassroomDoor key={`${d.side}-${d.z}`} {...d} mats={doorMats} />
      ))}

      {/* 천장 형광등 바 + 깜빡임 */}
      {CORRIDOR_CEILING_LIGHTS.map((light, i) => (
        <PropBox
          key={light.z}
          position={[0, CEILING_LIGHT_Y, light.z]}
          size={[1.5, 0.09, 0.42]}
          material={lightMats[i]}
        />
      ))}

      {/* EXIT 비상 유도등 */}
      {CORRIDOR_EXIT_SIGNS.map((sign) => {
        const isLeftWall = sign.x < 0
        // 벽면 쪽으로 살짝 눕혀 통로에서 잘 보이게.
        const rotY = isLeftWall ? 0.25 : -0.25
        return (
          <group key={`${sign.x}-${sign.z}`} position={[sign.x, EXIT_SIGN_Y, sign.z]} rotation={[0, rotY, 0]}>
            <PropBox size={[0.1, 0.3, 0.62]} material={exitSignMat} />
            <PropBox position={[0.02, 0, sign.arrowDir * 0.22]} size={[0.06, 0.14, 0.16]} material={exitArrowMat} />
          </group>
        )
      })}

      {/* 비상등 레드 호흡 글로우(벽면 얇은 판) */}
      {CORRIDOR_EMERGENCY_GLOWS.map((glow, i) => (
        <PropBox
          key={glow.x}
          position={[glow.x, EMERGENCY_GLOW_Y, glow.z]}
          size={[0.05, 0.5, 0.7]}
          material={glowMats[i]}
        />
      ))}

      {/* 바닥 데칼 — 타입별 instanced(3 draw call) */}
      <DebrisInstances items={debrisByType.paper} geoArgs={[0.3, 0.012, 0.38]} material={debrisPaperMat} />
      <DebrisInstances items={debrisByType.book} geoArgs={[0.22, 0.05, 0.3]} material={debrisBookMat} />
      <DebrisInstances items={debrisByType.shoe} geoArgs={[0.13, 0.06, 0.3]} material={debrisShoeMat} />
    </group>
  )
}
