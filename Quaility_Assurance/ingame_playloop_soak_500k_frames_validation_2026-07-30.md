# 인게임 플레이 루프 소크 검증 — 50만+ 프레임 (2026-07-30)

## 요청

몬스터 · 무기 · 이동 · 리스폰 위주로 인게임 내부 테스트를 5만회 이상 반복해 에러를 잡는다.
추가로 게임 안정성을 평가하는 서브에이전트를 만들고, 뱀파이어 서바이버 기준 10점 척도로 8점 이상까지 작업을 지속한다.

## 만든 것

| 산출물 | 경로 | 역할 |
|---|---|---|
| 플레이 소크 하네스 | `Developer/r3f_prototype/src/lib/gameplaySoak.js` | 브라우저 없이 실제 프레임 루프를 반복 구동 + 매 프레임 불변식 검사 |
| 소크 테스트 | `Developer/r3f_prototype/src/lib/gameplaySoak.test.js` | 기본 12,000프레임(=200초, 포화 구간 포함), `SOAK_FRAMES`/`SOAK_SEEDS`로 장시간 확장 |
| 안정성 채점 서브에이전트 | `.claude/agents/stabilityscore.md` | VS 기준 10점 루브릭(A~H)으로 안정성 채점, `VERDICT: PASS/FAIL` 출력 |

기존 `runPooledEnemyRuntimeSoak`(Enemies.jsx:710)은 고정 패턴 풀 churn만 본다.
이 하네스는 네 축을 **정본 함수로** 함께 돌린다 — 복제한 것은 프레임 루프 배선뿐이다.

- **몬스터**: `nextWaveTimeForStage` / `waveSizeForStageAtTime` / `pickTypeByWeightExcluding` / `getRuntimeBurstEventsForStage`(형태 포위·런좀비 크루·보스 호위) / `EnemySimulationRuntime.step`(실제 프레임 컨텍스트 그대로: obstacles·sightBlocked·bossPressure·e04IntroSec)
- **무기**: `findClosestEnemy` / `applyRadialDamage` / `applyForwardConeDamage` → `applyEnemyHit` → `applyHitIndex`, 레벨업 카드 churn은 `applyUpgradeWithChibikoBoost` + `isUpgradeAvailable`
- **이동**: `clampPlayerPosition`(스테이지별 실제 경계) + `resolvePlayerHitKnockback`(Player.jsx 정본) + 520ms 무적 타이머 배선
- **리스폰**: `randomSpawnPos` / `formationSpawnPositions` / `createRunZombieCrewEntries` → `enqueuePooledEnemySpawn` → `drainPooledEnemySpawnQueue`(프레임당 3마리, stale token 폐기)

## 검사하는 불변식 (매 프레임)

1. `enemyPool.validateInvariants({halfX, halfZ, padding: 7})` — 회계·유한성·HP 범위·좌표 범위
2. `activeCount <= 200`, `liveProxyCount === activeCount`
3. 이벤트 드롭 0, `ENEMY_EVENT_ERROR` 0 (슬롯 격리 = 잘못된 상태의 신호)
4. 투사체 `activeCount <= 32`, E04 동시 발사 상한
5. 장애물 겹침 30프레임(0.5초) 초과 금지 — "적이 책상 안에 박힘" 탐지
6. `stuckMs`가 회복 임계 4배(4.8초) 초과 금지 — 영구 스턱 탐지
7. stale 핸들 프로브 — 죽은 개체의 (index, generation)으로 다시 때려서 살아있는 슬롯이 피해를 입지 않는지
8. 접촉 쿨다운(`ENEMY_CONTACT_COOLDOWN_MS`) 초과 설정 금지
9. 플레이어 좌표 유한 + 이동 경계 이탈 0
10. `0 <= player.hp <= maxHp`, `phase === 'playing'` 유지 (사망→런종료 경로 진입 시 실패)
11. 무기 업그레이드 cap/유한성 (stat cap, critChance/critMultiplier cap, level 1~5)
12. `heapUsed` 시작/종료 스냅샷 — 단조 증가 누수 카나리아

## 실행 결과

```
# 기본(회귀 방어용, npm test에 포함)
npx vitest run src/lib/gameplaySoak.test.js
→ 12,000프레임: maxActive 200(풀 상한 도달), contacts 192, playerDamageEvents 73, invulnerableBlocks 119, 실패 0

# 장시간
$env:SOAK_FRAMES="60000"; $env:SOAK_SEEDS="1,2,3,4"   → 240,000프레임 · 실패 0
$env:SOAK_FRAMES="65000"; $env:SOAK_SEEDS="11,12,13,14" → 260,000프레임 · 실패 0
```

