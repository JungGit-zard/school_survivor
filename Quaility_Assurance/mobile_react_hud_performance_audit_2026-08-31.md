# React HUD / 모바일 UI 성능 감사 — 2026-08-31

대상 작업: `t_8635e105` / `react-hud-mobile-performance-audit`
범위: 읽기 전용 코드/히스토리 감사. 코드, UI, title, Firebase, git 상태는 변경하지 않았다. 산출물로 이 문서만 작성했다.
대상 HEAD: `3d759c5c` (2026-08-30, `Nerf Starlink cadence and rotate LineDraw`)
브랜치 확인: `zombie_only...origin/zombie_only`

## 요약 판정

현재 React HUD는 과거의 가장 큰 위험이었던 "프레임마다 React/Zustand setState" 구조는 피하고 있다. `Game.jsx`가 런타임 시간을 mutable ref 계층에서 진행하고, `PUBLISH_INTERVAL_MS = 100`으로 10Hz만 Zustand `elapsedMs`에 발행하는 구조라서 60fps 전체를 React로 끌어올리지는 않는다.

다만 Galaxy A24급 모바일에서 React/HUD가 여전히 프레임 예산을 먹을 수 있는 주된 의심점은 다음 순서다.

1. HUD 단일 컴포넌트가 `elapsedMs` 10Hz 발행마다 너무 넓은 구독/렌더 트리를 함께 다시 렌더한다.
2. 진행 중 HUD에서 매 100ms마다 timer, live score, HP/XP width inline style, 경고 계산, MissionTracker prop 전달이 한 컴포넌트 안에서 동시 재평가된다.
3. 특정 순간(저체력/보스/마틸다/게임오버)의 full-screen CSS animation, backdrop-filter, drop-shadow/filter가 모바일 GPU/합성 비용을 키울 수 있다.
4. 퀘스트/미션 UI는 useMemo로 묶였지만, 상위 HUD rerender cadence 때문에 hidden 상태에서도 조건 평가/prop 전달은 계속 일어난다.
5. 조이스틱은 RAF throttle이 있어 양호하지만, active touch 중 React state가 매 프레임 갱신되므로 전투 부하와 겹칠 때 별도 계측이 필요하다.

## 확인한 안전한 구조(낮은 위험)

- `Developer/r3f_prototype/src/lib/gameRuntimeTime.js:1-44`
  - `PUBLISH_INTERVAL_MS = 100`.
  - `runtimeTime.elapsedMs`는 React 밖 mutable 상태.
  - `isRuntimeTimePublishDue()`가 100ms 미만 발행을 막는다.
- `Developer/r3f_prototype/src/components/Game.jsx:80-84`
  - commit/date suspect: `d2fab9a74` / 2026-08-21.
  - `window.setInterval(publishRuntimeElapsedMs, PUBLISH_INTERVAL_MS)`로 playing 중 10Hz만 publish.
  - cleanup에서 `window.clearInterval(intervalId)` 수행. 타이머 누수 가능성은 낮다.
- `Developer/r3f_prototype/src/store/useGameStore.js:314-321`
  - `publishRuntimeElapsedMs()`가 due가 아니면 `set()`하지 않고 false 반환.
  - due일 때만 `set({ elapsedMs })`.
- `Developer/r3f_prototype/src/components/GameplayScreen.jsx:27-47`
  - visibility/pagehide listener cleanup이 있다.
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx:42-53, 141-155`
  - touchmove view publish가 `requestAnimationFrame`으로 throttle되고, touch listener cleanup 및 input reset이 있다.

## 랭크된 falsifiable hypotheses

### H1 / 높음 — HUD 전체가 10Hz로 재렌더되는 구조가 모바일 React 비용의 중심일 가능성

증거 위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:722-788`
- commit/date suspect: 주요 구독 구조 `3ba97ada3` / 2026-08-04, 이후 `missionProgress` 추가 `b7518b12c` / 2026-08-15, level-up/교체 관련 상태 추가 `485bcc282`, `67b4d9822`, `d00b5c4a2` / 2026-08-22~30.
- `elapsed: s.elapsedMs`가 같은 selector 안에 있고, `player`, `weapons`, `questProgress`, `missionProgress`, modal/gameover/levelup 관련 상태와 action들을 한 번에 구독한다.
- `Game.jsx:80-84`와 `gameRuntimeTime.js:1` 때문에 playing 중 정상적으로 10Hz 발행된다.

