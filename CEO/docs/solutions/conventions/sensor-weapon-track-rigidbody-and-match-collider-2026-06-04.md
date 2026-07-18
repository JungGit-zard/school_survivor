---
title: "센서형 무기: rigidbody를 추적·자가정리하고 콜라이더를 비주얼에 맞춰라"
date: 2026-06-04
category: conventions
module: r3f-prototype-weapons
problem_type: convention
component: frontend_stimulus
severity: low
applies_when:
  - "@react-three/rapier 센서 콜라이더(onIntersectionEnter/Exit)로 겹친 적을 추적해 주기적으로 때리는 궤도/근접 무기를 만들 때"
  - "무기 그래픽 스케일을 바꿀 때(히트 콜라이더가 비주얼과 따로 노는지 점검)"
tags: [react-three-fiber, rapier, sensor, collider, weapons, orbit]
related_components: [tumbler, compass-blade, weapons]
---

# 센서형 무기: rigidbody를 추적·자가정리하고 콜라이더를 비주얼에 맞춰라

## Context

궤도형 무기(텀블러·컴퍼스칼)는 rapier 센서 콜라이더의 `onIntersectionEnter/Exit`로 겹친 적을
맵에 모아두고, `useFrame`에서 주기적으로 때린다. 무기 코드 검수 중 텀블러에서 두 가지 문제가 보였다:

1. **죽은 적이 추적 맵에 남음.** 텀블러는 추적 맵에 적의 `_enemyHit`(함수)만 저장해, 루프에서
   적의 사망 여부를 알 수 없었고 `onIntersectionExit`에만 정리를 의존했다. 적이 겹친 채 죽고
   콜라이더가 제거되면 exit가 보장되지 않아 항목이 남는다(사망 가드 덕에 실제 피해는 없지만 누수).
2. **그래픽을 1.5배 키운 뒤 히트 콜라이더(0.12)가 그대로** → 보이는 무기에 닿아도 작은 중심
   콜라이더에 닿기 전엔 피해가 없는 "닿는데 안 맞음" 불일치.

## Guidance

**(1) 추적 맵에는 함수가 아니라 rigidbody(rb)를 저장하고, 루프 첫머리에서 죽은 적을 자가정리한다.**
컴퍼스칼이 쓰던 패턴을 표준으로 삼는다.

```js
// onIntersectionEnter: 함수가 아니라 rb를 저장
enemiesRef.current.set(rb._enemyId, rb)

// useFrame 히트 루프
enemiesRef.current.forEach((rb, enemyId) => {
  if (!rb?._enemyHit || rb._enemyDead) {        // 죽음/소멸을 직접 감지해 정리
    enemiesRef.current.delete(enemyId)
    overlapCountRef.current.delete(enemyId)
    lastHitRef.current.delete(enemyId)
    return
  }
  // ...주기 체크 후 rb._enemyHit(dmg, impact)
})
```

`onIntersectionExit`만 믿지 말 것 — 적이 사망해 RigidBody가 언마운트되며 콜라이더가 제거될 때
exit 이벤트가 항상 발생한다는 보장이 없다.

**(2) 무기 그래픽 스케일을 바꾸면 히트 콜라이더도 같은 비율로 맞춘다.**

```js
// 그래픽 1.5배 → 콜라이더도 1.5배
// scale 0.425 -> 0.6375 이면 BallCollider 0.12 -> 0.18
<BallCollider args={[0.18]} sensor />
```

## Why This Matters

- 함수만 저장하면 루프가 적의 생사를 못 본다 → 정리를 이벤트에만 의존 → 누수/스테일 상태.
  rb를 저장하면 매 프레임 `_enemyDead`로 직접 판정·정리할 수 있어 견고하다.
- 비주얼과 히트박스가 어긋나면, 직전에 보스에서 겪은 "안 닿아도 피격"의 반대인 **"닿는데 안 맞음"**이
  생긴다. 둘 다 "보이는 것 = 맞는 범위" 원칙을 깬다.

## When to Apply

- 센서로 겹친 적을 모아 주기 타격하는 모든 무기(궤도·오라·장판형) → rb 저장 + 자가정리
- 무기 모델 `scale`을 조정하는 모든 변경 → 대응 콜라이더도 함께 조정(점검 체크리스트)

## Examples

**Before (텀블러, 버그):**
```js
enemiesRef.current.set(rb._enemyId, rb._enemyHit)   // 함수만 저장 → 생사 모름
// ...
enemiesRef.current.forEach((hitFn) => hitFn(w.damage, ...))  // exit에만 정리 의존
```

**After:** rb 저장 + 루프 내 `_enemyDead` 정리 + 콜라이더 0.12→0.18(그래픽 1.5배에 맞춤).
컴퍼스칼(`CompassBlade.jsx`)은 이미 이 패턴을 사용 중 — 센서형 무기의 정본 참고.

## Related

- 커밋 `(tumbler) fix: tracks rigidbody (cleans dead enemies) and collider matches 1.5x visual`
- 정본 예시: `src/components/Weapons/CompassBlade.jsx`
- 연계: [r3f-gate-useframe-on-game-phase-2026-06-03.md](../design-patterns/r3f-gate-useframe-on-game-phase-2026-06-03.md)
