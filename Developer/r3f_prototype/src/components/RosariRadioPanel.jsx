// 로자리의 방 라디오 패널(2026-11-14 Terry: "근처에 가면 게임에 들어간 음악을 모두 들을수있게 해").
// 화면만 그린다. 재생·방 음악 양보·무음 방지는 lib/roomRadio.js가 맡는다(soundmini 소관).
// 겉모습·배치는 옷장 패널(RosariRoom.jsx의 wardrobeSheet / wardrobePanel)과 같다:
//   sheet='bottom' — 세로 화면(또는 폭 < 560px): 아래쪽 시트, 높이 ≤ 40%라 로자리가 위에 보인다.
//   sheet='side'   — 가로 화면: 오른쪽 위 패널.
// 패널을 닫아도 라디오는 계속 나온다. 끄기(■) 또는 방 나가기에서만 방 음악으로 돌아간다.
//
// Props
//   open    — 패널 표시 여부
//   onClose — 닫기(× 버튼, Escape)
//   sheet   — 'bottom' | 'side' (getRosariRoomLayout(size).wardrobeSheet를 그대로 넘기면 된다)
import { useEffect, useState } from 'react'
import { ROOM_MUSIC_TRACK_ID, ROOM_RADIO_TRACKS, getRoomRadioTrack, roomRadio, useRoomRadio } from '../lib/roomRadio.js'
import { useT } from '../lib/i18n.js'

export function roomRadioTrackName(t, trackId) {
  const index = ROOM_RADIO_TRACKS.findIndex((track) => track.id === trackId)
  if (index < 0) return ''
  return t(`roomRadio.track.${trackId}`, null, '') || t('roomRadio.trackFallback', { number: index + 1 })
}

