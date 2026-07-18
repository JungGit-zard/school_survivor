# Graphics Studio 플레이어 파츠 Apply 런타임 일치 수정

- 대상: `PlayerMesh.jsx`, `StudioTunedGroup.jsx`
- 원인: 게임과 타이틀의 플레이어 애니메이션이 Studio에서 저장한 파츠 위치·회전 값을 매 프레임 덮어썼다.
- 수정: 파츠 등록 시 원본 변형을 먼저 저장하고, 애니메이션 채널을 `원본 + Studio 오프셋 + 애니메이션 변화량`으로 합성한다.
- 안전 조건: 기존 숫자 파츠 경로와 JSX 자식 순서는 변경하지 않았다. 런타임 전체 트리 순회도 추가하지 않았다.
- 결과: Apply 이벤트로 갱신된 값이 게임과 타이틀의 공통 `PlayerMesh`에 즉시 반영되고 애니메이션 중에도 유지된다.

## 게임 화면과 Studio 비교 시점

- 실제 R3F 트리에서 Firebase로 hydrate된 현재 항목을 적용한 뒤 Studio와 런타임의 파츠·base·최종 변형을 대조한다.
- Player Studio 카메라는 게임과 같은 정면축, 30도 화각, 45도 내려보기로 맞췄다. 편집 가시성을 위해 거리만 축소했다.

## Apply 직후 검정 실루엣 회귀 수정

- 원인: `StudioTunedGroup`이 `BackSide`인 일반 채움 재질까지 외곽선으로 오인하여, 플레이어 Apply 시 외곽선 색인 검정으로 덮었다.
- 수정: 실제 외곽선 조건인 `BackSide`이면서 `NotEqualStencilFunc`인 재질만 외곽선으로 판별한다.
- 보존: 플레이어 23개 저장 키, 숫자 파츠 경로, 모델 트리와 저장된 변형 값은 변경하지 않았다.

## 폐기된 로컬 복구 방식

- 과거 23개 로컬 시드, `sourceRevision`, 브라우저 승격 및 누락 키 합성 방식은 전부 치명적인 버그로 폐기한다.
- Studio, 타이틀, 게임은 Firebase로 hydrate된 현재 payload만 사용한다.
- Firebase 값이 없거나 손상됐으면 로컬 값으로 복구하지 않고 fail-closed 처리한다.
