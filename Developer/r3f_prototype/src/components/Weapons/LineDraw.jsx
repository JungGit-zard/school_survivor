import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { normalizePlanarFacing } from '../../lib/boxCutter.js'
// ↓ 무기 로직(파일 하단 LineDrawWeapon)에서만 쓴다. 모델·이펙트는 위 import만 사용한다.
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerArmActionState, playerFacing, playerPos } from '../../lib/refs.js'
import { BOX_CUTTER_ACTION_MS, computeBoxCutterActionPhases, startPlayerArmAction } from '../../lib/playerArmAction.js'
import {
  applyLineDrawStrike,
  createLineDrawRuntime,
  pruneExpiredCutLines,
  spawnCutLine,
  updateCutLineCrossings,
} from '../../lib/lineDraw.js'
import { useGameStore } from '../../store/useGameStore.js'

// 선긋기 — 30cm 자 + 커터칼을 테이프로 붙여 만든 학생 자작 무기.
//
// 자는 "직선을 긋는 도구", 커터칼은 "자르는 도구". 둘을 붙였으니 자를 대고 그은
// 완벽한 직선 절단이 나온다. 손잡이(뒤쪽) 끝에는 화난 소녀 얼굴 장식이 달려 있다.
//
// 이 파일은 "무기가 어떻게 생겼는가"와 "그은 절단선이 어떻게 보이는가"만 정의한다.
// 발사 타이밍·판정·적 절단 처리는 로직 담당이 이 모델과 이펙트를 조립해 만든다.

// 자 본체 치수(모델 로컬). 그룹 scale 0.5가 곱해진다.
const RULER_LENGTH = 1.5
const RULER_WIDTH = 0.17
const RULER_THICK = 0.045
// 손잡이(뒤쪽) 끝 — 화난 소녀 얼굴 장식이 붙는 지점.
const GRIP_END_Z = -RULER_LENGTH / 2

// 자 위의 눈금 z 위치. 30cm 자의 5cm 간격 큰 눈금을 흉내낸다.
const RULER_TICKS = [-0.52, -0.26, 0, 0.26, 0.52]

/**
 * 선긋기 모델 — 30cm 자 + 테이프로 붙인 커터칼 날 + 화난 소녀 얼굴 장식.
 *
 * @param {object} props
 * @param {number} [props.scale=0.5] 모델 전체 배율. Studio 튜닝과 별개인 로컬 기본 크기다.
 *
 * 주의: 본체 파트 머티리얼에서 depth 관련 플래그를 끄지 않는다. 파트마다 머티리얼
 * 인스턴스가 달라서 depth를 끄면 JSX 선언 순서가 가림을 결정해 모델이 깨진다.
 * 소품 위로 띄워야 하면 renderOrder만 쓴다.
 */