function usedIn(t, track) {
  if (track.stageNumbers.length > 0) return t('roomRadio.usedIn.stages', { stages: track.stageNumbers.join(' · ') })
  if (track.id === 'opening' || track.id === 'lobby') return t(`roomRadio.usedIn.${track.id}`)
  return t('roomRadio.usedIn.upcoming')
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      <path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// 라디오 조작 아이콘(이전 / 재생 / 끄기 / 다음). 글자 라벨은 aria-label과 버튼 글자로 함께 준다.
function ControlIcon({ kind }) {
  const paths = {
    prev: <><rect x="2" y="3" width="2" height="10" fill="currentColor" /><path d="M14 3v10L5 8z" fill="currentColor" /></>,
    next: <><rect x="12" y="3" width="2" height="10" fill="currentColor" /><path d="M2 3v10l9-5z" fill="currentColor" /></>,
    play: <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />,
    stop: <rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor" />,
  }
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>{paths[kind]}</svg>
}

function RadioBody({ onClose, sheet }) {
  const t = useT()
  const radio = useRoomRadio()
  const [lastPicked, setLastPicked] = useState(radio.trackId)
  useEffect(() => { if (radio.trackId) setLastPicked(radio.trackId) }, [radio.trackId])
  const radioOn = radio.trackId !== null
  const status = radioOn
    ? t('roomRadio.statusOn', { name: roomRadioTrackName(t, radio.trackId) })
    : t('roomRadio.statusOff', { name: roomRadioTrackName(t, ROOM_MUSIC_TRACK_ID) })

  const togglePlay = () => {
    if (radioOn) roomRadio.stop()
    else roomRadio.play(getRoomRadioTrack(lastPicked)?.id ?? ROOM_RADIO_TRACKS[0].id)
  }

  return (
    <section
      role="dialog"
      aria-label={t('roomRadio.dialogAria')}
      data-room-radio-panel
      data-room-radio-sheet={sheet}
      style={sheet === 'bottom' ? styles.sheet : styles.side}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        // 방의 Escape(타이틀로 돌아가기)까지 가지 않게 여기서 멈춘다.
        event.preventDefault()
        event.stopPropagation()
        onClose?.()
      }}
    >
      <div style={styles.header}>
        <h2 style={styles.title}>{t('roomRadio.title')}</h2>
        <button autoFocus type="button" data-room-radio-close aria-label={t('roomRadio.closeAria')} style={styles.closeButton} onClick={onClose}>×</button>
      </div>
      <p data-room-radio-status aria-live="polite" style={styles.status}>{status}</p>
      <div role="group" aria-label={t('roomRadio.controlsAria')} style={styles.controls}>
        <button type="button" data-room-radio-prev aria-label={t('roomRadio.prev')} style={styles.controlButton} onClick={() => roomRadio.prev()}>
          <ControlIcon kind="prev" />
        </button>
        <button
          type="button"
          data-room-radio-toggle={radioOn ? 'stop' : 'play'}
          data-ui-sfx={radioOn ? 'toggleOff' : 'toggleOn'}
          style={radioOn ? styles.toggleOn : styles.toggleOff}
          onClick={togglePlay}
        >
          <ControlIcon kind={radioOn ? 'stop' : 'play'} />
          {t(radioOn ? 'roomRadio.stop' : 'roomRadio.play')}
        </button>
        <button type="button" data-room-radio-next aria-label={t('roomRadio.next')} style={styles.controlButton} onClick={() => roomRadio.next()}>
          <ControlIcon kind="next" />
        </button>
      </div>
      <ol data-room-radio-scroll aria-label={t('roomRadio.listAria')} style={styles.list}>
        {ROOM_RADIO_TRACKS.map((track, index) => {
          const sounding = track.id === radio.soundingId
          const loading = !sounding && track.id === radio.trackId
          const roomMusic = radio.soundingId === null && !loading && track.id === ROOM_MUSIC_TRACK_ID
          const marked = sounding || loading || roomMusic
          return (
            <li key={track.id} style={styles.item}>
              <button
                type="button"
                data-room-radio-track={track.id}
                aria-pressed={track.id === radio.trackId}
                style={marked ? styles.rowPlaying : styles.row}
                onClick={() => roomRadio.play(track.id)}
              >
                <span style={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                <span style={styles.copy}>
                  <span style={styles.name}>{roomRadioTrackName(t, track.id)}</span>
                  <span style={styles.usedIn}>{usedIn(t, track)}</span>
                </span>
                {marked && (
                  <span data-room-radio-marker={sounding ? 'playing' : loading ? 'loading' : 'room'} style={styles.marker}>
                    <SpeakerIcon />
                    {t(sounding ? 'roomRadio.nowPlaying' : loading ? 'roomRadio.loading' : 'roomRadio.roomMusic')}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function RosariRadioPanel({ open, onClose, sheet = 'bottom' }) {
  if (!open) return null
  return <RadioBody onClose={onClose} sheet={sheet === 'side' ? 'side' : 'bottom'} />
}

// 방 하단 레일의 "라디오 켜기" 버튼(옷장 버튼과 같은 모양). 라디오 근처이거나 패널이 열려 있을 때만 누를 수 있다.
export function RosariRadioButton({ near, open, onToggle, buttonRef }) {
  const t = useT()
  const enabled = Boolean(open || near)
  return (
    <button
      ref={buttonRef}
      type="button"
      data-room-radio-open
      aria-expanded={Boolean(open)}
      disabled={!enabled}
      style={enabled ? styles.openButton : styles.openButtonDisabled}
      onClick={onToggle}
    >
      {t(open ? 'roomRadio.closeButton' : 'roomRadio.openButton')}
    </button>
  )
}

const panel = {
  border: '3px solid #8a4a73',
  borderRadius: 18,
  background: 'rgba(255,247,230,0.9)',
  boxShadow: '0 10px 0 rgba(85,45,75,0.22), 0 18px 32px rgba(70,35,72,0.25)',
  color: '#5f2d58',
  position: 'absolute',
  zIndex: 4,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: 6,
  touchAction: 'pan-y',
}
const press = { minHeight: 44, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', boxSizing: 'border-box' }
const toggleBase = { ...press, flex: '1 1 auto', minWidth: 88, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', borderRadius: 14, fontSize: 16, fontWeight: 1000 }
const rowBase = { ...press, width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 12, textAlign: 'left', fontFamily: 'inherit' }

const styles = {
  sheet: { ...panel, left: 4, right: 4, bottom: 4, maxHeight: '40%' },
  side: { ...panel, top: 4, right: 4, width: 'min(292px, calc(100% - 8px))', maxHeight: 'calc(100% - 8px)' },
  header: { display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  title: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 1000 },
  closeButton: { ...press, minWidth: 44, flexShrink: 0, border: '3px solid #7c416e', borderRadius: 999, background: '#fff3cd', color: '#4e2449', fontSize: 24, fontWeight: 1000 },
  status: { flexShrink: 0, margin: '0 0 4px', fontSize: 13, fontWeight: 900, lineHeight: 1.3, overflowWrap: 'anywhere' },
  controls: { display: 'flex', flexShrink: 0, gap: 6, marginBottom: 6 },
  controlButton: { ...press, minWidth: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #7c416e', borderRadius: 14, background: '#fff7fb', color: '#4e2449' },
  toggleOff: { ...toggleBase, border: '3px solid #7c416e', background: '#ffacd0', color: '#4e2449' },
  toggleOn: { ...toggleBase, border: '3px solid #7c416e', background: '#fff3cd', color: '#4e2449' },
  list: { minHeight: 0, margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y' },
  item: { margin: 0 },
  row: { ...rowBase, border: '2px solid #b991ab', background: '#fff7fb', color: '#5f2d58' },
  rowPlaying: { ...rowBase, border: '3px solid #7c416e', background: '#ffacd0', color: '#4e2449' },
  number: { flexShrink: 0, minWidth: 22, fontSize: 13, fontWeight: 1000, fontVariantNumeric: 'tabular-nums' },
  copy: { minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 1 },
  name: { fontSize: 15, fontWeight: 1000, lineHeight: 1.2, overflowWrap: 'anywhere' },
  usedIn: { fontSize: 11, fontWeight: 800, lineHeight: 1.2, color: '#6d4f66', overflowWrap: 'anywhere' },
  marker: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 999, background: '#fff3cd', fontSize: 11, fontWeight: 1000, whiteSpace: 'nowrap' },
  openButton: { ...press, width: '100%', border: '3px solid #7c416e', borderRadius: 14, background: '#ffacd0', color: '#4e2449', fontWeight: 1000 },
  openButtonDisabled: { ...press, width: '100%', border: '3px solid #b991ab', borderRadius: 14, background: '#eadfe7', color: '#8b7286', fontWeight: 900, cursor: 'not-allowed' },
}
