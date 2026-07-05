import { useEffect, useMemo, useRef, useState } from 'react'
import GraphicsStudioPreview from './GraphicsStudioPreview.jsx'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  GRAPHICS_STUDIO_CATEGORIES,
  STAGE_BOSS_PREVIEW_PAN_Y_RANGE,
  ensureStudioResetBaseline,
  getStudioItemById,
  loadStageBossPreview,
  loadStudioTunings,
  normalizeStudioTuning,
  saveStageBossPreview,
  saveStudioTunings,
  serializeStudioSnapshot,
} from '../lib/graphicsStudioConfig.js'
import { DEFAULT_SFX_TUNING, getSfxCatalog, loadSfxTunings, normalizeSfxTuning, playSfx, saveSfxTunings } from '../lib/sfxRegistry.js'
import {
  STUDIO_GAME_SYNC_MESSAGE,
  STUDIO_GAME_URL_STORAGE_KEY,
  getDefaultStudioGameUrl,
  parseStudioGameUrl,
} from '../lib/studioGameBridge.js'
import StageBossPreview from './StageBossPreview.jsx'

const categoryLabels = Object.fromEntries(GRAPHICS_STUDIO_CATEGORIES.map((category) => [category.id, category.label]))
const UNDO_LIMIT = 10

function SliderRow({ label, name, min, max, step, value, onChange }) {
  const valueText = Number(value).toFixed(step < 1 ? 2 : 0)
  const [draftValue, setDraftValue] = useState(valueText)
  const handleInput = (event) => onChange(Number(event.target.value))
  const commitDraft = () => {
    const next = Number(draftValue)
    if (Number.isFinite(next)) onChange(next)
    else setDraftValue(valueText)
  }
  const handleValueInput = (event) => {
    const nextText = event.target.value
    setDraftValue(nextText)
    const next = Number(nextText)
    if (Number.isFinite(next)) onChange(next)
  }

  useEffect(() => {
    setDraftValue(valueText)
  }, [valueText])

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
        onChange={handleInput}
        style={styles.range}
      />
      <input
        name={`${name}Value`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draftValue}
        onInput={handleValueInput}
        onChange={handleValueInput}
        onBlur={commitDraft}
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

function useCompactLayout() {
  const getCompact = () => typeof window !== 'undefined' && window.innerWidth < 900
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

function isSameTuning(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function GraphicsStudio() {
  const groupedCatalog = useMemo(groupCatalogByCategory, [])
  const sfxCatalog = useMemo(getSfxCatalog, [])
  const compact = useCompactLayout()
  const [activeSection, setActiveSection] = useState('graphics')
  const [selectedItemId, setSelectedItemId] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) return getStudioItemById(window.location.hash.slice(1)).id
    return 'player'
  })
  const [selectedSfxId, setSelectedSfxId] = useState(() => getSfxCatalog()[0]?.id ?? '')
  const [sfxTunings, setSfxTunings] = useState(() => loadSfxTunings())
  const [confirmedTunings, setConfirmedTunings] = useState(() => loadStudioTunings())
  const [stageBossPreview, setStageBossPreview] = useState(() => loadStageBossPreview())
  const [resetBaseline] = useState(() => ensureStudioResetBaseline(loadStudioTunings()))
  const [applyStatus, setApplyStatus] = useState('')
  const selectedItem = getStudioItemById(selectedItemId)
  const selectedStageBossType = selectedItem.previewKind === 'zombie' && selectedItem.zombieType?.startsWith('B')
    ? selectedItem.zombieType
    : 'B01'
  const [draftTuningById, setDraftTuningById] = useState(() => ({}))
  const [focusedParts, setFocusedParts] = useState([])
  const [undoStack, setUndoStack] = useState(() => [])
  const gameWindowRef = useRef(null)
  const gameOriginRef = useRef('*')
  const [gameUrl, setGameUrl] = useState(() => (
    localStorage.getItem(STUDIO_GAME_URL_STORAGE_KEY) || getDefaultStudioGameUrl()
  ))
  const activeTuningId = getPartTuningId(selectedItem.id, focusedParts)
  const itemSavedTuning = confirmedTunings[selectedItem.id] ?? DEFAULT_STUDIO_TUNING
  const itemTuning = normalizeStudioTuning(draftTuningById[selectedItem.id] ?? itemSavedTuning)
  const savedTuning = confirmedTunings[activeTuningId] ?? DEFAULT_STUDIO_TUNING
  const tuning = normalizeStudioTuning(draftTuningById[activeTuningId] ?? savedTuning)
  const selectedSfx = sfxCatalog.find((sound) => sound.id === selectedSfxId) ?? sfxCatalog[0]
  const sfxTuning = normalizeSfxTuning(sfxTunings[selectedSfx?.id] ?? DEFAULT_SFX_TUNING)
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
  const exportJson = useMemo(
    () => serializeStudioSnapshot({ selectedItemId: selectedItem.id, tunings: exportTunings, stageBossPreview }),
    [selectedItem.id, activeTuningId, tuning, confirmedTunings, stageBossPreview],
  )

  const sendGameSync = (tunings = loadStudioTunings(), nextSfxTunings = loadSfxTunings(), nextStageBossPreview = loadStageBossPreview()) => {
    const target = gameWindowRef.current
    if (!target || target.closed) return
    target.postMessage({
      type: STUDIO_GAME_SYNC_MESSAGE,
      tunings,
      sfxTunings: nextSfxTunings,
      stageBossPreview: nextStageBossPreview,
    }, gameOriginRef.current)
  }

  const connectGameWindow = () => {
    const url = parseStudioGameUrl(gameUrl)
    if (!url) {
      setApplyStatus('Invalid Game URL')
      return
    }
    localStorage.setItem(STUDIO_GAME_URL_STORAGE_KEY, url.href)
    gameOriginRef.current = url.origin
    gameWindowRef.current = window.open(url.href, 'escape-zombie-school-game')
    setApplyStatus(`Connected: ${url.origin}`)
    window.setTimeout(() => sendGameSync(), 500)
  }

  const confirmGraphicsTuning = (id, nextTuning) => {
    const next = saveStudioTunings({
      ...loadStudioTunings(),
      [id]: nextTuning,
    })
    setConfirmedTunings(next)
    sendGameSync(next)
    return next
  }

  const updateTuning = (patch) => {
    setDraftTuningById((current) => {
      const currentTuning = normalizeStudioTuning(current[activeTuningId] ?? confirmedTunings[activeTuningId] ?? DEFAULT_STUDIO_TUNING)
      const nextTuning = normalizeStudioTuning({
        ...currentTuning,
        ...patch,
      })
      if (!isSameTuning(currentTuning, nextTuning)) {
        setUndoStack((stack) => [...stack, { id: activeTuningId, tuning: currentTuning }].slice(-UNDO_LIMIT))
      }
      confirmGraphicsTuning(activeTuningId, nextTuning)
      setApplyStatus('Live')
      return {
        ...current,
        [activeTuningId]: nextTuning,
      }
    })
  }

  const updateStageBossPreview = (patch) => {
    const next = saveStageBossPreview({ ...loadStageBossPreview(), ...patch })
    setStageBossPreview(next)
    sendGameSync(loadStudioTunings(), loadSfxTunings(), next)
    setApplyStatus('Boss preview live')
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      setUndoStack((stack) => {
        const entry = stack[stack.length - 1]
        if (!entry) return stack
        confirmGraphicsTuning(entry.id, entry.tuning)
        setDraftTuningById((current) => ({
          ...current,
          [entry.id]: entry.tuning,
        }))
        setApplyStatus('Live')
        return stack.slice(0, -1)
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const applyCurrent = () => {
    const next = confirmGraphicsTuning(activeTuningId, tuning)
    setConfirmedTunings(next)
    setApplyStatus('Game applied')
  }

  const resetCurrent = () => {
    const baselineTuning = resetBaseline[activeTuningId] ?? DEFAULT_STUDIO_TUNING
    confirmGraphicsTuning(activeTuningId, baselineTuning)
    setDraftTuningById((current) => ({
      ...current,
      [activeTuningId]: baselineTuning,
    }))
    setApplyStatus('Live')
  }

  const copyExport = async () => {
    await navigator.clipboard?.writeText(exportJson)
  }

  const updateFocusedParts = (part) => {
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
    setSfxTunings((current) => {
      const next = saveSfxTunings({
        ...current,
        [selectedSfx.id]: normalizeSfxTuning({
          ...sfxTuning,
          ...patch,
        }),
      })
      sendGameSync(loadStudioTunings(), next)
      return next
    })
    setApplyStatus('Audio live')
  }

  const applySfxCurrent = () => {
    if (!selectedSfx) return
    const next = saveSfxTunings({
      ...loadSfxTunings(),
      [selectedSfx.id]: sfxTuning,
    })
    sendGameSync(loadStudioTunings(), next)
    setSfxTunings(next)
    setApplyStatus('Audio applied')
  }

  return (
    <main style={styles.page}>
      <section style={{ ...styles.shell, ...(compact ? styles.shellCompact : null) }} aria-label="Graphics Studio">
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Graphics Studio</h1>
            <p style={styles.subtitle}>
              {activeSection === 'graphics'
                ? `${categoryLabels[selectedItem.category]} / ${selectedItem.label}`
                : `Audio / ${selectedSfx?.id ?? ''}`}
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
          </div>
          <label style={styles.gameBridge}>
            <span style={styles.gameBridgeLabel}>Game URL</span>
            <input
              name="gameUrl"
              type="url"
              value={gameUrl}
              onInput={(event) => setGameUrl(event.target.value)}
              onChange={(event) => setGameUrl(event.target.value)}
              style={styles.gameBridgeInput}
            />
            <button type="button" onClick={connectGameWindow} style={styles.gameBridgeButton}>Connect</button>
          </label>
          <div style={styles.statusLine}>
            <span style={styles.sourceLabel}>{activeSection === 'graphics' ? selectedItem.source : selectedSfx?.src}</span>
          </div>
        </header>

        <aside style={{ ...styles.sidebar, ...(compact ? styles.sidebarCompact : null) }}>
          {activeSection === 'graphics' ? groupedCatalog.map((category) => (
            <section key={category.id} style={styles.catalogGroup}>
              <h2 style={styles.catalogTitle}>{category.label}</h2>
              <div style={styles.itemList}>
                {category.items.map((item) => {
                  const selected = item.id === selectedItem.id
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
                        ...(selected ? styles.itemButtonSelected : null),
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )) : (
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
          {activeSection === 'graphics' ? (
            <GraphicsStudioPreview
              selectedItem={selectedItem}
              tuning={itemTuning}
              focusedPartKeys={focusedParts.map((part) => part.key)}
              focusedPartTuning={focusedParts.length ? tuning : null}
              partTunings={livePreviewTunings}
              onPartFocus={updateFocusedParts}
            />
          ) : (
            <div style={styles.audioPreview} data-testid="audio-preview">
              <strong style={styles.audioTitle}>{selectedSfx?.id}</strong>
              <span style={styles.audioPath}>{selectedSfx?.src}</span>
              <button type="button" onClick={() => selectedSfx && playSfx(selectedSfx.id, 1)} style={styles.primaryButton}>
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
            <section style={styles.stageBossPreviewSection}>
              <div style={styles.stageBossPreviewHeader}>
                <span style={styles.stageBossPreviewTitle}>Stage Boss Preview</span>
                <span style={styles.stageBossPreviewHint}>wheel zoom / drag pan</span>
              </div>
              <StageBossPreview
                framing={stageBossPreview}
                bossType={selectedStageBossType}
                interactive
                onChange={updateStageBossPreview}
                testId="studio-stage-boss-preview"
              />
            </section>
            <SliderRow label="Preview Zoom" name="stageBossPreviewZoom" min="50" max="180" step="1" value={stageBossPreview.zoom} onChange={(zoom) => updateStageBossPreview({ zoom })} />
            <SliderRow label="Preview Pan X" name="stageBossPreviewPanX" min="-2" max="2" step="0.01" value={stageBossPreview.panX} onChange={(panX) => updateStageBossPreview({ panX })} />
            <SliderRow label="Preview Pan Y" name="stageBossPreviewPanY" min={STAGE_BOSS_PREVIEW_PAN_Y_RANGE[0]} max={STAGE_BOSS_PREVIEW_PAN_Y_RANGE[1]} step="0.01" value={stageBossPreview.panY} onChange={(panY) => updateStageBossPreview({ panY })} />
            <SliderRow label="Scale" name="scale" min="0.35" max="2.5" step="0.01" value={tuning.scale} onChange={(scale) => updateTuning({ scale })} />
            <SliderRow label="Width X" name="scaleX" min="0.35" max="2.5" step="0.01" value={tuning.scaleX} onChange={(scaleX) => updateTuning({ scaleX })} />
            <SliderRow label="Height Y" name="scaleY" min="0.35" max="2.5" step="0.01" value={tuning.scaleY} onChange={(scaleY) => updateTuning({ scaleY })} />
            <SliderRow label="Depth Z" name="scaleZ" min="0.35" max="2.5" step="0.01" value={tuning.scaleZ} onChange={(scaleZ) => updateTuning({ scaleZ })} />
            <SliderRow label="Position X" name="positionX" min="-3" max="3" step="0.01" value={tuning.positionX} onChange={(positionX) => updateTuning({ positionX })} />
            <SliderRow label="Position Y" name="positionY" min="-3" max="3" step="0.01" value={tuning.positionY} onChange={(positionY) => updateTuning({ positionY })} />
            <SliderRow label="Position Z" name="positionZ" min="-3" max="3" step="0.01" value={tuning.positionZ} onChange={(positionZ) => updateTuning({ positionZ })} />
            <SliderRow label="Outline" name="outlineThickness" min="0.4" max="2.2" step="0.01" value={tuning.outlineThickness} onChange={(outlineThickness) => updateTuning({ outlineThickness })} />
            <SliderRow label="Opacity" name="outlineOpacity" min="0" max="1" step="0.01" value={tuning.outlineOpacity} onChange={(outlineOpacity) => updateTuning({ outlineOpacity })} />
            <ColorRow label="Outline Color" name="outlineColor" value={tuning.outlineColor} onChange={(outlineColor) => updateTuning({ outlineColor })} />
            <ColorRow label="Color" name="color" value={tuning.color} onChange={(color) => updateTuning({ color })} />
            <SliderRow label="Color Mix" name="colorStrength" min="0" max="1" step="0.01" value={tuning.colorStrength} onChange={(colorStrength) => updateTuning({ colorStrength })} />
            <SliderRow label="Saturation" name="saturation" min="0.1" max="1.8" step="0.01" value={tuning.saturation} onChange={(saturation) => updateTuning({ saturation })} />
            <SliderRow label="Brightness" name="brightness" min="0.35" max="1.8" step="0.01" value={tuning.brightness} onChange={(brightness) => updateTuning({ brightness })} />
            <SliderRow label="Emissive" name="emissiveIntensity" min="0" max="1.2" step="0.01" value={tuning.emissiveIntensity} onChange={(emissiveIntensity) => updateTuning({ emissiveIntensity })} />
            <SliderRow label="Rotate X" name="rotationX" min="-180" max="180" step="1" value={tuning.rotationX} onChange={(rotationX) => updateTuning({ rotationX })} />
            <SliderRow label="Rotate Y" name="rotationY" min="-180" max="180" step="1" value={tuning.rotationY} onChange={(rotationY) => updateTuning({ rotationY })} />
            <SliderRow label="Rotate Z" name="rotationZ" min="-180" max="180" step="1" value={tuning.rotationZ} onChange={(rotationZ) => updateTuning({ rotationZ })} />
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
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={applyCurrent} style={styles.primaryButton}>Apply</button>
            <button type="button" onClick={resetCurrent} style={styles.secondaryButton}>Reset</button>
            <button type="button" onClick={copyExport} style={styles.secondaryButton}>Copy JSON</button>
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
                <button type="button" onClick={() => selectedSfx && playSfx(selectedSfx.id, 1)} style={styles.exitPartButton}>
                  Play
                </button>
              </div>
              <div style={styles.controls}>
                <SliderRow label="Volume" name="sfxVolume" min="0" max="2" step="0.01" value={sfxTuning.volume} onChange={(volume) => updateSfxTuning({ volume })} />
                <SliderRow label="Pitch" name="sfxRate" min="0.5" max="2" step="0.01" value={sfxTuning.rate} onChange={(rate) => updateSfxTuning({ rate })} />
              </div>
              <div style={styles.actions}>
                <button type="button" onClick={applySfxCurrent} style={styles.primaryButton}>Apply</button>
                <button type="button" onClick={() => updateSfxTuning(DEFAULT_SFX_TUNING)} style={styles.secondaryButton}>Reset</button>
                <button type="button" onClick={() => selectedSfx && playSfx(selectedSfx.id, 1)} style={styles.secondaryButton}>Play</button>
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
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    width: 'min(1280px, 100vw)',
    height: 'min(720px, 100vh)',
    display: 'grid',
    gridTemplateColumns: '250px minmax(0, 1fr) 340px',
    gridTemplateRows: '58px minmax(0, 1fr) 160px',
    background: '#171817',
    border: '1px solid #353833',
    overflow: 'hidden',
  },
  shellCompact: {
    height: '100vh',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: '58px 170px minmax(280px, 1fr) 430px 170px',
    overflow: 'auto',
  },
  header: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    borderBottom: '1px solid #353833',
    background: '#20231f',
  },
  title: {
    margin: 0,
    fontSize: 18,
    lineHeight: '22px',
    letterSpacing: 0,
    fontWeight: 800,
  },
  subtitle: {
    margin: '3px 0 0',
    fontSize: 12,
    color: '#bfc8b8',
  },
  tabs: {
    display: 'flex',
    gap: 6,
  },
  tabButton: {
    minWidth: 78,
    height: 32,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#151614',
    color: '#d8dccf',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
  },
  tabButtonActive: {
    border: '1px solid #d3a53f',
    background: '#2a2619',
    color: '#fff6cf',
  },
  statusLine: {
    minWidth: 0,
    maxWidth: 520,
    color: '#d3a53f',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sourceLabel: {
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
    fontSize: 11,
  },
  gameBridgeInput: {
    minWidth: 0,
    height: 28,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#111210',
    color: '#f2eee5',
    padding: '0 8px',
    fontSize: 11,
  },
  gameBridgeButton: {
    height: 28,
    border: '1px solid #d3a53f',
    borderRadius: 6,
    background: '#2a2619',
    color: '#fff6cf',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 800,
  },
  sidebar: {
    gridRow: '2 / 4',
    overflow: 'auto',
    borderRight: '1px solid #353833',
    background: '#151614',
    padding: 12,
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
    fontSize: 11,
    lineHeight: '14px',
    color: '#8ebc9d',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  itemList: {
    display: 'grid',
    gap: 5,
  },
  itemButton: {
    minHeight: 30,
    border: '1px solid #2b2e2a',
    background: '#1e201d',
    color: '#e6e1d8',
    borderRadius: 6,
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: 12,
    cursor: 'pointer',
  },
  itemButtonSelected: {
    border: '1px solid #d3a53f',
    background: '#2a2619',
    color: '#fff6cf',
  },
  previewPanel: {
    minWidth: 0,
    minHeight: 0,
    borderRight: '1px solid #353833',
    background: '#171817',
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
    fontSize: 24,
  },
  audioPath: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#8ebc9d',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
  },
  inspector: {
    gridColumn: 3,
    gridRow: '2 / 4',
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: '52px minmax(0, 1fr) 50px 26px',
    background: '#1b1d1a',
  },
  inspectorCompact: {
    gridColumn: 1,
    gridRow: 4,
    borderBottom: '1px solid #353833',
  },
  panelTitle: {
    margin: 0,
    fontSize: 13,
    lineHeight: '18px',
    color: '#f4eadb',
    fontWeight: 800,
  },
  inspectorTitleRow: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '0 14px',
  },
  inspectorTitleText: {
    minWidth: 0,
    display: 'grid',
    gap: 2,
  },
  partFocusLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#f0c765',
    fontSize: 11,
  },
  exitPartButton: {
    minWidth: 78,
    height: 28,
    border: '1px solid #3f443c',
    borderRadius: 6,
    background: '#20231f',
    color: '#f2eee5',
    cursor: 'pointer',
    fontSize: 12,
  },
  controls: {
    overflow: 'auto',
    padding: '0 14px 10px',
    display: 'grid',
    gap: 9,
  },
  stageBossPreviewSection: {
    display: 'grid',
    gap: 7,
    paddingBottom: 6,
    borderBottom: '1px solid #353833',
  },
  stageBossPreviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stageBossPreviewTitle: {
    color: '#f4eadb',
    fontSize: 12,
    fontWeight: 800,
  },
  stageBossPreviewHint: {
    color: '#8ebc9d',
    fontSize: 10,
  },
  controlRow: {
    display: 'grid',
    gridTemplateColumns: '92px minmax(0, 1fr) 44px',
    alignItems: 'center',
    gap: 9,
    minHeight: 28,
    fontSize: 12,
  },
  controlLabel: {
    color: '#cfd5ca',
    fontSize: 12,
  },
  controlValue: {
    color: '#f0c765',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    fontSize: 12,
  },
  controlValueInput: {
    width: 44,
    minWidth: 0,
    border: '1px solid transparent',
    borderRadius: 4,
    background: 'transparent',
    color: '#f0c765',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    fontSize: 12,
    padding: '2px 0',
  },
  range: {
    width: '100%',
    accentColor: '#e35d3d',
  },
  colorRow: {
    display: 'grid',
    gridTemplateColumns: '92px 42px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 9,
    minHeight: 30,
  },
  colorInput: {
    width: 38,
    height: 26,
    border: '1px solid #353833',
    background: '#111210',
    padding: 0,
  },
  hexValue: {
    fontSize: 12,
    color: '#f0c765',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  selectRow: {
    display: 'grid',
    gridTemplateColumns: '92px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 9,
    minHeight: 30,
  },
  select: {
    height: 28,
    border: '1px solid #353833',
    borderRadius: 6,
    background: '#111210',
    color: '#f2eee5',
    padding: '0 8px',
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))',
    gap: 8,
    padding: '8px 14px',
    borderTop: '1px solid #353833',
  },
  applyStatus: {
    minHeight: 18,
    padding: '0 14px 8px',
    color: '#8ebc9d',
    fontSize: 12,
  },
  primaryButton: {
    border: 0,
    borderRadius: 6,
    background: '#e35d3d',
    color: '#fff8ec',
    fontWeight: 800,
    cursor: 'pointer',
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
    gridTemplateRows: '34px minmax(0, 1fr)',
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
    padding: '0 12px',
  },
  exportMeta: {
    color: '#8ebc9d',
    fontSize: 12,
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
    fontSize: 11,
    lineHeight: '15px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
}
