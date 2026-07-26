# 전기충격기 최근접 표적 관통 수정 (2026-07-26)

## 원인

`StunBoltProjectile`는 현재 표적까지의 거리보다 `BOLT_SPEED * delta`가 큰 경우에도 전체 이동량을 적용했다. 플레이어 `(0,0)`, 최근접 표적 `(1,0)`, `delta=0.1`에서 첫 프레임이 `x=1.6`까지 지나가고 다음 프레임 target delta가 음수가 되어 전기 그래픽이 플레이어 방향으로 반전됐다.

## 수정

- projectile 프레임 delta를 `Math.min(delta, 1 / 30)`으로 제한했다(RULE-5.1).
- 이동량을 `Math.min(BOLT_SPEED * frameDelta, dist)`로 제한해 live 표적을 지나치지 않게 했다.
- 동일 프레임에서 사용한 live `targetRb.translation()`의 delta로 기존 그래픽 pose를 계산한다.

## RED → GREEN

`StunGunNearestTargetRegression.test.jsx`는 실제 projectile frame callback을 실행한다. 수정 전 첫 위치는 `1.6`, 다음 위치는 `0`이고 두 번째 pose가 반전되어 RED였다. 수정 후 위치는 약 `0.533`, `1.0`이고 모든 pose가 최초 최근접 표적 `+X` 방향을 유지한다.

## QA 후 수명 계약 복원

QA에서 `ageRef.current`까지 clamp한 경우 저 FPS에서 기존 2.5초 만료가 수십 초로 늘어나는 회귀를 발견했다. 이동과 그래픽에는 `frameDelta`를 유지하지만, 수명은 pause를 막는 `usePlayingFrame`의 실제 `delta`로 누적한다. 회귀 테스트는 `delta=0.1`을 26회 실행해 2.6초에 한 번 만료되고, 추가 10프레임에도 다시 만료하지 않음을 확인한다. 이동 clamp가 수명 만료를 75프레임까지 미루지 않는다.

## 불변 범위

명중 반경 0.4, 피해, 체인, generation guard, SFX, `StudioTunedGroup`, Firebase/Graphics Studio 데이터는 변경하지 않았다. 프레임 루프에는 새 객체·배열·Vector 생성이 없다(RULE-0.2).
