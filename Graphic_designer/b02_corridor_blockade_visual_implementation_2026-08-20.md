# B02 복도 봉쇄선 시각 구현 기록

- 작업일: 2026-08-20
- 범위: Stage 2 B02 `복도 봉쇄선`의 바닥 시각 상태만.
- 제외: B03/B04, BIG_SPAWN_SMOKE와 공유 스폰 연출, Studio·모델·타이틀·Firebase·오디오.

## 구현

`Developer/r3f_prototype/src/components/Enemy.jsx`의 `B02CorridorBlockadeVisual`만 수정했다.

- 기존 주황/빨강 단일 막대를 제거하고 청록 표면, 짙은 외곽, 더 짙은 바닥 그림자의 세 겹 기하로 교체했다.
- 3개 선은 복도 전체 폭을 유지하며, 선별 상태를 `telegraph` / `active` / `completed` / `future`로 명시한다.
- `telegraph`는 1.2초 동안 중간 청록, 현재 `active` 선은 가장 밝은 청록, 지나간 `completed` 선은 낮은 불투명도, 다음 `future` 선은 어두운 청록으로 보인다.
- 경고/발동 상태는 기존 `b02CorridorBlockade`의 상태만 읽는다. B02 이동, 피해, 타이밍, 카메라는 변경하지 않았다.
- 바닥 원색은 바꾸지 않고 선 자체에만 청록·외곽·그림자를 사용했다. 화면 흔들림과 확대는 추가하지 않았다.

## 퀘스트 가방 확인

- 기존 HUD는 4×2, 총 8칸이며 B02 `복도 출입증`이 두 번째 슬롯에 `🎫` 아이콘과 `복도 출입증 — 연필·벨·오니기리 공격력 +5%` 접근성 이름으로 표시된다.
- 작은 모바일 슬롯에서도 티켓 실루엣과 명칭이 식별 가능해 레이아웃·아이콘·aria 변경은 하지 않았다.

## 검증

- `npm run test -- src/components/EnemyVisual.test.js src/lib/b02CorridorBlockade.test.js`
  - 2개 파일, 32개 테스트 통과.
- `git diff --check -- Developer/r3f_prototype/src/components/Enemy.jsx Developer/r3f_prototype/src/components/EnemyVisual.test.js` 통과.
- `npm run browser:reserve` 통과: `GAME_BROWSER_INSTANCES=1`, 제한 3.
- 실제 localhost:5173 실행은 게임 시작 후 Google 로그인 팝업으로 전환되어, 인증/Firebase 상태를 바꾸지 않는 범위에서는 Stage 2 B02까지 진입할 수 없었다. 따라서 Stage 2 전투 화면 검증은 미완료다.
  - 캡처 시도 경로: `Graphic_designer/evidence/b02-corridor-blockade-runtime-2026-08-20-stage1-root.png` (로그인 전환으로 유효한 전투 증거가 아님).
- 기존 E2E URL도 한 번만 재시도했다: `http://localhost:5173/?e2e=1&e2ehp=9999`.
  - 이 실행도 일반 타이틀·Google 로그인 UI를 보였고, 게임 시작 뒤 Firebase auth 팝업으로 전환됐다. 실제 OAuth 입력/클릭, localStorage, Firebase 데이터, 임의 page-context/store 변경은 하지 않았다.
  - 캡처 시도 경로: `Graphic_designer/evidence/b02-corridor-blockade-runtime-2026-08-20-e2e-entry.png`, `Graphic_designer/evidence/b02-corridor-blockade-runtime-2026-08-20-e2e-after-start.png` (모두 유효한 전투 증거가 아님).

## 잔여 확인

- 인증된 실제 Stage 2 세션 또는 별도 안전한 Stage 2 E2E 진입 경로에서 `telegraph → 0번 active → 1번 active → 2번 active → 종료`를 화면 캡처로 확인해야 한다.
