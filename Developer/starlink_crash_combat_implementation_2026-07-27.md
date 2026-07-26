# 스타링크 추락 전투 구현 기록

- 구현: `selectCrashLandingPoint`가 유효한 화면 내 보스를 안정 ID 순으로 선택하고, 없으면 기존 플레이어 주변 난수를 사용한다.
- 구현: 정상 15번째 발사와 개발 치트가 공통 `appendCrash` 경로를 쓰며, 착지 impact 시점의 지우개 폭탄 damage/radius를 읽는다.
- 구현: 첫 landed 전환만 `onImpact`를 호출하며, 공용 지우개 폭탄 impact helper로 착지 피해를 적용한다.
- 보스 확정 경로: 스타링크 착지만 stable never-block sight callback과 `ignoreSightBlock:true`를 전달하며, 다음 일반 radial 호출에는 false를 명시한다.
- 추적: `bossId`로 낙하 중 최신 유효 좌표를 같은 mutable end에 갱신하고, 위성·폭발·좀론비스크·착지 피해가 그 end를 공유한다.
- 제외: 모델/자산/Studio/Firebase/localStorage 변경 없음.
- 물리 경계: 착지 `onImpact`는 피해를 즉시 적용하지 않고 충돌 좌표 복사본을 단일 ref 큐에 넣는다. `useBeforePhysicsStep`가 플레이 중인 경우에만 큐의 모든 항목을 현재 지우개폭탄 수치로 비우므로, `_enemyHit`와 넉백 `setLinvel`은 Rapier 물리 스텝 전에 순서대로 실행된다. 플레이가 아닌 상태로 바뀌면 effect에서도 큐를 즉시 비워 일시정지 뒤의 지연 피해를 막는다.
