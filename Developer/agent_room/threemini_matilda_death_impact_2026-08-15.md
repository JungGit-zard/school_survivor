# 마틸다 접촉 사망 임팩트 연출 구현 기록 (2026-08-15)

담당: `threemini` (Worker)
브랜치: `zombie_only`
변경 파일: `Developer/r3f_prototype/src/components/HUD.jsx`, `Developer/r3f_prototype/src/components/HUD.test.jsx`
커밋/푸시: 하지 않음 (Three_Mini Git mutation prohibition)

## 사용자 지시

> 마틸다와 부딪힐때 완전히 부딪히는 지점까지 보여준다음 효과음 넣으면서 화면흔들고 흑백으로 바꿔

## 이전 동작(문제)

마틸다 사망은 `HUD.jsx`에서 흑백 레이어를 `{ animation: 'none', opacity: 1 }`로 **접촉 프레임에 즉시 완전 흑백**으로 덮었다. 페이드조차 없어서 "부딪혔다"는 그림이 한 프레임도 남지 않았다. 화면 흔들림과 임팩트 효과음도 없었다.

## 새 타임라인

즉사 판정(`Enemy.jsx:894-895` → `killPlayer('matilda')`, `MATILDA_CONTACT_KILL_DELAY_MS = 0`)은 **접촉 프레임 그대로 유지**했다. 연출은 그 뒤에만 붙는다. `phase`가 이미 `gameover`라 시뮬레이션이 멈춰 있어 홀드 구간은 "정지된 충돌 장면"으로 보인다.

| 시각(ms) | 단계 | 무슨 일이 일어나는가 | 코드 |
|---:|---|---|---|
| 0 | 즉사 판정 | `hp: 0`, `phase: 'gameover'`, `deathCause: 'matilda'`, `playerDeath` SFX, 진동 | `useGameStore.js:282 killPlayer()` (변경 없음) |
| 0 | **임팩트 홀드 시작** | 흑백 레이어를 **아예 마운트하지 않는다**. 부딪힌 프레임이 컬러 그대로 보인다. 마틸다 대사는 기존대로 표시 | `matildaDeathStage = 'impact'` |
| 200 | **효과음 + 화면 흔들림** | `emitSfx({ id: 'matildaDeath', volume: 0.95 })` + `emitCriticalHitScreenShake(0, 0, { strong: true })` (140ms strong shake) | `MATILDA_DEATH_IMPACT_HOLD_MS` |
| 320 | **흑백 전환 시작** | 흑백 레이어 마운트, `gameoverGrayscaleFade` 480ms 페이드 | `MATILDA_DEATH_GRAYSCALE_DELAY_MS` |
| 800 | 완전 흑백 | `backdrop-filter: grayscale(1)`, `opacity: 1` 도달 | `MATILDA_DEATH_GRAYSCALE_FADE_MS = 480` |
| 1000 | 결과창 | `gameover-result-overlay` + 마틸다 사망 대사 | `GAMEOVER_TRANSITION_MS = 1000` (기존값 유지) |

접촉 → 결과창 총 **1000ms**로 상한 1.5초 안이다. 2026-08-14에 제거한 `MATILDA_DIALOGUE_MS(5000)` 추가 지연은 다시 넣지 않았다.

일반(비마틸다) 사망은 손대지 않았다. 접촉 즉시 `gameoverGrayscaleFade 1000ms` 페이드, 흔들림 없음, 임팩트 SFX 없음 — 기존 그대로다.

## 고른 SFX id와 이유

**`matildaDeath`** (`/sfx/enemies/matildaDeath.ogg`, 13,164 bytes, 레지스트리 89행). 신규 오디오 제작 없음.

