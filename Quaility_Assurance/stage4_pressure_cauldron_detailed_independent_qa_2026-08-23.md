# Stage 4 압력 가마솥 상세 재설계 독립 QA

- Kanban: `t_09a8e323` (`balanceqa`)
- 범위: 제품 코드 무수정, 원화 수용조건·Studio 공용 연결·충돌체·성능 예산 읽기/테스트 검수

## 판정: PASS

- 원화 필수 실루엣: 낮고 넓은 10각 vessel, 3단 lid, 노란 U 손잡이, safety valve, 우상단 gauge/눈금/빨간 바늘, latch/hinge, 좌측 cabinet, 우측 auxiliary housing, twin step/pipe, 전우측 red handwheel, dark base가 공용 `PressureCauldron.jsx` 트리에 존재한다.
- 외곽선: 주요 vessel/lid/base/gauge/handwheel/cabinet/auxiliary/step에 opaque surface와 기존 `depthWrite:false` inverted-hull outline이 적용됐다. 새 텍스처·투명 표면은 없다.
- Studio: item id `stage-object-pressure-cauldron`, runtime/preview 공용 component, root base scale `0.4`, non-default item/part transform matrix parity test 및 기존 7개 primary sibling 순서가 통과했다.
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

## 15초 위험 동작 재검증

- Stage 4 전용 scheduler는 고정 스텝 runtime elapsed를 기준으로 15/30/45…초를 한 번씩만 통과한다. 0초 burst는 없으며, pause·gameover·다른 Stage에서는 시간이 진행되거나 피해가 발생하지 않는다.
- 시각 경계: `11.999s` idle, `12.000–14.999s` 불투명 3-puff smoke + object-local shiver, `15.000–15.249s` burst ring, `15.250s` 종료.
- 피해 계약: canonical `[0,0,0]`에서 수평 반경 `3.2` 이내 플레이어에게 `maxHp * 0.20`을 폭발당 정확히 한 번 적용한다. 기존 접촉 무적만 통과시키며, 사망 원인은 `stage4PressureCauldron`으로 남는다.
- 크기/충돌체: shared base scale `0.4`; vessel·steps·left cabinet·right auxiliary·handwheel의 local position과 size 모두 직전 `0.2` 모델의 정확히 2배다. `[0,0,7]` player start non-overlap test가 통과했다.

```text
npx vitest run src/lib/stage4PressureCauldronHazard.test.js src/components/Game.stage4PressureCauldron.test.js src/components/StageObjects/PressureCauldron.test.js src/components/StageObjects/stageObjectColliders.test.js -t "pressure cauldron|pressure-cauldron|stage object blocking colliders"
28 passed

npx vitest run src/lib/playerStartPosition.test.js
3 passed

git diff --check
passed
```

## 최종 통합 재검수 — PASS (2026-08-23)

- 최신 정본으로 재판정: Stage 4는 `halfX=9.36`(전체 `18.72`), 바닥 반복은 `23.4 × 40`이며, 34개 프롭은 X축 `×1.3` 시작값과 명시된 16개 안전 보정만 적용됐다. Y/Z·회전·스케일·props·개수는 유지되고 시작 위치 `[0,0,7]`은 실제 footprint(`x/z/halfX/halfZ`) 경계식으로 비충돌을 확인했다.
- 가마솥 root base scale은 정확히 `0.4`, 5개 collider는 기존 `0.2` 모델 대비 위치·크기 모두 정확히 2배다. Studio item/part path, 기존 7개 primary sibling 순서와 숫자 child prefix도 유지된다.
- 위험 연출은 Stage 4 `playing`에서만 `12.000–14.999s` opaque 3-puff smoke+shiver, `15.000–15.249s` burst, `15.250s` 종료로 동작한다. 0초 burst는 없고, 15초 간격/고정-step 경계 중복 방지, pause·gameover·다른 Stage의 시각 및 피해 차단, `radius=3.2`, `maxHp × 0.20` 단 1회 적용을 확인했다.
- 레거시 Stage 4 Firebase override는 메모리에서만 raw `x × 0.65`로 해석하며, 이 경로에 Firebase write·저장 호출은 없다. 연기/폭발에는 투명 material을 추가하지 않고 기존 opaque depth-writing surface를 사용한다.

```text
npx vitest run src/lib/stage4PressureCauldronHazard.test.js src/components/Game.stage4PressureCauldron.test.js src/components/StageObjects/PressureCauldron.test.js src/components/StageObjects/stageObjectColliders.test.js src/components/StageObjects/stageObjectPlacements.test.js src/lib/playerStartPosition.test.js src/components/ClassroomFloor.test.jsx src/lib/stageConfig.test.js src/lib/b04SoupBlast.test.js -t "Stage 4|stage 4|Stage4|pressure cauldron|stage player start positions|ClassroomFloor tiling|stage configuration registry|B04 국물"
63 passed, 30 skipped (9 files)

git diff --check
passed
```