export function LineDrawModel({ scale = 0.5 }) {
  // 자 — 반투명이 아니라 불투명 카툰 톤의 하늘색/민트. 커터칼 노랑(0xffc928)과
  // 바이키티 은회색(0xb6c0cc)/남색(0x1d2a44)과 확실히 구분된다.
  const rulerMat = useMemo(() => toonMat(0x63d9d2, 0.12), [])
  const rulerEdgeMat = useMemo(() => toonMat(0xbdf3ef, 0.16), [])
  const tickMat = useMemo(() => toonMat(0x123f4a, 0.04), [])
  const bladeMat = useMemo(() => toonMat(0xdce6ee, 0.06), [])
  const edgeMat = useMemo(() => toonMat(0xffffff, 0.12), [])
  const tapeMat = useMemo(() => toonMat(0xf2e0ab, 0.08), [])
  const skinMat = useMemo(() => toonMat(0xffd9bf, 0.1), [])
  const hairMat = useMemo(() => toonMat(0x3b2a48, 0.05), [])
  const browMat = useMemo(() => toonMat(0x241a2e, 0.02), [])
  const eyeMat = useMemo(() => toonMat(0x1a1420, 0.02), [])
  const mouthMat = useMemo(() => toonMat(0x7d2440, 0.04), [])
  const angerMat = useMemo(() => toonMat(0xff3355, 0.5), [])
  const blushMat = useMemo(() => toonMat(0xff9db4, 0.12), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <StudioTunedGroup itemId="weapon-line-draw">
      <group scale={[scale, scale, scale]} rotation={[0.1, 0, -0.06]}>
        {/* ── 30cm 자 본체 ── */}
        <mesh material={outMat} scale={inflateScale([1.08, 1.14, 1.02])}>
          <boxGeometry args={[RULER_WIDTH, RULER_THICK, RULER_LENGTH]} />
        </mesh>
        <mesh material={rulerMat}>
          <boxGeometry args={[RULER_WIDTH, RULER_THICK, RULER_LENGTH]} />
        </mesh>

        {/* 자 윗면 밝은 띠 — 투명 자 특유의 빛나는 모서리 느낌 */}
        <mesh material={rulerEdgeMat} position={[-0.062, 0.024, 0]}>
          <boxGeometry args={[0.035, 0.008, RULER_LENGTH * 0.96]} />
        </mesh>

        {/* 눈금 — 5cm 간격 큰 눈금 5개 */}
        {RULER_TICKS.map((z) => (
          <mesh key={z} material={tickMat} position={[0.03, 0.026, z]}>
            <boxGeometry args={[0.1, 0.006, 0.016]} />
          </mesh>
        ))}

        {/* ── 옆에 테이프로 붙인 커터칼 날 ── */}
        <mesh
          material={outMat}
          position={[0.145, 0.006, 0.16]}
          scale={inflateScale([1.16, 1.2, 1.02])}
        >
          <boxGeometry args={[0.095, 0.03, 0.92]} />
        </mesh>
        <mesh material={bladeMat} position={[0.145, 0.006, 0.16]}>
          <boxGeometry args={[0.095, 0.03, 0.92]} />
        </mesh>
        {/* 날 등쪽 절단선 하이라이트 */}
        <mesh material={edgeMat} position={[0.185, 0.02, 0.16]}>
          <boxGeometry args={[0.022, 0.012, 0.88]} />
        </mesh>
        {/* 날 끝 — 앞으로 살짝 튀어나온 뾰족한 선단 */}
        <mesh material={edgeMat} position={[0.145, 0.006, 0.65]}>
          <boxGeometry args={[0.09, 0.026, 0.12]} />
        </mesh>

        {/* 테이프 두 바퀴 — 자와 날을 함께 감아 붙였다 */}
        <mesh material={outMat} position={[0.06, 0.005, -0.1]} scale={inflateScale([1.06, 1.16, 1.14])}>
          <boxGeometry args={[0.31, 0.075, 0.13]} />
        </mesh>
        <mesh material={tapeMat} position={[0.06, 0.005, -0.1]}>
          <boxGeometry args={[0.31, 0.075, 0.13]} />
        </mesh>
        <mesh material={outMat} position={[0.06, 0.005, 0.44]} scale={inflateScale([1.06, 1.16, 1.14])}>
          <boxGeometry args={[0.31, 0.075, 0.13]} />
        </mesh>
        <mesh material={tapeMat} position={[0.06, 0.005, 0.44]}>
          <boxGeometry args={[0.31, 0.075, 0.13]} />
        </mesh>

        {/* ── 손잡이 끝 장식: 오리지널 카툰 화난 소녀 얼굴 ──
            얼굴 앞면은 -z 방향(플레이어 쪽에서 보이는 면)을 본다. */}
        <group position={[0, 0.05, GRIP_END_Z - 0.2]}>
          {/* 머리 */}
          <mesh material={outMat} scale={inflateScale([1.07, 1.07, 1.07])}>
            <sphereGeometry args={[0.21, 14, 12]} />
          </mesh>
          <mesh material={skinMat}>
            <sphereGeometry args={[0.21, 14, 12]} />
          </mesh>

          {/* 앞머리 — 이마를 덮는 두툼한 뱅 */}
          <mesh material={outMat} position={[0, 0.115, -0.045]} scale={inflateScale([1.06, 1.08, 1.06])}>
            <boxGeometry args={[0.4, 0.16, 0.36]} />
          </mesh>
          <mesh material={hairMat} position={[0, 0.115, -0.045]}>
            <boxGeometry args={[0.4, 0.16, 0.36]} />
          </mesh>
          {/* 뒤통수 머리 */}
          <mesh material={hairMat} position={[0, 0.02, 0.09]}>
            <boxGeometry args={[0.38, 0.32, 0.26]} />
          </mesh>
          {/* 양갈래로 뻗친 머리 — 화가 나서 위로 솟았다 */}
          <mesh material={outMat} position={[-0.21, 0.05, 0.06]} rotation={[0, 0, 0.5]} scale={inflateScale([1.08, 1.08, 1.08])}>
            <coneGeometry args={[0.075, 0.26, 4]} />
          </mesh>
          <mesh material={hairMat} position={[-0.21, 0.05, 0.06]} rotation={[0, 0, 0.5]}>
            <coneGeometry args={[0.075, 0.26, 4]} />
          </mesh>
          <mesh material={outMat} position={[0.21, 0.05, 0.06]} rotation={[0, 0, -0.5]} scale={inflateScale([1.08, 1.08, 1.08])}>
            <coneGeometry args={[0.075, 0.26, 4]} />
          </mesh>
          <mesh material={hairMat} position={[0.21, 0.05, 0.06]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.075, 0.26, 4]} />
          </mesh>

          {/* 치켜올라간 눈썹 — 안쪽이 내려온 八자 반대 모양 */}
          <mesh material={browMat} position={[-0.085, 0.075, -0.196]} rotation={[0, 0, -0.55]}>
            <boxGeometry args={[0.115, 0.028, 0.03]} />
          </mesh>
          <mesh material={browMat} position={[0.085, 0.075, -0.196]} rotation={[0, 0, 0.55]}>
            <boxGeometry args={[0.115, 0.028, 0.03]} />
          </mesh>

          {/* 찌푸린 눈 — 위가 눌린 납작한 눈 */}
          <mesh material={eyeMat} position={[-0.075, 0.015, -0.198]} rotation={[0, 0, -0.22]}>
            <boxGeometry args={[0.06, 0.045, 0.035]} />
          </mesh>
          <mesh material={eyeMat} position={[0.075, 0.015, -0.198]} rotation={[0, 0, 0.22]}>
            <boxGeometry args={[0.06, 0.045, 0.035]} />
          </mesh>

          {/* 앙다문 입 — 한일자로 꾹 다문 뒤 한쪽만 살짝 내려간다 */}
          <mesh material={mouthMat} position={[0, -0.085, -0.196]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.115, 0.026, 0.03]} />
          </mesh>

          {/* 볼 홍조 */}
          <mesh material={blushMat} position={[-0.135, -0.045, -0.166]}>
            <boxGeometry args={[0.055, 0.032, 0.03]} />
          </mesh>
          <mesh material={blushMat} position={[0.135, -0.045, -0.166]}>
            <boxGeometry args={[0.055, 0.032, 0.03]} />
          </mesh>

          {/* 화난 표시(십자 핏대) — 오른쪽 관자놀이 */}
          <mesh material={angerMat} position={[0.135, 0.135, -0.14]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.085, 0.02, 0.022]} />
          </mesh>
          <mesh material={angerMat} position={[0.135, 0.135, -0.14]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.02, 0.085, 0.022]} />
          </mesh>
        </group>
      </group>
    </StudioTunedGroup>
  )
}

