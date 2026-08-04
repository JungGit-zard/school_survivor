# StageObjects 후면 가시성 시각 검토

- 날짜: 2026-08-05
- 담당: `threemini`
- 기준: `Graphic_designer/Bang_survivor_Graphic_concept.md`의 three.js toon + inverted-hull 외곽선 방향

## 시각 결론

플레이어가 소품 어느 쪽으로 이동해도 toon 색면이 유지되어야 한다. 외곽선만 보이는 상태는 의도한 카툰 실루엣이 아니라 단면 컬링 오류다.

표면만 양면 렌더링하고 외곽선은 기존 `BackSide`를 유지했다. 따라서 책상·의자·쓰러진 학생, 복도 기물, 체육관 기물, 주방 기물의 후면 가시성만 바로잡으며 색상·형태·배치·외곽선 굵기는 바꾸지 않는다.
