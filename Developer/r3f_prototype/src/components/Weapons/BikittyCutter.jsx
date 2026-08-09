import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerArmActionState, playerFacing, playerPos } from '../../lib/refs.js'
import { normalizePlanarFacing, pickBoxCutterTargets } from '../../lib/boxCutter.js'
import {
  applyBikittySnapDamage,
  bikittySegmentDamage,
  bikittySegmentRange,
  clampBikittySegment,
  isBikittySnapSegment,
  nextBikittySegment,
} from '../../lib/bikittyCutter.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'
import { startPlayerArmAction, computeBoxCutterActionPhases, BOX_CUTTER_ACTION_MS } from '../../lib/playerArmAction.js'
import { useGameStore } from '../../store/useGameStore.js'

// 바이키티 커터칼 — 하얀 고양이 머리 장식이 달린 공업용(L형 대형) 커터칼.
//
// 날은 벨 때마다 한 칸씩 밀려나온다. 8단(segment 0~7)이며 마지막 단에서 부러진다.
// 여기서는 "그 단계의 날이 어떻게 생겼는가"만 정의한다. 밀어내기 타이밍, 파단,
// 무장해제 같은 동작은 로직 담당(BikittyCutterWeapon)이 이 모델에 segment를 넘겨 만든다.
export const BIKITTY_CUTTER_SEGMENT_COUNT = 8
export const BIKITTY_CUTTER_MAX_SEGMENT = BIKITTY_CUTTER_SEGMENT_COUNT - 1

// 날 밑동이 하우징 앞 칼라(collar)를 빠져나오는 지점. 모든 단계가 여기서 자란다.
const BLADE_ROOT_Z = 0.4
const BLADE_BASE_LENGTH = 0.6
const BLADE_WIDTH = 0.17
const BLADE_THICKNESS = 0.115
// 한 칸당 +18%. segment 0 → ×1.0, segment 7 → ×2.26 (기획 확정 사거리 배율과 동일 곡선).
const BLADE_STEP_RATIO = 0.18

function clampSegment(segment) {
  const s = Math.round(Number(segment) || 0)
  return Math.min(BIKITTY_CUTTER_MAX_SEGMENT, Math.max(0, s))
}

// 단계별 날 배율 — 1.0 → 2.26 (8단).
export function bikittyBladeReachMultiplier(segment) {
  return 1 + clampSegment(segment) * BLADE_STEP_RATIO
}

// 날 메시의 z 길이·중심·끝점·가열도를 한 곳에서 계산한다.
// 본체 메시와 아웃라인 메시가 같은 값을 쓰게 하려는 목적이고,
// 테스트는 R3F 렌더 없이 이 순수 함수로 단계별 길이를 검증한다.
export function bikittyBladeShape(segment) {
  const s = clampSegment(segment)
  const length = BLADE_BASE_LENGTH * bikittyBladeReachMultiplier(s)
  return {
    segment: s,
    length,
    centerZ: BLADE_ROOT_Z + length / 2,
    tipZ: BLADE_ROOT_Z + length,
    // 마지막 단으로 갈수록 날 끝이 달아오른다(부러지기 직전 경고).
    heat: s / BIKITTY_CUTTER_MAX_SEGMENT,
  }
}

const BLADE_COOL_COLOR = new THREE.Color(0xdce6ee)
const BLADE_HOT_COLOR = new THREE.Color(0xff3a1e)

/**
 * 바이키티 커터칼 모델.
 *
 * @param {object} props
 * @param {number} [props.segment=0] 0~7 정수. 밀려나온 날 칸 수.
 *   커질수록 날의 z 길이가 늘어나고(0.6 → 1.356) 날 끝이 붉게 달아오른다.
 *   범위를 벗어난 값·비정수는 반올림 후 0~7로 clamp한다.
 */
