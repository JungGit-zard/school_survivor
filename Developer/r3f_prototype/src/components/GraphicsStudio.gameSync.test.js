// node 환경 유지 — jsdom 도블록을 붙이면 import.meta.url이 http URL이 되어
// readFileSync(new URL(...))가 "The URL must be of scheme file"로 깨진다.
//
// Apply 즉시 반영 회귀 테스트 (2026-08-11).
// 신고: 스튜디오에서 Apply를 눌러도 게임에 안 바뀐다. 원인은 sendGameSync에서
// BroadcastChannel 브로드캐스트가 게임 창 핸들 가드와 Game URL 파싱 가드 아래에
// 있었던 것 — 스튜디오가 직접 연 게임 창이 없으면 그 두 가드에서 return 해버려
// 브로드캐스트에 도달하지 못했다. 사용자가 게임을 별도 탭에서 직접 연 경우가
// 정확히 그 상황이다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./GraphicsStudio.jsx', import.meta.url), 'utf8')
const syncStart = source.indexOf('const sendGameSync =')
const syncEnd = source.indexOf('\n  }', syncStart)
const sendGameSync = source.slice(syncStart, syncEnd)

describe('Studio Apply 게임 즉시 반영', () => {
  it('sendGameSync 본문을 찾을 수 있다', () => {
    expect(syncStart).toBeGreaterThan(-1)
    expect(sendGameSync).toContain('BroadcastChannel')
  })

  it('브로드캐스트가 게임 창 핸들 가드보다 먼저 실행된다', () => {
    const broadcast = sendGameSync.indexOf('new BroadcastChannel(STUDIO_GAME_SYNC_CHANNEL)')
    const windowGuard = sendGameSync.indexOf('if (!target || target.closed)')
    expect(broadcast).toBeGreaterThan(-1)
    expect(windowGuard).toBeGreaterThan(-1)
    expect(broadcast).toBeLessThan(windowGuard)
  })

  it('브로드캐스트가 Game URL 파싱 가드보다 먼저 실행된다', () => {
    const broadcast = sendGameSync.indexOf('new BroadcastChannel(STUDIO_GAME_SYNC_CHANNEL)')
    const urlGuard = sendGameSync.indexOf('parseStudioGameUrl(gameUrl)')
    expect(urlGuard).toBeGreaterThan(-1)
    expect(broadcast).toBeLessThan(urlGuard)
  })

  it('게임 창이 없어도 실패로 반환하지 않는다 — 브로드캐스트는 이미 나갔다', () => {
    expect(sendGameSync).not.toContain('return false')
  })

  it('콜드 로딩 게임 창용 pendingGameSync 재전송 장치는 유지된다', () => {
    expect(sendGameSync).toContain('pendingGameSyncRef.current = {')
    expect(sendGameSync).toContain('postSync()')
  })
})
