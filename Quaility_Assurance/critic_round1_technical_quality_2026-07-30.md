# 1차 기술 품질·출시 신뢰도 비평 — 2026-07-30

## 판정 범위와 증거 수준

- 역할: 런타임 신뢰성, 프레임 루프, 풀/인스턴싱, 타깃 탐색, 회귀 테스트, 번들, 출시 신뢰도 중심의 QA 비평이다. 게임 코드, Firebase, Graphics Studio 값은 변경하지 않았다.
- 작업 시작 시 브랜치는 `zombie_only`, HEAD는 `ba8b490c0ef79065a30c8093514a62648ecce42a`였다. 작업 트리에 있던 다른 사람의 변경과 미추적 파일은 읽기만 했고 수정·삭제하지 않았다.
- 직접 실행(현재 작업 트리): `Developer/r3f_prototype`에서 `npm test`는 **168 files / 1,447 tests 통과**(46.51초), `npm run build`는 통과했다. 따라서 전달받은 직전 기준선 `167 files / 1,445 tests`는 현재 미추적 `src/lib/gameplaySoak.js/.test.js`가 포함된 뒤의 상태와 다르다.
- 직접 빌드의 `vendor-three`는 **2,796.16 kB, gzip 965.62 kB**이며 Vite의 500 kB 초과 경고가 재현됐다. 전달받은 약 2.80 MB / gzip 약 966 kB와 일치한다.
- 이번 `npm test` 표준 출력에는 React `act`/deprecated `act`, multiple Three instances, DOM 내부 `mesh` 경고가 나타나지 않았다. 즉 이 경고들의 현재 재현 여부는 **미확정**이다. 다만 테스트가 node 환경(`vite.config.js:77-81`)이고 R3F/Rapier 실 렌더를 대체하는 경로가 있어, 경고가 없다는 사실을 실기기·Canvas 신뢰성 통과로 해석할 수는 없다.
- 현재 미추적 `src/lib/gameplaySoak.js/.test.js`는 `node --check src/lib/gameplaySoak.js`를 통과했고 UTF-8 한국어 주석도 정상적으로 읽혔다. 문법/인코딩 손상은 발견하지 못했다. 단, 이 하네스는 Canvas, WebGL, 실제 Rapier step을 마운트하지 않고 모듈을 직접 호출하므로 렌더·물리 통합 soak의 증거는 아니다(`gameplaySoak.js:286-500`).
- 기존 AAB v22 문서는 소스 SHA `748012...`의 로컬 무결성만 통과로 기록하며, Android 기기/AVD WebView·입력·게임플레이 검증은 No-Go로 남긴다(`Quaility_Assurance/aab_v22_release_validation_2026-07-27.md:3-6, 35-40`). 현재 HEAD와도 다르므로 현재 소스의 출시 승인 증거가 아니다.

## 7개 범주 점수

8점 이상은 직접 현재 런타임 증거가 없으면 부여하지 않았다. 가중치는 출시 신뢰도를 우선해 성능·안정성에 가장 크게 두었다.

