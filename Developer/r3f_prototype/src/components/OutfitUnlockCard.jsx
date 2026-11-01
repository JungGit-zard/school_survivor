// Escape result card: "New outfit: 비옷" + where to change. Shown when the store's
// newlyUnlockedOutfitIds (filled only on a cleared escape) is non-empty.
import { isOutfitId } from '../lib/outfitCatalog.js'
import { outfitEffectSummary, outfitName } from '../lib/outfitDisplay.js'
import { useT } from '../lib/i18n.js'
import { uiPalette, uiType } from '../lib/uiStyle.js'

export default function OutfitUnlockCard({ outfitIds }) {
  const t = useT()
  const ids = (outfitIds ?? []).filter(isOutfitId)
  if (ids.length === 0) return null
  return (
    <div data-testid="outfit-unlock-card" role="status" style={styles.card}>
      {ids.map((id) => (
        <div key={id} data-outfit-unlocked={id} style={styles.item}>
          <div style={styles.title}>{t('outfit.newUnlock.title', { name: outfitName(id) })}</div>
          <div style={styles.effect}>{outfitEffectSummary(id)}</div>
        </div>
      ))}
      <div style={styles.body}>{t('outfit.newUnlock.body')}</div>
    </div>
  )
}

const styles = {
  card: {
    margin: '0 0 14px',
    padding: '10px 12px',
    background: 'rgba(247, 209, 126, 0.16)',
    border: `1.5px solid ${uiPalette.reward}`,
    borderRadius: 8,
    textAlign: 'center',
    overflowWrap: 'anywhere',
  },
  item: { margin: '2px 0 6px' },
  title: { color: uiPalette.reward, fontSize: 15, fontWeight: uiType.weightHeavy, lineHeight: 1.3 },
  effect: { color: uiPalette.paperLight, fontSize: 13, fontWeight: 800, marginTop: 2, lineHeight: 1.35 },
  body: { color: uiPalette.mutedChalk, fontSize: 12, lineHeight: 1.4 },
}
