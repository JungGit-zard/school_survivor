# B03 필살기 바닥 예고선을 실제 왕복 코스에 맞춤 (2026-08-30 0151 KST)

담당: threemini (Worker) / 지시: Advisor 브리프 (2026-08-30 사용자 음성 지시 재확인분)

## 사용자 사양

> "필살기 예고로 **자기가 왕복해서 달릴 코스를** 굵은 직선으로 깜빡이는 예시가 나온 다음에,
> 그 위를 정직하게 지금 이동의 3배 속도로 걷는 애니메이션 똑같이 하면서 왕복해서 한번 갔다가 오는 것까지만"

핵심은 "자기가 왕복해서 달릴 코스" — 예고선은 보스가 실제로 지나갈 구간이어야 한다.

## 증상 (수정 전, `[확인된 사실]`)

`B03ShuttleRunVisual`이 예고선을 아레나 전폭으로 그렸다.

- 지오메트리: `position=[0, y, laneZ]`, `boxGeometry args=[halfX * 2, ...]`
- stage3 `mapHalfX = 7.5` → 선은 항상 `x ∈ [-7.5, +7.5]`, 길이 15
- 실제 코스는 `[startX, endX]`이고 `startX`는 보스의 현재 X (`getB03ShuttleRunLaneX`)
- 보스가 중앙(x≈0)에서 발동하면 코스는 `0 → +6.6 → 0`인데 선은 `-7.5 ~ +7.5`
  → **아레나 왼쪽 절반(길이 7.5)이 통째로 거짓 경고**

## 수정 내용

### 1. `Developer/r3f_prototype/src/lib/b03ShuttleRun.js`

순수함수 1개와 상수 1개 추가 (기존 함수 동작 변경 없음).

```js
export const B03_SHUTTLE_LANE_MIN_LENGTH = 0.1

export function getB03ShuttleRunLaneGeometry(startX, endX) {
  // centerX = (startX + endX) / 2, length = |endX - startX| (하한 0.1)
}
```

- `startX === endX`일 때 `boxGeometry` 폭이 0이 되는 것을 막는 하한 `0.1`.
- `Number.isFinite` 가드로 undefined/NaN이 들어와도 지오메트리가 NaN이 되지 않는다.
- 순수함수로 뺀 이유: 렌더 없이 값으로 회귀 판정하기 위함(문자열 매칭 금지 지시).

### 2. `Developer/r3f_prototype/src/components/Enemy.jsx`

- `hasB03ShuttleRunVisualChanged`에 `startX`/`endX` 비교 추가.
  이게 없으면 두 번째 시전(HP 30%)에서 첫 시전의 선이 그대로 남는다.
- `B03ShuttleRunVisual` 시그니처 `{ phase, passIndex, laneZ, halfX }` → `{ phase, passIndex, laneZ, startX, endX }`.
  `halfX` prop은 이 컴포넌트에서 더 이상 쓰이지 않으므로 제거했다(미사용 prop 방치 금지).
- 두 mesh의 `position.x`를 `centerX`로, 폭을 `length`(외곽선은 `length + 0.18`)로 교체.
  외곽선이 X에서도 0.09씩 넉넉해져 Z축 테두리(`LANE_WIDTH + 0.18`)와 형태가 일치한다.
- 호출부에서 `startX={b03ShuttleVisual.startX} endX={b03ShuttleVisual.endX}` 전달.
  `b03ShuttleVisual` state에는 `createB03ShuttleRunState`가 이미 두 값을 넣어두고 있어 새 상태는 만들지 않았다.

### 3. 테스트

- `src/lib/b03ShuttleRun.test.js` — 값 판정 회귀 테스트 2건 추가
  - 보스 x=0 발동 시 `centerX=3.3`, `length=6.6`, 선 좌측 끝 `left=0`(≥ -1e-9),
    `length < halfX*2`. 옛 구현이면 `centerX=0`, `left=-7.5`, `length=15`로 전부 실패한다.
  - 실제 주행 X를 왕복 전 구간(프레임 단위)에서 샘플링해 `minX`/`maxX`가 선 안에 들어오고,
    선이 코스보다 한 프레임 이동분(≈0.026 units) 이상 넓지 않은 것까지 값으로 확인.
  - 보스 x=4.2 발동 시 `centerX=(4.2-6.6)/2`, `length=10.8`이 중앙 발동본과 다른 값임을 확인.
  - `getB03ShuttleRunLaneGeometry(2, 2).length === 0.1` 하한 확인.
