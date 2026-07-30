// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { isE2EAudioDiagnostics, isE2EAuthBypass, isE2EPerformanceDiagnostics, getE2EUser, getE2EOverrides, applyE2EOverridesToStore } from './e2eAuth.js'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('e2eAuth (DEV 전용 로그인 우회)', () => {
  it('e2e 파라미터가 없으면 우회하지 않는다', () => {
    window.history.replaceState(null, '', '/')
    expect(isE2EAuthBypass()).toBe(false)
  })

  it('?e2e=1이면 DEV 환경에서 우회한다 (vitest는 DEV=true)', () => {
    window.history.replaceState(null, '', '/?e2e=1')
    expect(isE2EAuthBypass()).toBe(true)
  })

  it('가짜 유저는 고정 uid를 갖고, 실계정과 겹칠 수 없는 형태다', () => {
    const user = getE2EUser()
    expect(user.uid).toBe('e2e-local-test')
    expect(user.displayName).toBeTruthy()
  })
})

describe('getE2EOverrides (DEV 전용 런 오버라이드 파서)', () => {
  it('e2e 파라미터가 없으면 오버라이드가 있어도 null', () => {
    expect(getE2EOverrides('?e2eweapon=starlink&e2ehp=9999')).toBeNull()
  })

  it('e2e만 있고 오버라이드 파라미터가 없으면 null', () => {
    expect(getE2EOverrides('?e2e=1')).toBeNull()
  })

  it('무기 목록·cd·hp를 파싱한다', () => {
    const o = getE2EOverrides('?e2e=1&e2eweapon=starlink,onigiri&e2ecd=400&e2ehp=9999')
    expect(o).toEqual({ weapons: ['starlink', 'onigiri'], cooldownMs: 400, hp: 9999 })
  })

  it('존재하지 않는 무기 id는 무시한다', () => {
    const o = getE2EOverrides('?e2e=1&e2eweapon=starlink,notaweapon,pencilThrow')
    expect(o).toEqual({ weapons: ['starlink', 'pencilThrow'] })
  })

  it('유효한 무기가 하나도 없으면 weapons 키를 넣지 않는다', () => {
    expect(getE2EOverrides('?e2e=1&e2eweapon=bogus,alsobogus')).toBeNull()
  })

  it('공백을 제거하고 파싱한다', () => {
    const o = getE2EOverrides('?e2e=1&e2eweapon=' + encodeURIComponent(' starlink , onigiri '))
    expect(o).toEqual({ weapons: ['starlink', 'onigiri'] })
  })

  it('cd/hp가 잘못된 값이면 무시한다', () => {
    expect(getE2EOverrides('?e2e=1&e2ecd=abc&e2ehp=0')).toBeNull()
    expect(getE2EOverrides('?e2e=1&e2ehp=-5')).toBeNull()
  })

  it('cd=0은 유효한 값으로 취급한다', () => {
    const o = getE2EOverrides('?e2e=1&e2eweapon=starlink&e2ecd=0')
    expect(o).toEqual({ weapons: ['starlink'], cooldownMs: 0 })
  })

  it('명시적인 e2einvincible=1에서만 무적 오버라이드를 만든다', () => {
    expect(getE2EOverrides('?e2einvincible=1')).toBeNull()
    expect(getE2EOverrides('?e2e=1&e2einvincible=0')).toBeNull()
    expect(getE2EOverrides('?e2e=1&e2einvincible=false')).toBeNull()
    expect(getE2EOverrides('?e2e=1&e2einvincible=1')).toEqual({ e2eInvincible: true })
  })

  it('e2ehp만으로는 무적 상태를 만들지 않는다', () => {
    expect(getE2EOverrides('?e2e=1&e2ehp=9999')).toEqual({ hp: 9999 })
  })
})

describe('applyE2EOverridesToStore', () => {
  function makeStore(state) {
    let s = state
    return {
      getState: () => s,
      setState: (updater) => {
        const patch = typeof updater === 'function' ? updater(s) : updater
        s = { ...s, ...patch }
      },
    }
  }

  it('지정 무기를 active·level 1로, cd·hp를 덮어쓴다', () => {
    const store = makeStore({
      weapons: {
        starlink: { active: false, level: 0, cooldown: 3800, damage: 28 },
        pencilThrow: { active: true, level: 1, cooldown: 1100, damage: 1.5 },
      },
      player: { hp: 100, maxHp: 100, speed: 5 },
    })
    const applied = applyE2EOverridesToStore(store, '?e2e=1&e2eweapon=starlink&e2ecd=400&e2ehp=9999')
    expect(applied).toEqual({ weapons: ['starlink'], cooldownMs: 400, hp: 9999 })
    const s = store.getState()
    expect(s.weapons.starlink).toMatchObject({ active: true, level: 1, cooldown: 400, damage: 28 })
    // 지정하지 않은 무기는 불변
    expect(s.weapons.pencilThrow).toMatchObject({ active: true, level: 1, cooldown: 1100 })
    expect(s.player).toMatchObject({ hp: 9999, maxHp: 9999, speed: 5 })
  })

  it('오버라이드가 없으면 null 반환·store 불변', () => {
    const store = makeStore({ weapons: {}, player: { hp: 100, maxHp: 100 } })
    const before = store.getState()
    expect(applyE2EOverridesToStore(store, '?e2e=1')).toBeNull()
    expect(store.getState()).toBe(before)
  })

  it('e2einvincible=1을 store의 전용 상태에 적용한다', () => {
    const store = makeStore({
      weapons: {},
      player: { hp: 100, maxHp: 100 },
      e2eInvincible: false,
    })

    expect(applyE2EOverridesToStore(store, '?e2e=1&e2einvincible=1'))
      .toEqual({ e2eInvincible: true })
    expect(store.getState().e2eInvincible).toBe(true)
  })
})

describe('isE2EAudioDiagnostics', () => {
  it('requires both exact e2e=1 and e2eaudio=1 values', () => {
    expect(isE2EAudioDiagnostics('?e2e=1')).toBe(false)
    expect(isE2EAudioDiagnostics('?e2eaudio=1')).toBe(false)
    expect(isE2EAudioDiagnostics('?e2e=true&e2eaudio=1')).toBe(false)
    expect(isE2EAudioDiagnostics('?e2e=1&e2eaudio=true')).toBe(false)
    expect(isE2EAudioDiagnostics('?e2e=1&e2eaudio=1')).toBe(true)
  })
})

describe('isE2EPerformanceDiagnostics', () => {
  it('requires both exact e2e=1 and e2eperf=1 values', () => {
    expect(isE2EPerformanceDiagnostics('?e2e=1')).toBe(false)
    expect(isE2EPerformanceDiagnostics('?e2eperf=1')).toBe(false)
    expect(isE2EPerformanceDiagnostics('?e2e=true&e2eperf=1')).toBe(false)
    expect(isE2EPerformanceDiagnostics('?e2e=1&e2eperf=true')).toBe(false)
    expect(isE2EPerformanceDiagnostics('?e2e=1&e2eperf=1')).toBe(true)
  })
})
