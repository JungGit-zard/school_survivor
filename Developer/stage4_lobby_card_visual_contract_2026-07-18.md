# Stage 4 로비 카드 B04 프리뷰 기술 결정 기록

- 작성일: 2026-07-18
- 범위: 기술 결정 기록 문서만 작성. 런타임 코드 수정 없음.
- 관련 그래픽 산출물: `Graphic_designer/stage4_lobby_card_visual_spec_2026-07-18.md`

## 결정

Stage 4 로비 카드의 보스 프리뷰는 기존 `Lobby.jsx` → `StageBossPreview.jsx` → `EnemyVisual` 경로를 재사용한다.

- 카드 전달 타입: `B04`
- Studio item ID: `zombie-b04-chef`
- 프레이밍 입력: `loadStageBossPreview()`가 읽는 전역 Stage Boss Preview 상태
- 기본 프레이밍: `zoom: 110`, `panX: 0`, `panY: 0`
- B04 얼굴 중앙 앵커: `StageBossPreview.jsx` 내부의 `FACE_LOCAL_Y.B04 = 0.93`
- Zoom 의미: B01/B02/B03/B04 모두 표시된 `zoom`을 실제 카메라 Zoom에 그대로 사용

## 구현 시 주의

현재 Stage 4 config가 아직 없으므로, 후속 코드 작업에서 Stage 4 카드가 추가될 때 `lobbyBossType` 또는 `bossType`이 `B04`가 되게 연결하면 된다. `StageBossPreview` 컴포넌트, B04 모델, Studio transform, 파츠 계층, 카메라 transform은 이 카드 계약 때문에 새로 만들거나 바꾸지 않는다.

## 검증 방식

이번 작업은 문서 계약 작성만 수행했다. 검증은 필수 파일 직접 읽기, gstack 존재 확인, git status 확인, 산출물 파일 직접 재읽기로 한다. 코드 테스트·브라우저 검증은 런타임 코드 변경이 없으므로 실행하지 않는다.
