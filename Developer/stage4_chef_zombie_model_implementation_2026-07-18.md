# 스테이지 4 주방장 좀비 모델 연결 구현 기록

- 작성일: 2026-07-18
- 기준 스크린샷: `C:\Users\admin\Pictures\Screenshots\스크린샷 2026-07-18 052700.png`
- 런타임 타입: `B04`
- Graphics Studio item ID: `zombie-b04-chef`

## 정본 결정

`B04` 주방장 좀비를 스테이지 4 대표 보스로 연결한다. 앞서 제안된 체육교사 보스안은 폐기하며, 그 구현이나 튜닝값을 복구·변형해 재사용하지 않는다.

## 신규 모델 계약

- 주방장 좀비는 기준 스크린샷과 `Graphic_designer/stage4_chef_zombie_visual_spec_2026-07-18.md`의 안정적인 파츠 계층을 따르는 완전 신규 3D 카툰 모델이다.
- 런타임은 일반 좀비와 같은 `ZombieMesh` → `EnemyVisual` 렌더링 경로를 사용한다.
- 모든 파츠는 `studioPartId`를 지정하지 않는다.
- Graphics Studio의 개별 파츠 선택·저장·재적용은 장면 트리의 숫자 자식 경로만 사용한다.
- 최초 `position`, `scale`, `rotation`을 base로 보존하고, 위치 `0`, 크기 `1`, 회전 `0` 입력 시 정확히 base로 돌아가야 한다.
- toon 명암과 검은 외곽선은 모델의 모든 면에서 유지한다.

## 이번 연결 범위

- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
  - `B04` 전용 item ID와 Enemy 카탈로그 항목을 등록한다.
  - 런타임 미리보기는 일반 좀비와 동일한 `EnemyVisual` 경로를 사용한다.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js`
  - item ID, 표시 이름, 런타임 타입의 정확값을 검증한다.
- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - 모델 미리보기가 안전하게 계산되도록 현재 보스 기준과 같은 HP·속도·피해·크기 2·접촉 거리의 최소 스탯만 등록한다.
  - 특수 행동 속성은 추가하지 않는다.
- `Planner/stage4_concept_wave_plan_2026-07-18.md`
  - 사용자 최종 확정을 문서 최상단에 기록한다.
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
  - 별도 신규 모델 구현 작업에서 위 모델 계약의 실제 메시를 연결하는 대상이다.

## 보류 범위

웨이브 배치, 보스 특수 행동, 난이도 수치 조정, 드롭, 보상, 사운드는 후속 기획·밸런스·QA에서 확정한다. 이번 연결에서는 변경하지 않는다.

## 계획된 검증

- `npm test -- src/lib/graphicsStudioConfig.test.js`
- 신규 모델 구현과 합쳐진 뒤 `ZombieMesh`의 `B04` 전용 렌더링 및 숫자 파츠 경로 계약을 별도 집중 테스트한다.

## 실행 결과

- 2026-07-18 `npm test -- src/lib/graphicsStudioConfig.test.js`: 테스트 파일 1개, 테스트 35개 통과.