| 범주 | 점수 /10 | 가중치 | 근거와 감점 |
|---|---:|---:|---|
| 1. 시각 가독성·아트 디렉션 | 6.0 | 8% | 고정 200슬롯 인스턴스 렌더, 외곽선, 체력바 tier가 구현돼 있다(`ZombieInstanceLayer.jsx:72-90, 140-152`). 그러나 현행 전투의 실제 화면 증거가 없어 밀집 상태 가독성은 확인되지 않았다. |
| 2. 핵심 전투 루프·게임 감각 | 5.5 | 22% | 일반 적은 풀 step, 공간 그리드, generation 핸들로 동작하고(`Enemies.jsx:1169-1206`, `enemySimulation.js:484-510`, `weaponTargeting.js:281-300`), 스폰도 RAF당 3마리로 분산한다(`Enemies.jsx:803-860`). 그러나 실제 R3F/Rapier 프레임에서 적·투사체·보스가 함께 동작하는 플레이 증거가 없다. |
| 3. 성장·밸런스 | 5.0 | 13% | 웨이브·스폰·업그레이드 상태를 일정 부분 검증하는 새 soak은 있으나, 60 Hz 단일 패턴과 직접 호출에 그친다(`gameplaySoak.js:220-500`). 실제 240초 완주, 카드 분포, 실패 원인, 프레임률별 결과의 재현 증거가 없다. |
| 4. UI·모바일·접근성 | 4.5 | 12% | 터치 취소/phase/unmount 입력 초기화는 견고하다(`VirtualJoystick.jsx:61-155`). 그러나 320px HUD·레벨업·모달 키보드 및 Android 기기 검증 부재는 별도 UI 비평의 P0/P1과 동일한 출시 위험이다. |
| 5. 오디오·피드백 | 4.5 | 6% | 피격·사망 SFX와 숫자/VFX 호출은 풀 이벤트 flush에 연결된다(`Enemies.jsx:824-859, 924-932`). 실제 다발 전투 음향, background/pause/결과 전환은 현재 기기에서 청취·측정되지 않았다. |
| 6. 성능·안정성 | 4.0 | 30% | typed-array 200 적 풀과 32 적 투사체 풀, spatial grid, InstancedMesh, NaN 격리 경로는 강점이다(`enemyEntityPool.js:60-117`, `enemySimulation.js:493-510, 653-745`, `PooledEnemyProjectileLayer.jsx:23-58`). 반대로 `Physics timeStep=\"vary\"`(`GameCanvas.jsx:21`), 여러 독립 `useFrame`, 966 kB gzip Three 번들, 실제 모바일 FPS/메모리/물리 동등성 부재로 출시 신뢰도를 크게 감점했다. |
| 7. 제품성·온보딩·리텐션 | 4.5 | 9% | 제목 CTA와 Firebase Auth 메모리 persistence는 기반이 있다(`firebaseAuth.js:65-68`). 다만 실제 Google 로그인 후 첫 전투와 Android 설치·입력·복귀가 미검증이며, 출시된 AAB와 현재 HEAD의 동등성 증명도 없다. |

**종합: 4.8 / 10**

가중 계산: `6.0×0.08 + 5.5×0.22 + 5.0×0.13 + 4.5×0.12 + 4.5×0.06 + 4.0×0.30 + 4.5×0.09 = 4.755` → **4.8**. 이는 구조적 개선을 인정하되, 실제 프레임·물리·모바일 전투를 증명하지 못한 현재 상태는 출시 승인에 미달한다는 뜻이다.

## 플레이어 영향 기준 상위 5개 문제

