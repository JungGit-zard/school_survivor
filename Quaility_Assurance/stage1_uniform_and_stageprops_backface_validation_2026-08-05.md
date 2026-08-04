# Stage 1 반장 교복 및 소품 뒷면 렌더링 QA

일자: 2026-08-05
담당: balanceqa (Codex 독립 검증)
기준 브랜치: `zombie_only` (`de3ad3546b0406f087bcd336fe6ad12794ed2c0a` + 미커밋 대상 변경)

## 범위와 판정

| 검증 대상 | 결과 | 근거 |
| --- | --- | --- |
| Firebase 배치가 `uniformColor`를 생략한 Stage 1 반장 | PASS | `withAuthoredClassPresidentUniform`이 `stage1-student-south-01`에만 `0xc23535`를 보완하며, override 집중 테스트 통과 |
| Firebase의 유효한 명시 색상 보존 | PASS | `uniformColor !== undefined`이면 보완하지 않고, 정규화는 정수 `0..0xffffff`만 보존 |
| 다른 학생 및 배치 불변 | PASS | 보완 조건은 반장 ID 하나로 한정; 기본 배치 테스트에서 다른 학생에게 `uniformColor`가 없음을 확인 |
| 모든 StageObjects 표면의 뒷면 가시성 | PASS | 소품 전용 `DoubleSide`가 `getStagePropToonMaterial`에만 적용되고, 교실·복도·체육관·급식실 소품 경로가 이 함수를 사용 |
| 캐릭터 기본 표면/외곽선 보존 | PASS | 일반 `getCachedToonMat` 기본값은 `FrontSide`, outline은 `BackSide`; 캐시 키에 side가 포함되어 재질을 혼용하지 않음 |
| 복도/체육관 직접 재질 경로 | PASS | `CorridorProps.jsx`, `GymProps.jsx`의 직접 `toonMat` 호출을 소품 전용 함수로 전환하고 정적 회귀 테스트 통과 |

## 최소 수정성 검토

- 표면 양면 처리는 `StageObjects/propRendering.js`의 소품 재질 경로에만 한정했다.
- 일반 캐릭터·적·무기 재질의 기본 `FrontSide`는 바꾸지 않았다.
- inverted-hull 외곽선의 `BackSide` 및 stencil 동작은 변경하지 않았다.
- toon 재질 캐시는 `(color, emissive, side)`로 분리되어 FrontSide/DoubleSide 재질이 공유되지 않는다.
- Stage 1 반장 기본 배치의 색상은 Firebase override가 해당 필드를 생략할 때만 보완된다. 유효한 명시 색상은 덮어쓰지 않는다.

## 실행 검증

```text
npm.cmd exec -- vitest run src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectPlacements.override.test.js src/lib/stagePropPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx
# 4 files passed, 65 tests passed

npm.cmd run build
# PASS: branch/title/B02 canonical gates, Vite production build, artifact gates
```

빌드 중 기존 대형 chunk 경고만 있었고 실패는 없었다.

## 검토 파일

- `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.override.test.js`
- `Developer/r3f_prototype/src/lib/stagePropPlacements.js`
- `Developer/r3f_prototype/src/lib/toon.js`
- `Developer/r3f_prototype/src/components/StageObjects/propRendering.js`
- `Developer/r3f_prototype/src/components/StageObjects/CorridorProps.jsx`
- `Developer/r3f_prototype/src/components/StageObjects/GymProps.jsx`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectAssets.test.jsx`

## 리스크

- 실제 Firebase 연결 계정의 Studio 배치 데이터는 읽거나 변경하지 않았다. 검증은 Firebase runtime dataset을 사용하는 격리된 단위 테스트로 수행했다.
- 시각 자동화 브라우저 증거는 이 QA 카드 범위에 포함하지 않았다. 재질 side 값, 모든 StageObject 경로 정적 검사, 빌드로 회귀를 방지한다.

## 결론

PASS. 현재 미커밋 변경은 요청 범위에 맞고 과도한 전역 양면 렌더링 변경이 없다. 이 QA 기록은 커밋/푸시하지 않는다.