// ─── 절단선 이펙트 ──────────────────────────────────────────────────────────
//
// 그은 자리에 붉은 직선이 2초 남는다. 그 선을 가로지르는 적이 생기면 로직 담당이
// `flashAt(x, z)`를 불러 그 지점만 번쩍이게 한다.
//
// 이펙트 머티리얼은 MeshBasicMaterial + AdditiveBlending + depthWrite:false를 쓴다.
// 이건 BoxCutterStrikeEffect와 동일한 정본 패턴이며 본체 모델의 depth 규칙과 무관하다.

export const LINE_DRAW_TRAIL_LENGTH = 6.0
export const LINE_DRAW_TRAIL_WIDTH = 0.16
export const LINE_DRAW_TRAIL_MS = 2000
// 바닥에서 살짝 띄워 z-fighting을 피한다.
export const LINE_DRAW_TRAIL_Y = 0.03
// 교차 번쩍임 동시 표시 개수와 지속 시간.
export const LINE_DRAW_FLASH_POOL = 8
export const LINE_DRAW_FLASH_MS = 220

/**
 * 절단선 판의 지오메트리를 만든다. 원점에서 로컬 +z 방향으로 length만큼 뻗는다.
 * 길이는 prop으로 바뀌며, 0 이하 값은 안전하게 최소값으로 잘린다.
 */
