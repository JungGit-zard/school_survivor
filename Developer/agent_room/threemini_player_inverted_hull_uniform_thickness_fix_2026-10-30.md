# 플레이어 인버티드 헐 아웃라인 — 균일 두께 수정 검증 (2026-10-30)

작성 2026-10-30 / 담당 threemini / 요청 Advisor 세션
대상 결함: `Developer/agent_room/threemini_rosari_gameplay_material_outline_verification_2026-10-29.md` §6-4(굵기 편차 20배), §6-5(내부 틈 메움)
작업 트리: `C:\Users\admin\AppData\Local\Temp\ezs-cf` (`zombie_only`, HEAD `05d8fa8c`). **커밋하지 않았다.**

---

## 0. 결론 먼저

| 결함 | 상태 |
|---|---|
| ① 파츠 크기 비례 굵기(20~30배 편차) | **닫힘.** 전 파츠·전 축 표면 오프셋이 정확히 같다(비율 30.32 → **1.000**) |
| ② 실루엣 부풀림 / 내부 틈 메움 | **줄었으나 남는다.** 실루엣 +22.7% → **+9.6%**, 틈 메움 1,670 → **1,121 px**, 완전히 막힌 틈 75 → **39개** |
| §4 수용표 5줄 중 | 2줄 충족(균일도·액세서리·z-fighting), **3줄 미충족**(≥0.5 CSS px, 실루엣 ≤5%, 틈 메움 ≤200) |

**수용표의 세 줄은 서로 모순이라 어떤 아웃라인 기법으로도 동시에 만족할 수 없다.** 근거는 §4에 실측으로 적었다.
아래 구현은 "결함 ①을 완전히 닫고, ②를 가장 크게 줄이되 캐릭터의 현재 선 굵기(중앙값)를 유지한다"는 기준으로 `t`를 골랐다.
다른 지점을 원하면 상수 1개(`PLAYER_OUTLINE_THICKNESS`)만 바꾸면 되고, 각 후보의 실측 비용은 §4-2 스윕표에 있다.

---

## 1. 바꾼 것

| 파일 | 변경 |
|---|---|
| `src/lib/playerV9Outline.js` | 헐 scale을 균일 배율(`inflateScale(1.08)` = 1.16)에서 **축별 역산 `1 + t / h_i`**로 교체. 상수 오프셋 `t` 1개를 파라미터로 받는다. `h_i`는 모델 루트 단위 half-extent이며 GLB 노드의 누적 scale로 보정한다. `h_i ≈ 0` 축은 scale 1로 고정(블롭 방지) |
| `src/components/PlayerRosariModel.jsx:159` | `addPlayerV9Outlines(cloned, gameplay ? 1.08 : 1.04)` → `gameplay ? PLAYER_OUTLINE_THICKNESS : PLAYER_OUTLINE_THICKNESS_PREVIEW` |
| `src/components/PlayerV9Model.jsx:76` | 동일 |
| `src/components/StudioTunedGroup.jsx:183` | **동작 변경 없음.** `outlineThickness → 헐 scale 곱` 계약의 천장과 업그레이드 경로를 주석으로 박았다 |
| `src/components/PlayerV9Model.test.jsx` | 헐 scale 단정(1.08 / 1.16)을 표면 오프셋 단정으로 갱신 |
| `src/lib/playerV9Outline.test.js` | **신규** 6케이스 |

`src/lib/toon.js`의 `inflateScale` / `OUTLINE_THICKNESS_MULT`는 건드리지 않았다(Enemy·expansion·DogeMesh·GoldCoin이 단순 박스에 그대로 쓴다).
`src/components/RosariRoom.jsx`도 건드리지 않았다.

두 호출부가 같은 헬퍼를 쓰므로 **v9·로자리 2세대가 동시에 고쳐진다.** `DEFAULT_PLAYER_APPEARANCE = 'v9'`(`src/lib/playerAppearance.js:10`)이므로
이 변경은 현재 모든 플레이어가 보는 외형에 바로 나간다. 타이틀 화면은 `PlayerMesh.jsx`를 쓰고 이 헬퍼를 쓰지 않으므로 영향이 없다(grep 확인).

