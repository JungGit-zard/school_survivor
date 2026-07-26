# balanceqa routing trail — StunGun 2차·3차 generation strict (2026-07-26)

- 전문 영역: 체인 대상 회귀 검증.
- 재사용된 pooled slot이 가까운 새 좀비일 때 old generation hit history가 그 대상을 제외하지 않아야 한다.
- 2차와 3차는 각각 직전 impact-nearest 순서를 유지해야 한다.
- bolt 이동과 hit callback은 같은 `{ rb, generation }`을 수신해야 한다.
- 이 기록은 routing 증적이며 외부 Kanban 실행을 주장하지 않는다.
