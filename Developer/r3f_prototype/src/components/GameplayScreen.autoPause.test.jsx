// node 환경 유지 — jsdom 도블록을 붙이면 import.meta.url이 http URL이 되어
// readFileSync(new URL(...))가 "The URL must be of scheme file"로 깨진다.
// 자동 일시정지 트리거 회귀 테스트 (2026-08-09).
// 신고: 전투 중 이유 없이 자리비움 오버레이가 떴다. 원인은 window blur 리스너였다 —
// blur는 "탭이 안 보인다"가 아니라 "창이 포커스를 잃었다"라서, 백그라운드 프로세스가
// 콘솔 창을 잠깐 띄우기만 해도 발생한다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./GameplayScreen.jsx', import.meta.url), 'utf8')

describe('GameplayScreen 자동 일시정지', () => {
  it('window blur로는 일시정지하지 않는다', () => {
    expect(source).not.toContain("addEventListener('blur'")
    expect(source).not.toContain('addEventListener("blur"')
  })

  it('탭 숨김(visibilitychange)과 이탈(pagehide)로는 여전히 일시정지한다', () => {
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibility)")
    expect(source).toContain("window.addEventListener('pagehide', pauseIfPlaying)")
  })

  it('등록한 리스너를 전부 해제한다 — 등록/해제 짝이 맞아야 한다', () => {
    const added = [...source.matchAll(/addEventListener\('([a-z]+)'/g)].map((m) => m[1]).sort()
    const removed = [...source.matchAll(/removeEventListener\('([a-z]+)'/g)].map((m) => m[1]).sort()
    expect(removed).toEqual(added)
  })

  it('일시정지는 playing 상태에서만 걸린다', () => {
    expect(source).toContain("if (currentPhase === 'playing') pauseGame('auto')")
  })
})
