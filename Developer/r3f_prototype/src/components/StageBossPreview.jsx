import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { DEFAULT_STAGE_BOSS_PREVIEW, normalizeStageBossPreview } from '../lib/graphicsStudioConfig.js'
import { EnemyVisual, ENEMY_STATS, ENEMY_SIZE_MULTIPLIER } from './Enemy.jsx'

const previewFrameStyle = {
  width: '100%',
  height: 104,
  border: '2px solid #050209',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(24,55,47,0.9), rgba(16,40,32,0.92))',
  overflow: 'hidden',
  touchAction: 'none',
  boxSizing: 'border-box',
}

const BASE_ROT_X = 0.08
const BASE_ROT_Y = -0.5
// 카드 쇼타임의 보스 포즈 지속 시간. 로비의 진입 지연과 동일하게 유지한다.
const SHOWTIME_MOTION_MS = 1000
const PARALLAX_MAX = 0.12 // rad

// EnemyVisual 내부 그룹 스케일 계수 (Enemy.jsx의 `cs * 0.333`와 동일)
export const ENEMY_VISUAL_SCALE = 0.333

// 얼굴(머리) 중간지점의 로컬 Y = ZombieMesh reg('head') 그룹 position.y.
// 머리 블록/얼굴 텍스처의 기하 중심이라 '얼굴 중간지점' 앵커로 사용한다. 보스 타입별로 다르다.
export const FACE_LOCAL_Y = Object.freeze({ B01: 0.88, B02: 0.92, B03: 0.88 })
const DEFAULT_FACE_LOCAL_Y = 0.82 // 표준 좀비(E01~E06) 머리 그룹 Y

// ortho 카메라는 rotation을 주지 않아 R3F가 lookAt(0,0,0)을 적용한다(원점 응시).
// 그래서 화면 세로 중앙에 투영되는 월드 Y ≈ 0(카메라가 바라보는 원점)이다.
// 얼굴 월드 Y를 0에 앵커하면 캔버스 높이/기종/zoom과 무관하게 세로 중앙 정렬이 고정된다
// (핸드폰 기종이 바뀌어도 모델이 아래로 내려가는 드리프트 방지).
// 얼굴 월드 Y = baseY + faceLocalY * previewScale, 이를 0으로 두면 baseY = -faceLocalY * previewScale.
export function resolveBossPreviewBaseY(bossType) {
  const stats = ENEMY_STATS[bossType] ?? ENEMY_STATS.B01
  const previewScale = stats.scale * ENEMY_SIZE_MULTIPLIER * ENEMY_VISUAL_SCALE
  const faceLocalY = FACE_LOCAL_Y[bossType] ?? DEFAULT_FACE_LOCAL_Y
  return -faceLocalY * previewScale
}

// 보스별 크라운(머리 꼭대기) 높이 차이 보정.
// B02는 올림머리(bun)+헤어플레이트라 크라운이 B01보다 높아, 같은 zoom이면 bun이 프레임
// 위로 잘린다. 목표는 두 카드의 보스가 "같은 크기"로 보이는 것 → B02를 B01과 최대한
// 같은 zoom으로 두되, bun이 잘리지 않을 만큼만 살짝 낮춘다.
// 라이브 실측(144px 프레임): B02 렌더 zoom ≈104(=110×0.95)에서 B01(110)과 크기가
// 사실상 같으면서 bun 상단에 여백이 남는다. (0.66은 크기가 눈에 띄게 작아 부적합.)
const BOSS_PREVIEW_ZOOM_FACTOR = Object.freeze({ B01: 1, B02: 0.95, B03: 1 })

export function resolveBossPreviewZoom(baseZoom, bossType) {
  return baseZoom * (BOSS_PREVIEW_ZOOM_FACTOR[bossType] ?? 1)
}

// 모션 게이트: prefers-reduced-motion 또는 data-reduced-effects면 완전 정적.
function motionAllowed() {
  if (typeof window === 'undefined') return false
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const datasetReduced =
    typeof document !== 'undefined' && document.documentElement?.dataset?.reducedEffects === 'true'
  return !reduced && !datasetReduced
}

// 포인터 패럴랙스는 pointer:fine(마우스급) 기기에서만. coarse(터치)는 스크롤/탭 방해 금지 → 비활성.
function pointerFine() {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)')?.matches === true
}

