# R3F/Rapier 안정화 QA 체크포인트 — 2026-07-03

원문/정본:

`D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\r3f_rapier_vampire_survivor_stability_rules.md`

## QA 적용 방식

탈출좀비학교에서 아래 증상이 보고되면 추측으로 바로 수정하지 않고 정본 문서의 §6 통합 진단 프로토콜을 먼저 실행한다.

- 느려짐 / 프레임 드랍 / 간헐적 히치
- 몬스터 또는 투사체가 사라짐
- Rapier 물리 튕김, 떨림, 관통, `isValid`류 오류
- 시간이 지날수록 악화되는 스폰/풀/GC 의심 증상

## QA 기록 필수 항목

- 재현 조건: 스테이지, 시간, 몬스터 수, 무기, 이벤트
- 계측값: draw calls, 활성 엔티티 수, 렌더 인스턴스 수, Rapier body 수
- 불변식 검사 결과: NaN, active/body/render count 불일치, 월드 경계 이탈
- 적용한 RULE/CHECK 번호
- 수정 후 3분 이상 soak test 결과

## PR/에이전트 검수 핵심

- `useFrame`/물리 콜백 안 `setState`, `new`, 배열 생성 금지
- 몬스터/투사체는 풀 + InstancedMesh 원칙
- `frustumCulled=false` 또는 boundingSphere 관리
- `instanceMatrix.needsUpdate=true`
- index+generation stale 핸들 방지
- 몬스터 body는 가능하면 kinematic
- delta clamp / visibilitychange pause
- 물리/렌더 입력 전 finite 가드
- spatial grid로 O(N²) 회피
