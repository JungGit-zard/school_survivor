import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { _resetAuthStoreForTests, useAuthStore } from './useAuthStore.js'

const VERIFIED_GOOGLE_MASTER = {
  email: 'zard5388@gmail.com',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
}

describe('신 전용 불사 치트 권한', () => {
  beforeEach(() => {
    _resetAuthStoreForTests()
    useGameStore.getState().resetGame()
  })

  it('일반 계정은 불사를 켤 수 없고 치명 피해로 사망한다', () => {
    useAuthStore.setState({
      user: { email: 'player@example.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] },
    })

    expect(useGameStore.getState().setGodMode(true)).toBe(false)
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 1 } }))
    useGameStore.getState().damagePlayer(1, { ignoreInvulnerability: true })

    expect(useGameStore.getState()).toMatchObject({ phase: 'gameover', godMode: false })
  })

  it('검증된 신 계정이 직접 켠 동안만 일반 피해와 즉사를 막는다', () => {
    useAuthStore.setState({ user: VERIFIED_GOOGLE_MASTER })

    expect(useGameStore.getState().setGodMode(true)).toBe(true)
    useGameStore.setState((state) => ({ player: { ...state.player, hp: 1 } }))
    useGameStore.getState().damagePlayer(1, { ignoreInvulnerability: true })
    useGameStore.getState().killPlayer('matilda')

    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', godMode: true })
    expect(useGameStore.getState().player.hp).toBe(1)

    useGameStore.getState().setGodMode(false)
    useGameStore.getState().killPlayer('matilda')
    expect(useGameStore.getState()).toMatchObject({ phase: 'gameover', godMode: false, deathCause: 'matilda' })
  })

  it('재시작과 권한 상실은 불사를 무효화한다', () => {
    useAuthStore.setState({ user: VERIFIED_GOOGLE_MASTER })
    expect(useGameStore.getState().setGodMode(true)).toBe(true)

    useGameStore.getState().resetGame()
    expect(useGameStore.getState().godMode).toBe(false)

    expect(useGameStore.getState().setGodMode(true)).toBe(true)
    useAuthStore.setState({ user: null })
    useGameStore.getState().killPlayer('matilda')
    expect(useGameStore.getState()).toMatchObject({ phase: 'gameover', godMode: false, deathCause: 'matilda' })
  })
})
