// 로비 ≡ 메뉴 → 「음악실」(2026-11-08 Terry: "좀비학교에 사용된 노래들을 가지런히 정렬해 들을 수 있게").
// 게임에 쓰인 곡을 게임 순서대로 01~04 번호를 붙여 늘어놓고, 줄을 누르면 그 곡을 반복 재생한다.
// 재생과 로비 음악 양보는 MusicRoomBgm(soundmini 소관)이 맡는다. 이 파일은 화면만 그린다.
// 일시정지·정지 버튼은 두지 않는다(음악은 멈추지 않는다는 운영 규칙). 닫으면 로비 음악으로 돌아간다.
// 아직 아무 곡도 고르지 않았으면 지금 들리는 로비 테마를 '재생 중'으로 표시한다.
import { useEffect, useRef, useState } from 'react'
import { MUSIC_ROOM_TRACKS, getTrackStageNumbers } from '../lib/musicRoom.js'
import { VISIBLE_STAGE_IDS } from '../lib/stageConfig.js'
import { schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { useT } from '../lib/i18n.js'
import MusicRoomBgm from './MusicRoomBgm.jsx'

// 음악실을 열었을 때 실제로 들리고 있는 곡(로비 BGM).
const AUDIBLE_WHEN_NOTHING_PICKED = 'lobby'

// 줄 배치. 넓으면 한 줄(번호 | 곡명·쓰이는 곳 | 상태), 모달이 좁으면(가로 화면 9:16 프레임, 모달 약 190px)
// 첫 줄에 번호와 상태, 둘째 줄에 곡명·쓰이는 곳을 둔다 — 곡명이 한 글자씩 꺾이지 않게. 기준은 모달 폭(container).
const MUSIC_ROOM_CSS = `
  .music-room-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"num copy status";align-items:center;column-gap:10px;row-gap:6px}
  .music-room-num{grid-area:num}
  .music-room-copy{grid-area:copy}
  .music-room-status{grid-area:status;justify-self:end}
  @container (max-width: 250px){
    .music-room-row{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"num status" "copy copy"}
  }
`

// stageIds: 로비가 보여 주는 스테이지 목록. 스테이지가 늘면 '스테이지 1 · 3 · 5'처럼 표기도 따라 는다.
export default function MusicRoomModal({ onClose, stageIds = VISIBLE_STAGE_IDS }) {
  const t = useT()
  const [selectedId, setSelectedId] = useState(null)
  const playingId = selectedId ?? AUDIBLE_WHEN_NOTHING_PICKED
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    // 열리면 포커스를 모달 안(첫 버튼 = 닫기)으로 옮긴다. Escape로 닫고, Tab은 모달 안에서만 돈다.
    const focusables = () => [...(dialogRef.current?.querySelectorAll('button') ?? [])]
    focusables()[0]?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const list = focusables()
      const first = list[0]
      const last = list[list.length - 1]
      const inside = dialogRef.current?.contains(document.activeElement)
      if (event.shiftKey && (!inside || document.activeElement === first)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (!inside || document.activeElement === last)) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const usedIn = (trackId) => {
    const stageNumbers = getTrackStageNumbers(trackId, stageIds)
    return stageNumbers.length > 0
      ? t('musicRoom.usedIn.stages', { stages: stageNumbers.join(' · ') })
      : t(`musicRoom.usedIn.${trackId}`, null, '')
  }

  return (
    <div style={styles.overlay}>
      <style>{MUSIC_ROOM_CSS}</style>
      <MusicRoomBgm trackId={selectedId} />
      <button type="button" tabIndex={-1} aria-label={t('musicRoom.closeAria')} data-testid="music-room-backdrop" style={styles.scrim} onClick={onClose} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="music-room-heading"
        aria-describedby="music-room-hint"
        data-testid="music-room-modal"
        style={styles.modal}
      >
        <div style={styles.header}>
          <h2 id="music-room-heading" style={styles.title}>{t('musicRoom.title')}</h2>
          <button type="button" aria-label={t('common.close')} data-testid="music-room-close" style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <p id="music-room-hint" style={styles.hint}>{t('musicRoom.hint')}</p>
        <ol style={styles.list} aria-label={t('musicRoom.listAria')}>
          {MUSIC_ROOM_TRACKS.map((track, index) => {
            const playing = track.id === playingId
            return (
              <li key={track.id} style={styles.item}>
                <button
                  type="button"
                  className="lobby-press music-room-row"
                  data-testid={`music-room-track-${track.id}`}
                  aria-pressed={playing}
                  style={playing ? styles.rowPlaying : styles.row}
                  onClick={() => setSelectedId(track.id)}
                >
                  <span className="music-room-num" style={playing ? styles.numberPlaying : styles.number}>{String(index + 1).padStart(2, '0')}</span>
                  <span className="music-room-copy" style={styles.copy}>
                    <span style={styles.name}>{t(`musicRoom.track.${track.id}`, null, track.id)}</span>
                    <span style={styles.usedIn}>{usedIn(track.id)}</span>
                  </span>
                  {/* 재생 중 표시는 색만이 아니라 아이콘 + 글자로 알린다. 안 고른 줄은 같은 자리에 재생 아이콘. */}
                  {playing ? (
                    <span className="music-room-status" data-testid="music-room-now-playing" style={styles.nowPlaying}>
                      <SpeakerIcon />
                      {t('musicRoom.nowPlaying')}
                    </span>
                  ) : (
                    <span className="music-room-status" aria-hidden="true" style={styles.playIcon}><PlayIcon /></span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M1.5 5.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor" />
      <path d="M10.6 5.2a3.6 3.6 0 0 1 0 5.6M12.6 3a6.6 6.6 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3.7 1.8v8.4L10.7 6z" fill="currentColor" />
    </svg>
  )
}

// 배치(grid)는 MUSIC_ROOM_CSS의 .music-room-row가 맡는다. 여기는 모양만.
const rowBase = {
  width: '100%',
  minHeight: 58,
  padding: '8px 10px',
  border: uiBorders.strong,
  borderLeft: `6px solid ${uiPalette.mutedChalk}`,
  borderRadius: 8,
  background: uiPalette.paperLight,
  color: uiPalette.ink,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  boxShadow: uiShadows.pressSmall,
  boxSizing: 'border-box',
}

const numberBase = {
  width: 32,
  height: 32,
  display: 'grid',
  placeItems: 'center',
  border: uiBorders.strong,
  borderRadius: 6,
  background: uiPalette.chalkboard,
  color: uiPalette.paperLight,
  fontFamily: uiType.numeric,
  fontSize: 14,
  lineHeight: 1,
  fontWeight: uiType.weightHeavy,
}

const styles = {
  overlay: { position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: uiType.family },
  scrim: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, padding: 0, background: 'rgba(5,2,9,0.5)', backdropFilter: 'blur(2px)', cursor: 'pointer' },
  modal: {
    ...schoolPanel('dark'),
    position: 'relative',
    width: 'min(100% - 28px, 420px)',
    maxHeight: 'min(calc(100dvh - 28px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)), 620px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    borderTop: `6px solid ${uiPalette.cta}`,
    boxSizing: 'border-box',
    // 글자 크기를 모달 폭(cqw)에 맞춘다 — 가로 화면 9:16 프레임에서는 모달이 190px 남짓이다.
    containerType: 'inline-size',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { margin: 0, minWidth: 0, color: uiPalette.paperLight, fontSize: 'clamp(16px, 6cqw, 22px)', lineHeight: 1.1, fontWeight: uiType.weightHeavy, textShadow: `0 3px 0 ${uiPalette.ink}`, overflowWrap: 'anywhere' },
  closeButton: {
    flex: '0 0 auto',
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paperLight,
    color: uiPalette.ink,
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    cursor: 'pointer',
  },
  hint: { margin: 0, color: uiPalette.mutedChalk, fontSize: 12, lineHeight: 1.35, fontWeight: 800, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  // 곡이 늘거나 화면이 낮으면(가로 프레임) 목록만 모달 안에서 스크롤한다.
  list: { flex: 1, minHeight: 0, margin: 0, padding: '2px 2px 4px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', overscrollBehavior: 'contain', listStyle: 'none', scrollbarWidth: 'thin' },
  item: { flexShrink: 0 },
  row: rowBase,
  rowPlaying: { ...rowBase, borderLeft: `6px solid ${uiPalette.cta}`, background: '#dff3ff' },
  number: numberBase,
  numberPlaying: { ...numberBase, background: uiPalette.cta, color: uiPalette.ink },
  copy: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  name: { fontSize: 'clamp(13px, 4.4cqw, 16px)', lineHeight: 1.2, fontWeight: uiType.weightHeavy, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  usedIn: { color: 'rgba(5,2,9,0.66)', fontSize: 12, lineHeight: 1.25, fontWeight: 800, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  nowPlaying: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.cta,
    color: uiPalette.ink,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    whiteSpace: 'nowrap',
  },
  playIcon: {
    width: 28,
    height: 28,
    display: 'grid',
    placeItems: 'center',
    border: uiBorders.hairline,
    borderRadius: '50%',
    color: uiPalette.ink,
    boxSizing: 'border-box',
  },
}
