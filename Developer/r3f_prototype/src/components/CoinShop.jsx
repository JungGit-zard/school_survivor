import { useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import PassiveUpgradeList from './PassiveUpgradeList.jsx'
import WeaponPermanentUpgradeList from './WeaponPermanentUpgradeList.jsx'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiType, warningSticker } from '../lib/uiStyle.js'
import { useT } from '../lib/i18n.js'

// 가로 폰(높이 ≤500px)에서는 앱이 약 200px 폭의 9:16 세로 컬럼이 된다(Lobby와 같은 조건).
// 헤더를 한 줄로 줄이고, 상점 카드(주인공·무기 공통)는 가격/버튼 열을 카드 아래 한 줄로 내린다.
const LANDSCAPE_CSS = `@media (orientation: landscape) and (max-height: 500px){
  .coinshop-root{ padding: 8px !important; gap: 6px !important }
  .coinshop-header{ padding: 6px 8px !important; gap: 6px !important }
  .coinshop-eyebrow{ display: none }
  .coinshop-title{ margin-top: 0 !important; font-size: 18px !important; white-space: nowrap }
  .coinshop-coin{ min-width: 0 !important; padding: 4px 8px !important }
  .coinshop-coin strong{ font-size: 16px !important }
  .coinshop-tabs{ grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important }
  .coinshop-tabs button{ min-width: 0; padding: 4px !important; font-size: 12px !important }
  .coinshop-back{ min-height: 44px !important; font-size: 14px !important }
  .coinshop-root .shop-card{ grid-template-columns: 34px minmax(0, 1fr) !important; row-gap: 6px !important; padding: 7px !important; min-height: 0 !important; flex-shrink: 0 }
  .coinshop-root .shop-card-icon{ width: 32px !important; height: 32px !important }
  .coinshop-root .shop-card-icon img{ width: 26px !important; height: 26px !important }
  .coinshop-root .shop-card-price{ grid-column: 1 / -1; flex-direction: row !important; align-items: center !important }
  .coinshop-root .shop-card-price > button{ flex: 1; min-width: 0 }
  .coinshop-root .shop-card-price > div{ align-self: center !important }
}`

const panelTone = {
  navy: '#18372f',
  sky: uiPalette.cta,
  amber: uiPalette.reward,
  green: uiPalette.infection,
  violet: '#b996ff',
}

export default function CoinShop({ onBack, backLabel, onOpenWeaponDetails }) {
  const t = useT()
  const goldTotal = useGameStore((s) => s.goldTotal)
  const [activeTab, setActiveTab] = useState('passive')

  return (
    <div className="coinshop-root" style={styles.root}>
      <style>{LANDSCAPE_CSS}</style>
      <div className="coinshop-header" style={styles.header}>
        <div style={styles.headerCopy}>
          <div className="coinshop-eyebrow" style={styles.eyebrow}>{t('shop.eyebrow')}</div>
          <div className="coinshop-title" style={styles.title}>{t('shop.title')}</div>
        </div>
        <div className="coinshop-coin" style={styles.coinBadge}>
          <span style={styles.coinBadgeLabel}>{t('common.ownedCoins')}</span>
          <strong style={styles.coinBadgeValue}>{goldTotal}</strong>
        </div>
      </div>

      <div role="group" className="coinshop-tabs" style={styles.tabs} aria-label={t('shop.tabsAria')}>
        <button
          type="button"
          aria-pressed={activeTab === 'passive'}
          data-panel-state={activeTab === 'passive' ? 'selected' : 'idle'}
          style={activeTab === 'passive' ? styles.tabActive : styles.tabButton}
          onClick={() => setActiveTab('passive')}
        >
          <span aria-hidden="true">{activeTab === 'passive' ? '● ' : '○ '}</span>{t('shop.tabHero')}
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'weapon'}
          data-panel-state={activeTab === 'weapon' ? 'selected' : 'idle'}
          style={activeTab === 'weapon' ? styles.tabActive : styles.tabButton}
          onClick={() => setActiveTab('weapon')}
        >
          <span aria-hidden="true">{activeTab === 'weapon' ? '● ' : '○ '}</span>{t('shop.tabWeapon')}
        </button>
      </div>

      {activeTab === 'passive'
        ? <PassiveUpgradeList style={styles.list} />
        : <WeaponPermanentUpgradeList style={styles.list} onOpenUnlockDetails={onOpenWeaponDetails} />}

      <button type="button" className="coinshop-back" data-ui-sfx="close" style={styles.backButton} onClick={onBack}>
        {backLabel ?? t('back.toResult')}
      </button>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    background: `linear-gradient(180deg, ${panelTone.navy} 0%, #111821 54%, #151019 100%)`,
    color: uiPalette.paperLight,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 14px 12px',
    boxSizing: 'border-box',
    gap: 10,
    fontFamily: uiType.family,
  },
  header: {
    ...schoolPanel('chalk'),
    width: 'min(100%, 430px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderBottom: `4px solid ${panelTone.sky}`,
    transform: 'rotate(-0.4deg)',
    boxSizing: 'border-box',
  },
  headerCopy: {
    minWidth: 0,
  },
  eyebrow: {
    color: panelTone.amber,
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
    background: panelTone.amber,
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
  },
  tabs: {
    width: 'min(100%, 430px)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: '4px',
    border: uiBorders.strong,
    borderRadius: 10,
    background: 'rgba(255,248,232,0.12)',
  },
  tabButton: {
    ...schoolButton('paper'),
    minHeight: 44,
    padding: '7px 8px',
    fontSize: 14,
    lineHeight: 1,
  },
  tabActive: {
    ...schoolButton('primary'),
    minHeight: 44,
    padding: '7px 8px',
    fontSize: 14,
    lineHeight: 1,
  },
  backButton: {
    ...schoolButton('primary'),
    width: '100%',
    maxWidth: 430,
    minHeight: 49,
    fontSize: 17,
    lineHeight: 1,
  },
}
