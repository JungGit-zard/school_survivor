# Stage 2 Corridor QA Plan And Initial Validation · 2026-06-04

> 🔄 **2026-06-11 — 스테이지 길이 5분→4분:** 검증 기준 타임라인이 ×0.8 비례 축소됨 (클리어 300→240s, 보스 240→192s, E04 도입 90→72s). 본 문서의 5분/300초 기준 항목은 ×0.8로 재계산해 검증할 것. 현행 정본: 코드 + `Planner/B. GAME_DESIGN/Stage_balance_summary.md`.

## Scope

Stage 2 복도형 원거리 투사체 MVP 구현의 자동 테스트 기준과 수동 검증 항목을 기록한다.

## Automatic Test Coverage Added

- `stageConfig.test.js`
  - Stage 1 기본값 유지.
  - Stage 2 300초, 별도 기록 키, E04 90초 도입 확인.
  - Stage 2 잠금 해제 조건 확인.
- `stage2ProjectileRules.test.js`
  - 90초 전 E04 발사 금지.
  - 스폰 후 첫 발사 지연.
  - 탄환 상한, 근접 발사 금지, 보스 압박 구간 억제.
- `playerRecords.test.js`
  - Stage 2 기록 키의 구버전 저장 데이터 호환 기본값.
- `useGameStore.unlocks.test.js`
  - Stage 2 클리어가 Stage 2 기록만 올리는지 확인.
  - Stage 1 180초 생존이 Stage 2 잠금 해제 진행도로 기록되는지 확인.
- `Enemies.test.jsx`
  - Stage 1 E04 회귀 금지.
  - Stage 2 E04 90초 이후 도입.
- `TitleScreen.settings.test.jsx`
  - Stage 2 잠금 표시.
  - Stage 2 해금 후 선택 시작 콜백.

## Initial Automated Result

- Command: `npm test -- stageConfig.test.js stage2ProjectileRules.test.js playerRecords.test.js useGameStore.unlocks.test.js Enemies.test.jsx TitleScreen.settings.test.jsx ClassroomFloor.test.jsx HUD.test.jsx resultCoinShopFlow.test.jsx`
- Result: 9 files passed, 63 tests passed.
- Command: `npm test`
- Result: 32 files passed, 198 tests passed.
- Command: `npm run build`
- Result: passed. Vite reported the existing large bundle warning after build.

## Browser Smoke Result

- URL: `http://127.0.0.1:5174/`
- Tool: `agent-browser` session `stage2`
- Initial title screen: Stage 2 appeared locked before progress records were present.
- Unlock check: injecting Stage 1 clear progress into the isolated browser session enabled the `Stage 2 복도 탄환` button.
- Entry check: selecting Stage 2 and pressing `게임 시작` entered gameplay.
- HUD check: in gameplay, the accessibility snapshot showed `Stage 2`, timer, HP, level, pause, and restart controls.
- Visual check: screenshot saved at `tmp/stage2-browser-verification.png`; the Stage 2 corridor lanes, center safe strip, player, enemies, item drops, and HUD rendered without a blank canvas.

## Manual QA Still Required

- Stage 1에서 5분 동안 E04가 보이지 않는지 확인한다.
- Stage 2를 해금 상태로 진입할 수 있는지 확인한다. Initial browser smoke: pass.
- Stage 2 바닥 레인 표시가 플레이어/적/아이템을 가리지 않는지 확인한다. Initial browser smoke: pass.
- 87~90초 E04 경고가 HUD와 겹치지 않는지 확인한다.
- E04 첫 탄환이 즉시 나오지 않고 보고 피할 수 있는지 확인한다.
- 237~240초 보스 경고가 Stage 1/2 모두에서 정상 표시되는지 확인한다.
- Stage 2 결과창이 Stage 2 클리어로 표시되는지 확인한다.

## Known Risk

- E04 탄환 상한은 현재 개별 E04의 활성 탄환 수를 기준으로 강하게 제한하고, 스폰 쪽에서 E04 개체 수 상한을 같이 적용한다. 이후 더 정밀한 전역 탄환 감독기가 필요할 수 있다.
