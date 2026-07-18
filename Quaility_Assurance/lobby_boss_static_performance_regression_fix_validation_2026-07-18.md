# Lobby boss static performance regression fix QA — 2026-07-18

## 판정

PASS — 2026-07-18 17:52 재검증에서 이전 FAIL 원인이던 `GraphicsStudioPreview.jsx`의 `frozen={focusedPartKeys.length > 0}` 전달 경로가 제거된 것을 확인했고, focused regression suite 88/88 및 추가 Graphics Studio/StageBossPreview suite 44/44, production build가 모두 통과했다.

> 이 문서의 중간 FAIL 기록은 1차 검증 당시의 실제 실패 이력으로 보존한다. 최종 판정은 아래 "재검증 결과 — 2026-07-18 17:52"를 기준으로 PASS다.

## 검증 범위

- 작업 트리: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- 브랜치/HEAD: `zombie_only` / `d4e08454a6fa34ecf24ea3d58555af8ceb78688a`
- 주요 검토 파일:
  - `Developer/r3f_prototype/src/components/StageBossPreview.jsx`
  - `Developer/r3f_prototype/src/components/Enemy.jsx`
  - `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
  - `Developer/r3f_prototype/src/components/Lobby.jsx`
  - `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
  - 관련 test 파일들

## 코드 검토 증거

### PASS 관찰

- `StageBossPreview.jsx:213`에서 `const staticPose = !interactive`로 비상호작용 로비 프리뷰만 정적 포즈로 설정한다.
- `StageBossPreview.jsx:162`, `:296`에서 `staticPose`를 `EnemyVisual`까지 전달한다.
- `Enemy.jsx:376`, `:386`에서 `staticPose`를 `ZombieMesh`에 전달한다.
- `ZombieMesh.jsx:677`에서 `useFrame((state, delta) => {` 직후 `if (staticPose) return`이 `const pt = p.current`보다 먼저 실행되어 파트별 애니메이션 계산 전에 빠진다.
- `StageBossPreview.test.jsx`의 신규 테스트가 비상호작용/entry motion에서는 `staticPose=true`, interactive Graphics Studio preview에서는 `staticPose=false`를 확인한다.
- `Lobby.jsx:76`, `:101`, `:202`에서 ambient drift는 `ambientDriftRef.current.style.transform` 직접 갱신으로 처리되며 이전 `setAmbientPosition` state 경로는 제거됐다.

### FAIL 관찰

- `GraphicsStudioPreview.jsx:712`에 `<RenderPreviewItem item={item} frozen={focusedPartKeys.length > 0} />`가 존재한다.
- `GraphicsStudioPreview.test.js:160-171`의 "does not forward the old frozen/rest workaround through the preview tree" 테스트가 이 문자열을 금지하고 있어 실패한다.
- 같은 파일의 spawnSmoke 관련 테스트도 동일 금지 문자열 때문에 실패한다.

## 실행 명령 및 결과

