# Stage 1/2 웨이브 밸런스 점검 보고서

- 점검 시각: 2026-07-07 00:24
- 범위: Escape! zombie school Stage 1, Stage 2 웨이브/버스트/투사체 밸런스 정적 점검
- 수정 여부: 코드 수정 없음

## 확인 파일

- `Developer/r3f_prototype/src/lib/waveTimelines.js`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js`
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
- `Developer/r3f_prototype/src/lib/stage2ProjectileRules.test.js`
- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`

## 실행 검증

```text
npm test -- --run src/components/Enemies.test.jsx src/lib/stage2ProjectileRules.test.js

Test Files  2 passed (2)
Tests       25 passed (25)
```

## 공통 정상 확인

- Stage 1/2 모두 phase 구간은 0~240초까지 gap/overlap 없이 연속.
- Stage 1/2 모든 wave weight 합계는 1.0.
- Stage 1 기본 wave/burst에는 E04 없음.
- Stage 2 E04 첫 wave/burst 도입은 72초 이후.
- Stage 2 E04 개체 캡은 코드 기준 80s=2, 120s=3, 200s=3, 220s=4.

## Stage 1 이상점 후보

### 1. E02 탱커가 웨이브보다 버스트로 12초 먼저 등장

- `waveTimelines.js`: E02 첫 wave 포함은 60초 phase.
- `Enemies.jsx`: 48초에 E02 x4 burst.
- 영향: 사용자는 48초에 탱커를 먼저 만난다. 주석/의도상 “탱커 첫 등장”이 60초라면 실제 체감과 불일치.
- 판단: 코드 오류라기보다 기획 의도/주석 drift 또는 초반 난이도 스파이크 후보.

### 2. 0~40초 phase target 24 대비 burst 총합 28

- 첫 phase target: 24.
- burst: 0초 E01 x16 + 24초 E01 x12 = 28.
- 유지 스폰은 target 기준이지만 burst는 target cap 없이 추가된다.
- 영향: 플레이어가 초반 처치 속도를 못 따라가면 0~40초 교육 구간이 target보다 과밀해질 수 있음.
- 판단: “초반 단일 좀비 밀도 2배” 의도는 맞지만, 완전 초보자 기준이면 과밀 후보.

### 3. 90~108초 완화 구간에 96초 burst +8

- phase target: 15.
- burst: 96초 E01 x5 + E02 x3 = 8.
- 영향: 완화 구간인데 순간적으로 target 대비 53% 규모의 추가 압박이 들어온다.
- 판단: 완화 의도가 강하다면 조정 후보.

### 4. 테스트 설명 문구 drift

- `Enemies.test.jsx`: “five percent pressure” 설명.
- 실제 assertion: E06 weight 0.03.
- 코드 주석도 5%→3% 완화와 일치.
- 판단: 동작 문제 없음. 테스트 설명만 오래됨.

## Stage 2 이상점 후보

### 1. E04 투사체 상한이 전역이 아니라 개체별로 동작할 가능성

- `stage2ProjectileRules.js`: `STAGE2_E04_MAX_PROJECTILES = 6`.
- `Enemy.jsx`: projectile state가 Enemy 컴포넌트 내부 상태이고 `projectiles.length`를 activeProjectileCount로 전달.
- 영향: E04 동시 개체 cap 2/3/4 기준 총 투사체는 이론상 12/18/24발까지 가능.
- 테스트 설명은 “global projectile”이라고 표현.
- 판단: 실제 의도가 “화면 전체 6발”이면 버그 후보. 의도가 “E04 개체당 6발”이면 테스트/문서 drift.

### 2. bossPressure 투사체 억제 시간이 보스 페이즈보다 짧음

- 보스 wave phase: 192~240초.
- 실제 E04 발사 억제: `elapsedSec >= 190 && elapsedSec < 200`.
- 216초에 E04 burst도 추가됨.
- 영향: 보스전 대부분인 200~240초에는 E04가 다시 발사 가능.
- 판단: “보스 등장 직후 10초만 안전창”이면 정상. “보스전 중 E04 억제” 의도라면 범위 drift.

### 3. E04 cap 초과 시 무조건 E03으로 대체

- `Enemies.jsx`: Stage 2에서 E04 cap 초과 시 `type = 'E03'`.
- 일부 phase에는 E03이 원래 weight에 없음: 96~120, 168~192, 192~208, 208~224.
- 영향: cap에 걸리는 순간 기획 weight에 없는 러너가 생성되어 실제 구성비가 달라질 수 있음.
- 판단: 명확한 크래시 버그는 아니지만 밸런스 재현성/의도 일치 측면에서 조정 후보.

## 결론

- 테스트는 통과했고, phase 연속성/weight 합계/E04 Stage 1 제외 같은 기본 규칙은 정상.
- “바로 고쳐야 하는 크래시성 오류”는 발견하지 못함.
- 다만 플레이 체감에 영향을 줄 수 있는 밸런스 이상점 후보는 있음:
  1. Stage 1 48초 E02 선등장.
  2. Stage 1 초반/완화 구간에서 burst가 target을 초과하는 구조.
  3. Stage 2 E04 투사체 cap이 전역인지 개체별인지 불명확.
  4. Stage 2 보스전 E04 발사 억제창이 190~200초로 짧음.
  5. Stage 2 E04 cap 초과 대체가 E03 고정이라 phase 구성비를 흔들 수 있음.

## 추천 조치

- 수정 전 결정 필요:
  1. Stage 1의 48초 E02 burst를 유지할지, 60초 이후로 늦출지.
  2. burst가 target cap을 초과해도 되는 설계인지, 초과분은 스킵/감산할지.
  3. Stage 2 E04 projectile cap은 화면 전체 6발인지, E04 한 마리당 6발인지.
  4. bossPressure 억제는 보스 등장 직후 10초인지, 보스 페이즈 전체인지.
  5. E04 cap 초과 대체는 E03 고정인지, 같은 phase weight에서 재추첨/스킵인지.
