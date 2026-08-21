# B02~B04 필살기 시각 독립 감사

작성일: 2026-08-21  
범위: `Enemy.jsx`의 바닥 표식 렌더와 React 스냅샷 연결만 정본 문서와 대조했다. 코드 수정·브라우저·Firebase 접근은 하지 않았다.

## 확인된 통과 항목

- B02는 `Enemy.jsx:531~571`에서 청록 표면·어두운 외곽·그림자의 3선을 렌더하며, `:1100~1136`의 `activeLineIndex`가 스냅샷으로 전달된다.
- B04는 `:580~609`에서 주황 원 3개를 렌더하고, `:1201~1224`에서 phase·circles를 스냅샷으로 전달한다. `b04SoupBlast.js:3,64~66`의 폭발 지속시간은 250ms이며 `done`은 렌더하지 않는다.
- 각 컴포넌트는 Stage/type 조건으로만 장착된다(`Enemy.jsx:1546~1566`). B02/B03/B04 표식이 서로 다른 보스·스테이지에서 함께 렌더되지 않는다.
- B04는 reset(`:953~954`), 사망(`:1028~1030`), unmount(`:959~961`)에서 상태를 초기화한다. B02/B03은 reset에서 초기화되고, 사망 시 `Enemy.jsx:1520`의 `return null`로 즉시 숨겨진다.
- focused 검사: `EnemyVisual.test.js`, `b02CorridorBlockade.test.js`, `b03ShuttleRun.test.js`, `b04SoupBlast.test.js` — 4 파일, 42 테스트 통과.

## 결함

### P1 — B03 복귀 레인 상태가 화면에 전달되지 않음

- 근거: `Enemy.jsx:916~919`의 `syncB03ShuttleVisual`은 `phase`와 `laneZ`만 비교한다. `passIndex`가 0에서 1로 바뀌어도 이전 snapshot을 그대로 반환한다.
- 영향: `B03ShuttleRunVisual`은 `:617~620`에서 snapshot의 `passIndex`로 `outbound`/`returning`을 고른다. 따라서 실제 두 번째 통과도 첫 번째 통과의 `outbound` 색으로 남는다.
- 정본 충돌: B03은 outbound/return이 구분되는 고정 노란 레인이어야 한다.
- 권장 최소 수정: snapshot 동등성 비교에 `previous.passIndex === state.passIndex`를 포함한다.

### P1 — B03 active 색이 B04의 주황-빨강 역할과 겹침

- 근거: `Enemy.jsx:573~578`에서 B03 active 표면은 `#f05423`, `#ff7a28`이다.
- 영향: 두 값은 주황 계열이라 B04 전용 주황-빨강 위험색과 역할이 겹친다.
- 정본 충돌: 시각 기획은 B03=노랑, B04=주황-빨강으로 색 역할을 분리한다.
- 권장 최소 수정: B03 `outbound`/`returning`을 노랑 계열의 서로 다른 명도·불투명도로 교체하고 B04 값은 보존한다.

### P2 — B02 경직 동안 완료선이 남음

- 근거: `b02CorridorBlockade.js:56~60`은 active 종료 뒤 1.2초 `stun` 동안 `lineZs`를 유지한다. `Enemy.jsx:539~543`은 active 이외 phase를 `completed`로 렌더하므로, `:545~571`의 세 선이 경직 내내 낮은 불투명도로 남는다.
- 정본 충돌: B02의 위험 표식은 마지막 선의 발동 종료와 함께 사라져야 한다.
- 권장 최소 수정: stun 전환 시 시각 snapshot의 `lineZs`를 비우거나, B02 시각 컴포넌트가 `stun`에서 null을 반환하게 한다. 피해·경직 로직은 보존한다.

## 결론

컴파일/단위 테스트는 통과했지만, 위 P1 두 건과 P2 한 건 때문에 B02~B04 시각 정본 일치로 승인할 수 없다. 이 감사는 코드 수정 없이 결함만 기록한다.
