# 상어미사일 게임 내 구현 검증 기록

일시: 2026-06-14
대상: `Developer/r3f_prototype`

## 검증 명령

- `npm test -- src/lib/sharkMissileRuntime.test.js src/lib/sharkMissileTargeting.test.js src/store/useGameStore.sharkMissileUnlock.test.js`
- `npx playwright test e2e/shark_missile_check.spec.js --headed --workers=1`
- `npm test -- --run`
- `npm run build`

## 결과

- 상어미사일 런타임/타겟팅/해금 관련 테스트: 통과, 3 files / 9 tests.
- Playwright 실제 브라우저 검증: 통과, 1 test.
- 전체 Vitest: 통과, 40 files / 242 tests.
- production build: 통과.

## Playwright 검증 내용

실제 `http://127.0.0.1:5178` 게임을 Chromium headed 모드로 열어 다음을 확인했다.

1. 타이틀 화면에서 `모든 무기 해금` 버튼을 누른다.
2. `게임 시작`으로 Stage 1에 진입한다.
3. 게임 컴포넌트가 실제 사용하는 Zustand Store 인스턴스를 찾아 상어미사일만 활성화한다.
4. 테스트용 적 몸체 30개를 플레이어 정면 군집으로 배치한다.
5. 상어미사일 `launch`와 `explode` 디버그 이벤트가 발생하는지 확인한다.
6. 테스트용 적 몸체 30개가 각각 피해 `30`과 넉백 `3.6`, 넉백 시간 `150ms`를 받는지 확인한다.

## 증거 파일

- `Quaility_Assurance/playwright_shark_title_2026-06-14.png`
- `Quaility_Assurance/playwright_shark_game_verified_2026-06-14.png`

## 판정

상어미사일은 게임 내에서 활성화 후 실제 발사되고, 군집 타겟에 폭발 피해를 전달하는 상태로 검증 완료.
