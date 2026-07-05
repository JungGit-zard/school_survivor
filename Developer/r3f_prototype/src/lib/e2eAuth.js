// DEV 전용 E2E 인증 우회 (2026-07-04).
// 배경: 게임 시작이 구글 로그인 필수(계정 귀속 진행도 설계)인데, 구글 OAuth는
// 자동화 브라우저를 차단해 헤드리스 E2E가 게임에 진입할 수 없다.
// 사용: dev 서버에서 `?e2e=1` 쿼리로 접속하면 가짜 유저로 로그인 게이트를 통과한다.
//
// 안전장치:
// - import.meta.env.DEV 가드 — 프로덕션 빌드에서는 항상 false (데드 브랜치로 제거됨)
// - 우회 시 setCloudProgressUser를 호출하지 않아 cloudUser가 null 유지
//   → 진행도 클라우드 저장/로드가 기존 가드로 전부 no-op (RTDB 오염 없음)
// - 랭킹 제출은 submitRun에서 별도 차단

import { isValidWeaponId } from './weaponCatalog.js'

export function isE2EAuthBypass() {
  return Boolean(import.meta.env.DEV)
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('e2e')
}

export function getE2EUser() {
  return {
    uid: 'e2e-local-test',
    displayName: 'E2E테스트',
    email: 'e2e@local.test',
    photoURL: null,
  }
}

// DEV 전용 E2E 런 오버라이드 파서 (2026-07-04).
// 헤드리스 E2E가 콘솔 evaluate로 store를 조작하면 격리 월드 이슈로 불안정 → URL 쿼리만으로
// 무기 무장·쿨다운·생존을 제어한다. 전부 `?e2e=1`과 함께 쓸 때만 유효(없으면 null).
//
//   ?e2e=1&e2eweapon=starlink,onigiri  — 해당 무기를 active:true, level:1로 시작
//   &e2ecd=400                          — 위 무기들의 cooldown을 400ms로
//   &e2ehp=9999                         — player hp·maxHp를 9999로 (생존 보장)
//
// 존재하지 않는 무기 id는 무시(weaponCatalog 기준). 순수 함수 — 부작용 없음.
export function getE2EOverrides(search) {
  if (!import.meta.env.DEV) return null
  const query = typeof search === 'string'
    ? search
    : (typeof window !== 'undefined' ? window.location.search : '')
  const params = new URLSearchParams(query)
  if (!params.has('e2e')) return null

  const overrides = {}

  const weapons = (params.get('e2eweapon') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => id && isValidWeaponId(id))
  if (weapons.length) overrides.weapons = weapons

  const cdRaw = params.get('e2ecd')
  if (cdRaw != null && cdRaw !== '') {
    const cd = Number(cdRaw)
    if (Number.isFinite(cd) && cd >= 0) overrides.cooldownMs = cd
  }

  const hpRaw = params.get('e2ehp')
  if (hpRaw != null && hpRaw !== '') {
    const hp = Number(hpRaw)
    if (Number.isFinite(hp) && hp > 0) overrides.hp = hp
  }

  return Object.keys(overrides).length ? overrides : null
}

// 파싱된 오버라이드를 zustand store에 setState로 패치한다. 매 런 시작(resetGame 이후)에
// 1회 호출한다. resetGame 본체·damagePlayer·무기 로직은 절대 건드리지 않는 순수 추가.
export function applyE2EOverridesToStore(store, search) {
  const overrides = getE2EOverrides(search)
  if (!overrides || !store || typeof store.setState !== 'function') return null

  store.setState((s) => {
    const next = {}

    if (overrides.weapons) {
      const weapons = { ...s.weapons }
      for (const id of overrides.weapons) {
        const cur = weapons[id]
        if (!cur) continue // 카탈로그엔 있으나 store에 없는 경우 방어
        weapons[id] = {
          ...cur,
          active: true,
          level: 1,
          ...(overrides.cooldownMs != null ? { cooldown: overrides.cooldownMs } : {}),
        }
      }
      next.weapons = weapons
    }

    if (overrides.hp != null) {
      next.player = { ...s.player, hp: overrides.hp, maxHp: overrides.hp }
    }

    return next
  })

  return overrides
}
