import { useEffect, useMemo, useState } from 'react'
import { fetchMyRankingEntry, getActiveSeason, subscribeStageRanking } from '../lib/firebaseRanking.js'
import { getRankingUser } from '../lib/guestRankingIdentity.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { formatRankScore, formatSurvivalTime, formatLastPlayedAt } from '../lib/userRanking.js'
import { stageTitle, t as translate, useT } from '../lib/i18n.js'
import RankingWindowTabs from './RankingWindowTabs.jsx'
import { displayNickname } from '../lib/userNickname.js'

const panelTone = {
  navy: '#18372f',
  sky: '#59c7ff',
  amber: '#f7d17e',
  green: '#7ee4c8',
  violet: '#b996ff',
  ink: '#050209',
  paper: '#fff8e8',
}

// 창마다 다른 문구. 일일과 주간은 리셋 주기가 달라서, 어느 보드를 보고 있는지와
// 언제 초기화되는지를 같이 읽히게 해야 "내 기록이 왜 사라졌지"가 안 생긴다.
const WINDOW_COPY = {
  allTime: { topKey: 'ranking.allTimeFirst', windowKey: 'ranking.allTimeWindow', ariaKey: 'ranking.allTimeBoardAria' },
  daily: { topKey: 'ranking.todayFirst', windowKey: 'ranking.dailyWindow', ariaKey: 'ranking.dailyBoardAria' },
  weekly: { topKey: 'ranking.weekFirst', windowKey: 'ranking.weeklyWindow', ariaKey: 'ranking.weeklyBoardAria' },
}

export default function StageRanking({ stageId = 'stage1', onBack }) {
  const t = useT()
  const stage = useMemo(() => getStageConfig(stageId), [stageId])
  const season = getActiveSeason()
  const [activeWindow, setActiveWindow] = useState('allTime')
  const [rows, setRows] = useState([])
  const [readError, setReadError] = useState(false)
  const [reading, setReading] = useState(true)
  const [readRevision, setReadRevision] = useState(0)
  const copy = WINDOW_COPY[activeWindow] ?? WINDOW_COPY.daily
  const authUser = useAuthStore((s) => s.user)
  const rankingSubmission = useGameStore((s) => s.rankingSubmission)
  const [myEntry, setMyEntry] = useState(null)

  // 보드는 상위 30개만 그린다. 0점(입장 등록)이 대부분인 보드에서 본인 엔트리가 잘려 나가도
  // "내 기록" 줄로 항상 보이게 정확한 경로를 따로 읽는다(게스트·로그인 공통).
  useEffect(() => {
    let active = true
    setMyEntry(null)
    void (async () => {
      try {
        const rankingUser = authUser?.uid ? authUser : await getRankingUser(null)
        const entry = await fetchMyRankingEntry(rankingUser, activeWindow, stageId)
        if (active) setMyEntry(entry ?? null)
      } catch {
        // 내 기록 읽기 실패는 보드 표시를 막지 않는다.
      }
    })()
    return () => { active = false }
  }, [stageId, activeWindow, authUser?.uid, rankingSubmission])
  const showMyRow = myEntry != null && !rows.some((row) => row.uid === myEntry.uid)

  useEffect(() => {
    // activeWindow가 의존성에 있어야 창을 바꿀 때 이전 구독이 해지된다.
    // 빠지면 구독이 쌓여 두 보드의 행이 번갈아 덮어써진다.
    setRows([])
    setReading(true)
    setReadError(false)
    return subscribeStageRanking(stageId, activeWindow, rows => { setRows(rows); setReadError(false); setReading(false) }, { limit: 30, onError: () => { setReadError(true); setReading(false) } })
  }, [stageId, activeWindow, readRevision])

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

      {!reading && !readError && <section style={styles.summary}>
        <TopWinner label={t(copy.topKey)} entry={rows[0]} />
      </section>}

      <div style={styles.seasonLine} title={`${activeWindow !== 'allTime' ? `${season.name} · ` : ''}${t(copy.windowKey)}`}>{activeWindow !== 'allTime' && `${season.name} · `}{t(copy.windowKey)}</div>

      {readError && <div role="alert">{t('ranking.readFailed')} <button type="button" style={styles.backTop} onClick={() => setReadRevision(value => value + 1)}>{t('common.retry')}</button></div>}

      {reading && <div role="status">{t('loading.ranking')}</div>}
      {!reading && !readError && <ol style={styles.list} aria-label={t(copy.ariaKey, { stage: stage.label })}>
        {rows.length > 0 ? rows.map((entry, index) => (
          <StageRankingRow key={entry.uid ?? `${activeWindow}-${index}`} entry={entry} rank={index + 1} />
        )) : (
          <li data-panel-state="empty" style={styles.empty}>{t('ranking.waiting')}</li>
        )}
      </ol>}
      {!reading && !readError && showMyRow && <ol style={styles.myList} aria-label={t('ranking.myRow')}>
        <StageRankingRow entry={myEntry} rankLabel={t('ranking.myRow')} testId="ranking-my-row" />
      </ol>}
    </div>
  )
}

