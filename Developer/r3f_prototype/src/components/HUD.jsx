import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore.js'

const UPGRADES = [
  { key: 'pencilDamage', label: '연필 데미지 +6', desc: '투척 연필의 공격력 증가' },
  { key: 'pencilCount',  label: '연필 발사 수 +1', desc: '동시에 날리는 연필 수 증가 (최대 4)' },
  { key: 'pencilPierce', label: '연필 관통 +1',   desc: '연필이 적을 관통 (최대 3회)' },
  { key: 'bagDamage',    label: '책가방 피해 +8',  desc: '휘두르기 타격 피해 증가' },
  { key: 'bagRadius',    label: '책가방 사거리 +',  desc: '휘두르는 타격 범위 증가' },
  { key: 'unlockBell',   label: '🔔 벨 해금',      desc: '8방향 충격파 스킬 해금' },
  { key: 'bellDamage',   label: '벨 데미지 +10',   desc: '충격파 공격력 증가' },
  { key: 'unlockStun',   label: '⚡ 전기충격 해금', desc: '체인 스턴건 스킬 해금' },
  { key: 'stunChain',    label: '전기 연쇄 +1',    desc: '연쇄 대상 수 증가 (최대 4)' },
  { key: 'moveSpeed',    label: '이동속도 +10%',   desc: '플레이어 이동속도 증가' },
  { key: 'maxHealth',    label: '최대 체력 +20',   desc: '최대 HP 및 현재 HP 증가' },
]

function pickThree(level) {
  const available = UPGRADES.filter((u) => !u.key.startsWith('bag') && u.key !== 'pencilCount')
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export default function HUD() {
  const player    = useGameStore((s) => s.player)
  const weapons   = useGameStore((s) => s.weapons)
  const phase     = useGameStore((s) => s.phase)
  const elapsed   = useGameStore((s) => s.elapsedMs)
  const applyUpgrade      = useGameStore((s) => s.applyUpgrade)
  const resumeFromLevelup = useGameStore((s) => s.resumeFromLevelup)
  const resetGame         = useGameStore((s) => s.resetGame)
  const togglePause       = useGameStore((s) => s.togglePause)

  const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0')
  const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')

  const choices = phase === 'levelup' ? pickThree(player.level) : []
  const lowHp   = player.hp / player.maxHp < 0.3

  // CSS 키프레임 주입 (최초 1회)
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'hud-keyframes'
    style.textContent = `
      @keyframes hpBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
      @keyframes vignettePulse { 0%,100%{opacity:0.40} 50%{opacity:0.65} }
    `
    if (!document.getElementById('hud-keyframes')) document.head.appendChild(style)
    return () => document.getElementById('hud-keyframes')?.remove()
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyP' || event.repeat) return
      togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePause])

  return (
    <div style={styles.root}>
      {/* ── 저체력 뷰네트 ── */}
      {lowHp && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.55) 100%)',
          animation: 'vignettePulse 0.8s ease-in-out infinite',
        }} />
      )}
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div style={styles.timer}>{mins}:{secs}</div>
        <div style={styles.level}>Lv.{player.level}</div>
      </div>

      {/* ── HP bar ── */}
      <div style={styles.hpRow}>
        <span style={styles.hpLabel}>HP</span>
        <div style={styles.barBg}>
          <div style={{
            ...styles.barFill,
            width: `${(player.hp / player.maxHp) * 100}%`,
            background: lowHp ? '#ff2030' : '#e03040',
            animation: lowHp ? 'hpBlink 0.6s ease-in-out infinite' : 'none',
          }} />
        </div>
        <span style={styles.hpNum}>{player.hp}/{player.maxHp}</span>
      </div>

      {/* ── XP bar ── */}
      <div style={styles.xpRow}>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${(player.xp / player.xpToNext) * 100}%`, background: '#60d060' }} />
        </div>
      </div>

      {/* ── Active weapons ── */}
      <div style={styles.weaponRow}>
        {Object.entries(weapons).filter(([, w]) => w.active).map(([k, w]) => (
          <div key={k} style={styles.weaponChip}>{w.label}</div>
        ))}
      </div>

      {/* ── Modals ── */}
      {phase === 'levelup' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>레벨 업! Lv.{player.level}</h2>
            <div style={styles.choices}>
              {choices.map((c) => (
                <button key={c.key} style={styles.choiceBtn} onClick={() => applyUpgrade(c.key)}>
                  <div style={styles.choiceLabel}>{c.label}</div>
                  <div style={styles.choiceDesc}>{c.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ ...styles.modalTitle, color: '#ff4060' }}>GAME OVER</h2>
            <p style={{ color: '#ccc', marginBottom: 24 }}>생존 시간: {mins}:{secs}</p>
            <button style={styles.restartBtn} onClick={resetGame}>다시 시작</button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div style={styles.overlay}>
          <div style={styles.pausePanel}>
            <h2 style={styles.modalTitle}>PAUSED</h2>
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ ...styles.modalTitle, color: '#ffd040' }}>STAGE CLEAR!</h2>
            <p style={{ color: '#ccc', marginBottom: 24 }}>클리어 시간: {mins}:{secs}</p>
            <button style={styles.restartBtn} onClick={resetGame}>다시 시작</button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    fontFamily: "'Segoe UI', sans-serif", userSelect: 'none',
  },
  topBar: {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 24, alignItems: 'center',
  },
  timer: { color: '#fff', fontSize: 28, fontWeight: 700, textShadow: '0 2px 6px #000' },
  level: { color: '#ffd040', fontSize: 20, fontWeight: 700, textShadow: '0 2px 6px #000' },
  hpRow: {
    position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 8, width: 320,
  },
  hpLabel: { color: '#fff', fontSize: 13, fontWeight: 700, width: 22 },
  hpNum:   { color: '#fff', fontSize: 12, width: 60, textAlign: 'right' },
  xpRow: {
    position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
    width: 320,
  },
  barBg: {
    flex: 1, height: 10, background: '#333', borderRadius: 5, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5, transition: 'width 0.15s' },
  weaponRow: {
    position: 'absolute', bottom: 72, left: 16,
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  weaponChip: {
    background: 'rgba(0,0,0,0.55)', color: '#fff',
    fontSize: 12, padding: '3px 8px', borderRadius: 4, border: '1px solid #555',
  },
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto',
  },
  modal: {
    background: '#1a1028', border: '2px solid #6040a0',
    borderRadius: 16, padding: '36px 40px', textAlign: 'center', minWidth: 440,
  },
  modalTitle: { color: '#fff', margin: '0 0 24px', fontSize: 26, fontWeight: 800 },
  pausePanel: {
    background: 'rgba(20, 14, 32, 0.82)', border: '2px solid #8060c0',
    borderRadius: 12, padding: '28px 44px', textAlign: 'center',
  },
  choices: { display: 'flex', gap: 16, justifyContent: 'center' },
  choiceBtn: {
    background: '#2a1840', border: '2px solid #8060c0', borderRadius: 10,
    color: '#fff', cursor: 'pointer', padding: '16px 18px', width: 130,
    textAlign: 'center', transition: 'background 0.15s',
  },
  choiceLabel: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  choiceDesc:  { fontSize: 11, color: '#bbb', lineHeight: 1.4 },
  restartBtn: {
    background: '#4030a0', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    padding: '12px 32px',
  },
}
