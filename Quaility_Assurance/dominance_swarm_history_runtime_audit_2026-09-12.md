# Dominance Swarm Respawn 이력·런타임 감사 (2026-09-12)

- 역할: Balance QA 읽기 전용 감사
- Kanban 참조: `escape-zombie-school` / `t_3fdd132d`
- 범위: 강한 플레이어가 화면의 적을 빠르게 처리했을 때 추가 약한 적을 넣는 장치의 현존 여부·호출 경로·차단 조건 확인. 게임 수치, 런타임, 그래픽, Firebase, Git 변경 없음.

## 확인된 사실

### 이력

- 장치는 커밋 `b8ba93dc` (`2026-08-30`, `feat: 플레이어 우세 기반 다수 리스폰 적용`)에서 `src/lib/dominanceSwarmRespawn.js`와 `Enemies.jsx` 연결을 함께 추가했다.
- 이후 현재 HEAD까지 모듈은 유지된다. `git log --follow`에서 이 파일의 도입 커밋은 위 1건이며, 삭제·feature flag 전환 이력은 찾지 못했다.
- 기획 근거는 `Planner/stage_spawn_respawn_fragment_audit_2026-08-30.md`, `Planner/stage_spawn_respawn_fragment_balanceqa_handoff_2026-08-30.md`, 그리고 `Developer/r3f_prototype/Developer/agent_room/player_dominance_swarm_respawn_plan_2026-08-29.md`에 남아 있다. 정해진 웨이브를 대체하지 않고 약한 적을 추가한다는 목적이다.

### 실제 호출 경로

1. `Enemies.jsx`가 `useRef(createDominanceSwarmState())`로 런별 상태를 만들고, stage/gameKey 변경 때 `resetDominanceSwarmState`를 호출한다.
2. 풀 적 사망은 `pooledHitBridgeRef`의 실제 kill 분기에서, 특수 적 사망은 `onDeath`에서 각각 `recordEnemyKill`을 호출한다. 접촉 피해와 투사체 피해는 각각 `recordPlayerDamage`로 들어간다.
3. 매 playing frame에서 실제 `screenBounds` 안의 풀 적과 특수 body 수가 0이면 `recordEmptyField`를 호출한다. 1초 중복 기록은 막는다.
4. 같은 frame에서 `evaluateDominanceSwarm`이 현재 HP, 활성/대기 수, stage, 보스·특수 압박 플래그를 받아 판단한다. 성공하면 `SCHEDULE_DOMINANCE_SWARM = 8`을 runtime queue에 넣고 `recordDominanceSwarmSpawn`으로 쿨다운을 시작한다.
5. RAF scheduler의 `SCHEDULE_DOMINANCE_SWARM` 분기가 `clampZombieSpawnRequest`를 통과시킨 뒤, stage별 약한 적 계획을 만들고 `addEnemies(batch, true, cache.spawnToken)`로 pooled spawn-drain queue에 넣는다. `true`는 즉시 React 특수 적 생성이 아니라 표준 pooled 적의 deferred drain 경로를 뜻한다.
6. 계획 타입은 stage1 `E01/E01/E01/E02`, stage2 `E01/E01/E02/E02`, stage3·4 `E01/E02/E05`이다. 보스·특수 타입은 계획에 없다.

따라서 이 장치는 dead path가 아니다. import, 프레임 평가, schedule kind, scheduler 소비, pooled spawn 경로가 모두 현재 소스와 `Enemies.test.jsx`의 순서 회귀 검사에 연결되어 있다.

### 정해진 조건

- 시작: 런타임 15초 이후, 평가 간격 3초.
- 안전: HP 55% 이상, 최근 10초 피해가 최대 HP의 25% 이하, 활성+대기 적이 70 미만.
- 우세 점수: 최근 10초 처치수/10 + 최근 15초 빈 화면 기록 2회 이상이면 1.0 + 총 압력이 3 이하이면 0.7 + 안전하면 0.8. `2.2` 이상에서 6마리, `3.2` 이상에서 12마리이며 burst 상한은 16이다.
- 차단: 보스/특수 압박, 8초 spawn cooldown, 저체력, 최근 피해, 70 cap, 또는 점수 미달.
- 이 값은 `DOMINANCE_SWARM_CONFIG`의 고정 코드 값이며 외부 feature flag·Firebase tuning·관리자 설정 읽기는 없다.

### 2초 catch-up과의 관계

- catch-up은 화면상 적 0일 때 다음 일반 스폰 시각을 당기는 별도 장치다. Dominance 평가는 catch-up의 `spawnSec` 계산 뒤, 일반 burst loop 전에 실행된다.
- dominance는 일반 scheduled burst를 없애거나 앞당기지 않는다. 큐에 추가되는 보너스 약한 적이다.
- empty 판정은 renderer margin이 아닌 실제 `screenBounds`를 사용한다. 따라서 화면 밖에 적이 남아 있어도 화면이 비었다면 empty 기록은 생길 수 있지만, dominance의 활성 수 계산에는 그 적도 포함된다.