| 우선순위 | 문제와 플레이어 영향 | 직접 근거 | 8점 도달을 위한 가장 작은 구체적 개선 | 재평가 합격 조건 |
|---|---|---|---|---|
| P0 | **가변 Rapier timestep은 기기 FPS에 따라 이동·충돌·넉백 결과를 바꿀 수 있다.** 플레이어에게는 같은 조작인데 저사양에서 피격/벽 충돌/회피 판정이 달라지는 공정성 문제다. | `GameCanvas.jsx:21`이 `timeStep=\"vary\"`를 사용한다. Player는 렌더 프레임마다 dynamic body에 `setLinvel` 및 경계 `setTranslation`을 수행한다(`Player.jsx:69-123`). 프로젝트 안정화 규칙은 고정 timestep과 30/60/120 Hz 동등성 검증을 요구한다. | Physics를 고정 timestep으로 설정하고, Player/무기/적의 시간축을 그 step에 맞춘다. 동작 변경을 최소화하려면 먼저 30/60/120 Hz의 같은 입력·같은 시드 회귀 테스트만 추가해 차이를 수치화한다. | 4개 stage에서 30/60/120 Hz 각각 240초 동일 입력을 실행해 위치, HP, 접촉 횟수, 적/투사체 활성 수가 허용 오차 내 동등하다. Android 저사양 10분에서 튕김·통과·NaN·stale body 0건. |
| P0 | **현재 soak은 핵심 렌더·물리 통합 회귀를 증명하지 않는다.** CI가 통과해도 실 플레이에서 인스턴스 행렬, Canvas 수명, Rapier body, GPU 메모리 누수는 깨질 수 있다. | 새 `gameplaySoak.js`는 `enemySimulationRuntime.step`과 풀을 직접 호출한다(`407-440`), `Math.random`과 Zustand 상태도 직접 바꾼다(`286-298`). `<Canvas>`, `<Physics>`, WebGL renderer를 만들지 않는다. 전체 테스트는 node 환경이다(`vite.config.js:77-81`). | 동일 하네스를 버리지 말고, Playwright 브라우저에서 `Canvas + Physics + GameCanvas`를 실제 마운트하는 1개 smoke/soak을 추가한다. 활성 적/투사체, WebGL context loss, console error, `renderer.info`를 기록한다. | Stage 1~4 각각 240초, 모바일 390×844와 데스크톱에서 run. console warning/error 0(허용 목록 없음), Canvas 1개, WebGL context loss 0, 풀 상한/active-body/rendered-instance 불변식 일치, 종료 뒤 잔존 객체 0. |
| P1 | **프레임 루프 규칙이 일관되지 않아 탭 복귀/느린 프레임에서 시간축이 갈라질 수 있다.** 플레이어는 순간 이동·짧은 무적·카메라/적 타이밍 불일치를 체감할 수 있다. | 적 시뮬레이션은 `1/30`으로 clamp한다(`enemySimulation.js:493-498`). 반면 공통 `usePlayingFrame`과 Game은 `0.1`초까지 허용한다(`usePlayingFrame.js:14-18`, `Game.jsx:83-105`), Player도 raw `delta`를 사용한다(`Player.jsx:69-129`). `ReadyGameApp`에는 visibility pause가 있지만(`ReadyGameApp.jsx:66-85`), 전 프레임 루프의 first-frame discard를 직접 증명하는 테스트는 찾지 못했다. | 공통 시간 정책을 `1/30` clamp + 탭 복귀 첫 delta 무시로 통일하고 Player와 camera에도 같은 clamp를 적용한다. | visibility hidden→visible 100회, 200 ms/1 s synthetic delta에서 포탈·보스·무적·적 위치의 단일 step 진행량이 `1/30` 상한을 넘지 않는다. 일시정지 중 게임 시간·피해·투사체 이동 0. |
| P1 | **초대형 Three 청크와 그림자 기본 활성화는 모바일 첫 진입·프레임 예산을 위협한다.** 사용자는 로그인 뒤 긴 검은 화면, 발열, 입력 지연을 겪을 수 있다. | 현재 빌드가 `vendor-three` 2,796.16 kB/gzip 965.62 kB 및 500 kB 경고를 출력했다. Canvas는 `shadows`를 기본 활성화한다(`GameCanvas.jsx:11-19`). vendor-three는 title/game lazy 뒤 필요한 의도이나 현재 chunk를 더 나누거나 저사양 예산을 실측한 증거가 없다(`vite.config.js:47-70`). | 먼저 Android/WebView에서 title→첫 playable frame의 네트워크·파싱·FPS를 측정한다. 기준 초과일 때만 title 3D와 gameplay 3D 의존성을 분리하거나 그림자 품질을 1단계 낮춘다. | 중급 Android에서 cold start 후 첫 입력 가능까지 예산을 정하고(예: 5초 이내), 10분 플레이에서 p95 frame time·메모리·온도 기준을 기록해 통과. 번들 경고는 제거하거나 측정 근거와 허용 예외를 릴리스 기록에 남긴다. |
| P2 | **테스트 수는 늘었지만 경고를 실패로 만들지 않고, 금지된 localStorage fixture가 여전히 남아 있다.** 경고가 재발해도 통과로 보이고 Firebase-only 계약을 지키는지 신뢰하기 어렵다. | 이번 전체 테스트는 통과했으나 warnings는 출력되지 않아 재현 여부를 판단하지 못했다. `src/store/useGameStore.500runStress.test.js:31`, `src/components/CoinShop.test.jsx:16` 등 다수 테스트에 `localStorage.clear()`가 있으며, QA 리스크 문서는 구형 localStorage fixture를 미해결 항목으로 기록한다. 런타임 Firebase fake seed 자체는 있다(`test/firebaseProgress.setup.js:1-26`). | 테스트 setup에서 `console.error/warn`을 허용 목록 없는 실패로 승격하고, player-data fixture의 localStorage 접근을 Firebase fake fixture로 교체한다. Graphics Studio guard test처럼 의도적으로 저장소 접근을 시험하는 경우만 좁은 sandbox 객체를 주입한다. | 전체 테스트가 console 경고 0으로 통과하고 `rg \"localStorage\" src test`의 남은 항목은 guard 테스트/명시적 금지 검증만이다. React act, deprecated act, multiple Three, DOM mesh 경고가 각각 0이며, 실패 시 CI가 비정상 종료한다. |

