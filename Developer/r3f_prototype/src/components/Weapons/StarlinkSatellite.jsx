import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { screenBounds } from '../../lib/refs.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { inflateScale, getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat } from '../../lib/toon.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import {
  CRASH_FALL_MS,
  ZOMLON_SPAWN_DELAY_MS,
  getCrashPose,
  getCrashPhase,
  pickEscapeDirection,
  getZomlonPosition,
  isEscapeDone,
} from '../../lib/starlinkCrash.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

const ZOMLON_ESCAPE_SCALE = 0.5
const SATELLITE_CRASH_PIVOT_Y = 0.34

// 고장난 스타링크 — 추락 연출 전용 비주얼.
// 30회 발사 후 위성 본체가 지면에 추락·폭발하고, 폭발에서 좀론비스크가 튀어나와
// 화면 밖으로 도망간다. 전부 순수 연출: 데미지 0, 콜라이더 없음, 무기 로직 무변경.

// ── 팔레트 ──────────────────────────────────────────────────────────────────
// 위성: 흰-회색 4단계 + 파랑 2 + 노랑 1 (+ 스파크 블루 액센트)
const SAT = {
  dish: 0xe8e8e8,
  dishRim: 0xb8b8b8,
  bodyTop: 0x9a9a9a,
  bodyBottom: 0x6a6a6a,
  crack: 0x4c5054,
  hub: 0xf0c020,
  dot: 0xf0c020,
  windowBlue: 0x4a78c8,
  panelFrame: 0x4a4a4a,
  panelBase: 0x2a4a9a,
  panelCell: 0x4a78c8,
  spark: 0x39c1ff,
}

// 좀론비스크: 살구 피부 + 짙은 갈색 헤어 + 올블랙 수트 + 흰 X 로고
const ZOM = {
  skin: 0xf0c8a0,
  hair: 0x4a3320,
  eye: 0x101010,
  tee: 0x181818,
  jacket: 0x070707,
  pants: 0x121212,
  shoe: 0x060606,
  logo: 0xf4f4f4,
}

// ── 공용 블록/실린더 (툰 머티리얼 + 인버티드 헐 아웃라인) ────────────────────
function SBox({ size, position, rotation, color, emissive = 0.1, outlineScale = 1.08 }) {
  const geo = getCachedBoxGeo(...size)
  const os = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={getSharedOutlineMat()} scale={[os, os, os]} />
      <mesh renderOrder={2} geometry={geo} material={getCachedToonMat(color, emissive)} />
    </group>
  )
}

function SCyl({ args, position, rotation, color, emissive = 0.1, outlineScale = 1.08 }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(...args), [args.join(',')])
  const os = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={getSharedOutlineMat()} scale={[os, os, os]} />
      <mesh renderOrder={2} geometry={geo} material={getCachedToonMat(color, emissive)} />
    </group>
  )
}

// 태양광 패널 1장: 어두운 프레임 + 파란 바탕 + 3×2 셀 그리드
function SolarPanel({ position }) {
  const cells = []
  for (let cx = 0; cx < 3; cx++) {
    for (let cz = 0; cz < 2; cz++) {
      cells.push(
        <SBox
          key={`${cx}-${cz}`}
          size={[0.185, 0.02, 0.15]}
          position={[(cx - 1) * 0.215, 0.032, (cz - 0.5) * 0.175]}
          color={SAT.panelCell}
          emissive={0.16}
          outlineScale={1.0}
        />,
      )
    }
  }
  return (
    <group position={position}>
      <SBox size={[0.72, 0.04, 0.42]} position={[0, 0, 0]} color={SAT.panelFrame} emissive={0.05} outlineScale={1.05} />
      <SBox size={[0.68, 0.025, 0.38]} position={[0, 0.025, 0]} color={SAT.panelBase} emissive={0.1} outlineScale={1.0} />
      {cells}
    </group>
  )
}

