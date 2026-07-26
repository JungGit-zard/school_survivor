# 전기충격기 연쇄 시각 계약 (2026-07-26)

- 2차와 3차 번개 그래픽은 직전 타격점에서 선택한 가장 가까운 live target의 `{ rb, generation }`을 따른다.
- pooled 슬롯이 재사용된 경우 이전 좀비의 좌표나 generation을 따라가지 않는다.
- 타격 처리와 그래픽이 공유하는 target pair가 무효화되면 bolt는 만료하며, 먼 다른 좀비로 보정하지 않는다.
- 모델, 재질, Studio transform, Firebase 데이터는 변경하지 않는다.