export function BikittyCutterModel({ segment = 0 }) {
  const blade = useMemo(() => bikittyBladeShape(segment), [segment])

  const bodyMat = useMemo(() => toonMat(0xb6c0cc, 0.1), [])
  const gripMat = useMemo(() => toonMat(0x1d2a44, 0.06), [])
  const railMat = useMemo(() => toonMat(0x6f7c8f, 0.08), [])
  const bladeMat = useMemo(() => toonMat(0xdce6ee, 0.06), [])
  const edgeMat = useMemo(() => toonMat(0xffffff, 0.12), [])
  // 날 끝 가열: 색은 은색→적열, emissive는 0.05→1.0.
  const tipMat = useMemo(() => {
    const color = BLADE_COOL_COLOR.clone().lerp(BLADE_HOT_COLOR, blade.heat)
    return toonMat(color.getHex(), 0.05 + blade.heat * 0.95)
  }, [blade.heat])
  const furMat = useMemo(() => toonMat(0xfdfdfd, 0.09), [])
  const earInnerMat = useMemo(() => toonMat(0xffb7c8, 0.1), [])
  const eyeMat = useMemo(() => toonMat(0x1a1420, 0.02), [])
  const noseMat = useMemo(() => toonMat(0xff9db4, 0.12), [])
  const whiskerMat = useMemo(() => toonMat(0xd8dde6, 0.06), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <StudioTunedGroup itemId="weapon-bikitty-cutter">
      <group scale={[0.5, 0.5, 0.5]} rotation={[0.12, 0, -0.08]}>
        {/* 하우징 — 커터칼보다 크고 두꺼운 공업용 몸통 */}
        <mesh material={outMat} position={[0, 0, -0.16]} scale={inflateScale([1.09, 1.1, 1.05])}>
          <boxGeometry args={[0.3, 0.26, 0.96]} />
        </mesh>
        <mesh material={bodyMat} position={[0, 0, -0.16]}>
          <boxGeometry args={[0.3, 0.26, 0.96]} />
        </mesh>

        {/* 뒤꿈치 블록 — 옆에서 봤을 때 L자 실루엣을 만드는 파트 */}
        <mesh material={outMat} position={[0, -0.24, -0.5]} scale={inflateScale([1.1, 1.08, 1.08])}>
          <boxGeometry args={[0.28, 0.32, 0.34]} />
        </mesh>
        <mesh material={gripMat} position={[0, -0.24, -0.5]}>
          <boxGeometry args={[0.28, 0.32, 0.34]} />
        </mesh>

        {/* 그립 패널(짙은 남색) — 커터칼 노랑과 구분되는 색 */}
        <mesh material={gripMat} position={[0, 0.135, -0.28]}>
          <boxGeometry args={[0.22, 0.04, 0.5]} />
        </mesh>
        <mesh material={gripMat} position={[0.156, 0, -0.28]}>
          <boxGeometry args={[0.02, 0.2, 0.5]} />
        </mesh>
        <mesh material={gripMat} position={[-0.156, 0, -0.28]}>
          <boxGeometry args={[0.02, 0.2, 0.5]} />
        </mesh>

        {/* 날 밀개 슬라이더 + 가이드 레일 */}
        <mesh material={outMat} position={[0, 0.16, 0.02]} scale={inflateScale([1.14, 1.14, 1.1])}>
          <boxGeometry args={[0.12, 0.07, 0.16]} />
        </mesh>
        <mesh material={railMat} position={[0, 0.16, 0.02]}>
          <boxGeometry args={[0.12, 0.07, 0.16]} />
        </mesh>
        <mesh material={railMat} position={[0, 0.132, 0.14]}>
          <boxGeometry args={[0.05, 0.02, 0.42]} />
        </mesh>

        {/* 앞 칼라 — 날이 빠져나오는 구멍 */}
        <mesh material={outMat} position={[0, 0.02, 0.38]} scale={inflateScale([1.1, 1.1, 1.08])}>
          <boxGeometry args={[0.24, 0.2, 0.2]} />
        </mesh>
        <mesh material={railMat} position={[0, 0.02, 0.38]}>
          <boxGeometry args={[0.24, 0.2, 0.2]} />
        </mesh>

        {/* 날 — segment에 따라 z 길이와 위치가 함께 늘어난다(아웃라인도 동일) */}
        <mesh
          material={outMat}
          position={[0, 0.02, blade.centerZ]}
          scale={inflateScale([1.12, 1.13, 1.02])}
        >
          <boxGeometry args={[BLADE_WIDTH, BLADE_THICKNESS, blade.length]} />
        </mesh>
        <mesh material={bladeMat} position={[0, 0.02, blade.centerZ]}>
          <boxGeometry args={[BLADE_WIDTH, BLADE_THICKNESS, blade.length]} />
        </mesh>
        {/* 날 등쪽 절단선(칸 구분) 하이라이트 */}
        <mesh material={edgeMat} position={[0.058, 0.076, blade.centerZ]}>
          <boxGeometry args={[0.03, 0.018, blade.length * 0.96]} />
        </mesh>
        {/* 날 끝 가열부 */}
        <mesh material={tipMat} position={[0, 0.02, blade.tipZ - 0.08]}>
          <boxGeometry args={[BLADE_WIDTH * 1.02, BLADE_THICKNESS * 1.02, 0.16]} />
        </mesh>

        {/* ── 그립 엔드 장식: 오리지널 카툰 흰 고양이 머리 ── */}
        <group position={[0, 0.1, -0.8]}>
          {/* 머리 */}
          <mesh material={outMat} scale={inflateScale([1.07, 1.07, 1.07])}>
            <sphereGeometry args={[0.22, 14, 12]} />
          </mesh>
          <mesh material={furMat}>
            <sphereGeometry args={[0.22, 14, 12]} />
          </mesh>

          {/* 뾰족한 두 귀 */}
          <mesh material={outMat} position={[-0.13, 0.21, -0.02]} rotation={[0, 0, 0.22]} scale={inflateScale([1.1, 1.1, 1.1])}>
            <coneGeometry args={[0.085, 0.19, 4]} />
          </mesh>
          <mesh material={furMat} position={[-0.13, 0.21, -0.02]} rotation={[0, 0, 0.22]}>
            <coneGeometry args={[0.085, 0.19, 4]} />
          </mesh>
          <mesh material={earInnerMat} position={[-0.13, 0.2, -0.07]} rotation={[0, 0, 0.22]}>
            <coneGeometry args={[0.045, 0.11, 4]} />
          </mesh>

          <mesh material={outMat} position={[0.13, 0.21, -0.02]} rotation={[0, 0, -0.22]} scale={inflateScale([1.1, 1.1, 1.1])}>
            <coneGeometry args={[0.085, 0.19, 4]} />
          </mesh>
          <mesh material={furMat} position={[0.13, 0.21, -0.02]} rotation={[0, 0, -0.22]}>
            <coneGeometry args={[0.085, 0.19, 4]} />
          </mesh>
          <mesh material={earInnerMat} position={[0.13, 0.2, -0.07]} rotation={[0, 0, -0.22]}>
            <coneGeometry args={[0.045, 0.11, 4]} />
          </mesh>

          {/* 검은 점눈 2개 — 머리 앞면(-z) 밖으로 살짝 튀어나오게 둔다 */}
          <mesh material={eyeMat} position={[-0.082, 0.045, -0.198]}>
            <boxGeometry args={[0.045, 0.055, 0.05]} />
          </mesh>
          <mesh material={eyeMat} position={[0.082, 0.045, -0.198]}>
            <boxGeometry args={[0.045, 0.055, 0.05]} />
          </mesh>

          {/* 작은 분홍 코 */}
          <mesh material={noseMat} position={[0, -0.035, -0.212]}>
            <boxGeometry args={[0.05, 0.036, 0.045]} />
          </mesh>

          {/* 수염 */}
          <mesh material={whiskerMat} position={[-0.15, -0.05, -0.16]} rotation={[0, 0, 0.16]}>
            <boxGeometry args={[0.2, 0.014, 0.014]} />
          </mesh>
          <mesh material={whiskerMat} position={[-0.15, -0.095, -0.15]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.18, 0.014, 0.014]} />
          </mesh>
          <mesh material={whiskerMat} position={[0.15, -0.05, -0.16]} rotation={[0, 0, -0.16]}>
            <boxGeometry args={[0.2, 0.014, 0.014]} />
          </mesh>
          <mesh material={whiskerMat} position={[0.15, -0.095, -0.15]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.18, 0.014, 0.014]} />
          </mesh>
        </group>
      </group>
    </StudioTunedGroup>
  )
}

