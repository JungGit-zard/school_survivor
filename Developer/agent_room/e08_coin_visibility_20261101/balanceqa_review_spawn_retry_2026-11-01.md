# balanceqa 검수: E08 코인 몬스터 화면 내 스폰 + 보상 이벤트 재시도 (2026-11-01)

- 대상: `C:\Dev\ezs-cf2\Developer\r3f_prototype` (zombie_only, HEAD 8769f71d) 미커밋 levelmini 변경
  - `src/components/Enemies.jsx` (+43/-1, 삭제 줄은 import 한 줄뿐), `src/lib/burstEvents.js` (+7), `src/components/Enemies.test.jsx` (+67)
- 범위: S1–S5 (S6–S10은 초안이라 제외)
- 검수자: balanceqa (읽기 전용, 소스 무수정. dev 서버·브라우저·빌드 미실행)

## 판정: APPROVE WITH NOTES

## 1. 불변 조건 확인 (grep + diff)

| 항목 | 값 | 상태 |
|---|---|---|
| E08 코인 드롭 | `E08: { textbook: 0, gold: 10 }` (Enemies.jsx:90) | 변경 없음 |
| 보상 시각 | `COIN_MONSTER_RUNTIME_EVENTS` 90s/180s, count 1 (burstEvents.js:91-92) | 변경 없음 |
| 도주 감지/해제 | 4.5u / 6.25u (enemySimulation.js:35-36) | 변경 없음 (파일 미수정) |
| 배회 반경 | 1.2u (enemySimulation.js:37) | 변경 없음 |
| 일반 링 | SPAWN_MIN 4.0 / MAX 6.5, E04 5.5–7.5, 폴백 `findNearestFreeSpawnPosition` | 변경 없음 (E08 분기만 추가) |
| HUD 치트 소환 | `summonCoinJingleZombieCheat` (HUD.jsx:134, 2.2u 앞) | 변경 없음 |
| 동시 천장 | `MAX_ENEMIES = 150` (enemyEntityPool.js:3) | 변경 없음 |
| 다른 이벤트 재시도 | `shouldRetryRewardBurst`는 `evt.rewardEvent`가 있을 때만 true | E08 보상 이벤트만 해당 |

E08은 S1–S5에서 `COIN_MONSTER_RUNTIME_EVENTS`로만 등장한다(저밀도 보강 E07/E01, 웨이브 표에 E08 없음). S6–S10의 expansion 경로는 `buildExpansionBurstBatch`를 타서 이번 변경과 무관하다.

## 2. 밸런스/게임플레이

### 4.5u 스폰과 즉시 도주
- 스폰 거리 4.5u 이상이면 도주 조건(거리 4.5u 이하)에 걸리지 않아 **배회 상태로 시작**한다. 예전 최소 4.0u에서는 4.0–4.5u 구간(반경을 균등하게 뽑으므로 스폰의 약 20%)에서 태어난 E08이 첫 프레임부터 도주했으므로, 이번 변경은 잡기 **쉬워지는 쪽**이다.
- 속도: 배회 0.34u/s, 도주 0.88×1.35 = 1.19u/s, 플레이어 기본 3.0u/s(최대 5.4u/s). 도주 중에도 거리 좁히는 속도는 초당 1.8u 이상이다. 벽에 닿으면 도주 벡터가 -0.65배로 꺾여 구석에 몰린다. 세로 화면에서도 보상은 충분히 얻을 수 있다.
- 몬테카를로(장애물 없이, 각 1만 회, Game.jsx 카메라 계산을 그대로 재현, `gameCameraFraming.js` import):
  - 세로 390x844, S1/S2/S4, 플레이어 중앙: 실패 0%, 전부 링 채택, 중앙값 거리 5.26–5.28u, 4.5u 미만 0%
  - 세로 + 카메라 가까운 쪽 구석(+x,+z): 링 99.5%, 화면 사각형 폴백 0.5%, 4.5u 미만 0.1%(최소 1.4u, 이때만 즉시 도주. 화면 안이므로 보임)
  - 정사각/16:9: 실패 0%, 4.5u 미만 0%
- 스크립트: `C:/Users/admin/AppData/Local/Temp/claude/F--From-SSD-D-20261005-JungSil-2-Minigame-project-school-survivor-integration/c13da572-f1a7-4c11-876c-77aa0d8a4fb3/scratchpad/e08sim.mjs`

### 코인 몬스터 두 마리 동시 생존
- 재시도 창은 90→120s, 180→210s로 서로 겹치지 않는다. 재시도로 같은 이벤트가 두 번 스폰될 수도 없다: 처리 시점에 표시를 풀고 스폰 없이 return하며, 다음 틱 스케줄러가 한 번만 다시 넣는다.
- 90s 개체가 180s까지 살아 있으면 둘이 동시에 있을 수 있다. 하지만 이것은 변경 전에도 같았다(E08에 수명 제한 없음). 재시도 때문에 90s 개체가 실제로 존재할 확률이 오를 뿐이며 의도된 동작이다. 새 리스크 아님.

