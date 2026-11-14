// Rosari room wardrobe body + the outfit feature table ("의상 능력표").
// Everything shown here comes from outfitCatalog.js through outfitDisplay.js: names, unlock
// conditions and ability lines are never typed twice. Ownership comes from outfitUnlocks.js.
import { useEffect, useRef, useState } from 'react'
import { listOutfits } from '../lib/outfitCatalog.js'
import { getOwnedOutfitIds } from '../lib/outfitUnlocks.js'
import { getFirebaseProgressRuntimeSnapshot, isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { outfitAbilityLines, outfitEffectSummary, outfitName, outfitUnlockText } from '../lib/outfitDisplay.js'
import { useT } from '../lib/i18n.js'

const PRO_COLOR = '#16703a'
const CON_COLOR = '#b3261e'

function isGuest() {
  return !isFirebaseProgressHydrated() && !getFirebaseProgressRuntimeSnapshot().uid
}

function LockIcon({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0, verticalAlign: '-2px' }}>
      <rect x="2.5" y="7" width="11" height="8" rx="2" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function OutfitTableIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="14" height="14" rx="2.5" fill="#fff7fb" stroke="currentColor" strokeWidth="2" />
      <path d="M2 7h14M2 11.5h14M7 2v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

// Keeps the number glued to the word before it ("taken -8%", "Stage 1"), so a narrow column never drops
// the value alone onto its own line. Text content is unchanged; only the wrap points move.
function AbilityText({ text }) {
  const lastSpace = text.lastIndexOf(' ')
  // Only a trailing number/value is glued; plain words ("처음부터 있어요") wrap normally.
  if (lastSpace <= 0 || !/\d/.test(text.slice(lastSpace + 1))) return text
  const glueFrom = text.lastIndexOf(' ', lastSpace - 1) + 1
  return <>{text.slice(0, glueFrom)}<span style={styles.nowrap}>{text.slice(glueFrom)}</span></>
}

export function OutfitAbilityList({ outfitId, compact = false }) {
  const t = useT()
  const lines = outfitAbilityLines(outfitId)
  const fontSize = compact ? 12 : 13
  if (lines.length === 0) {
    return <p data-outfit-ability="none" style={{ ...styles.abilityLine, fontSize, color: '#6d4f66' }}>{t('outfit.ability.none')}</p>
  }
  return (
    <ul style={styles.abilityList}>
      {lines.map((line) => (
        <li
          key={line.stat}
          data-outfit-ability={line.positive ? 'pro' : 'con'}
          style={{ ...styles.abilityLine, fontSize, color: line.positive ? PRO_COLOR : CON_COLOR }}
        >
          <span style={{ ...styles.abilityTag, borderColor: line.positive ? PRO_COLOR : CON_COLOR }}>{t(line.positive ? 'outfit.pro' : 'outfit.con')}</span>
          <AbilityText text={line.text} />
        </li>
      ))}
    </ul>
  )
}

export default function RosariWardrobeBody({ currentOutfitId, onSelect, saveFailed }) {
  const t = useT()
  const owned = getOwnedOutfitIds()
  const outfits = listOutfits()
  const [previewId, setPreviewId] = useState(null)
  const focusedId = previewId ?? currentOutfitId
  const focusedOwned = owned.has(focusedId)

  return (
    <>
      <div data-outfit-wearing style={styles.currentOutfit}>
        {t('outfit.wearing', { name: outfitName(currentOutfitId) })}
        <span style={styles.currentEffect}>{outfitEffectSummary(currentOutfitId)}</span>
      </div>
      <div role="group" aria-label={t('outfit.wardrobe.listAria')} style={styles.outfitList}>
        {outfits.map((outfit) => {
          const isOwned = owned.has(outfit.id)
          const active = outfit.id === currentOutfitId
          if (!isOwned) {
            return (
              <button
                key={outfit.id}
                type="button"
                data-outfit-id={outfit.id}
                data-outfit-locked="true"
                data-ui-sfx="denied"
                aria-disabled="true"
                aria-label={t('outfit.lockedAria', { name: outfitName(outfit.id), condition: outfitUnlockText(outfit.id) })}
                style={previewId === outfit.id ? styles.outfitButtonLockedFocused : styles.outfitButtonLocked}
                onClick={() => setPreviewId(outfit.id)}
              >
                <span style={styles.lockedName}><LockIcon />{outfitName(outfit.id)}</span>
                <span style={styles.lockedCondition}>{outfitUnlockText(outfit.id)}</span>
              </button>
            )
          }
          return (
            <button
              key={outfit.id}
              type="button"
              data-outfit-id={outfit.id}
              aria-pressed={active}
              style={active ? styles.outfitButtonActive : styles.outfitButton}
              onClick={() => { setPreviewId(null); onSelect(outfit.id) }}
            >
              {outfitName(outfit.id)}
            </button>
          )
        })}
      </div>
      <div data-outfit-detail={focusedId} aria-live="polite" style={styles.detail}>
        <div style={styles.detailHeader}>
          <strong>{outfitName(focusedId)}</strong>
          <span style={focusedOwned ? styles.badgeOwned : styles.badgeLocked}>
            {!focusedOwned && <LockIcon size={11} />}{t(focusedOwned ? 'outfit.owned' : 'outfit.lockedBadge')}
          </span>
        </div>
        {!focusedOwned && <p style={styles.detailLocked}>{t('outfit.locked')} · {outfitUnlockText(focusedId)}</p>}
        <OutfitAbilityList outfitId={focusedId} />
      </div>
      {isGuest() && <p style={styles.note}>{t('outfit.guestSaveHint')}</p>}
      {saveFailed && <p role="alert" style={{ ...styles.note, color: CON_COLOR }}>{t('outfit.saveFailed')}</p>}
    </>
  )
}

// Wardrobe view mode angle bar: 앞 / 3/4 / 옆 / 뒤 presets plus the drag/arrow-key hint.
export const WARDROBE_VIEW_ANGLE_NAMES = ['front', 'threeQuarter', 'side', 'back']
export function WardrobeAngleControls({ active, onChoose, style }) {
  const t = useT()
  return (
    <div data-wardrobe-angle-bar style={{ ...styles.angleBar, ...style }}>
      <div role="group" aria-label={t('outfit.wardrobe.angleAria')} style={styles.angleButtons}>
        {WARDROBE_VIEW_ANGLE_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            data-view-angle={name}
            aria-pressed={active === name}
            style={active === name ? styles.angleButtonActive : styles.angleButton}
            onClick={() => onChoose(name)}
          >
            {t(`outfit.wardrobe.angle.${name}`)}
          </button>
        ))}
      </div>
      <p style={styles.angleHint}>{t('outfit.wardrobe.rotateHint')}</p>
    </div>
  )
}

