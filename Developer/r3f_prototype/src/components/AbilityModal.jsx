// 능력치 강화 모달 (로비). 코인상점과 동일한 패시브 카드 UI를 재사용한다.
// 강화 로직 단일 소스: PassiveUpgradeList → useGameStore.purchasePassive. maxLevel=실제 3.
import { useGameStore } from '../store/useGameStore.js'
import PassiveUpgradeList from './PassiveUpgradeList.jsx'
import { schoolPanel, schoolButton, uiPalette, uiType, warningSticker } from '../lib/uiStyle.js'

export default function AbilityModal({ onClose }) {
  const goldTotal = useGameStore((s) => s.goldTotal)

  return (
    <div style={styles.overlay}>
      <button type="button" aria-label="능력치 닫기 배경" style={styles.scrim} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="lobby-ability-heading" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>생존 강화 신청서</div>
            <h2 id="lobby-ability-heading" style={styles.title}>내 능력치</h2>
          </div>
          <div style={styles.coinBadge}>
            <span style={styles.coinBadgeLabel}>보유 코인</span>
            <strong style={styles.coinBadgeValue}>{goldTotal}</strong>
          </div>
        </div>

        <PassiveUpgradeList style={styles.list} />

        <button type="button" style={styles.closeBtn} onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: uiType.family,
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.5)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  modal: {
    ...schoolPanel('dark'),
    position: 'relative',
    width: 'min(100% - 28px, 440px)',
    maxHeight: 'min(88%, 640px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: uiPalette.reward,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  title: {
    margin: '5px 0 0',
    color: uiPalette.paperLight,
    fontSize: 22,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 3px 0 ${uiPalette.ink}`,
  },
  coinBadge: {
    ...warningSticker('warning'),
    minWidth: 90,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 10px',
    boxSizing: 'border-box',
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
    fontSize: 20,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  list: {
    width: '100%',
  },
  closeBtn: {
    ...schoolButton('paper'),
    width: '100%',
    minHeight: 46,
    fontSize: 16,
    lineHeight: 1,
  },
}
