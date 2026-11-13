import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import { isProjectMaster } from '../lib/projectAdmin.js'
import { paperSticker, schoolButton, schoolPanel, sunnyPalette, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { t, useT } from '../lib/i18n.js'

// compact: 타이틀 게스트용. 로그인 전에는 큰 상태 카드 대신 작은 보조 버튼 하나만 둔다
// (2026-11-03 신규 방문자 감사: 360x640에서 카드가 "ESCAPE!" 헤드라인을 가렸다). 로그인 후 표시는 같다.
// 타이틀 로그인 카드 폭. 오른쪽 위 KO 언어 스티커가 프레임 오른쪽 92~164px(right 92 + 폭 72)를 차지하고
// 카드는 왼쪽 14px에서 시작하므로, 폭을 (프레임 − 188px)로 묶으면 언어 버튼 앞 10px에서 끝난다.
// 이전 식(100% − 112px)은 문의하기만 비켜서 390px 폰에서 로그아웃 버튼이 언어 버튼 밑에 깔렸다(2026-11-14).
// 데스크톱 프레임(≈506px)에서는 300px 상한이 그대로 걸려 모습이 같다.
export const TITLE_ACCOUNT_CARD_WIDTH = 'min(300px, calc(100% - 188px))'
// 화면 폭 360px 이하에서 카드가 한 열(이름 위, 로그아웃 아래)로 접힐 때의 폭.
export const TITLE_ACCOUNT_CARD_NARROW_WIDTH = 'min(218px, calc(100% - 188px))'

export default function GoogleAccountPanel({ compact = false }) {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const error = useAuthStore((s) => s.error)
  const signingIn = useAuthStore((s) => s.signingIn)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signOutOfGoogle = useAuthStore((s) => s.signOutOfGoogle)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <GoogleAccountPanelView
      status={status}
      user={user}
      error={error}
      signingIn={signingIn}
      onSignIn={signInWithGoogle}
      onSignOut={signOutOfGoogle}
      compact={compact}
    />
  )
}

export function GoogleAccountPanelView({ status, user, error, signingIn, onSignIn, onSignOut, compact = false }) {
  useT()
  const signedIn = status === 'signedIn' && user
  const disabled = status === 'unconfigured' || status === 'checking' || signingIn
  const label = getPanelLabel(status, signingIn)

  if (compact && !signedIn) {
    return (
      <section className="google-account-compact" data-account-compact style={styles.compactPanel} aria-label="Google account">
        <style>{`.google-account-compact button:focus-visible { outline: 3px solid ${sunnyPalette.line}; outline-offset: 3px; } .google-account-compact button:active:not(:disabled) { transform: translate3d(1px, 2px, 0) !important; box-shadow: 0 1px 0 ${sunnyPalette.line} !important; }`}</style>
        <button
          type="button"
          className="google-account-action"
          style={styles.compactButton}
          disabled={disabled}
          aria-label={signingIn ? t('account.signingIn') : t('account.signIn')}
          title={status === 'error' ? (error || t('account.detail.error')) : t('account.signIn')}
          onClick={onSignIn}
        >
          <span>{signingIn ? t('account.signingIn') : t('account.signInShort')}</span>
        </button>
      </section>
    )
  }

  return (
    <section
      className={compact ? 'google-account-panel google-account-panel--title' : 'google-account-panel'}
      data-account-title-card={compact ? '' : undefined}
      style={compact ? { ...styles.panel, width: TITLE_ACCOUNT_CARD_WIDTH } : styles.panel}
      aria-label="Google account"
    >
      <style data-google-account-accessibility-css>{GOOGLE_ACCOUNT_ACCESSIBILITY_CSS}</style>
      <div style={styles.identity}>
        {signedIn && user.photoURL ? (
          <img src={user.photoURL} alt="" style={styles.avatar} />
        ) : (
          <span style={styles.avatarFallback}>G</span>
        )}
        <span style={styles.copy}>
          <strong style={styles.title}>{signedIn ? (user.displayName || t('account.google')) : label}</strong>
          <span className="google-account-detail" style={styles.detail}>
            {signedIn ? (user.email || t('account.linked')) : getPanelDetail(status, error)}
          </span>
          {signedIn && isProjectMaster(user) && <span style={styles.masterBadge}>{t('account.master')}</span>}
        </span>
      </div>
      {signedIn ? (
        <button type="button" className="google-account-action" style={styles.secondaryButton} onClick={onSignOut}>
          {t('account.logout')}
        </button>
      ) : (
        <button type="button" className="google-account-action" style={styles.primaryButton} disabled={disabled} onClick={onSignIn}>
          {signingIn ? t('account.signingIn') : t('account.signIn')}
        </button>
      )}
    </section>
  )
}

