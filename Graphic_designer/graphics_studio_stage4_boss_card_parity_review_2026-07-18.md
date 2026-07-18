# Graphics Studio Stage 4 보스 카드 레이아웃 패리티 검토

- 작성일: 2026-07-18
- 역할: `threemini` 그래픽·시각 일관성 검토
- 대상: Graphics Studio `Stage Boss Card Layout`의 B04 주방장 보스
- 범위: 소스 수정 없이 원인 진단과 구현 권고만 기록

## 결론

Stage 4 보스가 다른 보스와 같은 `Preview Zoom` 값을 받아도 혼자 다르게 보이고 조절이 둔하게 느껴지는 직접 원인은 `StageBossPreview.jsx`의 B04 전용 숨은 zoom 배율 `0.42`다.

또한 Graphics Studio의 큰 모델 편집 뷰에서도 `GraphicsStudioPreview.jsx`가 B04에만 별도 카메라를 사용해, 같은 Zombie 카탈로그 항목인데 시작 구도와 OrbitControls의 거리 범위가 달랐다. 이 카메라는 스테이지 카드 프리뷰 자체를 직접 제어하지는 않지만, B04만 다른 조작 체계를 가진 것처럼 보이게 만드는 두 번째 불일치다.

사용자의 최신 요청에 맞는 시각 계약은 다음과 같다.

1. `Stage Boss Card Layout`에서 B01~B04의 같은 Zoom 값은 같은 orthographic camera zoom을 의미한다.
2. Graphics Studio의 큰 Zombie 편집 뷰에서도 B04는 다른 Zombie와 같은 기본 카메라·타깃·거리 범위를 사용한다.
3. B04의 실제 머리 위치 차이를 반영하는 `FACE_LOCAL_Y.B04 = 0.93`은 얼굴 중앙 정렬용 해부학 앵커이므로 유지한다.
4. B04 모델, 파츠 순서, 숫자 경로, Studio transform, Firebase 저장 구조는 변경하지 않는다.

## 확인한 직접 원인

### 1. B04 전용 숨은 Zoom 배율

기존 `StageBossPreview.jsx`에는 다음 의미의 분기가 있었다.

- B01: `1.0`
- B03: `1.0`
- B04: `0.42`

그래서 공통 입력값 `zoom: 110`이 다음처럼 서로 다른 실제 렌더 값으로 변환됐다.

- B01/B02/B03: `110`
- B04: `46.2`

슬라이더 전체 범위도 B04에서만 실질적으로 `21`~`75.6`으로 축소된다. 사용자는 같은 `Preview Zoom` 숫자를 보고 있지만 B04에만 42%가 적용되므로, 모델이 혼자 다른 크기로 보이고 조절량이 충분히 반영되지 않는 것처럼 느끼게 된다.

이 문제는 카드 레이아웃 값이나 Firebase 데이터의 문제가 아니라, 렌더 직전에 B04 타입만 다시 축소하는 표시 계층의 문제다.

### 2. B04 전용 Graphics Studio 카메라

기존 `GraphicsStudioPreview.jsx`의 `getPreviewFrame()`은 B04에만 다음 전용 값을 사용했다.

- 카메라: `[6, 4.8, 8.4]`
- 타깃: `[0, 0.45, 0]`
- 최소/최대 거리: `2` / `22`

다른 Zombie 항목의 공통값은 다음과 같다.

- 카메라: `[4, 3.2, 5.6]`
- 타깃: `[0, 0.8, 0]`
- 최소/최대 거리: `1.2` / `14`

이 분기는 `Stage Boss Card Layout`의 orthographic camera와는 별도의 편집 뷰 카메라다. 따라서 카드 Zoom/Pan이 동작하지 않는 직접 원인은 아니지만, B04를 선택했을 때만 편집 화면의 구도와 마우스 조작 감도가 달라지는 원인이다.

## 유지해야 하는 B04 차이

