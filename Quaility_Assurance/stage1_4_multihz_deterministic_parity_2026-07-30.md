# Stage 1~4 결정론적 멀티-Hz 순수 시뮬레이션 동등성 검증 (2026-07-30)

## 범위와 정직한 한계

이 검증은 브라우저 없는 **순수 결정론적 parity 하네스**다. 실제 코드의
`EnemyEntityPool`, `EnemySimulationRuntime`, `EnemyProjectilePool`, Stage 설정/경계,
웨이브 타임라인, 버스트 이벤트, E04 규칙, 플레이어 이동 경계와
`gameplayFrameTime`의 1/60 fixed-step 및 0.5초 raw-delta 상한을 직접 사용한다.

동일 seed (`0x5a17e`)와 동일한 시간 기반 입력 로그를 Stage 1~4 각각 240초,
렌더 cadence 30/60/120Hz로 수행했다. cadence는 공용 accumulator에만 주입하고,
모든 게임 시뮬레이션은 공통 1/60초 step으로 수행한다. 60Hz baseline과 30/120Hz의
30/60/120/180/240초 checkpoint 및 final snapshot을 자동 exact 비교한다.

이는 실제 `<Canvas>`, Rapier body, R3F mount 순서, WebGL context, GPU/프레임 시간,
오디오, 브라우저 visibility, Android/WebView/AAB를 대체하지 않는다. B01~B04 본체도
React/Rapier actor이며 순수 `EnemySimulationRuntime`의 허용 type(1~8) 밖이다. 따라서
하네스는 실제 burst timeline trigger를 기록하고, 순수 runtime에서 유효한 2마리 escort
proxy로 풀/시뮬레이션 경로만 검증한다. 보스 본체 통합은 별도 Canvas/Rapier/Android gate가
필요하다.

## 실행 명령과 결과

```powershell
cd Developer/r3f_prototype
npm.cmd test -- stageMultiHzParity.test.js
```

- Vitest: **1 file / 2 tests passed**, 테스트 본문 약 **0.72초** (전체 명령 약 4.9초).
- `git diff --check`: 오류 없음.
- Firebase, Graphics Studio, localStorage 접근/쓰기 없음.

## 동등성 결과

모든 stage/rate는 14,400 fixed steps(240초)를 완료했고, checkpoint/final mismatch는
**0건**이었다. 모든 run에서 event dropped=0, NaN=0, pool invariant=true이고 cleanup 뒤
active enemy/live proxy/projectile=0이었다.

| Stage | 60Hz 대표 final (30/60/120Hz 동일) | 주요 실제 runtime 이벤트 | 최대 활성/투사체 |
|---|---|---|---:|
| 1 | player `(3.681029,-8.308794)`, HP 9991, enemy/proxy/projectile `0/0/0` | spawn 147, contact 1, death 147, boss timeline 1 | 22 / 0 |
| 2 | player `(5.5,8.031528)`, HP 9991, `7/7/6` | spawn 135, contact 1, ranged fire/projectile spawn 262, projectile hit 26, death 128, boss timeline 1 | 32 / 6 |
| 3 | player `(-2.962942,5.048119)`, HP 9991, `10/10/6` | spawn 177, contact 1, ranged fire 322, projectile hit 25, death 139, run-crew despawn 28, boss timeline 1 | 30 / 6 |
| 4 | player `(6.633794,-7.310177)`, HP 9991, `10/10/6` | spawn 122, contact 1, ranged fire 361, projectile hit 28, death 112, boss timeline 1 | 27 / 6 |

스냅샷에는 player position/HP/contact count, active enemy, live proxy, active projectile,
event dropped, NaN, invariant을 넣었다. 풀 상한은 production `MAX_ENEMIES=200`,
`MAX_ENEMY_PROJECTILES=32` 안에 있으며, 본 검증의 관측 최대는 위 표와 같다.

## 0.5초 clamp/residual 별도 probe

`runFrameDeltaClampProbe()`는 production `gameplayFrameTime.js`를 직접 호출한다.

- raw delta `3s` → clamp `0.5s` → 정확히 30 fixed steps, residual 0.
- 이어서 120Hz delta 두 번 → first 0 step, second 1 step.

따라서 hidden/resume에서 무제한 3초를 재생하지 않고, 120Hz residual도 보존하는 기존
Rapier 호환 clock contract가 parity 테스트와 분리되어 검증된다.

## 남은 release 검증

이 결과는 30/60/120Hz render cadence에 대해 순수 simulation state가 동일하다는 증거다.
아직 Canvas/Rapier 통합 4 stage soak, 실제 low-end Android AAB 10분, WebGL context-loss,
GPU/메모리/p95 frame time, background/foreground는 이 문서의 범위 밖이며 별도 측정으로
통과해야 한다.
