import { useMemo, useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import {
  createRankingRows,
  formatRankScore,
  formatSurvivalTime,
  loadLocalRankingEntries,
  buildLocalPlayerRankingEntry,
  mergeCloudEntries,
} from '../lib/userRanking.js'
import { fetchGlobalRanking, isFirebaseRankingConfigured } from '../lib/firebaseRanking.js'
import { getAdminRankingSeasonConfig } from '../lib/adminConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'

const WINDOWS = [
  { id: 'daily', label: '일일랭킹', note: '한국시간 당일 00:00:01 - 23:59:59 실시간 합산' },
  { id: 'weekly', label: '주간랭킹', note: '한국시간 월요일 00:00:01 - 일요일 23:59:59 누적 합산' },
]

export default function UserRanking({ onBack, entries }) {
  const user = useAuthStore((s) => s.user)
  const [activeWindow, setActiveWindow] = useState('daily')
  const [cloudBoards, setCloudBoards] = useState({ daily: null, weekly: null })
  const localRecords = useMemo(() => loadPlayerRecords(), [])

  const localEntry = useMemo(() => buildLocalPlayerRankingEntry(localRecords, user ?? {}), [localRecords, user])
  const totalRuns = localRecords.totalRuns ?? 0
  const bestScore = localEntry?.score ?? 0

  useEffect(() => {
    if (!isFirebaseRankingConfigured()) return
    Promise.all([
      fetchGlobalRanking('daily', { limit: 100 }).catch(() => []),
      fetchGlobalRanking('weekly', { limit: 100 }).catch(() => []),
    ]).then(([daily, weekly]) => setCloudBoards({ daily, weekly }))
  }, [])

  const rankingEntries = useMemo(() => {
    const providedEntries = Array.isArray(entries) ? entries : entries?.[activeWindow]
    if (providedEntries) return providedEntries
    const cloudEntries = cloudBoards[activeWindow]
    if (cloudEntries) {
      return mergeCloudEntries(localEntry, cloudEntries, user?.uid)
    }
    return loadLocalRankingEntries(user ?? {})
  }, [entries, activeWindow, cloudBoards, localEntry, user])

  const rows = useMemo(() => createRankingRows(rankingEntries), [rankingEntries])
  const season = useMemo(() => getAdminRankingSeasonConfig(), [])
  const activeCopy = WINDOWS.find((window) => window.id === activeWindow) ?? WINDOWS[0]
  const rewardSummary = useMemo(() => (
    season.rewardTiers.map((tier) => `${tier.label} ${tier.gold}G`).join(' · ')
  ), [season.rewardTiers])

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>TOP 100</div>
          <h1 style={styles.title}>통합 랭킹</h1>
        </div>
        <div style={styles.playerStats}>
          <span style={styles.playerStatChip}>내 누적플레이 <strong>{totalRuns}</strong>판</span>
          <span style={styles.playerStatChip}>내 시즌최고점 <strong>{formatRankScore(bestScore)}</strong></span>
        </div>
      </header>

      <nav style={styles.tabs} aria-label="통합 랭킹 탭">
        {WINDOWS.map((window) => (
          <button
            key={window.id}
            type="button"
            style={window.id === activeWindow ? styles.tabActive : styles.tab}
            onClick={() => setActiveWindow(window.id)}
          >
            {window.label}
          </button>
        ))}
      </nav>

      <p style={styles.windowNote}>{activeCopy.note}</p>

      <div style={styles.tableHeader} aria-hidden="true">
        <span>순위</span>
        <span>유저</span>
        <span>점수</span>
      </div>

      <section style={styles.seasonPanel}>
        <span style={styles.seasonLabel}>시즌</span>
        <strong style={styles.seasonName}>{season.seasonName}</strong>
        <span style={styles.seasonReward}>{rewardSummary}</span>
      </section>

      <ol style={styles.list} aria-label="유저랭킹 1위부터 100위까지">
        {rows.map((row) => (
          <RankingRow key={row.rank} row={row} />
        ))}
      </ol>

      <button type="button" style={styles.backButton} onClick={onBack}>
        돌아가기
      </button>
    </div>
  )
}

function RankingRow({ row }) {
  return (
    <li style={styles.row(row.empty, row.local)}>
      <span style={styles.rank}>{row.rank}위</span>
      <span style={styles.name}>
        {row.empty ? '기록 없음' : row.displayName}
        {!row.empty && row.local && <span style={styles.localBadge}>ME</span>}
      </span>
      <span style={styles.score}>{row.empty ? '-' : formatRankScore(row.score)}</span>
      <span style={styles.stage}>{row.empty ? '' : `${row.stageLabel} · ${formatSurvivalTime(row.survivalSeconds)}${row.cleared ? ' · 클리어' : ''}`}</span>
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
    padding: '18px 14px 14px',
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
  tabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  tab: {
    minHeight: 42,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f6ead0',
    color: '#050209',
    fontSize: 14,
    fontWeight: 1000,
    boxShadow: '0 3px 0 #050209',
    cursor: 'pointer',
  },
  tabActive: {
    minHeight: 42,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f7d17e',
    color: '#050209',
    fontSize: 14,
    fontWeight: 1000,
    boxShadow: '0 3px 0 #050209',
    cursor: 'pointer',
  },
  windowNote: {
    margin: 0,
    color: '#c8c1d7',
    fontSize: 11,
    lineHeight: 1.25,
    fontWeight: 900,
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
