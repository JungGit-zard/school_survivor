import { useEffect, useRef, useState } from 'react'
import { enemyPool } from '../lib/refs.js'
import { enemyTypeFromCode } from '../lib/enemyEntityPool.js'
import { findLiveChiefInto } from '../lib/stageChiefContent.js'
import { getZombieTypeLabel } from '../lib/zombieEncyclopedia.js'
import { useT } from '../lib/i18n.js'
import { uiShadows, uiType } from '../lib/uiStyle.js'

// 치프(정예) 좀비 이름표 + 미니 HP바(간이판). 살아 있는 치프가 있을 때만 화면 상단 가운데에 한 줄로 뜬다.
// 390px 폰 기준: 폭 240px(화면이 더 좁으면 100% − 32px), 이름 14px 굵게 + 높이 8px 바. 터치를 막지 않는다(pointerEvents none).
// 위치: 상단 형태 배너·투사체 경고(top 72) 아래, Stage 6 훈화 배너(top 150) 위 — top 112.
// 풀(enemyPool)을 10Hz로 읽는다. 렌더 루프와 무관하고 일시정지 중에는 값이 그대로라 화면도 멈춘다.
export const CHIEF_STATUS_POLL_MS = 100

export function chiefStatusView(pool, scratch) {
  const live = findLiveChiefInto(pool, scratch)
  if (live.index < 0 || !(live.maxHp > 0)) return null
  const type = enemyTypeFromCode(live.typeCode)
  if (!type) return null
  return { type, ratio: Math.max(0, Math.min(1, live.hp / live.maxHp)) }
}

export default function ChiefStatusBar({ phase, hidden = false }) {
  const t = useT()
  const [view, setView] = useState(null)
  const scratchRef = useRef({ index: -1, typeCode: 0, hp: 0, maxHp: 0 })
  const active = phase === 'playing'
  useEffect(() => {
    if (!active) { setView(null); return undefined }
    const read = () => {
      const next = chiefStatusView(enemyPool, scratchRef.current)
      setView((prev) => {
        if (!next) return prev ? null : prev
        if (prev && prev.type === next.type && Math.abs(prev.ratio - next.ratio) < 0.005) return prev
        return next
      })
    }
    read()
    const timer = window.setInterval(read, CHIEF_STATUS_POLL_MS)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active || hidden || !view) return null
  return (
    <div data-testid="chief-status-bar" data-chief-type={view.type} role="status" aria-live="polite" style={styles.wrap}>
      <div style={styles.row}>
        <span style={styles.badge}>{t('hud.chief.badge')}</span>
        <span style={styles.name}>{getZombieTypeLabel(view.type)}</span>
      </div>
      <div style={styles.track} aria-hidden="true">
        <div data-testid="chief-status-fill" style={{ ...styles.fill, width: `${Math.round(view.ratio * 1000) / 10}%` }} />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'absolute',
    top: 112,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 240,
    maxWidth: 'calc(100% - 32px)',
    boxSizing: 'border-box',
    padding: '5px 10px 7px',
    border: '2px solid #ffb347',
    borderRadius: 10,
    background: 'rgba(36, 18, 6, 0.88)',
    boxShadow: uiShadows.pressSmall,
    fontFamily: uiType.family,
    pointerEvents: 'none',
  },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4, minWidth: 0 },
  badge: {
    flex: '0 0 auto',
    padding: '1px 6px',
    borderRadius: 6,
    background: '#ffb347',
    color: '#2a1404',
    fontSize: 11,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.3,
  },
  name: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#fff1d6',
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.2,
  },
  track: { height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #ff6a3d, #ffb347)' },
}
