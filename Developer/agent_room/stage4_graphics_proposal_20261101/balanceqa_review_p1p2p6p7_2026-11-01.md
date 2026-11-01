# balanceqa acceptance review — Stage 4 그래픽 P1·P2·P6·P7

- 작성: balanceqa (Balance_QA_Mini), 2026-11-01
- 대상 트리: `C:\Dev\ezs-cf2` (zombie_only @ 5f88e2c0 + 미커밋 12파일)
- 사양 정본: `proposal.md` §2 P1/P2/P6/P7, §4, §5
- 라우팅 receipt: 3a20befe / c272adba
- 검증 범위: 코드 정적 검토 + vitest 단일 파일 실행 + node 오프라인 굽기 재현. **화면 캡처·GPU 렌더·실기기 프레임 계측은 하지 않았다**(dev 서버·브라우저 금지 조건). 아래에서 "확인"은 코드나 테스트로 확인한 것만 뜻한다.

## 판정: APPROVE WITH NOTES

판정 상수는 바뀌지 않았다. 금지 목록도 위반하지 않았다. Stage 1~3·5 라이트맵 바이트는 HEAD와 같다는 것을 독립적으로 다시 계산해 확인했다. 회귀 스윕 17파일 209건이 모두 통과했다. 다만 다음 세 가지가 남는다.
- P7은 Studio 재질 튜닝이 걸리면 발광이 조용히 꺼지는 경로가 있다(N1).
- P1 굽기 비용이 사양 추정치("몇 ms")보다 한 자릿수 크다(N2).
- P6의 "마지막 300ms 테두리 강조"와 P2의 "사용자 확정 hex 확인"이 끝나지 않았다(N3, N4).

어느 것도 판정 수치나 회피 판독을 깨지 않는다. 그래서 REJECT로 보지 않았다.

## 1. 판정 상수 불변 — PASS

| 상수 | 기대 | 확인 방법 | 결과 |
|---|---|---|---|
| B04 국물 데미지/경고/폭발/반경 | 16 / 1200ms / 250ms / 1.1 | `b04SoupBlast.js` 미수정(git status). `EnemyVisual.test.js` 신규 단언이 4개 값 고정 | 불변 |
| 압력솥 주기/비등/폭발/반경 | 15000 / 3000 / 250 / 3.2 | `stage4PressureCauldronHazard.js` 미수정. `PressureCauldron.test.js` 신규 단언 | 불변 |
| `PRESSURE_CAULDRON_BASE_SCALE` | 0.4 | diff에 변경 없음(`PressureCauldron.jsx:30`) | 불변 |
| 경고 링 원점·반경 | `Stage4CauldronGroundWarning` 그대로 | 파일 미수정. 모델 형제(`PressureCauldron` 루트 fragment)로 유지 | 불변 |
| B04 채움 최대 반경 | ≤ 1.1 − 0.22 = 0.88 | geometry 인자 그대로이고 scale ≤ 1(`getB04SoupFillProgress`가 [0,1]로 clamp). runtime 테스트가 radiusTop 0.88을 단언 | 피해 반경 미초과 |

## 2. 금지 사항 — PASS

| 항목 | 결과 | 근거 |
|---|---|---|
| 실시간 광원 추가 0 | 통과 | diff 추가 라인에 Light 생성 없음. `Game.stageLighting.test.js` 4/4, P7 runtime 테스트가 비등 중 `isLight` 0을 단언 |
| 공유 캐시 toon 머티리얼 직접 애니메이트 | 없음 | 발광은 `PressureCauldron` 소유 clone(`pressure-cauldron-boil-glow`)만 바꾼다. 바늘 메시는 공유 red를 쓰지만 회전은 부모 group transform이라 머티리얼과 무관하다. runtime 테스트가 공유 red의 emissive 불변을 단언 |
| 경고 링 가마솥 하위 복귀 | 없음 | `<Stage4CauldronGroundWarning />`이 `PressureCauldronModel` 밖에 그대로 있다 |
| 반경 3.2 테두리 굽기 | 없음 | 원형 발자국 반경 + falloff 0.6 < 3.2. 3.2 원주 64점 계수가 정확히 1이고, 반경을 늘리면 단조로 밝아진다(링 극소 없음) |
| depthWrite/투명 복귀 | 없음 | 추가 라인에 `transparent`/`depthWrite` 없음. 국물 채움 재질은 기존 그대로 |
| GraphicsStudio.jsx 수정 | 없음 | git status에 없음 |
| localStorage | 미사용 | diff 추가 라인에 없음 |
| 미사용 `flash={red}` 정리(P7 사양) | 완료 | prop 제거됨 |

