import { useEffect, useMemo, useState } from 'react'
import { getActiveSeason, subscribeStageRanking } from '../lib/firebaseRanking.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { formatRankScore, formatSurvivalTime } from '../lib/userRanking.js'
import { stageTitle, t as translate, useT } from '../lib/i18n.js'
import RankingWindowTabs from './RankingWindowTabs.jsx'

// 창마다 다른 문구. 일일과 주간은 리셋 주기가 달라서, 어느 보드를 보고 있는지와
// 언제 초기화되는지를 같이 읽히게 해야 "내 기록이 왜 사라졌지"가 안 생긴다.
const WINDOW_COPY = {
  daily: { topKey: 'ranking.todayFirst', windowKey: 'ranking.dailyWindow', ariaKey: 'ranking.dailyBoardAria' },
  weekly: { topKey: 'ranking.weekFirst', windowKey: 'ranking.weeklyWindow', ariaKey: 'ranking.weeklyBoardAria' },
}

export default function StageRanking({ stageId = 'stage1', onBack }) {
  const t = useT()
  const stage = useMemo(() => getStageConfig(stageId), [stageId])
  const season = useMemo(() => getActiveSeason(), [])
  const [activeWindow, setActiveWindow] = useState('daily')
  const [rows, setRows] = useState([])
  const copy = WINDOW_COPY[activeWindow] ?? WINDOW_COPY.daily

  useEffect(() => {
    // activeWindow가 의존성에 있어야 창을 바꿀 때 이전 구독이 해지된다.
    // 빠지면 구독이 쌓여 두 보드의 행이 번갈아 덮어써진다.
    setRows([])
    return subscribeStageRanking(stageId, activeWindow, setRows, { limit: 30 })
  }, [stageId, activeWindow])

  return (
    <div style={styles.root}>
      <header style={styles.hero}>
        <div style={styles.heroText}>
          <div style={styles.eyebrow}>{stage.label} · {stageTitle(stageId, stage.title)}</div>
          <h1 style={styles.title}>{t('ranking.stageTitle')}</h1>
        </div>
        <button type="button" style={styles.backTop} onClick={onBack}>{t('common.back')}</button>
      </header>

      <RankingWindowTabs
        ariaLabel={t('ranking.stageTabsAria')}
        value={activeWindow}
        onChange={setActiveWindow}
      />

      <section style={styles.summary}>
        <TopWinner label={t(copy.topKey)} entry={rows[0]} />
      </section>

      <div style={styles.seasonLine}>{season.name} · {t(copy.windowKey)}</div>

      <ol style={styles.list} aria-label={t(copy.ariaKey, { stage: stage.label })}>
        {rows.length > 0 ? rows.map((entry, index) => (
          <StageRankingRow key={entry.uid ?? `${activeWindow}-${index}`} entry={entry} rank={index + 1} />
        )) : (
          <li style={styles.empty}>{t('ranking.waiting')}</li>
        )}
      </ol>
    </div>
  )
}

function TopWinner({ label, entry }) {
  return (
    <div style={styles.winnerCard}>
      <span style={styles.winnerLabel}>{label}</span>
      <strong style={styles.winnerName}>{entry?.displayName || translate('ranking.waiting')}</strong>
      <span style={styles.winnerScore}>{entry ? formatRankScore(entry.score) : '-'}</span>
    </div>
  )
}

function StageRankingRow({ entry, rank }) {
  const seconds = Math.floor((entry.timeMs ?? 0) / 1000)
  return (
    <li style={styles.row}>
      <span style={styles.rank}>{translate('ranking.rankSuffix', { rank })}</span>
      <span style={styles.name}>{entry.displayName || translate('ranking.anonymous')}</span>
      <span style={styles.score}>{formatRankScore(entry.score)}</span>
      <span style={styles.meta}>{seconds > 0 ? formatSurvivalTime(seconds) : ''}{entry.cleared ? translate('ranking.clearedSuffix') : ''}</span>
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
  heroText: { minWidth: 0, flex: '1 1 auto' },
  eyebrow: {
    minWidth: 0,
    overflow: 'hidden',
    color: '#f7d17e',
    fontSize: 12,
    lineHeight: 1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  title: {
    margin: '5px 0 0',
    color: '#f8f7f2',
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 1000,
    textShadow: '0 3px 0 #050209',
  },
  backTop: {
    flex: '0 0 auto',
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
    // rank/score가 gridRow를 명시해 먼저 배치되므로, name도 칸을 못박지 않으면
    // 자동배치가 남은 3번 칸(72px)으로 밀어 이름이 잘리고 점수와 자리가 뒤바뀐다.
    gridColumn: 2,
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 14,
    lineHeight: 1.1,
    fontWeight: 1000,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  score: { gridRow: '1 / span 2', gridColumn: 3, justifySelf: 'end', fontSize: 14, lineHeight: 1, fontWeight: 1000 },
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
