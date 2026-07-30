# Stage 1 보스 점수와 고정 프레임 시계 정합성

## 원인

- 마지막 B01 처치 직후 `bossBonus`를 계산해 저장했다. 포탈에 들어가기 전 게임오버가 나면 이 값이 미클리어 랭킹 payload에도 더해졌다. Stage 1 192초 처치 예시는 `192 + 44 = 236`점이지만, RTDB 미클리어 상한은 192점이라 서버 규칙이 제출을 거부했다.
- Rapier는 `timeStep={1 / 60}`에서 렌더 델타를 최대 0.5초로 제한한 뒤 accumulator로 1/60초 step을 여러 번 처리한다. 기존 게임 시계·무기·플레이어 타이머는 렌더 프레임마다 `min(delta, 1/30)`을 한 번만 소비했다. 그래서 15Hz에서는 물리는 4 step, 게임 로직은 2 step만 진행했다.

## 계약

- `recordBossDefeat()`는 마지막 보스 처치 사실(`bossDefeated`)과 징글만 한 번 기록한다. 즉시 스테이지 클리어·런 종료·점수 보너스는 발생하지 않는다.
- `_onRunEnd('cleared')`만 실제 종료 시점의 생존 시간으로 보스 클리어 보너스를 계산한다. 게임오버·포기 payload의 보스 보너스는 0이다.
- `getRankingScore()`도 미클리어일 때 전달된 `bossBonus`를 무시하는 마지막 방어선을 둔다. 따라서 오래된 호출자가 중간 보너스를 전달해도 RTDB 상한을 넘지 않는다.
- 게임 시간, `usePlayingFrame` 기반 무기/적, Player 타이머는 `1 / 60`초 fixed step accumulator를 공유한 동일한 델타 계약으로 동작한다. 각 소비자는 잔여 시간을 보존하므로 120Hz에서는 두 렌더 프레임이 한 게임 step이 된다.
- raw delta는 Rapier 구현과 같은 최대 0.5초로 제한한다. 탭 복귀 시 무제한 시간을 재생하지 않으며, 물리와 게임 clock이 같은 최대 30개 fixed step만 소비한다.

## 검증

- `gameplayFrameTime.test.js`: 15/30/60/120Hz에서 elapsed·재사용 대기시간·이동 거리가 동일하고, 3초 복귀 delta가 0.5초/30 step으로 제한됨을 검증한다.
- `enemySimulation.test.js`: 실제 풀 적 추적에서 같은 네 주사율의 elapsed·위치·공격 cooldown을 비교한다.
- `useGameStore.test.js`, `rankingScorePolicy.test.js`, `databaseRules.test.js`: B01 192초 처치 후 게임오버는 192점 payload, 240초 포탈 클리어는 54점 보스 보너스를 포함한 324점 payload이며 실제 RTDB 규칙을 통과함을 검증한다.
- 수행 명령: `npm.cmd test -- --run src/lib/gameplayFrameTime.test.js src/lib/usePlayingFrame.test.js src/lib/enemySimulation.test.js src/components/Game.runtimeTime.test.js src/components/Player.test.js src/lib/rankingScorePolicy.test.js src/lib/databaseRules.test.js src/store/useGameStore.test.js src/store/useGameStore.unlocks.test.js` — 9 files, 99 tests 통과.

Firebase 실데이터, Graphics Studio, localStorage는 이 변경과 테스트에서 접근하거나 변경하지 않았다.
