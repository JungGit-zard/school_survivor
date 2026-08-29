# 플레이어 우세 예측 기반 다수 리스폰 시스템 1차 기획서

- 작성일: 2026-08-29
- 프로젝트: Escape Zombie School / 좀비학교
- 목적: 강해진 유저에게 더 강한 적을 억지로 붙이는 대신, 약한 몬스터를 더 많이 리스폰시켜 핵앤슬래시 쾌감을 강화한다.

## 1. 한 줄 결론

플레이어가 충분히 강해졌다고 게임이 판단하면, 예정된 스폰 스케줄을 그대로 따라가기만 하지 않고 **약한 몬스터 다수를 추가 투입**해 “내가 강해져서 더 많이 쓸어버린다”는 체감을 만든다.

## 2. 발상 배경

테스트 중 버그로 몬스터가 스케줄보다 훨씬 많이 연속 리스폰된 적이 있었다. 처음에는 명확한 버그였지만, 그 버그 상황에서 아슬아슬하게 다 잡히는 지점이 있었고, 그 순간 기존 스케줄보다 오히려 더 핵앤슬래시다운 재미가 발생했다.

> 몬스터가 많지만, 플레이어가 감당 가능한 수준이면 지루함이 아니라 쾌감이 된다.

이 재미를 의도된 시스템으로 전환한다.

## 3. 현재 리스폰 구조와 문제

### 현재 구조

1. 스테이지마다 몬스터 스폰 스케줄이 정해져 있다.
2. 정해진 시간에 따라 몬스터가 리스폰된다.
3. 화면상 몬스터 개체 수가 0이 되면, 지루함을 막기 위해 약 2초 안에 다음 스케줄을 앞당겨 리스폰한다.

### 문제

- 유저가 충분히 강해진 상태에서는 2초 보정만으로도 필드가 빈다.
- 몬스터가 나와도 너무 빠르게 정리되어 지루하다.
- 그렇다고 몬스터 체력/공격력을 계속 올리면 성장한 의미가 사라진다.
- 따라서 난이도 상승이 아니라 쾌감 상승 방향의 보정이 필요하다.

## 4. 설계 철학

이 시스템은 난이도 보정 시스템이 아니라 **쾌감 보정 시스템**이다.

### 하지 말아야 할 것

- 플레이어가 강해졌다고 몬스터 체력을 계속 뻥튀기하지 않는다.
- 공격력 높은 적만 추가하지 않는다.
- 성장한 유저를 다시 답답하게 만들지 않는다.

### 해야 할 것

- 강한 유저에게는 약한 몬스터를 더 많이 준다.
- 많이 몰려오지만 충분히 쓸어버릴 수 있어야 한다.
- 유저가 “내가 강해졌다”는 사실을 전투 리듬으로 느끼게 한다.

## 5. 시스템 명칭

- 내부 시스템명: `Dominance Swarm Respawn`
- 한국어 기획명: `플레이어 우세 기반 다수 리스폰`
- UI/마케팅 표현 후보: `쓸어버림 보정`, `러시 리스폰`, `압도 보너스 웨이브`

## 6. 핵심 판단 구조

게임은 주기적으로 다음을 판단한다.

```txt
현재 플레이어가 앞으로 예정된 몬스터 스케줄을 쉽게 처리할 가능성이 높은가?
```

그렇다면 정규 스케줄 사이에 약한 몬스터 보너스 웨이브를 추가한다.

## 7. 1차 구현에서 볼 지표

처음부터 완전한 전투력 시뮬레이션을 만들지 않는다. 오늘 바로 패치 가능한 1차 버전은 **실전 로그 기반**으로 간다.

### 최근 처치 속도

- 최근 10초 동안 처치 수
- 최근 20초 동안 처치 수
- 몬스터가 0마리가 되는 빈도
- 마지막 웨이브가 몇 초 만에 정리됐는지

### 플레이어 안정성

- 현재 HP 비율
- 최근 피격 횟수
- 최근 10초 피해량

### 필드 밀도

- 현재 활성 몬스터 수
- 화면/필드에 살아 있는 몬스터 수
- 마지막 리스폰 이후 경과 시간

## 8. 1차 우세 판정 공식

```js
const killRate10s = killsInLast10Sec / 10
const hpRatio = currentHp / maxHp
const emptyFieldRecently = recentEmptyFieldCount >= 2
const lowPressure = activeEnemyCount <= 3
const playerSafe = hpRatio >= 0.55 && recentDamage10s <= maxHp * 0.25

const dominanceScore =
  killRate10s * 1.0 +
  (emptyFieldRecently ? 1.0 : 0) +
  (lowPressure ? 0.7 : 0) +
  (playerSafe ? 0.8 : -1.0)

const shouldSpawnSwarm = dominanceScore >= 2.2
```

## 9. 1차 리스폰 보정 방식

정규 스케줄은 건드리지 않는다. 그 위에 **추가 약몹 웨이브**만 얹는다.

### 추가 스폰 대상

