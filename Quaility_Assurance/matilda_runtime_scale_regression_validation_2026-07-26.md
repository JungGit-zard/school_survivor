# Matilda 런타임 스케일 회귀 검증 — 2026-07-26

## 범위와 결론

검토 대상은 `Developer/r3f_prototype/src/components/Enemies.jsx`의 Matilda 런타임 `statOverride`와, `Enemy.jsx`의 합성 스탯 전달 경로이다. 소스 diff 검토 및 아래 집중 테스트 결과를 기준으로 **통과**한다.

- 원인: Matilda의 런타임 `scale`이 `3.0`으로 재정의되어 B01 기본 스케일 `2.0`보다 정확히 1.5배 커졌다.
- 수정: `scale: ENEMY_STATS.B01.scale`로 복구했다. `ENEMY_SIZE_MULTIPLIER = 4 / 3` 기준 최종 크기는 기존 `4.0`에서 `8 / 3`으로 돌아간다.
- 일치성: `Enemy`는 합성된 `stats.scale` 하나로 collider의 `colArgs`와 `EnemyVisual`의 `scale` prop을 모두 계산/전달한다. 따라서 시각 메시와 물리 충돌체가 같은 2.0 기반 크기를 사용한다.
- 의도치 않은 능력치 변경 없음: Matilda의 `hp: player.maxHp * 3`, `damage: player.maxHp * 3`, `speed: player.speed * 1.4`는 diff 전후 동일하다. 이 검토 범위에서 변경된 Matilda 능력치는 크기뿐이다.

## RED / GREEN 증거

| 단계 | 결과 | 근거 |
| --- | --- | --- |
| RED | 1건 실패, 98건 통과 | 복구 전 `scale: 3.0` 상태에서 새 B01 스케일 계약을 적용한 기존 실행 증거. |
| GREEN | 3 파일, 99건 통과 | 2026-07-26에 재실행: `npx vitest run src/components/EnemyVisual.test.js src/components/Enemies.test.jsx src/components/MatildaMesh.test.js` (2.03초). |
| 생산 빌드/B02 gate | 통과 보고됨 | 작업 인계에서 통과로 제공되었으나, 이 QA 패스에서는 재실행하지 않았다. |

회귀 테스트는 B01 기본 scale 사용, `EnemyVisual`/`CuboidCollider`에 동일한 합성 scale 전달, 그리고 3.0일 때의 1.5배 확대가 다시 들어오지 않는지를 검사한다.

## 미실시 및 한계

- 실제 게임 런타임에서 220초 Matilda 스폰을 기다려 확인하는 시각 검증은 수행하지 않았다.
- 라이브 Firebase 또는 Graphics Studio 데이터에는 접근하거나 읽거나 변경하지 않았다. 따라서 라이브 Studio 화면 시각 검증도 수행하지 않았다.
- Firebase 정본을 변경하는 테스트는 수행하지 않았으므로 스냅샷/복원 대상도 없다.

## 검토 메모

`Enemy.jsx`의 `EnemyVisual` 인근 설명 주석도 현재 동작에 맞게 `B01` 기본 scale 예시로 정리했다.
