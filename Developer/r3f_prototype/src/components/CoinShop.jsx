import { useGameStore } from '../store/useGameStore.js'
import { PASSIVE_CATALOG, getMvpPassiveIds, getPriceFor, formatEffectLabel } from '../lib/passiveCatalog.js'
import { getLevel } from '../lib/passiveUpgrades.js'

export default function CoinShop({ onBack }) {
  const goldTotal = useGameStore((s) => s.goldTotal)
  const passiveVersion = useGameStore((s) => s.passiveVersion)
  const purchasePassive = useGameStore((s) => s.purchasePassive)

  // passiveVersion 구독으로 구매 후 재렌더가 보장된다.
  void passiveVersion

  const ids = getMvpPassiveIds()

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>코인상점</div>
        <div style={styles.coinBadge}>보유 코인 {goldTotal}</div>
      </div>

      <div style={styles.list}>
        {ids.map((id) => {
          const entry = PASSIVE_CATALOG[id]
          const currentLevel = getLevel(id)
          const isMax = currentLevel >= entry.maxLevel
          const nextLevel = currentLevel + 1
          const price = isMax ? null : getPriceFor(id, nextLevel)
          const canAfford = !isMax && goldTotal >= price
          return (
            <PassiveCard
              key={id}
              entry={entry}
              currentLevel={currentLevel}
              isMax={isMax}
              price={price}
              canAfford={canAfford}
              onBuy={() => purchasePassive(id)}
            />
          )
        })}
      </div>

      <button type="button" style={styles.backButton} onClick={onBack}>
        결과로 돌아가기
      </button>
    </div>
  )
}

function PassiveCard({ entry, currentLevel, isMax, price, canAfford, onBuy }) {
  const levelText = isMax ? 'Lv.MAX' : `Lv.${currentLevel}`
  const effectText = formatEffectLabel(entry.id, currentLevel)

  let buttonLabel = '구매'
  let buttonStyle = styles.buyButton
  let disabled = false
  if (isMax) {
    buttonLabel = '최대'
    buttonStyle = styles.maxButton
    disabled = true
  } else if (!canAfford) {
    buttonLabel = '코인 부족'
    buttonStyle = styles.insufficientButton
    disabled = true
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardMain}>
        <div style={styles.cardLine1}>
          <span style={styles.cardLabel}>{entry.label}</span>
          <span style={styles.cardLevel}>{levelText}</span>
        </div>
        <div style={styles.cardLine2}>{effectText}</div>
      </div>
      <div style={styles.cardPriceCol}>
        {!isMax && <div style={styles.cardPrice}>{price} 코인</div>}
        <button type="button" style={buttonStyle} onClick={onBuy} disabled={disabled}>
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    background: '#ffffff',
    color: '#111111',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    boxSizing: 'border-box',
    gap: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottom: '1px solid #dddddd',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
  },
  coinBadge: {
    fontSize: 16,
    fontWeight: 700,
    background: '#f5e8b8',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #c9b76a',
  },
  list: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    border: '1px solid #cccccc',
    borderRadius: 8,
    background: '#fafafa',
  },
  cardMain: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  cardLine1: { display: 'flex', alignItems: 'baseline', gap: 8 },
  cardLabel: { fontSize: 16, fontWeight: 800 },
  cardLevel: { fontSize: 13, color: '#666666', fontWeight: 600 },
  cardLine2: { fontSize: 13, color: '#333333' },
  cardPriceCol: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 88 },
  cardPrice: { fontSize: 13, fontWeight: 700, color: '#7a5b00' },
  buyButton: {
    width: 84,
    height: 34,
    border: '1px solid #111111',
    borderRadius: 6,
    background: '#111111',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  insufficientButton: {
    width: 84,
    height: 34,
    border: '1px solid #aaaaaa',
    borderRadius: 6,
    background: '#eeeeee',
    color: '#888888',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'not-allowed',
  },
  maxButton: {
    width: 84,
    height: 34,
    border: '1px solid #888888',
    borderRadius: 6,
    background: '#dddddd',
    color: '#333333',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'not-allowed',
  },
  backButton: {
    width: '100%',
    height: 48,
    border: '1px solid #111111',
    borderRadius: 6,
    background: '#ffffff',
    color: '#111111',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
