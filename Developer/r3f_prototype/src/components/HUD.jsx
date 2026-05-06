import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { bagSwingState } from '../lib/refs.js'

// 2026-05-06 재밸런싱: 무기당 Lv.1→Lv.5 점증, 해금카드 minLevel 게이팅 적용 (Stage1 replan).
const UPGRADES = [
  { key: 'pencilDamage', icon: 'pencil', labelFn: (w) => `연필 데미지 +3 (Lv${(w.pencilThrow.level ?? 1) + 1})`, desc: '투척 연필의 공격력 증가' },
  { key: 'pencilCount', icon: 'pencil', label: '연필 발사 수 +1', desc: '동시에 날리는 연필 수 증가 (최대 4)' },
  { key: 'pencilPierce', icon: 'pencil', label: '연필 관통 +1', desc: '연필이 적을 관통 (최대 3회)' },
  { key: 'unlockBag', icon: 'ruler', label: '30cm 자 해금', desc: '가까운 적을 자 휘두르기로 방어', minLevel: 2 },
  { key: 'bagDamage', icon: 'ruler', labelFn: (w) => `30cm 자 피해 +5 (Lv${(w.schoolBag.level ?? 1) + 1})`, desc: '자 휘두르기 타격 피해 증가' },
  { key: 'bagRadius', icon: 'ruler', label: '30cm 자 사거리 +', desc: '자 휘두르기 타격 범위 증가' },
  { key: 'unlockTumbler', icon: 'tumbler', label: '텀블러 해금', desc: '플레이어 주변을 회전하는 방어 무기', minLevel: 2 },
  { key: 'tumblerCount', icon: 'tumbler', label: '텀블러 개수 +1', desc: '회전 텀블러 개수 증가 (최대 3개)' },
  { key: 'tumblerDamage', icon: 'tumbler', labelFn: (w) => `텀블러 피해 +2 (Lv${(w.tumbler.level ?? 1) + 1})`, desc: '회전 텀블러 접촉 피해 증가' },
  { key: 'unlockFlask', icon: 'flask', label: '플라스크 해금', desc: '밀집한 적에게 광역 폭발 투척', minLevel: 4 },
  { key: 'flaskDamage', icon: 'flask', labelFn: (w) => `플라스크 피해 +8 (Lv${(w.scienceFlask.level ?? 1) + 1})`, desc: '폭발 피해 증가' },
  { key: 'flaskRadius', icon: 'flask', label: '플라스크 범위 +', desc: '폭발 반경 증가' },
  { key: 'unlockBell', icon: 'bell', label: '벨 해금', desc: '8방향 충격파 스킬 해금', minLevel: 4 },
  { key: 'bellDamage', icon: 'bell', labelFn: (w) => `벨 데미지 +4 (Lv${(w.bell.level ?? 1) + 1})`, desc: '충격파 공격력 증가' },
  { key: 'unlockStun', icon: 'stun', label: '전기충격 해금', desc: '체인 스턴건 스킬 해금', minLevel: 6 },
  { key: 'stunDamage', icon: 'stun', labelFn: (w) => `전기 데미지 +5 (Lv${(w.stunGun.level ?? 1) + 1})`, desc: '체인 스턴 데미지 증가' },
  { key: 'stunChain', icon: 'stun', label: '전기 연쇄 +1', desc: '연쇄 대상 수 증가 (최대 4)' },
  { key: 'unlockMissile', icon: 'missile', label: '보조배터리 해금', desc: '서서히 가속해 밀집 지점을 폭격', minLevel: 6 },
  { key: 'missileDamage', icon: 'missile', labelFn: (w) => `보조배터리 피해 +6 (Lv${(w.guidedMissile.level ?? 1) + 1})`, desc: '폭발 피해 증가' },
  { key: 'missileCount', icon: 'missile', label: '보조배터리 동시 발사 +1', desc: '동시에 2발 발사 (최대 2발)' },
  { key: 'unlockStarlink', icon: 'starlink', label: '고장난 스타링크 해금', desc: '5유닛 이내 무작위 낙뢰 (기본 1개)', minLevel: 8 },
  { key: 'starlinkDamage', icon: 'starlink', labelFn: (w) => `스타링크 피해 +7 (Lv${(w.starlink.level ?? 1) + 1})`, desc: '낙뢰 피해 증가' },
  { key: 'starlinkCount', icon: 'starlink', label: '스타링크 낙뢰 수 +1', desc: '볼리당 낙뢰 수 증가 (최대 6)' },
  { key: 'unlockOnigiri', icon: 'onigiri', label: '오니기리 해금', desc: '적 사이를 튕기며 공격하는 주먹밥', minLevel: 8 },
  { key: 'onigiiriBounce', icon: 'onigiri', label: '오니기리 바운스 +1', desc: '튕기는 횟수 증가 (최대 7회)' },
  { key: 'onigiiriDamage', icon: 'onigiri', labelFn: (w) => `오니기리 피해 +5 (Lv${(w.onigiri.level ?? 1) + 1})`, desc: '충돌 피해 증가' },
  { key: 'moveSpeed', icon: 'speed', label: '이동속도 +10%', desc: '플레이어 이동속도 증가' },
  { key: 'maxHealth', icon: 'health', label: '최대 체력 +20', desc: '최대 HP 및 현재 HP 증가' },
]