## 3. Stage 1~3·5 무영향 — PASS (독립 재계산)

- **해시 독립 검증**: `git show HEAD:`로 변경 전 `stageFloorLightBake.js`와 `stageLightingProfile.js`를 스크래치 폴더에 꺼냈다. 테스트와 같은 가짜 캔버스로 굽고 sha256을 계산했다. stage1 `402d5661…`, stage2 `9c897eb5…`, stage3 `08f9e281…`이 테스트에 고정된 값과 일치했다. 현재 트리로 구운 값도 같았다. 테스트의 고정값은 변경 전 출력에서 나온 값이다(자기 참조 아님).
- stage4 rgb 해시는 HEAD `4d8f11d9…`에서 현재 `c13b6a8c…`로 바뀌었다. 이건 P2 색 변경 때문이고 의도한 결과다. intensity(peak)는 2.904에서 3.012로 바뀌었다.
- **셰이더 주입 게이트**: `stageFloorLightMapProps`는 `bake.occlusion === true`일 때만 `onBeforeCompile`을 붙인다. occlusion 입력은 `getStageFloorOcclusion`이 `stageId !== 'stage4'`이면 null을 돌려준다. stage1~3 테스트가 `onBeforeCompile === undefined`이고 알파가 전부 255임을 단언한다.
- **Stage 5**: `Stage5Environment.jsx:27`이 `<ClassroomFloor stageId="stage3" />`를 쓴다. stage3 바이트·props가 그대로라 영향이 없다. `Stage5Environment.test.jsx` 11/11 통과.
- 남는 영향: 배치 버전 카운터가 전역이다. 그래서 stage4 바닥은 **다른 스테이지 소품을 Apply할 때도** 다시 굽는다(정확성 문제 없음, 비용만 듦 — N2와 같이 본다).

## 4. P1 입력 경로와 Firebase 정본 원칙 — NOTE (충돌 아님)

- 입력은 `getStageObjectSightObstacles`와 `getStageObjectPlacements`다. 둘 다 `StageObjectLayer`·콜라이더와 같은 resolved 배치 함수다. 새 로컬 시드, fallback, localStorage, 소스 기본값 분기를 추가하지 않았다.
- Firebase hydrate가 `STAGE_PROP_PLACEMENTS_EVENT`를 발행한다(`firebaseStudio.js:617`). 이 이벤트가 시야 장애물 캐시를 비우고(`stageObjectColliders.js:461`, 모듈 로드 때 등록되어 훅 구독보다 먼저 실행) 버전을 올린다. 그래서 hydrate 뒤와 Apply 뒤 모두 다시 굽는다.
- hydrate 전 첫 굽기는 그 시점에 화면에 그려진 소품 배치와 같다. 그림자와 소품이 서로 어긋난 프레임은 생기지 않는다. 그래픽을 Firebase 준비 여부로 숨기지도 않는다.
- 결론: 화면 소품과 같은 정본을 같은 타이밍에 따라간다. 원칙 위반이 아니다.

## 5. 성능

| 항목 | 값 | 근거·비고 |
|---|---|---|
| 굽기 대상 | stage4 시야 장애물 31개 중 가마솥 제외 박스 26개 + 원 1개 | vite-node로 `getStageObjectSightObstacles('stage4')` 실측 |
| 굽기 시간(데스크톱 node) | 차폐 없음 5~8ms(cold 24ms). **차폐 포함 42~51ms(cold 83ms)** | 박스 24개 + 원 1개 합성 입력, 6회 반복, `performance.now()` |
| 모바일 추정 | 약 130~400ms, 메인 스레드에서 1회 | 데스크톱 대비 3~5배를 가정한 **추정치이며 실측 아님** |
| 굽기 시점 | stage4 바닥 마운트, Firebase hydrate 이벤트, Studio 배치 Apply(모든 스테이지) | `useMemo` 렌더 중 동기 실행 |
| 텍스처 | 증감 0 (256² RGBA 그대로, 알파 채널만 사용) | |
| draw call | 증감 0 | P1은 기존 바닥, P6은 기존 채움 메시 scale, P7은 기존 메시의 머티리얼 교체 |
| 머티리얼 | +1 (P7 glow clone, 가마솥 1개). unmount 때 `dispose` | `useEffect` cleanup 확인 |
| 셰이더 프로그램 | stage4 바닥 Lambert 변형 +1. 고정 `customProgramCacheKey`라 첫 진입 때 1회만 컴파일. Apply 재굽기로 머티리얼이 새로 생겨도 캐시를 그대로 쓴다. P7 clone은 원본과 파라미터가 같아 같은 프로그램을 쓸 것으로 판단(GPU 미확인) | |
| 프레임당 비용 | P6: 원마다 useFrame 1개, scale.set만 한다. P7: 기존 useFrame 안에서 회전 1회 + 스칼라 1회 대입 | 무시해도 되는 수준 |

