# levelmini — 선긋기 선 플레이어 중심화 (2026-10-31, Terry 지시, receipt 5bcfc83f)
- 계약: 선 = 진행방향(facing)을 `rotateLineDrawFacing90`으로 90° 돌린 직선, 중점 = 플레이어. 3시로 걸으면 12시·6시 양방향.
- 길이 해석: 전체 길이 = 현행 `range` 6.0 units (1.5 블록), 각 방향 3.0 units (0.75 블록). 총 피해 면적 불변.
- `buildCutLine`: a = origin − dir·range/2, b = origin + dir·range/2. 교차 판정은 선분 (a,b)만 써서 수정 불필요.
- `applyLineDrawStrike`: 커터칼 상자(전방 0.12~range)의 시작점을 a에서 0.12 더 뒤로 물려 range+0.12로 호출 → 선분 전체를 덮음.
- `LineDraw.jsx`: 렌더가 line.ax/az에서 len 방향으로 그리므로 무수정. 무기 메시 스윙 연출은 dir 한쪽으로 움직임(시각 디테일, 미변경).
- 테스트: lineDraw.test.js 3시 방향 중점 단언 추가, 한쪽 연장 단언 교체, 직격 양쪽 피격 단언. 3 files / 108 tests 통과.
- 대안(미적용): 각 방향 range(전체 12 units = 3 블록)로 하려면 `half = range`로 바꾸면 됨 — 피해 면적 2배.
- balanceqa 핸드오프: 한쪽 거리 6→3 units 체감, 플레이어 바로 옆(0.12u 이내) 직격 포함 여부 실기 확인 요망.
