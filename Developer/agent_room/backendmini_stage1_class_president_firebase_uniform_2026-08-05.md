# Backend_Mini — Stage 1 반장 교복 Firebase 오버라이드 보존

작성: 2026-08-05 KST
역할: `backendmini`

## 라우팅

- Board: `escape-zombie-school`
- Firebase 런타임 배치 오버라이드가 관련되므로 `backendmini`을 담당으로 배정했다.
- Hermes 카드 `t_0b622f66`는 Hermes 전용 OAuth `token_expired` HTTP 401로 두 차례 차단되어, 동일 역할을 Codex Terra 작업 경로에서 수행했다.

## 원인과 수정

- Firebase의 `propPlacements.stage1` 오버라이드는 배열 전체를 런타임 정본으로 사용한다.
- 기존 반장 항목이 `props.variant`만 포함하면, authored 기본 배치의 `uniformColor: 0xc23535`가 배열 교체 과정에서 사라졌다.
- `stage1-student-south-01`에 한해서만 Firebase 오버라이드가 색상을 생략했을 때 authored 붉은 교복 값을 보완한다.
- Firebase 오버라이드가 유효한 `uniformColor`를 명시하면 그 값은 그대로 유지한다. 다른 소품·학생의 props, 위치, 회전, 스케일은 변경하지 않는다.
- 라이브 Firebase 읽기·쓰기나 다른 저장소 사용은 하지 않았다.

## 변경 및 검증

- 변경: `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js`
- 테스트: `npm.cmd exec -- vitest run src/components/StageObjects/stageObjectPlacements.override.test.js`
- 기대 결과: Firebase 오버라이드에서 색상을 생략한 실제 반장도 `0xc23535`를 유지한다.

## 범위 경계

- 커밋·푸시는 수행하지 않는다.
- Firebase 영속 스키마나 인증 상태, 다른 학생 및 모든 배치 좌표에는 변경이 없다.