// Canvas 자식: R3F 훅(useThree/useFrame)은 반드시 여기 안에서만 호출.
// demand 루프 유지 — 버스트/패럴랙스가 진행 중일 때만 invalidate()로 프레임을 요청하고,
// settle되면 아무 것도 안 해서 정적으로 되돌아간다.
function ReactiveBoss({ framing, bossType, enabled, frozen, burstRef, parallaxRef, invalidateRef }) {
  const groupRef = useRef(null)
  const invalidate = useThree((s) => s.invalidate)
  const lastBurstRef = useRef(0)
  const burstStartRef = useRef(-Infinity)
  const tiltRef = useRef({ x: 0, y: 0 })

  // 얼굴 중앙 앵커 기준 Y. panY/bobY는 그 위에서의 미세 오프셋으로 동작한다.
  const baseY = resolveBossPreviewBaseY(bossType)

  // 래퍼 div의 포인터 핸들러가 온디맨드 프레임을 kick할 수 있도록 invalidate 노출.
  useEffect(() => {
    invalidateRef.current = invalidate
    return () => {
      if (invalidateRef.current === invalidate) invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return

    if (!enabled) {
      g.scale.setScalar(1)
      g.rotation.x = BASE_ROT_X
      g.rotation.y = BASE_ROT_Y
      g.position.y = baseY + framing.panY
      return
    }

    let active = false
    const now = state.clock.elapsedTime * 1000

    // 탭 리액션: burstToken(ref)이 바뀌면 새 버스트 시작.
    if (burstRef.current !== lastBurstRef.current) {
      lastBurstRef.current = burstRef.current
      burstStartRef.current = now
    }

    let scale = 1
    let yawNudge = 0
    let pitchNudge = 0
    let bobY = 0
    const be = now - burstStartRef.current
    if (be >= 0 && be < SHOWTIME_MOTION_MS) {
      const p = be / SHOWTIME_MOTION_MS
      // 카메라 쪽으로 확 들이닥치는 lunge 엔벨로프: 앞부분(≈p0.34)에서 빠르게 피크 후 되돌아옴.
      // ortho 프리뷰는 원근 확대가 없어, 스케일 급증이 "달려듦"의 핵심 신호가 된다.
      const lunge = Math.sin(Math.PI * Math.pow(p, 0.62))
      scale = 1 + 0.2 * lunge // 최대 ~1.2배 — 크라운이 프레임 밖으로 밀리지 않는 상한
      pitchNudge = 0.16 * lunge // 상체를 카메라 쪽으로 숙이는 lunge 피치(양수=머리 앞으로)
      // 포효하듯 좌우로 흔드는 고개 — 빠른 진동을 (1-p)^2로 이중 감쇠해 끝에서 잦아든다.
      yawNudge = 0.18 * Math.sin(p * Math.PI * 5) * (1 - p) * (1 - p)
      bobY = 0.07 * lunge // 살짝 솟구쳤다 가라앉는 상하 반동(lunge와 동기)
      if (bossType === 'B02') {
        const sway = Math.sin(p * Math.PI * 4)
        scale = 1 + 0.08 * Math.sin(Math.PI * p)
        yawNudge = 0.28 * sway
        pitchNudge = 0.05 * Math.cos(p * Math.PI * 4)
        bobY = 0.05 * Math.abs(sway)
      } else if (bossType === 'B03') {
        const flex = Math.sin(p * Math.PI * 3)
        scale = 1 + 0.14 * Math.sin(Math.PI * p) + 0.05 * Math.max(0, flex)
        yawNudge = 0.12 * Math.sin(p * Math.PI * 2)
        pitchNudge = 0.1 * Math.max(0, flex)
        bobY = 0.09 * Math.abs(flex)
      }
      active = true
    }
    g.scale.setScalar(scale)

    // 포인터 패럴랙스: 목표 기울기로 이징.
    const target = parallaxRef.current
    const cur = tiltRef.current
    cur.x += (target.x - cur.x) * 0.18
    cur.y += (target.y - cur.y) * 0.18
    if (Math.abs(target.x - cur.x) > 0.0005 || Math.abs(target.y - cur.y) > 0.0005) {
      active = true
    } else {
      cur.x = target.x
      cur.y = target.y
    }

    g.rotation.x = BASE_ROT_X + cur.x + pitchNudge
    g.rotation.y = BASE_ROT_Y + cur.y + yawNudge
    g.position.y = baseY + framing.panY + bobY // 반동(bobY)은 얼굴 중앙 앵커 위 미세 오프셋

    if (active) invalidate() // 진행 중일 때만 다음 프레임 요청 → settle되면 demand 재개
  })

  return (
    <group
      ref={groupRef}
      rotation={[BASE_ROT_X, BASE_ROT_Y, 0]}
      position={[framing.panX, baseY + framing.panY, 0]}
    >
      <EnemyVisual type={bossType} animPhase="normal" hp={1150} showHealthBar={false} frozen={frozen} />
    </group>
  )
}

export default function StageBossPreview({
  framing = DEFAULT_STAGE_BOSS_PREVIEW,
  interactive = false,
  onChange = null,
  style = null,
  testId = 'stage-boss-preview',
  ariaLabel = 'stage1 보스 3D',
  bossType = 'B01',
  motionToken = 0,
  reactOnTap = true,
}) {
  const frame = normalizeStageBossPreview(framing)
  // 보스별 크라운 높이 보정을 적용한 실제 렌더 zoom(카메라에 반영). base zoom은 그대로 저장·튜닝.
  const renderZoom = resolveBossPreviewZoom(frame.zoom, bossType)
  const frameRef = useRef(frame)
  const dragRef = useRef(null)
  // 입장 쇼타임(motionToken)은 유저가 직접 누른 행동의 1초 피드백이라 모션 게이트를 우회한다.
  // (OS 동작줄이기/연출줄이기 상태에서도 카드 클릭 연출은 항상 재생 — 앰비언트·탭 반응만 게이트.)
  const [activeMotionToken, setActiveMotionToken] = useState(() => (motionToken > 0 ? motionToken : 0))
  const [touchMotionToken, setTouchMotionToken] = useState(0)
  frameRef.current = frame

  // 온디맨드 모션 상태(리렌더 없이 프레임 루프와 공유하는 ref).
  const burstRef = useRef(0)
  const parallaxRef = useRef({ x: 0, y: 0 })
  const invalidateRef = useRef(null)

  useEffect(() => {
    if (!motionToken) return
    setActiveMotionToken(motionToken)
    burstRef.current += 1
    invalidateRef.current?.()
    const timer = window.setTimeout(() => setActiveMotionToken(0), SHOWTIME_MOTION_MS)
    return () => window.clearTimeout(timer)
  }, [motionToken])

  useEffect(() => {
    if (!touchMotionToken || !motionAllowed()) return
    burstRef.current += 1
    invalidateRef.current?.()
    const timer = window.setTimeout(() => setTouchMotionToken(0), SHOWTIME_MOTION_MS)
    return () => window.clearTimeout(timer)
  }, [touchMotionToken])

  // 쇼타임(activeMotionToken)은 게이트 무시, 탭 리액션(touchMotionToken)만 게이트 적용.
  const motionEnabled = !interactive && (activeMotionToken > 0 || (touchMotionToken > 0 && motionAllowed()))

  const updateFrame = (patch) => {
    if (!interactive || !onChange) return
    onChange(normalizeStageBossPreview({ ...frameRef.current, ...patch }))
  }

  return (
    <div
      data-testid={testId}
      data-zoom={frame.zoom}
      data-pan-x={frame.panX}
      data-pan-y={frame.panY}
      data-boss-type={bossType}
      data-motion-active={motionEnabled}
      aria-label={ariaLabel}
      style={{ ...previewFrameStyle, ...style }}
      onWheel={(event) => {
        if (!interactive) return
        event.preventDefault()
        updateFrame({ zoom: frameRef.current.zoom + (event.deltaY < 0 ? 5 : -5) })
      }}
      onPointerDown={(event) => {
        if (interactive) {
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            panX: frameRef.current.panX,
            panY: frameRef.current.panY,
          }
          event.currentTarget.setPointerCapture?.(event.pointerId)
          return
        }
        // 비인터랙티브 탭 리액션(interactive 가드와 독립). 게이트 통과 시에만 버스트.
        if (!reactOnTap || !motionAllowed()) return
        setTouchMotionToken((token) => token + 1)
        invalidateRef.current?.() // demand 프레임 kick → useFrame이 버스트를 이어감
      }}
      onPointerMove={(event) => {
        if (interactive) {
          if (!dragRef.current) return
          updateFrame({
            panX: dragRef.current.panX + ((event.clientX - dragRef.current.x) / 80),
            panY: dragRef.current.panY - ((event.clientY - dragRef.current.y) / 80),
          })
          return
        }
        // ponytail: gyro parallax deferred — iOS DeviceOrientationEvent.requestPermission()가 사용자 제스처를 요구. 권한 프롬프트 배선 시 추가.
        if (!pointerFine() || !motionAllowed()) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1 // -1..1
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
        parallaxRef.current.y = nx * PARALLAX_MAX // 포인터 수평 → 살짝 yaw
        parallaxRef.current.x = ny * PARALLAX_MAX // 포인터 수직 → 살짝 pitch
        invalidateRef.current?.()
      }}
      onPointerUp={() => {
        dragRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      onPointerLeave={() => {
        if (interactive) return
        // 커서가 벗어나면 패럴랙스를 원위치로 이징.
        parallaxRef.current.x = 0
        parallaxRef.current.y = 0
        invalidateRef.current?.()
      }}
    >
      {/* 로비 카드는 기본 정지 포즈 → demand로 상시 RAF/GPU 루프 제거(모바일 배터리·발열).
          탭/포인터 상호작용 순간에만 invalidate()로 버스트 프레임을 그리고 settle되면 다시 정적.
          animPhase='normal'은 sin(t) idle이라 t=0 정지 포즈 = 정상 rest 포즈로 안전.
          framing 변경 시 R3F가 자동 invalidate → 스튜디오 실시간 sync 그대로 반영.
          스튜디오 인터랙티브 프리뷰(interactive)만 상시 애니메이션 유지(탭/패럴랙스는 비인터랙티브 전용). */}
      <Canvas frameloop={interactive ? 'always' : 'demand'} key={renderZoom} orthographic camera={{ position: [0, 2.2, 5.5], zoom: renderZoom }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={2.6} />
        <ReactiveBoss
          framing={frame}
          bossType={bossType}
          enabled={motionEnabled}
          frozen={!interactive && !motionEnabled}
          burstRef={burstRef}
          parallaxRef={parallaxRef}
          invalidateRef={invalidateRef}
        />
      </Canvas>
    </div>
  )
}
