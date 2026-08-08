# Stage 2 경비원 추격 좀비떼 구현 기록

## 반영 범위

- Stage 2 런타임 버스트에 42, 88, 136, 216초 `stage2GuardChase`를 추가했다.
- 매 버스트는 `RZT` 바바리맨 좀비 1기와 `RZG` 경비원 좀비 6기를 생성한다.
- 시작 변은 좌·우·상·하 중 하나를 결정론적으로 선택하고, 반대편의 별도 임의 지점을 목표로 같은 정규화 방향 벡터를 공유한다.
- 바바리맨은 선두, 경비원은 뒤 2열 3행으로 편성된다.
- `RZT`/`RZG`만 장애물을 통과하고, 반대편 외곽 경계를 벗어나면 보상 없이 제거된다. Stage 3 `RZL`/`RZC`의 장애물 회피와 고정 대각선 규칙은 변경하지 않았다.

## 모델·Studio 연결

- `ZombieMesh.jsx`에 완전 착의의 황갈색 트렌치코트 바바리맨과 남색 제복·노란 안전조끼 경비원 모델을 추가했다.
- 두 모델은 기존 `ZBlock` 자식 구조와 `StudioTunedGroup itemId={getStudioZombieItemId(type)}`만 사용한다.
- 별도 변형 함수, 파트 ID, 로컬 저장, 기본값 fallback을 추가하지 않았다.
- 풀 렌더러도 두 타입의 Firebase Studio 루트/숫자 child-path 캐시를 같은 방식으로 사용한다.

## 검증

`npx vitest run src/lib/enemyEntityPool.test.js src/lib/enemySimulation.test.js src/lib/burstEvents.test.js src/components/Enemies.test.jsx src/components/ZombieMesh.test.js src/components/PooledEnemyVisuals.test.js src/lib/stageMultiHzParity.test.js src/lib/gameplaySoak.test.js`

- 8개 테스트 파일, 203개 테스트 통과.