### 보스 구간(S2–S4) 천장 기아
- 재시도는 칸을 예약하지 않는다. 천장이 차 있으면 아무것도 넣지 않고 다음 틱에 다시 확인할 뿐이다. 칸이 나면 E08이 최대 1칸을 쓴다. 일반 웨이브를 굶길 위험은 없다(최대 1/150).
- 30초 안에 칸이 안 나면 포기한다. 이 경우 해당 보상은 그 판에서 사라진다(변경 전과 같음). 아래 메모 N1 참조.

## 3. 견고성

- CPU: 시도당 비용은 사다리꼴 판정(곱셈 몇 번) 뒤, 화면 안일 때만 경계·장애물·간격 검사다. 평균 시도 수는 중앙 3.7, 세로 구석 9.9이고 최악 실측 61회(상한 96)다. 재시도는 30초 동안 매 프레임 호출되며 프레임당 수 마이크로초 수준이라 체감 비용은 없다. 링 버퍼도 한 칸만 쓴다.
- null 누출: `spawnPosForBurstType` 호출처 5곳을 확인했다. 1764/1780/1848/1896은 `if (!pos) continue`를 쓰고, 1314(저밀도 보강)는 `??` 폴백을 쓰지만 E08이 들어오지 않는다. 보상 이벤트는 batch가 비면 재시도로 빠진다. 객체를 가정하고 접근하는 호출처는 없다.
- screenBounds가 비어 있을 때(초기 0 폭): t=NaN이라 판정이 false가 되고 null을 반환한 뒤 재시도한다. 안전하다.
- 스테이지 리셋 시 `firedBurstsRef.fill(0)`(Enemies.jsx:1450)로 재시도 상태도 초기화된다.

## 4. 회귀 (파일 하나씩 `npx vitest run <path>`)

| 파일 | 결과 |
|---|---|
| src/components/Enemies.test.jsx | 140/140 pass (신규 2건 포함) |
| src/lib/burstEvents.test.js | 60/60 |
| src/lib/enemySimulation.test.js | 42/42 |
| src/lib/gameCameraFraming.test.js | 6/6 |
| src/components/Enemies.stage5.test.jsx | 1차 1 fail(5013ms, 기본 5s 타임아웃) → `--testTimeout=60000` 재실행 2/2 pass. HP 단계 테스트라 이번 변경과 무관한 메모리 부족 기계의 타임아웃 |
| src/lib/postExitWaveGrowth.test.js | 6/6 |
| src/lib/waveTimelines.test.js | 20/20 |
| src/lib/expansionGameplay.test.js | 5/5 |
| src/lib/expansionIntegration.test.js | 11/11 |
| src/store/useGameStore.stage5.test.js | 1 pass, 1 skip |
| src/store/useGameStore.test.js | 41/41 |
| src/components/AdminPage.test.jsx | 12/12 |
| src/components/HUD.test.jsx | 64/64 |

Game.test.jsx는 존재하지 않는다. 합계 410 pass(Stage5 재실행 기준), 1 skip, 실질 실패 0.

## 메모 (차단 아님)

- N1. 재시도 판정 시각 `b`는 실시간 sec이고, 발화 게이트는 당겨진 spawnSec이다. 그래서 실제 재시도 창은 "30초 + 당김 폭"이 되며 여전히 유한하다. 30초를 넘겨 포기하는 경우는 로그·텔레메트리가 없어서 현장에서 E08 누락을 구분할 수 없다. 필요하면 미션 이벤트 한 줄을 추가할 것.
- N2. 천장이 찬 동안에도 매 프레임 좌표 샘플링을 먼저 한다. 비용은 무시할 수준이지만 cap을 먼저 확인하면 더 깔끔하다(선택).
- N3. 신규 테스트는 플레이어 중앙 위치만 본다. 구석 클램프 위치(카메라가 맵 끝에 고정된 경우)는 이번 몬테카를로로만 확인했다. 세로 구석 케이스 1건을 단위 테스트로 추가하길 권한다.
- N4. 실기기·브라우저에서 90s/180s에 E08이 실제로 보이는지는 **미검증**이다(이번 검수 범위에서 dev 서버·브라우저 금지). 머지 후 세로 390x844 실화면 1회 확인 필요.
- N5. 재시도 로직 검증은 순수 함수 시뮬레이션과 소스 문자열 검사뿐이다. 컴포넌트 통합 경로(천장이 찬 상태에서 실제 재시도)는 런타임으로 돌려 보지 않았다.
