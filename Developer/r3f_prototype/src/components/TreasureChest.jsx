import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

// ── 이벤트 보물상자 (2026-07-14) ─────────────────────────────────────────────
// 춤추는 도지 처치 시 드랍. 드랍 1.5초 뒤 "퍽" 하고 스스로 열리면서 onOpen을 호출한다
// (상위 Enemies가 그 시점에 코인을 주변으로 산포한다).
// 오픈 연출: 뚜껑이 경첩을 축으로 확 젖혀지며 튀어오르고, 상자 안에서 금빛 플래시 기둥
// + 바닥 링/스파크 버스트가 터진다. 실제 코인 스폰은 onOpen 시점에 부모가 하므로
// 여기선 시각 연출만 얹는다(코인들이 "퍽"과 동시에 사방으로 튀어나오는 그림).
export const CHEST_OPEN_DELAY_MS = 1500
// 오픈 임박 신호: 마지막 이 구간 동안 상자가 부르르 떨린다(오픈 예고).
const CHEST_SHAKE_LEAD_MS = 480
// "퍽" 오픈 버스트 연출 길이 — 뚜껑 팝 + 플래시가 재생된 뒤 상자가 사라진다.
export const CHEST_BURST_MS = 550

const CHEST_WOOD = 0x8a5a2b        // 레퍼런스 상자 몸통 나무색
const CHEST_WOOD_LIGHT = 0xa6733b  // 윗면/판자 하이라이트
const CHEST_WOOD_DARK = 0x5f3b1c   // 나무 판자 골(어두운 줄)
const CHEST_METAL = 0x7f8790       // 레퍼런스 회색 철제 보강대
const CHEST_METAL_DARK = 0x555c64  // 철제 보강대 음영/자물쇠 홈
const CHEST_FLASH = 0xfff3b0       // 오픈 플래시 크림골드

// 인버티드 헐 외곽선: inflateScale은 1 근처 "인플레이션 계수" 전용이다(예: 1.06→1.12).
// 치수 스케일(0.5 등)을 직접 넣으면 0/음수 스케일이 되어 BackSide가 뒤집힌 검은 박스
// (블롭)로 렌더된다 — 도지 스폰 블롭 버그와 동일 원인. 계수를 한 번만 변환해 치수에 곱한다.
const CHEST_OUTLINE_INFLATE = inflateScale(1.06)

