// @vitest-environment jsdom
import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import TitleBgm from './TitleBgm.jsx'
import { TITLE_BGM_URL } from '../lib/titleBgm.js'
import { acquireStreamingBgm, BRIDGE_MAX_MS, _resetStreamingBgmForTests } from '../lib/streamingBgm.js'
import { installFakeAudio } from '../lib/fakeStreamingAudio.testUtil.js'

// Stand-in for TitleScreen's own holder of the same URL.
function TitleHolder() {
  useEffect(() => {
    const handle = acquireStreamingBgm(TITLE_BGM_URL, { volume: 0.5 })
    return () => handle.release()
  }, [])
  return null
}

let fake, root, container
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  _resetStreamingBgmForTests()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TitleBgm (title song holder)', () => {
  it('handing the title song between two holders keeps one stream playing past the bridge cap', () => {
    act(() => root.render(<TitleHolder />))
    const audio = fake.instances[0]
    audio.currentTime = 17
    act(() => root.render(<section><TitleBgm /></section>))
    act(() => { vi.advanceTimersByTime(BRIDGE_MAX_MS * 3) })
    expect(audio.pause).not.toHaveBeenCalled()
    act(() => root.render(<TitleHolder />))
    act(() => { vi.advanceTimersByTime(BRIDGE_MAX_MS * 3) })
    expect(fake.instances).toHaveLength(1)
    expect(audio).toMatchObject({ src: TITLE_BGM_URL, paused: false, currentTime: 17 })
    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('is no longer used by the app shell: the title song is title-only', () => {
    // 로자리의 방 진입점이 타이틀에서 로비(스테이지 선택) 좌상단으로 옮겨졌다. 방은 이제 로비의
    // 자식 화면이라 로비 곡을 그대로 유지한다 — 앱 셸은 TitleBgm을 더 이상 마운트하지 않는다.
    // 방에서 타이틀 곡을 틀면 로비 곡이 끊기고(하드컷) 나올 때 0초부터 재시작한다.
    const app = readFileSync(new NodeURL('./ReadyGameApp.jsx', import.meta.url), 'utf8')
    expect(app).not.toContain('TitleBgm')
    expect(app).toContain("{(LOBBY_MUSIC_SUB_SCREENS.has(screen) || screen === 'rosariRoom') && <LobbyBgm />}")
  })
})
