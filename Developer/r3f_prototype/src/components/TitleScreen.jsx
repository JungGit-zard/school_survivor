import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import TitleScene3D from './TitleScene3D.jsx'

const SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'
const DEFAULT_SETTINGS = {
  vibration: true,
  reducedEffects: false,
}

export default function TitleScreen({ onStart }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [settings, setSettings] = useState(loadTitleSettings)
  const titleStyle = settings.reducedEffects ? styles.titleReduced : styles.title
  const primaryButtonStyle = settings.reducedEffects ? styles.primaryButtonReduced : styles.primaryButton

  useEffect(() => {
    saveTitleSettings(settings)

    if (typeof document === 'undefined') return
    if (settings.reducedEffects) {
      document.documentElement.dataset.reducedEffects = 'true'
    } else {
      document.documentElement.removeAttribute('data-reduced-effects')
    }
  }, [settings])

  useEffect(() => {
    if (!settingsOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setControlsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen])

  const toggleSetting = (key) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] }

      if (key === 'vibration' && next.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(18)
      }

      return next
    })
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    setControlsOpen(false)
  }

  return (
    <div style={styles.root}>
      <Canvas
        orthographic
        camera={{ zoom: 62, position: [0, 12, 17], near: 0.1, far: 100 }}
        gl={{ stencil: true, antialias: true }}
        shadows
        style={styles.canvas}
      >
        <TitleScene3D />
      </Canvas>

      <div style={styles.tint} />
      <button
        type="button"
        aria-label="설정 열기"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        style={styles.settingsButton}
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>

      <div style={styles.content}>
        <div style={styles.serviceName}>Escape! zombie school</div>
        <h1 style={titleStyle}>
          <span style={styles.titleAccent}>Escape!</span>
          <span>zombie school</span>
        </h1>
        <p style={styles.subtitle}>감염된 학교에서 5분만 버티면, 교문이 열린다</p>
      </div>

      <div style={styles.actions}>
        <button type="button" style={primaryButtonStyle} onClick={onStart}>
          게임 시작
        </button>
      </div>

      {settingsOpen && (
        <div style={styles.modalLayer}>
          <button type="button" aria-label="설정 닫기 배경" style={styles.modalScrim} onClick={closeSettings} />
          <section role="dialog" aria-modal="true" aria-labelledby="title-settings-heading" style={styles.settingsModal}>
            <div style={styles.modalHeader}>
              <h2 id="title-settings-heading" style={styles.modalTitle}>설정</h2>
              <button type="button" aria-label="닫기" style={styles.closeButton} onClick={closeSettings}>
                ×
              </button>
            </div>

            <div style={styles.sectionLabel}>게임 환경</div>
            <button
              type="button"
              aria-label={settings.vibration ? '진동 끄기' : '진동 켜기'}
              style={styles.settingRow}
              onClick={() => toggleSetting('vibration')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>진동</strong>
                <span style={styles.rowDescription}>피격/보상 피드백을 진동으로 알림</span>
              </span>
              <span style={styles.toggleTrack(settings.vibration)}>
                <span style={styles.toggleKnob(settings.vibration)} />
              </span>
            </button>

            <button
              type="button"
              aria-label={settings.reducedEffects ? '연출 줄이기 끄기' : '연출 줄이기 켜기'}
              style={styles.settingRow}
              onClick={() => toggleSetting('reducedEffects')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>연출 줄이기</strong>
                <span style={styles.rowDescription}>강한 그림자와 빛 번짐을 낮춤</span>
              </span>
              <span style={styles.toggleTrack(settings.reducedEffects)}>
                <span style={styles.toggleKnob(settings.reducedEffects)} />
              </span>
            </button>

            <div style={styles.sectionLabel}>도움말</div>
            <button type="button" style={styles.settingRow} onClick={() => setControlsOpen((current) => !current)}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>조작법 보기</strong>
                <span style={styles.rowDescription}>이동, 레벨업 카드, 일시정지 안내</span>
              </span>
              <span style={styles.arrow}>{controlsOpen ? '⌃' : '›'}</span>
            </button>

            {controlsOpen && (
              <div style={styles.controlsPanel}>
                <p style={styles.controlLine}>모바일: 화면 아래 조이스틱으로 이동합니다.</p>
                <p style={styles.controlLine}>레벨업: 카드를 눌러 무기나 패시브를 선택합니다.</p>
                <p style={styles.controlLine}>일시정지: 전투 화면의 일시정지 버튼을 사용합니다.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function loadTitleSettings() {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const parsed = JSON.parse(raw)
    return {
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_SETTINGS.vibration,
      reducedEffects: typeof parsed.reducedEffects === 'boolean' ? parsed.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveTitleSettings(settings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#16121d',
    fontFamily: "'Segoe UI', sans-serif",
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: '#211c2b',
  },
  tint: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(13,10,18,0.22) 0%, rgba(13,10,18,0.03) 43%, rgba(13,10,18,0.62) 100%)',
    pointerEvents: 'none',
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.92)',
    color: '#050209',
    fontSize: 22,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #050209, 0 0 12px rgba(247,209,126,0.35)',
    zIndex: 3,
  },
  content: {
    position: 'absolute',
    top: '9%',
    left: 22,
    right: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  serviceName: {
    color: '#f7d17e',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textShadow: '0 2px 0 #050209, 0 0 8px rgba(233,144,57,0.55)',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: '#f8f7f2',
    fontSize: 44,
    lineHeight: 0.96,
    fontWeight: 1000,
    letterSpacing: 0,
    textShadow: '0 4px 0 #050209, 0 0 16px rgba(65,116,90,0.75)',
  },
  titleReduced: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: '#f8f7f2',
    fontSize: 44,
    lineHeight: 0.96,
    fontWeight: 1000,
    letterSpacing: 0,
    textShadow: '0 3px 0 #050209',
  },
  titleAccent: {
    color: '#ff8a37',
  },
  subtitle: {
    color: '#f8f7f2',
    fontSize: 14,
    lineHeight: 1.35,
    fontWeight: 800,
    letterSpacing: 0,
    maxWidth: 270,
    margin: '10px 0 0',
    textShadow: '0 3px 0 #050209, 0 0 8px rgba(0,0,0,0.45)',
  },
  actions: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 34,
    display: 'flex',
    flexDirection: 'column',
  },
  primaryButton: {
    height: 54,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 20,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 5px 0 #050209, 0 0 16px rgba(89,199,255,0.45)',
  },
  primaryButtonReduced: {
    height: 54,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 20,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 5px 0 #050209',
  },
  modalLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
  },
  modalScrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.34)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  settingsModal: {
    position: 'absolute',
    top: '50%',
    left: 24,
    right: 24,
    transform: 'translateY(-50%)',
    maxHeight: '58%',
    overflow: 'auto',
    padding: 14,
    border: '2px solid #050209',
    borderRadius: 10,
    background: 'linear-gradient(180deg, #2b2435 0%, #211c2b 100%)',
    color: '#f8f7f2',
    boxShadow: '0 6px 0 #050209, 0 18px 34px rgba(0,0,0,0.45)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 9,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 1000,
    letterSpacing: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f8f7f2',
    color: '#050209',
    fontSize: 20,
    fontWeight: 1000,
    cursor: 'pointer',
  },
  sectionLabel: {
    margin: '11px 0 7px',
    color: '#f7d17e',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
  },
  settingRow: {
    width: '100%',
    minHeight: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 10px',
    marginBottom: 7,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#2b2435',
    color: '#f8f7f2',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 3px 0 #050209',
  },
  rowText: {
    minWidth: 0,
    display: 'block',
  },
  rowTitle: {
    display: 'block',
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 900,
  },
  rowDescription: {
    display: 'block',
    marginTop: 3,
    color: '#c8c1d7',
    fontSize: 10,
    lineHeight: 1.25,
    fontWeight: 700,
  },
  toggleTrack: (enabled) => ({
    flex: '0 0 auto',
    width: 50,
    height: 28,
    padding: 3,
    border: '2px solid #050209',
    borderRadius: 999,
    background: enabled ? '#59c7ff' : '#5d5668',
    boxSizing: 'border-box',
  }),
  toggleKnob: (enabled) => ({
    display: 'block',
    width: 18,
    height: 18,
    border: '2px solid #050209',
    borderRadius: '50%',
    background: '#f8f7f2',
    transform: enabled ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 120ms ease',
  }),
  arrow: {
    flex: '0 0 auto',
    color: '#f7d17e',
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 1000,
  },
  controlsPanel: {
    margin: '1px 0 3px',
    padding: '9px 10px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#16121d',
    boxShadow: '0 3px 0 #050209',
  },
  controlLine: {
    margin: '0 0 5px',
    color: '#f8f7f2',
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 750,
  },
}