### 1-1. 왜 누적 스케일 보정이 필요한가 (브리핑 §3-4 확인 결과)

**GLB 노드가 전부 scale 1이 아니다.** 로자리 GLB에서 5개 노드가 자기 scale을 들고 있고 3개는 비균일이다:

```
blue_backpack_top_flap                 [0.460, 0.160, 0.045]
small_gold_backpack_clasp              [0.080, 0.080, 0.050]
short_neck_visible_below_complete_skull[0.250, 0.170, 0.300]
left/right_white_cuff_band_at_wrist    [0.210, 0.085, 0.239850]
```

보정 없이 `t`를 로컬 단위로 쓰면 이 파츠들의 실제 오프셋이 `t × 노드 scale`이 되어 걸쇠 z축은 `0.05t`, 즉 다시 20배 편차가 생긴다.
그래서 surface부터 GLB 루트까지 노드 scale을 곱해 `h_i`를 루트 단위로 환산한 뒤 역산한다.
`matrixWorld` decompose 대신 scale 성분 곱을 쓴 이유는 헐을 붙이는 시점에 클론이 씬에 없어 월드 행렬이 갱신돼 있지 않기 때문이다(결과는 같은 근사).

---

## 2. 측정 환경

| 항목 | 값 |
|---|---|
| dev 실행 | `npm run dev` (= `single_branch_guard.py run -- vite`), 가드 통과, **우회 없음** |
| 브라우저 | Playwright 1.60 + 로컬 설치 Chrome(`channel: 'chrome'`). `npm run browser:reserve` 선행(INSTANCES=1/LIMIT=3) |
| 진입 | 게스트("로그인 없이 들어가기") → 입장하기 → Stage 1 → **F8**(DEV 비교 토글)로 rosari |
| 캔버스 | 248 × 441 CSS px, dpr 1.5, 드로잉 버퍼 **372 × 661** (2026-10-29의 247.82×440.57 / 371×660 재현) |
| Studio 튜닝 | 없음(게스트) = `DEFAULT_STUDIO_TUNING`, `outlineThickness = 1` |
| 스케일 환산 | 실측 **34.228 CSS px / world unit**(라이브 Stage 1 카메라), `modelScale` 0.2555033 → **8.7453 CSS px / 모델 루트 unit** |
| 하네스 | `scratchpad/sweep.mjs`(캡처), `report.mjs`·`hullmetric2.mjs`(픽셀 계측), `strip.mjs`(비교 스트립), `hullgeo.mjs`(GLB 직독) |

전/후를 **같은 포즈·같은 카메라·같은 캔버스**에서 찍기 위해 `frameloop`를 `never`로 고정하고 한 번의 페이지 로드 안에서
헐 scale만 바꿔 가며 캡처했다. `legacy` 모드는 옛 코드와 수치적으로 동일한 `scale = 1.16`이다.

재현 확인: `legacy` 모드의 바디 픽셀 수가 2026-10-29 베이스라인과 0.5% 안에서 일치한다
(gameplay45 43,626 ↔ 43,435 / front 122,877 ↔ 122,617 / back 117,138 ↔ 116,895 / side 85,941 ↔ 85,885).
"내부 틈 메움"은 그때 쓰인 정의(같은 행에서 좌우 양쪽에 바디가 있는 배경 런이 헐로 덮인 픽셀 수)를
베이스라인 PNG로 역추적해 재현했다(1,844 vs 문서 1,836 / 5,314 vs 5,258 / 6,252 vs 6,180 / 375 vs 370).

---

## 3. 결과 — before / after 실측

모두 **소스 코드 경로**(override 없음, `t = 0.024`)에서 찍은 값이다.

### 3-1. 파츠별 링 두께 (결함 ①)

라이브 Stage 1 카메라, CSS px. 31개 헐 × 3축 = 93개 축 전수.

