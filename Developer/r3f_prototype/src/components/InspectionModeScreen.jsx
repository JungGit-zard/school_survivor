import { useEffect, useState } from 'react'

function formatDateTime(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '미정'
}

function formatRemaining(endsAt, nowMs) {
  const remainingMs = Math.max(0, Number(endsAt) - nowMs)
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}시간 ${minutes}분 ${seconds}초`
    : `${minutes}분 ${seconds}초`
}

export default function InspectionModeScreen({ state }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const endsAt = Number(state?.endsAt)

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main data-testid="inspection-mode-screen" style={styles.page}>
      <section style={styles.card} aria-live="polite">
        <p style={styles.kicker}>Escape! zombie school</p>
        <h1 style={styles.title}>서비스 점검 중</h1>
        <p style={styles.message}>{state?.message || '서비스 점검 중입니다.'}</p>
        <dl style={styles.details}>
          <div>
            <dt>종료 예정</dt>
            <dd>{formatDateTime(endsAt)}</dd>
          </div>
          <div>
            <dt>남은 시간</dt>
            <dd data-testid="inspection-remaining-time">{formatRemaining(endsAt, nowMs)}</dd>
          </div>
        </dl>
        <button type="button" style={styles.reloadButton} onClick={() => window.location.reload()}>
          새로고침
        </button>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box',
    background: 'linear-gradient(145deg, #17131d, #38212b)', color: '#fff8f2', fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif",
  },
  card: {
    width: 'min(560px, 100%)', boxSizing: 'border-box', padding: '36px 28px', borderRadius: 20,
    border: '1px solid #ffc7a1', background: '#241b27', textAlign: 'center', boxShadow: '0 20px 60px #0008',
  },
  kicker: { margin: 0, color: '#ffc7a1', fontWeight: 800, letterSpacing: '0.06em' },
  title: { margin: '12px 0', fontSize: 'clamp(30px, 8vw, 46px)' },
  message: { margin: '0 auto', maxWidth: 400, fontSize: 17, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  details: { display: 'grid', gap: 10, margin: '28px 0', textAlign: 'left' },
  reloadButton: { minHeight: 46, padding: '10px 24px', border: 0, borderRadius: 10, background: '#ffc7a1', color: '#281720', fontWeight: 900, cursor: 'pointer' },
}
