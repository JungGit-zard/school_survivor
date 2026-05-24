# Hitbox / Hurtbox Rules

이 게임은 많은 수의 좀비가 등장하는 캐주얼 핵앤슬래시 게임이므로,
일반 하급 좀비에게 과도한 물리 시뮬레이션이나 복잡한 Collider를 남발하지 않는다.

하지만 공격 판정과 피격 판정은 반드시 명확하고 정확해야 한다.

## Core Principle

- 하급 좀비는 가벼운 판정 구조를 사용한다.
- 복잡한 물리 연산보다 빠른 거리 판정, 원형 판정, 캡슐 판정, 박스 판정을 우선한다.
- 단, 공격이 맞았는지 안 맞았는지 플레이어가 납득할 수 있어야 한다.
- 보이는 모델과 실제 판정 영역의 차이가 너무 크면 안 된다.
- 모든 주요 공격 판정은 디버그 시각화가 가능해야 한다.

## Terminology

판정 영역은 다음처럼 구분한다.

1. Hitbox
   - 공격이 실제로 닿는 영역
   - 예: 총알, 검기, 폭발, 소화기 분사, 회전 무기

2. Hurtbox
   - 피격을 받는 대상의 약점/몸체 영역
   - 예: 좀비의 몸통, 플레이어의 몸체

3. Sensor Area
   - 충돌은 하지 않지만 감지에 사용하는 영역
   - 예: 아이템 획득 범위, 적 감지 범위, 자동 공격 탐색 범위

## Enemy Collision Policy

하급 좀비:

- dynamic rigid body를 기본으로 사용하지 않는다.
- 단순 거리 판정 또는 capsule/sphere 기반 hurtbox를 사용한다.
- 이동은 직접 위치 보정 방식으로 처리한다.
- 플레이어와의 접촉 피해는 거리 또는 capsule 판정으로 처리한다.

중급/특수 좀비:

- 필요할 경우 Rapier collider를 사용할 수 있다.
- 돌진, 넉백, 벽 충돌 등 물리적 상호작용이 중요한 경우에만 사용한다.

보스:

- 명확한 collider와 hurtbox를 가진다.
- 여러 개의 판정 영역을 사용할 수 있다.
- 공격 패턴별 hitbox를 분리한다.

## Attack Judgment Rules

모든 공격은 다음 값을 명확히 가져야 한다.

- id
- owner
- damage
- hitboxType
- position
- radius 또는 size
- duration
- cooldown
- hitTargets
- knockbackPower
- debugVisible

공격 판정 타입은 다음을 우선한다.

- sphere
- circle
- capsule
- box
- cone
- ray

## Recommended Judgment Types

근접 공격:

- capsule 또는 cone 판정
- 플레이어 전방 기준으로 계산
- 공격 지속시간을 짧게 둔다

투사체:

- sphere 또는 capsule 판정
- 빠른 투사체는 단순 위치 판정만 쓰지 말고 이전 위치와 현재 위치 사이를 검사한다
- 빠른 탄환이 적을 통과하는 현상을 막기 위해 segment collision 또는 ray 판정을 사용한다

폭발 공격:

- sphere 또는 circle radius 판정
- 중심점과 대상 거리 비교
- 범위 가장자리가 시각 효과와 크게 어긋나지 않게 한다

회전 무기:

- 플레이어 주변 orbit 위치 기준 sphere 판정
- 같은 대상에게 너무 자주 맞지 않도록 hit cooldown을 둔다

접촉 피해:

- 플레이어 hurtbox와 좀비 hurtbox 사이 거리 판정
- 피해 간격을 둔다
- 매 프레임 피해가 들어가지 않게 한다

## Accuracy Rules

판정은 다음 기준을 만족해야 한다.

- 화면상 맞은 것처럼 보이면 실제로 맞아야 한다.
- 화면상 명확히 피했으면 맞지 않아야 한다.
- 이펙트보다 판정이 과도하게 크면 안 된다.
- 모델보다 hurtbox가 지나치게 작으면 안 된다.
- 판정 영역은 캐릭터의 중심, 키, 폭에 맞춰 조정 가능해야 한다.
- 공격별 판정 크기는 밸런스 데이터로 분리한다.

## Debug Rules

개발 중에는 모든 주요 판정을 시각화할 수 있어야 한다.

필수 디버그 기능:

- player hurtbox 표시
- zombie hurtbox 표시
- projectile hitbox 표시
- melee attack hitbox 표시
- explosion radius 표시
- sensor range 표시
- last hit target 표시

디버그 표시는 개발 모드에서만 활성화한다.

예시:

- V 키를 누르면 판정 영역 표시 on/off
- hitbox는 반투명 wireframe 형태
- hurtbox는 대상 몸체 주변에 표시
- 공격 지속시간이 끝나면 hitbox 표시도 제거

## Performance Rules

정확한 판정을 위해 물리엔진을 무조건 사용하는 것은 금지한다.

우선순위는 다음과 같다.

1. 단순 거리 판정
2. sphere/circle 판정
3. box 판정
4. capsule 판정
5. ray 판정
6. Rapier collider
7. dynamic rigid body

하급 좀비 수십~수백 마리에게는 1~4번 방식을 우선 사용한다.
Rapier는 벽, 장애물, 플레이어, 보스, 특수 패턴에 우선 사용한다.

## Implementation Rule

판정 로직은 렌더링 컴포넌트 안에 직접 흩뿌리지 않는다.

다음과 같이 별도 모듈로 분리한다.

src/game/combat/
  hitboxTypes.ts
  hitboxSystem.ts
  hurtboxSystem.ts
  collisionMath.ts
  damageSystem.ts
  debugHitboxRenderer.tsx

판정 계산은 순수 함수로 작성한다.
렌더링은 별도 디버그 컴포넌트에서만 담당한다.

## Final Rule

이 게임의 전투 판정은 “가볍지만 정확해야 한다.”

하급 좀비에게 과도한 물리 도구를 사용하지 말 것.
하지만 플레이어가 체감하는 공격/피격 판정은 명확하고, 일관되고, 디버그 가능한 구조로 구현할 것.