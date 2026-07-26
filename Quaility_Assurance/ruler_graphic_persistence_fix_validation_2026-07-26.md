# 30cm 자 그래픽 잔존 수정 QA 기록 (2026-07-26)

## 판정

**PASS (코드·대상 테스트 기준)**

검증 범위는 `SchoolBagSwing`의 30cm 자와 스윙 트레일 표시 상태뿐이다. Browser, Firebase, Graphics Studio 데이터에는 접근하거나 변경하지 않았다.

## 확인한 수정 범위

- `Developer/r3f_prototype/src/components/Weapons/SchoolBag.jsx`
  - 30cm 자 그룹과 트레일 mesh가 처음 마운트될 때 `visible={false}`이다.
  - idle 및 스윙 완료 분기는 `hideSchoolBagSwingVisuals`로 자 그룹과 트레일을 숨기고, 트레일 opacity를 `0`으로 되돌린다.
  - 실제 active 스윙 분기에서만 자 그룹과 트레일을 `visible = true`로 변경하고 기존 위치·회전·트레일 opacity를 적용한다.
  - helper는 기존 Three 객체의 속성만 변경하며, React state나 프레임별 객체/배열 할당을 추가하지 않는다.
- `Developer/r3f_prototype/src/components/Weapons/SchoolBag.test.jsx`
  - 초기 숨김, idle/완료 숨김, active 표시 및 트레일 opacity 계약을 검증한다.

## 시나리오별 결과

| 시나리오                        | 결과 | 근거                                                                                                                                                                                   |
| ------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 첫 렌더 flash                   | PASS | 두 JSX 노드가 `visible={false}`로 시작한다. 첫 active 프레임에서 위치·회전 계산과 같은 동기 프레임 안에서만 표시한다.                                                                  |
| idle/완료 뒤 자·외곽선 잔존     | PASS | outer `visualRef`를 숨긴다. 외곽선은 이 그룹 하위 모델이므로 함께 숨겨진다.                                                                                                            |
| 트레일 잔상                     | PASS | 숨김과 함께 `trail.material.opacity = 0`을 수행하고, active에서만 다시 표시한다.                                                                                                       |
| 다음 스윙의 stale pose          | PASS | 완료 뒤 outer 그룹이 숨겨진 상태를 유지하고, 다음 스윙은 active 프레임에서 최신 player 위치와 facing을 적용한 뒤 표시한다. 시작 분기는 즉시 표시하지 않아 이전 pose/원점 flash가 없다. |
| weapon inactive                 | PASS | 기존 `if (!weapons.schoolBag.active) return null`이 mesh와 group을 언마운트한다.                                                                                                       |
| 공격 판정·range·cooldown·damage | PASS | `scanRadiusEnemiesInto`, `scanOrientedBoxEnemiesInto`, `range`, `cooldown`, `swingMs`, `applyEnemyHit`의 수정 diff가 없다.                                                             |
| SFX·Studio·Firebase             | PASS | 기존 `emitSfx({ id: 'rulerFire' })` 호출 및 `StudioTunedGroup` 내부 모델 경로를 변경하지 않았고 Firebase/Studio 관련 코드는 수정하지 않았다.                                           |

## 자동 검증

다음 명령을 `Developer/r3f_prototype`에서 실행했다.

```text
npm test -- src/components/Weapons/SchoolBag.test.jsx src/lib/weaponTargeting.test.js src/lib/weaponCollision.test.js
```

결과: 테스트 파일 3개, 테스트 38개 모두 통과.

또한 수정 대상 두 파일에 대해 `git diff --check`를 실행했다. 공백 오류는 없었다. `SchoolBag.test.jsx`의 LF→CRLF 경고만 있었으며 오류나 소스 의미 변경은 아니다.

## 잔여 위험

- `usePlayingFrame`은 paused 상태에서 callback을 실행하지 않는다. 다만 `SchoolBagSwing`의 duration 기준은 R3F `clock.elapsedTime`이므로, pause 동안 그 clock이 계속 진행되는 환경에서는 재개 직후 스윙이 완료 처리되어 즉시 숨겨질 수 있다. 이는 이번 그래픽 잔존 수정의 범위 밖인 pause 시간 정책 위험이며, 표시 잔상은 남기지 않는다.
- `resetRuntimeRefs()`는 global `bagSwingState`를 초기화하지만 `SchoolBagSwing`의 component-local `swingRef`는 직접 초기화하지 않는다. restart 직후 최초 playing frame이 이전 스윙을 완료 처리할 수 있는 기존 경계가 남아 있다. 이번 수정은 그 경우에도 완료 시 즉시 숨기므로 지속 잔존은 막지만, restart 시간축을 엄밀히 동결/초기화하려면 별도 lifecycle 수정과 통합 테스트가 필요하다.