## 확인된 정적 재현

`npm test -- --run src/lib/dominanceSwarmRespawn.test.js src/components/Enemies.test.jsx` 결과: 2개 파일, 131개 테스트 통과.

- 모듈 테스트는 안전한 빈 화면에서 6 이상 보너스 적, 빈 화면만으로도 6마리, 최근 피해/70 cap/cooldown 차단, stage2 약한 타입 계획을 검증한다.
- Enemies 테스트는 empty 기록 → catch-up → dominance 평가 → dominance enqueue → 일반 burst loop 순서와 scheduler plan 호출을 검증한다.
- Advisor가 별도 pure-module 입력으로 재현한 결과도 코드 식과 일치했다: 20초·HP 100%·최근 피해 0에서 20킬/10초·압력20은 score 2.8로 6마리, 압력70은 active-cap, 6킬·압력10은 score 1.4로 미달, 0킬·압력0·empty 2회는 score 2.5로 6마리, special flag는 `boss-or-special-pressure`다. 이는 실제 이동 플레이 측정이 아닌 정적 조건 재현이다.

## 발견한 동작상 제한과 추가 확인 필요

### 확인된 차단 범위

- `isBossActive`는 실제 보스 생존 수가 아니라 stage4를 제외한 `sec >= bossSpawnSec && sec < escapePortalSec` 시간 창이다. 보스를 빨리 처치해도 그 창 안에서는 swarm이 계속 차단된다. 이는 "보스 압박 중 금지" 기획을 시간 창으로 구현한 사실이며, 보스 사망 뒤 재개가 기획상 필요한지 여부는 사용자 결정이 필요하다.
- `isSpecialPatternActive`는 `matildaSpawned || liveDogeCountRef.current > 0`이다. `matildaSpawned`는 store에서 spawn 뒤 true로 유지되고 resetGame에서만 false가 된다. 따라서 마틸다 트리거 뒤 런 종료까지 dominance는 차단된다. 마틸다 생존 여부를 추적하는 구현은 아니다.
- stage4는 위 보스 시간 창에서 제외되어, stage4 보스가 살아 있어도 마틸다·도지가 없고 다른 조건이 맞으면 dominance가 허용될 수 있다. 이 비대칭은 현재 코드 사실이다.

### 관측·큐 처리 한계

- 평가는 활성+대기 70 미만을 요구하지만, RAF scheduler의 `clampZombieSpawnRequest`는 전역 `MAX_CONCURRENT_ZOMBIES`(150) 기준을 쓴다. enqueue 뒤 다른 요청으로 전역 150 상한이 차거나 위치 검증으로 batch가 비면 실제 적이 없더라도 이미 기록한 8초 cooldown은 소비될 수 있다. 이 경로를 직접 검증하는 통합 테스트는 없다.
- `countPendingZombieSchedules`는 burst/overtime/matilda/doge만 세며 dominance schedule kind는 세지 않는다. 다만 dominance 자체는 lastSpawn cooldown을 즉시 기록하므로 같은 장치가 중복 예약되는 것은 막는다. catch-up empty 계산에서 dominance 대기분을 포함할지 여부는 현재 기획상 명시되지 않았다.
- spawn 위치는 `spawnPosForBurstType`의 플레이어 반경 4.0~6.5u와 stage obstacle/bounds 검증을 쓴다. 주석은 화면 내 reveal을 의도하지만, dominance 전용으로 실제 카메라·이동 중 화면 내 생성 비율을 검증하는 테스트나 telemetry는 없다.

### 이동·회피하며 학살하는 플레이어 평가

- 정지하지 않아도 실제 kill 이벤트, 화면 empty 기록, HP/최근 피해 조건만 만족하면 발동하므로 이동 자체는 차단 조건이 아니다.
- 반대로 적을 화면 밖으로 유인해 화면이 비어도, 전체 활성 수가 3을 넘으면 low-pressure 점수 0.7을 잃는다. 0킬인 경우 empty 2회 + 안전 점수는 1.8로 기준 2.2에 못 미쳐 발동하지 않는다.
- 실제 플레이에서 "강한 이동 학살"의 발동 빈도, 원거리 적·투사체가 남은 경우, 화면 바깥 적이 있는 경우의 체감은 이번 읽기 전용 감사로 측정하지 않았다. 실행 로그 또는 영상에서 `reason`, score, queued/actual batch 수를 기록해야 판정할 수 있다.

## 결론

장치는 현재 활성 연결 상태이며 숫자·기획·feature flag 때문에 전면 비활성화된 증거는 없다. 사용자가 "지금 안 보인다"고 느낀 원인으로는 보스 시간 창, 마틸다 이후의 지속 차단, 또는 2.2 점수/저압 조건 미충족이 코드상 가능하다. 어느 조건이 실제 런에서 걸렸는지는 현재 telemetry가 없어 단정할 수 없다.