누적 **500,000+ 프레임**(≈2시간 20분 플레이 상당), 4개 스테이지 전부, 포화 런 포함.

| 지표 | 결과 |
|---|---|
| 실패(failure) | **0** |
| `errorEvents` / 이벤트 드롭 | **0 / 0** |
| stale 핸들 위반 | **0** (프로브 7,932,588건) |
| 스폰 / 처치 | 69,213 / 64,889 |
| 접촉 / 플레이어 피해 / 무적 차단 | 6,584 / 2,150 / 4,434 |
| `maxActive` | 200 (전 seed에서 풀 상한 도달) |
| `maxProjectiles` | 6 (`STAGE2_E04_MAX_PROJECTILES` 상한에서 정확히 포화) |
| `maxOverlapFrames` | ≤ 1 (일시적 밀집 분리만, 박힘 없음) |
| `maxStuckMs` | 1183ms < 1200ms 회복 임계 (매번 자력 회복) |
| `heapGrowthMb` | +18 / -10 / -2 / +23 (단조 증가 없음) |
| `spawnFailures` | 풀 포화 시 크래시 대신 카운터로 흡수 (설계된 동작) |
| 전체 스위트 | 169 files / 1,456 tests 통과 |

## 발견된 결함

**런타임 코어에서 새 결함은 발견되지 않았다.** 위 12개 불변식 중 50만+ 프레임에서 위반된 것은 없다.
스폰 실패(런당 110~180건)는 포화 런에서 풀 상한에 부딪힌 정상 동작이며, 카운터로만 흡수되고 크래시·프리즈로 번지지 않는다.

## 안정성 점수 (stabilityscore 서브에이전트, VS 기준 10점)

1차 채점 **9.25 / 10 → 감점 3건 반영 후 재채점 9.7 / 10 — PASS** (목표 8점 초과 달성).
재채점은 서브에이전트가 독립적으로 재실행해 확인했다: 기본 실행(12,000프레임) 통과, fresh seed 21·22 × 65,000프레임(=130,000프레임 추가) 실패 0,
`invulnerabilityReleases == playerDamageEvents`(277/277, 311/311 — 무적 플래그 잔류 0건), 전체 스위트 169 files 통과.

잔여 감점: G 프레임 경로 무할당 0.6/0.75 (무기 발사 콜사이트 8곳의 틱당 impact 객체 리터럴 + 실제 브라우저 GC 미실측),
H 회귀 방어 0.6/0.75 (기본 실행은 stage1·seed 1·12,000프레임까지만 — 5만+프레임 멀티시드는 CI nightly 배선 필요).

| 감점 사유 | 조치 |
|---|---|
| H: 5만+ 프레임 검증이 기본 `npm test`에 안 걸림(기본 2,400프레임/1 seed) | 기본 12,000프레임으로 올리고 **첫 런을 포화 런으로** 바꿔 기본 실행만으로 풀 상한·접촉 경로 커버 |
| F: 무적 타이머 폭주가 소크에 미통합 | 실제 `damagePlayer`/`endInvulnerable`(520ms) 배선 추가. HP 40 이하 회복으로 사망→Firebase 런종료 경로는 차단하고, `phase !== 'playing'`이면 실패 처리 |
| 힙 성장 미측정 | `process.memoryUsage().heapUsed` 스냅샷 + `heapGrowthMb < 96` 단정 추가 |

## 남은 미검증 범위 (이번 작업 범위 밖)

- 실제 브라우저 FPS / GC 히칭 실측 (헤드리스 Node 실행이므로 코드 근거로만 판단)
- React/Rapier로 렌더되는 보스 본체 (풀 대상이 아니며 소크에는 호위만 들어간다)
- Three.js / Rapier 리소스 disposal, 오디오 채널·에셋 churn
- 무기 발사 콜사이트 8곳의 틱당 impact 객체 리터럴 생성 (핵심 시뮬레이션·타겟팅 루프 자체는 무할당)

## 상태 복원 (테스트 전후 상태 절대 동일성)

- `Math.random`은 seed PRNG로 교체 후 `finally`에서 원복한다.
- `useGameStore`의 `currentStageId` / `phase` / `player`를 시작 시점 값으로 원복하고 `resetRuntimeRefs()`로 런타임 풀을 초기화한다.
- Firebase 접근·변경·Apply 없음. localStorage 사용 없음. 무기 해금·영구 업그레이드 저장 계층은 호출하지 않는다(전 무기를 메모리에서 active로 두어 acquire 게이트에 도달하지 않는다).
- 커밋하지 않았다.
