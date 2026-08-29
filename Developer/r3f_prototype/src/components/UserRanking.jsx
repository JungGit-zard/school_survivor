import { useMemo, useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import {
  createRankingRows,
  formatRankScore,
  formatSurvivalTime,
  loadLocalRankingEntries,
  buildLocalPlayerRankingEntry,
  RANKING_LIMIT,
} from '../lib/userRanking.js'
import { isFirebaseRankingConfigured, subscribeGlobalRanking } from '../lib/firebaseRanking.js'
import { getAdminRankingSeasonConfig } from '../lib/adminConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { t as translate, useT } from '../lib/i18n.js'
import RankingWindowTabs, { RANKING_WINDOWS } from './RankingWindowTabs.jsx'

export default function UserRanking({ onBack, entries }) {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const submission = useGameStore((s) => s.rankingSubmission)
  const retrySubmission = useGameStore((s) => s.retryRankingSubmission)
  const [activeWindow, setActiveWindow] = useState('daily')
  const [cloudBoards, setCloudBoards] = useState({ daily: null, weekly: null })
  const localRecords = useMemo(() => loadPlayerRecords(), [])

  const localEntry = useMemo(() => buildLocalPlayerRankingEntry(localRecords, user ?? {}), [localRecords, user])
  const totalRuns = localRecords.totalRuns ?? 0
  const bestScore = localEntry?.score ?? 0

  useEffect(() => {
    if (!isFirebaseRankingConfigured()) return
    const subscribe = (window) => subscribeGlobalRanking(window, (rows) => {
      setCloudBoards((boards) => ({ ...boards, [window]: rows }))
    }, { limit: RANKING_LIMIT })
    const unsubscribeDaily = subscribe('daily')
    const unsubscribeWeekly = subscribe('weekly')
    return () => {
      unsubscribeDaily()
      unsubscribeWeekly()
    }
  }, [])

  const rankingEntries = useMemo(() => {
    const providedEntries = Array.isArray(entries) ? entries : entries?.[activeWindow]
    if (providedEntries) return providedEntries
    const cloudEntries = cloudBoards[activeWindow]
    if (cloudEntries !== null) return cloudEntries
    return loadLocalRankingEntries(user ?? {})
  }, [entries, activeWindow, cloudBoards, user])

  const rows = useMemo(() => createRankingRows(rankingEntries), [rankingEntries])
  const notice = useMemo(() => buildSubmitNotice(submission), [submission])
  const season = useMemo(() => getAdminRankingSeasonConfig(), [])
  const activeCopy = RANKING_WINDOWS.find((window) => window.id === activeWindow) ?? RANKING_WINDOWS[0]
  const rewardSummary = useMemo(() => (
    season.rewardTiers.map((tier) => `${tier.label} ${tier.gold}G`).join(' · ')
  ), [season.rewardTiers])

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>TOP {RANKING_LIMIT}</div>
          <h1 style={styles.title}>{t('ranking.globalTitle')}</h1>
        </div>
        <div style={styles.playerStats}>
          <span style={styles.playerStatChip}>{t('ranking.myRuns')} <strong>{totalRuns}</strong>{t('ranking.myRunsUnit')}</span>
          <span style={styles.playerStatChip}>{t('ranking.myBest')} <strong>{formatRankScore(bestScore)}</strong></span>
        </div>
      </header>

      <RankingWindowTabs
        ariaLabel={t('ranking.tabsAria')}
        value={activeWindow}
        onChange={setActiveWindow}
      />

      <p style={styles.windowNote}>{t(activeCopy.noteKey)}</p>

      {notice && (
        <div
          style={styles.submitNotice(notice.tone)}
          role={notice.tone === 'bad' ? 'alert' : 'status'}
          aria-label={t('ranking.submit.noticeAria')}
        >
          <span style={styles.submitNoticeText}>{t(notice.key)}</span>
          {notice.canRetry && (
            <button type="button" style={styles.submitRetryButton} onClick={() => { void retrySubmission?.() }}>
              {t('ranking.submit.retry')}
            </button>
          )}
        </div>
      )}

      <div style={styles.tableHeader} aria-hidden="true">
        <span>{t('ranking.colRank')}</span>
        <span>{t('ranking.colUser')}</span>
        <span>{t('ranking.colScore')}</span>
      </div>

      <section style={styles.seasonPanel}>
        <span style={styles.seasonLabel}>{t('lobby.season')}</span>
        <strong style={styles.seasonName}>{season.seasonName}</strong>
        <span style={styles.seasonReward}>{rewardSummary}</span>
      </section>

      <ol style={styles.list} aria-label={t('ranking.listAria', { limit: RANKING_LIMIT })}>
        {rows.map((row) => (
          <RankingRow key={row.rank} row={row} />
        ))}
      </ol>

      <button type="button" style={styles.backButton} onClick={onBack}>
        {t('ranking.goBack')}
      </button>
    </div>
  )
}

// 시도조차 하지 않은 사유만 화이트리스트로 문구에 매핑한다. 모르는 사유가 들어와도
// 안내를 통째로 삼키면 예전과 똑같이 "빈 보드 + 침묵"이 되므로 일반 실패 문구로 떨어뜨린다.
const NOT_SUBMITTED_KEYS = {
  signedOut: 'ranking.submit.signedOut',
  unconfigured: 'ranking.submit.unconfigured',
  seasonOff: 'ranking.submit.seasonOff',
  progressUnavailable: 'ranking.submit.progressUnavailable',
}

