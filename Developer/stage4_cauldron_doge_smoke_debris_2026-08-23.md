# Stage 4 가마솥 Doge 연기·파편 구현 기록

- Kanban: `t_239f8f5c` / 담당: `threemini`
- RED: `BigSpawnSmoke.test.js`의 Doge급 스폰 연기 무외곽선 계약, `PressureCauldron.test.js`의 Doge 연기 재사용·고정 파편 계약을 먼저 추가했고 구현 전 실패를 확인했다.
- GREEN: `PressureCauldronHazardVisual`이 폭발 상승 에지에 독립 key의 `BigSpawnSmokeEffect`를 직접 시작한다. 연기 자체의 800ms 수명은 폭발 표시 250ms와 분리되어 중간에 잘리지 않는다.
- GREEN: 파편은 `BURST_DEBRIS`의 고정 6개이며 250ms 진행도만으로 위치·회전을 갱신한다. burst 부모가 비활성화되면 완전히 숨겨진다.
- 검증: `npm exec vitest run src/components/StageObjects/PressureCauldron.test.js src/components/BigSpawnSmoke.test.js src/lib/stage4PressureCauldronHazard.test.js src/components/Game.stage4PressureCauldron.test.js` — 4 files, 22 tests passed.
- 경계: 기존 `Enemy.jsx`의 B02/B03/B04 및 투사체 관련 dirty hunk는 수정하지 않았다. 커밋·푸시는 하지 않았다.