### Focused tests

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- StageBossPreview.test.jsx Lobby.test.jsx GraphicsStudioPreview.test.js EnemyVisual.test.js ZombieMesh.test.js
```

결과:

- `StageBossPreview.test.jsx`: 17 tests PASS
- `Lobby.test.jsx`: PASS (전체 focused suite 집계 기준)
- `EnemyVisual.test.js`: 11 tests PASS
- `ZombieMesh.test.js`: 23 tests PASS
- `GraphicsStudioPreview.test.js`: 18 tests 중 2 FAIL
- 전체: 5 files 중 1 failed, 88 tests 중 2 failed / 86 passed
- 실패 테스트:
  - `previews the runtime zombie spawn billboard in the VFX studio`
  - `does not forward the old frozen/rest workaround through the preview tree`

### 추가 Graphics Studio / duplicate StageBossPreview tests

명령:

```bash
npm test -- StageBossPreview.test.js GraphicsStudio.test.jsx
```

결과:

- Test Files: 3 passed
- Tests: 44 passed
- 비고: React act 경고는 기존 test environment 경고로 보이며 fail은 발생하지 않았다.

### Production build

명령:

```bash
npm run build
```

결과:

- branch guard PASS
- legacy source/artifact gate PASS
- Vite production build PASS (`✓ built in 521ms`)
- postbuild artifact gate PASS
- 비고: vendor-three 등 500 kB 초과 chunk 경고가 있었지만 build exit code는 0이다.

## 요구사항별 판정

| 요구사항 | 판정 | 근거 |
| --- | --- | --- |
| 비상호작용 로비 프리뷰가 ZombieMesh에 lobby-only staticPose 또는 동등 gate 전달 | PASS | `StageBossPreview.jsx:213`, `:296`; `Enemy.jsx:386`; StageBossPreview 신규 테스트 PASS |
| entry/touch token 동안에도 내부 보스 mesh static 유지 | PASS | `staticPose = !interactive`가 motion token과 독립; `motionToken={1}` 테스트 PASS |
| gate가 per-part useFrame animation 계산보다 먼저 return | PASS | `ZombieMesh.jsx:677`의 early return이 `const pt = p.current`보다 앞에 있음; ZombieMesh test PASS |
| interactive Graphics Studio는 animated 유지 | PASS/부분 | `interactive`이면 `staticPose=false`; StageBossPreview interactive 테스트 PASS. 단, 별도 GraphicsStudioPreview focused suite가 old frozen 경로로 FAIL |
| old frozen/rest-capture/userData reset workaround 미재도입 | FAIL | `GraphicsStudioPreview.jsx:712`에 금지된 `frozen={focusedPartKeys.length > 0}` 존재; GraphicsStudioPreview test 2건 FAIL |
| ambient drift가 React setState 없이 DOM transform ref로 변경되고 StageBossPreview rerender 없음 | PASS | `Lobby.jsx` ref 기반 갱신, Lobby ambient rerender 테스트 PASS |
| 카드 레이아웃/프레이밍/락 모델/Studio Apply/audio/gameplay animation 미변경 | 부분 검증 | focused tests와 build는 대체로 PASS이나, 작업 트리에 다수의 다른 변경이 섞여 있어 본 카드 범위 밖 변경까지 릴리스 가능으로 검증하지는 않음 |

## Blockers

1. `GraphicsStudioPreview.test.js` 2건 실패. 현재 상태는 이 QA 카드의 완료 기준을 만족하지 않는다.
2. `GraphicsStudioPreview.jsx:712`의 `frozen={focusedPartKeys.length > 0}` 경로가 old workaround 금지 조건과 직접 충돌한다.
3. 작업 트리에 로비 lock/stage card, player, stage config 등 본 카드 외 변경이 다수 섞여 있어, 전체 릴리스 안전성은 별도 통합 검증이 필요하다.

## Implementer repro steps

1. `cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`
2. `npm test -- GraphicsStudioPreview.test.js`
3. `GraphicsStudioPreview.test.js:160-171` 실패 확인
4. `grep -n "frozen={focusedPartKeys.length > 0}" src/components/GraphicsStudioPreview.jsx`로 금지 경로 확인
5. ZombieMesh의 `staticPose` early return 방식은 유지하고, Graphics Studio interactive animation/Apply/part focus 계약을 깨지 않는 방식으로 old frozen 전달 경로를 제거 또는 정책에 맞게 분리

## 재검증 결과 — 2026-07-18 17:52

### 재검토 범위

- 작업 트리: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- 실행 위치: `Developer/r3f_prototype`
- 브랜치/HEAD: `zombie_only` / `d4e08454a6fa34ecf24ea3d58555af8ceb78688a`
- QA 기록 갱신 파일: `Quaility_Assurance/lobby_boss_static_performance_regression_fix_validation_2026-07-18.md`

### 코드 재검토 증거

- PASS: `GraphicsStudioPreview.jsx:710-712`는 현재 `<RenderPreviewItem item={item} />`만 렌더하며 이전 실패 원인이던 `frozen={focusedPartKeys.length > 0}` 전달이 없다.
- PASS: 정적 검색에서 `GraphicsStudioPreview.jsx` 내 금지 문자열 `frozen={focusedPartKeys.length > 0}`는 0건이다.
- PASS: `StageBossPreview.jsx:213`은 `const staticPose = !interactive`를 유지한다.
- PASS: `StageBossPreview.jsx:162`, `:296`은 `staticPose`를 `EnemyVisual`로 전달한다.
- PASS: `Enemy.jsx:376`, `:386`은 `staticPose`를 `ZombieMesh`로 전달한다.
- PASS: `ZombieMesh.jsx:676-678`은 `useFrame((state, delta) => {` 직후 `if (staticPose) return`으로 빠지며, `const pt = p.current` 및 파트별 애니메이션 계산보다 앞선다.
- PASS: `Lobby.jsx:76`, `:101-105`, `:202`는 ambient drift를 `ambientDriftRef.current.style.transform` 직접 갱신으로 처리하고, `setAmbientPosition` 문자열은 현재 관련 파일에서 0건이다.
- 관찰: `GraphicsStudioPreview.jsx`와 `ZombieMesh.jsx`에는 Studio part 식별/포커스용 `userData` 경로가 존재하지만, 이번 금지 대상인 old frozen/rest-capture workaround 재도입 증거로 보이는 `frozen={focusedPartKeys.length > 0}` 경로는 없다.

### 실행 명령 및 결과

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- StageBossPreview.test.jsx Lobby.test.jsx GraphicsStudioPreview.test.js EnemyVisual.test.js ZombieMesh.test.js
```

결과:

- branch guard PASS
- legacy B02 source gate PASS
- Test Files: 5 passed / 5
- Tests: 88 passed / 88
- 이전 실패 파일 `GraphicsStudioPreview.test.js`: 18 passed / 18
- 비고: React act 및 R3F 태그 casing 관련 stderr 경고가 출력됐지만 exit code는 0이고 실패 테스트는 없다.

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- StageBossPreview.test.js GraphicsStudio.test.jsx
```

결과:

- branch guard PASS
- legacy B02 source gate PASS
- Test Files: 3 passed / 3
- Tests: 44 passed / 44
- 비고: React act 경고와 `Multiple instances of Three.js being imported` 경고가 출력됐지만 exit code는 0이다.

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run build
```

결과:

- branch guard PASS
- legacy B02 source gate PASS
- Vite production build PASS (`✓ built in 666ms`)
- postbuild legacy B02 artifact gate PASS (`Legacy B02 artifact gate passed (dist).`)
- 비고: `vendor-three` 등 500 kB 초과 chunk 경고가 출력됐지만 build exit code는 0이다.

### 요구사항별 최종 판정

| 요구사항 | 최종 판정 | 근거 |
| --- | --- | --- |
| 비상호작용 로비 프리뷰가 ZombieMesh에 lobby-only staticPose 또는 동등 gate 전달 | PASS | `StageBossPreview.jsx:213`, `:162`, `:296`; `Enemy.jsx:386`; focused tests PASS |
| entry/touch token 동안에도 내부 보스 mesh static 유지 | PASS | `staticPose = !interactive`가 motion token과 독립; StageBossPreview focused tests PASS |
| gate가 per-part useFrame animation 계산보다 먼저 return | PASS | `ZombieMesh.jsx:676-678`; ZombieMesh test PASS |
| interactive Graphics Studio는 animated 유지 | PASS | `interactive`이면 `staticPose=false`; StageBossPreview interactive test 및 GraphicsStudioPreview focused suite PASS |
| old frozen/rest-capture/userData reset workaround 미재도입 | PASS | 이전 금지 경로 `frozen={focusedPartKeys.length > 0}` 제거 확인; `GraphicsStudioPreview.test.js` 18/18 PASS |
| ambient drift가 React setState 없이 DOM transform ref로 변경되고 StageBossPreview rerender 없음 | PASS | `Lobby.jsx` ref 직접 갱신; Lobby ambient rerender test PASS |
| 카드 레이아웃/프레이밍/락 모델/Studio Apply state/audio/gameplay animation 미변경 | PASS(테스트 범위 내) | focused suite 88/88, 추가 Studio suite 44/44, production build PASS. 다만 작업 트리에 본 카드 외 변경이 다수 있어 전체 릴리스 안전성은 별도 통합 QA 범위다. |

### Blockers

- 없음 — 이 카드의 focused regression gate 기준으로는 PASS.

### Observations / Risk

- 작업 트리에 로비 lock/stage card, player, stage config 등 본 카드 외 변경이 다수 섞여 있다. 이번 QA는 요청된 lobby boss static performance regression fix 범위만 통과로 판정하며, 전체 릴리스 승인이나 AAB 시각 패리티까지 검증한 것은 아니다.
- 테스트 stderr에 React act 경고, R3F DOM 태그 casing 경고, Three.js multiple import 경고가 남아 있다. 현 시점에서는 실패로 이어지지 않았으나 test environment 품질 부채로 추적 가능하다.

## 최종 QA 결론

PASS — 이전 FAIL 원인이던 GraphicsStudioPreview old frozen 전달 경로가 제거됐고, StageBossPreview/Lobby/GraphicsStudioPreview/EnemyVisual/ZombieMesh focused tests 88/88, 추가 StageBossPreview/GraphicsStudio tests 44/44, production build가 모두 통과했다. 검증하지 않은 AAB/실기기 시각 패리티나 본 카드 외 작업 트리 변경은 PASS 범위에 포함하지 않는다.
