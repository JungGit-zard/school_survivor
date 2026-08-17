# Stage 1 B01 150초 / Matilda 180초 적용 인계 (2026-08-16)

## 목적
- Stage 1 전투 정본을 사용자 지정값인 `B01=150초(2:30)`, `Matilda=180초(3:00)`로 맞춘다.
- 기존 150초 일반 좀비 보강(`E07 ×6`, `E01/E03 혼합 ×6`)은 삭제하지 않고 B01과 같은 초에 동시에 발화하도록 보존한다.
- Stage 2~4 보스·웨이브·마틸다 시간은 이번 작업 범위에서 변경하지 않는다.

## 수용 기준
1. Stage 1 보스 B01은 150초(2분 30초)에 1마리 스폰된다. 거리/사거리 규칙이 아니라 시간 규칙이므로 블록 환산 대상은 없다.
2. Stage 1 150초 일반 좀비 보강은 그대로 유지된다: `E07 ×6`, `E01/E03 혼합 ×6`. 같은 150초에 B01 ×1과 함께 총 13마리 요청이 가능하다.
3. Stage 1 마틸다 경고/대사 유예는 175초(2분 55초)에 시작하고, 실제 마틸다는 180초(3분 00초)에 스폰된다. 유예 시간은 5초다.
4. Stage 2~4 마틸다는 기존 230초(3분 50초), 경고 225초(3분 45초)를 유지한다.
5. `getBossSpawnSec('stage1')`, store의 `bossSpawnSec`, HUD/어드민 보스 경고, Enemies 런타임 버스트 소비자는 모두 명시 버스트 표의 Stage 1 150초 B01을 기준으로 동작한다.
6. clamp/fallback으로 150초 또는 180초를 보정하지 않는다.

## 검증 명령
- `cd Developer/r3f_prototype && npx vitest run src/lib/stageConfig.test.js src/lib/burstEvents.test.js src/components/AdminPage.test.jsx src/components/Enemies.test.jsx src/store/useGameStore.test.js src/components/Game.runtimeTime.test.js src/components/HUD.test.jsx`
- 결과: 7개 테스트 파일, 201개 테스트 통과.

## Balance_QA_Mini 인계 메모
- Stage 1 실기기/브라우저 QA에서 2:27~2:30 구간 보스 경고 카운트다운 후 2:30에 B01이 등장하는지 확인한다.
- 같은 2:30 시점에 기존 일반 좀비 보강(`E07 ×6`, `E01/E03 혼합 ×6`)도 누락 없이 함께 체감되는지 확인한다.
- 2:55에는 마틸다 경고/대사 연출이 시작되고, 3:00에 실제 마틸다가 월드에 들어오는지 확인한다.
- Stage 2~4는 이번 변경 대상이 아니므로 기존 보스·마틸다 시각 회귀만 스모크 확인한다.
