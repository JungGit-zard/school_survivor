# 치비코 그래픽 구현 기록

## 사용 기준

- 사용자 지정 경로 `Graphic_designer/subagents/Three_Mini.toml`의 Three_Mini 프로필을 읽고 그래픽 기준으로 사용했다.
- Three_Mini 역할은 `graphic_designer` 런타임 서브에이전트 `Pixel Lead`로 호출해 R3F toon 그래픽 기준을 받았다.
- `Graphic_designer/Bang_survivor_Graphic_concept.md`의 three.js toon 렌더링/외곽선 방향을 함께 확인했다.

## 적용한 시각 방향

- 긴 검은 머리, 눈을 가린 앞머리, 흰 교복형 원피스, 빨간 리본, 검은 로퍼를 핵심 실루엣으로 구현했다.
- 모바일에서 검은 덩어리로 뭉개지지 않도록 머리카락 낱가닥 대신 큰 블록 파츠로 구성했다.
- `MeshToonMaterial` 기반 `toonMat`과 inverted hull 방식 `outlineMat`을 사용했다.
- 치비코는 플레이어보다 작은 보조 동료로 읽히도록 플레이어 월드 높이의 약 60~70%대 스케일을 목표로 했다.

## Three_Mini 검수 반영

- 메시 수를 낮게 유지한다.
- 색상군별 재질을 재사용한다.
- 동적 그림자나 반투명 머리카락 카드는 쓰지 않는다.
- 주인공 뒤 중앙을 막지 않고 뒤 대각선에서 지연 추종한다.
