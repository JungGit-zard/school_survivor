import { useEffect, useMemo, useRef, useState } from 'react'
import GraphicsStudioPreview from './GraphicsStudioPreview.jsx'
import {
  DEFAULT_STUDIO_TUNING,
  DEFAULT_TEXTURE_DECAL,
  GRAPHICS_STUDIO_CATALOG,
  GRAPHICS_STUDIO_CATEGORIES,
  STAGE_BOSS_PREVIEW_PAN_Y_RANGE,
  getStudioItemById,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  normalizeStageBossPreview,
  normalizeStudioTuning,
  normalizeTextureDecal,
  normalizeTextureDecalMap,
  serializeStudioSnapshot,
} from '../lib/graphicsStudioConfig.js'
import { fileToDecalDataUrl } from '../lib/textureDecal.js'
import { loadStagePropPlacements, normalizeStagePropPlacements } from '../lib/stagePropPlacements.js'
import {
  BOSS_FACE_BOSS_OPTIONS,
  BOSS_FACE_PART_CATEGORIES,
  DEFAULT_BOSS_FACE_RECIPE,
  loadBossFaceRecipes,
  normalizeBossFaceRecipe,
  normalizeBossFaceRecipeMap,
  saveBossFaceRecipes,
} from '../lib/bossFaceParts.js'
import StagePropPlacementEditor from './StagePropPlacementEditor.jsx'
import BossFaceGridPreview from './BossFaceGridPreview.jsx'
import { DEFAULT_SFX_TUNING, getSfxCatalog, loadSfxTunings, normalizeSfxTuning, playSfx } from '../lib/sfxRegistry.js'
import {
  STUDIO_GAME_SYNC_ACK_MESSAGE,
  STUDIO_GAME_SYNC_CHANNEL,
  STUDIO_GAME_SYNC_MESSAGE,
  STUDIO_GAME_SYNC_READY_MESSAGE,
  getDefaultStudioGameUrl,
  parseStudioGameUrl,
} from '../lib/studioGameBridge.js'
import StageBossPreview from './StageBossPreview.jsx'
import { useAuthStore } from '../store/useAuthStore.js'
import {
  FIREBASE_STUDIO_REVISION_EVENT,
  applyFirebaseStudioDatasets,
  flushFirebaseStudioSave,
  hydrateFirebaseStudio,
  loadStudioRuntimeDatasets,
  markFirebaseStudioLocalChange,
  saveFirebaseStudio,
  setFirebaseStudioUser,
} from '../lib/firebaseStudio.js'

const categoryLabels = Object.fromEntries(GRAPHICS_STUDIO_CATEGORIES.map((category) => [category.id, category.label]))
const STUDIO_SECTIONS = new Set(['graphics', 'audio', 'props', 'faces'])
const STUDIO_UNDO_LIMIT = 50