export function buildLineDrawTrailGeometry(
  length = LINE_DRAW_TRAIL_LENGTH,
  width = LINE_DRAW_TRAIL_WIDTH,
) {
  const len = Math.max(0.01, Number(length) || 0)
  const wid = Math.max(0.01, Number(width) || 0)
  const geo = new THREE.PlaneGeometry(wid, len)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, len / 2)
  return geo
}

/**
 * 절단선 이펙트.
 *
 * @param {object} props
 * @param {{startMs:number, x:number, z:number, facing:{x:number,z:number}}|null} props.trail
 *   그어진 선. null이면 아무 선도 표시하지 않는다.
 * @param {number} [props.length=6] 선 길이(world units). 지오메트리가 이 값으로 다시 만들어진다.
 * @param {number} [props.width=0.16] 선 폭.
 * @param {number} [props.durationMs=2000] 선이 남아 있는 시간.
 *
 * @ref {{ flashAt(x:number, z:number, nowMs?:number): number, clearFlashes(): void }}
 *   `flashAt`은 world XZ 좌표에 교차 번쩍임 하나를 띄운다. nowMs를 넘기지 않으면
 *   이펙트가 마지막 프레임에서 본 시각을 쓴다. 반환값은 사용한 풀 슬롯 인덱스다.
 */