## 6. 회귀 스윕 결과

모든 실행은 `npx vitest run <file>`로 한 파일씩 순차 실행했다. 작업 디렉터리는 `C:\Dev\ezs-cf2\Developer\r3f_prototype`이다.

| 파일 | 결과 |
|---|---|
| src/lib/stageFloorLightBake.test.js | 31/31 PASS |
| src/components/ClassroomFloor.test.jsx | 12/12 PASS |
| src/lib/stageLightingProfile.test.js | 6/6 PASS |
| src/components/Game.stageLighting.test.js | 4/4 PASS |
| src/components/StageObjects/PressureCauldron.test.js | 10/10 PASS |
| src/components/Stage4Hazards.runtime.test.jsx | 8/8 PASS |
| src/components/EnemyVisual.test.js | 36/36 PASS |
| src/components/stage4HazardLifecycle.test.js (요청 경로 lib/ 아님) | 8/8 PASS |
| src/lib/b04SoupBlast.test.js (요청 경로 components/ 아님) | 4/4 PASS |
| src/components/Game.stage4PressureCauldron.test.js | 1/1 PASS |
| src/lib/stage4PressureCauldronHazard.test.js | 5/5 PASS |
| src/components/Stage5Environment.test.jsx | 11/11 PASS |
| src/components/expansion/ExpansionEnvironment.test.js (요청 경로 lib/ 아님) | 6/6 PASS |
| src/components/StageObjects/stageObjectPlacements.override.test.js (Studio 배치) | 6/6 PASS |
| src/App.studioGameSync.test.jsx (Studio-게임 동기화) | 8/8 PASS |
| src/components/StudioTunedGroup.test.jsx (Studio 재질 격리) | 30/30 PASS |
| src/lib/firebaseStudio.test.js (hydrate 이벤트) | 18/18 PASS |
| **합계** | **209/209 PASS** |

`graphicsStudio*.test.*` 파일명 중 stage4·placement 전용 파일은 없었다. 그래서 배치 적용 경로를 직접 다루는 위 4개 파일로 대신했다. 위 스윕은 `npm test` lifecycle의 pretest 게이트(branch guard 등)를 거치지 않았다. 지시에 따라 `npm test`를 금지했기 때문이다.

별도 재현 스크립트(HEAD 해시 재계산, 굽기 시간, 장애물 수)는 리포 밖 스크래치 폴더에서만 돌렸다. 리포에는 남기지 않았다.

## 7. 게임플레이 판독 (코드 수치 기준, 화면 미확인)

- **P6 국물 채움**: 분절 테두리(피해 반경 1.1)는 처음부터 전부 보이고, 안쪽 채움이 0에서 0.88까지 1200ms 동안 선형으로 커진다. 이제 "어디"는 테두리가, "언제"는 채움 비율이 알려 준다. 진행값은 게임 시간 state ref(`elapsedMs`)에서 읽으므로 일시정지하면 멈춘다(runtime 테스트로 확인). 폭발 단계에서는 scale이 1로 돌아가 기존 폭발 표식과 같다. 채움이 선형이라 "거의 다 찼다"는 순간을 구분하기 어려울 수 있다. 사양에 있던 마지막 300ms 테두리 opacity 상승이 그 보완책인데 구현되지 않았다(N3).
- **P7 비등 큐**: 3초 비등 동안 바늘이 −0.62rad(약 35.5°) 돈다. 발광은 0.12에서 0.9로 선형 증가한다. 마지막 0.45초에는 150ms 주기로 3회 펄스(0.495~0.9)가 있고, 폭발 순간에 펄스가 정점(0.9)에 맞는다. 기존 떨림·거품·증기·바닥 링 위에 "남은 시간" 계기가 더해지는 셈이라 언제 터지는지 전달하는 데 유효하다고 본다. 펄스가 시작될 때(잔여 450ms) 발광이 0.783에서 0.9로 계단처럼 튄다. 오히려 "곧 터진다"는 신호로 읽힐 수 있어 결함으로 보지 않았다.
- **P2 색 분리**: 중앙 `#FFE27A`는 `#EEF3F6`으로, 북쪽 `#8DEBD1`은 `#CFE3FF`로 바뀌었다. 테스트가 확인하는 내용은 다음과 같다. 반경 3.2 지점 다섯 곳의 바닥 굽기 색은 HSV 채도 < 0.2이고 B ≥ R(냉백)이다. 경고 `#FFE576`과의 채도 차이는 > 0.5다. 북쪽 구역은 E04 `#34D6B8`과 hue 차이 > 0.08이고, 채도는 E04의 절반 미만이다. 이제 따뜻한 색은 위험 요소(경고 링·국물·폭발)만 쓴다. 색각 이상·회색조 판독(§5.3)은 화면이 필요해 미확인이다.

