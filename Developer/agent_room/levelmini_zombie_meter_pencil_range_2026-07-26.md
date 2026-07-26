# LevelMini 연필 Zombie Meter 발사 eligibility 라우팅 기록 (2026-07-26)

## 발사 eligibility 계약

- 기본 연필은 player center 기준 반경 3zm(2.25 world units) 안의 살아 있고 LOS가 열린 적만 target 후보로 삼는다.
- 경계 정확히 2.25는 포함하고, 2.250001은 제외한다.
- 후보가 없으면 `targetCount === 0` 경로로 발사·pencilFire SFX가 발생하지 않는다.
- projectileCount는 후보가 있을 때만 기존의 distinct-nearby target 분산 규칙을 사용한다.

## LevelMini 판단

과거 22 world units 기본 사거리는 6zm 원 정본으로 대체한다. 이 변경은 초기 전투 eligibility만 바로잡으며 damage, cooldown, pierce, projectile 비행, LOS 정책에는 변경을 요구하지 않는다. 명시적 range buff는 runtime override로서 base 3zm 이후에 적용된다.