// 마스트 끝 파란 전기 스파크 — 플랫 번개 도형이 깜빡이며 회전
function MastSparks() {
  const groupRef = useRef(null)
  const matA = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SAT.spark, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }),
    [],
  )
  const matB = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    [],
  )

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.y = t * 5.2
    // 불규칙 깜빡임 (고장난 느낌)
    const flickerA = Math.sin(t * 21) > -0.35 ? 1 : 0.12
    const flickerB = Math.sin(t * 17 + 1.7) > -0.2 ? 1 : 0.1
    matA.opacity = 0.95 * flickerA
    matB.opacity = 0.9 * flickerB
  })

  // 번개 느낌: 지그재그를 이루는 가는 박스 조각들
  return (
    <group ref={groupRef}>
      <mesh material={matA} position={[0.07, 0.05, 0]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.028, 0.16, 0.012]} />
      </mesh>
      <mesh material={matA} position={[0.13, -0.05, 0]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.024, 0.13, 0.012]} />
      </mesh>
      <mesh material={matB} position={[-0.08, 0.02, 0.05]} rotation={[0.4, 0.8, 0.5]}>
        <boxGeometry args={[0.024, 0.15, 0.012]} />
      </mesh>
      <mesh material={matB} position={[-0.05, -0.07, -0.06]} rotation={[-0.3, -0.5, -0.7]}>
        <boxGeometry args={[0.02, 0.11, 0.012]} />
      </mesh>
    </group>
  )
}

// ── 스타링크 위성 모델 (원화 1 번역) ─────────────────────────────────────────
export function StarlinkSatelliteModel({ studioItemId = 'weapon-starlink-satellite' }) {
  return (
    <StudioTunedGroup itemId={studioItemId}>
      <group>
      {/* 본체: 원기둥 2단 */}
      <SCyl args={[0.22, 0.22, 0.22, 14]} position={[0, 0.11, 0]} color={SAT.bodyTop} emissive={0.08} />
      <SCyl args={[0.185, 0.185, 0.2, 14]} position={[0, -0.1, 0]} color={SAT.bodyBottom} emissive={0.06} />
      {/* 정면 노란 점 3개 */}
      <SBox size={[0.05, 0.05, 0.03]} position={[-0.09, 0.12, 0.215]} color={SAT.dot} emissive={0.3} outlineScale={1.0} />
      <SBox size={[0.05, 0.05, 0.03]} position={[0, 0.12, 0.225]} color={SAT.dot} emissive={0.3} outlineScale={1.0} />
      <SBox size={[0.05, 0.05, 0.03]} position={[0.09, 0.12, 0.215]} color={SAT.dot} emissive={0.3} outlineScale={1.0} />
      {/* 옆면 파란 창 패널 */}
      <SBox size={[0.03, 0.11, 0.15]} position={[-0.215, 0.1, 0]} color={SAT.windowBlue} emissive={0.22} outlineScale={1.0} />

      {/* 접시: 테두리 링 + 밝은 원반 (위로 살짝 오목한 얕은 볼) */}
      <SCyl args={[0.58, 0.52, 0.05, 18]} position={[0, 0.26, 0]} color={SAT.dishRim} emissive={0.06} outlineScale={1.04} />
      <SCyl args={[0.5, 0.56, 0.06, 18]} position={[0, 0.315, 0]} color={SAT.dish} emissive={0.1} outlineScale={1.03} />
      {/* 접시 표면 균열 라인 2-3개 */}
      <SBox size={[0.44, 0.012, 0.03]} position={[0.12, 0.35, 0.1]} rotation={[0, 0.55, 0]} color={SAT.crack} emissive={0.02} outlineScale={1.0} />
      <SBox size={[0.34, 0.012, 0.026]} position={[-0.14, 0.35, -0.06]} rotation={[0, -0.8, 0]} color={SAT.crack} emissive={0.02} outlineScale={1.0} />
      <SBox size={[0.2, 0.012, 0.022]} position={[0.03, 0.35, -0.24]} rotation={[0, 0.25, 0]} color={SAT.crack} emissive={0.02} outlineScale={1.0} />
      {/* 접시 중앙 허브 (노랑 낮은 원기둥) */}
      <SCyl args={[0.11, 0.11, 0.09, 12]} position={[0, 0.38, 0]} color={SAT.hub} emissive={0.25} outlineScale={1.05} />

      {/* 마스트 + 끝 전기 스파크 */}
      <SCyl args={[0.035, 0.045, 0.5, 8]} position={[0, 0.66, 0]} color={SAT.bodyTop} emissive={0.06} outlineScale={1.1} />
      <group position={[0, 0.95, 0]}>
        <MastSparks />
      </group>

      {/* 태양광 패널 2장 (본체 좌우 연결대 + 패널) */}
      <SBox size={[0.18, 0.045, 0.05]} position={[-0.31, 0.05, 0]} color={SAT.panelFrame} emissive={0.04} outlineScale={1.05} />
      <SBox size={[0.18, 0.045, 0.05]} position={[0.31, 0.05, 0]} color={SAT.panelFrame} emissive={0.04} outlineScale={1.05} />
      <SolarPanel position={[-0.76, 0.05, 0]} />
      <SolarPanel position={[0.76, 0.05, 0]} />
      </group>
    </StudioTunedGroup>
  )
}

