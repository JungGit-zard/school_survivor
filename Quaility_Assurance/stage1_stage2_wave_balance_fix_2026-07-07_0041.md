# Stage 1/2 웨이브 밸런스 수정 기록

- 작업 시각: 2026-07-07 00:41
- 범위: Stage 1/2 웨이브/버스트/E04 투사체 밸런스 이상점 수정
- 기반 점검 보고서: `Quaility_Assurance/stage1_stage2_wave_balance_check_2026-07-07_0024.md`

## 수정 파일

- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`

## 적용한 수정

### 1. Stage 1 초반 burst 과밀 완화

- 0~40초 첫 phase target은 24.
- 기존 burst는 0초 E01 x16 + 24초 E01 x12 = 28로 target을 burst만으로 초과했다.
- 수정 후 24초 E01 burst를 x12 → x8로 완화.
- 수정 후 0~40초 burst 총합은 24.

### 2. Stage 1 E02 탱커 첫 등장 시점 정렬

- 기존에는 E02 burst가 48초에 x4로 등장해 wave의 첫 E02 포함 phase보다 빨랐다.
- 수정 후 E02 burst를 48초 → 60초로 이동.
- wave의 첫 E02 phase와 실제 체감 첫 등장 시점을 정렬했다.

### 3. Stage 1 완화 구간 burst 이동

- 기존 90~108초 완화 구간 중 96초에 E01 x5 + E02 x3 burst가 들어갔다.
- 수정 후 해당 burst를 108초로 이동.
- 90~108초 완화 구간에는 burst가 들어가지 않게 했다.

### 4. Stage 2 E04 cap 초과 대체 방식 수정

- 기존에는 E04 cap 초과 시 무조건 E03으로 대체했다.
- 일부 phase에는 E03이 원래 weight에 없어서 실제 구성비가 기획과 달라질 수 있었다.
- 수정 후 `pickTypeByWeightExcluding(weights, 'E04')`를 추가해 같은 phase의 non-E04 weight 안에서 재추첨한다.
- 대체 후보가 없으면 해당 spawn을 스킵한다.

### 5. Stage 2 E04 투사체 cap을 전역 기준으로 정렬

- 기존에는 각 Enemy 컴포넌트 내부 `projectiles.length`를 사용해 E04 개체별 cap처럼 동작할 수 있었다.
- 수정 후 module-level Set으로 활성 E04 projectile ID를 추적하고 `getActiveE04ProjectileCount()`를 사용한다.
- E04 발사 시 등록, projectile 만료/Enemy unmount 시 해제한다.
- 결과적으로 `STAGE2_E04_MAX_PROJECTILES = 6`이 화면 전체 E04 투사체 예산으로 동작하도록 정렬했다.

### 6. Stage 2 보스 페이즈 E04 발사 억제 확장

- 기존 bossPressure 억제창: 190~200초.
- 보스 phase: 192~240초.
- 수정 후 bossPressure를 192~240초로 확장했다.
- 보스전 중 E04 개체는 존재할 수 있지만 투사체 발사는 억제된다.

### 7. 테스트 보강

- Stage 1 초반 burst 총합 24 확인.
- Stage 1 60초 전 E02 burst 없음 확인.
- Stage 1 90~108초 완화 구간 burst 없음 확인.
- E04 cap 초과 시 E03 고정 대체가 아니라 같은 phase non-E04 weight 재추첨 확인.
- E04 projectile 전역 예산/보스 페이즈 억제 구현 확인.
- E06 테스트 설명을 실제 3% 값에 맞게 수정.

## 검증 결과

### 웨이브 정적 검증

```text
{
  "stage1Issues": [],
  "stage2Issues": [],
  "stage1EarlyBurstTotal": 24,
  "stage1EarlyE02": [],
  "stage1ReliefBursts": []
}
```

### 관련 테스트

```text
npm test -- --run src/components/Enemies.test.jsx src/lib/stage2ProjectileRules.test.js

Test Files  2 passed (2)
Tests       28 passed (28)
```

### 빌드

```text
npm run build

✓ built in 680ms
```

빌드 경고:
- 기존 chunk size 경고 및 dynamic import/static import 경고가 출력됨.
- 이번 수정으로 새로 생긴 실패는 없음.

## 주의

- 작업 중 기존 다른 미커밋 변경이 다수 존재했다. 이번 작업에서 직접 수정한 파일은 위 3개 코드/테스트 파일과 이 QA 기록 파일이다.
- `dist/` 산출물은 `npm run build`로 갱신되었을 수 있으나 git status에는 추적 변경으로 표시되지 않았다.
