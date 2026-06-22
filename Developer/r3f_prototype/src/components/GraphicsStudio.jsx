import { useEffect, useMemo, useState } from 'react'
import GraphicsStudioPreview from './GraphicsStudioPreview.jsx'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  GRAPHICS_STUDIO_CATEGORIES,
  getStudioItemById,
  loadStudioTunings,
  normalizeStudioTuning,
  saveStudioTunings,
  serializeStudioSnapshot,
} from '../lib/graphicsStudioConfig.js'

const categoryLabels = Object.fromEntries(GRAPHICS_STUDIO_CATEGORIES.map((category) => [category.id, category.label]))

function SliderRow({ label, name, min, max, step, value, onChange }) {
  const valueText = Number(value).toFixed(step < 1 ? 2 : 0)
  const handleInput = (event) => onChange(Number(event.target.value))
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
      <span style={styles.controlValue}>{valueText}</span>
    </label>
  )
}

function ColorRow({ label, name, value, onChange }) {
  return (
    <label style={styles.colorRow}>
      <span style={styles.controlLabel}>{label}</span>
      <input
        name={name}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

export default function GraphicsStudio() {
  const groupedCatalog = useMemo(groupCatalogByCategory, [])
  const compact = useCompactLayout()
  const [selectedItemId, setSelectedItemId] = useState('player')
  const [confirmedTunings, setConfirmedTunings] = useState(() => loadStudioTunings())
  const selectedItem = getStudioItemById(selectedItemId)
  const [draftTuningById, setDraftTuningById] = useState(() => ({}))
  const savedTuning = confirmedTunings[selectedItem.id] ?? DEFAULT_STUDIO_TUNING
  const tuning = normalizeStudioTuning(draftTuningById[selectedItem.id] ?? savedTuning)
  const exportTunings = {
    ...confirmedTunings,
    [selectedItem.id]: tuning,
  }
  const exportJson = useMemo(
    () => serializeStudioSnapshot({ selectedItemId: selectedItem.id, tunings: exportTunings }),
    [selectedItem.id, tuning, confirmedTunings],
  )

  const updateTuning = (patch) => {
    setDraftTuningById((current) => ({
      ...current,
      [selectedItem.id]: normalizeStudioTuning({
        ...tuning,
        ...patch,
      }),
    }))
  }

  const confirmCurrent = () => {
    const next = saveStudioTunings({
      ...confirmedTunings,
      [selectedItem.id]: tuning,
    })
    setConfirmedTunings(next)
  }

  const resetCurrent = () => {
    setDraftTuningById((current) => ({
      ...current,
      [selectedItem.id]: DEFAULT_STUDIO_TUNING,
    }))
  }

  const copyExport = async () => {
    await navigator.clipboard?.writeText(exportJson)
  }

  return (
    <main style={styles.page}>
      <section style={{ ...styles.shell, ...(compact ? styles.shellCompact : null) }} aria-label="Graphics Studio">
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Graphics Studio</h1>
            <p style={styles.subtitle}>{categoryLabels[selectedItem.category]} / {selectedItem.label}</p>
          </div>
          <div style={styles.statusLine}>
            <span style={styles.sourceLabel}>{selectedItem.source}</span>
          </div>
        </header>

        <aside style={{ ...styles.sidebar, ...(compact ? styles.sidebarCompact : null) }}>
          {groupedCatalog.map((category) => (
            <section key={category.id} style={styles.catalogGroup}>
              <h2 style={styles.catalogTitle}>{category.label}</h2>
              <div style={styles.itemList}>
                {category.items.map((item) => {
                  const selected = item.id === selectedItem.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
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
          ))}
        </aside>

        <section style={{ ...styles.previewPanel, ...(compact ? styles.previewPanelCompact : null) }}>
          <GraphicsStudioPreview selectedItem={selectedItem} tuning={tuning} />
        </section>

        <aside style={{ ...styles.inspector, ...(compact ? styles.inspectorCompact : null) }}>
          <h2 style={styles.panelTitle}>Inspector</h2>
          <div style={styles.controls}>
            <SliderRow label="Scale" name="scale" min="0.35" max="2.5" step="0.01" value={tuning.scale} onChange={(scale) => updateTuning({ scale })} />
            <SliderRow label="Outline" name="outlineThickness" min="0.4" max="2.2" step="0.01" value={tuning.outlineThickness} onChange={(outlineThickness) => updateTuning({ outlineThickness })} />
            <SliderRow label="Opacity" name="outlineOpacity" min="0" max="1" step="0.01" value={tuning.outlineOpacity} onChange={(outlineOpacity) => updateTuning({ outlineOpacity })} />
            <ColorRow label="Outline Color" name="outlineColor" value={tuning.outlineColor} onChange={(outlineColor) => updateTuning({ outlineColor })} />
            <ColorRow label="Color" name="color" value={tuning.color} onChange={(color) => updateTuning({ color })} />
            <SliderRow label="Color Mix" name="colorStrength" min="0" max="1" step="0.01" value={tuning.colorStrength} onChange={(colorStrength) => updateTuning({ colorStrength })} />
            <SliderRow label="Saturation" name="saturation" min="0.1" max="1.8" step="0.01" value={tuning.saturation} onChange={(saturation) => updateTuning({ saturation })} />
            <SliderRow label="Brightness" name="brightness" min="0.35" max="1.8" step="0.01" value={tuning.brightness} onChange={(brightness) => updateTuning({ brightness })} />
            <SliderRow label="Emissive" name="emissiveIntensity" min="0" max="1.2" step="0.01" value={tuning.emissiveIntensity} onChange={(emissiveIntensity) => updateTuning({ emissiveIntensity })} />
            <SliderRow label="Rotate Y" name="rotationY" min="-180" max="180" step="1" value={tuning.rotationY} onChange={(rotationY) => updateTuning({ rotationY })} />
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
              </select>
            </label>
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={confirmCurrent} style={styles.primaryButton}>Confirm</button>
            <button type="button" onClick={resetCurrent} style={styles.secondaryButton}>Reset</button>
            <button type="button" onClick={copyExport} style={styles.secondaryButton}>Copy JSON</button>
          </div>
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
    borderColor: '#d3a53f',
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
  inspector: {
    gridColumn: 3,
    gridRow: '2 / 4',
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: '38px minmax(0, 1fr) 50px',
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
  controls: {
    overflow: 'auto',
    padding: '0 14px 10px',
    display: 'grid',
    gap: 9,
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
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    padding: '8px 14px',
    borderTop: '1px solid #353833',
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
