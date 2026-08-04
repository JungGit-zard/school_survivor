// 최초 로그인 시 이용약관·개인정보처리방침에 각각 동의를 받는 법적 게이트.
//
// 설계 근거:
// - 항목별 개별 체크박스가 정본이다("각각 체크"). "전체 동의"는 두 체크를 함께
//   토글하는 보조 수단으로 추가했다.
// - 각 항목은 기본 접힘 아코디언이다: 제목/체크 행 옆의 "전문보기"를 눌러야 본문이
//   펼쳐진다. 두 문서 전문을 동시에 펼치면 모바일 세로 화면에서 스크롤이 지나치게
//   길어져 확인 버튼까지 도달하기 어려워진다. 아코디언은 한 번에 하나만 펼쳐도 되고,
//   이 프로젝트의 LobbySettingsModal "조작법 보기" 접이식 패널과 같은 패턴이다.
// - 확인 버튼은 스크롤 영역(body) 바깥의 고정 푸터에 둔다. 본문이 얼마나 길어지든
//   버튼은 항상 화면에 남는다(position: sticky 대신 레이아웃 자체를 분리해 모바일
//   Safari의 sticky 회피 버그를 피한다).
// - recordConsent 실패 시 게이트를 닫지 않는다: 저장되지 않은 채 통과하면 다음
//   로그인에 다시 물어야 하고, 그 사이 미동의 상태로 플레이하게 되기 때문이다.
import { useEffect, useRef, useState } from 'react'
import { recordConsent } from '../lib/consent.js'
import { CONSENT_ITEMS, SERVICE_NAME } from '../lib/legalDocuments.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useT } from '../lib/i18n.js'