// ── 좀론비스크 (원화 2 번역: 블록 미니피겨) ──────────────────────────────────
// running=true면 달리기 애니메이션(팔다리 스윙 + 앞 기울임).
export function ZomlonbiskModel({ running = true }) {
  const parts = useRef({})
  const reg = (key) => (el) => {
    if (el) parts.current[key] = el
  }

  useFrame(({ clock }) => {
    const p = parts.current
    if (!p.legL) return
    if (!running) {
      p.legL.rotation.x = 0
      p.legR.rotation.x = 0
      p.armL.rotation.x = 0
      p.armR.rotation.x = 0
      if (p.root) p.root.rotation.x = 0
      return
    }
    const t = clock.elapsedTime
    const sw = Math.sin(t * 11.5) * 0.75
    p.legL.rotation.x = sw
    p.legR.rotation.x = -sw
    p.armL.rotation.x = -sw * 0.9
    p.armR.rotation.x = sw * 0.9
    if (p.root) {
      p.root.rotation.x = 0.24                      // 필사적으로 앞으로 기울여 달림
      p.root.position.y = Math.abs(Math.sin(t * 11.5)) * 0.05
    }
    if (p.head) p.head.rotation.z = Math.sin(t * 6) * 0.08
  })

  return (
    <StudioTunedGroup itemId="actor-zomlonbisk">
      <group ref={reg('root')}>
      {/* ── 머리 ── */}
      <group ref={reg('head')} position={[0, 0.84, 0]}>
        <SBox size={[0.5, 0.46, 0.44]} position={[0, 0, 0]} color={ZOM.skin} emissive={0.09} outlineScale={1.08} />
        {/* 옆가르마 헤어: 위(가르마 사선) + 뒤 + 오른쪽 옆 블록 */}
        <SBox size={[0.54, 0.15, 0.48]} position={[0.01, 0.26, -0.01]} rotation={[0, 0, -0.09]} color={ZOM.hair} emissive={0.04} outlineScale={1.05} />
        <SBox size={[0.46, 0.13, 0.2]} position={[-0.05, 0.21, 0.16]} rotation={[0.08, 0, -0.09]} color={ZOM.hair} emissive={0.04} outlineScale={1.0} />
        <SBox size={[0.52, 0.3, 0.1]} position={[0, 0.08, -0.2]} color={ZOM.hair} emissive={0.04} outlineScale={1.0} />
        <SBox size={[0.09, 0.24, 0.4]} position={[0.24, 0.12, -0.02]} color={ZOM.hair} emissive={0.04} outlineScale={1.0} />
        {/* 굵은 눈썹 */}
        <SBox size={[0.13, 0.04, 0.03]} position={[-0.12, 0.09, 0.225]} rotation={[0, 0, 0.12]} color={ZOM.hair} emissive={0.04} outlineScale={1.0} />
        <SBox size={[0.13, 0.04, 0.03]} position={[0.12, 0.09, 0.225]} rotation={[0, 0, -0.12]} color={ZOM.hair} emissive={0.04} outlineScale={1.0} />
        {/* 작은 검정 눈 */}
        <SBox size={[0.06, 0.06, 0.03]} position={[-0.12, 0.0, 0.225]} color={ZOM.eye} emissive={0.02} outlineScale={1.0} />
        <SBox size={[0.06, 0.06, 0.03]} position={[0.12, 0.0, 0.225]} color={ZOM.eye} emissive={0.02} outlineScale={1.0} />
      </group>

      {/* ── 몸통: 검정 티셔츠 + 열린 재킷 패널 + 흰 X 로고 ── */}
      <group ref={reg('body')} position={[0, 0.3, 0]}>
        <SBox size={[0.5, 0.56, 0.34]} position={[0, 0, 0]} color={ZOM.tee} emissive={0.06} outlineScale={1.09} />
        {/* 열린 수트 재킷: 좌우 패널이 앞으로 살짝 돌출 */}
        <SBox size={[0.17, 0.58, 0.4]} position={[-0.19, -0.01, 0.02]} rotation={[0, 0.08, 0]} color={ZOM.jacket} emissive={0.04} outlineScale={1.04} />
        <SBox size={[0.17, 0.58, 0.4]} position={[0.19, -0.01, 0.02]} rotation={[0, -0.08, 0]} color={ZOM.jacket} emissive={0.04} outlineScale={1.04} />
        {/* 가슴 중앙 흰색 X 로고 (얇은 박스 2개 45° 교차) */}
        <SBox size={[0.2, 0.045, 0.02]} position={[0, 0.1, 0.185]} rotation={[0, 0, Math.PI / 4]} color={ZOM.logo} emissive={0.18} outlineScale={1.0} />
        <SBox size={[0.2, 0.045, 0.02]} position={[0, 0.1, 0.185]} rotation={[0, 0, -Math.PI / 4]} color={ZOM.logo} emissive={0.18} outlineScale={1.0} />
      </group>

      {/* ── 팔 (어깨 pivot) ── */}
      <group ref={reg('armL')} position={[-0.35, 0.52, 0]}>
        <SBox size={[0.17, 0.44, 0.17]} position={[0, -0.22, 0]} color={ZOM.jacket} emissive={0.04} outlineScale={1.05} />
        <SBox size={[0.15, 0.13, 0.15]} position={[0, -0.48, 0]} color={ZOM.skin} emissive={0.08} outlineScale={1.03} />
      </group>
      <group ref={reg('armR')} position={[0.35, 0.52, 0]}>
        <SBox size={[0.17, 0.44, 0.17]} position={[0, -0.22, 0]} color={ZOM.jacket} emissive={0.04} outlineScale={1.05} />
        <SBox size={[0.15, 0.13, 0.15]} position={[0, -0.48, 0]} color={ZOM.skin} emissive={0.08} outlineScale={1.03} />
      </group>

      {/* ── 다리 (힙 pivot) + 검정 신발 ── */}
      <group ref={reg('legL')} position={[-0.13, 0.02, 0]}>
        <SBox size={[0.19, 0.46, 0.22]} position={[0, -0.23, 0]} color={ZOM.pants} emissive={0.05} outlineScale={1.06} />
        <SBox size={[0.21, 0.11, 0.3]} position={[0, -0.51, 0.04]} color={ZOM.shoe} emissive={0.03} outlineScale={1.03} />
      </group>
      <group ref={reg('legR')} position={[0.13, 0.02, 0]}>
        <SBox size={[0.19, 0.46, 0.22]} position={[0, -0.23, 0]} color={ZOM.pants} emissive={0.05} outlineScale={1.06} />
        <SBox size={[0.21, 0.11, 0.3]} position={[0, -0.51, 0.04]} color={ZOM.shoe} emissive={0.03} outlineScale={1.03} />
      </group>
      </group>
    </StudioTunedGroup>
  )
}

