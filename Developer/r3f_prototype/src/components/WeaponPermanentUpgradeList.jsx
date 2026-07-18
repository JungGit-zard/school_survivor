import { useGameStore } from '../store/useGameStore.js'
import {
  getWeaponPermanentUpgradeLevel,
  getWeaponPermanentUpgradePlan,
  getWeaponPermanentUpgradePrice,
} from '../lib/weaponPermanentUpgrades.js'
import { getAllWeaponIds } from '../lib/weaponCatalog.js'
import { isUnlocked } from '../lib/weaponUnlocks.js'
import { schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import pencilIconSrc from '../assets/weapon_icon/01_wea_pencil.png.webp'
import rulerIconSrc from '../assets/weapon_icon/02_wea_30ruller.png.webp'
import boxCutterIconSrc from '../assets/weapon_icon/13_wea_boxcutter.svg'
import tumblerIconSrc from '../assets/weapon_icon/03_wea_tumbler.png.webp'
import flaskIconSrc from '../assets/weapon_icon/04_wea_science.png.webp'
import bellIconSrc from '../assets/weapon_icon/05_wea_bell.png.webp'
import stunIconSrc from '../assets/weapon_icon/06_wea_stungun.png.webp'
import onigiriIconSrc from '../assets/weapon_icon/07_wea_onigiri.png.webp'
import missileIconSrc from '../assets/weapon_icon/08_wea_extrabattery.png.webp'
import starlinkIconSrc from '../assets/weapon_icon/09_wea_starlink.png.webp'
import compassBladeIconSrc from '../assets/weapon_icon/10_wea_compass.png.webp'
import umbrellaIconSrc from '../assets/weapon_icon/11_wea_umb.png.webp'
import eraserIconSrc from '../assets/weapon_icon/12_wea_eraser.png.webp'
import chibikoIconSrc from '../assets/weapon_icon/14_wea_chibiko.svg'
import sharkMissileIconSrc from '../assets/weapon_icon/14_wea_shark_missile.svg'
import lanternIconSrc from '../assets/weapon_icon/16_wea_lantern.webp'

const WEAPON_PERMANENT_ICON_SRC = {
  pencilThrow: pencilIconSrc,
  schoolBag: rulerIconSrc,
  boxCutter: boxCutterIconSrc,
  tumbler: tumblerIconSrc,
  scienceFlask: flaskIconSrc,
  bell: bellIconSrc,
  stunGun: stunIconSrc,
  onigiri: onigiriIconSrc,
  guidedMissile: missileIconSrc,
  starlink: starlinkIconSrc,
  compassBlade: compassBladeIconSrc,
  umbrellaGuard: umbrellaIconSrc,
  eraserBomb: eraserIconSrc,
  chibiko: chibikoIconSrc,
  sharkMissile: sharkMissileIconSrc,
  studentLantern: lanternIconSrc,
}

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
  const iconSrc = WEAPON_PERMANENT_ICON_SRC[plan.id]
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
      <div style={styles.weaponIcon}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ ...styles.weaponIconImage, ...(!unlocked ? styles.weaponIconImageLocked : null) }}
          />
        ) : (
          <span style={styles.weaponIconFallback}>⚔️</span>
        )}
        {!unlocked ? <span style={styles.lockBadge} aria-hidden="true">🔒</span> : null}
      </div>
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
    gridTemplateColumns: '56px minmax(0, 1fr) 88px',
    alignItems: 'center',
    gap: 8,
    minHeight: 94,
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
    width: 52,
    height: 52,
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 999,
    background: 'radial-gradient(circle at 35% 28%, #bff2ff 0%, #6fd8ff 58%, #2da4dc 100%)',
    boxShadow: uiShadows.pressSmall,
    overflow: 'visible',
  },
  weaponIconImage: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    imageRendering: 'auto',
    filter: 'drop-shadow(0 2px 0 rgba(5,2,9,0.36))',
    pointerEvents: 'none',
  },
  weaponIconImageLocked: {
    opacity: 0.48,
    filter: 'grayscale(0.85) drop-shadow(0 2px 0 rgba(5,2,9,0.26))',
  },
  weaponIconFallback: {
    fontSize: 26,
    lineHeight: 1,
  },
  lockBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 22,
    height: 22,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.hairline,
    borderRadius: 999,
    background: uiPalette.paperLight,
    fontSize: 12,
    lineHeight: 1,
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