export default function ConsentGate({ user, onConfirmed, onCancel }) {
  const t = useT()
  const [checkedById, setCheckedById] = useState(() => (
    Object.fromEntries(CONSENT_ITEMS.map((item) => [item.id, false]))
  ))
  const [expandedById, setExpandedById] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const masterCheckboxRef = useRef(null)

  const someChecked = CONSENT_ITEMS.some((item) => checkedById[item.id])
  const allChecked = CONSENT_ITEMS.every((item) => checkedById[item.id])

  // 첫 포커스를 다이얼로그 컨테이너에 지정한다(어떤 개별 컨트롤보다 애매함이 없다).
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // 전체 동의 체크박스의 부분 선택 상태(체크박스 자체 API라 style로 표현 불가).
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someChecked && !allChecked
    }
  }, [someChecked, allChecked])

  // Esc로 취소, Tab은 다이얼로그 안에 갇히게 한다(강제 갇힘은 아님 — 취소 수단은 항상 있다).
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (!submitting) onCancel?.()
        return
      }
      if (event.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusable = Array.from(
        root.querySelectorAll('button:not(:disabled), input:not(:disabled)'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onCancel, submitting])

  const toggleItem = (id) => {
    setCheckedById((current) => ({ ...current, [id]: !current[id] }))
    if (error) setError('')
  }

  const toggleAll = () => {
    const next = !allChecked
    setCheckedById(Object.fromEntries(CONSENT_ITEMS.map((item) => [item.id, next])))
    if (error) setError('')
  }

  const toggleExpanded = (id) => {
    setExpandedById((current) => ({ ...current, [id]: !current[id] }))
  }

  const handleCancelClick = () => {
    if (submitting) return
    onCancel?.()
  }

  const handleConfirm = async () => {
    if (!allChecked || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const ok = await recordConsent(user)
      if (!ok) {
        setError(t('consent.saveFailed'))
        setSubmitting(false)
        return
      }
      onConfirmed?.()
    } catch {
      setError(t('consent.saveError'))
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <button
        type="button"
        aria-label={t('consent.cancelAria')}
        style={styles.scrim}
        onClick={handleCancelClick}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-gate-heading"
        tabIndex={-1}
        style={styles.dialog}
      >
        <div style={styles.header}>
          <h2 id="consent-gate-heading" style={styles.title}>{t('consent.heading')}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            style={styles.closeButton}
            onClick={handleCancelClick}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.intro}>
            {t('consent.intro', { service: SERVICE_NAME })}
          </p>

          <label style={styles.masterRow} htmlFor="consent-master-checkbox">
            <input
              id="consent-master-checkbox"
              ref={masterCheckboxRef}
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={styles.checkboxInput}
            />
            <span style={styles.masterText}>{t('consent.acceptAll')}</span>
          </label>

          {CONSENT_ITEMS.map((item) => {
            const expanded = Boolean(expandedById[item.id])
            return (
              <div key={item.id} style={styles.itemBlock}>
                <div style={styles.itemRow}>
                  <label style={styles.itemLabel} htmlFor={`consent-item-${item.id}`}>
                    <input
                      id={`consent-item-${item.id}`}
                      type="checkbox"
                      checked={Boolean(checkedById[item.id])}
                      onChange={() => toggleItem(item.id)}
                      style={styles.checkboxInput}
                    />
                    <span>{t(`consent.item.${item.id}`, null, item.label)}</span>
                  </label>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`consent-text-${item.id}`}
                    style={styles.expandButton}
                    onClick={() => toggleExpanded(item.id)}
                  >
                    {expanded ? t('consent.collapse') : t('consent.expand')}
                  </button>
                </div>
                {expanded && (
                  <div id={`consent-text-${item.id}`} style={styles.textPanel}>
                    <div style={styles.textTitle}>{t(`legal.${item.id}.title`, null, item.title)}</div>
                    <div style={styles.textBody}>{t(`legal.${item.id}.text`, null, item.text)}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={styles.footer}>
          {error && <p role="alert" style={styles.errorText}>{error}</p>}
          {!error && !allChecked && (
            <p style={styles.helperText}>{t('consent.helper')}</p>
          )}
          <div style={styles.footerButtons}>
            <button type="button" style={styles.cancelButton} onClick={handleCancelClick} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              style={{
                ...styles.confirmButton,
                ...((allChecked && !submitting) ? null : styles.confirmButtonDisabled),
              }}
              onClick={handleConfirm}
              disabled={!allChecked || submitting}
            >
              {submitting ? t('consent.submitting') : t('consent.submit')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 6,
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
    background: 'rgba(5,2,9,0.55)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  dialog: {
    ...schoolPanel('dark'),
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: 'min(100% - 28px, 460px)',
    maxHeight: 'min(88vh, 680px)',
    padding: 0,
    boxSizing: 'border-box',
    outline: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    flex: '0 0 auto',
    padding: '14px 14px 9px',
  },
  title: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.3,
    fontWeight: uiType.weightHeavy,
  },
  closeButton: {
    flexShrink: 0,
    width: 44,
    height: 44,
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
  body: {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    padding: '0 14px 12px',
    WebkitOverflowScrolling: 'touch',
  },
  intro: {
    margin: '0 0 10px',
    color: uiPalette.mutedChalk,
    fontSize: 12,
    lineHeight: 1.45,
    fontWeight: 700,
  },
  masterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    padding: '8px 10px',
    marginBottom: 9,
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboardDeep,
    boxShadow: uiShadows.pressSmall,
    cursor: 'pointer',
  },
  masterText: {
    fontSize: 13,
    fontWeight: uiType.weightStrong,
    color: uiPalette.reward,
  },
  itemBlock: {
    marginBottom: 9,
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.chalkboard,
    boxShadow: uiShadows.pressSmall,
    overflow: 'hidden',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '6px 8px 6px 10px',
  },
  itemLabel: {
    flex: '1 1 auto',
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    color: uiPalette.paperLight,
    fontSize: 12.5,
    lineHeight: 1.35,
    fontWeight: uiType.weightStrong,
    cursor: 'pointer',
  },
  checkboxInput: {
    flexShrink: 0,
    width: 20,
    height: 20,
    accentColor: uiPalette.cta,
    cursor: 'pointer',
  },
  expandButton: {
    flexShrink: 0,
    minWidth: 64,
    minHeight: 44,
    padding: '0 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 12,
    fontWeight: uiType.weightStrong,
    cursor: 'pointer',
  },
  textPanel: {
    margin: '0 8px 8px',
    padding: '10px 10px',
    border: uiBorders.chalk,
    borderRadius: 6,
    background: uiPalette.chalkboardDeep,
    maxHeight: 220,
    overflowY: 'auto',
  },
  textTitle: {
    marginBottom: 6,
    color: uiPalette.reward,
    fontSize: 12.5,
    fontWeight: uiType.weightHeavy,
  },
  textBody: {
    whiteSpace: 'pre-wrap',
    color: uiPalette.mutedChalk,
    fontSize: 11.5,
    lineHeight: 1.55,
    fontWeight: 500,
  },
  footer: {
    flex: '0 0 auto',
    padding: '9px 14px 14px',
    borderTop: uiBorders.chalk,
  },
  errorText: {
    margin: '0 0 8px',
    color: uiPalette.warning,
    fontSize: 11.5,
    lineHeight: 1.4,
    fontWeight: 900,
  },
  helperText: {
    margin: '0 0 8px',
    color: '#c8c1d7',
    fontSize: 11.5,
    lineHeight: 1.4,
    fontWeight: 800,
  },
  footerButtons: {
    display: 'flex',
    gap: 8,
  },
  cancelButton: {
    ...schoolButton('paper'),
    flex: '0 0 auto',
    minWidth: 84,
    minHeight: 48,
    fontSize: 14,
  },
  confirmButton: {
    ...schoolButton('primary'),
    flex: '1 1 auto',
    minHeight: 48,
    fontSize: 15,
  },
  confirmButtonDisabled: {
    background: '#5d5668',
    color: '#a29cb0',
    boxShadow: uiShadows.pressSmall,
    cursor: 'not-allowed',
  },
}
