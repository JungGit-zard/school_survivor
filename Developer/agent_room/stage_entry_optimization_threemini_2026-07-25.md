# Stage 1 프롭 공유 리소스 최적화 — threemini 작업 기록

## 목적

Stage 1 진입 시 책상·의자·쓰러진 학생이 동일한 BoxGeometry와 toon/outline 재질을 각각 생성하던 초기 GL 리소스 생성량을 줄인다.

## 반드시 지킨 제약

- `StudioTunedGroup`의 itemId, 루트·그룹·mesh 자식 순서와 숫자 경로를 변경하지 않는다.
- 배치, variant, 색상, 외곽선 수치, 충돌체, 조사 기능을 변경하지 않는다.
- 공유 원본 재질은 Studio의 사용자 재질 조정이 필요할 때 `StudioTunedGroup`의 기존 per-mesh clone 격리 경로를 그대로 이용한다.
- 공유 geometry/material은 개별 프롭 언마운트에서 dispose하지 않고, HMR 중앙 캐시 정리에서만 해제한다.

## 변경

- `propRendering.js`에 공유 1×1×1 BoxGeometry와 공유 리소스 mesh 설정을 추가했다.
- `ClassroomDesk`, `ClassroomChair`, `UnconsciousStudent`의 JSX `boxGeometry` 생성을 `geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}`로 교체했다.
- 세 컴포넌트의 mount별 `useMemo(toonMat/outlineMat)` 생성을 중앙 toon/outline 캐시 호출로 교체했다.
- outline 재질도 opacity·색상 조합별 공유 캐시를 추가했다.

## 검증

- `stageObjectAssets.test.jsx`: 공유 geometry 동일 참조, 공유 outline 동일 참조, dispose 방지, JSX/Studio root 계약을 확인한다.
- `stageObjectPlacements.test.js`: Stage 1 authored 배치·variant·scale 불변성을 확인한다.
- `StudioTunedGroup.test.jsx`: Studio 소유 material clone 및 해제 경로를 회귀 검증한다.

## threemini 라우팅 결과

그래픽/Three.js 시각 통합 전문 검토 범위로 분류했다. 모델 형상·Studio 데이터·Firebase 저장은 변경하지 않았고, 런타임 공유 리소스만 최적화했다.
