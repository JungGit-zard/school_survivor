# 상어미사일 게임 내 런타임 구현 보강 기록

일시: 2026-06-14
대상: `Developer/r3f_prototype`

## 목적

상어미사일이 코드와 카탈로그에 존재하는 수준을 넘어, 실제 게임 화면에서 활성화된 뒤 발사, 타겟팅, 폭발 피해까지 이어지는지 검증 가능한 상태로 보강했다.

## 변경 내용

- `src/lib/sharkMissileRuntime.js`를 추가해 상어미사일 발사 가능 조건과 발사 payload 생성을 순수 함수로 분리했다.
- 상어미사일 첫 발은 `lastFireMs === null` 상태에서 즉시 발사되도록 했다.
- 첫 발 이후에는 기존 `cooldown: 14000ms`를 유지한다.
- `SharkMissileWeapon`이 위 런타임 헬퍼를 사용하도록 연결했다.
- Playwright 검증을 위해 `window.__sharkMissileDebug` 배열이 있을 때만 `launch`, `explode`, `no-target` 이벤트를 기록하는 숨은 디버그 훅을 추가했다. 일반 플레이에는 노출되지 않는다.
- `e2e/shark_missile_check.spec.js`를 추가해 실제 브라우저에서 타이틀 진입, 모든 무기 해금 버튼, 게임 시작, 상어미사일 활성화, 군집 타겟 피해를 검증한다.
- Playwright와 Vitest가 서로의 테스트 파일을 잡지 않도록 `vite.config.js`에서 `e2e/**`를 Vitest 제외 목록에 추가했다.
- 타이틀에 코인상점 버튼이 있는 현재 기획에 맞춰 `resultCoinShopFlow.test.jsx`의 오래된 기대값을 갱신했다.

## 검증 포인트

- 상어미사일은 활성화 상태에서 첫 프레임 발사 조건을 만족한다.
- 상어미사일은 군집 타겟을 향해 발사된다.
- 폭발 시 `applyRadialDamage` 경로로 피해 `30`, 넉백 `3.6`, 넉백 시간 `150ms`를 전달한다.
- 테스트용 30개 군집 몸체가 모두 상어미사일 폭발 피해를 받는 것을 Playwright로 확인했다.

## 주의

Playwright 검증 중 Vite HMR 쿼리(`?t=...`) 때문에 브라우저에서 `/src/store/useGameStore.js`를 직접 import하면 게임 컴포넌트와 다른 Store 인스턴스가 생길 수 있었다. E2E spec는 `SharkMissile.jsx`가 실제 import한 Store URL을 읽어 같은 인스턴스를 조작하도록 처리했다.
