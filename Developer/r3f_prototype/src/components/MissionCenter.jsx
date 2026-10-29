import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MISSION_CATALOG } from '../lib/missionCatalog.js'
import { getMissionStatus } from '../lib/missionProgress.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { missionObjective, missionTitle, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { useGameNumber } from '../lib/numberFormat.js'

const FILTERS = ['recommended', 'progress', 'completed', 'all']

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
  const { missionProgress, missionSyncState, togglePinnedMission, saveMissionProgress, claimMissionReward } = useGameStore(useShallow((state) => ({
    missionProgress: state.missionProgress,
    missionSyncState: state.missionSyncState,
    togglePinnedMission: state.togglePinnedMission,
    saveMissionProgress: state.saveMissionProgress,
    claimMissionReward: state.claimMissionReward,
  })))
  const [filter, setFilter] = useState('recommended')
  const [notice, setNotice] = useState('')
  const [claimingMissionId, setClaimingMissionId] = useState('')

  const missions = useMemo(() => {
    const entries = MISSION_CATALOG.map((mission) => ({ mission, ...getMissionStatus(missionProgress, mission) }))
    if (filter === 'progress') return entries.filter((entry) => entry.state === 'active' && entry.counter > 0)
    if (filter === 'completed') return entries.filter((entry) => entry.state === 'completed_unclaimed' || entry.state === 'claimed')
    if (filter === 'recommended') return entries
      .filter((entry) => entry.state === 'completed_unclaimed' || entry.counter > 0 || entry.mission.sourceNumber <= 6)
      .slice(0, 6)
    return entries
  }, [filter, missionProgress])

  const handlePin = async (missionId) => {
    setNotice('')
    if (!togglePinnedMission(missionId)) {
      setNotice(t('missions.pinLimit'))
      return
    }
    const saved = await saveMissionProgress()
    if (!saved.ok) setNotice(t('missions.pinSaveFailed'))
  }

  const handleClaim = async (missionId) => {
    if (claimingMissionId) return
    setNotice('')
    setClaimingMissionId(missionId)
    const result = await claimMissionReward(missionId)
    setClaimingMissionId('')
    if (result.ok) return
    setNotice(t(CLAIM_ERROR_KEYS[result.reason] ?? 'missions.claimError.saveFailed'))
  }

  const syncMessage = !user?.uid
    ? t('missions.sync.guest')
    : missionSyncState === 'hydrated' || missionSyncState === 'saved'
      ? t('missions.sync.saved')
      : t('missions.sync.saving')

  return (
    <main style={styles.root} aria-label={t('missions.title')}>
      <section style={styles.panel}>
        <header style={styles.header}>
          <div><h1 style={styles.title}>{t('missions.title')}</h1><p style={styles.subTitle}>{t('missions.subtitle', { count: MISSION_CATALOG.length })}</p></div>
          <button type="button" aria-label={t('missions.close')} style={styles.closeButton} onClick={onBack}>×</button>
        </header>
        <p style={styles.sync}>{syncMessage}</p>
        <nav aria-label={t('missions.filterAria')} style={styles.tabs}>
          {FILTERS.map((id) => {
            const active = filter === id
            return <button key={id} type="button" aria-pressed={active} data-panel-state={active ? 'selected' : 'idle'} style={{ ...styles.tab, ...(active ? styles.tabActive : null) }} onClick={() => setFilter(id)}><span aria-hidden="true">{active ? '● ' : '○ '}</span>{t(`missions.filter.${id}`)}</button>
          })}
        </nav>
        {notice && <p role="status" style={styles.notice}>{notice}</p>}
        <div style={styles.list}>
          {missions.map((entry) => <MissionCard key={entry.mission.id} entry={entry} pinned={missionProgress.pinnedMissionIds.includes(entry.mission.id)} onPin={handlePin} onClaim={handleClaim} claiming={claimingMissionId === entry.mission.id} t={t} />)}
          {missions.length === 0 && <p style={styles.empty}>{t('missions.empty', { count: MISSION_CATALOG.length })}</p>}
        </div>
      </section>
    </main>
  )
}

