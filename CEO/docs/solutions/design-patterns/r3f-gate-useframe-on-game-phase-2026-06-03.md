---
title: "R3F 프레임 로직은 게임 phase로 게이트하라 (useFrame은 일시정지에도 돈다)"
date: 2026-06-03
category: design-patterns
module: r3f-prototype-weapons
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "react-three-fiber에서 발사체·이펙트가 useFrame으로 직접 위치를 갱신하거나 데미지를 가할 때"
  - "게임에 일시정지/레벨업/게임오버 등 'playing'이 아닌 상태가 존재할 때"
  - "@react-three/rapier의 Physics paused만으로 모든 로직이 멈춘다고 가정할 때"
tags: [react-three-fiber, useframe, pause, game-loop, projectiles, frame-gating]
related_components: [weapons, game-loop, store]
---

# R3F 프레임 로직은 게임 phase로 게이트하라 (useFrame은 일시정지에도 돈다)

## Context

`Escape! zombie school`(R3F)에서 일시정지/레벨업 카드 화면 중에도 **이미 날아가던 발사체가
계속 이동·폭발해 정지 상태의 좀비에게 데미지**가 들어가는 버그가 있었다.

무기 발사 게이트(스포너 `useFrame`)는 `if (phase !== 'playing') return`으로 막혀 있었지만,
**발사체/이펙트 자식 컴포넌트의 `useFrame`엔 phase 가드가 없었다.** `<Physics paused>`는
물리 시뮬레이션만 멈출 뿐, `useFrame` 콜백 자체는 멈추지 않는다는 점을 놓친 것이 핵심.

## Guidance

R3F에서 **게임 진행 중에만 돌아야 하는 프레임 로직**(발사체 이동, 장판/폭발, 데미지 적용 등)은
`useFrame`을 직접 쓰지 말고 **phase를 게이트하는 래퍼**로 감싼다.

```js
// src/lib/usePlayingFrame.js
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'

export function shouldRunGameFrame(phase) {
  return phase === 'playing'
}

// 게임이 'playing'일 때만 콜백 실행. paused/levelup/gameover에서는 skip.
export function usePlayingFrame(callback) {
  useFrame((state, delta) => {
    if (!shouldRunGameFrame(useGameStore.getState().phase)) return
    callback(state, delta)
  })
}
```

발사체/이펙트 컴포넌트에서 `useFrame` 대신 `usePlayingFrame`을 쓰면, 일시정지 동안 이동·데미지가
모두 멈췄다가 재개된다. (`getState()`로 구독 없이 읽어 불필요한 리렌더도 없음.)

## Why This Matters

- **`<Physics paused={...}>`는 rapier 시뮬만 멈춘다.** 직접 `groupRef.position.set(...)`으로
  움직이거나 `_enemyHit()`/`applyRadialDamage()`로 데미지를 가하는 코드는 물리와 무관하게
  계속 실행된다.
- **Canvas에 `frameloop`가 없으면 `useFrame`은 정지 화면에서도 매 프레임 실행된다.** 즉
  "게임이 멈췄다"는 건 store의 phase일 뿐, 렌더 루프는 계속 돈다.
- 가드를 스포너에만 두면 **새 발사는 막히지만 이미 떠 있는 발사체는 살아서** 정지 중 폭발·피해를
  준다. 레벨업은 매 판 자주 발생하므로 체감 빈도가 높다.

## When to Apply

- 발사체/이펙트가 useFrame에서 **직접 위치를 갱신**하거나 **데미지/상태를 변경**할 때 → `usePlayingFrame`
- 단, 카메라 추적처럼 **정지 중에도 돌아야 하는** 로직은 일반 `useFrame` 유지(게이트하지 말 것)
- 물리(rigidbody `setLinvel`)로만 움직이는 발사체는 `Physics paused`로 함께 멈추므로 영향 적음
  (그래도 명중 판정이 useFrame에 있다면 게이트 권장)

## Examples

**Before (버그):** 자식 컴포넌트가 phase를 안 봄 → 정지 중에도 동작

```js
function FlaskProjectile({ ... }) {
  useFrame((_, delta) => {
    ageRef.current += delta          // 정지 중에도 누적
    // ...목표 도달 시 onExplode → applyRadialDamage → 데미지
  })
}
```

**After:** `usePlayingFrame`으로 게이트 → 정지 중 완전 정지

```js
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'

function FlaskProjectile({ ... }) {
  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    // ...
  })
}
```

적용 대상: Flask, EraserBomb, Missile, Onigiri, StunGun, UmbrellaGuard, Starlink의
발사체/이펙트 컴포넌트(스포너는 기존 phase 가드 유지, 이중 가드는 무해).

## Related

- 커밋 `871c0b2` fix: freeze projectiles/effects while not playing
- `shouldRunGameFrame` 단위 테스트: `src/lib/usePlayingFrame.test.js`
