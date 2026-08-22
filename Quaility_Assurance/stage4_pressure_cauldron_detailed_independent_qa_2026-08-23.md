# Stage 4 압력 가마솥 상세 재설계 독립 QA

- Kanban: `t_09a8e323` (`balanceqa`)
- 범위: 제품 코드 무수정, 원화 수용조건·Studio 공용 연결·충돌체·성능 예산 읽기/테스트 검수

## 판정: PASS

- 원화 필수 실루엣: 낮고 넓은 10각 vessel, 3단 lid, 노란 U 손잡이, safety valve, 우상단 gauge/눈금/빨간 바늘, latch/hinge, 좌측 cabinet, 우측 auxiliary housing, twin step/pipe, 전우측 red handwheel, dark base가 공용 `PressureCauldron.jsx` 트리에 존재한다.
- 외곽선: 주요 vessel/lid/base/gauge/handwheel/cabinet/auxiliary/step에 opaque surface와 기존 `depthWrite:false` inverted-hull outline이 적용됐다. 새 텍스처·투명 표면은 없다.
- Studio: item id `stage-object-pressure-cauldron`, runtime/preview 공용 component, root base scale `0.2`, non-default item/part transform matrix parity test 및 기존 7개 primary sibling 순서가 통과했다.
- 충돌체: 원화 envelope의 vessel, twin steps, left cabinet, right auxiliary, handwheel 5개가 정확한 final-space 값으로 등록됐다.
- 성능: surface 61 + outline 20 = 81 meshes로 감사 목표(총 약 82 이하)에 맞는다.

## 독립 실행 결과

```text
npm test -- --run PressureCauldron.test.js stageObjectColliders.test.js stageConfig.test.js ClassroomFloor.test.jsx b04SoupBlast.test.js
48 passed

npm test -- --run stageObjectPlacements.test.js -t "Stage 4"
6 passed, 29 skipped
```

`git diff --check`도 대상 파일에서 통과했다. 전체 placement suite의 기존 Stage 1/2 drift 6건은 이번 Stage 4 가마솥 변경과 무관하며, 본 QA에서는 수정하지 않았다.

## 내부 숫자 자식 경로 재감사

- Kanban: `t_0c6698c2` (`balanceqa`)
- 비교 기준: `b86c6bc`의 기존 `PressureCauldron.jsx` direct child prefix.
- 판정: **PASS**. gauge는 `Cylinder, Cylinder, Box, Cylinder`, wheel은 `Cylinder, Cylinder, Box, Box`, step은 `Box, Box, Cylinder`, housings는 `Box, Box, Box`를 실제 React element tree와 source extraction 양쪽에서 유지한다.
- 역할 고정: step의 0/1/2는 좌측 dark step / 좌측 yellow edge / 좌측 pipe, housings의 0/1/2는 left gray body / yellow status tab / right white housing이다. 신규 세부 요소는 이 prefix 뒤에만 추가됐다.
- 재검증: `PressureCauldron.test.js` 8/8, 나머지 focused 41/41, Stage 4 placement 6/6 통과. `git diff --check` 통과.