// ── 추락 폭발 이펙트 (데미지 없음, 순수 비주얼) ──────────────────────────────
export function CrashExplosionVisual({ x, z, t }) {
  const fade = Math.max(0, 1 - t)
  const ringScale = 0.6 + t * 3.4

  return (
    <group position={[x, 0, z]}>
      {/* 백색 코어 플래시 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={6}>
        <circleGeometry args={[scaleEffectVisual(0.7 + t * 0.5), 32]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={fade * 0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 주황 화염 플래시 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} renderOrder={5}>
        <circleGeometry args={[scaleEffectVisual(1.35 + t * 0.8), 32]} />
        <meshBasicMaterial color={0xff8a2a} transparent opacity={fade * 0.85} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 노란 확산 링 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} scale={[ringScale, ringScale, 1]} renderOrder={4}>
        <ringGeometry args={[scaleEffectVisual(0.85), scaleEffectVisual(1.1), 32]} />
        <meshBasicMaterial color={0xffd23a} transparent opacity={fade * 0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 청백 외곽 링 (스타링크 전기 느낌 잔향) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} scale={[ringScale * 1.5, ringScale * 1.5, 1]} renderOrder={3}>
        <ringGeometry args={[scaleEffectVisual(0.9), scaleEffectVisual(1.12), 32]} />
        <meshBasicMaterial color={0x88ddff} transparent opacity={fade * 0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 솟는 섬광 기둥 (짧게) */}
      {t < 0.45 && (
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.3 * (1 - t), 0.55 * (1 - t), 2.2, 10]} />
          <meshBasicMaterial color={0xffc46a} transparent opacity={(1 - t / 0.45) * 0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ── 추락 시퀀스: 낙하 → 폭발 → 좀론비스크 도주 → 언마운트 ────────────────────
// 게임 영향 없음: 데미지·콜라이더 없음. usePlayingFrame으로 일시정지 시 정지.
export function StarlinkCrashSequence({ x, z, onDone }) {
  const ageRef = useRef(0)
  const escapeDirRef = useRef(null)
  const fallSfxRef = useRef(false)
  const doneRef = useRef(false)
  const [, force] = useState(0)
  const end = useMemo(() => ({ x, z }), [x, z])

  usePlayingFrame((_, delta) => {
    if (doneRef.current) return
    ageRef.current += delta * 1000
    if (!fallSfxRef.current) {
      fallSfxRef.current = true
      emitSfx({ id: 'starlinkFall' })
    }
    const { phase } = getCrashPhase(ageRef.current)

    if (phase === 'landed' && !escapeDirRef.current) {
      // 착지 순간: 도주 방향 확정 + 충돌음 (기존 등록 사운드 재사용)
      escapeDirRef.current = pickEscapeDirection(x, z, screenBounds)
      emitSfx({ id: 'starlinkExplosion' })
    }

    if (escapeDirRef.current) {
      const escapeElapsed = ageRef.current - CRASH_FALL_MS - ZOMLON_SPAWN_DELAY_MS
      if (escapeElapsed > 0) {
        const pos = getZomlonPosition(end, escapeDirRef.current, escapeElapsed)
        if (isEscapeDone(pos, screenBounds, escapeElapsed)) {
          doneRef.current = true
          onDone()
          return
        }
      }
    }
    force((n) => n + 1)
  })

  const age = ageRef.current
  const { phase, t } = getCrashPhase(age)

  // 1) 낙하 중인 위성
  if (phase === 'falling') {
    const pose = getCrashPose(end, t)
    return (
      <group position={[pose.x, pose.y, pose.z]}>
        <group position={[0, SATELLITE_CRASH_PIVOT_Y, 0]} rotation={[pose.tilt, pose.spin, pose.tilt * 0.6]}>
          <group position={[0, -SATELLITE_CRASH_PIVOT_Y, 0]}>
            <StarlinkSatelliteModel studioItemId="weapon-starlink-crash-fall" />
          </group>
        </group>
      </group>
    )
  }

  // 2) 착지 후: 폭발 + 좀론비스크 도주
  const dir = escapeDirRef.current
  const escapeElapsed = age - CRASH_FALL_MS - ZOMLON_SPAWN_DELAY_MS
  const zomPos = dir && escapeElapsed > 0 ? getZomlonPosition(end, dir, escapeElapsed) : null
  const zomFacing = dir ? Math.atan2(dir.x, dir.z) : 0
  // 등장 팝: 폭발에서 튀어나오며 커진다
  const popScale = Math.min(1, Math.max(0.25, escapeElapsed / 220))

  return (
    <group>
      {t < 1 && <CrashExplosionVisual x={x} z={z} t={t} />}
      {zomPos && (
        <group
          position={[zomPos.x, 0.55 * ZOMLON_ESCAPE_SCALE, zomPos.z]}
          rotation={[0, zomFacing, 0]}
          scale={[
            popScale * ZOMLON_ESCAPE_SCALE,
            popScale * ZOMLON_ESCAPE_SCALE,
            popScale * ZOMLON_ESCAPE_SCALE,
          ]}
        >
          <ZomlonbiskModel running />
        </group>
      )}
    </group>
  )
}