- Stage 1: `E01` 중심, 필요 시 `E02` 소량
- Stage 2: `E01`, `E02` 중심. 원거리/특수 몬스터는 제외 또는 제한
- Stage 3+: 일반 잡몹 위주. 보스/특수 패턴과 겹칠 때는 비활성화

### 추가 수량

```txt
약한 우세: 4~6마리
중간 우세: 7~10마리
강한 우세: 11~16마리
```

단, 동시 활성 몬스터 수 상한을 반드시 둔다.

```js
const maxActiveEnemiesForSwarm = 70
const maxSwarmSpawnPerBurst = 16
```

## 10. 안전장치

아래 조건에서는 절대 발동하지 않는다.

- 플레이어 HP가 55% 미만
- 최근 10초 피해량이 최대 HP의 25% 초과
- 현재 활성 몬스터 수가 충분히 많음
- 보스 등장 직전/보스 필살기 중
- 스테이지 시작 직후 튜토리얼 구간
- 최근 8초 안에 이미 보너스 웨이브가 나옴

## 11. 스폰 위치 원칙

- 플레이어 주변 화면 밖 또는 가장자리에서 등장
- 너무 가까운 거리 금지
- 퇴로를 완전히 막지 않도록 방향 분산
- 뒤쪽 스폰은 소량만 허용

예시 분산:

```txt
전방/측면: 70%
후방: 20%
랜덤 가장자리: 10%
```

## 12. 플레이 감각 목표

유저가 느껴야 하는 감각:

```txt
“내가 강해져서 몬스터가 더 많이 몰려오는데도 시원하게 잡힌다.”
```

유저가 느끼면 안 되는 감각:

```txt
“게임이 내가 강해지니까 억지로 더 어렵게 만든다.”
```

## 13. 1차 구현 구조 제안

### 새 모듈

```txt
src/lib/dominanceSwarmRespawn.js
```

### 예상 함수

```js
export function createDominanceSwarmState() {}
export function recordEnemyKill(state, nowMs) {}
export function recordPlayerDamage(state, amount, nowMs) {}
export function recordEmptyField(state, nowMs) {}
export function evaluateDominanceSwarm(state, context) {}
export function createDominanceSwarmSpawnPlan(result, context) {}
```

### 호출 위치 후보

- 처치 기록: 몬스터 사망 처리 지점
- 피해 기록: 플레이어 피격 처리 지점
- 평가 주기: 게임 루프 또는 스폰 스케줄 처리부
- 실제 스폰: 기존 스폰/풀 스폰 함수 재사용

## 14. 1차 의사코드

```js
const result = evaluateDominanceSwarm(swarmState, {
  nowMs,
  currentHp,
  maxHp,
  activeEnemyCount,
  currentStageId,
  isBossActive,
  isSpecialPatternActive,
})

if (result.shouldSpawn) {
  const plan = createDominanceSwarmSpawnPlan(result, {
    stageId: currentStageId,
    activeEnemyCount,
    maxActiveEnemies: 70,
  })

  spawnBonusWeakEnemies(plan)
  swarmState.lastSpawnMs = nowMs
}
```

## 15. 1차 튜닝값 초안

```js
export const DOMINANCE_SWARM_CONFIG = {
  evaluateIntervalMs: 3000,
  killWindowMs: 10000,
  damageWindowMs: 10000,
  emptyFieldWindowMs: 15000,
  cooldownMs: 8000,
  minHpRatio: 0.55,
  maxRecentDamageRatio: 0.25,
  lowPressureEnemyCount: 3,
  dominanceThreshold: 2.2,
  strongDominanceThreshold: 3.2,
  maxActiveEnemies: 70,
  maxSpawnPerBurst: 16,
}
```

## 16. 단계별 확장 계획

1. 로그 기반 보너스 웨이브: 최근 처치 속도와 안정성만으로 판단한다.
2. 플레이어 스탯 기반 예측: 공격력, 무기 레벨, 패시브, 치명타, 범위 공격을 반영한다.
3. 예정 스케줄 선계산: 앞으로 20~30초 예정된 스폰 스케줄과 플레이어 전투력을 비교한다.
4. 헬 모드 / 이블리 모드 확장: 기본 모드보다 수량, 특수 패턴, 엘리트 비율을 강화한다.

## 17. 밸런스 체크리스트

- 약한 유저에게 발동하지 않는가?
- HP가 낮을 때 발동하지 않는가?
- 강한 유저에게 필드 공백이 줄어드는가?
- 몬스터 체력 뻥튀기 없이 쾌감이 생기는가?
- 프레임 드랍 없이 동작하는가?
- 보스 패턴과 겹쳐 억까가 되지 않는가?

## 18. 완료 기준

- 강한 플레이어가 몬스터를 빠르게 지우면 약몹 보너스 웨이브가 나온다.
- 약한 플레이어/위험한 상황에서는 나오지 않는다.
- 정규 스케줄은 유지된다.
- 로그/테스트로 발동 조건을 확인할 수 있다.
- 플레이 감각이 “어려워짐”보다 “더 많이 쓸어버림”에 가깝다.
