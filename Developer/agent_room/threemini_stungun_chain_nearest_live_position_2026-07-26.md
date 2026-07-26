# threemini routing trail — StunGun chain live position (2026-07-26)

## Routing

- 요청 범위: 체인 전기 그래픽이 대상 선택 결과와 같은 적을 향하는지의 시각 계약.
- 관련 전문 영역: `threemini`.
- 이 기록은 필수 routing 증적이며, 외부 Hermes/Kanban 실행을 주장하지 않는다.

## Visual contract

- 체인 그래픽은 직전 피격점에서 실제로 선택된 최신 위치의 미피격 최근접 적으로 이어진다.
- 기존 `StunGun.jsx`의 live `{ rb, generation }` endpoint와 bolt 회전은 유지한다.
- 이번 수정은 대상 검색용 grid 최신성만 바꾸며 모델, 재질, Studio transform, Firebase 데이터를 변경하지 않는다.
