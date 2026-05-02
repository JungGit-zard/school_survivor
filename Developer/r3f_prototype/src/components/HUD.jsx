import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { bagSwingState } from '../lib/refs.js'

const UPGRADES = [
  { key: 'pencilDamage', icon: 'pencil', labelFn: (w) => `연필 데미지 +${Math.round(3 / w.pencilThrow.damage * 100)}%`, desc: '투척 연필의 공격력 증가' },
  { key: 'pencilCount',  icon: 'pencil', label: '연필 발사 수 +1', desc: '동시에 날리는 연필 수 증가 (최대 4)' },
  { key: 'pencilPierce', icon: 'pencil', label: '연필 관통 +1',   desc: '연필이 적을 관통 (최대 3회)' },
  { key: 'bagDamage',    icon: 'ruler',  labelFn: (w) => `30센치 자 피해 +${Math.round(8 / w.schoolBag.damage * 100)}%`, desc: '자 휘두르기 타격 피해 증가' },
  { key: 'bagRadius',    icon: 'ruler',  label: '30센치 자 사거리 +',  desc: '자 휘두르기 타격 범위 증가' },
  { key: 'tumblerCount', icon: 'tumbler', label: '텀블러 개수 +1', desc: '회전 텀블러 개수 증가 (최대 3개)' },
  { key: 'tumblerDamage', icon: 'tumbler', labelFn: (w) => `텀블러 피해 +${Math.round(4 / w.tumbler.damage * 100)}%`, desc: '회전 텀블러 접촉 피해 증가' },
  { key: 'unlockFlask',  icon: 'flask',  label: '플라스크 해금', desc: '밀집한 적에게 광역 폭발 투척' },
  { key: 'flaskDamage',  icon: 'flask',  labelFn: (w) => `플라스크 피해 +${Math.round(10 / w.scienceFlask.damage * 100)}%`, desc: '폭발 피해 증가' },
  { key: 'flaskRadius',  icon: 'flask',  label: '플라스크 범위 +', desc: '폭발 반경 증가' },
  { key: 'unlockBell',   icon: 'bell',   label: '벨 해금',      desc: '8방향 충격파 스킬 해금' },
  { key: 'bellDamage',   icon: 'bell',   labelFn: (w) => `벨 데미지 +${Math.round(5 / w.bell.damage * 100)}%`, desc: '충격파 공격력 증가' },
  { key: 'unlockStun',   icon: 'stun',   label: '전기충격 해금', desc: '체인 스턴건 스킬 해금' },
  { key: 'stunChain',    icon: 'stun',   label: '전기 연쇄 +1',    desc: '연쇄 대상 수 증가 (최대 4)' },
  { key: 'moveSpeed',    icon: 'speed',  label: '이동속도 +10%',   desc: '플레이어 이동속도 증가' },
  { key: 'maxHealth',    icon: 'health', label: '최대 체력 +20',   desc: '최대 HP 및 현재 HP 증가' },
]