// 무기 레벨 상한 (Lv.5) 도달 시 해당 무기의 강화 카드를 풀에서 제외
const WEAPON_OF_KEY = {
  pencilDamage: 'pencilThrow', pencilCount: 'pencilThrow', pencilPierce: 'pencilThrow',
  bagDamage: 'schoolBag', bagRadius: 'schoolBag',
  tumblerDamage: 'tumbler', tumblerCount: 'tumbler',
  flaskDamage: 'scienceFlask', flaskRadius: 'scienceFlask',
  bellDamage: 'bell',
  stunDamage: 'stunGun', stunChain: 'stunGun',
  missileDamage: 'guidedMissile', missileCount: 'guidedMissile',
  starlinkDamage: 'starlink', starlinkCount: 'starlink',
  onigiiriDamage: 'onigiri', onigiiriBounce: 'onigiri',
}

function pickThree(level, weapons) {
  const available = UPGRADES.filter((u) => {
    // 1) 해금 카드: minLevel 미달이면 노출 금지
    if (u.minLevel != null && level < u.minLevel) return false

    // 2) 무기 Lv.5 도달 시 해당 무기 강화 카드 제외
    const wKey = WEAPON_OF_KEY[u.key]
    if (wKey && (weapons[wKey]?.level ?? 0) >= 5) return false

    // 3) 활성/비활성 게이팅
    if (u.key === 'unlockFlask')                                  return !weapons.scienceFlask?.active
    if (u.key === 'flaskDamage' || u.key === 'flaskRadius')       return  weapons.scienceFlask?.active
    if (u.key === 'unlockBell')                                   return !weapons.bell?.active
    if (u.key === 'bellDamage')                                   return  weapons.bell?.active
    if (u.key === 'unlockBag')                                    return !weapons.schoolBag?.active
    if (u.key === 'bagDamage' || u.key === 'bagRadius')           return  weapons.schoolBag?.active
    if (u.key === 'unlockTumbler')                                return !weapons.tumbler?.active
    if (u.key === 'tumblerCount' || u.key === 'tumblerDamage')    return  weapons.tumbler?.active
    if (u.key === 'unlockStun')                                   return !weapons.stunGun?.active
    if (u.key === 'stunChain' || u.key === 'stunDamage')          return  weapons.stunGun?.active
    if (u.key === 'unlockMissile')                                return !weapons.guidedMissile?.active
    if (u.key === 'missileDamage' || u.key === 'missileCount')    return  weapons.guidedMissile?.active
    if (u.key === 'unlockStarlink')                               return !weapons.starlink?.active
    if (u.key === 'starlinkDamage' || u.key === 'starlinkCount')  return  weapons.starlink?.active
    if (u.key === 'unlockOnigiri')                                return !weapons.onigiri?.active
    if (u.key === 'onigiiriBounce' || u.key === 'onigiiriDamage') return  weapons.onigiri?.active
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
      {type === 'missile' && (
        <div style={styles.missileIcon}>
          <span style={styles.missileBody} />
          <span style={styles.missileNose} />
          <span style={styles.missileFlame} />
        </div>
      )}
      {type === 'starlink' && (
        <div style={styles.starlinkIcon}>
          <span style={styles.starlinkBolt} />
          <span style={styles.starlinkRingA} />
          <span style={styles.starlinkRingB} />
        </div>
      )}
      {type === 'onigiri' && (
        <svg width="50" height="46" viewBox="0 0 50 46" style={{ display: 'block', margin: '0 auto' }}>
          {/* 두꺼운 검은 외곽선 */}
          <path d="M25 1 C20 8 2 30 2 37 Q2 45 10 45 H40 Q48 45 48 37 C48 30 30 8 25 1 Z" fill="#111" />
          {/* 흰 쌀 본체 */}
          <path d="M25 5 C20 12 6 31 6 37 Q6 43 11 43 H39 Q44 43 44 37 C44 31 30 12 25 5 Z" fill="#f8f7f0" />
          {/* 쌀알 타원 질감 — 크고 둥글게 */}
          <ellipse cx="25" cy="9"  rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="17" cy="16" rx="5.8" ry="4.0" fill="#e8e6d6" />
          <ellipse cx="33" cy="15" rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="12" cy="25" rx="5.2" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="25" cy="23" rx="6.0" ry="4.2" fill="#e8e6d6" />
          <ellipse cx="38" cy="24" rx="4.8" ry="3.5" fill="#e8e6d6" />
          <ellipse cx="9"  cy="33" rx="4.0" ry="2.9" fill="#e8e6d6" />
          <ellipse cx="21" cy="30" rx="5.0" ry="3.6" fill="#e8e6d6" />
          <ellipse cx="33" cy="30" rx="4.8" ry="3.4" fill="#e8e6d6" />
          <ellipse cx="41" cy="33" rx="3.8" ry="2.8" fill="#e8e6d6" />
          {/* 김 조각 — 아래 중앙에만 붙임 */}
          <rect x="15" y="29" width="20" height="14" rx="2.5" fill="#111" />
          <rect x="17" y="31" width="16" height="11" rx="2" fill="#192e13" />
          {/* 김 질감 */}
          <line x1="19" y1="34" x2="31" y2="32" stroke="#36542c" strokeWidth="1.2" />
          <line x1="20" y1="39" x2="31" y2="37" stroke="#36542c" strokeWidth="1.0" />
        </svg>
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

  // phase媛 'levelup'?쇰줈 諛붾뚮뒗 ?쒓컙 ??踰덈쭔 怨좎젙 ??RAF re-render???붾뱾由ъ? ?딆쓬
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const choices = useMemo(() => phase === 'levelup' ? pickThree(player.level, weapons) : [], [phase])
  const lowHp   = player.hp / player.maxHp < 0.3

  // ??荑⑦???鍮꾩쑉 (1=以鍮꾨맖, 0=荑⑦????쒖옉 吏곹썑) ??RAF濡?DOM 媛깆떊 ?놁씠 ?대쭅
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

  // CSS ?ㅽ봽?덉엫 二쇱엯 (理쒖큹 1??
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
      {/* ?? ?泥대젰 酉곕꽕???? */}
      {lowHp && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.55) 100%)',
          animation: 'vignettePulse 0.8s ease-in-out infinite',
        }} />
      )}
      {/* ?? Top bar ?? */}
      <div style={styles.topBar}>
        <div style={styles.timer}>{mins}:{secs}</div>
        <div style={styles.level}>Lv.{player.level}</div>
      </div>

      {/* ?? HP bar ?? */}
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

      {/* ?? XP bar ?? */}
      <div style={styles.xpRow}>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${(player.xp / player.xpToNext) * 100}%`, background: '#60d060' }} />
        </div>
      </div>

      {/* ?? Active weapons ?? */}
      <div style={styles.weaponRow}>
        {Object.entries(weapons).filter(([, w]) => w.active).map(([k, w]) => (
          <div key={k} style={styles.weaponChip}>{w.label}</div>
        ))}
      </div>

      {/* ?? ??荑⑦???UI (HP諛?醫뚯긽?? ?먰삎) ?? */}
      <div style={styles.cdWrap}>
        <div style={styles.cdRing}>
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ display: 'block' }}>
            {/* 寃??諛곌꼍 ??*/}
            <circle cx="21" cy="21" r="20" fill="#111" stroke="#333" strokeWidth="1" />
            {/* ?⑹깋 吏꾪뻾 留?*/}
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

      {/* ?? Modals ?? */}
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
  missileIcon: { position: 'relative', width: 36, height: 36 },
  missileBody: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    display: 'block', width: 8, height: 22,
    background: '#8a90b8', border: '2px solid #111', borderRadius: 3, boxSizing: 'border-box',
  },
  missileNose: {
    position: 'absolute', left: '50%', top: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
    borderBottom: '9px solid #d0d8f0',
  },
  missileFlame: {
    position: 'absolute', left: '50%', bottom: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
    borderTop: '8px solid #ff7020',
  },
  starlinkIcon: { position: 'relative', width: 36, height: 36 },
  starlinkBolt: {
    position: 'absolute', left: '50%', top: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 5, height: 28,
    background: 'linear-gradient(to bottom, #88eeff 0%, #ffffff 40%, #44aaff 100%)',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
    boxShadow: '0 0 5px #44eeff',
  },
  starlinkRingA: {
    position: 'absolute', left: '50%', bottom: 5,
    transform: 'translateX(-50%)',
    display: 'block', width: 18, height: 18,
    borderRadius: '50%',
    border: '2px solid #44eeff',
    opacity: 0.7,
    boxSizing: 'border-box',
  },
  starlinkRingB: {
    position: 'absolute', left: '50%', bottom: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 28, height: 28,
    borderRadius: '50%',
    border: '1.5px solid #226688',
    opacity: 0.45,
    boxSizing: 'border-box',
  },
  choiceLabel: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  choiceDesc:  { fontSize: 11, color: '#bbb', lineHeight: 1.4 },
  restartBtn: {
    background: '#4030a0', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    padding: '12px 32px',
  },
}