function TopWinner({ label, entry }) {
  return (
    <div data-panel-state={entry ? 'winner' : 'empty'} style={styles.winnerCard}>
      <span style={styles.winnerLabel}>{label}</span>
      <strong style={styles.winnerName}>{displayNickname(entry?.displayName) || translate('ranking.waiting')}</strong>
      <span style={styles.winnerScore}>{entry ? formatRankScore(entry.score) : '-'}</span>
    </div>
  )
}

function StageRankingRow({ entry, rank, rankLabel, testId }) {
  const seconds = Math.floor((entry.timeMs ?? 0) / 1000)
  const top = rank != null && rank <= 3
  return (
    <li data-testid={testId} data-panel-state={top ? 'top-rank' : 'rank'} style={top ? { ...styles.row, ...styles.topRow } : styles.row}>
      <span style={styles.rank}>{rankLabel ?? translate('ranking.rankSuffix', { rank })}</span>
      <span style={styles.name}><span style={styles.nameText}>{displayNickname(entry.displayName) || translate('ranking.anonymous')}</span></span>
      <span style={styles.score}>{formatRankScore(entry.score)}</span>
      <span style={styles.meta}>{seconds > 0 ? formatSurvivalTime(seconds) : ''}{entry.cleared ? translate('ranking.clearedSuffix') : ''}</span>
      <span style={styles.lastPlayed}>{translate('ranking.lastPlayed')} · {formatLastPlayedAt(entry.lastPlayedAt ?? entry.lastStartedAt)}</span>
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
    background: `linear-gradient(180deg, ${panelTone.navy} 0%, #211c2b 54%, #131018 100%)`,
    color: '#f8f7f2',
    fontFamily: "'Segoe UI', sans-serif",
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '4px 2px 8px',
    borderBottom: `4px solid ${panelTone.sky}`,
  },
  heroText: { minWidth: 0, flex: '1 1 auto' },
  eyebrow: {
    minWidth: 0,
    overflow: 'hidden',
    color: panelTone.amber,
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
    minHeight: 44,
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
    background: panelTone.sky,
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
  // 360px(Z Flip 6)에서 KST 기간 문구가 두 줄로 갈리지 않게 한 줄 고정 + 좁은 폭에서 9px까지 축소.
  // 그래도 넘치는 긴 시즌명/주간 문구는 말줄임하고 전체 문구는 title로 남긴다.
  seasonLine: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#c8c1d7', fontSize: 'clamp(9px, 2.5vw, 11px)', lineHeight: 1.25, fontWeight: 900 },
  // 목록이 남는 높이를 전부 차지하고, 내 기록 줄은 그 바로 아래에 붙는다.
  list: {
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    margin: 0,
    padding: '2px 2px 4px',
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    listStyle: 'none',
  },
  myList: {
    flex: '0 0 auto',
    margin: 0,
    padding: '0 2px',
    overflow: 'hidden',
    scrollbarGutter: 'stable',
    listStyle: 'none',
  },
  // 순위 | 이름·기록·마지막 플레이 | 점수. 순위와 점수는 세 줄 전체에 걸쳐 세로 가운데에 놓인다.
  // flexShrink 0이 없으면 목록이 좁아질 때 카드가 48px로 눌려 이름과 기록 줄이 겹친다.
  row: {
    flex: '0 0 auto',
    minHeight: 48,
    display: 'grid',
    gridTemplateColumns: '56px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 3,
    padding: '8px 10px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.92)',
    color: '#050209',
    boxShadow: '0 3px 0 #050209',
    boxSizing: 'border-box',
  },
  topRow: { borderLeft: `6px solid ${panelTone.amber}`, paddingLeft: 6, background: panelTone.paper },
  lastPlayed: { gridColumn: 2, gridRow: 3, minWidth: 0, fontSize: 10, lineHeight: 1.3, overflowWrap: 'anywhere', color: '#51495a' },
  rank: { gridColumn: 1, gridRow: '1 / span 3', minWidth: 0, fontSize: 15, lineHeight: 1.1, fontWeight: 1000, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  name: { gridColumn: 2, gridRow: 1, minWidth: 0, display: 'flex', fontSize: 14, lineHeight: 1.25, fontWeight: 1000 },
  nameText: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  score: { gridColumn: 3, gridRow: '1 / span 3', justifySelf: 'end', fontSize: 15, lineHeight: 1, fontWeight: 1000, whiteSpace: 'nowrap' },
  meta: {
    gridColumn: 2,
    gridRow: 2,
    minWidth: 0,
    overflow: 'hidden',
    color: 'rgba(5,2,9,0.66)',
    fontSize: 10,
    lineHeight: 1.3,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  empty: {
    flex: '0 0 auto',
    padding: 18,
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.12)',
    color: '#c8c1d7',
    textAlign: 'center',
    fontWeight: 1000,
  },
}
