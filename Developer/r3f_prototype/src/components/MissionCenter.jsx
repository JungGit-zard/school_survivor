import { useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MISSION_CATALOG, MISSION_CHAIN_START_IDS } from '../lib/missionCatalog.js'
import { getMissionStatus, getVisibleMissionIds } from '../lib/missionProgress.js'
import { StageLockPreview } from './StageLock.jsx'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { missionObjective, missionTitle, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { emitUiSfx } from '../lib/uiSfx.js'
import { useGameNumber } from '../lib/numberFormat.js'

const STATE_ORDER = { completed_unclaimed: 0, active: 1, claimed: 2 }

const CLAIM_ERROR_KEYS = {
  unauthenticated: 'missions.claimError.unauthenticated',
  'not-completed': 'missions.claimError.notCompleted',
  'already-claimed': 'missions.claimError.alreadyClaimed',
  'progress-not-hydrated': 'missions.claimError.notHydrated',
}

const panelTone = {
  navy: '#18372f',
  sky: uiPalette.cta,
  amber: uiPalette.reward,
  green: uiPalette.infection,
  violet: '#b996ff',
}

export default function MissionCenter({ onBack }) {
  const t = useT()
  const user = useAuthStore((state) => state.user)
  const { missionProgress, missionSyncState, claimMissionReward } = useGameStore(useShallow((state) => ({
    missionProgress: state.missionProgress,
    missionSyncState: state.missionSyncState,
    claimMissionReward: state.claimMissionReward,
  })))
  const [notice, setNotice] = useState('')
  const [claimingMissionId, setClaimingMissionId] = useState('')
  const [showClaimed, setShowClaimed] = useState(false)
  const signedIn = !!user?.uid

  // 미션은 고르지 않는다(2026-11-21). 보이는 미션 = 체인으로 열린 것. 받을 수 있는 것 → 진행 중 → 받은 것 순.
  const { open, claimed, hiddenCount } = useMemo(() => {
    const visibleIds = signedIn ? getVisibleMissionIds(missionProgress) : MISSION_CHAIN_START_IDS
    const visible = new Set(visibleIds)
    const entries = MISSION_CATALOG
      .filter((mission) => visible.has(mission.id))
      .map((mission) => ({ mission, ...getMissionStatus(signedIn ? missionProgress : null, mission) }))
      .sort((x, y) => (STATE_ORDER[x.state] ?? 1) - (STATE_ORDER[y.state] ?? 1))
    return {
      open: entries.filter((entry) => entry.state !== 'claimed'),
      claimed: entries.filter((entry) => entry.state === 'claimed'),
      hiddenCount: MISSION_CATALOG.length - visible.size,
    }
  }, [missionProgress, signedIn])

  const handleClaim = async (missionId) => {
    if (claimingMissionId) return
    setNotice('')
    setClaimingMissionId(missionId)
    const before = new Set(getVisibleMissionIds(useGameStore.getState().missionProgress))
    const result = await claimMissionReward(missionId)
    setClaimingMissionId('')
    emitUiSfx(result.ok ? 'purchase' : 'denied')
    if (result.ok) {
      const revealed = getVisibleMissionIds(useGameStore.getState().missionProgress).filter((id) => !before.has(id)).length
      if (revealed > 0) setNotice(t('missions.newRevealed', { count: revealed }))
      return
    }
    setNotice(t(CLAIM_ERROR_KEYS[result.reason] ?? 'missions.claimError.saveFailed'))
  }

  const syncMessage = missionSyncState === 'hydrated' || missionSyncState === 'saved' || missionSyncState === 'claimed'
    ? t('missions.sync.saved')
    : t('missions.sync.saving')

  return (
    <main style={styles.root} aria-label={t('missions.title')}>
      <section style={styles.panel}>
        <header style={styles.header}>
          <div><h1 style={styles.title}>{t('missions.title')}</h1><p style={styles.subTitle}>{t('missions.subtitle')}</p></div>
          <button type="button" aria-label={t('missions.close')} style={styles.closeButton} onClick={onBack}>×</button>
        </header>
        <div style={styles.body}>
          <div
            data-testid="mission-center-list"
            data-locked={signedIn ? undefined : 'true'}
            aria-hidden={signedIn ? undefined : 'true'}
            inert={signedIn ? undefined : ''}
            style={{ ...styles.scroll, ...(signedIn ? null : styles.lockedList) }}
          >
            {signedIn && <p style={styles.sync}>{syncMessage}</p>}
            {notice && <p role="status" style={styles.notice}>{notice}</p>}
            <div style={styles.list}>
              {open.map((entry) => <MissionCard key={entry.mission.id} entry={entry} onClaim={signedIn ? handleClaim : null} claiming={claimingMissionId === entry.mission.id} t={t} />)}
              {signedIn && hiddenCount > 0 && <p data-testid="mission-hidden-hint" style={styles.hint}>{t('missions.hiddenHint', { count: hiddenCount })}</p>}
              {claimed.length > 0 && (
                <button type="button" aria-expanded={showClaimed} data-testid="mission-claimed-toggle" style={styles.claimedToggle} onClick={() => setShowClaimed((value) => !value)}>
                  {t('missions.claimedToggle', { count: claimed.length })} {showClaimed ? '▴' : '▾'}
                </button>
              )}
              {showClaimed && claimed.map((entry) => <MissionCard key={entry.mission.id} entry={entry} onClaim={null} claiming={false} t={t} />)}
            </div>
          </div>
          {!signedIn && <GuestLock t={t} />}
        </div>
      </section>
    </main>
  )
}

// 게스트(로그아웃)는 미션 체인이 없다. 시작 미션을 어둡게 비춘 위에 스테이지 카드와 같은 자물쇠와 로그인 버튼을 띄운다.
function GuestLock({ t }) {
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const signingIn = useAuthStore((state) => state.signingIn)
  const authStatus = useAuthStore((state) => state.status)
  const busyRef = useRef(false)
  const busy = !!signingIn || authStatus === 'checking'
  const handleSignIn = async () => {
    if (busyRef.current) return
    busyRef.current = true
    try { await signInWithGoogle?.() } finally { busyRef.current = false }
  }
  return (
    <div style={styles.lockOverlay}>
      <section role="dialog" aria-modal="false" aria-labelledby="mission-guest-lock-title" data-testid="mission-guest-lock" style={styles.lockModal}>
        <div style={styles.lockIcon}>
          <StageLockPreview testId="mission-guest-lock-icon" framing="icon" ariaLabel={t('missions.guest.lockAria')} />
        </div>
        <h2 id="mission-guest-lock-title" style={styles.lockTitle}>{t('missions.guest.lockTitle')}</h2>
        <button type="button" data-testid="mission-guest-signin" disabled={busy} style={{ ...styles.signInButton, ...(busy ? styles.pendingButton : null) }} onClick={handleSignIn}>
          {busy ? t('lobby.rosariRoomGate.signingIn') : t('lobby.rosariRoomGate.signIn')}
        </button>
      </section>
    </div>
  )
}

function MissionCard({ entry, onClaim, claiming, t }) {
  const { mission, state, counter, target } = entry
  const formatNumber = useGameNumber()
  const status = t(state === 'claimed' ? 'missions.status.claimed' : state === 'completed_unclaimed' ? 'missions.status.completed' : 'missions.status.active')
  const title = missionTitle(mission)
  const progress = Math.min(100, Math.round((counter / Math.max(target, 1)) * 100))
  return (
    <article data-mission-id={mission.id} style={{ ...styles.card, ...(state === 'completed_unclaimed' ? styles.cardComplete : null), ...(state === 'claimed' ? styles.cardClaimed : null) }}>
      <div style={styles.cardHead}>
        <span data-panel-state={state} style={{ ...styles.status, ...styles.statusByState(state) }}>{state === 'claimed' ? '✓ ' : state === 'completed_unclaimed' ? '★ ' : '… '}{status}</span>
        <strong style={styles.cardTitle}>{title}</strong>
      </div>
      <p style={styles.objective}>{missionObjective(mission)}</p>
      <div style={styles.progressRow}><div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div><span>{formatNumber(counter)}/{formatNumber(target)}</span></div>
      <div style={styles.rewardRow}>
        <span style={styles.rewardChip}>{t('missions.reward', { amount: formatNumber(mission.rewardProposal.amount) })}</span>
        {onClaim && state === 'completed_unclaimed' && <button type="button" data-ui-sfx="none" disabled={claiming} style={{ ...styles.claimButton, ...(claiming ? styles.pendingButton : null) }} onClick={() => onClaim(mission.id)}>{claiming ? t('missions.claiming') : t('missions.claim')}</button>}
      </div>
    </article>
  )
}

const styles = {
  root: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12, boxSizing: 'border-box', background: 'rgba(5,2,9,0.72)', color: uiPalette.ink, fontFamily: uiType.family },
  panel: { ...schoolPanel('paper'), width: 'min(100%, 620px)', height: 'min(calc(100dvh - 24px), 760px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', background: 'linear-gradient(180deg, #fff8e8 0%, #f6ead0 100%)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 14px 10px', borderBottom: uiBorders.strong, background: panelTone.navy, color: uiPalette.paperLight },
  title: { margin: 0, fontSize: 22, fontWeight: uiType.weightHeavy, textShadow: `0 3px 0 ${uiPalette.ink}` }, subTitle: { margin: '4px 0 0', fontSize: 12, fontWeight: 800, lineHeight: 1.35, color: uiPalette.mutedChalk },
  closeButton: { ...schoolButton('primary'), minWidth: 44, minHeight: 44, padding: 0, fontSize: 26 },
  sync: { margin: 0, padding: '9px 14px', background: 'rgba(89,199,255,0.18)', borderBottom: uiBorders.hairline, fontSize: 12, fontWeight: 800, lineHeight: 1.35 },
  body: { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  lockedList: { opacity: 0.42, filter: 'grayscale(0.6)', pointerEvents: 'none', userSelect: 'none' },
  hint: { margin: 0, padding: '8px 10px', border: `2px dashed ${uiPalette.mutedChalk}`, borderRadius: 8, fontSize: 12, fontWeight: 800, lineHeight: 1.4, color: '#5b4f60', textAlign: 'center' },
  claimedToggle: { ...schoolButton('paper'), minHeight: 44, padding: '0 10px', fontSize: 13 },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', background: 'rgba(5,2,9,0.28)' },
  lockModal: { ...schoolPanel('paper'), width: 'min(100%, 320px)', display: 'grid', justifyItems: 'center', gap: 10, padding: '14px 16px 16px', boxSizing: 'border-box', textAlign: 'center' },
  lockIcon: { width: 128, height: 128, margin: '2px auto 0' },
  lockTitle: { margin: 0, fontSize: 18, lineHeight: 1.35, fontWeight: uiType.weightHeavy, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  signInButton: { ...schoolButton('primary'), width: '100%', minHeight: 48, padding: '0 14px', fontSize: 15 },
  notice: { margin: '0 10px 8px', padding: '8px 10px', border: uiBorders.hairline, borderRadius: 8, background: '#fff0be', color: '#493f4d', fontSize: 12, fontWeight: 800 },
  list: { padding: 10, display: 'flex', flexDirection: 'column', gap: 10 },
  card: { ...schoolPanel('paper'), padding: 11, display: 'grid', gap: 8, boxShadow: uiShadows.pressSmall, borderLeft: `6px solid ${panelTone.sky}` }, cardComplete: { borderColor: uiPalette.rewardDeep, borderLeftColor: panelTone.green, background: '#fff6cf' }, cardClaimed: { opacity: 0.82, borderLeftColor: panelTone.violet },
  cardHead: { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 7 }, status: { padding: '3px 7px', border: uiBorders.hairline, borderRadius: 999, fontSize: 11, fontWeight: uiType.weightHeavy, whiteSpace: 'nowrap' }, statusByState: (state) => ({ background: state === 'claimed' ? panelTone.violet : state === 'completed_unclaimed' ? panelTone.green : panelTone.sky, color: uiPalette.ink }), cardTitle: { minWidth: 0, fontSize: 15, lineHeight: 1.25, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  objective: { margin: 0, fontSize: 13, lineHeight: 1.4, fontWeight: 700, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: uiType.numeric, fontSize: 12, fontWeight: uiType.weightHeavy }, progressTrack: { flex: 1, height: 10, overflow: 'hidden', border: uiBorders.hairline, borderRadius: 999, background: 'rgba(5,2,9,0.12)' }, progressFill: { height: '100%', background: `linear-gradient(90deg, ${panelTone.amber}, ${panelTone.sky})` },
  rewardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: uiPalette.rewardDeep, fontSize: 12, fontWeight: uiType.weightHeavy }, rewardChip: { padding: '4px 8px', border: uiBorders.hairline, borderRadius: 999, background: '#fff1b6', color: uiPalette.ink }, claimButton: { ...schoolButton('primary'), minWidth: 72, minHeight: 48, padding: '0 12px', fontSize: 14 }, pendingButton: { minHeight: 48, border: uiBorders.hairline, borderRadius: 7, background: '#9aa0a6', color: '#31363f', fontWeight: 900, cursor: 'not-allowed' },
}
