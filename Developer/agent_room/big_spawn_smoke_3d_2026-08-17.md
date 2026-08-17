# 큰 몬스터 등장 연기 — 빌보드 → 3D 메시 (2026-08-17)

사용자 지시: "큰 몬스터의 등장 연기는 아주 단순한 반투명 흰색 3d 메시 몇 개로 나타내서 연기처럼."
작은 좀비는 기존 빌보드 유지. 전면 교체 아님.

위임한 threemini 2기가 세션 한도(2:40pm 리셋)로 중단돼 Advisor가 직접 착지시켰다.

## 무엇을 왜 이렇게 했나

기존 `SpawnSmokeEffect`는 `spawn_smoke_puff.png` **한 장**을 `visualScale`로 늘린다. 작을 땐
문제없지만 보스(visualScale 0.889)에서는 같은 텍스처가 그대로 확대돼 해상도가 드러난다.

**분기를 `SpawnSmokeEffect` 안에 뒀다.** 이 컴포넌트가 호출부 4곳
(`Enemy.jsx:1102`, `DancingDogeEvent.jsx:208`·`252`, `GraphicsStudioPreview.jsx:290`)의
단일 진입점이라, 여기서 가르면 **호출부를 하나도 안 건드리고** 끝나고 "연기 없는 스폰 경로"가
생길 여지도 없다. 별도 파일로 빼는 안은 버렸다 — `advanceEnemySpawnTimer`·
`getSpawnSmokeOpacity`·`SPAWN_SMOKE_DURATION_MS`가 전부 `Enemy.jsx`에 있어 순환 import가 된다.

원본 빌보드 본체는 `BillboardSpawnSmokeEffect`로 이름만 바꿔 그대로 남겼다.

## 큰 몬스터 판정 — 타입 목록이 아니라 크기

호출부가 넘기는 `visualScale = stats.scale × ENEMY_SIZE_MULTIPLIER(4/3) × 0.333 = scale × 0.4444`.

| 몬스터 | scale | visualScale | |
|---|---|---|---|
| E03 | 0.75 | 0.333 | 빌보드 |
| E01 / E07 | 1.00 | 0.444 | 빌보드 |
| E05 | 1.15 | 0.511 | 빌보드 |
| E02 | 1.40 | 0.622 | 빌보드 |
| **E06** | 1.60 | **0.711** | 3D |
| **RZT** | 1.76 | **0.782** | 3D |
| **B01~B04** | 2.00 | **0.889** | 3D |

임계값 **0.70**. E02(0.622)와 E06(0.711) 사이의 빈 구간이라 경계에서 흔들리는 몬스터가 없다.
타입 목록으로 하드코딩하지 않은 이유는 새 몬스터가 추가돼도 알아서 맞는 쪽에 붙기 때문이다.

## 메시 구성

반투명 흰 구 **6개**(`SphereGeometry(1, 10, 8)`). 중앙 1 + 허리 링 4 + 위 1.
좌표·반지름이 전부 `visualScale` 배수라 몬스터 크기에 그대로 따라간다.
시간에 따라 바깥으로 퍼지며(`spread` 1 → 1.9) 부풀고(`grow` 1.3~1.55배), 그룹 전체가
위로 뜨면서 살짝 돈다. 파티클 시스템·셰이더·신규 텍스처 없음.

지오메트리는 모듈 상수로 전 인스턴스 공유. **머티리얼만 인스턴스별**로 만든다 — 불투명도가
시간에 따라 움직이므로 공유하면 동시 스폰끼리 서로의 페이드를 덮어쓴다. 언마운트 시 dispose.

## 연출 정본 유지

펑 선행 → 300ms 불투명 → 좀비 리빌. 3D 경로도 `getSpawnSmokeOpacity`와
`SPAWN_SMOKE_DURATION_MS`(800ms)를 **그대로** 쓴다. 타이밍 상수가 한 곳이라 어느 쪽으로
갈라져도 계약이 같고, 나중에 한쪽만 어긋날 수 없다.

## 검증

`npx vitest run src/components/BigSpawnSmoke.test.js src/components/EnemyVisual.test.js
src/components/PooledEnemyVisuals.test.js src/components/GraphicsStudioPreview.test.js`
→ **74 passed / 1 failed**.

실패 1건은 `GraphicsStudioPreview.test.js`의 `TitleScene3D.jsx` 소스 문자열 단언으로,
타이틀 렌더 영역(`734356a`)이고 이번 변경과 무관하다. 타이틀은 작업 범위에서 항상 제외다.

신규 테스트 `BigSpawnSmoke.test.js`가 고정하는 것: 어느 몬스터가 3D로 가는지(전 타입 전수),
임계값이 어떤 몬스터 크기와도 겹치지 않는지, `visualScale`이 없거나 0이어도 빌보드로
떨어지는지(연기 없는 스폰 금지), 그리고 두 구현이 공유하는 300ms 불투명 계약.

`git diff --stat --ignore-all-space` = 107 insertions / 1 deletion — 줄바꿈 오염 없음.

## 안 한 것 (정직 고지)

**브라우저로 실제 렌더를 눈으로 확인하지 않았다.** 이 프로젝트의 스폰 연출 규칙은 실측
스크린샷 검증을 요구한다 — 사용자 확인이 필요하다. 구 배치·크기·퍼짐 속도는 실제로 보고
조정할 값이며, 그래픽 스튜디오(`vfx-zombie-spawn-puff`)로 튜닝할 수 있게 기존
`StudioTunedGroup` 래핑을 유지했다.

## 별건 — 확인만 하고 손대지 않은 것

`getSpawnSmokeOpacity`가 `Enemy.jsx:95`와 `components/PooledEnemyVisuals.js:103`에
**같은 이름으로 두 벌** 있다. 이중 정본이면 한쪽만 바뀔 때 어긋난다. 이번 범위 밖이라
그대로 뒀다.