export const LineDrawTrailEffect = forwardRef(function LineDrawTrailEffect({
  trail = null,
  length = LINE_DRAW_TRAIL_LENGTH,
  width = LINE_DRAW_TRAIL_WIDTH,
  durationMs = LINE_DRAW_TRAIL_MS,
}, ref) {
  const rootRef = useRef(null)
  const trailRef = useRef(null)
  const flashRefs = useRef([])
  const cursorRef = useRef(0)
  const nowRef = useRef(0)

  const trailGeometry = useMemo(() => buildLineDrawTrailGeometry(length, width), [length, width])
  const flashGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff2f42,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])

  const flashMats = useMemo(() => (
    Array.from({ length: LINE_DRAW_FLASH_POOL }, () => new THREE.MeshBasicMaterial({
      color: 0xfff0f0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }))
  ), [])

  const flashes = useMemo(() => (
    Array.from({ length: LINE_DRAW_FLASH_POOL }, () => ({ startMs: -Infinity, x: 0, z: 0 }))
  ), [])

  useImperativeHandle(ref, () => ({
    flashAt(x, z, nowMs) {
      const slot = cursorRef.current % LINE_DRAW_FLASH_POOL
      cursorRef.current += 1
      const flash = flashes[slot]
      flash.x = Number(x) || 0
      flash.z = Number(z) || 0
      flash.startMs = Number.isFinite(nowMs) ? nowMs : nowRef.current
      return slot
    },
    clearFlashes() {
      flashes.forEach((flash) => { flash.startMs = -Infinity })
    },
  }), [flashes])

  usePlayingFrame(({ clock }) => {
    const now = clock.elapsedTime * 1000
    nowRef.current = now

    if (rootRef.current && trailRef.current) {
      if (!trail) {
        trailRef.current.visible = false
        trailMat.opacity = 0
      } else {
        const progress = THREE.MathUtils.clamp((now - trail.startMs) / durationMs, 0, 1)
        const dir = normalizePlanarFacing(trail.facing)
        rootRef.current.position.set(trail.x, LINE_DRAW_TRAIL_Y, trail.z)
        rootRef.current.rotation.set(0, Math.atan2(dir.x, dir.z), 0)
        // 그은 직후 확 밝게 남았다가 2초에 걸쳐 옅어진다.
        const appear = THREE.MathUtils.clamp(progress / 0.04, 0, 1)
        trailRef.current.visible = progress < 1
        trailMat.opacity = appear * THREE.MathUtils.lerp(0.95, 0.12, progress)
      }
    }

    for (let i = 0; i < LINE_DRAW_FLASH_POOL; i += 1) {
      const mesh = flashRefs.current[i]
      if (!mesh) continue
      const flash = flashes[i]
      const elapsed = now - flash.startMs
      if (!(elapsed >= 0 && elapsed <= LINE_DRAW_FLASH_MS)) {
        mesh.visible = false
        flashMats[i].opacity = 0
        continue
      }
      const t = elapsed / LINE_DRAW_FLASH_MS
      mesh.visible = true
      mesh.position.set(flash.x, LINE_DRAW_TRAIL_Y + 0.01, flash.z)
      // 교차 지점에서 짧게 부풀었다 사라진다.
      mesh.scale.setScalar(0.3 + t * 0.75)
      flashMats[i].opacity = (1 - t) * 0.9
    }
  })

  return (
    <group renderOrder={20}>
      <group ref={rootRef}>
        <mesh ref={trailRef} geometry={trailGeometry} material={trailMat} visible={false} />
      </group>
      {flashMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(node) => { flashRefs.current[i] = node }}
          geometry={flashGeometry}
          material={mat}
          visible={false}
        />
      ))}
    </group>
  )
})

// ─── 무기 로직 ──────────────────────────────────────────────────────────────
//
// 쿨다운마다 전방으로 직선을 긋는다. 두 판정은 완전히 별개다.
//   1) 긋는 순간의 직격  — 선상의 적 전원에게 damage(20) 즉시. 관통 무제한, 넉백 0.
//   2) 잔류 절단선 통과  — 그 뒤 lineDurationMs 동안, 선을 **가로지른** 적만 lineCrossDamage(14).
//      선 위에 가만히 서 있는 적은 맞지 않는다. 판정 정본은 lib/lineDraw.js의 교차 테스트다.
//
// 선점형 무기라 사거리 안에 적이 없어도 쿨다운마다 긋는다(밀려올 길목에 미리 그어두는 것이
// 이 무기의 용법이다). 커터칼처럼 "대상이 있을 때만 발사"로 만들면 기획이 죽는다.
//
// 활성 절단선과 적별 재절단 쿨다운은 전부 useRef 런타임에 둔다. 매 프레임 바뀌는 값이라
// zustand 스토어에 올리면 전역 리렌더를 유발한다.

