# Shark Missile Homing Yaw Fix

Date: 2026-06-28 18:46 KST

## Context

상어미사일 발사 직후 미사일이 목표 쪽으로 유지되지 않고 화면 바깥으로 빠지는 문제가 보고되었다.

## Root Cause

호밍 단계에서 `desiredYaw - yawRef.current`를 `[-pi, pi]` 범위로 바꾸는 계산식이 잘못되어 있었다.

특히 현재 방향과 목표 방향이 같은 경우에도 회전량이 `0`이 아니라 `-pi`로 계산될 수 있어, 발사 직후 목표 반대 방향 또는 측면으로 급회전했다.

## Change

- `sharkMissileRuntime.js`에 `shortestAngleDelta(fromAngle, toAngle)`를 추가했다.
- `SharkMissile.jsx`의 호밍 회전 보정이 해당 함수를 사용하도록 변경했다.
- 기존 화면 클램프 동작과 상어미사일 스탯, 데미지, 반경, 쿨다운은 변경하지 않았다.

## Notes

이번 수정은 발사 방향 보정 버그만 다룬다. 화면 경계 클램프 관련 기존 변경은 유지했다.