왜 성능 후보인가:
- `elapsedMs`가 100ms마다 바뀌면 HUD 함수 전체가 rerender된다.
- useMemo가 일부 계산을 막아도 JSX reconcile, inline style 객체 생성, 조건부 트리 평가, 하위 `MissionTracker` 호출은 상위 render path를 탄다.
- Galaxy A24에서는 WebGL/Rapier/적 풀링 작업과 같은 프레임에 10Hz React commit이 겹칠 때 긴 프레임이 생길 수 있다.

반증/확인 계측:
- React Profiler로 `HUD` commit count와 actualDuration을 60초 전투 중 측정한다.
- 기준: `HUD` commit이 약 10/sec이면 구조상 정상. actualDuration p95가 2ms 미만이면 우선순위 하향, 4ms 이상이면 분리 필요.
- Chrome Performance에서 `Scripting` 긴 작업과 `publishRuntimeElapsedMs -> set -> HUD render` call stack이 같이 보이는지 확인한다.

권장 실험:
- 코드 변경 전 임시 계측만으로 `HUD`를 timer/live-score top strip과 modal/quest/mission/weapon icon 영역으로 논리 분리했을 때 Profiler 예상 actualDuration을 비교한다.
- 실제 수정 후보는 `elapsedMs` 구독을 `HudClockScore` 같은 작은 memoized 컴포넌트로 격리하고, 나머지 HUD는 phase/player/quest 등 낮은 빈도 selector만 구독하게 나누는 방식이다.

### H2 / 높음 — 10Hz마다 live score와 숫자/width UI가 갱신되어 layout/paint를 유발할 가능성

증거 위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:790-799` liveScore 계산.
- `Developer/r3f_prototype/src/components/HUD.jsx:1314-1323` timer/live score 렌더.
- `Developer/r3f_prototype/src/components/HUD.jsx:1326-1342` HP/XP bar width inline style.
- commit/date suspect: live score block `f955342f4` / 2026-08-23, HP/XP 기본 구조 `3ba97ada3` / 2026-08-04, XP test id `3d3951f7f` / 2026-08-22.

왜 성능 후보인가:
- timer와 live score는 `elapsedMs`에 따라 10Hz로 바뀐다.
- HP/XP width style은 player가 변하지 않아도 HUD rerender 때 새 객체로 만들어진다.
- width 변경은 layout/paint 경로를 탈 수 있다. 특히 XP/HP bar가 absolute/fixed overlay 안에 있어도 폭 계산은 DOM style update 후보가 된다.

반증/확인 계측:
- DevTools Performance에서 60초 전투 중 `Layout`/`Paint` 이벤트가 100ms 주기로 반복되는지 확인한다.
- React Profiler에서 `HUD` actualDuration 대비 브라우저 Rendering/Paint 비용이 큰지 비교한다.
- live score를 초 단위로만 바꾸는 임시 실험을 했을 때 frame time p95가 내려가면 이 가설 강화.

권장 실험:
- `runClock`/`liveScore`를 초 단위 selector로 분리하거나, score 표시를 250~500ms cadence로 낮추는 A/B 프로파일.
- HP/XP fill은 width 대신 transform scaleX로 바꾸는 실험도 가능하지만 UI 변경이므로 별도 카드/리뷰가 필요하다.

### H3 / 중상 — full-screen overlay/backdrop-filter/animated radial gradient가 특정 순간 모바일 GPU 비용을 키울 가능성

증거 위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:1180-1186` `hpBlink`, `vignettePulse`, `gameoverGrayscaleFade` keyframes.
- `Developer/r3f_prototype/src/components/HUD.jsx:1242-1247` 저체력 full-screen radial-gradient + infinite animation.
- `Developer/r3f_prototype/src/components/HUD.jsx:2228-2245` full-screen `backdropFilter: grayscale(1)` / `WebkitBackdropFilter`.
- commit/date suspect: 일반 grayscale/vignette `3ba97ada3` / 2026-08-04, Matilda grayscale `202fa7e40` / 2026-08-15.

왜 성능 후보인가:
- `backdrop-filter`는 WebView/Chrome Android에서 full-screen 합성 비용이 크다.
- 저체력 비네트는 full-screen radial gradient opacity animation이라 GPU fill-rate가 낮은 기기에서 전투 부하와 겹치면 stutter 후보다.
- 게임오버는 지속 플레이 구간은 아니지만 마틸다 사망/결과 전환에서 체감 끊김 신고와 연결될 수 있다.

