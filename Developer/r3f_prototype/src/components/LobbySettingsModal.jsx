// 로비 설정 모달. 타이틀에서 이관된 게임 환경 설정 + 닉네임 편집을 담당한다.
// 설정 저장은 titleSettings(단일 저장 소스), 닉네임은 userNickname을 그대로 사용한다.
import { useEffect, useState } from 'react'
import { requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { getSavedNickname, saveNicknameForUser, validateNickname } from '../lib/userNickname.js'
import { applyReducedEffects, loadTitleSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { schoolPanel, schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useAuthStore } from '../store/useAuthStore.js'

export default function LobbySettingsModal({ onClose, onNicknameChange, onLogoutToTitle }) {
  const authUser = useAuthStore((s) => s.user)
  const signOutOfGoogle = useAuthStore((s) => s.signOutOfGoogle)
  const [settings, setSettings] = useState(loadTitleSettings)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')

  useEffect(() => {
    saveTitleSettings(settings)
    applyReducedEffects(settings.reducedEffects)
  }, [settings])

  const toggleSetting = (key) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] }
      if (key === 'vibration' && next.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(18)
      }
      return next
    })
  }

  const openNicknameEditor = () => {
    setNicknameInput(getSavedNickname(authUser) || '')
    setNicknameError('')
    setNicknameOpen(true)
  }

  const handleNicknameSubmit = (event) => {
    event.preventDefault()
    const result = saveNicknameForUser(authUser, nicknameInput)
    if (!result.ok) {
      setNicknameError(result.error)
      return
    }
    setNicknameOpen(false)
    requestCloudProgressSave()
    onNicknameChange?.(result.nickname)
  }

  const handleLogout = async () => {
    await signOutOfGoogle()
    onLogoutToTitle?.()
  }

  return (
    <div style={styles.overlay}>
      <button type="button" aria-label="설정 닫기 배경" style={styles.scrim} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="lobby-settings-heading" style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 id="lobby-settings-heading" style={styles.modalTitle}>설정</h2>
          <button type="button" aria-label="닫기" style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {nicknameOpen ? (
          <form style={styles.nicknameForm} onSubmit={handleNicknameSubmit}>
            <label style={styles.nicknameLabel} htmlFor="lobby-nickname-input">유저 닉네임</label>
            <input
              id="lobby-nickname-input"
              aria-label="유저 닉네임"
              value={nicknameInput}
              maxLength={12}
              style={styles.nicknameInput}
              onChange={(event) => {
                setNicknameInput(event.target.value)
                if (nicknameError) {
                  const result = validateNickname(event.target.value)
                  if (result.ok) setNicknameError('')
                }
              }}
              autoFocus
            />
            <p style={nicknameError ? styles.nicknameError : styles.nicknameHint}>
              {nicknameError || '닉네임은 랭킹과 계정 진행도에 함께 표시됩니다.'}
            </p>
            <div style={styles.nicknameActions}>
              <button type="button" style={styles.nicknameCancel} onClick={() => setNicknameOpen(false)}>취소</button>
              <button type="submit" style={styles.nicknameSave}>저장</button>
            </div>
          </form>
        ) : (
          <>
            <div style={styles.sectionLabel}>프로필</div>
            <button type="button" style={styles.settingRow} onClick={openNicknameEditor} disabled={!authUser?.uid}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>닉네임</strong>
                <span style={styles.rowDescription}>{getSavedNickname(authUser) || '미설정'}</span>
              </span>
              <span style={styles.arrow}>›</span>
            </button>

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
            <button type="button" style={styles.settingRow} onClick={() => setControlsOpen((v) => !v)}>
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

            <button type="button" style={styles.logoutButton} onClick={handleLogout} disabled={!authUser?.uid}>
              로그아웃
            </button>
          </>
        )}
      </section>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: uiType.family,
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.5)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  modal: {
    ...schoolPanel('dark'),
    position: 'relative',
    width: 'min(100% - 28px, 420px)',
    maxHeight: 'min(84%, 600px)',
    overflowY: 'auto',
    padding: 14,
    boxSizing: 'border-box',
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
    fontWeight: uiType.weightHeavy,
  },
  closeButton: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
  },
  sectionLabel: {
    margin: '11px 0 7px',
    color: uiPalette.reward,
    fontSize: 12,
    fontWeight: uiType.weightStrong,
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
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    color: uiPalette.paperLight,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  logoutButton: {
    ...schoolButton('danger'),
    width: '100%',
    minHeight: 44,
    marginBottom: 7,
    fontSize: 14,
  },
  rowText: { minWidth: 0, display: 'block' },
  rowTitle: { display: 'block', fontSize: 13, lineHeight: 1.2, fontWeight: uiType.weightStrong },
  rowDescription: {
    display: 'block',
    marginTop: 3,
    color: uiPalette.mutedChalk,
    fontSize: 10,
    lineHeight: 1.25,
    fontWeight: 700,
  },
  toggleTrack: (enabled) => ({
    flex: '0 0 auto',
    width: 50,
    height: 28,
    padding: 3,
    border: uiBorders.strong,
    borderRadius: 999,
    background: enabled ? uiPalette.cta : '#5d5668',
    boxSizing: 'border-box',
  }),
  toggleKnob: (enabled) => ({
    display: 'block',
    width: 18,
    height: 18,
    border: uiBorders.strong,
    borderRadius: '50%',
    background: uiPalette.paperLight,
    transform: enabled ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 120ms ease',
  }),
  arrow: {
    flex: '0 0 auto',
    color: uiPalette.reward,
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 1000,
  },
  controlsPanel: {
    margin: '1px 0 3px',
    padding: '9px 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboardDeep,
    boxShadow: uiShadows.pressSmall,
  },
  controlLine: {
    margin: '0 0 5px',
    color: uiPalette.paperLight,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 750,
  },
  nicknameForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  nicknameLabel: { color: uiPalette.reward, fontSize: 12, lineHeight: 1, fontWeight: uiType.weightStrong },
  nicknameInput: {
    width: '100%',
    minHeight: 46,
    padding: '0 11px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 17,
    lineHeight: 1,
    fontWeight: 900,
    outline: 'none',
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  },
  nicknameHint: { minHeight: 30, margin: 0, color: '#c8c1d7', fontSize: 11, lineHeight: 1.35, fontWeight: 800 },
  nicknameError: { minHeight: 30, margin: 0, color: uiPalette.warning, fontSize: 11, lineHeight: 1.35, fontWeight: 900 },
  nicknameActions: { display: 'flex', gap: 8 },
  nicknameCancel: { ...schoolButton('paper'), flex: 1, minHeight: 44, fontSize: 15 },
  nicknameSave: { ...schoolButton('primary'), flex: 1, minHeight: 44, fontSize: 15 },
}