export function LineDrawWeapon() {
  const weapons = useGameStore((s) => s.weapons)
  const runtimeRef = useRef(null)
  if (runtimeRef.current === null) runtimeRef.current = createLineDrawRuntime()

  // 절단선은 동시에 여러 개일 수 있다(쿨다운 감소가 붙어 지속시간을 넘길 때).
  // 시각 이펙트도 선 하나당 하나씩 붙이고, 교차 번쩍임은 그 선의 ref로 보낸다.
  const [trails, setTrails] = useState([])
  const trailRefs = useRef(new Map())
  const [swing, setSwing] = useState(null)
  const visualRef = useRef(null)
  const lastFireRef = useRef(-Infinity)

  usePlayingFrame(({ clock }) => {
    const w = weapons.lineDraw
    const runtime = runtimeRef.current
    const now = clock.elapsedTime * 1000

    if (!w?.active) {
      if (runtime.lines.length > 0) {
        runtime.lines = []
        runtime.tracked.clear()
        trailRefs.current.clear()
        setTrails([])
      }
      return
    }

    // ① 만료된 절단선 정리
    const expired = pruneExpiredCutLines(runtime, now)
    if (expired.length > 0) {
      emitSfx({ id: 'lineDrawExpire', volume: 0.34 })
      for (const line of expired) trailRefs.current.delete(line.id)
      const liveIds = new Set(runtime.lines.map((line) => line.id))
      setTrails((prev) => prev.filter((t) => liveIds.has(t.id)))
    }

    // ② 잔류 절단선 통과 판정 — 이 무기의 핵심
    updateCutLineCrossings(runtime, {
      nowMs: now,
      damage: w.lineCrossDamage ?? 14,
      cooldownMs: w.lineCrossCooldownMs ?? 600,
      knockback: w.knockback ?? 0,
      critChance: w.critChance,
      critMultiplier: w.critMultiplier,
      onCut: ({ x, z, line }) => {
        emitSfx({ id: 'lineDrawCross', volume: 0.5, rate: 0.95 + Math.random() * 0.12 })
        trailRefs.current.get(line.id)?.flashAt(x, z, now)
      },
    })

    // ③ 긋는 동작 중이면 무기 메시를 팔과 같은 위상으로 움직인다(커터칼과 동일 타이밍).
    if (swing) {
      const progress = Math.min(1, (now - swing.startMs) / BOX_CUTTER_ACTION_MS)
      const dir = normalizePlanarFacing(swing.facing)
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
        visualRef.current.rotation.set(-0.2 - raise * 0.4 * env, yaw, -0.24 - thrust * 0.18 * env)
      }
      if (progress >= 1) setSwing(null)
    }

    // ④ 쿨다운마다 새 선을 긋는다 — 대상 유무와 무관(선점형)
    if (now - lastFireRef.current < (w.cooldown ?? 4200)) return
    lastFireRef.current = now

    const facing = normalizePlanarFacing(playerFacing)
    const range = w.range ?? 6.0
    const durationMs = w.lineDurationMs ?? 2000
    const line = spawnCutLine(runtime, { origin: playerPos, facing, range, nowMs: now, durationMs })

    emitSfx({ id: 'lineDrawSlash' })
    startPlayerArmAction(playerArmActionState, 'boxCutter', now, BOX_CUTTER_ACTION_MS)
    setSwing({ startMs: now, facing })

    // 긋는 순간의 직격 — 잔류선 통과 판정과 별개로 선상의 적 전원에게 즉시 들어간다.
    applyLineDrawStrike({
      origin: playerPos,
      facing,
      range,
      width: w.width ?? 0.22,
      damage: w.damage,
      knockback: w.knockback ?? 0,
      critChance: w.critChance,
      critMultiplier: w.critMultiplier,
    })

    setTrails((prev) => [...prev, {
      id: line.id,
      x: line.ax,
      z: line.az,
      facing,
      startMs: now,
      durationMs,
      length: range,
    }])
  })

  if (!weapons.lineDraw?.active) return null

  return (
    <>
      {swing ? (
        <group ref={visualRef} position={[playerPos.x, playerPos.y + 0.22, playerPos.z]}>
          <LineDrawModel />
        </group>
      ) : null}
      {trails.map((t) => (
        <LineDrawTrailEffect
          key={t.id}
          ref={(node) => {
            if (node) trailRefs.current.set(t.id, node)
            else trailRefs.current.delete(t.id)
          }}
          trail={{ startMs: t.startMs, x: t.x, z: t.z, facing: t.facing }}
          length={t.length}
          durationMs={t.durationMs}
        />
      ))}
    </>
  )
}
