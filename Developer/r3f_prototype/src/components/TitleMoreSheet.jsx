import { useEffect, useRef } from 'react'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'
import { sunnyPalette, uiType } from '../lib/uiStyle.js'
import { t } from '../lib/i18n.js'

const P = sunnyPalette

// 타이틀 ≡ 시트와 로비 ≡ 메뉴가 같이 쓰는 "게임 밖" 링크(2026-11-08 타이틀 정리 1단계).
// 주소는 예전 타이틀 링크 그대로 — 게임 언어를 홈페이지에 넘긴다. 문의 문구는 6개 언어 게시판 문구.
export function getTitleMoreLinks(locale) {
  const lang = encodeURIComponent(locale || 'ko')
  return [
    { id: 'homepage', href: `/landing?lang=${lang}`, label: t('title.homepage') },
    { id: 'contact', href: `/landing?lang=${lang}#inquiry`, label: (ZOMBIE_BOARD_COPY[locale] || ZOMBIE_BOARD_COPY.ko).contact },
  ]
}

const SHEET_CSS = `
  @keyframes titleMoreSheetIn { from { transform: translate3d(0, 100%, 0); } to { transform: translate3d(0, 0, 0); } }
  .title-more-sheet { animation: titleMoreSheetIn 160ms ease-out; }
  .title-more-item:focus-visible { outline: 3px solid ${P.line}; outline-offset: -5px; }
  .title-more-item:active { background: ${P.sky} !important; }
  @media (prefers-reduced-motion: reduce) {
    .title-more-sheet { animation: none; }
  }
`

// 아래에서 올라오는 시트. Escape·스크림 탭으로 닫고, 열리면 첫 항목에 포커스를 준다
// (닫힐 때 ≡로 포커스를 돌리는 일은 부모 onClose가 한다).
export default function TitleMoreSheet({ locale, onClose, signedIn = false, onSignOut }) {
  const firstItemRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    firstItemRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onCloseRef.current?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const links = getTitleMoreLinks(locale)
  return (
    <div data-title-more-layer style={styles.layer}>
      <style data-title-more-css>{SHEET_CSS}</style>
      <button type="button" aria-label={t('title.moreClose')} tabIndex={-1} style={styles.scrim} onClick={onClose} />
      <div
        id="title-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('title.more')}
        className="title-more-sheet"
        data-title-more-sheet
        style={styles.sheet}
      >
        {links.map((link, index) => (
          <a
            key={link.id}
            ref={index === 0 ? firstItemRef : undefined}
            href={link.href}
            className="title-more-item"
            data-title-more-item={link.id}
            {...(link.id === 'homepage' ? { 'data-title-homepage': '' } : {})}
            style={styles.item}
          >
            {link.label}
          </a>
        ))}
        {signedIn && (
          <button type="button" className="title-more-item" data-title-more-item="logout" style={styles.item} onClick={() => { onClose?.(); onSignOut?.() }}>
            {t('account.logout')}
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  layer: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.42)',
    cursor: 'pointer',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    maxHeight: '50%',
    overflowY: 'auto',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '16px max(16px, calc(env(safe-area-inset-right, 0px) + 12px)) max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px)) max(16px, calc(env(safe-area-inset-left, 0px) + 12px))',
    borderTop: `2.5px solid ${P.line}`,
    borderRadius: '12px 12px 0 0',
    background: P.cream,
  },
  item: {
    minHeight: 52,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    border: `2px solid ${P.line}`,
    borderRadius: 8,
    background: P.cream,
    color: P.line,
    fontFamily: uiType.family,
    fontSize: 16,
    fontWeight: 800,
    lineHeight: 1.2,
    textAlign: 'left',
    textDecoration: 'none',
    cursor: 'pointer',
  },
}
