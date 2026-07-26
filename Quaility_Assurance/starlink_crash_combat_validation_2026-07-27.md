# 스타링크 추락 전투 검증 기록

- TDD: 15회 카운터, 보스 우선 착지, 무작위 대체, 착지 one-shot, 지우개 폭탄 공용 계약, 치트/정상 공용 생성 경로를 테스트한다.
- 집중 명령: `npx vitest run src/lib/starlinkCrash.test.js src/lib/eraserBombImpact.test.js src/components/Weapons/Starlink.test.jsx src/components/Weapons/EraserBomb.test.jsx`.
- 확인: 지우개 폭탄은 sight blocker를 넘기지 않고, 스타링크 추락만 never-block callback을 넘긴다.
- 추가 확인: 초기 보스 좌표(3,-2)가 충격 직전(7,4)로 이동하면 최신 end가 위성 시각 종점과 radial 피해 중심에 함께 쓰인다.
- 추가 확인: 스타링크만 두 번째 Enemy LOS 게이트까지 `ignoreSightBlock:true`로 통과하고, 다음 일반 radial hit impact에는 false가 전달된다. 무효 Rapier body는 translation을 호출하지 않는다.
- 전체 회귀: `npm test` 결과 163개 테스트 파일, 1,405개 테스트 통과.
- 실제 플레이: `localhost:4174` E2E Stage 1의 02:06 보스 처치 직전 연속 캡처에서 위성 낙하 빔·동심원 충격 중심·B01 몸통이 같은 위치에 겹치고, 피해 수치가 발생한 뒤 Stage Clear로 전환됨을 확인했다.
- 범위: Firebase 정본, Graphics Studio, 자산, localStorage를 변경하지 않는다.
- 물리 경계 확인: 착지 콜백은 즉시 `_enemyHit`/넉백을 호출하지 않고 x/z 복사본을 큐에 보관한다. `useBeforePhysicsStep`에서 플레이 중인 큐 항목을 한 번씩 처리한 뒤 길이를 0으로 비우며, 이때 최신 지우개폭탄 damage/radius를 읽는다. Physics가 pause되어 스텝 콜백이 멈춘 경우에도 phase effect가 큐를 비운다.