function ChestBox({ position, rotation = [0, 0, 0], scale, color, emissive = 0.1 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(
    () => (Array.isArray(scale) ? scale.map((v) => v * CHEST_OUTLINE_INFLATE) : scale * CHEST_OUTLINE_INFLATE),
    [scale],
  )
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

// 상자 본체(뚜껑 제외) — 레퍼런스처럼 갈색 나무판자 + 회색 철제 보강대 + 정면 자물쇠.
function ChestBody({ s }) {
  return (
    <group>
      {/* 몸통: 살짝 넓은 저상형 실루엣 */}
      <ChestBox position={[0, 0.17 * s, 0]} scale={[0.64 * s, 0.32 * s, 0.4 * s]} color={CHEST_WOOD} />
      {/* 판자 골(정면/측면 가로 어두운 줄) — 레퍼런스의 나무 판자 질감 */}
      <ChestBox position={[0, 0.095 * s, 0.204 * s]} scale={[0.58 * s, 0.018 * s, 0.006 * s]} color={CHEST_WOOD_DARK} emissive={0.03} />
      <ChestBox position={[0, 0.22 * s, 0.204 * s]} scale={[0.58 * s, 0.018 * s, 0.006 * s]} color={CHEST_WOOD_DARK} emissive={0.03} />
      <ChestBox position={[-0.323 * s, 0.16 * s, 0]} scale={[0.006 * s, 0.2 * s, 0.3 * s]} color={CHEST_WOOD_DARK} emissive={0.03} />
      <ChestBox position={[0.323 * s, 0.16 * s, 0]} scale={[0.006 * s, 0.2 * s, 0.3 * s]} color={CHEST_WOOD_DARK} emissive={0.03} />
      {/* 회색 철제 보강대: 좌우 세로띠 + 위아래 림 */}
      <ChestBox position={[-0.24 * s, 0.17 * s, 0]} scale={[0.065 * s, 0.34 * s, 0.43 * s]} color={CHEST_METAL_DARK} emissive={0.12} />
      <ChestBox position={[0.24 * s, 0.17 * s, 0]} scale={[0.065 * s, 0.34 * s, 0.43 * s]} color={CHEST_METAL_DARK} emissive={0.12} />
      <ChestBox position={[0, 0.325 * s, 0]} scale={[0.68 * s, 0.04 * s, 0.43 * s]} color={CHEST_METAL} emissive={0.14} />
      <ChestBox position={[0, 0.02 * s, 0]} scale={[0.66 * s, 0.04 * s, 0.42 * s]} color={CHEST_METAL_DARK} emissive={0.08} />
      {/* 잠금판 + 열쇠구멍(정면) */}
      <ChestBox position={[0, 0.26 * s, 0.215 * s]} scale={[0.14 * s, 0.14 * s, 0.035 * s]} color={CHEST_METAL} emissive={0.18} />
      <ChestBox position={[0, 0.205 * s, 0.235 * s]} scale={[0.065 * s, 0.085 * s, 0.04 * s]} color={CHEST_METAL_DARK} emissive={0.06} />
      <ChestBox position={[0, 0.165 * s, 0.245 * s]} scale={[0.025 * s, 0.055 * s, 0.045 * s]} color={CHEST_METAL_DARK} emissive={0.04} />
      {/* 리벳 — 저해상도에서도 철제 보강대가 읽히도록 점 형태 하이라이트 */}
      <ChestBox position={[-0.24 * s, 0.27 * s, 0.226 * s]} scale={[0.032 * s, 0.032 * s, 0.018 * s]} color={CHEST_METAL} emissive={0.22} />
      <ChestBox position={[0.24 * s, 0.27 * s, 0.226 * s]} scale={[0.032 * s, 0.032 * s, 0.018 * s]} color={CHEST_METAL} emissive={0.22} />
      <ChestBox position={[-0.24 * s, 0.08 * s, 0.226 * s]} scale={[0.032 * s, 0.032 * s, 0.018 * s]} color={CHEST_METAL} emissive={0.22} />
      <ChestBox position={[0.24 * s, 0.08 * s, 0.226 * s]} scale={[0.032 * s, 0.032 * s, 0.018 * s]} color={CHEST_METAL} emissive={0.22} />
    </group>
  )
}

// 뚜껑 — 경첩 피벗 그룹(뒤 모서리) 아래에 배치. 버스트 시 rotation.x로 젖힌다.
// 3단 박스로 둥근 아치형 보물상자 실루엣을 만든다(레퍼런스의 low-poly 돔 느낌).
function ChestLid({ s }) {
  return (
    <group>
      {/* 뚜껑 돔: 아래는 넓고 위로 갈수록 좁아지는 계단식 둥근 형태 */}
      <ChestBox position={[0, 0.035 * s, 0.2 * s]} scale={[0.7 * s, 0.08 * s, 0.46 * s]} color={CHEST_WOOD} emissive={0.12} />
      <ChestBox position={[0, 0.095 * s, 0.2 * s]} scale={[0.62 * s, 0.08 * s, 0.4 * s]} color={CHEST_WOOD_LIGHT} emissive={0.13} />
      <ChestBox position={[0, 0.15 * s, 0.2 * s]} scale={[0.5 * s, 0.06 * s, 0.32 * s]} color={CHEST_WOOD} emissive={0.12} />
      {/* 뚜껑 앞·뒤 림 + 회색 철제 스트랩 */}
      <ChestBox position={[0, -0.005 * s, 0.425 * s]} scale={[0.72 * s, 0.06 * s, 0.04 * s]} color={CHEST_METAL} emissive={0.16} />
      <ChestBox position={[0, -0.005 * s, -0.02 * s]} scale={[0.7 * s, 0.055 * s, 0.04 * s]} color={CHEST_METAL_DARK} emissive={0.1} />
      <ChestBox position={[-0.24 * s, 0.08 * s, 0.2 * s]} scale={[0.065 * s, 0.19 * s, 0.47 * s]} color={CHEST_METAL_DARK} emissive={0.12} />
      <ChestBox position={[0.24 * s, 0.08 * s, 0.2 * s]} scale={[0.065 * s, 0.19 * s, 0.47 * s]} color={CHEST_METAL_DARK} emissive={0.12} />
      {/* 윗면 중앙 보강띠 — 탑뷰에서도 '상자'임을 읽히게 한다 */}
      <ChestBox position={[0, 0.17 * s, 0.2 * s]} scale={[0.08 * s, 0.035 * s, 0.33 * s]} color={CHEST_METAL} emissive={0.16} />
    </group>
  )
}

export default function TreasureChest({ id, position, scale = 1, onOpen }) {
  const openedRef = useRef(false)
  const [burst, setBurst] = useState(false)   // "퍽" 오픈 버스트 재생 중
  const [done, setDone] = useState(false)     // 연출 종료 → 렌더 제거
  const elapsedRef = useRef(0)
  const burstElapsedRef = useRef(0)
  const groupRef = useRef()
  const lidRef = useRef()
  const flashRef = useRef()
  const glowMatRef = useRef()
  const phase = useGameStore((s) => s.phase)

  // 플래시 기둥 재질 — 순백금 발광 토온. 버스트 동안 opacity를 직접 구동한다.
  const flashMat = useMemo(() => {
    const m = toonMat(CHEST_FLASH, 1.0)
    m.transparent = true
    m.depthWrite = false
    m.toneMapped = false
    return m
  }, [])

  const s = scale

  useFrame((_, delta) => {
    if (done || phase !== 'playing') return

    // ── 1) 대기 → 오픈 트리거 ────────────────────────────────────────────────
    if (!openedRef.current) {
      elapsedRef.current += delta * 1000

      // 오픈 임박 흔들림 — 마지막 구간에만 좌우로 부르르 떤다(연출 힌트).
      if (groupRef.current) {
        const remain = CHEST_OPEN_DELAY_MS - elapsedRef.current
        groupRef.current.rotation.z =
          remain <= CHEST_SHAKE_LEAD_MS ? Math.sin(performance.now() * 0.045) * 0.08 : 0
      }

      if (elapsedRef.current >= CHEST_OPEN_DELAY_MS) {
        openedRef.current = true
        setBurst(true)
        // "퍽" 오픈음(임시: 골드 마일스톤 징글) — soundmini가 전용 오픈 SFX로 교체 예정.
        emitSfx({ id: 'milestoneGold', volume: 0.7 })
        // 금빛 파열 — 바닥 링 팝 + 상자 둘레 스파크(전역 VFX 재사용, VFXLayer가 정리).
        emitVfx({ type: 'pickupPop', x: position[0], z: position[2], y: 0.16 * s, color: CHEST_FLASH, life: 480 })
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.5
          emitVfx({
            type: 'hitSpark',
            color: CHEST_FLASH,
            life: 260,
            baseScale: 0.14,
            growScale: 0.26,
            x: position[0] + Math.cos(a) * 0.3 * s,
            y: 0.35 * s,
            z: position[2] + Math.sin(a) * 0.3 * s,
          })
        }
        // 코인 산포(onOpen → 부모가 GoldCoin 스폰)는 "퍽" 순간 즉시 — 뚜껑과 동시에 튀어나온다.
        onOpen?.(id, position)
      }
      return
    }

    // ── 2) "퍽" 버스트 — 뚜껑 젖힘 + 스케일 팝 + 플래시 페이드 ────────────────
    burstElapsedRef.current += delta * 1000
    const t = Math.min(1, burstElapsedRef.current / CHEST_BURST_MS)

    if (lidRef.current) {
      // 뚜껑이 경첩(뒤 모서리)을 축으로 확 젖혀지며 위로 살짝 튄다.
      const fling = 1 - Math.pow(1 - Math.min(1, t / 0.5), 3) // ease-out, 앞 50%에 다 열림
      lidRef.current.rotation.x = -2.1 * fling
      lidRef.current.position.y = 0.32 * s + Math.sin(Math.PI * Math.min(1, t / 0.5)) * 0.14 * s
    }
    if (groupRef.current) {
      // 상자 전체 스케일 팝(1→1.18→1) 후 후반부 줄어들며 소멸.
      const pop = 1 + 0.18 * Math.sin(Math.PI * Math.min(1, t / 0.45))
      const vanish = t < 0.62 ? 1 : Math.max(0, 1 - (t - 0.62) / 0.38)
      const gs = Math.max(0.0001, pop * vanish)
      groupRef.current.scale.set(gs, gs, gs)
      groupRef.current.rotation.z = 0
    }
    if (flashRef.current) {
      // 상자 안에서 솟는 금빛 플래시 기둥 — 빠르게 커졌다 사라진다.
      const rise = 1 - Math.pow(1 - t, 2)
      flashRef.current.scale.set(1 + rise * 0.8, 1 + rise * 2.2, 1 + rise * 0.8)
      flashRef.current.position.y = (0.3 + rise * 0.5) * s
    }
    flashMat.opacity = Math.max(0, 1 - t * 1.6)
    if (glowMatRef.current) glowMatRef.current.opacity = Math.max(0, 0.55 * (1 - t))

    if (t >= 1) setDone(true)
  })

  if (done) return null

  return (
    <group ref={groupRef} position={position}>
      <ChestBody s={s} />
      {/* 뚜껑 피벗(뒤 모서리 경첩) */}
      <group ref={lidRef} position={[0, 0.32 * s, -0.19 * s]}>
        <ChestLid s={s} />
      </group>
      {burst && (
        <>
          {/* 금빛 플래시 기둥 — 오픈 순간 상자 안에서 솟는다. */}
          <mesh ref={flashRef} position={[0, 0.3 * s, 0]} material={flashMat} renderOrder={50}>
            <boxGeometry args={[0.3 * s, 0.3 * s, 0.3 * s]} />
          </mesh>
          {/* 바닥 금빛 글로우 원반 */}
          <mesh position={[0, 0.02 * s, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={49}>
            <circleGeometry args={[0.55 * s, 24]} />
            <meshBasicMaterial ref={glowMatRef} color={CHEST_FLASH} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}
