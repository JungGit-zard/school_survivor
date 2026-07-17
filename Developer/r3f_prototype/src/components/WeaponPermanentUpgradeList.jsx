import { useGameStore } from '../store/useGameStore.js'
import {
  getWeaponPermanentUpgradeLevel,
  getWeaponPermanentUpgradePlan,
  getWeaponPermanentUpgradePrice,
} from '../lib/weaponPermanentUpgrades.js'
import { getAllWeaponIds } from '../lib/weaponCatalog.js'
import { isUnlocked } from '../lib/weaponUnlocks.js'
import { schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'

export default function WeaponPermanentUpgradeList({ style }) {
  const goldTotal = useGameStore((s) => s.goldTotal)
  const passiveVersion = useGameStore((s) => s.passiveVersion)
  const purchaseWeaponPermanentUpgrade = useGameStore((s) => s.purchaseWeaponPermanentUpgrade)
  void passiveVersion

  const ids = getAllWeaponIds().sort((a, b) => {
    const aUnlocked = isUnlocked(a)
    const bUnlocked = isUnlocked(b)
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1
    return a.localeCompare(b)
  })

  return (
    <div style={{ ...styles.list, ...style }}>
      <div style={styles.notice}>무기 기본능력 영구 강화</div>
      {ids.map((id) => {
        const plan = getWeaponPermanentUpgradePlan(id)
        if (!plan) return null
        const unlocked = isUnlocked(id)
        const currentLevel = getWeaponPermanentUpgradeLevel(id)
        const isMax = currentLevel >= plan.maxLevel
        const nextLevel = currentLevel + 1
        const price = isMax ? null : getWeaponPermanentUpgradePrice(nextLevel)
        const canAfford = unlocked && !isMax && goldTotal >= price
        return (
          <WeaponPermanentCard
            key={id}
            plan={plan}
            unlocked={unlocked}
            currentLevel={currentLevel}
            isMax={isMax}
            price={price}
            canAfford={canAfford}
            onBuy={() => purchaseWeaponPermanentUpgrade(id)}
          />
        )
      })}
    </div>
  )
}

function WeaponPermanentCard({ plan, unlocked, currentLevel, isMax, price, canAfford, onBuy }) {
  const next = plan.levels[Math.min(currentLevel + 1, plan.maxLevel)]
  const current = currentLevel > 0 ? plan.levels[currentLevel] : null
  let buttonLabel = '강화'
  let disabled = false
  let buttonStyle = styles.buyButton
  if (!unlocked) {
    buttonLabel = '잠김'
    disabled = true
    buttonStyle = styles.lockedButton
  } else if (isMax) {
    buttonLabel = '최대'
    disabled = true
    buttonStyle = styles.maxButton
  } else if (!canAfford) {
    buttonLabel = '코인 부족'
    disabled = true
    buttonStyle = styles.insufficientButton
  }

  return (
    <div style={{ ...styles.card, ...(unlocked ? styles.cardReady : styles.cardLocked), ...(isMax ? styles.cardMax : null) }}>
      <div style={styles.weaponIcon}>{unlocked ? '⚔️' : '🔒'}</div>
      <div style={styles.cardMain}>
        <div style={styles.metaRow}>
          <span style={styles.weaponName}>{plan.label}</span>
          <span style={styles.level}>Lv.{currentLevel} / {plan.maxLevel}</span>
        </div>
        <div style={styles.effectLine}>
          {unlocked ? (current ? `현재: ${current.summary}` : '현재: 기본 상태') : '무기 해금 후 강화 가능'}
        </div>
        <div style={styles.nextLine}>
          {unlocked ? (isMax ? '모든 영구 강화 완료' : `다음: ${next.summary}`) : `강화 방향: ${next?.summary ?? '해금 후 확인'}`}
        </div>
      </div>
      <div style={styles.priceCol}>
        <div style={styles.price}>{isMax ? '완료' : unlocked ? `${price} 코인` : '잠김'}</div>
        <button type="button" style={buttonStyle} onClick={onBuy} disabled={disabled}>
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

const styles = {
  list: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    padding: '1px 2px 4px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    boxSizing: 'border-box',
  },
  notice: {
    padding: '7px 9px',
    border: uiBorders.hairline,
    borderRadius: 8,
    background: 'rgba(255,244,188,0.94)',
    color: uiPalette.ink,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
  },
  card: {
    display: 'grid',
    gridTemplateColumns: '42px minmax(0, 1fr) 88px',
    alignItems: 'center',
    gap: 8,
    minHeight: 88,
    padding: '8px 9px',
    border: uiBorders.strong,
    borderRadius: 8,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  },
  cardReady: { background: uiPalette.paperLight },
  cardLocked: { background: '#d8d2c4', opacity: 0.86 },
  cardMax: { background: '#dff4e7' },
  weaponIcon: {
    width: 38,
    height: 38,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.cta,
    boxShadow: uiShadows.pressSmall,
  },
  cardMain: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  weaponName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 15,
    fontWeight: uiType.weightHeavy,
  },
  level: {
    color: uiPalette.dangerDeep,
    fontFamily: uiType.numeric,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
    whiteSpace: 'nowrap',
  },
  effectLine: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#493f4d',
    fontSize: 11,
    fontWeight: 800,
  },
  nextLine: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'rgba(5,2,9,0.66)',
    fontSize: 10,
    fontWeight: 800,
  },
  priceCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 5,
  },
  price: {
    color: uiPalette.ink,
    fontFamily: uiType.numeric,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
    textAlign: 'center',
  },
  buyButton: { ...schoolButton('cta'), minHeight: 32, padding: '6px 8px', fontSize: 13 },
  insufficientButton: { ...schoolButton('paper'), minHeight: 32, padding: '6px 8px', fontSize: 12, opacity: 0.72 },
  lockedButton: { ...schoolButton('paper'), minHeight: 32, padding: '6px 8px', fontSize: 13, opacity: 0.66 },
  maxButton: { ...schoolButton('chalk'), minHeight: 32, padding: '6px 8px', fontSize: 13 },
}