const GOOGLE_ACCOUNT_ACCESSIBILITY_CSS = `
  .google-account-panel button:focus-visible {
    outline: 3px solid #fff8e8;
    outline-offset: 3px;
  }
  @media (max-width: 360px) {
    .google-account-panel {
      width: min(218px, calc(100% - 28px)) !important;
      grid-template-columns: minmax(0, 1fr) !important;
    }
    .google-account-panel .google-account-action {
      grid-column: 1 / -1;
      justify-self: stretch;
      width: 100%;
    }
    .google-account-panel strong,
    .google-account-panel .google-account-detail {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
    }
    .google-account-panel.google-account-panel--title {
      width: ${TITLE_ACCOUNT_CARD_NARROW_WIDTH} !important;
    }
  }
  /* 타이틀 카드는 폰에서 폭이 좁아지므로 이름·이메일을 한 줄 말줄임으로 묶어 칠판을 덜 가린다. */
  @media (max-width: 480px) {
    .google-account-panel.google-account-panel--title strong,
    .google-account-panel.google-account-panel--title .google-account-detail {
      overflow: hidden !important;
      -webkit-line-clamp: 1 !important;
    }
  }
  @media (max-width: 360px) and (max-height: 600px) {
    .google-account-panel {
      top: auto !important;
      bottom: max(98px, calc(env(safe-area-inset-bottom, 0px) + 88px)) !important;
      left: 50% !important;
      transform: translateX(-50%) rotate(-1deg) !important;
      width: min(236px, calc(100% - 28px)) !important;
    }
    /* 아래로 내려간 카드는 언어 버튼과 겹치지 않으니 원래 폭을 쓴다. */
    .google-account-panel.google-account-panel--title {
      width: min(236px, calc(100% - 28px)) !important;
    }
  }
`

function getPanelLabel(status, signingIn) {
  if (signingIn) return t('account.status.signingIn')
  if (status === 'unconfigured') return t('account.status.unconfigured')
  if (status === 'checking') return t('account.status.checking')
  if (status === 'error') return t('account.status.error')
  return t('account.status.ready')
}

function getPanelDetail(status, error) {
  if (status === 'unconfigured') return t('account.detail.unconfigured')
  if (status === 'checking') return t('account.detail.checking')
  if (status === 'error') return error || t('account.detail.error')
  return t('account.detail.ready')
}

const styles = {
  compactPanel: {
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    left: 'max(12px, calc(env(safe-area-inset-left, 0px) + 8px))',
    zIndex: 3,
    pointerEvents: 'auto',
  },
  // 타이틀 종이 스티커(2026-11-03 밝은 타이틀). 크기·동작은 그대로.
  compactButton: {
    ...paperSticker(-2),
    minWidth: 44,
    minHeight: 44,
    padding: '6px 12px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: uiType.family,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  panel: {
    ...schoolPanel('paper'),
    position: 'absolute',
    top: 'max(14px, calc(env(safe-area-inset-top, 0px) + 8px))',
    left: 'max(14px, calc(env(safe-area-inset-left, 0px) + 8px))',
    // 9:16 프레임 폭(데스크톱 ~506px, 모바일 390px)에서 오른쪽 문의하기(72px+여백)만 비켜 넓게 쓴다.
    // 218px 고정일 때는 상태 문구가 '계정 연동 ...'으로 잘렸다.
    width: 'min(300px, calc(100% - 112px))',
    minHeight: 44,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 8,
    padding: '5px 6px',
    color: uiPalette.ink,
    transform: 'rotate(-1deg)',
    boxSizing: 'border-box',
    zIndex: 3,
    pointerEvents: 'auto',
  },
  identity: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 28,
    height: 28,
    flex: '0 0 auto',
    border: uiBorders.strong,
    borderRadius: 8,
    objectFit: 'cover',
    background: '#ffffff',
  },
  avatarFallback: {
    width: 28,
    height: 28,
    flex: '0 0 auto',
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.strong,
    borderRadius: 8,
    background: '#ffffff',
    color: '#2867d7',
    fontSize: 16,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  copy: {
    minWidth: 0,
    display: 'block',
  },
  // 잘라 내지 않고 최대 두 줄까지 줄바꿈한다(긴 이메일·오류 문구만 두 줄 끝에서 생략).
  title: {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
    color: uiPalette.ink,
    fontSize: 12,
    lineHeight: 1.15,
    fontWeight: uiType.weightHeavy,
  },
  detail: {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
    marginTop: 2,
    color: '#4d4658',
    fontSize: 10,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  masterBadge: {
    display: 'inline-block',
    marginTop: 3,
    padding: '1px 4px',
    borderRadius: 4,
    background: '#5e2ca5',
    color: '#fff9d9',
    fontSize: 9,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.2,
  },
  primaryButton: {
    ...schoolButton('primary'),
    minWidth: 76,
    minHeight: 44,
    padding: '0 10px',
    fontSize: 11,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    boxShadow: uiShadows.pressSmall,
  },
  secondaryButton: {
    ...schoolButton('reward'),
    minWidth: 58,
    minHeight: 44,
    fontSize: 11,
    lineHeight: 1.1,
    boxShadow: uiShadows.pressSmall,
  },
}