- 레지스트리 "적 사망음" 계열의 **마틸다 전용 사망 스팅**이라 사망 순간의 음색으로 맞다.
- `Enemy.jsx:339`(`if (isMatilda) return 'matildaDeath'`)가 유일한 소비처인데, 마틸다는 죽지 않는 즉사 추격자(커밋 `169fd31`)라 **실제 플레이에서 한 번도 울리지 않는 자산**이다. 이 순간에 배정해도 기존 큐와 충돌하지 않는다.
- 탈락 후보: `matildaDash`·`matildaLaugh`는 추격 내내 반복 재생돼(`Enemy.jsx:62-64`) 임팩트로 안 들린다. `matildaCountdownEnd`는 등장 예고 스팅이라 의미가 어긋난다.
- `killPlayer()`가 t=0에 이미 내는 `playerDeath`와 200ms 간격이라 겹치지 않는다.

## 접근성 (reducedEffects)

흔들림 발화 직전에 `isCriticalScreenShakeReduced()`로 게이트한다.

```js
if (!isCriticalScreenShakeReduced()) emitCriticalHitScreenShake(0, 0, { strong: true })
```

`GameplayScreen.jsx:47`의 전체화면 흔들림 구독자는 자체 감축 게이트가 없고, `emitCriticalHitScreenShake`도 카메라 셰이크만 막고 구독자에게는 통지한다. 그래서 **발화 지점에서 막아야** `reducedEffects`/`prefers-reduced-motion`/히트 카메라 흔들림 끔 설정이 실제로 지켜진다. 이 경로에서도 효과음과 흑백 전환은 그대로 나간다.

## 회귀 테스트

`HUD.test.jsx`에 `matilda contact death impact presentation` 스위트 3건 추가. SFX는 `subscribeSfx`, 흔들림은 `subscribeWholeScreenCriticalShake`로 실제 이벤트를 관측한다(모킹 없음).

1. `holds the collision frame, then fires sfx and shake, then fades to grayscale` — 0ms/199ms에 SFX·흔들림·흑백 전부 없음 → 200ms에 `matildaDeath` + `strong: true` 흔들림 1회, 흑백은 아직 없음 → 320ms에 흑백 레이어 `gameoverGrayscaleFade 480ms` → 1000ms 결과창.
2. `skips the shake when reduced effects are enabled but still plays sfx and grayscale` — `document.documentElement.dataset.reducedEffects = 'true'`에서 흔들림 0회, SFX·흑백은 유지.
3. `does not shake or play the matilda sting on an ordinary zombie death` — `deathCause: 'zombie'`에서 흑백은 즉시 `gameoverGrayscaleFade 1000ms`, 흔들림 0회, `matildaDeath` 미발화.

기존 `shows Matilda death dialogue before the game over popup...` 테스트의 흑백 단언은 새 동작에 맞춰 갱신했다(즉시 `animation: 'none'` → 홀드 중 미마운트, 320ms 후 480ms 페이드). 결과창 타이밍 총합 1000ms는 그대로 검증한다.

## 실행한 명령과 실제 출력

### 1. 사전 baseline (변경 전)

```
$ npx vitest run src/components/HUD.test.jsx src/components/EnemyVisual.test.js
 Test Files  2 passed (2)
      Tests  61 passed (61)
   Duration  5.64s
```

### 2. 변경 후 — 요구 스위트 2종

```
$ npx vitest run src/components/HUD.test.jsx
 Test Files  1 passed (1)
      Tests  37 passed (37)
   Duration  5.43s

$ npx vitest run src/components/EnemyVisual.test.js
 Test Files  1 passed (1)
      Tests  27 passed (27)
   Duration  2.40s
```

HUD 34 → 37 (신규 3건). EnemyVisual 27 유지 — `Enemy.jsx`는 건드리지 않았다.

### 3. HUD 인접 회귀 스위트

```
$ npx vitest run src/components/deferredModuleIsolation.test.js \
    src/components/GameplayScreen.autoPause.test.jsx \
    src/components/HUD.devCheats.test.jsx src/components/HUD.dialogueVoice.test.js \
    src/components/HUD.questInventory.test.jsx src/components/resultCoinShopFlow.test.jsx \
    src/lib/i18nCoverage.test.js
 Test Files  2 failed | 5 passed (7)
      Tests  2 failed | 27 passed (29)
```