| | before (legacy 1.16) | after (t = 0.024) |
|---|---|---|
| 최소 | 0.0298 (`yellow_tie_long_drop` z) | **0.2099** |
| 최대 | 0.9037 (`continuous_fitted_reference_bob` x) | **0.2099** |
| 최대/최소 | **30.32배** | **1.000** |
| 디바이스 px(dpr 1.5) | 0.045 ~ 1.356 | 0.315 |

주요 파츠 가로 링(2026-10-29 §6-4 표와 같은 축):

| 부위 | before | after |
|---|---:|---:|
| `hair` 단발 | 0.904 | 0.210 |
| 치마 | 0.662 | 0.210 |
| 얼굴/머리 | 0.602 | 0.210 |
| 몸통 | 0.579 | 0.210 |
| 가방 본체 | 0.449 | 0.210 |
| 구두 | 0.286 | 0.210 |
| 소매 | 0.257 | 0.210 |
| 종아리/허벅지/양말 | 0.225~0.228 | 0.210 |
| 칼라 | 0.172 | 0.210 |
| 타이 매듭 / 긴 타이 | 0.117 / 0.092 | 0.210 |
| 가방 어깨끈 | 0.102 | 0.210 |
| `gold` 가방 걸쇠 | 0.089 | 0.210 |

의도대로 **머리는 4.3배 얇아지고 타이·걸쇠는 2.0~2.4배 굵어졌다.** 전체 중앙값 0.195 → 0.210 (+7.7%)이라
캐릭터 전체의 "잉크 총량"은 사실상 그대로다.

### 3-2. 실루엣·내부 틈 (결함 ②)

| 시점 | 지표 | before | after | 수용 목표 |
|---|---|---:|---:|---|
| 게임플레이 각 | 실루엣 증가 | +22.7% | **+9.6%** | ≤5% ✗ |
| 게임플레이 각 | 틈 메움 | 1,670 px | **1,121 px** | ≤200 ✗ |
| 게임플레이 각 | 완전히 막힌 틈 | 75/177 | **39/177** | (목표 없음) |
| 정면 | 실루엣 / 틈 메움 | +21.6% / 4,952 | **+10.0% / 3,656** | ≤600 ✗ |
| 후면 | 실루엣 / 틈 메움 | +22.1% / 4,694 | **+10.1% / 3,547** | ≤600 ✗ |
| 측면 | 실루엣 / 틈 메움 | +24.0% / 257 | **+10.1% / 257** | — |

측면의 틈 메움이 안 줄어든 이유: 측면에서 보이는 행-갇힘 배경 런 64개가 전부 합쳐 257 px(평균 4 px)뿐인
극세 틈이라 legacy든 t=0.024든 전부 막힌다. 실게임 배율로 환산하면 폭 0.19 CSS px — 서브픽셀이다.

### 3-3. 그대로 유지된 것

| §6 항목 | 결과 |
|---|---|
| 액세서리 파묻힘 | **0개 유지.** 정면/후면/측면/게임플레이각 격리 캡처에서 타이·칼라·어깨끈·걸쇠·양말·구두 전부 식별 가능 |
| z-fighting | **없음 유지.** 네 각도 캡처에서 점박이·깜빡임 없음. 헐은 여전히 BackSide·`depthWrite false`이고 자기 표면 밖에만 있다 |
| 스텐실 계약 | `stencilRef` 3, 표면 `renderOrder` 90 / 헐 91, `frustumCulled false`, `userData.studioRenderOutline`, `Decal_` 스킵 — 전부 그대로(단위 테스트가 단정) |
| 헐 개수 | 31/31 (표면 1:1) 그대로 |

### 3-4. 캡처