// 제출 상태 → 배너 한 줄. "보드가 비었다"와 "내 기록이 안 올라갔다"를 가르는 유일한 지점이다.
export function buildSubmitNotice(submission) {
  const status = submission?.status
  if (status === 'pending') return { key: 'ranking.submit.pending', tone: 'neutral', canRetry: false }
  if (status === 'recorded') return { key: 'ranking.submit.recorded', tone: 'good', canRetry: false }
  if (status === 'notBest') return { key: 'ranking.submit.notBest', tone: 'neutral', canRetry: false }
  if (status === 'failed') {
    // 네트워크 실패만 재시도 버튼을 준다. 규칙 거부는 같은 페이로드를 다시 쏴도 또 거부된다.
    const network = submission.reason !== 'rejected'
    return {
      key: network ? 'ranking.submit.failedNetwork' : 'ranking.submit.failedRejected',
      tone: 'bad',
      canRetry: network,
    }
  }
  if (status === 'notSubmitted') {
    return { key: NOT_SUBMITTED_KEYS[submission.reason] ?? 'ranking.submit.failedRejected', tone: 'bad', canRetry: false }
  }
  return null
}

function RankingRow({ row }) {
  return (
    <li style={styles.row(row.empty, row.local)}>
      <span style={styles.rank}>{translate('ranking.rankSuffix', { rank: row.rank })}</span>
      <span style={styles.name}>
        {row.empty ? translate('ranking.noRecord') : row.displayName}
        {!row.empty && row.local && <span style={styles.localBadge}>ME</span>}
      </span>
      <span style={styles.score}>{row.empty ? '-' : formatRankScore(row.score)}</span>
      <span style={styles.stage}>{row.empty ? '' : `${row.stageLabel} · ${formatSurvivalTime(row.survivalSeconds)}${row.cleared ? translate('ranking.clearedSuffix') : ''}`}</span>
    </li>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '18px 14px calc(14px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #211c2b 0%, #131018 100%)',
    color: '#f8f7f2',
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '4px 2px 8px',
    borderBottom: '2px solid rgba(247,209,126,0.42)',
  },
  eyebrow: {
    color: '#f7d17e',
    fontSize: 12,
    lineHeight: 1,
    fontWeight: 1000,
    letterSpacing: 0,
  },
  title: {
    margin: '5px 0 0',
    color: '#f8f7f2',
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 1000,
    letterSpacing: 0,
    textShadow: '0 3px 0 #050209',
  },
  playerStats: {
    minWidth: 142,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  playerStatChip: {
    display: 'block',
    padding: '6px 8px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f7d17e',
    color: '#050209',
    boxShadow: '0 2px 0 #050209',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 900,
    textAlign: 'center',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '52px minmax(0, 1fr) 72px',
    gap: 8,
    padding: '0 10px',
    color: '#c8c1d7',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 900,
  },
  windowNote: {
    margin: 0,
    color: '#c8c1d7',
    fontSize: 11,
    lineHeight: 1.25,
    fontWeight: 900,
  },
  submitNotice: (tone) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: tone === 'bad' ? '#ff8a7a' : tone === 'good' ? '#8de08a' : '#e6e1f0',
    color: '#050209',
    boxShadow: '0 3px 0 #050209',
    fontSize: 11,
    lineHeight: 1.25,
    fontWeight: 900,
  }),
  submitNoticeText: {
    flex: 1,
    minWidth: 0,
  },
  submitRetryButton: {
    flex: '0 0 auto',
    minHeight: 32,
    padding: '0 10px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f7d17e',
    color: '#050209',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 1000,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #050209',
  },
  seasonPanel: {
    display: 'grid',
    gridTemplateColumns: '42px minmax(0, 1fr)',
    gap: '2px 8px',
    padding: '8px 10px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    boxShadow: '0 3px 0 #050209',
  },
  seasonLabel: {
    gridRow: '1 / span 2',
    alignSelf: 'center',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 1000,
  },
  seasonName: {
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 13,
    lineHeight: 1.1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  seasonReward: {
    minWidth: 0,
    overflow: 'hidden',
    color: 'rgba(5,2,9,0.7)',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  list: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    margin: 0,
    padding: '2px 2px 4px',
    overflowY: 'auto',
    listStyle: 'none',
  },
  row: (empty, local) => ({
    minHeight: 45,
    display: 'grid',
    gridTemplateColumns: '52px minmax(0, 1fr) 72px',
    gridTemplateRows: '1fr auto',
    alignItems: 'center',
    columnGap: 8,
    padding: '7px 8px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: empty ? 'rgba(248,247,242,0.12)' : local ? '#f7d17e' : 'rgba(248,247,242,0.92)',
    color: empty ? '#8f879e' : '#050209',
    boxShadow: empty ? '0 2px 0 #050209' : '0 3px 0 #050209',
    boxSizing: 'border-box',
  }),
  rank: {
    gridRow: '1 / span 2',
    fontSize: 15,
    lineHeight: 1,
    fontWeight: 1000,
  },
  name: {
    // rank/score가 gridRow를 명시해 먼저 배치되므로, name도 칸을 못박지 않으면
    // 자동배치가 남은 3번 칸(72px)으로 밀어 이름이 잘리고 점수와 자리가 뒤바뀐다.
    gridColumn: 2,
    minWidth: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    lineHeight: 1.1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  localBadge: {
    flex: '0 0 auto',
    padding: '2px 5px',
    border: '1.5px solid #050209',
    borderRadius: 6,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 9,
    lineHeight: 1,
    fontWeight: 1000,
  },
  score: {
    gridRow: '1 / span 2',
    gridColumn: 3,
    justifySelf: 'end',
    fontSize: 15,
    lineHeight: 1,
    fontWeight: 1000,
  },
  stage: {
    gridColumn: 2,
    marginTop: 3,
    overflow: 'hidden',
    color: 'rgba(5,2,9,0.66)',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  backButton: {
    width: '100%',
    minHeight: 48,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 17,
    lineHeight: 1,
    fontWeight: 1000,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #050209',
  },
}
