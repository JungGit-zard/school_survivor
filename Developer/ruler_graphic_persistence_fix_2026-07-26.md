# 30cm 자 그래픽 잔존 수정 (2026-07-26)

## 원인

SchoolBag 무기가 active인 동안 자 outer group과 trail mesh는 계속 mounted된다. 기존 idle 및 `elapsed >= duration` 분기는 swing state만 초기화하고 visual visibility/opacity를 초기화하지 않아, 마지막 swing transform의 자와 trail이 화면에 남을 수 있었다.

## 시각 상태 계약

| 상태 | 자 outer group | trail mesh | trail opacity |
| --- | --- | --- | --- |
| 첫 렌더 | hidden | hidden | 0 |
| 대기 | hidden | hidden | 0 |
| 실제 swing frame | visible | visible | 기존 `0.88 * swingPower` |
| 완료 | hidden | hidden | 0 |

JSX는 최초부터 두 노드를 `visible={false}`로 렌더해 첫 frame 전 flash를 막는다. idle과 완료에서는 allocation-free `hideSchoolBagSwingVisuals(visual, trail)`가 mounted Three 객체만 갱신한다. active frame에서는 기존 transform 전에 자와 trail을 visible로 되돌린 뒤 기존 opacity 계산을 그대로 적용한다.

## 비변경 사항

- 무기 inactive의 기존 `return null`/unmount 동작을 유지한다.
- pause 중 전투 시각 동결 정책과 local swing timeline은 변경하지 않는다.
- 공격 판정, 사거리, cooldown, damage, SFX, `ThirtyCmRulerModel`, `StudioTunedGroup`, Firebase/Graphics Studio의 scale·material·outline은 변경하지 않는다.
- 프레임 루프에 새 object, array, React state를 추가하지 않는다.

## TDD 검증

RED:

```text
npx vitest run src/components/Weapons/SchoolBag.test.jsx
2 tests | 1 failed
idle branch에 visualRef.current.visible = false 없음
```

추가 QA 계약은 JSX 최초 hidden, idle/완료의 ruler+trail hide 및 active-frame 재표시/opacity를 요구했다.

GREEN:

```text
npx vitest run src/components/Weapons/SchoolBag.test.jsx src/components/Weapons/WeaponHitSfx.test.jsx src/lib/weaponTargeting.test.js src/lib/weaponCollision.test.js
Test Files  4 passed (4)
Tests  45 passed (45)
```
