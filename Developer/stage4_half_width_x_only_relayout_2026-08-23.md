# Stage 4 가로 절반 구현 기록

- Kanban: `t_0a16d698` (`threemini`)
- 단일 경계 정본: `stageConfig.js` Stage 4 `mapHalfX=7.2`, `mapHalfZ=16`.
- 바닥은 기존 단일 WebP 텍스처·GPU UV 반복 구조를 유지하고 `18×40` 반복을 경계에서 파생한다.
- authored Stage 4 배치 34개는 X 0.5배를 기준으로 재배치하되, 새 벽과 collider 사이 안전 계약을 지키기 위해 X 9개만 최소 보정했다. Y/Z/rotation/scale/props/blocking은 기존 스냅샷 SHA 회귀 검증으로 보존한다.
- 기존 전체 폭 런타임 override는 하나의 `|x|>7.2` 표식으로 감지하여 배열 전체 X를 in-memory only 0.5배 해석한 뒤 기존 가마솟 canonicalizer를 적용한다.
- Stage 1∼3, Firebase 저장 경로, 타이틀, 오디오는 변경하지 않는다.
