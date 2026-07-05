import { useEffect, useMemo, useState } from 'react'
import { fetchStageRanking, getActiveSeason } from '../lib/firebaseRanking.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { formatRankScore, formatSurvivalTime } from '../lib/userRanking.js'

export default function StageRanking({ stageId = 'stage1', onBack }) {
  const stage = useMemo(() => getStageConfig(stageId), [stageId])
  const season = useMemo(() => getActiveSeason(), [])
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchStageRanking(stageId, 'daily', { limit: 100 }).catch(() => []).then((daily) => {
      if (!cancelled) setRows(daily)
    })
    return () => { cancelled = true }
  }, [stageId])

  return (
    <div style={styles.root}>
      <header style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>{stage.label} · {stage.title}</div>
          <h1 style={styles.title}>스테이지 랭킹</h1>
        </div>
        <button type="button" style={styles.backTop} onClick={onBack}>뒤로</button>
      </header>

      <section style={styles.summary}>
        <TopWinner label="오늘 1위" entry={rows[0]} />
      </section>

      <div style={styles.seasonLine}>{season.name} · 한국시간 당일 00:00:01 - 23:59:59 실시간 반영</div>

      <ol style={styles.list} aria-label={`${stage.label} 일일랭킹`}>
        {rows.length > 0 ? rows.map((entry, index) => (
          <StageRankingRow key={entry.uid ?? `daily-${index}`} entry={entry} rank={index + 1} />
        )) : (
          <li style={styles.empty}>기록 대기 중</li>
        )}
      </ol>
    </div>
  )
}

function TopWinner({ label, entry }) {
  return (
    <div style={styles.winnerCard}>
      <span style={styles.winnerLabel}>{label}</span>
      <strong style={styles.winnerName}>{entry?.displayName || '기록 대기 중'}</strong>
      <span style={styles.winnerScore}>{entry ? formatRankScore(entry.score) : '-'}</span>
    </div>
  )
}

function StageRankingRow({ entry, rank }) {
  const seconds = Math.floor((entry.timeMs ?? 0) / 1000)
  return (
    <li style={styles.row}>
      <span style={styles.rank}>{rank}위</span>
      <span style={styles.name}>{entry.displayName || '익명'}</span>
      <span style={styles.score}>{formatRankScore(entry.score)}</span>
      <span style={styles.meta}>{seconds > 0 ? formatSurvivalTime(seconds) : ''}{entry.cleared ? ' · 클리어' : ''}</span>
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
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '4px 2px 8px',
    borderBottom: '2px solid rgba(247,209,126,0.42)',
  },
  eyebrow: { color: '#f7d17e', fontSize: 12, lineHeight: 1, fontWeight: 1000 },
  title: {
    margin: '5px 0 0',
    color: '#f8f7f2',
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 1000,
    textShadow: '0 3px 0 #050209',
  },
  backTop: {
    minWidth: 62,
    minHeight: 38,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f6ead0',
    color: '#050209',
    fontWeight: 1000,
    boxShadow: '0 3px 0 #050209',
    cursor: 'pointer',
  },
  summary: { display: 'grid', gridTemplateColumns: '1fr', gap: 8 },
  winnerCard: {
    minWidth: 0,
    padding: '8px 9px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    boxShadow: '0 3px 0 #050209',
  },
  winnerLabel: { display: 'block', color: '#84202c', fontSize: 10, lineHeight: 1, fontWeight: 1000 },
  winnerName: {
    display: 'block',
    overflow: 'hidden',
    marginTop: 5,
    fontSize: 13,
    lineHeight: 1.1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  winnerScore: { display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1, fontWeight: 900 },
  seasonLine: { color: '#c8c1d7', fontSize: 11, lineHeight: 1.25, fontWeight: 900 },
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
  row: {
    minHeight: 45,
    display: 'grid',
    gridTemplateColumns: '48px minmax(0, 1fr) 72px',
    gridTemplateRows: '1fr auto',
    alignItems: 'center',
    columnGap: 8,
    padding: '7px 8px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.92)',
    color: '#050209',
    boxShadow: '0 3px 0 #050209',
    boxSizing: 'border-box',
  },
  rank: { gridRow: '1 / span 2', fontSize: 14, lineHeight: 1, fontWeight: 1000 },
  name: {
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 14,
    lineHeight: 1.1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  score: { gridRow: '1 / span 2', justifySelf: 'end', fontSize: 14, lineHeight: 1, fontWeight: 1000 },
  meta: {
    gridColumn: 2,
    marginTop: 3,
    color: 'rgba(5,2,9,0.66)',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 900,
  },
  empty: {
    padding: 18,
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.12)',
    color: '#c8c1d7',
    textAlign: 'center',
    fontWeight: 1000,
  },
}
