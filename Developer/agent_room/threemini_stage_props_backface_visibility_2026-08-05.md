# threemini — StageObjects 후면 표면 가시성 수정

- 날짜: 2026-08-05
- 담당 프로필: `threemini`
- 라우팅: `escape-zombie-school` 카드 `t_c96dc997`는 Hermes OAuth `token_expired` 401로 2회 중단되어, 동일 역할의 Codex Terra 경로에서 수행했다.
- 범위: Stage 1~4 `StageObjects`의 toon 표면. 배치, 변형, 색, 외곽선, Firebase 데이터는 변경하지 않았다.

## 원인과 수정

모든 소품 표면이 일반 `MeshToonMaterial`의 기본 `FrontSide`를 사용해 후면에서 컬링될 수 있었다. 반면 inverted-hull 외곽선은 `BackSide`라 표면이 사라진 자리에서 외곽선만 남았다.

소품 전용 재질은 `DoubleSide` 키로 별도 캐시하도록 수정했다. 일반 toon 재질은 계속 `FrontSide`, 외곽선 재질은 계속 `BackSide`이므로 캐릭터와 외곽선 렌더 방식은 바뀌지 않는다. Stage 2 복도와 Stage 3 체육관 소품의 직접 `toonMat` 생성도 동일한 소품 전용 경로로 통합했다.

## 회귀 검증

- Red: `npm.cmd exec -- vitest run src/components/StageObjects/stageObjectAssets.test.jsx` → 1 failed / 20 passed (`FrontSide` 경로 검출)
- Green: `npm.cmd exec -- vitest run src/components/StageObjects/stageObjectAssets.test.jsx src/components/StudioTunedGroup.test.jsx` → 49 passed
- 회귀 단언: 소품 표면 `DoubleSide`, 일반 표면 `FrontSide`, 외곽선 `BackSide`, 소품/일반 캐시 객체 분리