두 실패는 **사전존재**이며 이번 변경과 무관하다. 증거:

- `HUD.dialogueVoice.test.js > plays Animalese-style protagonist voice...` — `expect(source).toContain('STAGE1_INTRO_LINES[index]')` 실패. HEAD 원본을 추출해 확인:
  ```
  $ git show HEAD:Developer/r3f_prototype/src/components/HUD.jsx > <scratch>/HUD.head.jsx
  $ grep -c "STAGE1_INTRO_LINES\[index\]" <scratch>/HUD.head.jsx
  0
  ```
  HEAD 시점 `HUD.jsx`에도 그 문자열이 없다. 다른 에이전트의 `STAGE1_INTRO_LINES` → `STAGE1_INTRO_IDS` 개명으로 이미 깨져 있던 소스-grep 테스트다. 내 diff는 이 영역을 건드리지 않았다.
- `resultCoinShopFlow.test.jsx > lobby exposes stage, coin shop, and ranking entries` — Lobby가 `lobby-records-pending`("게임 불러오는 중…")을 렌더해 `입장하기`가 없다. 브리핑에 명시된 사전 파손 `firebaseProgress` 계열이다. 같은 파일에서 **HUD를 실제로 렌더하는 게임오버/스테이지클리어 테스트 2건은 통과**한다:
  ```
  $ npx vitest run src/components/resultCoinShopFlow.test.jsx --reporter=verbose
  × ... > lobby exposes stage, coin shop, and ranking entries 28ms
  ✓ ... > game over result exposes the coin shop entry 266ms
  ✓ ... > stage clear result exposes the coin shop entry 49ms
      Tests  1 failed | 2 passed (3)
  ```

### 4. CRLF 오염 확인

```
$ git diff --numstat -- .../HUD.jsx .../HUD.test.jsx
63	2	Developer/r3f_prototype/src/components/HUD.jsx
124	5	Developer/r3f_prototype/src/components/HUD.test.jsx

$ git diff --numstat --ignore-cr-at-eol -- .../HUD.jsx .../HUD.test.jsx
63	2	Developer/r3f_prototype/src/components/HUD.jsx
124	5	Developer/r3f_prototype/src/components/HUD.test.jsx
```

두 값이 동일 → 줄바꿈 오염 없음. Edit 도구 부분치환만 사용했다.

## 건드리지 않은 것

- `src/lib/stageConfig.js` (Advisor가 `MATILDA_SPAWN_SEC` 임시 변경 중), `App.jsx`, `firebaseStudio.js`, `stageObjectPlacements.js`, `package.json`, `scripts/assert-studio-game-sync-contract.mjs` — 다른 에이전트 미커밋 변경, 그대로 보존.
- `Enemy.jsx`, `useGameStore.js` — 즉사 판정 경로는 무변경.
- 타이틀(`TitleScene3D.jsx`, `frozenStudio.js`, `studioSnapshot.json`), `GraphicsStudio.jsx` — 무변경.
- 신규 오디오 파일 생성 없음. 포트 5173 dev 서버/keeper 무간섭. 커밋·푸시·checkout·stash 없음.

## 남은 검증 한계

jsdom 단위 테스트로 순서·타이밍·접근성 게이트를 확인했다. 실제 브라우저에서 "부딪힌 그림이 눈에 남는가"의 체감(홀드 200ms가 충분한가)은 실기 확인이 필요하며 이 작업에서는 수행하지 않았다. 체감이 짧으면 `MATILDA_DEATH_IMPACT_HOLD_MS`와 `MATILDA_DEATH_GRAYSCALE_DELAY_MS`만 올리면 되고, 총합 1.5초 상한 안에서 `GAMEOVER_TRANSITION_MS`까지 함께 조정한다.