function cloneStudioUndoSnapshot(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

// 프리뷰 배경 스와치(스튜디오 로컬 전용). 첫 항목이 기본값(기존 어두운색).
const PREVIEW_BG_SWATCHES = [
  { id: 'dark', label: '어두움', value: '#171817' },
  { id: 'white', label: '흰색', value: '#ffffff' },
  { id: 'gray', label: '회색', value: '#8a8f94' },
]

// 슬라이더 트랙/썸을 2배 체감 크기로 키우는 CSS. 인라인 스타일로는 ::-webkit-slider-thumb를
// 제어할 수 없어 클래스 기반 규칙을 한 번만 주입한다. 포인트 컬러(#e35d3d)는 유지.
export const STUDIO_SLIDER_CSS = `
.studio-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 32px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
.studio-range::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: #3a3d37;
}
.studio-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  margin-top: -10px;
  border-radius: 50%;
  background: #e35d3d;
  border: 2px solid #1a1c18;
}
.studio-range::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: #3a3d37;
}
.studio-range::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e35d3d;
  border: 2px solid #1a1c18;
}
.studio-range:focus {
  outline: none;
}
.studio-range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(227, 93, 61, 0.4);
}

.studio-number-input::-webkit-inner-spin-button,
.studio-number-input::-webkit-outer-spin-button {
  margin-left: 20px;
  margin-right: 0;
}
`

function SliderRow({ label, name, min, max, step, value, onChange }) {
  const valueText = Number(value).toFixed(step < 1 ? 2 : 0)
  const minNum = Number(min)
  const maxNum = Number(max)
  const [draftValue, setDraftValue] = useState(valueText)
  const [focused, setFocused] = useState(false)
  const handleInput = (event) => onChange(Number(event.target.value))
  const commitDraft = () => {
    const next = Number(draftValue)
    if (Number.isFinite(next)) {
      const clamped = Math.min(maxNum, Math.max(minNum, next))
      onChange(clamped)
      setDraftValue(Number(clamped).toFixed(step < 1 ? 2 : 0))
    } else {
      setDraftValue(valueText)
    }
  }
  const handleValueInput = (event) => {
    const nextText = event.target.value
    setDraftValue(nextText)
    const next = Number(nextText)
    // 타이핑 중에는 범위 안일 때만 라이브 반영한다. 범위 밖(예: "110"을 향한 "1")은
    // 클램프가 draft를 덮어써 타이핑과 싸우지 않도록 blur/Enter까지 커밋을 미룬다.
    if (Number.isFinite(next) && next >= minNum && next <= maxNum) onChange(next)
  }

  useEffect(() => {
    if (!focused) setDraftValue(valueText)
  }, [valueText, focused])

  return (
    <label style={styles.controlRow}>
      <span style={styles.controlLabel}>{label}</span>
      <input
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={handleInput}
        className="studio-range"
        style={styles.range}
      />
      <input
        name={`${name}Value`}
        type="number"
        min={min}
        max={max}
        step={step}
        className="studio-number-input"
        value={draftValue}
        onFocus={() => setFocused(true)}
        onInput={handleValueInput}
        onChange={handleValueInput}
        onBlur={() => {
          setFocused(false)
          commitDraft()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        style={styles.controlValueInput}
      />
    </label>
  )
}

function ColorRow({ label, name, value, onChange }) {
  const handleInput = (event) => onChange(event.target.value)
  return (
    <label style={styles.colorRow}>
      <span style={styles.controlLabel}>{label}</span>
      <input
        name={name}
        type="color"
        value={value}
        onInput={handleInput}
        onChange={handleInput}
        style={styles.colorInput}
      />
      <span style={styles.hexValue}>{value}</span>
    </label>
  )
}

function groupCatalogByCategory() {
  return GRAPHICS_STUDIO_CATEGORIES.map((category) => ({
    ...category,
    items: GRAPHICS_STUDIO_CATALOG.filter((item) => item.category === category.id),
  }))
}

function getInitialStudioSection() {
  return 'graphics'
}

function useCompactLayout() {
  const getCompact = () => typeof window !== 'undefined' && window.innerWidth < 1500
  const [compact, setCompact] = useState(getCompact)

  useEffect(() => {
    const update = () => setCompact(getCompact())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return compact
}

function getPartTuningId(itemId, focusedParts) {
  if (!focusedParts?.length) return itemId
  const keys = focusedParts.map((part) => part.key).sort()
  if (keys.length === 1) return `${itemId}::part::${keys[0]}`
  return `${itemId}::group::${keys.join('+')}`
}

function getFocusedPartLabel(focusedParts) {
  if (!focusedParts.length) return null
  if (focusedParts.length === 1) return `Part Focus / ${focusedParts[0].label}`
  return `Part Group / ${focusedParts.length} parts`
}

export default function GraphicsStudio() {
  const groupedCatalog = useMemo(groupCatalogByCategory, [])
  const sfxCatalog = useMemo(getSfxCatalog, [])
  const compact = useCompactLayout()
  const [activeSection, setActiveSection] = useState(getInitialStudioSection)
  const [selectedItemId, setSelectedItemId] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) return getStudioItemById(window.location.hash.slice(1)).id
    return 'player'
  })
  const [selectedSfxId, setSelectedSfxId] = useState(() => getSfxCatalog()[0]?.id ?? '')
  const [sfxTunings, setSfxTunings] = useState(() => loadSfxTunings())
  const [confirmedTunings, setConfirmedTunings] = useState(() => loadStudioTunings())
  const [stageBossPreview, setStageBossPreview] = useState(() => loadStageBossPreview())
  const [selectedFaceBossType, setSelectedFaceBossType] = useState(() => BOSS_FACE_BOSS_OPTIONS[0]?.type ?? 'B01')
  const [bossFaceRecipes, setBossFaceRecipes] = useState(() => loadBossFaceRecipes())
  const [draftBossFaceRecipes, setDraftBossFaceRecipes] = useState(() => ({}))
  const [draftPropPlacements, setDraftPropPlacements] = useState(() => loadStagePropPlacements())
  // 프리뷰 배경색은 스튜디오 로컬 상태(게임 런타임/저장 데이터셋 미반영)
  const [previewBg, setPreviewBg] = useState(PREVIEW_BG_SWATCHES[0].value)
  const [applyStatus, setApplyStatus] = useState('')
  const [firebaseStatus, setFirebaseStatus] = useState('synced')
  const [propEditorVersion, setPropEditorVersion] = useState(0)
  const authStatus = useAuthStore((state) => state.status)
  const authUser = useAuthStore((state) => state.user)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const selectedItem = getStudioItemById(selectedItemId)
  const selectedStageBossType = selectedItem.previewKind === 'zombie' && selectedItem.zombieType?.startsWith('B')
    ? selectedItem.zombieType
    : 'B01'
  const [draftTuningById, setDraftTuningById] = useState(() => ({}))
  const [focusedParts, setFocusedParts] = useState([])
  const [focusedFaceAxis, setFocusedFaceAxis] = useState(DEFAULT_TEXTURE_DECAL.faceAxis)
  const [decalsByItem, setDecalsByItem] = useState(() => loadTextureDecals())

  const gameWindowRef = useRef(null)
  const gameOriginRef = useRef('*')
  const pendingGameSyncRef = useRef(null)
  const hydratedUidRef = useRef(null)
  const hydratingUidRef = useRef(null)
  const hydratePromiseRef = useRef(null)
  const writeEligibleUidRef = useRef(null)
  const mountedRef = useRef(true)
  const connectInFlightRef = useRef(false)
  const applyInFlightRef = useRef(false)
  const saveChainRef = useRef(Promise.resolve())
  const draftTuningByIdRef = useRef({})
  const sfxTuningsRef = useRef(sfxTunings)
  const stageBossPreviewRef = useRef(stageBossPreview)
  const decalsByItemRef = useRef(decalsByItem)
  const draftBossFaceRecipesRef = useRef(draftBossFaceRecipes)
  const draftPropPlacementsRef = useRef(draftPropPlacements)
  const undoHistoryRef = useRef([])
  const [gameUrl, setGameUrl] = useState(() => getDefaultStudioGameUrl())
  const activeTuningId = getPartTuningId(selectedItem.id, focusedParts)
  const itemSavedTuning = confirmedTunings[selectedItem.id] ?? DEFAULT_STUDIO_TUNING
  const itemTuning = normalizeStudioTuning(draftTuningById[selectedItem.id] ?? itemSavedTuning)
  const savedTuning = confirmedTunings[activeTuningId] ?? DEFAULT_STUDIO_TUNING
  const tuning = normalizeStudioTuning(draftTuningById[activeTuningId] ?? savedTuning)
  const selectedSfx = sfxCatalog.find((sound) => sound.id === selectedSfxId) ?? sfxCatalog[0]
  const sfxTuning = normalizeSfxTuning(sfxTunings[selectedSfx?.id] ?? DEFAULT_SFX_TUNING)
  const selectedFaceBoss = BOSS_FACE_BOSS_OPTIONS.find((boss) => boss.type === selectedFaceBossType) ?? BOSS_FACE_BOSS_OPTIONS[0]
  const facePreviewBaseItem = selectedFaceBoss ? getStudioItemById(selectedFaceBoss.itemId) : selectedItem
  const faceRecipe = normalizeBossFaceRecipe(
    draftBossFaceRecipes[selectedFaceBossType]
      ?? bossFaceRecipes[selectedFaceBossType]
      ?? DEFAULT_BOSS_FACE_RECIPE,
  )
  const facePreviewItem = {
    ...facePreviewBaseItem,
    bossFaceRecipe: faceRecipe,
  }
  const exportTunings = {
    ...confirmedTunings,
    [activeTuningId]: tuning,
  }
  const livePreviewTunings = {
    ...confirmedTunings,
    ...draftTuningById,
    [selectedItem.id]: itemTuning,
    [activeTuningId]: tuning,
  }
  // 텍스처 데칼 — 안정 파트(studioPartId) + 면(faceAxis)에 앵커. 단일 파트 포커스에서만 편집.
  const itemDecals = decalsByItem[selectedItem.id] ?? []
  const focusedDecalPartId = focusedParts.length === 1 && focusedParts[0].key.startsWith('id:')
    ? focusedParts[0].key.slice('id:'.length)
    : null
  const activeDecal = focusedDecalPartId
    ? itemDecals.find((decal) => decal.partId === focusedDecalPartId && decal.faceAxis === focusedFaceAxis) ?? null
    : null
  const exportJson = useMemo(
    () => serializeStudioSnapshot({ selectedItemId: selectedItem.id, tunings: exportTunings, stageBossPreview, decals: decalsByItem, bossFaceRecipes: normalizeBossFaceRecipeMap({ ...bossFaceRecipes, ...draftBossFaceRecipes }) }),
    [selectedItem.id, activeTuningId, tuning, confirmedTunings, stageBossPreview, decalsByItem, bossFaceRecipes, draftBossFaceRecipes],
  )

  const captureUndoSnapshot = () => cloneStudioUndoSnapshot({
    draftTuningById: draftTuningByIdRef.current,
    sfxTunings: sfxTuningsRef.current,
    stageBossPreview: stageBossPreviewRef.current,
    decalsByItem: decalsByItemRef.current,
    draftBossFaceRecipes: draftBossFaceRecipesRef.current,
    draftPropPlacements: draftPropPlacementsRef.current,
  })

  const rememberUndoSnapshot = () => {
    undoHistoryRef.current = [...undoHistoryRef.current, captureUndoSnapshot()].slice(-STUDIO_UNDO_LIMIT)
  }

  const restoreUndoSnapshot = () => {
    const snapshot = undoHistoryRef.current.at(-1)
    if (!snapshot) return false
    undoHistoryRef.current = undoHistoryRef.current.slice(0, -1)
    const restored = cloneStudioUndoSnapshot(snapshot)

    draftTuningByIdRef.current = restored.draftTuningById
    sfxTuningsRef.current = restored.sfxTunings
    stageBossPreviewRef.current = restored.stageBossPreview
    decalsByItemRef.current = restored.decalsByItem
    draftBossFaceRecipesRef.current = restored.draftBossFaceRecipes
    draftPropPlacementsRef.current = restored.draftPropPlacements

    setDraftTuningById(restored.draftTuningById)
    setSfxTunings(restored.sfxTunings)
    setStageBossPreview(restored.stageBossPreview)
    setDecalsByItem(restored.decalsByItem)
    setDraftBossFaceRecipes(restored.draftBossFaceRecipes)
    setDraftPropPlacements(restored.draftPropPlacements)
    setPropEditorVersion((version) => version + 1)

    setApplyStatus('Undo')
    return true
  }

  const refreshStudioState = () => {
    const datasets = loadStudioRuntimeDatasets()
    sfxTuningsRef.current = datasets.sfxTunings
    stageBossPreviewRef.current = datasets.stageBossPreview
    decalsByItemRef.current = datasets.decals
    draftBossFaceRecipesRef.current = {}
    draftPropPlacementsRef.current = datasets.propPlacements
    undoHistoryRef.current = []
    setConfirmedTunings(datasets.tunings)
    setSfxTunings(datasets.sfxTunings)
    setStageBossPreview(datasets.stageBossPreview)
    setDecalsByItem(datasets.decals)
    setBossFaceRecipes(datasets.bossFaceRecipes)
    setDraftPropPlacements(datasets.propPlacements)
    draftTuningByIdRef.current = {}
    setDraftTuningById({})
    setDraftBossFaceRecipes({})

    setPropEditorVersion((version) => version + 1)
  }

  const applyFirebaseResult = (result, uid) => {
    if (result?.status === 'remote-applied') {
      hydratedUidRef.current = uid
      writeEligibleUidRef.current = uid
      refreshStudioState()
      if (mountedRef.current) setFirebaseStatus('synced')
      return true
    }
    if (result?.status === 'local-changed') {
      writeEligibleUidRef.current = null
      if (mountedRef.current) setFirebaseStatus('offline-error')
      return false
    }
    if (writeEligibleUidRef.current === uid) {
      writeEligibleUidRef.current = null
    }
    if (mountedRef.current) {
      if (result?.status === 'future-version') setFirebaseStatus('future-version')
      else if (result?.status === 'account-conflict') setFirebaseStatus('account-conflict')
      else if (result?.status === 'stale-user') setFirebaseStatus('offline-error')
      else if (result?.status === 'unconfigured' || result?.status === 'unauthenticated' || result?.status === 'missing-remote') setFirebaseStatus('offline-error')
      else setFirebaseStatus('offline-error')
    }
    return false
  }

  const isSavedFirebaseRevision = (revision) => Number.isInteger(revision) && revision > 0

  const showFirebaseSaveBlocked = (result) => {
    const status = result?.status ?? 'unavailable'
    setFirebaseStatus(status === 'future-version' ? 'future-version' : 'offline-error')
    setApplyStatus(`Apply blocked; Firebase save failed: ${status}`)
    window.alert?.(`Firebase 저장 불가 (${status}). 저장이 완료되지 않아 현재 세션과 열린 게임에도 적용하지 않았습니다.`)
  }

  const persistDatasetsOnApply = async (datasets) => {
    const user = authUser
    const uid = user?.uid
    if (!uid || writeEligibleUidRef.current !== uid) {
      const result = { status: uid ? 'hydrate-required' : 'unauthenticated' }
      showFirebaseSaveBlocked(result)
      return result
    }
    if (applyInFlightRef.current) return { status: 'apply-in-flight' }

    applyInFlightRef.current = true
    setFirebaseStatus('saving')
    markFirebaseStudioLocalChange(user)
    try {
      const result = await saveFirebaseStudio({ user, datasets })
      if (result?.status !== 'saved') {
        showFirebaseSaveBlocked(result)
        return result
      }
      if (!isSavedFirebaseRevision(result.revision)) {
        const failed = { status: 'missing-revision' }
        showFirebaseSaveBlocked(failed)
        return failed
      }
      if (!applyFirebaseStudioDatasets(datasets, { revision: result.revision })) {
        const failed = { status: 'apply-failed' }
        showFirebaseSaveBlocked(failed)
        return failed
      }
      setFirebaseStatus('saved')
      return result
    } catch (error) {
      const result = { status: 'write-failed', error }
      showFirebaseSaveBlocked(result)
      return result
    } finally {
      applyInFlightRef.current = false
    }
  }


  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    setFirebaseStudioUser(authUser)
    const uid = authUser?.uid
    if (!uid) {
      hydratedUidRef.current = null
      hydratingUidRef.current = null
      hydratePromiseRef.current = null
      writeEligibleUidRef.current = null
      setFirebaseStatus(authStatus === 'checking' ? 'checking' : 'offline-error')
      return undefined
    }
    if (hydratedUidRef.current === uid || hydratingUidRef.current === uid) return undefined

    let cancelled = false
    hydratingUidRef.current = uid
    setFirebaseStatus('checking')
    const promise = hydrateFirebaseStudio({ user: authUser })
    hydratePromiseRef.current = { uid, promise }
    void promise.then((result) => {
      if (cancelled) return
      hydratingUidRef.current = null
      applyFirebaseResult(result, uid)
    }).catch(() => {
      if (cancelled) return
      hydratingUidRef.current = null
      writeEligibleUidRef.current = uid
      setFirebaseStatus('offline-error')
    }).finally(() => {
      if (hydratePromiseRef.current?.promise === promise) hydratePromiseRef.current = null
    })
    return () => {
      cancelled = true
      if (hydratingUidRef.current === uid) hydratingUidRef.current = null
    }
  }, [authStatus, authUser?.uid])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void flushFirebaseStudioSave()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      if (!restoreUndoSnapshot()) return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const refreshRemoteRevision = () => {
      refreshStudioState()
      setFirebaseStatus('synced')
    }
    window.addEventListener(FIREBASE_STUDIO_REVISION_EVENT, refreshRemoteRevision)
    return () => window.removeEventListener(FIREBASE_STUDIO_REVISION_EVENT, refreshRemoteRevision)
  }, [])

  useEffect(() => {
    const handleGameBridgeStatus = (event) => {
      const pending = pendingGameSyncRef.current
      if (!pending) return
      if (event.origin !== pending.origin) return
      if (event.source !== pending.target) return
      if (event.data?.type === STUDIO_GAME_SYNC_ACK_MESSAGE && event.data?.syncId === pending.syncId) {
        pendingGameSyncRef.current = null
        return
      }
      if (event.data?.type === STUDIO_GAME_SYNC_READY_MESSAGE) pending.postSync()
    }
    window.addEventListener('message', handleGameBridgeStatus)
    return () => window.removeEventListener('message', handleGameBridgeStatus)
  }, [])

  const openOrReuseGameWindow = (url) => {
    let target = gameWindowRef.current
    if (!target || target.closed || gameOriginRef.current !== url.origin) {
      target = window.open(url.href, 'escape-zombie-school-game')
      gameWindowRef.current = target
    }
    gameOriginRef.current = url.origin
    return target && !target.closed ? target : null
  }

  const sendGameSync = async ({ openGame = false, datasets = null, revision = null } = {}) => {
    let target = gameWindowRef.current
    if (openGame) {
      const url = parseStudioGameUrl(gameUrl)
      if (!url) {
        setApplyStatus('Invalid Game URL')
        return false
      }
      target = openOrReuseGameWindow(url)
    }
    if (!target || target.closed) {
      if (openGame) setApplyStatus('Unable to open game window')
      return false
    }

    // Apply already wrote Firebase and atomically committed every dataset into
    // the Studio runtime. Do not gate game sync behind the debounced-save queue:
    // the game window must receive the force-refresh immediately, even for a
    // one-pixel/one-dot prop move. Keep exactly one newest pending payload for a
    // cold-loading game; READY resends it, ACK clears it.
    const syncId = `studio-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const payload = {
      type: STUDIO_GAME_SYNC_MESSAGE,
      syncId,
      force: true,
      datasets,
      revision,
    }
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(STUDIO_GAME_SYNC_CHANNEL)
      channel.postMessage(payload)
      channel.close()
    }
    const postSync = () => target.postMessage(payload, gameOriginRef.current)
    pendingGameSyncRef.current = {
      target,
      origin: gameOriginRef.current,
      syncId,
      datasets,
      revision,
      postSync,
    }
    postSync()
    return true
  }

  const updatePropPlacementDraft = (config) => {
    rememberUndoSnapshot()
    const saved = normalizeStagePropPlacements(config)
    draftPropPlacementsRef.current = saved
    setDraftPropPlacements(saved)
    setApplyStatus('Props preview')
    return saved
  }

  const applyPropPlacements = async (config) => {
    const saved = updatePropPlacementDraft(config)
    await persistAllDrafts('Props applied', { propPlacements: saved })
    return saved
  }

  const connectFirebaseStudio = () => {
    if (connectInFlightRef.current) return

    connectInFlightRef.current = true
    setFirebaseStatus('checking')
    void (async () => {
      // 로그인은 스튜디오 입구(App 라우트 게이트)에서만 한다 — 여기서 2차 로그인하지 않는다.
      // 진입 시점에 이미 로그인돼 authUser가 있다. 없으면 아래 offline-error로 처리.
      const user = authUser
      let cloudReady = false
      try {
        if (user?.uid) {
          setFirebaseStudioUser(user)
          const activeHydrate = hydratePromiseRef.current
          if (activeHydrate?.uid === user.uid) await activeHydrate.promise
          const flushResult = await flushFirebaseStudioSave({ user })
          if (flushResult.status === 'saved' || flushResult.status === 'no-pending') {
            const result = await hydrateFirebaseStudio({ user })
            cloudReady = applyFirebaseResult(result, user.uid)
          } else {
            applyFirebaseResult(flushResult, user.uid)
          }
        }
      } catch {
        if (mountedRef.current) setFirebaseStatus('offline-error')
      }

      if (mountedRef.current) {
        if (!user?.uid && authStatus !== 'unconfigured') setFirebaseStatus('offline-error')
        setApplyStatus(cloudReady
          ? 'Firebase connected'
          : 'Firebase connection failed')
      }
    })().finally(() => {
      connectInFlightRef.current = false
    })
  }

  const updateTuning = (patch) => {
    rememberUndoSnapshot()
    const id = activeTuningId
    const nextTuning = normalizeStudioTuning({
      ...(draftTuningByIdRef.current[id] ?? confirmedTunings[id]),
      ...patch,
    })
    draftTuningByIdRef.current = { ...draftTuningByIdRef.current, [id]: nextTuning }
    setDraftTuningById(draftTuningByIdRef.current)
    setApplyStatus('Draft')
  }

  const confirmTextureDecals = (nextItemDecals) => {
    rememberUndoSnapshot()
    const next = normalizeTextureDecalMap({
      ...decalsByItemRef.current,
      [selectedItem.id]: nextItemDecals,
    })
    decalsByItemRef.current = next
    setDecalsByItem(next)
    setApplyStatus('Decal preview')
    return next
  }

  const handleDecalUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!focusedDecalPartId) {
      setApplyStatus('Decal: double-click a tagged part first')
      return
    }
    if (!file) return
    const imageDataUrl = await fileToDecalDataUrl(file)
    if (!imageDataUrl) {
      setApplyStatus('Decal: unsupported image file')
      return
    }
    const nextDecal = normalizeTextureDecal({
      ...DEFAULT_TEXTURE_DECAL,
      ...(activeDecal ?? {}),
      partId: focusedDecalPartId,
      faceAxis: focusedFaceAxis,
      imageDataUrl,
    })
    if (!nextDecal) {
      setApplyStatus('Decal: invalid image data')
      return
    }
    const rest = itemDecals.filter((decal) => !(decal.partId === nextDecal.partId && decal.faceAxis === nextDecal.faceAxis))
    confirmTextureDecals([...rest, nextDecal])
    setApplyStatus(`Decal saving: ${nextDecal.partId} ${nextDecal.faceAxis}`)
  }

  const updateActiveDecal = (patch) => {
    if (!activeDecal) return
    const nextDecal = normalizeTextureDecal({ ...activeDecal, ...patch })
    if (!nextDecal) return
    confirmTextureDecals(itemDecals.map((decal) => (
      decal.partId === activeDecal.partId && decal.faceAxis === activeDecal.faceAxis ? nextDecal : decal
    )))
    setApplyStatus('Decal saving')
  }

  const removeDecal = (target) => {
    confirmTextureDecals(itemDecals.filter((decal) => !(decal.partId === target.partId && decal.faceAxis === target.faceAxis)))
    setApplyStatus(`Decal saving: ${target.partId} ${target.faceAxis}`)
  }

  const focusDecal = (decal) => {
    setFocusedParts([{ key: `id:${decal.partId}`, label: decal.partId }])
    setFocusedFaceAxis(decal.faceAxis)
    setApplyStatus(`Decal focus: ${decal.partId} ${decal.faceAxis}`)
  }

  const updateStageBossPreview = (patch) => {
    rememberUndoSnapshot()
    const next = normalizeStageBossPreview({ ...stageBossPreviewRef.current, ...patch })
    stageBossPreviewRef.current = next
    setStageBossPreview(next)
    setApplyStatus('Boss preview draft')
  }


  const persistAllDrafts = async (successLabel, overrides = {}) => {
    const datasets = loadStudioRuntimeDatasets()
    const nextTunings = {
      ...datasets.tunings,
      ...draftTuningByIdRef.current,
      [activeTuningId]: normalizeStudioTuning(tuning),
    }
    const nextBossFaceRecipes = normalizeBossFaceRecipeMap({
      ...datasets.bossFaceRecipes,
      ...bossFaceRecipes,
      ...draftBossFaceRecipes,
    })
    const nextDatasets = {
      ...datasets,
      tunings: nextTunings,
      sfxTunings,
      stageBossPreview: normalizeStageBossPreview(stageBossPreview),
      decals: normalizeTextureDecalMap(decalsByItem),
      propPlacements: overrides.propPlacements ?? draftPropPlacements,
      bossFaceRecipes: nextBossFaceRecipes,
    }

    applyFirebaseStudioDatasets(nextDatasets)
    void sendGameSync({ openGame: true, datasets: nextDatasets })
    setConfirmedTunings(nextTunings)
    draftTuningByIdRef.current = {}
    sfxTuningsRef.current = sfxTunings
    stageBossPreviewRef.current = normalizeStageBossPreview(stageBossPreview)
    decalsByItemRef.current = normalizeTextureDecalMap(decalsByItem)
    draftBossFaceRecipesRef.current = {}
    draftPropPlacementsRef.current = overrides.propPlacements ?? draftPropPlacements
    undoHistoryRef.current = []
    setDraftTuningById({})
    setBossFaceRecipes(nextBossFaceRecipes)
    setDraftBossFaceRecipes({})
    setApplyStatus(successLabel)

    const result = await persistDatasetsOnApply(nextDatasets)
    if (result.status === 'saved') {
      void sendGameSync({
        openGame: true,
        datasets: nextDatasets,
        revision: result.revision,
      })
      setApplyStatus(successLabel)
      setFirebaseStatus('saved')
    }
    return result
  }

  const applyCurrent = async () => {
    await persistAllDrafts('Game applied')
  }

  const copyExport = async () => {
    await navigator.clipboard?.writeText(exportJson)
  }

  const updateFocusedParts = (part) => {
    if (part.faceAxis) setFocusedFaceAxis(part.faceAxis)
    setFocusedParts((current) => {
      const exists = current.some((item) => item.key === part.key)
      if (part.additive && current.length > 0) {
        const next = exists ? current : [...current, { key: part.key, label: part.label }]
        setApplyStatus(next.length > 1 ? `Part Group: ${next.length} parts` : `Part Focus: ${part.label}`)
        return next
      }
      const next = current.length > 1 && exists
        ? [{ key: part.key, label: part.label }]
        : [{ key: part.key, label: part.label }]
      setApplyStatus(`Part Focus: ${part.label}`)
      return next
    })
  }

  const updateSfxTuning = (patch) => {
    if (!selectedSfx) return
    rememberUndoSnapshot()
    const soundId = selectedSfx.id
    const next = {
      ...sfxTuningsRef.current,
      [soundId]: normalizeSfxTuning({ ...sfxTuningsRef.current[soundId], ...patch }),
    }
    sfxTuningsRef.current = next
    setSfxTunings(next)
    setApplyStatus('Audio preview')
  }

  const playSelectedSfxPreview = () => {
    if (!selectedSfx) return
    playSfx(selectedSfx.id, 1, { tuningOverride: sfxTuning })
  }

  const applySfxCurrent = async () => {
    if (!selectedSfx) return
    await persistAllDrafts('Audio applied')
  }

  const updateBossFacePart = (categoryKey, partId) => {
    rememberUndoSnapshot()
    const bossType = selectedFaceBossType
    const next = {
      ...draftBossFaceRecipesRef.current,
      [bossType]: normalizeBossFaceRecipe({ ...faceRecipe, [categoryKey]: partId }),
    }
    draftBossFaceRecipesRef.current = next
    setDraftBossFaceRecipes(next)
    setApplyStatus('Face preview')
  }

  const applyBossFaceRecipe = async () => {
    const result = await persistAllDrafts('Face parts applied')
    if (result.status === 'saved') saveBossFaceRecipes(normalizeBossFaceRecipeMap({ ...bossFaceRecipes, ...draftBossFaceRecipes }))
  }


  return (
    <main style={styles.page}>
      <style>{STUDIO_SLIDER_CSS}</style>
      <section style={{ ...styles.shell, ...(compact ? styles.shellCompact : null) }} aria-label="Graphics Studio">
        <header style={styles.header}>
          <div style={styles.headerTitle}>
            <h1 style={styles.title}>Graphics Studio</h1>
            <p style={styles.subtitle}>
              {activeSection === 'graphics'
                ? `${categoryLabels[selectedItem.category]} / ${selectedItem.label}`
                : activeSection === 'audio'
                  ? `Audio / ${selectedSfx?.id ?? ''}`
                  : activeSection === 'faces'
                    ? `Face Parts / ${selectedFaceBoss?.label ?? selectedFaceBossType}`
                    : 'Map Props / 스테이지 프랍 배치'}
            </p>
          </div>
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setActiveSection('graphics')}
              style={{ ...styles.tabButton, ...(activeSection === 'graphics' ? styles.tabButtonActive : null) }}
            >
              Graphics
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('audio')}
              style={{ ...styles.tabButton, ...(activeSection === 'audio' ? styles.tabButtonActive : null) }}
            >
              Audio
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('props')}
              style={{ ...styles.tabButton, ...(activeSection === 'props' ? styles.tabButtonActive : null) }}
            >
              Props
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('faces')}
              style={{ ...styles.tabButton, ...(activeSection === 'faces' ? styles.tabButtonActive : null) }}
            >
              Faces
            </button>
          </div>
          <div style={styles.statusLine}>
            <span style={styles.sourceLabel}>{activeSection === 'graphics' ? selectedItem.source : activeSection === 'faces' ? 'procedural shader face parts' : selectedSfx?.src}</span>
            <span data-testid="studio-firebase-status" data-status={firebaseStatus} aria-live="polite" style={styles.sourceLabel}>
              Firebase: {firebaseStatus}
            </span>
          </div>
        </header>

        {activeSection === 'props' ? (
          <section
            style={styles.propEditorPanel}
            data-testid="studio-prop-editor-shell"
          >
            <StagePropPlacementEditor
              key={propEditorVersion}
              initialPlacements={draftPropPlacements}
              onDraftChange={updatePropPlacementDraft}
              onApply={applyPropPlacements}
            />
          </section>
        ) : (
        <>
        <aside style={{ ...styles.sidebar, ...(compact ? styles.sidebarCompact : null) }}>
          {activeSection === 'graphics' ? groupedCatalog.map((category) => (
            <section key={category.id} style={styles.catalogGroup}>
              <h2 style={styles.catalogTitle}>{category.label}</h2>
              <div style={styles.itemList}>
                {category.items.map((item) => {
                  const selected = item.id === selectedItem.id
                  const isBoss = Boolean(item.zombieType?.startsWith('B'))
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id)
                        setFocusedParts([])
                      }}
                      style={{
                        ...styles.itemButton,
                        ...(isBoss ? styles.itemButtonBoss : null),
                        ...(selected ? styles.itemButtonSelected : null),
                      }}
                    >
                      <span style={isBoss ? styles.itemButtonLabelBoss : undefined}>{item.label}</span>
                      {isBoss ? <span style={styles.bossBadge}>BOSS</span> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )) : activeSection === 'faces' ? (
            <section style={styles.catalogGroup} data-testid="boss-face-boss-list">
              <h2 style={styles.catalogTitle}>Boss Face Target</h2>
              <div style={styles.itemList}>
                {BOSS_FACE_BOSS_OPTIONS.map((boss) => {
                  const selected = boss.type === selectedFaceBossType
                  return (
                    <button
                      key={boss.type}
                      type="button"
                      onClick={() => setSelectedFaceBossType(boss.type)}
                      style={{
                        ...styles.itemButton,
                        ...styles.itemButtonBoss,
                        ...(selected ? styles.itemButtonSelected : null),
                      }}
                    >
                      <span style={styles.itemButtonLabelBoss}>{boss.label}</span>
                      <span style={styles.bossBadge}>{boss.type}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : (
            <section style={styles.catalogGroup}>
              <h2 style={styles.catalogTitle}>SFX</h2>
              <div style={styles.itemList}>
                {sfxCatalog.map((sound) => {
                  const selected = sound.id === selectedSfx?.id
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => setSelectedSfxId(sound.id)}
                      style={{
                        ...styles.itemButton,
                        ...(selected ? styles.itemButtonSelected : null),
                      }}
                    >
                      <span>{sound.id}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </aside>

        <section style={{ ...styles.previewPanel, ...(compact ? styles.previewPanelCompact : null) }}>
          {activeSection === 'graphics' || activeSection === 'faces' ? (
            <>
              <GraphicsStudioPreview
                selectedItem={activeSection === 'faces' ? facePreviewItem : selectedItem}
                tuning={activeSection === 'faces' ? normalizeStudioTuning(confirmedTunings[facePreviewItem.id] ?? DEFAULT_STUDIO_TUNING) : itemTuning}
                focusedPartKeys={activeSection === 'faces' ? [] : focusedParts.map((part) => part.key)}
                focusedPartTuning={activeSection === 'graphics' && focusedParts.length ? tuning : null}
                partTunings={livePreviewTunings}
                decals={activeSection === 'faces' ? (decalsByItem[facePreviewItem.id] ?? []) : itemDecals}
                onPartFocus={activeSection === 'faces' ? undefined : updateFocusedParts}
                backgroundColor={previewBg}
              />
              <div style={styles.previewBgSwatches} data-testid="preview-bg-swatches">
                <span style={styles.previewBgLabel}>배경</span>
                {PREVIEW_BG_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    data-testid={`preview-bg-${swatch.id}`}
                    aria-pressed={previewBg === swatch.value}
                    title={swatch.label}
                    onClick={() => setPreviewBg(swatch.value)}
                    style={{
                      ...styles.previewBgSwatch,
                      background: swatch.value,
                      ...(previewBg === swatch.value ? styles.previewBgSwatchActive : null),
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={styles.audioPreview} data-testid="audio-preview">
              <strong style={styles.audioTitle}>{selectedSfx?.id}</strong>
              <span style={styles.audioPath}>{selectedSfx?.src}</span>
              <button type="button" onClick={playSelectedSfxPreview} style={styles.primaryButton}>
                Play
              </button>
            </div>
          )}
        </section>

        <aside style={{ ...styles.inspector, ...(compact ? styles.inspectorCompact : null) }}>
          {activeSection === 'graphics' ? (
            <>
          <div style={styles.inspectorTitleRow}>
            <div style={styles.inspectorTitleText}>
              <h2 style={styles.panelTitle}>Inspector</h2>
              {focusedParts.length ? <span style={styles.partFocusLabel}>{getFocusedPartLabel(focusedParts)}</span> : null}
            </div>
            {focusedParts.length ? (
              <button type="button" onClick={() => setFocusedParts([])} style={styles.exitPartButton}>
                Exit Part
              </button>
            ) : null}
          </div>
          <div style={styles.controls}>
            <section
              style={styles.stageBossPreviewSection}
              data-testid="stage-boss-card-layout-section"
              aria-labelledby="stage-boss-card-layout-title"
            >
              <div style={styles.stageBossPreviewHeader}>
                <span id="stage-boss-card-layout-title" style={styles.stageBossPreviewTitle}>Stage Boss Card Layout</span>
                <span style={styles.stageBossPreviewHint}>wheel zoom / drag pan</span>
              </div>
              <StageBossPreview
                framing={stageBossPreview}
                bossType={selectedStageBossType}
                interactive
                onChange={updateStageBossPreview}
                testId="studio-stage-boss-preview"
              />
              <div style={styles.stageBossPreviewControls}>
                <SliderRow label="Preview Zoom" name="stageBossPreviewZoom" min="0" max="180" step="1" value={stageBossPreview.zoom} onChange={(zoom) => updateStageBossPreview({ zoom })} />
                <SliderRow label="Preview Pan X" name="stageBossPreviewPanX" min="-2" max="2" step="0.01" value={stageBossPreview.panX} onChange={(panX) => updateStageBossPreview({ panX })} />
                <SliderRow label="Preview Pan Y" name="stageBossPreviewPanY" min={STAGE_BOSS_PREVIEW_PAN_Y_RANGE[0]} max={STAGE_BOSS_PREVIEW_PAN_Y_RANGE[1]} step="0.01" value={stageBossPreview.panY} onChange={(panY) => updateStageBossPreview({ panY })} />
              </div>
            </section>
            <section style={styles.transformGroup} data-testid="transform-group-scale">
              <span style={styles.transformGroupTitle}>스케일</span>
              <SliderRow
                label="Scale"
                name="scale"
                min="0.35"
                max="2.5"
                step="0.01"
                value={tuning.scale}
                onChange={(scale) => updateTuning(scale === 1
                  ? { scale, scaleX: 1, scaleY: 1, scaleZ: 1 }
                  : { scale })}
              />
              <SliderRow label="Width X" name="scaleX" min="0.35" max="2.5" step="0.01" value={tuning.scaleX} onChange={(scaleX) => updateTuning({ scaleX })} />
              <SliderRow label="Height Y" name="scaleY" min="0.35" max="2.5" step="0.01" value={tuning.scaleY} onChange={(scaleY) => updateTuning({ scaleY })} />
              <SliderRow label="Depth Z" name="scaleZ" min="0.35" max="2.5" step="0.01" value={tuning.scaleZ} onChange={(scaleZ) => updateTuning({ scaleZ })} />
            </section>
            <section style={styles.transformGroup} data-testid="transform-group-position">
              <span style={styles.transformGroupTitle}>포지션</span>
              <SliderRow label="Position X" name="positionX" min="-3" max="3" step="0.01" value={tuning.positionX} onChange={(positionX) => updateTuning({ positionX })} />
              <SliderRow label="Position Y" name="positionY" min="-3" max="3" step="0.01" value={tuning.positionY} onChange={(positionY) => updateTuning({ positionY })} />
              <SliderRow label="Position Z" name="positionZ" min="-3" max="3" step="0.01" value={tuning.positionZ} onChange={(positionZ) => updateTuning({ positionZ })} />
            </section>
            <section style={styles.transformGroup} data-testid="transform-group-rotation">
              <span style={styles.transformGroupTitle}>로테이션</span>
              <SliderRow label="Rotate X" name="rotationX" min="-180" max="180" step="1" value={tuning.rotationX} onChange={(rotationX) => updateTuning({ rotationX })} />
              <SliderRow label="Rotate Y" name="rotationY" min="-180" max="180" step="1" value={tuning.rotationY} onChange={(rotationY) => updateTuning({ rotationY })} />
              <SliderRow label="Rotate Z" name="rotationZ" min="-180" max="180" step="1" value={tuning.rotationZ} onChange={(rotationZ) => updateTuning({ rotationZ })} />
            </section>
            <SliderRow label="Outline" name="outlineThickness" min="0.4" max="2.2" step="0.01" value={tuning.outlineThickness} onChange={(outlineThickness) => updateTuning({ outlineThickness })} />
            <SliderRow label="Opacity" name="outlineOpacity" min="0" max="1" step="0.01" value={tuning.outlineOpacity} onChange={(outlineOpacity) => updateTuning({ outlineOpacity })} />
            <ColorRow label="Outline Color" name="outlineColor" value={tuning.outlineColor} onChange={(outlineColor) => updateTuning({ outlineColor })} />
            <ColorRow label="Color" name="color" value={tuning.color} onChange={(color) => updateTuning({ color })} />
            <SliderRow label="Color Mix" name="colorStrength" min="0" max="1" step="0.01" value={tuning.colorStrength} onChange={(colorStrength) => updateTuning({ colorStrength })} />
            <SliderRow label="Saturation" name="saturation" min="0.1" max="1.8" step="0.01" value={tuning.saturation} onChange={(saturation) => updateTuning({ saturation })} />
            <SliderRow label="Brightness" name="brightness" min="0.35" max="1.8" step="0.01" value={tuning.brightness} onChange={(brightness) => updateTuning({ brightness })} />
            <SliderRow label="Emissive" name="emissiveIntensity" min="0" max="1.2" step="0.01" value={tuning.emissiveIntensity} onChange={(emissiveIntensity) => updateTuning({ emissiveIntensity })} />
            <label style={styles.selectRow}>
              <span style={styles.controlLabel}>Motion</span>
              <select
                name="animation"
                value={tuning.animation}
                onChange={(event) => updateTuning({ animation: event.target.value })}
                style={styles.select}
              >
                <option value="normal">normal</option>
                <option value="warn">warn</option>
                <option value="charge">charge</option>
                <option value="stun">stun</option>
                <option value="lantern">lantern</option>
                <option value="lanternFlashlight">lanternFlashlight</option>
              </select>
            </label>
            <section style={styles.decalSection} data-testid="decal-section">
              <div style={styles.stageBossPreviewHeader}>
                <span style={styles.stageBossPreviewTitle}>Texture Decal</span>
                <span style={styles.stageBossPreviewHint}>
                  {focusedDecalPartId ? `${focusedDecalPartId} / ${focusedFaceAxis}` : 'double-click a part face'}
                </span>
              </div>
              <input
                name="decalImage"
                data-testid="decal-upload"
                type="file"
                accept="image/*"
                disabled={!focusedDecalPartId}
                onChange={handleDecalUpload}
                style={styles.decalFileInput}
              />
              {activeDecal ? (
                <>
                  <SliderRow label="Decal U" name="decalOffsetU" min="-3" max="3" step="0.01" value={activeDecal.offset[0]} onChange={(u) => updateActiveDecal({ offset: [u, activeDecal.offset[1]] })} />
                  <SliderRow label="Decal V" name="decalOffsetV" min="-3" max="3" step="0.01" value={activeDecal.offset[1]} onChange={(v) => updateActiveDecal({ offset: [activeDecal.offset[0], v] })} />
                  <SliderRow label="Decal W" name="decalScaleX" min="0.05" max="4" step="0.01" value={activeDecal.scale[0]} onChange={(sx) => updateActiveDecal({ scale: [sx, activeDecal.scale[1]] })} />
                  <SliderRow label="Decal H" name="decalScaleY" min="0.05" max="4" step="0.01" value={activeDecal.scale[1]} onChange={(sy) => updateActiveDecal({ scale: [activeDecal.scale[0], sy] })} />
                  <SliderRow label="Decal Rot" name="decalRotation" min="-180" max="180" step="1" value={activeDecal.rotation} onChange={(rotation) => updateActiveDecal({ rotation })} />
                </>
              ) : null}
              {itemDecals.map((decal) => (
                <div key={`${decal.partId}|${decal.faceAxis}`} style={styles.decalListRow}>
                  <button type="button" onClick={() => focusDecal(decal)} style={styles.decalListLabel}>
                    {decal.partId} {decal.faceAxis}
                  </button>
                  <button type="button" onClick={() => removeDecal(decal)} style={styles.decalDeleteButton}>
                    Delete
                  </button>
                </div>
              ))}
            </section>
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={applyCurrent} style={styles.largePrimaryButton}>Apply</button>
            <button type="button" onClick={copyExport} style={styles.secondaryButton}>Copy JSON</button>
          </div>
          <div style={styles.applyStatus} aria-live="polite">{applyStatus}</div>
            </>
          ) : activeSection === 'faces' ? (
            <>
              <div style={styles.inspectorTitleRow}>
                <div style={styles.inspectorTitleText}>
                  <h2 style={styles.panelTitle}>Boss Face Parts</h2>
                  <span style={styles.partFocusLabel}>{selectedFaceBoss?.label}</span>
                </div>
              </div>
              <div style={styles.controls} data-testid="boss-face-parts-panel">
                <BossFaceGridPreview bossLabel={selectedFaceBoss?.label} recipe={faceRecipe} />
                <p style={styles.facePartsHelp}>
                  보스 얼굴 위에 눈썹/눈/코/입을 절차적 셰이더 선으로 그리는 파츠 조합입니다. 파츠는 각 5개씩 하나가 직접 그려둔 심플 좀비 스타일이에요.
                </p>
                {BOSS_FACE_PART_CATEGORIES.map((category) => (
                  <section key={category.key} style={styles.transformGroup} data-testid={`face-category-${category.key}`}>
                    <span style={styles.transformGroupTitle}>{category.label}</span>
                    <div style={styles.facePartGrid}>
                      {category.parts.map((part, index) => {
                        const selected = faceRecipe[category.key] === part.id
                        return (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => updateBossFacePart(category.key, part.id)}
                            style={{
                              ...styles.facePartButton,
                              ...(selected ? styles.facePartButtonSelected : null),
                            }}
                          >
                            <span style={styles.facePartPreview}>{category.label.slice(0, 1)}{index + 1}</span>
                            <span>{part.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <div style={styles.actions}>
                <button type="button" onClick={applyBossFaceRecipe} style={styles.largePrimaryButton}>Apply</button>
                <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify({ [selectedFaceBossType]: faceRecipe }, null, 2))} style={styles.secondaryButton}>Copy JSON</button>
              </div>
              <div style={styles.applyStatus} aria-live="polite">{applyStatus}</div>
            </>
          ) : (
            <>
              <div style={styles.inspectorTitleRow}>
                <div style={styles.inspectorTitleText}>
                  <h2 style={styles.panelTitle}>Audio</h2>
                  <span style={styles.partFocusLabel}>{selectedSfx?.category}</span>
                </div>
                <button type="button" onClick={playSelectedSfxPreview} style={styles.exitPartButton}>
                  Play
                </button>
              </div>
              <div style={styles.controls}>
                <SliderRow label="Volume" name="sfxVolume" min="0" max="2" step="0.01" value={sfxTuning.volume} onChange={(volume) => updateSfxTuning({ volume })} />
                <SliderRow label="Pitch" name="sfxRate" min="0.5" max="2" step="0.01" value={sfxTuning.rate} onChange={(rate) => updateSfxTuning({ rate })} />
              </div>
              <div style={styles.actions}>
                <button type="button" onClick={applySfxCurrent} style={styles.largePrimaryButton}>Apply</button>
                <button type="button" onClick={playSelectedSfxPreview} style={styles.secondaryButton}>Play</button>
                <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(sfxTunings, null, 2))} style={styles.secondaryButton}>Copy JSON</button>
              </div>
              <div style={styles.applyStatus} aria-live="polite">{applyStatus}</div>
            </>
          )}
        </aside>

        <section style={{ ...styles.exportPanel, ...(compact ? styles.exportPanelCompact : null) }}>
          <div style={styles.exportHeader}>
            <h2 style={styles.panelTitle}>Confirmed JSON</h2>
            <span style={styles.exportMeta}>{Object.keys(exportTunings).length} item</span>
          </div>
          <textarea data-testid="studio-export" readOnly value={exportJson} style={styles.exportText} />
        </section>
        </>
        )}
      </section>
    </main>
  )
}

const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    margin: 0,
    background: '#0f100f',
    color: '#f2eee5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    width: '100vw',
    height: '100vh',
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 18fr) minmax(640px, 52fr) minmax(560px, 30fr)',
    gridTemplateRows: 'minmax(88px, auto) minmax(0, 1fr) minmax(220px, 28vh)',
    background: '#171817',
    border: '1px solid #353833',
    overflow: 'hidden',
  },
  shellCompact: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto 170px minmax(280px, 1fr) auto auto',
    overflow: 'auto',
  },
  header: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '10px 14px',
    minHeight: 88,
    rowGap: 8,
    borderBottom: '1px solid #353833',
    background: '#20231f',
  },
  headerTitle: {
    minWidth: 0,
  },
  propEditorPanel: {
    gridColumn: '1 / -1',
    gridRow: '2 / -1',
    minWidth: 0,
    minHeight: 0,
    background: '#171817',
    display: 'flex',
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    fontSize: 36,
    lineHeight: '44px',
    letterSpacing: 0,
    fontWeight: 800,
  },
  subtitle: {
    margin: '3px 0 0',
    fontSize: 24,
    color: '#bfc8b8',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  tabButton: {
    minWidth: 78,
    minHeight: 46,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#151614',
    color: '#d8dccf',
    cursor: 'pointer',
    fontSize: 24,
    fontWeight: 800,
    padding: '0 10px',
  },
  tabButtonActive: {
    border: '1px solid #d3a53f',
    background: '#2a2619',
    color: '#fff6cf',
  },
  statusLine: {
    flex: '1 1 420px',
    minWidth: 0,
    maxWidth: '100%',
    color: '#d3a53f',
    fontSize: 24,
    whiteSpace: 'normal',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
  },
  sourceLabel: {
    display: 'block',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  gameBridge: {
    display: 'grid',
    gridTemplateColumns: '58px minmax(120px, 220px) 72px',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  gameBridgeLabel: {
    color: '#bfc8b8',
    fontSize: 22,
  },
  gameBridgeInput: {
    minWidth: 0,
    minHeight: 44,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#111210',
    color: '#f2eee5',
    padding: '0 8px',
    fontSize: 22,
  },
  gameBridgeButton: {
    minHeight: 44,
    border: '1px solid #d3a53f',
    borderRadius: 6,
    background: '#2a2619',
    color: '#fff6cf',
    cursor: 'pointer',
    fontSize: 22,
    fontWeight: 800,
    padding: '0 10px',
  },
  sidebar: {
    gridRow: '2 / 4',
    overflow: 'auto',
    borderRight: '1px solid #353833',
    background: '#151614',
    padding: 12,
    minWidth: 0,
  },
  sidebarCompact: {
    gridColumn: 1,
    gridRow: 2,
    borderRight: 0,
    borderBottom: '1px solid #353833',
  },
  catalogGroup: {
    marginBottom: 14,
  },
  catalogTitle: {
    margin: '0 0 8px',
    fontSize: 22,
    lineHeight: '28px',
    color: '#8ebc9d',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  itemList: {
    display: 'grid',
    gap: 5,
  },
  itemButton: {
    minHeight: 60,
    border: '1px solid #2b2e2a',
    background: '#1e201d',
    color: '#e6e1d8',
    borderRadius: 6,
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: 24,
    cursor: 'pointer',
  },
  itemButtonBoss: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingLeft: 11,
    background: '#241a1a',
    boxShadow: 'inset 3px 0 0 #d64545',
  },
  itemButtonLabelBoss: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  bossBadge: {
    flexShrink: 0,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: '22px',
    letterSpacing: 0.5,
    padding: '1px 6px',
    borderRadius: 999,
    background: '#c0392b',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  itemButtonSelected: {
    border: '1px solid #d3a53f',
    background: '#2a2619',
    color: '#fff6cf',
  },
  previewPanel: {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
    borderRight: '1px solid #353833',
    background: '#171817',
  },
  previewBgSwatches: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px',
    borderRadius: 8,
    background: 'rgba(18, 18, 16, 0.62)',
    zIndex: 3,
  },
  previewBgLabel: {
    color: '#cfd8d2',
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '0.03em',
    marginRight: 2,
  },
  previewBgSwatch: {
    width: 20,
    height: 20,
    padding: 0,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.35)',
    cursor: 'pointer',
  },
  previewBgSwatchActive: {
    border: '2px solid #e35d3d',
    boxShadow: '0 0 0 2px rgba(227, 93, 61, 0.35)',
  },
  previewPanelCompact: {
    gridColumn: 1,
    gridRow: 3,
    borderRight: 0,
    borderBottom: '1px solid #353833',
  },
  audioPreview: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeContent: 'center',
    justifyItems: 'center',
    gap: 12,
    padding: 24,
    boxSizing: 'border-box',
  },
  audioTitle: {
    color: '#f4eadb',
    fontSize: 48,
  },
  audioPath: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#8ebc9d',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 24,
  },
  inspector: {
    gridColumn: 3,
    gridRow: '2 / 4',
    minHeight: 0,
    minWidth: 560,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
    background: '#1b1d1a',
  },
  inspectorCompact: {
    gridColumn: 1,
    gridRow: 4,
    borderBottom: '1px solid #353833',
  },
  panelTitle: {
    margin: 0,
    fontSize: 26,
    lineHeight: '36px',
    color: '#f4eadb',
    fontWeight: 800,
  },
  inspectorTitleRow: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '0 14px 0',
    minHeight: 72,
  },
  inspectorTitleText: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  partFocusLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#f0c765',
    fontSize: 22,
  },
  exitPartButton: {
    minWidth: 78,
    minHeight: 48,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#20231f',
    color: '#f2eee5',
    cursor: 'pointer',
    fontSize: 24,
  },
  controls: {
    overflow: 'auto',
    padding: '0 14px 12px',
    display: 'grid',
    gap: 12,
    minWidth: 0,
  },
  stageBossPreviewSection: {
    display: 'grid',
    gap: 12,
    padding: 12,
    border: '1px solid #55705d',
    borderTop: '3px solid #7fb58d',
    borderRadius: 8,
    background: '#181f1b',
    boxShadow: '0 0 0 1px rgba(127, 181, 141, 0.08), 0 8px 18px rgba(0, 0, 0, 0.18)',
  },
  stageBossPreviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stageBossPreviewTitle: {
    color: '#bfe6c8',
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '0.02em',
  },
  stageBossPreviewHint: {
    color: '#8ebc9d',
    fontSize: 20,
  },
  stageBossPreviewControls: {
    display: 'grid',
    gap: 12,
    paddingTop: 2,
  },
  transformGroup: {
    display: 'grid',
    gap: 12,
    padding: 12,
    border: '1px solid #55705d',
    borderTop: '3px solid #7fb58d',
    borderRadius: 8,
    background: '#181f1b',
    boxShadow: '0 0 0 1px rgba(127, 181, 141, 0.08), 0 8px 18px rgba(0, 0, 0, 0.18)',
  },
  transformGroupTitle: {
    color: '#bfe6c8',
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '0.02em',
  },
  facePartsHelp: {
    margin: 0,
    padding: '8px 10px',
    border: '1px solid #3f443c',
    borderRadius: 8,
    background: '#151614',
    color: '#cfd5ca',
    fontSize: 22,
    lineHeight: '30px',
  },
  facePartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 6,
  },
  facePartButton: {
    minWidth: 0,
    minHeight: 42,
    display: 'grid',
    gridTemplateColumns: '30px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 12,
    border: '1px solid #2b2e2a',
    borderRadius: 7,
    background: '#1e201d',
    color: '#e6e1d8',
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 22,
    cursor: 'pointer',
  },
  facePartButtonSelected: {
    border: '1px solid #d3a53f',
    background: '#2a2619',
    color: '#fff6cf',
    boxShadow: '0 0 0 1px rgba(211, 165, 63, 0.18)',
  },
  facePartPreview: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 6,
    background: '#111210',
    color: '#f0c765',
    fontWeight: 900,
    fontSize: 22,
  },
  decalSection: {
    display: 'grid',
    gap: 12,
    paddingTop: 8,
    borderTop: '1px solid #353833',
  },
  decalFileInput: {
    width: '100%',
    minWidth: 0,
    color: '#cfd5ca',
    fontSize: 22,
  },
  decalListRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 58px',
    alignItems: 'center',
    gap: 8,
  },
  decalListLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    border: '1px solid #2b2e2a',
    borderRadius: 6,
    background: '#1e201d',
    color: '#f0c765',
    padding: '4px 8px',
    fontSize: 22,
    cursor: 'pointer',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  decalDeleteButton: {
    minHeight: 36,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#20231f',
    color: '#f2eee5',
    cursor: 'pointer',
    fontSize: 22,
  },
  controlRow: {
    display: 'grid',
    gridTemplateColumns: '160px minmax(220px, 1fr) 176px',
    alignItems: 'center',
    gap: 16,
    minHeight: 74,
    fontSize: 24,
  },
  controlLabel: {
    color: '#cfd5ca',
    fontSize: 24,
  },
  controlValue: {
    color: '#f0c765',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    fontSize: 24,
  },
  controlValueInput: {
    width: 176,
    minWidth: 0,
    border: '1px solid #353833',
    borderRadius: 6,
    background: '#111210',
    color: '#f0c765',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    fontSize: 40,
    padding: 10,
  },
  range: {
    width: '100%',
    accentColor: '#e35d3d',
  },
  colorRow: {
    display: 'grid',
    gridTemplateColumns: '160px 56px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  colorInput: {
    width: 56,
    height: 34,
    border: '1px solid #353833',
    background: '#111210',
    padding: 0,
  },
  hexValue: {
    fontSize: 22,
    color: '#f0c765',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  selectRow: {
    display: 'grid',
    gridTemplateColumns: '160px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  select: {
    minHeight: 40,
    border: '1px solid #353833',
    borderRadius: 6,
    background: '#111210',
    color: '#f2eee5',
    padding: '0 8px',
    fontSize: 24,
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))',
    gap: 8,
    padding: '10px 14px',
    minHeight: 88,
    borderTop: '1px solid #353833',
  },
  applyStatus: {
    minHeight: 44,
    padding: '4px 14px 8px',
    color: '#8ebc9d',
    fontSize: 24,
    lineHeight: 1.2,
    whiteSpace: 'normal',
  },
  primaryButton: {
    border: 0,
    borderRadius: 6,
    background: '#e35d3d',
    color: '#fff8ec',
    fontWeight: 800,
    cursor: 'pointer',
  },
  largePrimaryButton: {
    background: '#e35d3d', color: '#171817', border: 'none', borderRadius: 10,
    padding: '16px 28px', minHeight: 64, minWidth: 128, fontSize: 28, fontWeight: 800, cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#20231f',
    color: '#f2eee5',
    cursor: 'pointer',
  },
  exportPanel: {
    gridColumn: 2,
    gridRow: 3,
    minWidth: 0,
    minHeight: 0,
    borderTop: '1px solid #353833',
    borderRight: '1px solid #353833',
    background: '#141513',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
  },
  exportPanelCompact: {
    gridColumn: 1,
    gridRow: 5,
    borderRight: 0,
  },
  exportHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    minHeight: 72,
    gap: 8,
  },
  exportMeta: {
    color: '#8ebc9d',
    fontSize: 24,
  },
  exportText: {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: 0,
    borderTop: '1px solid #2c2f2a',
    resize: 'none',
    background: '#10110f',
    color: '#d8dccf',
    padding: 10,
    fontSize: 22,
    lineHeight: '30px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
}