```
C:\Users\admin\AppData\Local\Temp\claude\F--From-SSD-D-20261005-JungSil-2-Minigame-project-school-survivor-integration\c13da572-f1a7-4c11-876c-77aa0d8a4fb3\scratchpad\final2\
  {gameplay45,front,back,side}_{nohull,legacy,source}.png   격리 캡처(녹색 배경)
  live_{off,legacy,source}.png                              실제 Stage 1 화면
  strip_off_legacy_source.png                               실게임 크기 9배 확대 비교(없음 | 기존 | 수정)
  metrics.json / parts.json / offsets_{legacy,source}.json  수치 원본
```
스윕 전체(8개 t × 4각도)는 같은 scratchpad의 `sweep2/`, 시각 비교용 중간 스윕은 `sweep3/`에 있다.

`strip_off_legacy_source.png`가 가장 직관적이다 — 기존(가운데)은 머리에만 검은 모자가 씌워져 있고,
수정(오른쪽)은 머리·몸통·다리에 같은 굵기의 선이 돈다.

---

## 4. `t` 선택 근거

### 4-1. 수용표 3줄은 서로 모순이다 (실측)

라이브 Stage 1 카메라에서 **1 모델 루트 unit = 8.7453 CSS px**이다(실측). 세 줄을 각각 `t`로 환산하면:

| 수용표 한 줄 | 필요한 `t` | 그때의 다른 값 |
|---|---:|---|
| 전 파츠 ≥ 0.5 CSS px | **0.0572** | 실루엣 **+21.9%**(실측, t=0.057), 틈 메움 2,123 px |
| 실루엣 ≤ 5% | **≈0.0117** | 링 두께 **0.102 CSS px**, 틈 메움 ~620 px |
| 틈 메움 ≤ 200 px | **≈0.0031** | 링 두께 **0.027 CSS px**(사실상 안 보임) |

**같은 양에 대해 18배 떨어진 세 값을 요구한다.** 한 `t`로 두 줄 이상을 만족시킬 수 없다.

실루엣 증가 %는 같은 형상의 면적 비라서 **렌더 배율과 무관**하다(격리 캡처에서 재든 실게임에서 재든 같다).
그래서 "0.5 CSS px 링"은 곧 "실루엣 +21.9%"와 같은 말이다 — 캐릭터가 실게임에서 **27 CSS px(40.9 디바이스 px) 높이**밖에
안 되기 때문이다. 이건 인버티드 헐의 결함이 아니라 기법과 무관한 기하학이다.
방 경로의 스크린스페이스 2 CSS px로 교체해도 같은 모순이 그대로 남는다(오히려 더 커진다).

반면 "틈 메움 px"는 **절대 픽셀 수라서 렌더 배율에 비례한다.** 2026-10-29의 1,836 / 5,258 px는
격리 캡처(게임플레이 각 캐릭터 높이 **330 디바이스 px** = 실게임의 8.1배, 정면 **617 px** = 15.1배) 기준 값이다.
이번 측정은 그 배율을 재현했으므로 비교는 유효하지만, ≤200 px이라는 문턱 자체가 그 배율에 묶여 있다.

### 4-2. 스윕 실측 (격리 캡처, 게임플레이 각)

| t | 링 두께(CSS px) | 실루엣 증가 | 틈 메움 | 완전히 막힌 틈 |
|---:|---:|---:|---:|---:|
| legacy(1.16) | 0.030 ~ 0.904 | +22.7% | 1,653 | 74/175 |
| 0.006 | 0.052 | +2.9% | 387 | 17/175 |
| 0.012 | 0.105 | +5.1% | 639 | 23/175 |
| 0.018 | 0.157 | +7.4% | 887 | 28/175 |
| **0.024** | **0.210** | **+9.6%** | **1,111** | **37/175** |
| 0.030 | 0.262 | +11.8% | 1,323 | 45/175 |
| 0.040 | 0.350 | +15.6% | 1,665 | 58/175 |
| 0.057 | 0.499 | +21.9% | 2,123 | 93/175 |

정면/후면/측면 표는 `sweep2/`의 출력과 같은 형식으로 `metrics.json`에 들어 있다.

### 4-3. 0.024를 고른 이유