반증/확인 계측:
- Android WebView remote debugging에서 low HP 상태와 normal HP 상태를 각각 30초 기록해 GPU raster/paint time 차이를 비교한다.
- Performance capture에서 `Paint`, `Composite Layers`, `Update Layer Tree`가 low HP 진입 후 증가하는지 확인한다.
- CSS 임시 override로 `backdrop-filter: none`, vignette animation off를 적용한 뒤 같은 장면 FPS/p95 frame time을 비교한다.

권장 실험:
- reduced effects 또는 mobile-low preset에서 low HP 비네트 animation을 정지 opacity로 낮추는 옵션 실험.
- gameover grayscale은 canvas 후처리/정적 overlay 대체 가능성을 threemini와 협의.

### H4 / 중간 — MissionTracker/mission summary가 HUD와 같은 cadence에 묶여 hidden UI work 후보가 된다

증거 위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:881-886` `Object.values(MISSION_BY_ID).map(...getMissionStatus...)` mission summary.
- `Developer/r3f_prototype/src/components/HUD.jsx:1403-1406` `MissionTracker`는 hidden이어도 컴포넌트 호출/prop 전달은 상위 render path에 존재.
- `Developer/r3f_prototype/src/components/MissionTracker.jsx:6-16` pinned map/filter/slice 및 visible map.
- commit/date suspect: `b7518b12c` / 2026-08-15.

왜 성능 후보인가:
- mission summary는 `useMemo([missionProgress])`라 elapsed-only rerender에서는 재계산되지 않는다. 이 점은 안전하다.
- 하지만 `MissionTracker`는 memoized component가 아니고 상위 HUD가 10Hz로 rerender될 때 hidden prop 계산과 function 호출 대상이 된다.
- pinned mission 수는 작지만, mission UI가 추가 확장되면 fanout 지점이 된다.

반증/확인 계측:
- React Profiler에서 `MissionTracker` render count가 `HUD`와 같은지, hidden=true 상태에서도 actualDuration이 잡히는지 확인한다.
- `React.memo(MissionTracker)` 임시 patch를 로컬 실험으로 적용해 commit duration 차이를 비교한다.

권장 실험:
- `MissionTracker`를 `React.memo`로 감싸거나, HUD가 아니라 자체 selector 구독형으로 분리하는 후보를 별도 구현 카드에서 검토한다.

### H5 / 중간 — portal objective 250ms setState는 의도적으로 낮은 빈도지만 portal-open 후 추가 React cadence를 만든다

증거 위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:1056-1066`
- commit/date suspect: `3ba97ada3` / 2026-08-04.
- `setInterval(refreshPortalObjective, 250)`로 portal 활성/playing 중 `setPortalObjective(getPortalObjective(playerPos, portalTarget))` 실행.

왜 성능 후보인가:
- portal 활성 후에는 `elapsedMs` 10Hz HUD rerender에 더해 portal objective setState가 4Hz로 추가된다.
- `getPortalObjective` 값이 이전과 같아도 새 객체를 setState하면 React가 rerender할 수 있다.
- 포털 구간은 이미 적/무기 수가 많아진 후반이므로 추가 4Hz가 체감될 수 있다.

반증/확인 계측:
- portal open 전/후 30초 Profiler commit count 비교.
- `setPortalObjective(prev => shallowEqual(prev,next) ? prev : next)` 임시 실험 시 commit count가 줄면 가설 강화.

권장 실험:
- 표시 문자열(distance bucket/arrow)이 바뀔 때만 setState하는 guard를 별도 수정 후보로 둔다.

### H6 / 중간 — 모바일 조이스틱은 구조상 양호하지만 active touch 중 React state가 RAF마다 갱신된다

증거 위치:
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx:42-53` RAF throttle.
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx:103-128` touchmove 처리 및 `publishView`.
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx:141-155` listener cleanup.
- commit/date suspect: 별도 blame은 이번 감사에서 실행하지 않았으나 현재 구조상 leak은 낮다.

왜 성능 후보인가:
- move 중 thumb 위치 표시를 React `setView`로 갱신한다. throttle되어도 active drag 중 최대 60Hz render 후보가 된다.
- joystick DOM은 작지만 전투 입력은 항상 부하가 큰 순간과 겹친다.

반증/확인 계측:
- Performance capture에서 active touch 유지 20초와 no-touch 20초를 비교한다.
- `VirtualJoystick` actualDuration이 p95 0.5ms 미만이면 우선순위 하향.

권장 실험:
- 필요한 경우 thumb DOM ref style transform 직접 갱신 방식으로 React render를 start/end에만 쓰는 실험. 단, 현재 테스트가 listener cleanup/visible 상태를 커버하므로 수정 시 테스트 갱신 필요.

## timer/listener leak 감사 결과

- `Game.jsx:80-84` runtime publish interval: cleanup 있음.
- `HUD.jsx:1056-1066` portal objective interval: cleanup 있음.
- `HUD.jsx:1175-1208` style injection: cleanup 있음. StrictMode 대응으로 기존 `#hud-keyframes` remove 후 append한다.
- `HUD.jsx:1226-1237` keydown listener: cleanup 있음.
- `GameplayScreen.jsx:27-47` visibility/pagehide listener: cleanup 있음.
- `GameplayScreen.jsx:49-63` critical shake animation subscription cleanup 및 animation cancel 있음.
- `VirtualJoystick.jsx:141-155` touch listener cleanup 있음.

