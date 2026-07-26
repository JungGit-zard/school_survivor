# LevelMini 관통 연필 기대 동작 및 라우팅 기록 (2026-07-26)

## 기대 동작

| 관통 수 | 명중 후 조향 | sweep 처리 |
| --- | --- | --- |
| 1 | 첫 적에 명중하면 즉시 종료 | 첫 유효 적 1명만 처리 |
| 2 | 최초 적 명중 후 homing 해제, 마지막 velocity로 직진 | 이미 맞은 A를 다시 만나도 B까지 후보에 포함해 두 번째 유효 적을 처리 |
| 3 | 최초 적 명중 후 동일하게 직진 | A/B 등 prior hit를 건너뛰고 최대 세 번째 유효 적까지 처리 |

## 이번 결함과 결정

- 첫 결함: hit history가 중복 피해만 막고 `targetRef`의 homing을 유지해, 관통 연필이 첫 좀비에 끼였다.
- 두 번째 결함: sweep 후보 제한이 남은 관통 수만 사용해 prior hit가 다음 유효 target의 후보 자리를 차지했다.
- 결정: 최초 homing target과 정확히 일치하는 successful hit만 target을 해제한다. pooled는 index+generation, special은 object identity를 비교한다. sweep budget은 `prior hits + remaining pierce`로 제한해 관통 3 cap에 맞는 작은 후보 정렬을 유지한다.

## 권한 및 범위

이 기록은 LevelMini 게임플레이 기대 동작을 개발 구현에 전달한 라우팅 기록이다. 밸런스 수치, 업그레이드 cap(3), 피해, SFX, Firebase 및 Graphics Studio 상태는 변경하지 않는다.