// The feature-table device: an always-visible button in the wardrobe header.
export function OutfitTableButton({ buttonRef, onOpen }) {
  const t = useT()
  return (
    <button ref={buttonRef} type="button" data-outfit-table-open data-ui-sfx="open" style={styles.tableButton} onClick={onOpen}>
      <OutfitTableIcon />{t('outfit.table.open')}
    </button>
  )
}

// The feature table: every wardrobe outfit, its condition, owned/locked, upside, downside.
export function OutfitFeatureTable({ onClose }) {
  const t = useT()
  const owned = getOwnedOutfitIds()
  const outfits = listOutfits()
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus() }, [])
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="outfit-feature-table-title"
      data-outfit-feature-table
      style={styles.tableOverlay}
      onKeyDown={(event) => { if (event.key !== 'Escape') event.stopPropagation() }}
    >
      <div style={styles.tablePanel}>
        <div style={styles.tableHeader}>
          <h2 id="outfit-feature-table-title" style={styles.tableTitle}>{t('outfit.table.title')}</h2>
          <button ref={closeRef} type="button" aria-label={t('outfit.table.closeAria')} style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={{ ...styles.th, width: '26%' }}>{t('outfit.table.colOutfit')}</th>
                <th scope="col" style={{ ...styles.th, width: '25%' }}>{t('outfit.table.colUnlock')}</th>
                <th scope="col" style={styles.th}>{t('outfit.table.colEffect')}</th>
              </tr>
            </thead>
            <tbody>
              {outfits.map((outfit) => {
                const isOwned = owned.has(outfit.id)
                return (
                  <tr key={outfit.id} data-outfit-row={outfit.id} data-outfit-owned={isOwned ? 'true' : 'false'}>
                    <th scope="row" style={styles.tdName}>
                      <span style={{ display: 'block' }}>{outfitName(outfit.id)}</span>
                      <span style={isOwned ? styles.badgeOwned : styles.badgeLocked}>
                        {!isOwned && <LockIcon size={11} />}{t(isOwned ? 'outfit.owned' : 'outfit.lockedBadge')}
                      </span>
                    </th>
                    <td style={styles.td}><AbilityText text={outfitUnlockText(outfit.id)} /></td>
                    <td style={styles.td}><OutfitAbilityList outfitId={outfit.id} compact /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

const buttonBase = { minHeight: 44, padding: '6px 8px', borderRadius: 12, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', boxSizing: 'border-box' }
const badgeBase = { display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2, padding: '1px 6px', borderRadius: 999, fontSize: 11, fontWeight: 900, lineHeight: 1.4, whiteSpace: 'nowrap' }

const styles = {
  nowrap: { whiteSpace: 'nowrap' },
  angleBar: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, pointerEvents: 'none' },
  angleButtons: { display: 'flex', flexWrap: 'wrap', gap: 4, pointerEvents: 'auto' },
  angleButton: { ...buttonBase, minWidth: 48, padding: '6px 10px', border: '2px solid #7c416e', background: 'rgba(255,247,251,0.94)', color: '#5f2d58', fontSize: 15, fontWeight: 900 },
  angleButtonActive: { ...buttonBase, minWidth: 48, padding: '6px 10px', border: '3px solid #7c416e', background: '#ffacd0', color: '#4e2449', fontSize: 15, fontWeight: 1000 },
  angleHint: { margin: 0, padding: '1px 8px', borderRadius: 999, background: 'rgba(255,247,230,0.88)', color: '#5f2d58', fontSize: 12, fontWeight: 800, lineHeight: 1.4 },
  currentOutfit: { padding: 8, border: '2px solid #8a4a73', borderRadius: 12, background: '#fff3fa', fontWeight: 1000, lineHeight: 1.3 },
  currentEffect: { display: 'block', marginTop: 2, fontSize: 12, fontWeight: 800, color: '#6d4f66' },
  outfitList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6, marginTop: 8 },
  outfitButton: { ...buttonBase, border: '2px solid #b991ab', background: '#fff7fb', color: '#5f2d58', fontWeight: 900 },
  outfitButtonActive: { ...buttonBase, border: '3px solid #7c416e', background: '#ffacd0', color: '#4e2449', fontWeight: 1000 },
  outfitButtonLocked: { ...buttonBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, border: '2px dashed #a99aa4', background: '#ece6ea', color: '#5e5560', fontWeight: 900, cursor: 'help' },
  outfitButtonLockedFocused: { ...buttonBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, border: '2px solid #6f6570', background: '#e2dae0', color: '#4a424c', fontWeight: 900, cursor: 'help' },
  lockedName: { display: 'inline-flex', alignItems: 'center', gap: 4 },
  lockedCondition: { fontSize: 11, fontWeight: 800, lineHeight: 1.2 },
  detail: { marginTop: 8, padding: 8, border: '2px solid #d6b3c8', borderRadius: 12, background: '#fffaf0' },
  detailHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' },
  detailLocked: { margin: '4px 0 0', fontSize: 12, fontWeight: 800, color: '#5e5560' },
  abilityList: { margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 2 },
  abilityLine: { margin: 0, fontWeight: 900, lineHeight: 1.35 },
  abilityTag: { display: 'inline-block', marginRight: 4, padding: '0 4px', border: '1.5px solid', borderRadius: 6, fontSize: 10, lineHeight: 1.4, verticalAlign: '1px' },
  badgeOwned: { ...badgeBase, background: '#d9f2df', color: '#14572d' },
  badgeLocked: { ...badgeBase, background: '#e5e0e3', color: '#4f4751' },
  tableButton: { ...buttonBase, minWidth: 44, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 10px', border: '3px solid #7c416e', borderRadius: 999, background: '#fff3cd', color: '#4e2449', fontSize: 14, fontWeight: 1000, whiteSpace: 'nowrap' },
  note: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.4, fontWeight: 800 },
  tableOverlay: { position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 'max(8px, env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px))', boxSizing: 'border-box', background: 'rgba(78,36,73,0.45)', touchAction: 'pan-y', userSelect: 'none' },
  tablePanel: { width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 8, boxSizing: 'border-box', border: '3px solid #8a4a73', borderRadius: 18, background: '#fff7e6', color: '#5f2d58', boxShadow: '0 10px 0 rgba(85,45,75,0.22)' },
  tableHeader: { display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  tableTitle: { margin: 0, fontSize: 20, lineHeight: 1.1, fontWeight: 1000 },
  closeButton: { minWidth: 44, minHeight: 44, flexShrink: 0, border: '3px solid #7c416e', borderRadius: 999, background: '#fff3cd', color: '#4e2449', fontSize: 24, fontWeight: 1000, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' },
  tableScroll: { minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12, overflowWrap: 'anywhere', wordBreak: 'keep-all' },
  th: { position: 'sticky', top: 0, padding: '4px', background: '#f6dbe8', textAlign: 'left', fontSize: 12, fontWeight: 1000, borderBottom: '2px solid #8a4a73' },
  tdName: { padding: '6px 4px', textAlign: 'left', verticalAlign: 'top', fontSize: 13, fontWeight: 1000, borderBottom: '1px solid #e2c4d5' },
  td: { padding: '6px 4px', verticalAlign: 'top', fontWeight: 800, borderBottom: '1px solid #e2c4d5' },
}
