import { useEffect, useRef, useState } from 'react'
import { MISSION_BY_ID } from '../lib/missionCatalog.js'
import { isMissionVisible } from '../lib/missionProgress.js'
import { missionTitle, useT } from '../lib/i18n.js'
import { uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

const TOAST_MS = 2400

// 플레이 중 보이는 미션이 완료되는 순간 짧게 알린다. 프레임 경로에는 아무것도 붙이지 않는다:
// 스토어 구독에서 completed 참조가 바뀐 경우(미션 이벤트)만 비교하고, 리렌더는 토스트가 뜨고 사라질 때뿐이다.
// 게스트(로그아웃)는 미션 체인이 없으므로 알리지 않는다.
export default function MissionCompleteToast({ hidden }) {
  const t = useT()
  const [toast, setToast] = useState(null)
  const timerRef = useRef(0)

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      const next = state.missionProgress?.completed
      const before = prev.missionProgress?.completed
      if (!next || next === before) return
      // 클라우드 불러오기(hydration)로 한꺼번에 채워진 완료는 이번 판의 달성이 아니다.
      if (state.missionSyncState !== prev.missionSyncState) return
      if (state.phase !== 'playing' || !useAuthStore.getState().user?.uid) return
      const fresh = []
      for (const id of Object.keys(next)) {
        if (before?.[id] || !MISSION_BY_ID[id]) continue
        if (isMissionVisible(state.missionProgress, id)) fresh.push(id)
      }
      if (fresh.length === 0) return
      setToast((current) => ({
        id: fresh[0],
        count: (current?.count ?? 0) + fresh.length,
        key: Date.now(),
      }))
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setToast(null), TOAST_MS)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timerRef.current)
    }
  }, [])

  if (!toast || hidden) return null
  const mission = MISSION_BY_ID[toast.id]
  return (
    <div key={toast.key} role="status" data-testid="mission-complete-toast" className="mission-toast-in" style={styles.root}>
      <style>{TOAST_CSS}</style>
      <strong style={styles.head}>★ {t('missions.toast.completed')}</strong>
      <span style={styles.title}>{missionTitle(mission)}{toast.count > 1 ? ` ${t('missions.toast.more', { count: toast.count - 1 })}` : ''}</span>
    </div>
  )
}

const TOAST_CSS = `
@keyframes missionToastIn { from { transform: translateY(-8px); opacity: 0 } to { transform: none; opacity: 1 } }
.mission-toast-in { animation: missionToastIn 180ms ease-out both }
@media (prefers-reduced-motion: reduce) { .mission-toast-in { animation: none } }
`

const styles = {
  root: { position: 'absolute', top: 'max(116px, calc(env(safe-area-inset-top, 0px) + 102px))', left: 14, zIndex: 6, maxWidth: 'min(240px, calc(100% - 28px))', display: 'grid', gap: 2, padding: '7px 11px', border: uiBorders.strong, borderRadius: 9, background: '#fff6cf', color: uiPalette.ink, boxShadow: uiShadows.pressSmall, pointerEvents: 'none', fontFamily: uiType.family },
  head: { fontSize: 12, fontWeight: uiType.weightHeavy, color: uiPalette.rewardDeep },
  title: { fontSize: 13, fontWeight: 800, lineHeight: 1.25, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
}
