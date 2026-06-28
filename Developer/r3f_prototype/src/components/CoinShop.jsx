import { useGameStore } from '../store/useGameStore.js'
import { PASSIVE_CATALOG, getMvpPassiveIds, getPriceFor, formatEffectLabel } from '../lib/passiveCatalog.js'
import { getLevel } from '../lib/passiveUpgrades.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType, warningSticker } from '../lib/uiStyle.js'
import iconMagnet from '../assets/passive_icon/passive_magnet.png'
import iconMoveSpeed from '../assets/passive_icon/passive_moveSpeed.png'
import iconMight from '../assets/passive_icon/passive_might.png'
import iconMaxHp from '../assets/passive_icon/passive_maxHp.png'
import iconGrowth from '../assets/passive_icon/passive_growth.png'

const PASSIVE_ICON_SRCS = {
  magnet: iconMagnet,
  moveSpeed: iconMoveSpeed,
  might: iconMight,
  maxHp: iconMaxHp,
  growth: iconGrowth,
}

const PASSIVE_ICON_LABELS = {
  magnet: '회수 반경 아이콘',
  moveSpeed: '이동속도 아이콘',
  maxHp: '체력 아이콘',
  might: '공격력 아이콘',
  growth: '학습력 아이콘',
}

export default function CoinShop({ onBack, backLabel = '결과로 돌아가기' }) {
  const goldTotal = useGameStore((s) => s.goldTotal)
  const passiveVersion = useGameStore((s) => s.passiveVersion)
  const purchasePassive = useGameStore((s) => s.purchasePassive)

  // passiveVersion 구독으로 구매 후 재렌더가 보장된다.
  void passiveVersion

  const ids = getMvpPassiveIds()

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <div style={styles.eyebrow}>생존 강화 신청서</div>
          <div style={styles.title}>코인상점</div>
        </div>
        <div style={styles.coinBadge}>
          <span style={styles.coinBadgeLabel}>보유 코인</span>
          <strong style={styles.coinBadgeValue}>{goldTotal}</strong>
        </div>
      </div>

      <div style={styles.list}>
        {ids.map((id, index) => {
          const entry = PASSIVE_CATALOG[id]
          const currentLevel = getLevel(id)
          const isMax = currentLevel >= entry.maxLevel
          const nextLevel = currentLevel + 1
          const price = isMax ? null : getPriceFor(id, nextLevel)
          const canAfford = !isMax && goldTotal >= price
          return (
            <PassiveCard
              key={id}
              index={index}
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
        {backLabel}
      </button>
    </div>
  )
}

function PassiveCard({ index, entry, currentLevel, isMax, price, canAfford, onBuy }) {
  const levelText = isMax ? 'Lv.MAX' : `Lv.${currentLevel}`
  const effectText = formatEffectLabel(entry.id, currentLevel)
  const cardStateStyle = isMax ? styles.cardMax : canAfford ? styles.cardReady : styles.cardLocked

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
    <div style={{ ...styles.card, ...cardStateStyle }}>
      <div style={styles.cardStamp}>
        <PassiveIcon id={entry.id} label={PASSIVE_ICON_LABELS[entry.id] ?? `${entry.label} 아이콘`} />
      </div>
      <div style={styles.cardMain}>
        <div style={styles.cardMeta}>
          <span style={styles.cardNumber}>신청 {String(index + 1).padStart(2, '0')}</span>
          <span style={styles.cardLevel}>{levelText}</span>
        </div>
        <div style={styles.cardLine1}>
          <span style={styles.cardLabel}>{entry.label}</span>
        </div>
        <div style={styles.cardLine2}>{effectText}</div>
        <div style={styles.progressRow} aria-label={`${entry.label} 진행도 ${currentLevel}/${entry.maxLevel}`}>
          <span style={styles.progressLabel}>진행도</span>
          <span style={styles.progressDots}>
            {Array.from({ length: entry.maxLevel }, (_, dotIndex) => (
              <span
                key={dotIndex}
                style={styles.levelDot(dotIndex < currentLevel)}
              />
            ))}
          </span>
        </div>
      </div>
      <div style={styles.cardPriceCol}>
        <div style={styles.cardPrice(isMax)}>{isMax ? '완료' : `${price} 코인`}</div>
        <button type="button" style={buttonStyle} onClick={onBuy} disabled={disabled}>
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

function PassiveIcon({ id, label }) {
  const src = PASSIVE_ICON_SRCS[id]
  return (
    <img
      src={src}
      alt={label}
      style={styles.passiveIcon}
    />
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(180deg, #18372f 0%, #111821 54%, #151019 100%)',
    color: uiPalette.paperLight,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 14px 12px',
    boxSizing: 'border-box',
    gap: 9,
    fontFamily: uiType.family,
  },
  header: {
    ...schoolPanel('chalk'),
    width: 'min(100%, 430px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '9px 11px',
    transform: 'rotate(-0.4deg)',
    boxSizing: 'border-box',
  },
  headerCopy: {
    minWidth: 0,
  },
  eyebrow: {
    color: uiPalette.reward,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  title: {
    marginTop: 5,
    color: uiPalette.paperLight,
    fontSize: 25,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 0,
    textShadow: `0 3px 0 ${uiPalette.ink}`,
  },
  coinBadge: {
    ...warningSticker('warning'),
    minWidth: 94,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 10px',
    boxSizing: 'border-box',
    transform: 'rotate(1deg)',
  },
  coinBadgeLabel: {
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
  },
  coinBadgeValue: {
    marginTop: 3,
    color: uiPalette.ink,
    fontFamily: uiType.numeric,
    fontSize: 21,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  list: {
    width: 'min(100%, 430px)',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    padding: '1px 2px 4px',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  },
  card: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '42px minmax(0, 1fr) 88px',
    alignItems: 'center',
    gap: 8,
    minHeight: 82,
    padding: '8px 9px',
    border: uiBorders.strong,
    borderRadius: 8,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  },
  cardReady: {
    background: uiPalette.paperLight,
  },
  cardLocked: {
    background: '#e2dac8',
    opacity: 0.9,
  },
  cardMax: {
    background: '#dff4e7',
  },
  cardStamp: {
    width: 39,
    height: 39,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.cta,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    transform: 'rotate(-5deg)',
  },
  passiveIcon: {
    width: 31,
    height: 31,
    display: 'block',
    overflow: 'visible',
  },
  cardMain: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  cardNumber: {
    padding: '2px 6px',
    border: uiBorders.hairline,
    borderRadius: 999,
    background: 'rgba(24,55,47,0.1)',
    color: 'rgba(5,2,9,0.72)',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
    whiteSpace: 'nowrap',
  },
  cardLevel: {
    color: uiPalette.dangerDeep,
    fontFamily: uiType.numeric,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    whiteSpace: 'nowrap',
  },
  cardLine1: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  cardLabel: {
    minWidth: 0,
    overflow: 'hidden',
    color: uiPalette.ink,
    fontSize: 16,
    lineHeight: 1.08,
    fontWeight: uiType.weightHeavy,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardLine2: {
    minWidth: 0,
    overflow: 'hidden',
    color: '#493f4d',
    fontSize: 11,
    lineHeight: 1.25,
    fontWeight: 800,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  progressLabel: {
    color: 'rgba(5,2,9,0.64)',
    fontSize: 9,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
  },
  progressDots: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  levelDot: (filled) => ({
    width: 17,
    height: 7,
    border: `1.5px solid ${uiPalette.ink}`,
    borderRadius: 999,
    background: filled ? uiPalette.cta : 'rgba(5,2,9,0.12)',
    boxSizing: 'border-box',
  }),
  cardPriceCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 7,
    minWidth: 0,
  },
  cardPrice: (isMax) => ({
    alignSelf: 'flex-end',
    minWidth: 70,
    padding: '4px 6px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: isMax ? uiPalette.infection : uiPalette.reward,
    color: uiPalette.ink,
    fontFamily: uiType.numeric,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textAlign: 'center',
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  }),
  buyButton: {
    ...schoolButton('primary'),
    width: '100%',
    minHeight: 37,
    fontSize: 14,
    lineHeight: 1,
    boxShadow: uiShadows.pressSmall,
  },
  insufficientButton: {
    ...schoolButton('danger'),
    width: '100%',
    minHeight: 37,
    fontSize: 12,
    lineHeight: 1,
    cursor: 'not-allowed',
    opacity: 0.88,
    boxShadow: uiShadows.pressSmall,
  },
  maxButton: {
    ...schoolButton('chalk'),
    width: '100%',
    minHeight: 37,
    background: uiPalette.chalkboardDeep,
    fontSize: 14,
    lineHeight: 1,
    cursor: 'not-allowed',
    opacity: 0.88,
    boxShadow: uiShadows.pressSmall,
  },
  backButton: {
    ...schoolButton('paper'),
    width: '100%',
    maxWidth: 430,
    minHeight: 49,
    fontSize: 17,
    lineHeight: 1,
  },
}
