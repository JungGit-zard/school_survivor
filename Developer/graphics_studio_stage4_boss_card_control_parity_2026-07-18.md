# Graphics Studio Stage 4 Boss Card Control Parity

## 요청

Graphics Studio에서 B04 스테이지 보스 카드와 일반 모델 프리뷰가 다른 보스와 같은 레이아웃 및 컨트롤 의미를 사용하도록 조정한다.

## 원인

- `StageBossPreview`가 B04에만 `0.42` Zoom 배율을 추가 적용했다.
- `GraphicsStudioPreview`가 B04에만 별도 카메라 위치, 타깃, 거리 범위를 적용했다.
- 따라서 Studio에 표시되는 Zoom 값이 같아도 B04만 실제 화면 배율이 달랐고, 일반 모델 프리뷰의 조작 기준도 다른 좀비와 달랐다.

## 구현

- B01/B02/B03/B04 모두 `Preview Zoom` 값을 실제 직교 카메라 Zoom에 동일하게 적용한다.
- B04 일반 모델 프리뷰의 전용 카메라 분기를 제거하고, 다른 좀비와 같은 기본 카메라 프레임을 사용한다.
- B04 모델 고유의 얼굴 높이 앵커는 유지하여 기본 `Pan Y = 0`에서 얼굴 중앙 정렬은 보존한다.
- Graphics Studio에서 B04를 선택한 상태로 공통 `Stage Boss Card Layout`의 Zoom/Pan 세 입력이 실제 B04 프리뷰와 Firebase 런타임 데이터에 그대로 연결되는 회귀 테스트를 둔다.

## 변경하지 않은 경계

- Firebase 정본 저장 및 Apply 흐름
- 로컬 저장소
- B02 모델, 상태, 저장 경로
- B04 모델 구조와 숫자 경로 기반 파트 연결
- Stage Boss Card의 Zoom/Pan 저장 키 및 범위

## 검증

실행:

```text
npm test -- --run src/components/StageBossPreview.test.jsx src/components/GraphicsStudioPreview.test.js src/components/GraphicsStudio.test.jsx
```

결과:

- 종료 코드 `0`
- 브랜치 가드 통과
- Legacy B02 소스 게이트 통과
- B04를 포함한 모든 보스의 공통 Zoom 의미 회귀 테스트 통과
- B04 일반 모델 프리뷰의 공통 좀비 카메라 레이아웃 테스트 통과
- 기존 Graphics Studio Zoom/Pan 입력 및 게임 동기화 테스트 통과
