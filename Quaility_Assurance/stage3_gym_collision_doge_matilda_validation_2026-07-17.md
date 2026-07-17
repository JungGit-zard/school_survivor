# Stage 3 Gym Collision, Doge, Matilda Validation — 2026-07-17

## 검증 대상

- Stage 3 체육관 소품 전체의 물리 충돌
- 보너스 도지의 비센서 충돌체
- 마틸다 장애물 막힘 시 방향 반전
- 마틸다 웃음/돌진 반복 상태
- `matildaLaugh` 사운드미니 Animalese 프리셋 기록

## 수행 시도

- 명령: `npm test -- src/components/StageObjects/stageObjectColliders.test.js src/components/EnemyVisual.test.js src/components/PickupAndDogeSfx.test.jsx src/lib/sfxRegistry.test.js`
- 결과: 실행 실패
- 사유: 현재 셸에는 Linux `node`가 없고, `/mnt/c/Program Files/nodejs/npm`은 WSL1 제한으로 `Could not determine Node.js install directory`를 반환한다.
- Windows `cmd.exe` 직접 실행도 현재 셸에서 `Exec format error`로 막혔다.

## 정적 확인

- `stageObjectColliders.js`에 Stage 3 체육관 소품 10종 모두 `BLOCKING_STAGE_OBJECT_TYPES`로 등록됨.
- Stage 3에서는 `blocking: false` 여부와 관계없이 체육관 소품 충돌체를 생성함.
- `DancingDogeEvent.jsx`에서 도지 콜라이더의 `sensor` 속성이 제거됨.
- `Enemy.jsx`에 마틸다 막힘 감지 helper와 70ms 반전 기준이 추가됨.
- `generate_sfx.mjs`에 `matildaLaugh` Animalese 3토큰 프리셋이 기록됨.

## 남은 필수 검증

- Windows/WSL2/CI 환경에서 focused Vitest 재실행
- Stage 3 실제 플레이에서 골대, 벤치, 공, 콘, 장비더미, 현수막, 문과 플레이어/적이 겹치지 않는지 확인
- 도지가 플레이어와 겹치지 않고, 동시에 무기 피격/도주/상자 드랍이 유지되는지 확인
- 마틸다가 소품에 막혔을 때 70ms 내외로 반전하는지 확인
- Android 또는 모바일 브라우저에서 마틸다 반전/웃음 루프가 프레임 저하 없이 동작하는지 확인