이번 정적 감사에서는 명확한 타이머/listener 누수 증거는 발견하지 못했다. 성능 위험은 누수보다는 rerender cadence와 paint/composite 비용 쪽이다.

## 실행 검증

실행 명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm.cmd test -- src/components/HUD.test.jsx src/components/HUD.questInventory.test.jsx src/components/VirtualJoystick.test.jsx
```

결과:
- pretest gate: branch guard OK, legacy B02 gate OK, dialogue store gate OK, studio-game sync source contract OK.
- Vitest: 2 files passed, 1 file failed.
- 통과: `src/components/VirtualJoystick.test.jsx` 7 tests, `src/components/HUD.test.jsx` 53 tests.
- 실패: `src/components/HUD.questInventory.test.jsx` 1 test failed, total 69 passed / 70.
- 실패 내용: `renders the quest bag next to pause and opens and closes its paused panel`에서 `pauseButton.nextElementSibling`이 quest button일 것을 기대하지만 현재 DOM에서는 `null`. 현재 HUD는 `top-left-controls` 안에 quest bag을 두고 `bottom-right-pause` 버튼은 별도 하단 우측에 둔다(`HUD.jsx:1360-1399`). 즉, 성능 감사와 직접 관련된 실패라기보다 기존 UI 배치 변경에 테스트 기대가 뒤처진 신호로 보인다.
- stderr 공통 경고: jsdom act 경고 다수, `WARNING: Multiple instances of Three.js being imported.`, React style shorthand/non-shorthand border warning 1회.

## 권장 Profiler/Performance 계측 시나리오

1. Galaxy A24 또는 동급 Android WebView/Chrome remote debugging 연결.
2. 동일 스테이지/동일 seed에 가깝게 60초씩 기록:
   - A: normal HP, portal closed, joystick idle.
   - B: normal HP, joystick active continuous drag.
   - C: low HP vignette active.
   - D: portal open 후 30초.
   - E: boss/matilda warning 5초 전후.
3. React Profiler 지표:
   - `HUD` commit/sec, actualDuration p50/p95/max.
   - `MissionTracker`, `VirtualJoystick`, `UpgradeIcon`, `WeaponMiniIcon` render count.
4. Chrome Performance 지표:
   - frame time p95/max.
   - Main thread Scripting/Layout/Paint/Composite 비율.
   - `publishRuntimeElapsedMs`, `setPortalObjective`, joystick `setView` call stack 여부.
5. 판정 기준:
   - HUD actualDuration p95 >= 4ms 또는 commit이 긴 프레임과 상관되면 H1/H2 우선 수정.
   - low HP에서 Paint/Composite가 2배 이상 증가하면 H3 우선 수정.
   - portal open 후 commit/sec가 10Hz에서 14Hz 근처로 증가하고 frame p95도 상승하면 H5 수정.

## 수정 후보 우선순위(이번 작업에서는 미수정)

1. HUD 구독/컴포넌트 분리: timer/live score 전용 small component와 나머지 HUD 분리.
2. portal objective setState guard: arrow/distance bucket이 실제 변경될 때만 state update.
3. `MissionTracker` memoization 또는 자체 store selector 구독화.
4. low HP/mobile-low preset에서 full-screen vignette animation 비용 낮추기.
5. 조이스틱 thumb 위치를 React state가 아닌 ref style mutation으로 내리는 실험.

## 최종 결론

가장 먼저 검증할 가설은 `HUD.jsx:722-788`의 넓은 Zustand selector와 `elapsedMs` 10Hz 발행이 결합되어 HUD 전체를 주기적으로 다시 렌더한다는 점이다. 누수 증거는 낮고, 이미 60Hz React 업데이트는 피하고 있으므로 즉시 대형 리팩터보다 Profiler로 HUD actualDuration/commit count를 잡은 뒤 timer/live-score 분리부터 작은 수정으로 접근하는 것이 안전하다.