- `src/components/EnemyVisual.test.js` — `hasB03ShuttleRunVisualChanged` 값 판정 1건 추가
  - phase/laneZ/passIndex가 **완전히 같고** startX/endX만 다른 1차/2차 시전 쌍에서 `true`.
    옛 구현이면 `false`라 실패한다.
  - 보조(주 판정 아님): 컴포넌트가 `getB03ShuttleRunLaneGeometry(startX, endX)`를 쓰는지,
    옛 `args={[halfX * 2, 0.024, B03_SHUTTLE_LANE_WIDTH]}`가 되살아나지 않았는지 소스 확인.

## 건드리지 않은 확정 사양

속도 배수 3(`B03_SHUTTLE_SPEED_MULTIPLIER`), 피해 30%(`B03_SHUTTLE_PLAYER_DAMAGE_RATIO`),
왕복 2패스 후 stun, `animPhase: 'normal'` 걷기 애니메이션, 깜빡임 3주기와 그 `useFrame`
머티리얼 opacity 직접 조작, `getB03ShuttleRunX` / `advanceB03ShuttleRun` / `startB03ShuttleRun`
동작 — 전부 무변경. 순수 시각 수정이다.

## 실행한 명령과 결과

```text
# 기준선 (수정 전)
npx vitest run src/lib/b03ShuttleRun.test.js src/components/EnemyVisual.test.js
  → Test Files 2 passed (2) / Tests 43 passed (43)

# 수정 후 (완료 기준 명령)
npx vitest run src/lib/b03ShuttleRun.test.js src/components/EnemyVisual.test.js
  → Test Files 2 passed (2) / Tests 46 passed (46)

# 광범위 확인 (Enemy 계열)
npx vitest run src/lib/b03ShuttleRun.test.js src/components/EnemyVisual.test.js \
  src/components/Enemies.test.jsx src/components/EnemyChefBossSightExemption.test.js \
  src/components/EnemyMathTeacherSpecial.test.js src/components/PooledEnemyVisuals.test.js
  → Test Files 1 failed | 5 passed (6) / Tests 1 failed | 195 passed (196)

# RED 판별 검증 (공유 워크트리 무변경, scratchpad 스크립트로 실측)
node <scratchpad>/red-check.mjs
  course = [0, 6.6]
  OLD (arena-wide): centerX=0 length=15 left=-7.5 right=7.5 → 4개 단언 전부 FAIL
  NEW (course-only): centerX=3.3 length=6.6 left=0 right=6.6 → 4개 단언 전부 PASS
  OLD hasChanged(1차 시전, 2차 시전) = false (테스트 기대 true → FAIL)
```

## 확인 사실 / 추정 구분

- `[확인된 사실]` 위 명령 출력 그대로. 46개 통과(기준선 43 + 신규 3).
- `[확인된 사실]` `PooledEnemyVisuals.test.js:255`의 실패 1건은 이번 변경과 무관하다.
  `PooledEnemyVisuals.jsx`와 그 테스트 파일은 `git status`에서 clean이고, 이번 diff는
  `Enemy.jsx`(B03 예고선 부분) / `b03ShuttleRun.js` / 두 테스트 파일만 건드린다.
  실패 내용은 압축된 layer 소스에 대한 `toContain` 문자열 단언이다.
- `[확인된 사실]` RED 판별은 공유 워크트리 파일을 되돌리지 않고, 옛 공식을 스크립트에서
  재현해 신규 단언이 그 값을 실제로 거부하는지 수치로 확인한 것이다.
- `[추정/미검증]` 실제 브라우저에서 stage3 B03 전투를 돌려 화면으로 선 길이를 눈으로
  확인하지는 않았다. 판정은 위 순수함수 값과 좌표 계산까지다.

## 경계 준수

- `git checkout` / `git stash` / `git reset --hard` / `git commit` 실행 없음 (threemini는 Git 변형 권한 없음).
- 파일 통째 재작성 없음 — 기존 파일은 전부 Edit 부분 치환. 본 기록 md만 신규 생성.
- 타이틀 화면 파일, `GraphicsStudio.jsx` 무변경.

## 변경 파일

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/lib/b03ShuttleRun.js`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/components/Enemy.jsx`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/lib/b03ShuttleRun.test.js`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/components/EnemyVisual.test.js`
