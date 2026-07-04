# Bell Sonic Ring Effect Implementation - 2026-05-30

## 연결 파일

- 그래픽 방향: `Graphic_designer/weapons/bell_sonic_ring_effect_2026-05-30.md`
- 구현: `Developer/r3f_prototype/src/components/Weapons/Bell.jsx`
- 설정: `Developer/r3f_prototype/src/lib/bell.js`
- 테스트: `Developer/r3f_prototype/src/lib/bell.test.js`

## 구현 내용

- `BellPulse`에서 기존 8방향 `planeGeometry` 막대 이펙트를 제거했다.
- 평면 `ringGeometry`에서 대각 이음선처럼 보일 수 있는 여지를 없애기 위해, 공격 이펙트는 `torusGeometry` 4개로 표현한다.
- `getBellSonicRingConfigs()`로 링 개수, 크기 차이, 투명도 차이를 분리해 테스트 가능하게 했다.
- 공격 판정 로직은 그대로 유지했다.

## 검증 포인트

- 벨 공격 시 직선 막대가 생성되지 않는다.
- 벨 공격 시 평면 링 이음선처럼 보이는 대각 직선이 생성되지 않는다.
- 원형 링만 퍼지며 음파처럼 보여야 한다.
- 기존 벨 데미지와 넉백 동작은 바뀌지 않는다.
