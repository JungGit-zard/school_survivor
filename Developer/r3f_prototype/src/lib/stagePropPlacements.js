// 스테이지 프랍 배치 사용자 오버라이드 스토어.
// 그래픽 스튜디오 '맵 프랍 배치' 탭에서 저장한 배치를 게임 런타임에 즉시 반영한다.
// 패턴은 graphicsStudioConfig.js(localStorage + CustomEvent dispatch)를 그대로 미러한다.
import { useEffect, useState } from 'react'

// v4 invalidates the prior dense Stage 2 snapshot after reducing corridor clutter.
export const STAGE_PROP_PLACEMENTS_STORAGE_KEY = 'escape-zombie-school.stagePropPlacements.v4'
export const STAGE_PROP_PLACEMENTS_EVENT = 'escape-zombie-school.stagePropPlacements.changed'

// 편집 가능한 스테이지 목록.
export const STAGE_PROP_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3'])

// StageObjectLayer의 STAGE_OBJECT_COMPONENTS 매핑과 반드시 동기 유지.
export const STAGE_PROP_TYPES = Object.freeze([
  'classroomDesk',
  'classroomChair',
  'unconsciousStudent',
  'corridorLockerBank',
  'corridorJanitorCart',
  'corridorLostFoundBoard',
])

const STAGE_PROP_TYPE_SET = new Set(STAGE_PROP_TYPES)

// NaN/Infinity/절대 오배치 방어용 관대한 월드 좌표 한계(게임 경계보다 훨씬 넉넉).
// stage1 authored 배치가 z=±48까지 뻗어 있어 기본 배치를 그대로 편집할 때 잘리지 않도록 크게 잡는다.
const MAX_COORD = 120
const MIN_SCALE = 0.1
const MAX_SCALE = 4

let _idCounter = 0

function getStorage(storage) {
  if (storage) return storage
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  return null
}

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

function normalizeProps(props) {
  if (!props || typeof props !== 'object') return undefined
  const variant = props.variant
  if (typeof variant !== 'string' || !variant) return undefined
  return { variant }
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

function emptyConfig() {
  return normalizeStagePropPlacements({})
}

// 실 storage 사용 시 모듈 캐시(오버라이드는 자주 안 바뀌므로 localStorage 매회 파싱 방지).
let _cache = null

function readConfig(storage) {
  const target = getStorage(storage)
  if (!target) return emptyConfig()
  try {
    const raw = target.getItem(STAGE_PROP_PLACEMENTS_STORAGE_KEY)
    if (!raw) return emptyConfig()
    return normalizeStagePropPlacements(JSON.parse(raw))
  } catch {
    return emptyConfig()
  }
}

export function loadStagePropPlacements(storage) {
  if (storage) return readConfig(storage)
  if (_cache) return _cache
  _cache = readConfig()
  return _cache
}

// 특정 스테이지 오버라이드 배열 또는 null(기본 배치 사용).
export function getStagePropOverride(stageId, storage) {
  const config = loadStagePropPlacements(storage)
  return config[stageId] ?? null
}

export function saveStagePropPlacements(config, storage) {
  const normalized = normalizeStagePropPlacements(config)
  const target = getStorage(storage)
  target?.setItem(STAGE_PROP_PLACEMENTS_STORAGE_KEY, JSON.stringify(normalized))
  if (!storage) {
    _cache = normalized
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STAGE_PROP_PLACEMENTS_EVENT, { detail: normalized }))
    }
  }
  return normalized
}

// 테스트/특수 상황용: 모듈 캐시 초기화.
export function resetStagePropPlacementsCache() {
  _cache = null
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