`FACE_LOCAL_Y.B04 = 0.93`은 제거 대상이 아니다.

이 값은 B04의 얼굴 그룹이 실제로 다른 보스보다 조금 높은 위치에 있다는 모델 구조를 반영해, `panY: 0`일 때 얼굴 중심을 화면 중앙에 두기 위한 기준점이다. Zoom을 몰래 줄이는 값과 달리 사용자의 조절량을 왜곡하지 않는다.

B04의 큰 조리모 때문에 공통 Zoom에서 실루엣이 다른 보스보다 위아래로 더 길게 보일 수는 있다. 이것은 캐릭터 디자인 차이다. 후속 시각 검수에서 잘림이 발견되더라도 B04 전용 숨은 배율을 복구하면 같은 문제가 재발한다. 우선 공통 카메라 의미를 지키고, 필요하면 사용자가 보이는 공통 Zoom/Pan 조절 범위 안에서 승인된 값을 잡아야 한다.

## 구현 권고

- `resolveBossPreviewZoom(baseZoom, bossType)`는 모든 보스 타입에서 `baseZoom`을 그대로 반환한다.
- B04 전용 `BOSS_PREVIEW_ZOOM_FACTOR` 항목은 두지 않는다.
- `getPreviewFrame()`의 B04 전용 Zombie 분기를 제거하고 공통 Zombie fallback을 사용한다.
- 회귀 테스트는 B01~B04가 동일한 입력 Zoom을 동일한 렌더 Zoom으로 해석하는지 확인한다.
- 회귀 테스트는 B04와 일반 Zombie의 `getPreviewFrame()` 결과가 같은지 확인한다.
- B04의 `FACE_LOCAL_Y` 얼굴 중앙 정렬 테스트는 유지한다.

## 문서 충돌 정리

`Graphic_designer/stage4_lobby_card_visual_spec_2026-07-18.md`와 `Developer/stage4_lobby_card_visual_contract_2026-07-18.md`에는 B04 전용 `0.42`가 기존 승인 보정처럼 기록돼 있다.

그러나 사용자의 최신 요청은 B04가 다른 보스와 같은 레이아웃과 조절 의미를 가져야 한다는 것이다. 따라서 해당 두 문서의 `0.42` 계약은 이번 패리티 수정 이후 현행 정본으로 사용하면 안 된다. 후속 문서 정리 시 “B04도 공통 Zoom 의미를 사용한다”로 갱신해야 한다.

## 변경 금지 범위

- Firebase 읽기·쓰기·스키마·연결 상태를 변경하지 않는다.
- 브라우저 저장소나 다른 저장 방식을 추가하지 않는다.
- B04 모델 메시와 원화 기반 비율을 이 카드 문제 때문에 수정하지 않는다.
- B04 파츠 순서와 숫자 경로 연결을 수정하지 않는다.
- B02 모델·프레이밍·저장 상태를 변경하지 않는다.

## 검토 근거

- `project_develop_policy.md`
- `AGENTS.md`
- `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `Graphic_designer/stage4_chef_zombie_visual_spec_2026-07-18.md`
- `Graphic_designer/stage4_lobby_card_visual_spec_2026-07-18.md`
- `Developer/stage4_lobby_card_visual_contract_2026-07-18.md`
- `Developer/graphics_studio_stage_boss_card_layout_section_2026-07-18.md`
- `Developer/r3f_prototype/src/components/StageBossPreview.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/components/StageBossPreview.test.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.test.js`

## 검토 판정

진단 기준 PASS.

B04 전용 `0.42` zoom 보정과 전용 Studio 카메라를 제거하고, 얼굴 높이 앵커만 유지하는 방향이 사용자의 최신 요청과 공통 카드 조절 의미에 가장 직접적으로 부합한다. 이 판정은 코드 구현·자동 테스트·브라우저 화면 검증 완료를 뜻하지 않으며, 최종 완료 판정은 Developer 구현과 QA 검증 후 내려야 한다.