## 8. 노트·리스크·후속 권고

- **N1 (중, 조건부) P7 발광과 Studio 재질 격리의 충돌.** `StudioTunedGroup.applyStudioTuning`은 재질 튜닝(color/brightness/saturation/emissiveIntensity/outline 중 하나라도 기본값이 아님)이 가마솥 루트나 해당 파츠에 걸리면 동작이 바뀐다. 각 메시의 `material`을 owner clone으로 **교체**한다(`StudioTunedGroup.jsx:88-127, 197-201`). 그런데 `PressureCauldronHazardVisual`은 원래 `glowMaterial` 참조를 애니메이트한다. 그러면 화면의 표시등과 밸브는 더 이상 그 머티리얼을 쓰지 않아 발광 펄스가 아무 효과 없이 끝난다. 크래시나 판정 영향은 없다. 바늘은 transform이라 그대로 동작한다. 사양 §2 P7의 "Studio 해당 part 재질 튜닝(clone 격리)과 충돌하지 않는지 확인"이 이 지점이다. 테스트는 튜닝 없이 마운트하므로 이 경로를 잡지 못한다.
  - 권고: 현재 Firebase revision에 pressureCauldron 재질 튜닝이 있는지 RAM 전용으로 확인한다. 없으면 출시 차단 사항이 아니다.
  - 후속: 머티리얼 이름으로 메시를 찾아 현재 `mesh.material`을 애니메이트하는 방식으로 바꾸고, 재질 튜닝을 주입한 runtime 테스트를 추가한다(threemini).
- **N2 (중) P1 굽기 비용.** 사양은 "몇 ms"로 추정했지만 데스크톱 실측이 40~80ms다. 모바일은 수백 ms로 추정된다(실측 아님). 진입 1회는 로딩 구간에 흡수될 가능성이 높다. 하지만 hydrate 이벤트나 Studio Apply가 플레이 중에 오면 그 순간 프레임이 끊긴다. 또 다른 스테이지 소품 Apply에도 다시 굽는다.
  - 권고: 픽셀마다 박스 26개를 전수 검사하는 대신, 박스 AABB+falloff 범위 밖이면 건너뛰는 사전 컬링을 넣는다(5배 이상 절감 예상). 그다음 §5.2 절차로 stage4 진입 프레임을 실기기에서 실측한다.
- **N3 (하) P6 사양 일부 미구현.** "마지막 약 300ms 분절 테두리 opacity 상승"이 빠졌다. 판독 보강 항목이니 후속 1건으로 처리하면 된다.
- **N4 (절차) P2 hex 확정값 확인.** 사양은 "현재 hex(`#8DEBD1`/`#FFE27A`)가 사용자 확정값인지 Advisor 확인이 먼저"라고 적었다. 이 확인 기록은 보지 못했다. 커밋 전에 Advisor가 확인하거나 Terry 승인을 남겨야 한다.
- **N5 (하, GPU 미확인) 캔버스 알파 premultiply.** 바닥 lightMap은 2D 캔버스 `putImageData`로 올린다. 브라우저는 알파 < 255 픽셀을 premultiplied로 저장하므로, 업로드 때 rgb에 양자화 손실이 생길 수 있다. 최소 알파는 약 0.32(가구 밑 × 경계 띠 교차점)이고 손실은 최대 약 3단계다. 가짜 캔버스 테스트로는 이 현상을 잡을 수 없다. 화면 검수 때 벽 모서리 가구 밑에 색 밴딩이 있는지 함께 본다.
- **미검증(정직 표기)**: 실제 GPU 셰이더 컴파일(`vLightMapUv`·`aomap_fragment` 치환은 three ^0.164 Lambert 셰이더 기준 코드 판단), 화면 캡처 7종, 회색조·색각 판독, 저사양 Android p95 프레임 시간. 모두 §5.3·§5.2 절차로 별도 수행이 필요하다.