// ─── 전투 로직 ──────────────────────────────────────────────────────────────
//
// 벨 때마다 날이 한 칸 나오고(segment 0→7), 8단째 타격에서 부러져 전방 90° 부채꼴
// 산탄을 한 번 뿌린 뒤 무장해제된다. 단 상태와 재장전 타이머는 매 타격마다 스토어
// 리렌더가 돌지 않도록 전부 useRef로 프레임 로컬 관리한다.
export function BikittyCutterWeapon() {
  const weapons = useGameStore((s) => s.weapons)
  const [strike, setStrike] = useState(null)
  const visualRef = useRef(null)
  const segmentRef = useRef(0)
  // 다음 발사 가능 시각. 평소엔 now + cooldown, 부러진 직후엔 now + cooldown + reloadMs.
  // reloadMs(1200)가 cooldown(2400)보다 짧아서 둘을 겹쳐 흘리면 재장전이 실효 시간을
  // 전혀 깎지 못한다. 기획 사이클(8×2.4s + 1.2s = 20.4s)을 그대로 재현하려면 가산해야 한다.
  const nextReadyAtRef = useRef(-Infinity)

  usePlayingFrame(({ clock }) => {
    const w = weapons.bikittyCutter
    if (!w?.active) return

    const now = clock.elapsedTime * 1000
    const duration = BOX_CUTTER_ACTION_MS

    if (strike) {
      const progress = Math.min(1, (now - strike.startMs) / duration)
      const dir = normalizePlanarFacing(strike.facing)
      const yaw = Math.atan2(dir.x, dir.z)
      const { thrust, raise, env } = computeBoxCutterActionPhases(progress)
      const forward = (THREE.MathUtils.lerp(0.26, 0.66, thrust) - raise * 0.32) * env
      const lift = (0.22 + raise * 0.66) - (1 - env) * raise * 0.66

      if (visualRef.current) {
        visualRef.current.position.set(
          playerPos.x + dir.x * forward,
          playerPos.y + lift,
          playerPos.z + dir.z * forward,
        )
        visualRef.current.rotation.set(-0.25 - raise * 0.5 * env, yaw + Math.PI * 0.02, -0.3 - thrust * 0.2 * env)
      }

      if (progress >= 1) setStrike(null)
      return
    }

    // 재장전(무장해제) 구간이면 발사 불가. 이 구간에는 strike도 없으므로 모델도 렌더되지 않는다.
    if (now < nextReadyAtRef.current) return

    const segment = clampBikittySegment(segmentRef.current, w)
    const facing = normalizePlanarFacing(playerFacing)
    const targets = pickBoxCutterTargets({
      origin: playerPos,
      facing,
      range: bikittySegmentRange(w, segment),
      width: w.width ?? 0.18,
    })
    if (targets.length === 0) return

    const damage = bikittySegmentDamage(w, segment)
    targets.forEach(({ rb, generation }) => {
      const hit = applyEnemyHit(rb, generation, damage, {
        source: { x: playerPos.x, z: playerPos.z },
        knockback: w.knockback ?? 1.8,
        knockbackMs: 80,
        critChance: w.critChance,
        critMultiplier: w.critMultiplier,
      })
      if (!hit) return
      // 타격음은 커터칼 계열 공용 음원을 그대로 쓴다(soundmini가 전용 음원으로 교체 가능).
      emitSfx({ id: 'boxCutterHit', volume: 0.52, rate: 1.00 + Math.random() * 0.10 })
    })

    const snapped = isBikittySnapSegment(w, segment)
    if (snapped) {
      emitSfx({ id: 'bikittyCutterSnap' })
      // 단순화: 펠릿 개별 시뮬레이션 없이 부채꼴 안의 적 전원이 snapDamage를 1회 받는다.
      // snapPellets는 시각 연출 파편 수로만 남겨두고 피해 계산에는 쓰지 않는다.
      applyBikittySnapDamage({
        origin: playerPos,
        facing,
        range: w.snapRange,
        arcDeg: w.snapArcDeg,
        damage: w.snapDamage,
        knockback: w.knockback ?? 1.8,
        knockbackMs: 120,
        critChance: w.critChance,
        critMultiplier: w.critMultiplier,
      })
      emitSfx({ id: 'bikittyCutterReload' })
    } else {
      // 단수가 오를수록 딸깍 음이 높아진다 — 날이 얼마나 나왔는지 소리만으로 알 수 있게.
      // rate 0.8(1단) → 1.6(8단). 음원은 이 범위에서 클리핑 없이 재생되도록 만들어져 있다.
      emitSfx({ id: 'bikittyCutterFire', rate: 0.8 + segment * 0.114 })
    }

    nextReadyAtRef.current = now + (w.cooldown ?? 2400) + (snapped ? (w.reloadMs ?? 1200) : 0)
    segmentRef.current = nextBikittySegment(w, segment)
    startPlayerArmAction(playerArmActionState, 'boxCutter', now, duration)
    setStrike({ startMs: now, facing, segment })
  })

  if (!weapons.bikittyCutter?.active || !strike) return null

  return (
    <group ref={visualRef} position={[playerPos.x, playerPos.y + 0.22, playerPos.z]}>
      <BikittyCutterModel segment={strike.segment} />
    </group>
  )
}
