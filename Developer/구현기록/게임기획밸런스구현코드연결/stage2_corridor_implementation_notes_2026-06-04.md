# Stage 2 Corridor Implementation Notes · 2026-06-04

## Goal

Stage 2를 실제로 선택하고 플레이할 수 있는 복도형 원거리 투사체 스테이지 MVP로 구현한다.

## Implementation Principles

- Stage 1 코드를 덮어쓰지 않고 Stage 1/2 데이터를 분리한다.
- `stageConfig.js`를 스테이지 설정의 단일 진실로 확장한다.
- 기록은 `playerRecords.js`와 `useGameStore.js`에서 Stage별로 분리한다.
- E04 투사체 규칙은 먼저 순수 함수로 테스트한 뒤 런타임에 연결한다.
- 기존 `HUD.jsx`, `TitleScreen.jsx` 수정분을 되돌리지 않고 그 위에 Stage 2 UI를 좁게 추가한다.

## Subagent Review Summary

- Agent Room: `game-developer`, `graphic_designer`, `code-mapper`, `reviewer`, `test-automator` 흐름 권장.
- Game Developer: Stage ID 부재와 E04 개체별 무한 발사가 핵심 리스크.
- Graphic Designer: E04 경고 부족과 Stage 2 복도 가독성 부족이 핵심 리스크.

## Planned Verification

- Stage 1 웨이브에 E04가 없는지 테스트한다.
- Stage 2는 90초 이후 E04를 포함하는지 테스트한다.
- Stage 2 클리어가 `stage2Clears`만 올리는지 테스트한다.
- Stage 1 180초 생존 누적이 Stage 2 잠금 해제 조건에 반영되는지 테스트한다.
- 빌드와 브라우저 검증 후 QA 기록을 남긴다.