function MissionCard({ entry, pinned, onPin, onClaim, claiming, t }) {
  const { mission, state, counter, target } = entry
  const formatNumber = useGameNumber()
  const status = t(state === 'claimed' ? 'missions.status.claimed' : state === 'completed_unclaimed' ? 'missions.status.completed' : 'missions.status.active')
  const title = missionTitle(mission)
  const progress = Math.min(100, Math.round((counter / Math.max(target, 1)) * 100))
  return (
    <article style={{ ...styles.card, ...(state === 'completed_unclaimed' ? styles.cardComplete : null), ...(state === 'claimed' ? styles.cardClaimed : null) }}>
      <div style={styles.cardHead}>
        <span data-panel-state={state} style={{ ...styles.status, ...styles.statusByState(state) }}>{state === 'claimed' ? '✓ ' : state === 'completed_unclaimed' ? '★ ' : '… '}{status}</span>
        <strong style={styles.cardTitle}>{mission.sourceNumber}. {title}</strong>
        <button type="button" style={styles.pinButton} aria-pressed={pinned} aria-label={t(pinned ? 'missions.unpinAria' : 'missions.pinAria', { title })} onClick={() => onPin(mission.id)}>{pinned ? t('missions.pinned') : t('missions.pin')}</button>
      </div>
      <p style={styles.objective}>{missionObjective(mission)}</p>
      <div style={styles.progressRow}><div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div><span>{formatNumber(counter)}/{formatNumber(target)}</span></div>
      <div style={styles.rewardRow}>
        <span style={styles.rewardChip}>{t('missions.reward', { amount: formatNumber(mission.rewardProposal.amount) })}</span>
        {state === 'completed_unclaimed' && <button type="button" disabled={claiming} style={{ ...styles.claimButton, ...(claiming ? styles.pendingButton : null) }} onClick={() => onClaim(mission.id)}>{claiming ? t('missions.claiming') : t('missions.claim')}</button>}
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
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, padding: 10, borderBottom: uiBorders.hairline },
  tab: { ...schoolButton('paper'), minHeight: 44, padding: '0 4px', fontSize: 13 }, tabActive: { ...schoolButton('primary'), minHeight: 44, padding: '0 4px', fontSize: 13 },
  notice: { margin: '0 10px 8px', padding: '8px 10px', border: uiBorders.hairline, borderRadius: 8, background: '#fff0be', color: '#493f4d', fontSize: 12, fontWeight: 800 },
  list: { flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }, empty: { margin: 0, padding: 14, fontSize: 14, fontWeight: 800, lineHeight: 1.45 },
  card: { ...schoolPanel('paper'), padding: 11, display: 'grid', gap: 8, boxShadow: uiShadows.pressSmall, borderLeft: `6px solid ${panelTone.sky}` }, cardComplete: { borderColor: uiPalette.rewardDeep, borderLeftColor: panelTone.green, background: '#fff6cf' }, cardClaimed: { opacity: 0.82, borderLeftColor: panelTone.violet },
  cardHead: { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 7 }, status: { padding: '3px 7px', border: uiBorders.hairline, borderRadius: 999, fontSize: 11, fontWeight: uiType.weightHeavy, whiteSpace: 'nowrap' }, statusByState: (state) => ({ background: state === 'claimed' ? panelTone.violet : state === 'completed_unclaimed' ? panelTone.green : panelTone.sky, color: uiPalette.ink }), cardTitle: { minWidth: 0, fontSize: 15, lineHeight: 1.25, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  pinButton: { ...schoolButton('paper'), minWidth: 44, minHeight: 44, padding: '0 7px', fontSize: 11 }, objective: { margin: 0, fontSize: 13, lineHeight: 1.4, fontWeight: 700, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: uiType.numeric, fontSize: 12, fontWeight: uiType.weightHeavy }, progressTrack: { flex: 1, height: 10, overflow: 'hidden', border: uiBorders.hairline, borderRadius: 999, background: 'rgba(5,2,9,0.12)' }, progressFill: { height: '100%', background: `linear-gradient(90deg, ${panelTone.amber}, ${panelTone.sky})` },
  rewardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: uiPalette.rewardDeep, fontSize: 12, fontWeight: uiType.weightHeavy }, rewardChip: { padding: '4px 8px', border: uiBorders.hairline, borderRadius: 999, background: '#fff1b6', color: uiPalette.ink }, claimButton: { ...schoolButton('primary'), minWidth: 72, minHeight: 48, padding: '0 12px', fontSize: 14 }, pendingButton: { minHeight: 48, border: uiBorders.hairline, borderRadius: 7, background: '#9aa0a6', color: '#31363f', fontWeight: 900, cursor: 'not-allowed' },
}
