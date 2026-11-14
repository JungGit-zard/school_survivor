// @vitest-environment jsdom
// 로자리의 방 라디오 패널: 곡 목록·재생 중 표시·재생/끄기·이전/다음·닫기, 터치 타깃 44px, 세로/가로 배치.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RosariRadioPanel, { RosariRadioButton, roomRadioTrackName } from './RosariRadioPanel.jsx'
import { ROOM_RADIO_TRACKS, _resetRoomRadioForTests, roomRadio } from '../lib/roomRadio.js'
import { setLobbyBgmYielded } from '../lib/lobbyBgm.js'
import { _resetStreamingBgmForTests } from '../lib/streamingBgm.js'
import { installFakeAudio } from '../lib/fakeStreamingAudio.testUtil.js'
import { setLocale, t } from '../lib/i18n.js'

let root, container, fake

const render = (element) => act(() => root.render(element))
const q = (selector) => container.querySelector(selector)
const qa = (selector) => [...container.querySelectorAll(selector)]
const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
const marker = (id) => q(`[data-room-radio-track="${id}"] [data-room-radio-marker]`)?.getAttribute('data-room-radio-marker') ?? null

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
  setLocale('ko')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => roomRadio.stop())
  act(() => root.unmount())
  container.remove()
  _resetRoomRadioForTests()
  setLobbyBgmYielded(false)
  _resetStreamingBgmForTests()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RosariRadioPanel', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<RosariRadioPanel open={false} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('게임 음악 전부를 번호와 이름으로 늘어놓고, 꺼져 있으면 로비 테마에 「방 음악」 표시', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    const rows = qa('[data-room-radio-track]')
    expect(rows.map((row) => row.getAttribute('data-room-radio-track'))).toEqual(ROOM_RADIO_TRACKS.map((track) => track.id))
    for (const track of ROOM_RADIO_TRACKS) {
      const name = roomRadioTrackName(t, track.id)
      expect(name).toBeTruthy()
      expect(q(`[data-room-radio-track="${track.id}"]`).textContent).toContain(name)
    }
    expect(q('[data-room-radio-track="stage5"]').textContent).toContain('캔디 보이')
    expect(marker('lobby')).toBe('room')
    expect(q('[data-room-radio-status]').textContent).toBe('라디오 꺼짐 · 방 음악: 로비 테마')
    expect(q('[data-room-radio-toggle]').getAttribute('data-room-radio-toggle')).toBe('play')
  })

  it('곡을 누르면 그 곡이 재생 중으로 표시되고, 끄기를 누르면 방 음악으로 돌아간다', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    click(q('[data-room-radio-track="opening"]'))
    expect(roomRadio.getState().trackId).toBe('opening')
    expect(marker('opening')).toBe('playing')
    expect(marker('lobby')).toBe(null)
    expect(q('[data-room-radio-track="opening"]').getAttribute('aria-pressed')).toBe('true')
    expect(q('[data-room-radio-status]').textContent).toBe('라디오: 오프닝 테마')
    expect(q('[data-room-radio-toggle]').getAttribute('data-room-radio-toggle')).toBe('stop')
    click(q('[data-room-radio-toggle]'))
    expect(roomRadio.getState().trackId).toBe(null)
    expect(marker('lobby')).toBe('room')
  })

  it('재생 버튼은 마지막으로 들은 곡을 다시 켠다(처음엔 첫 곡)', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    click(q('[data-room-radio-toggle]'))
    expect(roomRadio.getState().trackId).toBe(ROOM_RADIO_TRACKS[0].id)
    click(q('[data-room-radio-track="stage6"]'))
    click(q('[data-room-radio-toggle]'))
    expect(roomRadio.getState().trackId).toBe(null)
    click(q('[data-room-radio-toggle]'))
    expect(roomRadio.getState().trackId).toBe('stage6')
  })

  it('불러오는 중인 곡은 「불러오는 중」, 이전/다음 버튼은 목록을 따라 움직인다', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    click(q('[data-room-radio-track="opening"]'))
    fake.setDeferPlaying(true)
    click(q('[data-room-radio-next]'))
    expect(roomRadio.getState().trackId).toBe(ROOM_RADIO_TRACKS[1].id)
    expect(marker(ROOM_RADIO_TRACKS[1].id)).toBe('loading')
    expect(marker('opening')).toBe('playing')
    click(q('[data-room-radio-prev]'))
    click(q('[data-room-radio-prev]'))
    expect(roomRadio.getState().trackId).toBe(ROOM_RADIO_TRACKS.at(-1).id)
  })

  it('× 와 Escape로 닫힌다. Escape는 방(타이틀로 돌아가기)까지 가지 않는다', () => {
    const onClose = vi.fn()
    const roomEscape = vi.fn()
    window.addEventListener('keydown', roomEscape)
    render(<RosariRadioPanel open onClose={onClose} />)
    expect(document.activeElement).toBe(q('[data-room-radio-close]'))
    click(q('[data-room-radio-close]'))
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => { q('[data-room-radio-close]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(roomEscape).not.toHaveBeenCalled()
    window.removeEventListener('keydown', roomEscape)
  })

  it('패널을 닫아도 라디오는 계속 나온다', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    click(q('[data-room-radio-track="stage5"]'))
    render(<RosariRadioPanel open={false} onClose={() => {}} />)
    expect(roomRadio.getState().trackId).toBe('stage5')
  })

  it('모든 버튼이 44px 이상 터치 타깃', () => {
    render(<RosariRadioPanel open onClose={() => {}} />)
    const buttons = qa('button')
    expect(buttons.length).toBe(ROOM_RADIO_TRACKS.length + 4)
    for (const button of buttons) {
      expect(parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(44)
    }
    for (const selector of ['[data-room-radio-close]', '[data-room-radio-prev]', '[data-room-radio-next]']) {
      expect(parseFloat(q(selector).style.minWidth)).toBeGreaterThanOrEqual(44)
    }
  })

  it('세로 화면은 높이 40% 이하 아래 시트, 가로 화면은 오른쪽 패널', () => {
    render(<RosariRadioPanel open onClose={() => {}} sheet="bottom" />)
    let panel = q('[data-room-radio-panel]')
    expect(panel.getAttribute('data-room-radio-sheet')).toBe('bottom')
    expect(panel.style.maxHeight).toBe('40%')
    expect(panel.style.bottom).toBe('4px')
    render(<RosariRadioPanel open onClose={() => {}} sheet="side" />)
    panel = q('[data-room-radio-panel]')
    expect(panel.getAttribute('data-room-radio-sheet')).toBe('side')
    expect(panel.style.right).toBe('4px')
    expect(panel.style.top).toBe('4px')
    expect(q('[data-room-radio-scroll]').style.overflowY).toBe('auto')
  })

  it('영어·일본어로도 곡 이름이 나온다', () => {
    setLocale('en')
    render(<RosariRadioPanel open onClose={() => {}} />)
    expect(q('[data-room-radio-track="stage6"]').textContent).toContain('Candy Girl')
    setLocale('ja')
    render(<RosariRadioPanel open onClose={() => {}} sheet="side" />)
    expect(q('[data-room-radio-track="opening"]').textContent).toContain('オープニングテーマ')
    setLocale('ko')
  })
})

describe('RosariRadioButton', () => {
  it('라디오에서 멀면 누를 수 없고, 가까우면 「라디오 켜기」, 열려 있으면 「라디오 닫기」', () => {
    const onToggle = vi.fn()
    render(<RosariRadioButton near={false} open={false} onToggle={onToggle} />)
    expect(q('[data-room-radio-open]').disabled).toBe(true)
    render(<RosariRadioButton near open={false} onToggle={onToggle} />)
    expect(q('[data-room-radio-open]').disabled).toBe(false)
    expect(q('[data-room-radio-open]').textContent).toBe('라디오 켜기')
    click(q('[data-room-radio-open]'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    render(<RosariRadioButton near={false} open onToggle={onToggle} />)
    expect(q('[data-room-radio-open]').disabled).toBe(false)
    expect(q('[data-room-radio-open]').textContent).toBe('라디오 닫기')
    expect(parseFloat(q('[data-room-radio-open]').style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