1. **결함 ①은 어떤 t에서도 완전히 닫힌다**(균일도 1.000). 남는 선택은 "굵기 ↔ 결함 ②"의 교환비뿐이다.
2. `t = 0.024`는 **현재 파츠 두께의 중앙값(0.195 CSS px)을 유지하는 값**이다(+7.7%).
   즉 지금 정상으로 보이던 부위의 선 굵기를 바꾸지 않고, 이상치인 머리 모자(0.904)만 깎고
   사실상 보이지 않던 타이·걸쇠·어깨끈(0.03~0.12)을 같은 값으로 올린다.
3. 그 상태에서 결함 ②가 실측으로 크게 준다: 실루엣 −58%, 틈 메움 −33%, 완전히 막힌 틈 −48%.
4. **더 굵게(0.040)** 가면 틈 메움이 1,665로 legacy(1,653)와 같아져 **결함 ②가 사라지지 않는다.**
   하나를 고치고 다른 하나를 되돌리는 셈이라 채택하지 않았다.
5. **더 얇게(0.012)** 가면 실루엣 ≤5%는 맞지만 전 파츠가 0.105 CSS px(0.16 디바이스 px)가 되어
   2026-10-29가 "테두리가 사실상 없다"고 적은 수준으로 **캐릭터 전체가 내려간다.** 아웃라인 필수 정책과 충돌한다.

`t`는 `src/lib/playerV9Outline.js`의 상수 1개다. Advisor가 다른 지점을 원하면 위 표의 비용을 보고 그 값만 바꾸면 된다.

---

## 5. Studio 계약 (브리핑 §5)

### 5-1. Firebase 정본 조사 결과 — **player-rosari / player-v9 의 `outlineThickness` 저장값은 없다**

공개 읽기가 허용된 정본 노드를 REST로 직독했다(쓰기 없음).

```
https://escape-zombie-school-default-rtdb.asia-southeast1.firebasedatabase.app
  /studioWorkspaces/v1/canonical/current     revision 1952, updatedAt 2026-08-10T16:17:15.598Z
```

`datasets.tunings`의 최상위 키 39개 중 **`player-v9::` 또는 `player-rosari::` 접두 키는 하나도 없다.**
`outlineThickness ≠ 1`인 항목 6건은 전부 **레거시 `player` 아이템**(= `PlayerMesh.jsx`, 이번 변경 대상 아님)이다:

| 키 | outlineThickness |
|---|---:|
| `player` (루트) | 0.4 |
| `player::part::0.0.0` | 0.4 |
| `player::part::0.0.6.0.0` | 0.4 |
| `player::part::0.0.7.0.0` | 0.4 |
| `player::part::0.0.19.0.0` | 0.4 |
| `player::part::0.0.19.2.0.8` | 1.16 |

나머지 34건(`player::*` 일부, `zombie-*`, `actor-doge`)은 전부 1이다.
`database.rules.json`에 Studio 데이터 경로는 `studioWorkspaces/v1/canonical/current` 하나뿐이고
`firebaseStudio.js`도 `CANONICAL_STUDIO_PATH` 하나만 쓴다 — 계정별 Studio 저장 경로는 없다.

**결론: 실유저에게 부푼 파츠가 나가는 경로는 지금 없다. Studio는 이번 범위 밖으로 둔다.**
단, 메커니즘 자체는 레거시 `player` 아이템에서 실제로 쓰이고 있다(0.4 → 계수 0.928).

### 5-2. 천장 명시

`StudioTunedGroup.jsx:183`의 `outlineScaleFactor = 1 + (outlineThickness - 1) * 0.12`는 헐 메시의 `object.scale`을 그대로 곱한다.
축별 base scale로 바뀌었으므로 슬라이더를 1에서 올리면 **두께가 t만큼 느는 게 아니라 파츠가 통째로 부푼다**(1.16 → 1.30이던 기존 성질과 같다).
기본값 1에서는 계수가 정확히 1.0이라 무영향이므로 메커니즘은 그대로 두고 한국어 주석으로 천장과 업그레이드 경로를 박았다.
업그레이드하려면 scale을 곱하지 말고 `t`를 구동해 헐을 재생성해야 하므로 별건 설계가 필요하다.

