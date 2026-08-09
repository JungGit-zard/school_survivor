import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  STAGE_PROP_STAGE_IDS,
  loadStagePropPlacements,
  normalizePropPlacement,
} from '../lib/stagePropPlacements.js'
import {
  STAGE_PROP_PALETTE,
  getPaletteEntry,
  getPaletteDefaultProps,
  getStagePropEditorBounds,
  getEditorViewport,
  screenToWorld,
  worldToScreen,
} from '../lib/stagePropEditorGeometry.js'
import { computeDefaultStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { QUEST_DEFINITIONS, getStageQuestDefinitions } from '../lib/quests.js'

export const TYPE_COLORS = {
  classroomDesk: '#c79a52',
  classroomChair: '#8f6cc0',
  unconsciousStudent: '#5fb0d8',
  classPresidentStudent: '#c23535',
  corridorLockerBank: '#6fb98a',
  corridorJanitorCart: '#c76f6f',
  corridorLostFoundBoard: '#b8a24a',
  // 체육관(stage3) 프랍 10종 — 서로 구분되는 색상
  basketballHoop: '#e0512b',
  basketballBallCart: '#7d6f5a',
  basketballCluster: '#f0932b',
  gymBench: '#b5651d',
  gymTrainingCones: '#e8c221',
  gymMats: '#3b8dd6',
  gymScoreboard: '#2ec7a5',
  gymBanner: '#d64f8f',
  gymExitDoor: '#2f9e57',
  gymEquipmentSpill: '#b56ad0',
}

const QUEST_GIVER_COLORS = Object.freeze([
  '#e85c9b', '#f0a43a', '#55c4d8', '#aa7be8',
  '#ef6b64', '#72c46b', '#e56db3', '#e0c64d',
])

export function getQuestGiverPresentation(stageId, placementId) {
  const quest = getStageQuestDefinitions(stageId).find(({ giver }) => (
    placementId === giver.placementId || placementId.startsWith(`${giver.placementId}-copy-`)
  ))
  if (!quest) return null
  return {
    quest,
    color: QUEST_GIVER_COLORS[QUEST_DEFINITIONS.indexOf(quest) % QUEST_GIVER_COLORS.length],
  }
}

export function getCanonicalQuestGiverPlacements(stageId) {
  return computeDefaultStageObjectPlacements(stageId)
    .filter(({ id }) => getQuestGiverPresentation(stageId, id))
    .map((placement) => ({
      ...placement,
      position: [...placement.position],
      rotation: Array.isArray(placement.rotation) ? [...placement.rotation] : placement.rotation,
      ...(placement.props ? { props: { ...placement.props } } : {}),
    }))
}

let _newIdCounter = 0
function makeUserId(type) {
  _newIdCounter += 1
  return `user-${type}-${Date.now().toString(36)}-${_newIdCounter}`
}

// override[stageId] 있으면 그 배열, 없으면 기본 배치를 편집용 시드로.
function seedList(stageId, override) {
  const list = override?.[stageId]
  if (Array.isArray(list)) return list.map((item) => ({ ...item }))
  return computeDefaultStageObjectPlacements(stageId).map((item) => ({
    id: item.id,
    type: item.type,
    position: [item.position[0], 0, item.position[2]],
    rotation: [0, Array.isArray(item.rotation) ? item.rotation[1] : (item.rotation ?? 0), 0],
    scale: Array.isArray(item.scale) ? item.scale[0] : (item.scale ?? 1),
    // 전체 props(variant/damaged/knockedOver/count)와 blocking(관통 가능 여부)을 보존해
    // 에디터 경유 시 상태가 소실되지 않게 한다. 화이트리스트 필터링은 저장 시 normalize가 최종 담당.
    ...(typeof item.blocking === 'boolean' ? { blocking: item.blocking } : {}),
    ...(item.props ? { props: { ...item.props } } : {}),
  }))
}

export default function StagePropPlacementEditor({ onChange }) {
  const [override] = useState(() => loadStagePropPlacements())
  const [stageId, setStageId] = useState('stage1')
  const [lists, setLists] = useState(() => {
    const initial = {}
    for (const id of STAGE_PROP_STAGE_IDS) initial[id] = seedList(id, override)
    return initial
  })
  const listsRef = useRef(lists)
  const propPlacementsRef = useRef(override)
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('')
  const [drag, setDrag] = useState(null) // { kind, type?, id?, left, top }
  const mapRef = useRef(null)

  const list = lists[stageId] ?? []
  const questGiverRestorations = useMemo(
    () => getCanonicalQuestGiverPlacements(stageId),
    [stageId],
  )
  const bounds = useMemo(() => getStagePropEditorBounds(stageId, list), [stageId, list])
  const viewport = useMemo(() => getEditorViewport(bounds), [bounds])
  const gameBounds = getStageBounds(stageId)

  const setStageList = useCallback((nextList, nextOverride = nextList) => {
    const currentList = listsRef.current[stageId] ?? []
    const resolvedList = typeof nextList === 'function' ? nextList(currentList) : nextList
    const resolvedOverride = typeof nextOverride === 'function'
      ? nextOverride(currentList)
      : nextOverride
    const nextLists = { ...listsRef.current, [stageId]: resolvedList }
    const nextConfig = { ...propPlacementsRef.current, [stageId]: resolvedOverride }

    listsRef.current = nextLists
    propPlacementsRef.current = nextConfig
    setLists(nextLists)
    onChange?.(nextConfig)
  }, [onChange, stageId])

  const pointerToWorld = useCallback((clientX, clientY) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return null
    return screenToWorld(clientX - rect.left, clientY - rect.top, bounds, viewport)
  }, [bounds, viewport])

  const pointerInsideMap = useCallback((clientX, clientY) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return false
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }, [])

  // 드래그 진행: window pointermove/up 구독.
  useEffect(() => {
    if (!drag) return undefined
    const handleMove = (event) => {
      const rect = mapRef.current?.getBoundingClientRect()
      setDrag((current) => (current
        ? { ...current, left: event.clientX - (rect?.left ?? 0), top: event.clientY - (rect?.top ?? 0) }
        : current))
    }
    const handleUp = (event) => {
      const inside = pointerInsideMap(event.clientX, event.clientY)
      const world = inside ? pointerToWorld(event.clientX, event.clientY) : null
      if (world) {
        if (drag.kind === 'new') {
          const entry = getPaletteEntry(drag.type)
          const defaultProps = getPaletteDefaultProps(entry)
          const placement = normalizePropPlacement({
            id: makeUserId(drag.type),
            type: drag.type,
            position: [world.x, 0, world.z],
            rotation: [0, 0, 0],
            scale: entry?.defaultScale ?? 1,
            ...(defaultProps ? { props: defaultProps } : {}),
          })
          if (placement) {
            setStageList((currentList) => [...currentList, placement])
            setSelectedId(placement.id)
            setStatus(`배치: ${entry?.label ?? drag.type}`)
          }
        } else if (drag.kind === 'move') {
          setStageList((currentList) => currentList.map((item) => (
            item.id === drag.id ? { ...item, position: [world.x, 0, world.z] } : item
          )))
        }
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [drag, setStageList, pointerToWorld, pointerInsideMap])

  // 팔레트: 클릭 = 맵 중앙에 즉시 추가(선택), pointerDown = 드래그 배치 시작.
  const addAtCenter = (type) => {
    const entry = getPaletteEntry(type)
    const defaultProps = getPaletteDefaultProps(entry)
    const placement = normalizePropPlacement({
      id: makeUserId(type),
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: entry?.defaultScale ?? 1,
      ...(defaultProps ? { props: defaultProps } : {}),
    })
    if (!placement) return
    setStageList((currentList) => [...currentList, placement])
    setSelectedId(placement.id)
    setStatus(`추가: ${entry?.label ?? type}`)
  }

  const startPaletteDrag = (event, type) => {
    event.preventDefault()
    setDrag({ kind: 'new', type, left: -999, top: -999 })
  }

  const startMarkerDrag = (event, id) => {
    event.stopPropagation()
    setSelectedId(id)
    const item = (lists[stageId] ?? []).find((entry) => entry.id === id)
    if (!item) return
    const screen = worldToScreen(item.position[0], item.position[2], bounds, viewport)
    setDrag({ kind: 'move', id, left: screen.left, top: screen.top })
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setStageList((currentList) => currentList.filter((item) => item.id !== selectedId))
    setSelectedId(null)
    setStatus('삭제됨')
  }

  const rotateSelected = (deltaDeg) => {
    if (!selectedId) return
    const deltaRad = (deltaDeg * Math.PI) / 180
    setStageList((currentList) => currentList.map((item) => (
      item.id === selectedId
        ? { ...item, rotation: [0, Number((item.rotation[1] + deltaRad).toFixed(4)), 0] }
        : item
    )))
  }

  const scaleSelected = (nextScale) => {
    if (!selectedId) return
    setStageList((currentList) => currentList.map((item) => (
      item.id === selectedId ? { ...item, scale: nextScale } : item
    )))
  }

  const resetStage = () => {
    const config = { ...propPlacementsRef.current, [stageId]: null }
    const seeded = seedList(stageId, config)
    setStageList(seeded, null)
    setSelectedId(null)
    setStatus(`기본 배치 복귀 · ${stageId}`)
  }

  const reapplyStage = () => {
    onChange?.(propPlacementsRef.current)
    setStatus(`Applied · ${stageId}`)
  }

  const restoreQuestGiver = (placement) => {
    setStageList((currentList) => {
      if (currentList.some((item) => item.id === placement.id)) return currentList
      return [...currentList, placement]
    })
    setSelectedId(placement.id)
    setStatus(`퀘스트 제공자 복원: ${placement.id}`)
  }

  const selected = list.find((item) => item.id === selectedId) ?? null
  const gameBox = {
    left: worldToScreen(-gameBounds.halfX, -gameBounds.halfZ, bounds, viewport),
    right: worldToScreen(gameBounds.halfX, gameBounds.halfZ, bounds, viewport),
  }

  return (
    <div style={styles.root} data-testid="stage-prop-editor">
      {/* .studio-range CSS는 이 에디터를 감싸는 GraphicsStudio가 주입한다 */}
      <div style={styles.toolbar}>
        <label style={styles.stageSelectLabel}>
          <span>스테이지</span>
          <select
            data-testid="prop-stage-select"
            value={stageId}
            onChange={(event) => { setStageId(event.target.value); setSelectedId(null) }}
            style={styles.select}
          >
            {STAGE_PROP_STAGE_IDS.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
        <span style={styles.countBadge}>{list.length} props</span>
        <button type="button" data-testid="prop-apply" onClick={reapplyStage} style={styles.largePrimaryButton}>Apply</button>
        <button
          type="button"
          data-testid="prop-delete-toolbar"
          onClick={deleteSelected}
          disabled={!selectedId}
          style={{
            ...styles.largePrimaryButton,
            background: '#b01d1d',
            ...(selectedId ? {} : { opacity: 0.45, cursor: 'not-allowed' }),
          }}
        >
          삭제
        </button>
        <button type="button" data-testid="prop-reset" onClick={resetStage} style={styles.secondaryButton}>Reset</button>
      </div>

      <div style={styles.body}>
        <div style={styles.palette}>
          <section style={styles.questGiverSection} data-testid="quest-giver-palette">
            <h3 style={styles.paletteTitle}>퀘스트 제공자</h3>
            <p style={styles.paletteHint}>삭제된 제공자는 여기서만 정본 위치와 ID로 복원합니다.</p>
            {questGiverRestorations.map((placement) => {
              const presentation = getQuestGiverPresentation(stageId, placement.id)
              const restored = list.some((item) => item.id === placement.id)
              return (
                <button
                  key={placement.id}
                  type="button"
                  data-testid={`quest-giver-restore-${placement.id}`}
                  disabled={restored}
                  onClick={() => restoreQuestGiver(placement)}
                  style={{
                    ...styles.questGiverRestore,
                    borderColor: presentation.color,
                    color: presentation.color,
                    ...(restored ? styles.questGiverRestoreDisabled : null),
                  }}
                >
                  퀘스트 제공자 · {presentation.quest.giver.name} {restored ? '(배치됨)' : '복원'}
                </button>
              )
            })}
          </section>
          <h3 style={styles.paletteTitle}>팔레트</h3>
          <p style={styles.paletteHint}>클릭=중앙 추가 · 드래그=맵에 놓기</p>
          {STAGE_PROP_PALETTE.map((entry) => (
            <button
              key={entry.type}
              type="button"
              data-testid={`prop-palette-${entry.type}`}
              onClick={() => addAtCenter(entry.type)}
              onPointerDown={(event) => startPaletteDrag(event, entry.type)}
              style={{ ...styles.paletteButton, borderColor: TYPE_COLORS[entry.type] }}
            >
              <span style={{ ...styles.paletteGlyph, color: TYPE_COLORS[entry.type] }}>{entry.glyph}</span>
              {entry.label}
            </button>
          ))}

          {selected ? (
            <div style={styles.inspector} data-testid="prop-inspector">
              <div style={styles.inspectorTitle}>{getPaletteEntry(selected.type)?.label ?? selected.type}</div>
              <div style={styles.inspectorMeta}>
                x {selected.position[0].toFixed(1)} · z {selected.position[2].toFixed(1)}
              </div>
              <div style={styles.rotateRow}>
                <button type="button" onClick={() => rotateSelected(-15)} style={styles.miniButton}>⟲ 15°</button>
                <button type="button" onClick={() => rotateSelected(15)} style={styles.miniButton}>15° ⟳</button>
              </div>
              <label style={styles.scaleRow}>
                <span>scale {Number(selected.scale).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.01"
                  value={selected.scale}
                  onChange={(event) => scaleSelected(Number(event.target.value))}
                  className="studio-range"
                  style={styles.range}
                />
              </label>
              <button type="button" data-testid="prop-delete" onClick={deleteSelected} style={styles.deleteButton}>삭제</button>
            </div>
          ) : (
            <p style={styles.paletteHint}>마커 클릭=선택 · 더블클릭=삭제</p>
          )}
          <section style={styles.propList} aria-label="프랍 목록">
            <h3 style={styles.paletteTitle}>프랍 목록</h3>
            {list.map((item) => {
              const presentation = getQuestGiverPresentation(stageId, item.id)
              const color = presentation?.color ?? TYPE_COLORS[item.type] ?? '#ccc'
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`prop-list-${item.id}`}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...styles.propListItem,
                    borderColor: color,
                    color,
                    ...(item.id === selectedId ? styles.propListItemSelected : null),
                  }}
                >
                  {presentation ? `퀘스트 제공자 · ${presentation.quest.giver.name}` : (getPaletteEntry(item.type)?.label ?? item.type)}
                </button>
              )
            })}
          </section>
        </div>

        <div style={styles.mapWrap}>
          <div
            ref={mapRef}
            data-testid="prop-map"
            style={{ ...styles.map, width: viewport.width, height: viewport.height }}
            onPointerDown={() => setSelectedId(null)}
          >
            {/* 게임 실제 경계(벽) */}
            <div
              style={{
                ...styles.gameBoundsBox,
                left: gameBox.left.left,
                top: gameBox.left.top,
                width: Math.max(0, gameBox.right.left - gameBox.left.left),
                height: Math.max(0, gameBox.right.top - gameBox.left.top),
              }}
            />
            {/* 중앙 십자 */}
            <div style={{ ...styles.centerLineV, left: viewport.width / 2 }} />
            <div style={{ ...styles.centerLineH, top: viewport.height / 2 }} />

            {list.map((item) => {
              const screen = worldToScreen(item.position[0], item.position[2], bounds, viewport)
              const isSelected = item.id === selectedId
              const presentation = getQuestGiverPresentation(stageId, item.id)
              const markerColor = presentation?.color ?? TYPE_COLORS[item.type] ?? '#ccc'
              return (
                <div
                  key={item.id}
                  data-testid={`prop-marker-${item.id}`}
                  aria-label={presentation ? `퀘스트 제공자: ${presentation.quest.giver.name}` : (getPaletteEntry(item.type)?.label ?? item.type)}
                  onPointerDown={(event) => startMarkerDrag(event, item.id)}
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    setStageList((currentList) => currentList.filter((entry) => entry.id !== item.id))
                    if (selectedId === item.id) setSelectedId(null)
                    setStatus('삭제됨')
                  }}
                  style={{
                    ...styles.marker,
                    left: screen.left,
                    top: screen.top,
                    borderColor: markerColor,
                    background: isSelected ? markerColor : 'rgba(20,22,20,0.85)',
                    color: isSelected ? '#101010' : markerColor,
                    transform: `translate(-50%, -50%) rotate(${item.rotation[1]}rad)`,
                    boxShadow: isSelected ? '0 0 0 2px #fff' : 'none',
                  }}
                >
                  {getPaletteEntry(item.type)?.glyph ?? '?'}
                  {presentation && <span style={{ ...styles.questGiverMarkerLabel, background: markerColor }}>퀘스트 제공자</span>}
                </div>
              )
            })}

            {drag ? (
              <div
                style={{
                  ...styles.ghost,
                  left: drag.left,
                  top: drag.top,
                  borderColor: TYPE_COLORS[drag.type] ?? '#fff',
                }}
              >
                {getPaletteEntry(drag.type)?.glyph ?? '＋'}
              </div>
            ) : null}
          </div>
          <div style={styles.status} aria-live="polite" data-testid="prop-status">{status}</div>
          <p style={styles.legend}>화면 위=북(-Z) · 왼쪽=서(-X) · 점선=게임 경계(벽)</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', color: '#f2eee5', overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #333', flexWrap: 'wrap' },
  stageSelectLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 24, minHeight: 44 },
  select: { background: '#1d1f1d', color: '#f2eee5', border: '1px solid #444', borderRadius: 4, padding: '3px 8px', minHeight: 40, fontSize: 24 },
  countBadge: { fontSize: 24, color: '#9aa', marginRight: 'auto' },
  largePrimaryButton: { background: '#3f7f52', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', minHeight: 56, minWidth: 112, fontSize: 24, cursor: 'pointer', fontWeight: 800 },
  secondaryButton: { background: '#333', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' },
  body: { display: 'flex', gap: 14, padding: 12, minHeight: 0, flex: 1, overflow: 'auto' },
  palette: { width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  paletteTitle: { margin: '0 0 4px', fontSize: 26 },
  paletteHint: { margin: '4px 0', fontSize: 22, color: '#889' },
  questGiverSection: { padding: 9, border: '1px solid #48515a', borderRadius: 6, background: 'rgba(34, 38, 48, 0.72)' },
  questGiverRestore: { width: '100%', marginTop: 6, padding: '7px 8px', border: '2px solid', borderRadius: 5, background: '#171b22', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 800 },
  questGiverRestoreDisabled: { opacity: 0.55, cursor: 'default' },
  propList: { marginTop: 16, borderTop: '1px solid #3d434d', paddingTop: 12 },
  propListItem: { width: '100%', marginTop: 5, padding: '6px 8px', border: '1px solid', borderRadius: 4, background: '#15181d', textAlign: 'left', cursor: 'pointer', fontSize: 13 },
  propListItemSelected: { background: '#2a3039', boxShadow: '0 0 0 1px #fff inset' },
  paletteButton: { display: 'flex', alignItems: 'center', gap: 8, background: '#1d1f1d', color: '#eee', border: '1px solid', borderRadius: 5, padding: '10px 10px', cursor: 'grab', fontSize: 24, textAlign: 'left' },
  paletteGlyph: { fontSize: 22, width: 22, textAlign: 'center' },
  inspector: { marginTop: 10, padding: 10, background: '#191b19', border: '1px solid #3a3d3a', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 },
  inspectorTitle: { fontSize: 24, fontWeight: 600 },
  inspectorMeta: { fontSize: 22, color: '#9aa' },
  rotateRow: { display: 'flex', gap: 8 },
  miniButton: { flex: 1, background: '#2a2d2a', color: '#eee', border: '1px solid #4a4d4a', borderRadius: 4, padding: '8px 0', cursor: 'pointer', fontSize: 24, minHeight: 40 },
  scaleRow: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 24 },
  range: { width: '100%' },
  deleteButton: { background: '#7a2f2f', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 0', cursor: 'pointer', fontSize: 24, minHeight: 40 },
  mapWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  map: { position: 'relative', background: '#101410', border: '1px solid #2c2f2c', borderRadius: 4, flexShrink: 0, touchAction: 'none', overflow: 'hidden' },
  gameBoundsBox: { position: 'absolute', border: '1px dashed #55605a', pointerEvents: 'none' },
  centerLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, background: 'rgba(120,140,120,0.25)', pointerEvents: 'none' },
  centerLineH: { position: 'absolute', left: 0, right: 0, height: 1, background: 'rgba(120,140,120,0.25)', pointerEvents: 'none' },
  marker: { position: 'absolute', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid', borderRadius: 5, fontSize: 26, cursor: 'grab', userSelect: 'none' },
  questGiverMarkerLabel: { position: 'absolute', left: 30, top: -1, zIndex: 2, padding: '2px 5px', borderRadius: 3, color: '#101010', fontSize: 11, fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', transform: 'rotate(0deg)' },
  ghost: { position: 'absolute', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed', borderRadius: 5, fontSize: 26, opacity: 0.7, transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#fff' },
  status: { fontSize: 24, color: '#8fb98a', minHeight: 20 },
  legend: { fontSize: 22, color: '#778', margin: 0 },
}