function pickThree(level, weapons) {
  const available = UPGRADES.filter((u) => {
    if (u.key === 'unlockFlask')                          return !weapons.scienceFlask?.active
    if (u.key === 'flaskDamage' || u.key === 'flaskRadius') return  weapons.scienceFlask?.active
    if (u.key === 'unlockBell')                           return !weapons.bell?.active
    if (u.key === 'bellDamage')                           return  weapons.bell?.active
    if (u.key === 'unlockStun')                           return !weapons.stunGun?.active
    if (u.key === 'stunChain')                            return  weapons.stunGun?.active
    return true
  })
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

function UpgradeIcon({ type }) {
  return (
    <div style={styles.iconBox}>
      {type === 'pencil' && (
        <div style={styles.pencilIcon}>
          <span style={styles.pencilLead} />
          <span style={styles.pencilBody} />
          <span style={styles.pencilEraser} />
        </div>
      )}
      {type === 'ruler' && (
        <div style={styles.rulerIcon}>
          <span style={styles.rulerEdge} />
          <span style={styles.rulerMarkA} />
          <span style={styles.rulerMarkB} />
          <span style={styles.rulerMarkC} />
        </div>
      )}
      {type === 'flask' && (
        <div style={styles.flaskIcon}>
          <span style={styles.flaskNeck} />
          <span style={styles.flaskLiquid} />
        </div>
      )}
      {type === 'tumbler' && (
        <div style={styles.tumblerIcon}>
          <span style={styles.tumblerCap} />
        </div>
      )}
      {type === 'bell' && (
        <div style={styles.bellIcon}>
          <span style={styles.bellKnob} />
          <span style={styles.bellClapper} />
        </div>
      )}
      {type === 'stun' && (
        <div style={styles.stunIcon}>
          <span style={styles.stunBolt} />
        </div>
      )}
      {type === 'speed' && (
        <div style={styles.speedIcon}>
          <span style={styles.speedLine1} />
          <span style={styles.speedLine2} />
          <span style={styles.speedLine3} />
        </div>
      )}
      {type === 'health' && (
        <div style={styles.healthIcon}>
          <span style={styles.healthH} />
          <span style={styles.healthV} />
        </div>
      )}
    </div>
  )
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

  // phase가 'levelup'으로 바뀌는 순간 한 번만 고정 — RAF re-render에 흔들리지 않음
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const choices = useMemo(() => phase === 'levelup' ? pickThree(player.level, weapons) : [], [phase])
  const lowHp   = player.hp / player.maxHp < 0.3

  // 자 쿨타임 비율 (1=준비됨, 0=쿨타임 시작 직후) — RAF로 DOM 갱신 없이 폴링
  const [bagReady, setBagReady] = useState(1)
  useEffect(() => {
    let raf
    const poll = () => {
      const elapsed = performance.now() - bagSwingState.lastFired
      setBagReady(Math.min(1, elapsed / bagSwingState.cooldown))
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [])

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

      {/* ── 자 쿨타임 UI (HP바 좌상단, 원형) ── */}
      <div style={styles.cdWrap}>
        <div style={styles.cdRing}>
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ display: 'block' }}>
            {/* 검정 배경 원 */}
            <circle cx="21" cy="21" r="20" fill="#111" stroke="#333" strokeWidth="1" />
            {/* 황색 진행 링 */}
            <circle
              cx="21" cy="21" r="15"
              fill="none"
              stroke={bagReady >= 1 ? '#ffd23c' : '#8a6800'}
              strokeWidth="5"
              strokeLinecap="butt"
              strokeDasharray={`${2 * Math.PI * 15}`}
              strokeDashoffset={`${2 * Math.PI * 15 * (1 - bagReady)}`}
              transform="rotate(-90 21 21)"
            />
          </svg>
          <span style={styles.cdIcon}>자</span>
        </div>
        <span style={styles.cdTime}>
          {bagReady >= 1 ? 'OK' : `${((1 - bagReady) * (bagSwingState.cooldown / 1000)).toFixed(1)}s`}
        </span>
      </div>

      {/* ── Modals ── */}
      {phase === 'levelup' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>레벨 업! Lv.{player.level}</h2>
            <div style={styles.choices}>
              {choices.map((c) => (
                <button key={c.key} style={styles.choiceBtn} onClick={() => applyUpgrade(c.key)}>
                  <UpgradeIcon type={c.icon} />
                  <div style={styles.choiceLabel}>{c.labelFn ? c.labelFn(weapons) : c.label}</div>
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
  cdWrap: {
    position: 'absolute',
    bottom: 68,
    left: 'calc(50% - 160px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    pointerEvents: 'none',
  },
  cdRing: {
    position: 'relative', width: 42, height: 42,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cdIcon: {
    position: 'absolute',
    fontSize: 13, fontWeight: 700, color: '#ffd23c',
    textShadow: '0 1px 3px #000', userSelect: 'none',
  },
  cdTime: {
    color: '#ffd23c', fontSize: 10, fontWeight: 600,
    textShadow: '0 1px 2px #000', letterSpacing: 0.5,
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
    color: '#fff', cursor: 'pointer', padding: '12px 14px 14px', width: 142,
    textAlign: 'center', transition: 'background 0.15s',
  },
  iconBox: {
    position: 'relative', width: 54, height: 42, margin: '0 auto 10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pencilIcon: { position: 'relative', width: 46, height: 12, transform: 'rotate(-22deg)' },
  pencilLead: {
    position: 'absolute', left: 0, top: 1, width: 0, height: 0,
    borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '10px solid #1c1c22',
  },
  pencilBody: {
    position: 'absolute', left: 9, top: 1, width: 27, height: 10,
    background: '#ffcf24', border: '2px solid #111', boxSizing: 'border-box',
  },
  pencilEraser: {
    position: 'absolute', right: 0, top: 1, width: 10, height: 10,
    background: '#f05a78', border: '2px solid #111', boxSizing: 'border-box',
  },
  rulerIcon: {
    position: 'relative', width: 12, height: 46, background: '#f6dd59',
    border: '3px solid #111', borderRadius: 2, transform: 'rotate(-34deg)',
  },
  rulerEdge: {
    position: 'absolute', right: 1, top: 4, width: 2, height: 34, background: '#fff2a3',
  },
  rulerMarkA: {
    position: 'absolute', left: 0, top: 8, width: 8, height: 2, background: '#111',
  },
  rulerMarkB: {
    position: 'absolute', left: 0, top: 20, width: 6, height: 2, background: '#111',
  },
  rulerMarkC: {
    position: 'absolute', left: 0, top: 32, width: 8, height: 2, background: '#111',
  },
  flaskIcon: {
    position: 'relative', width: 34, height: 31, background: '#9be9ff',
    border: '3px solid #111', clipPath: 'polygon(38% 0, 62% 0, 62% 34%, 92% 100%, 8% 100%, 38% 34%)',
  },
  flaskNeck: {
    position: 'absolute', left: 13, top: 0, width: 8, height: 14, background: '#9be9ff',
  },
  flaskLiquid: {
    position: 'absolute', left: 5, right: 5, bottom: 4, height: 10, background: '#62e676',
  },
  tumblerIcon: {
    position: 'relative', width: 19, height: 42, background: '#ff7a3d',
    border: '3px solid #111', borderRadius: '7px 7px 9px 9px', transform: 'rotate(-24deg)',
  },
  tumblerCap: {
    position: 'absolute', left: -2, top: -6, width: 23, height: 8,
    background: '#f4f4f4', border: '3px solid #111', borderRadius: 5,
  },
  bellIcon: {
    width: 34, height: 30, background: '#ffd040', border: '3px solid #111',
    borderRadius: '50% 50% 8px 8px', position: 'relative', marginTop: 6,
  },
  bellKnob: {
    position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
    width: 9, height: 9, background: '#ffd040', border: '3px solid #111', borderRadius: '50%',
    display: 'block',
  },
  bellClapper: {
    position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
    width: 8, height: 8, background: '#111', borderRadius: '50%', display: 'block',
  },
  stunIcon: {
    position: 'relative', width: 22, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stunBolt: {
    display: 'block', width: 22, height: 38,
    background: '#ffe65c', border: '2.5px solid #111',
    clipPath: 'polygon(65% 0%, 100% 0%, 38% 50%, 82% 50%, 8% 100%, 28% 52%, 0% 52%)',
  },
  speedIcon: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
    width: 38, height: 38,
  },
  speedLine1: {
    display: 'block', width: 36, height: 5,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine2: {
    display: 'block', width: 26, height: 5, marginLeft: 10,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine3: {
    display: 'block', width: 16, height: 5, marginLeft: 20,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  healthIcon: {
    position: 'relative', width: 34, height: 34,
  },
  healthH: {
    position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
    display: 'block', width: 34, height: 12,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  healthV: {
    position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
    display: 'block', width: 12, height: 34,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  choiceLabel: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  choiceDesc:  { fontSize: 11, color: '#bbb', lineHeight: 1.4 },
  restartBtn: {
    background: '#4030a0', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    padding: '12px 32px',
  },
}
