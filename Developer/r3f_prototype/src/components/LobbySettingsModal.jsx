// 로비 설정 모달. 타이틀에서 이관된 게임 환경 설정 + 닉네임 편집을 담당한다.
// 설정 저장은 titleSettings(단일 저장 소스), 닉네임은 userNickname을 그대로 사용한다.
import { useEffect, useRef, useState } from 'react'
import { requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { getSavedNickname, saveNicknameForUser, validateNickname } from '../lib/userNickname.js'
import { applyHitCameraShake, applyLanguage, applyReducedEffects, loadTitleSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { schoolPanel, schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { LOCALE_OPTIONS, useLocale, useT } from '../lib/i18n.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { deleteAccountAndData, reauthenticateForDeletion } from '../lib/accountDeletion.js'
import { TERMS_TITLE, TERMS_TEXT, PRIVACY_TITLE, PRIVACY_TEXT } from '../lib/legalDocuments.js'

const DELETE_ERROR_KEYS = new Set([
  'reauthRequired', 'unauthenticated', 'network', 'progressDeleteFailed', 'unknown',
])

const deleteErrorText = (reason) => (
  `settings.err.${DELETE_ERROR_KEYS.has(reason) ? reason : 'unknown'}`
)

export default function LobbySettingsModal({ onClose, onNicknameChange, onLogoutToTitle }) {
  const t = useT()
  const locale = useLocale()
  const authUser = useAuthStore((s) => s.user)
  const signOutOfGoogle = useAuthStore((s) => s.signOutOfGoogle)
  const [settings, setSettings] = useState(loadTitleSettings)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [legalOpenId, setLegalOpenId] = useState(null)
  const [deleteStage, setDeleteStage] = useState('idle') // idle | confirm | deleting
  const [deleteError, setDeleteError] = useState(null)
  const [reauthBusy, setReauthBusy] = useState(false)
  const modalRef = useRef(null)
  const closeDisabled = deleteStage === 'deleting' || reauthBusy

  useEffect(() => {
    saveTitleSettings(settings)
    applyReducedEffects(settings.reducedEffects)
    applyHitCameraShake(settings.hitCameraShake)
    applyLanguage(settings.language)
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

  const toggleLegal = (id) => {
    setLegalOpenId((current) => (current === id ? null : id))
  }

  const handleClose = () => {
    if (closeDisabled) return
    onClose?.()
  }

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = Array.from(modalRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? [])
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const openDeleteConfirm = () => {
    setDeleteError(null)
    setDeleteStage('confirm')
  }

  const cancelDelete = () => {
    if (deleteStage === 'deleting') return
    setDeleteStage('idle')
    setDeleteError(null)
  }

  const runDelete = async () => {
    if (deleteStage === 'deleting') return
    setDeleteStage('deleting')
    const result = await deleteAccountAndData(authUser)
    if (result.ok) {
      onLogoutToTitle?.()
      return
    }
    setDeleteError(result)
    setDeleteStage('confirm')
  }

  const handleReauthAndRetry = async () => {
    setReauthBusy(true)
    const reauthed = await reauthenticateForDeletion()
    setReauthBusy(false)
    if (!reauthed) {
      setDeleteError({ reason: 'reauthRequired', message: t('settings.err.reauthFailed') })
      return
    }
    await runDelete()
  }

  return (
    <div style={styles.overlay}>
      <button type="button" aria-label={t('settings.closeBackdropAria')} style={styles.scrim(closeDisabled)} onClick={handleClose} disabled={closeDisabled} />
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lobby-settings-heading"
        style={styles.modal}
        onKeyDown={handleModalKeyDown}
      >
        <div style={styles.modalHeader}>
          <h2 id="lobby-settings-heading" style={styles.modalTitle}>{t('settings.title')}</h2>
          <button type="button" aria-label={t('common.close')} style={styles.closeButton} onClick={handleClose} disabled={closeDisabled}>×</button>
        </div>

        {nicknameOpen ? (
          <form style={styles.nicknameForm} onSubmit={handleNicknameSubmit}>
            <label style={styles.nicknameLabel} htmlFor="lobby-nickname-input">{t('settings.nicknameLabel')}</label>
            <input
              id="lobby-nickname-input"
              aria-label={t('settings.nicknameLabel')}
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
              {nicknameError || t('settings.nicknameHint')}
            </p>
            <div style={styles.nicknameActions}>
              <button type="button" style={styles.nicknameCancel} onClick={() => setNicknameOpen(false)}>{t('common.cancel')}</button>
              <button type="submit" style={styles.nicknameSave}>{t('common.save')}</button>
            </div>
          </form>
        ) : deleteStage !== 'idle' ? (
          <div style={styles.deletePanel}>
            <h3 style={styles.deleteHeading}>{t('settings.deleteHeading')}</h3>
            <p style={styles.deleteWarning}>
              {t('settings.deleteWarning')}
            </p>
            {deleteError && (
              <p role="alert" style={styles.deleteErrorText}>
                {t(deleteErrorText(deleteError.reason))}
              </p>
            )}
            {deleteError?.reason === 'reauthRequired' ? (
              <div style={styles.nicknameActions}>
                <button
                  type="button"
                  style={styles.nicknameCancel}
                  onClick={cancelDelete}
                  disabled={deleteStage === 'deleting' || reauthBusy}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  style={styles.dangerConfirmButton}
                  onClick={handleReauthAndRetry}
                  disabled={deleteStage === 'deleting' || reauthBusy}
                >
                  {reauthBusy ? t('settings.reauthBusy') : t('settings.reauthRetry')}
                </button>
              </div>
            ) : (
              <div style={styles.nicknameActions}>
                <button
                  type="button"
                  style={styles.nicknameCancel}
                  onClick={cancelDelete}
                  disabled={deleteStage === 'deleting'}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  style={styles.dangerConfirmButton}
                  onClick={runDelete}
                  disabled={deleteStage === 'deleting'}
                >
                  {deleteStage === 'deleting' ? t('settings.deleting') : t('settings.deletePermanent')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={styles.sectionLabel}>{t('settings.profile')}</div>
            <button type="button" style={styles.settingRow} onClick={openNicknameEditor} disabled={!authUser?.uid}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.nickname')}</strong>
                <span style={styles.rowDescription}>{getSavedNickname(authUser) || t('settings.notSet')}</span>
              </span>
              <span style={styles.arrow}>›</span>
            </button>

            <div style={styles.sectionLabel}>{t('settings.gameEnv')}</div>
            <div style={styles.languageRow}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.language')}</strong>
                <span style={styles.rowDescription}>{t('settings.languageDesc')}</span>
              </span>
              <div style={styles.languageChoices} role="group" aria-label={t('settings.languageAria')}>
                {LOCALE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    lang={option.id}
                    aria-pressed={locale === option.id}
                    style={styles.languageButton(locale === option.id)}
                    onClick={() => setSettings((current) => ({ ...current, language: option.id }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-label={settings.vibration ? t('settings.vibrationOff') : t('settings.vibrationOn')}
              style={styles.settingRow}
              onClick={() => toggleSetting('vibration')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.vibration')}</strong>
                <span style={styles.rowDescription}>{t('settings.vibrationDesc')}</span>
              </span>
              <span style={styles.toggleTrack(settings.vibration)}>
                <span style={styles.toggleKnob(settings.vibration)} />
              </span>
            </button>

            <button
              type="button"
              aria-label={settings.reducedEffects ? t('settings.reducedEffectsOff') : t('settings.reducedEffectsOn')}
              style={styles.settingRow}
              onClick={() => toggleSetting('reducedEffects')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.reducedEffects')}</strong>
                <span style={styles.rowDescription}>{t('settings.reducedEffectsDesc')}</span>
              </span>
              <span style={styles.toggleTrack(settings.reducedEffects)}>
                <span style={styles.toggleKnob(settings.reducedEffects)} />
              </span>
            </button>

            <button
              type="button"
              aria-label={settings.hitCameraShake ? t('settings.hitShakeOff') : t('settings.hitShakeOn')}
              style={styles.settingRow}
              onClick={() => toggleSetting('hitCameraShake')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.hitShake')}</strong>
                <span style={styles.rowDescription}>{t('settings.hitShakeDesc')}</span>
              </span>
              <span style={styles.toggleTrack(settings.hitCameraShake)}>
                <span style={styles.toggleKnob(settings.hitCameraShake)} />
              </span>
            </button>

            <div style={styles.sectionLabel}>{t('settings.help')}</div>
            <button type="button" style={styles.settingRow} onClick={() => setControlsOpen((v) => !v)}>
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('settings.controls')}</strong>
                <span style={styles.rowDescription}>{t('settings.controlsDesc')}</span>
              </span>
              <span style={styles.arrow}>{controlsOpen ? '⌃' : '›'}</span>
            </button>
            {controlsOpen && (
              <div style={styles.controlsPanel}>
                <p style={styles.controlLine}>{t('settings.control1')}</p>
                <p style={styles.controlLine}>{t('settings.control2')}</p>
                <p style={styles.controlLine}>{t('settings.control3')}</p>
              </div>
            )}

            <div style={styles.sectionLabel}>{t('settings.legal')}</div>
            <button
              type="button"
              style={styles.settingRow}
              aria-expanded={legalOpenId === 'terms'}
              aria-controls="lobby-settings-legal-terms-panel"
              onClick={() => toggleLegal('terms')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('legal.terms.title', null, TERMS_TITLE)}</strong>
                <span style={styles.rowDescription}>{t('settings.viewFull')}</span>
              </span>
              <span style={styles.arrow}>{legalOpenId === 'terms' ? '⌃' : '›'}</span>
            </button>
            {legalOpenId === 'terms' && (
              <div
                id="lobby-settings-legal-terms-panel"
                role="region"
                aria-label={t('legal.terms.title', null, TERMS_TITLE)}
                style={styles.legalPanel}
              >
                <div style={styles.legalBody}>{t('legal.terms.text', null, TERMS_TEXT)}</div>
              </div>
            )}
            <button
              type="button"
              style={styles.settingRow}
              aria-expanded={legalOpenId === 'privacy'}
              aria-controls="lobby-settings-legal-privacy-panel"
              onClick={() => toggleLegal('privacy')}
            >
              <span style={styles.rowText}>
                <strong style={styles.rowTitle}>{t('legal.privacy.title', null, PRIVACY_TITLE)}</strong>
                <span style={styles.rowDescription}>{t('settings.viewFull')}</span>
              </span>
              <span style={styles.arrow}>{legalOpenId === 'privacy' ? '⌃' : '›'}</span>
            </button>
            {legalOpenId === 'privacy' && (
              <div
                id="lobby-settings-legal-privacy-panel"
                role="region"
                aria-label={t('legal.privacy.title', null, PRIVACY_TITLE)}
                style={styles.legalPanel}
              >
                <div style={styles.legalBody}>{t('legal.privacy.text', null, PRIVACY_TEXT)}</div>
              </div>
            )}

            <div style={styles.sectionLabel}>{t('settings.account')}</div>
            <button type="button" style={styles.logoutButton} onClick={handleLogout} disabled={!authUser?.uid}>
              {t('settings.logout')}
            </button>
            <button type="button" style={styles.deleteAccountButton} onClick={openDeleteConfirm} disabled={!authUser?.uid}>
              {t('settings.deleteAccount')}
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
  scrim: (disabled) => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.5)',
    backdropFilter: 'blur(2px)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
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
  languageRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '8px 10px',
    marginBottom: 7,
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    color: uiPalette.paperLight,
    boxSizing: 'border-box',
    boxShadow: uiShadows.pressSmall,
  },
  languageChoices: {
    flex: '0 0 auto',
    display: 'flex',
    gap: 4,
  },
  languageButton: (active) => ({
    minWidth: 44,
    minHeight: 34,
    padding: '0 7px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: active ? uiPalette.cta : uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 11,
    lineHeight: 1.1,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
  }),
  logoutButton: {
    ...schoolButton('danger'),
    width: '100%',
    minHeight: 44,
    marginBottom: 7,
    fontSize: 14,
  },
  deleteAccountButton: {
    ...schoolButton('danger'),
    width: '100%',
    minHeight: 44,
    marginBottom: 7,
    fontSize: 14,
    opacity: 0.9,
  },
  legalPanel: {
    margin: '1px 0 3px',
    padding: '9px 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboardDeep,
    boxShadow: uiShadows.pressSmall,
    maxHeight: 220,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  legalBody: {
    whiteSpace: 'pre-wrap',
    margin: 0,
    color: uiPalette.mutedChalk,
    fontSize: 10.5,
    lineHeight: 1.45,
    fontWeight: 600,
  },
  deletePanel: { display: 'flex', flexDirection: 'column', gap: 8 },
  deleteHeading: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.3,
    fontWeight: uiType.weightHeavy,
    color: uiPalette.paperLight,
  },
  deleteWarning: {
    margin: 0,
    color: uiPalette.warning,
    fontSize: 11.5,
    lineHeight: 1.4,
    fontWeight: 800,
  },
  deleteErrorText: {
    margin: 0,
    color: uiPalette.warning,
    fontSize: 11.5,
    lineHeight: 1.4,
    fontWeight: 900,
  },
  dangerConfirmButton: { ...schoolButton('danger'), flex: 1, minHeight: 44, fontSize: 14 },
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
