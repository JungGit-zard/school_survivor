# Stage 1 가시 맵·프랍 정리 QA 기록

검수 시각: 2026-07-26 KST  
범위: `ClassroomFloor`, Stage 1 프랍 배치/오버라이드, 물리 콜라이더·시야 장애물 소비 경로

## 결과

Stage 1 범위는 승인 가능이다. 전투 정본 경계 `mapHalfX=10`, `mapHalfZ=14.4`를 시각 바닥에도 적용하여 정확히 `20 × 28.8`이 되며, X/Z 반복은 각각 `20 / 6.9`, `28.8 / 6.9`로 기존 약 6.9 units/타일 밀도를 유지한다.

저작 배치는 31개(책상 9, 의자 6, 학생 16)이며, 모두 `|x| ≤ 13`, `|z| ≤ 17.4` 안에 있다. 기존 60개에서 29개가 제거된 것을 테스트로 확인했다. 중앙 플레이존 규칙, 교실 variant 혼합, 학생 facing과 Studio item/모델 트리는 변경하지 않았다.

## 소비 경로 검토

- 렌더: `StageObjectLayer`가 `getStageObjectPlacements(stageId)`만 소비한다.
- 물리: `getStageObjectColliders`도 같은 함수를 먼저 소비한 뒤 blocking 프랍만 추린다.
- 조사/시야: `getStageObjectSightObstacles`도 같은 함수를 먼저 소비한다.
- 따라서 Firebase 런타임 오버라이드의 envelope 밖 Stage 1 항목은 렌더·콜라이더·시야 장애물 모두에서 제외된다.
- 오버라이드 경로는 Firebase hydrate 뒤의 메모리 런타임 데이터셋만 읽는다. 실제 Firebase 원격 읽기/쓰기 테스트는 수행하지 않았고, 대상 경로에 `localStorage`/`sessionStorage` 호출은 없다.

## 발견 및 조치

| 심각도 | 내용 | 조치 |
| --- | --- | --- |
| 낮음 (QA 격리) | 오버라이드 테스트가 마지막 테스트의 in-memory 런타임 상태를 남길 수 있었다. | `beforeEach`/`afterEach`가 동일한 빈 Firebase 런타임 기준 스냅샷과 revision `0`으로 복원하도록 수정했다. |
| 정보 | 기존 검증은 X 경계 초과만 단언했다. | X=13/Z=17.4 경계 포함, X=13.1 및 Z=17.5 제외 회귀 단언을 추가했다. |
| 정보 | 현재 혼합 worktree에는 Stage 1 범위 외 Stage 4 바닥·프랍 변경도 함께 존재한다. | 이 QA는 Stage 1 계약만 승인한다. Stage 4 추가 변경 자체의 별도 승인/회귀 검수는 이 기록 범위 밖이다. |

`computeDefaultStageObjectPlacements`와 `getStageObjectPlacements`의 학생 facing 적용은 기본 Stage 1 경로에서 두 번 호출되지만, 이미 `*Flipped` variant에는 다시 매핑할 값이 없어 결과는 멱등(idempotent, 같은 결과 반복)이다. Studio 원본 배치 경로도 facing 혼합을 보장해야 하므로 이번 범위에서는 동작 변경 없이 유지했다.

## 실행 검증

```bash
cd Developer/r3f_prototype
npm exec vitest -- run src/components/ClassroomFloor.test.jsx src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectPlacements.override.test.js src/components/StageObjects/stageObjectColliders.test.js
```

결과: 테스트 파일 4개, 테스트 47개 모두 통과.

추가 정적 확인:

- `stageConfig.js`에서 Stage 1 경계 `10/14.4` 확인.
- 대상 런타임 경로에서 브라우저 저장소 호출 없음 확인.
- `git diff --check`는 혼합된 비대상 Stage 4 변경의 기존 CRLF/trailing-whitespace 항목을 보고하므로, Stage 1 기능 판정과 분리해 기록한다.
