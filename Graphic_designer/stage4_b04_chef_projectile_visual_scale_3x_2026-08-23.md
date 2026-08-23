# Stage 4 B04 주방장 발사체 시각 배율 3배

- 대상: 당근(kind 1), 양파(kind 2), 감자(kind 3), 식칼(kind 4).
- 적용: 기존 공용 pooled renderer의 instance scale만 정확히 선형 3배로 변경했다.
- 외곽선: body와 함께 3배가 되며, body 대비 기존 `1.22` 외곽선 비율을 그대로 유지한다.
- 제외: E04 기본 청록 구체, 모델 geometry, 재질, 회전, 충돌, 피해, 발사 동작, Studio/타이틀/Firebase/오디오는 변경하지 않았다.
