import { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { toonMat, outlineMat, inflateScale } from '../lib/toon.js'
import { computeTextbookLanding } from '../lib/textbookLanding.js'
import { logPickup } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { createTemplateInstanceLayer } from '../lib/templateInstanceLayer.js'
import {
  TEXTBOOK_COLLECTED, TEXTBOOK_FLOOR_Y, TEXTBOOK_LANDED, TEXTBOOK_SCALE, createTextbookItem, stepTextbookItem,
} from '../lib/xpTextbookField.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'

// 교과서 모델(Studio 아이템 pickup-xp-textbook). 트리는 예전과 같다: StudioTunedGroup > 메시 6개.
export function XpTextbookModel() {
  // 교과서: 표지(파랑) / 책등(짙은 파랑) / 책장(크림) / 제목 띠(아이보리)
  const coverMat = useMemo(() => toonMat(0x2e5fb2, 0.16), [])
  const spineMat = useMemo(() => toonMat(0x1c3f7e, 0.18), [])
  const pageMat  = useMemo(() => toonMat(0xf2eddc, 0.10), [])
  const titleMat = useMemo(() => toonMat(0xfff7e0, 0.18), [])
  const titleAccentMat = useMemo(() => toonMat(0x1a2e58, 0.10), [])
  const outMat   = useMemo(() => outlineMat(0.96), [])

  return (
    <StudioTunedGroup itemId="pickup-xp-textbook">
      {/* 외곽선 */}
      <mesh renderOrder={1} material={outMat} scale={inflateScale([1.06, 1.18, 1.08])}>
        <boxGeometry args={[0.36, 0.08, 0.26]} />
      </mesh>
      {/* 책장 (크림, 아래쪽) */}
      <mesh renderOrder={2} material={pageMat} position={[0, -0.012, 0]}>
        <boxGeometry args={[0.345, 0.05, 0.245]} />
      </mesh>
      {/* 표지 (파랑, 위쪽) */}
      <mesh renderOrder={3} material={coverMat} position={[0, 0.022, 0]}>
        <boxGeometry args={[0.36, 0.04, 0.26]} />
      </mesh>
      {/* 책등 (왼쪽 짧은 변) */}
      <mesh renderOrder={4} material={spineMat} position={[-0.165, 0.005, 0]}>
        <boxGeometry args={[0.04, 0.078, 0.26]} />
      </mesh>
      {/* 제목 띠 (표지 윗면 중앙) */}
      <mesh renderOrder={5} material={titleMat} position={[0.018, 0.044, 0]}>
        <boxGeometry args={[0.20, 0.004, 0.07]} />
      </mesh>
      {/* 제목 줄 (제목 띠 안쪽 짙은 가로선) */}
      <mesh renderOrder={6} material={titleAccentMat} position={[0.018, 0.0465, 0]}>
        <boxGeometry args={[0.16, 0.001, 0.012]} />
      </mesh>
    </StudioTunedGroup>
  )
}

function playTextbookLand() {
  emitSfx({ id: 'textbookLand', volume: 0.45, rate: 0.94 + Math.random() * 0.12 })
}

// 수집 1권: 효과음 → XP → 미션 → 기록(예전 컴포넌트와 같은 순서).
function collectTextbook(item, gainXp) {
  emitSfx({ id: 'textbookCollect', volume: 0.64, rate: 0.98 + Math.random() * 0.08 })
  gainXp(item.value)
  useGameStore.getState().recordMissionEvent({ type: 'pickup_collected', itemType: 'xpTextbook' })
  logPickup('xp', item.value)
}

// 단일 교과서(그래픽 스튜디오 미리보기용). 게임 필드는 아래 XpTextbookLayer가 그린다.
export default function XpTextbook({ id, pos, value, onCollect }) {
  const groupRef  = useRef()
  // 좀비 사망 위치(pos)에서 근처 바닥 랜덤 지점으로 튕겨 떨어진다 (마운트당 1회 결정).
  // 이동 경계 밖·책상 콜라이더 안에 떨어지면 자석 Lv0에서 영구 수집 불가 → 도달 가능 지점만 선택.
  const stageId = useGameStore((s) => s.currentStageId)
  const land = useMemo(() => computeTextbookLanding(pos, stageId), [pos, stageId])
  const itemRef = useRef(null)
  if (itemRef.current === null) itemRef.current = createTextbookItem({ id, pos, value }, land)
  itemRef.current.land = land // 예전처럼 매 렌더의 착지 지점을 쓴다
  const gainXp = useGameStore((s) => s.gainXp)

  // STUDIO_OUTER_MOTION_ONLY — 이 useFrame은 StudioTunedGroup의 바깥 그룹만 움직인다.
  // 스튜디오 파츠는 건드리지 않으므로 튜닝을 덮어쓰지 않고 부모 변형으로 곱해질 뿐이다.
  useFrame((_, delta) => {
    const item = itemRef.current
    if (item.collected || !groupRef.current) return
    if (useGameStore.getState().phase !== 'playing') return
    const result = stepTextbookItem(item, delta)
    if (result === TEXTBOOK_COLLECTED) {
      collectTextbook(item, gainXp)
      onCollect(id)
      return
    }
    if (result === TEXTBOOK_LANDED) playTextbookLand()
    groupRef.current.position.copy(item.position)
    groupRef.current.rotation.copy(item.rotation)
  })

  return (
    <group ref={groupRef} position={[pos[0], TEXTBOOK_FLOOR_Y, pos[2]]} scale={[TEXTBOOK_SCALE, TEXTBOOK_SCALE, TEXTBOOK_SCALE]}>
      <XpTextbookModel />
    </group>
  )
}

// ── 게임 필드의 교과서 전부(2026-11-13 렌더 비용 완화, 동작 변화 없음) ──
// 예전: 교과서 1권 = 컴포넌트 1개 + useFrame 1개 + 메시 6개(지오메트리 6개를 권마다 새로 만듦).
// Stage 6처럼 100권 이상 쌓이면 그리기 호출 600회 이상. 지금: Studio 튜닝 템플릿 1벌 + 메시마다
// InstancedMesh 1개(그리기 호출 6회) + 이 층의 useFrame 1개가 모든 교과서를 같은 순서·같은 식으로 진행한다.
let _live = null
export function getXpTextbookLayerStats() {
  if (!_live) return null
  const { itemsRef, layer } = _live
  return { items: itemsRef.current.length, liveSlots: layer.liveSlots, instances: layer.count, capacity: layer.capacity }
}

export function XpTextbookLayer({ textbooks, onCollect }) {
  const templateRef = useRef(null)
  const layerRef = useRef(null)
  if (layerRef.current === null) layerRef.current = createTemplateInstanceLayer(32, 'xpTextbookInstances')
  const layer = layerRef.current
  const itemsRef = useRef([])        // 들어온 순서(= 예전 마운트 순서)
  const byIdRef = useRef(new Map())
  const stageId = useGameStore((s) => s.currentStageId)
  const gainXp = useGameStore((s) => s.gainXp)
  const onCollectRef = useRef(onCollect)
  onCollectRef.current = onCollect

  // 목록이 바뀔 때만: 새 교과서는 착지 지점을 정하고 슬롯을 잡고, 빠진 교과서는 슬롯을 놓는다.
  useLayoutEffect(() => {
    const byId = byIdRef.current
    const ids = new Set()
    for (const book of textbooks) {
      ids.add(book.id)
      if (byId.has(book.id)) continue
      const item = createTextbookItem(book, computeTextbookLanding(book.pos, stageId))
      item.slot = layer.claim()
      layer.write(item.slot, item.position, item.rotation, TEXTBOOK_SCALE)
      byId.set(book.id, item)
      itemsRef.current.push(item)
    }
    if (byId.size !== ids.size) {
      const items = itemsRef.current
      let kept = 0
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        if (ids.has(item.id)) { items[kept++] = item; continue }
        layer.release(item.slot)
        item.slot = -1
        byId.delete(item.id)
      }
      items.length = kept
    }
  }, [textbooks]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const live = { itemsRef, layer }
    _live = live
    return () => {
      if (_live === live) _live = null
      for (const item of itemsRef.current) { layer.release(item.slot); item.slot = -1 }
      itemsRef.current.length = 0
      byIdRef.current.clear()
      layer.dispose()
    }
  }, [layer])

  // STUDIO_OUTER_MOTION_ONLY — 교과서마다 바깥 자세(위치·회전·축척 0.8)만 인스턴스에 쓴다.
  useFrame((_, delta) => {
    // Studio 모양 동기화는 일시정지 중에도(멈춘 동안 한 Apply도 바로 보이게, 할당 없음).
    layer.syncTemplate(templateRef.current)
    if (useGameStore.getState().phase !== 'playing') return
    const items = itemsRef.current
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (item.collected) continue
      const result = stepTextbookItem(item, delta)
      if (result === TEXTBOOK_COLLECTED) {
        layer.release(item.slot)
        item.slot = -1
        collectTextbook(item, gainXp)
        onCollectRef.current(item.id)
        // 예전에는 교과서마다 자기 프레임에서 phase를 확인했다. 이 1권의 XP로 레벨업하면 같은 프레임의
        // 나머지 교과서는 멈춘다(레벨업 중 수집·효과음·미션 이벤트 없음).
        if (useGameStore.getState().phase !== 'playing') break
        continue
      }
      if (result === TEXTBOOK_LANDED) playTextbookLand()
      layer.write(item.slot, item.position, item.rotation, TEXTBOOK_SCALE)
    }
  })

  return (
    <>
      {/* Studio 튜닝 템플릿 1벌 — 보이지 않고, 모든 교과서 인스턴스가 이 모양·재질을 그대로 쓴다. */}
      <group ref={templateRef} visible={false}>
        <XpTextbookModel />
      </group>
      <primitive object={layer.group} />
    </>
  )
}