## 확인된 기술 강점

- 일반 적은 React 컴포넌트 1마리씩이 아니라 200슬롯 typed-array 풀로 관리하고 generation 검증을 사용한다(`enemyEntityPool.js:60-117, 284-299`).
- 적 AI는 그리드 인접 셀과 최대 24명만 분리 계산하며, 매 step 수치 유효성 실패 시 슬롯을 격리한다(`enemySimulation.js:493-510, 653-745`).
- 적·투사체 렌더는 `InstancedMesh`, `frustumCulled=false`, `instanceMatrix.needsUpdate`를 갖춰 실종의 대표 원인 하나를 예방한다(`ZombieInstanceLayer.jsx:72-75, 140-152`; `PooledEnemyProjectileLayer.jsx:41-58`).
- 스폰 요청은 bounded queue와 RAF당 3개 drain으로 분산해 대규모 웨이브의 한 프레임 폭증을 줄인다(`Enemies.jsx:803-860`).
- Firebase Auth는 memory-only persistence를 설정한다(`firebaseAuth.js:65-68`). 이 평가는 Firebase 데이터에 접근하거나 변경하지 않았다.

## 재평가 합격 게이트

종합 8점 이상 또는 출시 Go에는 아래가 모두 필요하다.

1. P0~P2의 수정 또는 측정 근거를 반영한 최신 소스에서 전체 테스트, 경고 무결성 게이트, production build가 통과할 것.
2. Stage 1~4를 실제 Canvas/Rapier/WebGL로 각각 240초 이상 실행하고, 30/60/120 Hz와 390×844 모바일/데스크톱에서 active enemy/body/instance/projectile 및 NaN·stale-reference·context-loss를 기록할 것.
3. Android AAB를 현재 Git SHA로 다시 빌드해 해시·versionCode를 기록하고, 실기기 또는 AVD WebView에서 로그인, 첫 전투, level-up, pause/resume, background/foreground, gameover/clear를 검증할 것.
4. `vendor-three` 크기와 shadow 설정에 대해 실제 cold start·p95 frame time·메모리 예산을 정하고 충족할 것. 경고를 허용한다면 수치와 이유를 릴리스 게이트에 명시할 것.
5. 직접 현재 런타임 화면/영상/로그로 전투 가독성·오디오·모바일 입력을 입증할 것. 타이틀 스크린샷이나 node 단위 테스트만으로는 이 게이트를 대체할 수 없다.

## 결론

풀·인스턴싱·spatial grid·generation 안전성은 이전보다 출시 가능한 방향으로 정리돼 있다. 그러나 **가변 물리 timestep, 실제 Canvas/Rapier 통합 soak 부재, 약 966 kB gzip Three 청크, 경고를 실패로 만들지 않는 테스트, 현행 Android 검증 부재** 때문에 현 상태는 **출시 No-Go**다. 가장 작은 다음 행동은 코드 확장보다 먼저 P0의 30/60/120 Hz 재현 테스트와 실제 Canvas 240초 smoke를 만들어, 문제를 수치로 확정하는 것이다.
