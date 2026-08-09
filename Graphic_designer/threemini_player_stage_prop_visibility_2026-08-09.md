# Graphic designer 기록 — 플레이어 stage prop 가림 시각 검토

- Kanban: `t_7f8a37db`
- 시각: 2026-08-09 11:09
- 대상: stage prop 앞/뒤 관계에서 플레이어 3D 카툰 캐릭터가 사라지는 문제.

## 시각 원칙

- 플레이어는 2D 스프라이트나 디버그 대체 표식이 아니라 기존 Three.js 3D 카툰 모델 그대로 유지한다.
- 플레이어 외곽선은 기존 inverted-hull outline 계층을 보존하되, prop 뒤에서도 실루엣이 보이도록 플레이어 전용 렌더 순서를 prop보다 높게 둔다.
- stage prop 모델과 그림자는 보존한다. prop을 투명화하거나 숨기거나 asset을 교체하지 않는다.
- 일반 플레이 화면에 보정용 원/프록시/디버그 도형을 추가하지 않는다.

## 적용 방향

- `PlayerMesh.jsx`의 플레이어 toon surface와 outline material만 occlusion-safe 공유 material 생성 함수로 통일한다.
- 바닥 그림자는 기존 depthTest 유지로 바닥 접지감을 보존한다.

## 검증 요약

- 플레이어 전체 모델이 stage prop 위 렌더 안전층을 사용하는 회귀 테스트를 추가/통과했다.
- `PlayerMesh.test.js`: 13/13 통과.
