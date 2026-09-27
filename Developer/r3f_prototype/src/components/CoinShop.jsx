import { useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import PassiveUpgradeList from './PassiveUpgradeList.jsx'
import WeaponPermanentUpgradeList from './WeaponPermanentUpgradeList.jsx'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiType, warningSticker } from '../lib/uiStyle.js'
import { useT } from '../lib/i18n.js'

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
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <div style={styles.eyebrow}>{t('shop.eyebrow')}</div>
          <div style={styles.title}>{t('shop.title')}</div>
        </div>
        <div style={styles.coinBadge}>
          <span style={styles.coinBadgeLabel}>{t('common.ownedCoins')}</span>
          <strong style={styles.coinBadgeValue}>{goldTotal}</strong>
        </div>
      </div>

      <div role="group" style={styles.tabs} aria-label={t('shop.tabsAria')}>
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

      <button type="button" style={styles.backButton} onClick={onBack}>
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
