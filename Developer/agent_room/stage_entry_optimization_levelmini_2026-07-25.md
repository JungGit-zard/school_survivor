# Stage entry optimization — Level_Mini handoff (2026-07-25)

## 범위

- 일반 pooled 적(E01~E06, RZL, RZC)의 웨이브·중간 보강·보스 호위·formation 버스트 생성만 RAF별로 분산한다.
- 보스와 마틸다의 React special 생성, 웨이브 발화 시각, 웨이브 수·종류·스폰 좌표 확정 순서는 변경하지 않는다.

## 구현 결정

- `src/lib/pooledEnemySpawnDrain.js`에 256칸 고정 FIFO를 두고, 일반 적 엔트리는 발화 RAF에서 순서대로 넣는다.
- drain은 RAF 1회당 최대 3개만 `enemyPool.spawnInto` 경로로 소비한다.
- stage token과 `gameKey`를 함께 확인한다. stage 전환·동일 스테이지 재시작 시 pending FIFO와 예약 큐를 비워 이전 run의 적이 새 run에 나타나지 않는다.
- pause/gameover/clear에서는 drain하지 않는다. pause에서 재개되면 남은 항목을 다시 3개씩 처리한다.
- 고정 큐가 가득 차면 기존 FIFO를 보존하고 `dropped` 카운터를 증가시킨다.

## 밸런스 보존 확인

- Stage 1의 1.15 배율, Stage 2 opening/30초 프론트로드, Stage 3 opening 프론트로드, Stage 4 구성은 `waveSizeForStageAtTime`을 그대로 사용한다.
- 20~40초 웨이브 시각, 중간 보강, 보스 호위, 도지와 런크루의 발화 시각은 변경하지 않는다.

## 검증

- `pooledEnemySpawnDrain.test.js`: 14/27/20 엔트리의 최대 3개 drain, 전체 수와 FIFO 순서, reset, stale token, overflow를 검증한다.
- `npm test -- --run src/lib/pooledEnemySpawnDrain.test.js src/components/Enemies.test.jsx`
- `npm run build`

커밋·푸시는 수행하지 않았다.