---

## 6. 테스트

```
npx vitest run src/components/PlayerRosariModel src/components/PlayerV9Model src/lib/playerV9Outline
→ Test Files 3 passed (3) / Tests 44 passed (44)

npx vitest run src/components/StudioTunedGroup src/components/GraphicsStudioPreview \
               src/lib/playerV9Outfits src/components/Player.modelComparison
→ Test Files 4 passed (4) / Tests 69 passed (69)
```

신규 `src/lib/playerV9Outline.test.js` 6케이스:

1. 크기가 10배 차이 나는 두 파츠(머리/타이)의 표면 오프셋이 ±10% 안에서 같다
2. 노드 scale이 `[0.08, 0.08, 0.05]`인 파츠도 오프셋이 `t`로 떨어진다(누적 스케일 보정 회귀)
3. 축별 scale이 비균일하고 bbox에서 역산된 값이다(납작한 축이 가장 크게 늘어난다)
4. `h_i ≈ 0` 축은 scale 1 (블롭 회귀 방지)
5. 프리뷰는 오프셋이 절반이다
6. `Decal_` 스킵 / `stencilRef` 3 / `renderOrder` 90·91 / BackSide / NotEqual / 지오메트리 클론 유지

갱신: `PlayerV9Model.test.jsx`의 헐 scale 단정(1.08 / 1.16)을 표면 오프셋 단정으로 바꿨다.
픽스처가 1×1×1 박스라 `(scale - 1) × 0.5 === t`를 직접 단정한다.

---

## 7. 못 본 것 (과장 방지)

1. **의상은 `default`만 봤다.** 동복(`winter`)과 액세서리 3종의 헐 두께는 실측하지 않았다. 단위 테스트는 액세서리가 헐을 갖는 것까지만 단정한다.
2. **v9 외형은 실화면으로 보지 않았다.** 같은 헬퍼를 쓰므로 수치는 같게 나오지만, v9 GLB의 파츠별 `h_i` 분포와 실제 화면은 이번에 찍지 않았다. 단위 테스트(픽스처 박스)만 통과했다.
3. **모바일 실기기·에뮬레이터에서 보지 않았다.** 데스크톱 Chrome dev 서버 한정이다. dpr 3 기기에서는 0.21 CSS px이 0.63 디바이스 px이 된다(계산값, 미실측).
4. **Studio 미리보기 화면을 열지 않았다.** `gameplay=false` 경로의 두께는 코드와 단위 테스트로만 확인했다.
5. **오니기리 미니 분신(두 번째 ref-3 모델)은 이번에도 보지 못했다.** Lv.8 해금이라 런이 닿지 않았다.
6. **프로덕션 빌드(`npm run build`)를 돌리지 않았다.** dev 서버에서 모듈이 정상 로드·렌더되는 것만 확인했다.
7. 2026-10-29 문서의 틈 메움 절대값과 이번 값은 포즈가 달라 10~25% 차이가 난다. before/after 비교는 **이번 세션 안에서 같은 포즈·같은 카메라**로 찍은 쌍만 썼다.

---

## 8. 종료 상태

- 커밋·푸시·checkout 없음. 변경 5개 + 신규 테스트 1개가 워킹 트리에 있다.
- Firebase: **읽기 1회(공개 정본 노드)만 했다. 쓰기·Apply 없음.**
- 런타임에서 건드린 것(frameloop, 카메라, 헐 scale, 오브젝트 visible, scene.background)은 전부 메모리 한정이고
  브라우저를 닫아 사라졌다. 소스에 QA용 임시 코드를 남기지 않았다.
- dev 서버(5173)는 **켜 둔 상태**다(프로젝트 정책상 5173은 상시 유지).
- `npm run browser:reserve` 가드를 통과해 브라우저 1개만 띄웠고 종료했다.
