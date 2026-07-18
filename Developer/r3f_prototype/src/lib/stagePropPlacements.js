// Firebase에서 hydrate된 스테이지 프랍 배치를 런타임 메모리에서 편집·반영한다.
import { useEffect, useState } from 'react'
import {
  getFirebaseStudioRuntimeDataset,
  setFirebaseStudioRuntimeDataset,
} from './studioRuntimeState.js'

// v5 preserves user placement edits while migrating side-on Stage 2 boards to their visible 45° angle.
export const STAGE_PROP_PLACEMENTS_STORAGE_KEY = 'escape-zombie-school.stagePropPlacements.v5'
export const STAGE_PROP_PLACEMENTS_EVENT = 'escape-zombie-school.stagePropPlacements.changed'

// 편집 가능한 스테이지 목록.
export const STAGE_PROP_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3'])

// StageObjectLayer의 STAGE_OBJECT_COMPONENTS 매핑과 반드시 동기 유지.
// (stagePropPlacements.test.js의 동기화 단언 테스트가 드리프트를 자동 감지한다.)
export const STAGE_PROP_TYPES = Object.freeze([
  'classroomDesk',
  'classroomChair',
  'unconsciousStudent',
  'corridorLockerBank',
  'corridorJanitorCart',
  'corridorLostFoundBoard',
  // 체육관(stage3) 프랍 10종
  'basketballHoop',
  'basketballBallCart',
  'basketballCluster',
  'gymBench',
  'gymTrainingCones',
  'gymMats',
  'gymScoreboard',
  'gymBanner',
  'gymExitDoor',
  'gymEquipmentSpill',
])

const STAGE_PROP_TYPE_SET = new Set(STAGE_PROP_TYPES)

// NaN/Infinity/절대 오배치 방어용 관대한 월드 좌표 한계(게임 경계보다 훨씬 넉넉).
// stage1 authored 배치가 z=±48까지 뻗어 있어 기본 배치를 그대로 편집할 때 잘리지 않도록 크게 잡는다.
const MAX_COORD = 120
const MIN_SCALE = 0.1
const MAX_SCALE = 4

let _idCounter = 0

function clampCoord(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.min(MAX_COORD, Math.max(-MAX_COORD, Number(number.toFixed(3))))
}

function clampScale(value, fallback = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, number)).toFixed(4))
}

function normalizeRotationY(rotation) {
  // rotation은 [x, y, z] 또는 스칼라(y). 배치 에디터는 y축 회전만 다룬다.
  const raw = Array.isArray(rotation) ? rotation[1] : rotation
  const number = Number(raw)
  return Number.isFinite(number) ? Number(number.toFixed(4)) : 0
}

const MAX_PROP_COUNT = 12

// 프랍 props 화이트리스트 정규화.
// - variant: 비어있지 않은 문자열(교실/복도 프랍)
// - damaged / knockedOver: boolean(체육관 프랍 상태 플래그)
// - count: 유한수 → 정수 1~12 클램프(농구공 클러스터 개수)
// 알 수 없는 키는 계속 버린다. 보존할 키가 하나도 없으면 undefined.
function normalizeProps(props) {
  if (!props || typeof props !== 'object') return undefined
  const result = {}
  if (typeof props.variant === 'string' && props.variant) result.variant = props.variant
  if (typeof props.damaged === 'boolean') result.damaged = props.damaged
  if (typeof props.knockedOver === 'boolean') result.knockedOver = props.knockedOver
  if (Number.isFinite(props.count)) {
    result.count = Math.min(MAX_PROP_COUNT, Math.max(1, Math.round(Number(props.count))))
  }
  return Object.keys(result).length > 0 ? result : undefined
}

// 단일 프랍 항목 정규화. 불량(타입 미상/좌표 NaN)이면 null.
export function normalizePropPlacement(input) {
  if (!input || typeof input !== 'object') return null
  if (!STAGE_PROP_TYPE_SET.has(input.type)) return null

  const position = Array.isArray(input.position) ? input.position : []
  const x = clampCoord(position[0])
  const z = clampCoord(position[2])
  if (x === null || z === null) return null

  const id = typeof input.id === 'string' && input.id
    ? input.id
    : `prop-${Date.now().toString(36)}-${(_idCounter += 1)}`

  const normalized = {
    id,
    type: input.type,
    position: [x, 0, z],
    rotation: [0, normalizeRotationY(input.rotation), 0],
    scale: clampScale(input.scale, 1),
  }
  // blocking:false = 관통 가능 프랍(콘/배너/공 무리 등). boolean일 때만 보존 — 생략 시 기본(충돌체) 유지.
  if (typeof input.blocking === 'boolean') normalized.blocking = input.blocking
  const props = normalizeProps(input.props)
  if (props) normalized.props = props
  return normalized
}

export function normalizeStagePropList(list) {
  if (!Array.isArray(list)) return null
  return list.map(normalizePropPlacement).filter(Boolean)
}

// 전체 오버라이드 구조 정규화. 각 스테이지: 배열이면 정규화 목록, 아니면 null(기본 배치 사용).
export function normalizeStagePropPlacements(input) {
  const source = input && typeof input === 'object' ? input : {}
  const result = {}
  for (const stageId of STAGE_PROP_STAGE_IDS) {
    result[stageId] = normalizeStagePropList(source[stageId])
  }
  return result
}

export function loadStagePropPlacements(storage) {
  if (storage) throw new TypeError('Graphics Studio storage adapters are forbidden. Firebase runtime only.')
  return normalizeStagePropPlacements(getFirebaseStudioRuntimeDataset('propPlacements'))
}

// 특정 스테이지 오버라이드 배열 또는 null(기본 배치 사용).
export function getStagePropOverride(stageId, storage) {
  const config = loadStagePropPlacements(storage)
  return config[stageId] ?? null
}

export function saveStagePropPlacements(config, storage) {
  if (storage) throw new TypeError('Graphics Studio storage adapters are forbidden. Firebase runtime only.')
  const normalized = normalizeStagePropPlacements(config)
  setFirebaseStudioRuntimeDataset('propPlacements', normalized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAGE_PROP_PLACEMENTS_EVENT, { detail: normalized }))
  }
  return normalized
}

// 테스트/특수 상황용: 모듈 캐시 초기화.
export function resetStagePropPlacementsCache() {
  // Firebase runtime state is the only cache and is replaced atomically by hydrate.
}

// 오버라이드 변경 구독. 반환값은 unsubscribe.
export function subscribeStagePropPlacements(callback) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener(STAGE_PROP_PLACEMENTS_EVENT, handler)
  return () => window.removeEventListener(STAGE_PROP_PLACEMENTS_EVENT, handler)
}

// 배치가 바뀔 때마다 증가하는 버전 카운터(R3F 레이어 리렌더 트리거용).
export function useStagePropPlacementsVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => subscribeStagePropPlacements(() => setVersion((v) => v + 1)), [])
  return version
}
