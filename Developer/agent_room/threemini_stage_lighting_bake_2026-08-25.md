# 스테이지 색 구역 바닥 굽기 — 실시간 SpotLight 3개 제거

- 기록일: 2026-08-25
- 담당: threemini
- 대상: `Developer/r3f_prototype`
- 성격: 모바일 픽셀 셰이더 성능 회귀 수복 (시각 결과 유지)

## 1. 문제

조명 커밋 4건(`dae8986`, `20573e4`, `62dffc1`, `6649819`, `2b77f50`)이 스테이지 1·2·3에
`<StageLighting>` 경유로 **spotLight를 0 → 3개** 추가했다. Three.js는 광원 개수를
셰이더 상수(`NUM_SPOT_LIGHTS`)로 박아 컴파일하므로 픽셀마다 거리 감쇠 + 원뿔
`smoothstep`이 3회씩 붙고, `MeshToonMaterial` + gradientMap 경로에서는 광원당 종속
텍스처 페치가 1회씩 더 붙는다. 바닥이 화면 전체를 덮고 `dpr={[1, 1.5]}`이라 순수
풀스크린 필레이트 비용이었다. 스테이지 진입 시 프로그램 키가 바뀌어 전 머티리얼이
재컴파일되는 것이 "들어가면 일단 느려"의 진입 히치였다.

`castShadow={false}`라 그림자 비용은 없었다. 전부 픽셀 셰이딩 비용이다.

## 2. 택한 방식 — 바닥 `lightMap` CanvasTexture (버텍스 컬러 아님)

### 왜 버텍스 컬러를 쓰지 않았나

바닥은 `FloorPlane`의 `planeGeometry args={[width, depth]}` 하나뿐이고 세그먼트가
1×1이다. 부드러운 그라데이션을 내려면 세그먼트를 올려야 하는데, **Stage 2·3의 바닥
평면은 200 × 200 world units**이다(`FLOOR_SIZE = 200`; Stage 3는 `FloorPlane` 기본값).
색 얼룩 반경이 6~8 units이므로 얼룩 하나를 부드럽게 만들려면 0.5 units급 세그먼트가
필요하고, 그러면 200 units 평면에 400 × 400 = 16만 quad가 생긴다. Stage 1(20 × 28.8)만
버텍스 컬러로 가고 Stage 2·3만 텍스처로 가면 굽는 경로가 두 벌이 되므로 한쪽으로 통일했다.

### 왜 `lightMap`인가 (오버레이 quad·`emissiveMap` 아님)

- **추가 draw call 0.** 기존 바닥 메시/머티리얼 그대로, 텍스처 슬롯만 하나 더 쓴다.
  별도 평면을 얹는 방식은 draw 1개 + 알파 블렌딩 + 렌더 순서 문제를 만든다. 이 저장소는
  이미 Stage 3 코트 라인에서 `transparent + depthWrite:false + renderOrder` 조합이
  캐릭터 위로 떠 보이는 사고를 겪었다(`ClassroomFloor.jsx` Stage3Arena 주석).
- **결과가 원본과 수식이 같다.** three r164에서
  - 직접광: `RE_Direct_Lambert` → `irradiance * BRDF_Lambert(diffuseColor)`
  - lightMap: `lights_fragment_maps`에서 `irradiance += lightMapTexel.rgb * lightMapIntensity`
    → `RE_IndirectDiffuse_Lambert` → 같은 `irradiance * BRDF_Lambert(diffuseColor)`

  둘 다 `irradiance × diffuseColor × RECIPROCAL_PI`다. 같은 값을 넣으면 바닥 픽셀 결과가
  같다. `emissiveMap`은 albedo를 곱하지 않고 더하기만 해서 타일 무늬 위에 색이 붕 뜬다.
- 픽셀 비용은 **바닥 머티리얼에서 텍스처 페치 1회**뿐이다. 광원 1개가 붙이던 비용보다도
  작고, 다른 머티리얼(좀비·프롭·플레이어)에는 아예 붙지 않는다.

## 3. 프로파일에서 반경·페이드를 어떻게 유도했나

`src/lib/stageLightingProfile.js`는 **손대지 않았다.** 색 구역의 정본은 계속 그 파일
하나이고, 새 파일 `src/lib/stageFloorLightBake.js`가 그걸 읽어서 굽는다. 굽는 쪽에
좌표·색을 다시 적지 않는다(XP 곡선 3중 복제 사고와 같은 함정 회피). 회귀 테스트가
`stageFloorLightBake.js` 본문에 프로파일의 색 문자열이 나타나지 않는지 검사한다.

근사치를 새로 만들지 않고 **three r164가 SpotLight를 계산하는 식 그대로**를 바닥
평면(법선 +Y, y = 0)에 대해 옮겼다. 그래서 `angle`/`penumbra`/`distance`가 자동으로
반경·가장자리·감쇠가 된다:

| 프로파일 값 | 굽기에서의 역할 |
|---|---|
| `position`, `target` | `spotDirection = normalize(position - target)`. 원뿔 축이 바닥과 만나는 곳이 얼룩 중심 |
| `angle` | `coneCos = cos(angle)` → 얼룩 바깥 반경. 바닥 반경 ≈ (광원–타깃 거리) × tan(angle) |
| `penumbra` | `penumbraCos = cos(angle × (1 - penumbra))` → `smoothstep(coneCos, penumbraCos, angleCos)`의 페이드 폭 |
| `distance` | `getDistanceAttenuation(d, cutoff, decay=2)` = `1/max(d², 0.01) × (1 - (d/cutoff)⁴)²`. cutoff 밖은 정확히 0 |
| `color` × `intensity` | `THREE.Color.set()`으로 sRGB → linear 변환 후 곱 |
| 바닥 법선 +Y | `NdotL`이 정규화 방향의 y성분 그대로 |

굽는 값 = `NdotL × color × intensity × 거리감쇠 × 콘감쇠`. 세 광원을 합산한다.

### 캔버스 범위와 UV 변환

- **한 변(span) = 2 × max(|position.x| + distance, |position.z| + distance).** 광원은 자기
  `distance` 컷오프 밖으로 정확히 0을 내므로, 이 범위까지 구우면 캔버스 테두리가 정확히
  검게 나온다(실측: 세 스테이지 모두 테두리 최대 바이트 = 0). 그래서 `ClampToEdgeWrapping`
  으로 바깥 영역도 자동으로 무광이 된다. Stage 1 span = 55, Stage 2·3 span = 68.
- 바닥 평면은 span과 크기가 다르므로 텍스처 `repeat`/`offset`으로 맞춘다.
  `planeGeometry`는 uv(0,0)이 로컬 (-w/2, -h/2)이고 `rotation=[-π/2,0,0]`을 거치면
  로컬 +Y가 월드 -Z가 되므로 `u = (x + w/2)/w`, `v = (h/2 - z)/h`다. 따라서
  `repeatX = w/span`, `offsetX = 0.5(1 - w/span)` (Y도 같은 꼴). 이 식은 테스트로 고정했다.
- 해상도 **256**. span 68 기준 0.27 units/texel이고 카메라가 가로 약 68 units를 보므로
  텍셀 하나가 화면 4px 남짓이다. 완만한 원형 그라데이션이라 bilinear로 충분하다.
  굽기 실측 3.2 ~ 13.7 ms(첫 호출은 JIT 웜업 포함), 메모리 256 KB/스테이지.

### 8bit 저장

실제 irradiance 최댓값은 1을 넘는다(Stage 1 peak 3.407, Stage 2 3.735, Stage 3 2.855).
캔버스는 0~1만 담으므로 peak로 정규화해 굽고 그 peak를 `lightMapIntensity`로 되돌려
곱한다. 어두운 감쇠 구간의 밴딩을 줄이려고 sRGB로 인코딩해 저장하고
`texture.colorSpace = THREE.SRGBColorSpace`로 디코드시킨다.

굽기 결과를 디코드해 해석값과 대조한 실측(각 스테이지 3개 target 지점):

```
stage1 target(0,-9) #3CCBFF  exact=[0.101, 1.336, 2.236] baked=[0.097, 1.299, 2.172] maxErr=0.0643
stage1 target(0, 0) #B96CFF  exact=[0.423, 0.141, 0.860] baked=[0.407, 0.135, 0.825] maxErr=0.0350
stage1 target(0, 9) #FFD166  exact=[2.236, 1.426, 0.297] baked=[2.219, 1.405, 0.295] maxErr=0.0205
stage2 target(0,-12) #D85CFF exact=[0.923, 0.144, 1.344] baked=[0.949, 0.148, 1.368] maxErr=0.0267
stage2 target(0,  0) #FFB45B exact=[1.298, 0.592, 0.136] baked=[1.242, 0.571, 0.128] maxErr=0.0558
stage2 target(0, 12) #5E86FF exact=[0.168, 0.359, 1.505] baked=[0.174, 0.373, 1.561] maxErr=0.0558
stage3 target(0,-11) #54C7FF exact=[0.113, 0.728, 1.276] baked=[0.113, 0.726, 1.271] maxErr=0.0044
stage3 target(0,  0) #A77BFF exact=[0.374, 0.192, 0.967] baked=[0.356, 0.185, 0.923] maxErr=0.0444
stage3 target(0, 11) #F08CFF exact=[1.111, 0.335, 1.276] baked=[1.118, 0.341, 1.287] maxErr=0.0116
```

오차는 대부분 텍셀 중심 샘플링 위치 차이(2~5%)이고 8bit 양자화 때문이 아니다.

## 4. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/lib/stageFloorLightBake.js` | 신규. 프로파일 → 바닥 lightMap CanvasTexture 굽기 |
| `src/lib/stageFloorLightBake.test.js` | 신규. 유도 계약 + 감쇠 + UV 변환 테스트 |
| `src/components/ClassroomFloor.jsx` | 굽기 결과를 바닥 머티리얼 `lightMap` 슬롯에 연결, `getFloorPlaneSize` 추가 |
| `src/components/Game.jsx` | `<StageLighting>` 마운트와 import 제거 (광원 재추가 금지 주석 남김) |
| `src/components/StageLighting.jsx` | **삭제** — 유일한 spotLight 생성 지점이었다 |
| `src/components/StageLighting.test.js` | **삭제** — spotLight 존재를 계약으로 박고 있었다 |
| `src/components/Game.stageLighting.test.js` | 재작성. **씬의 spotLight 0개**를 회귀 방지선으로 고정 |
| `src/components/ClassroomFloor.test.jsx` | 바닥 머티리얼 생성 문자열 1줄 갱신 |
| `src/lib/stageLightingProfile.js` | **변경 없음** — 색 구역 정본 유지 |
| `src/lib/stageLightingProfile.test.js` | **변경 없음** — 그대로 통과 |

Stage 4는 프로파일 항목이 없어 `getStageLightingProfile('stage4')`가 빈 배열을 내고
굽기가 `null`을 반환한다. 바닥 머티리얼이 `lightMap` 없이 기존 그대로 만들어진다.
`ambientLight` 1 + `directionalLight` 2는 손대지 않았다.

## 5. 남는 시각 차이 (숨기지 않고 기록)

1. **색이 바닥에만 남는다.** 실시간 SpotLight는 색 구역 안에 선 좀비·플레이어·프롭·
   Stage 3 아레나 벽까지 물들였다. 굽기는 바닥 픽셀만 물들인다. 캐릭터가 파란 구역에
   들어가도 이제 캐릭터 자체는 파랗게 물들지 않는다. 이것이 이번 작업의 가장 큰 시각 차이다.
2. **높이 방향 그라데이션이 없다.** 바닥 y=0 평면 한 장에 구웠으므로 Stage 3 아레나 벽
   아랫부분에 색이 번지던 효과가 사라진다.
3. **Stage 2 뒤쪽(z=-12) 자홍 얼룩의 가장자리가 약간 각져 보일 수 있다.** 그 얼룩은 원뿔이
   아니라 `distance: 16` 컷오프가 먼저 끊는다 — 실시간 조명일 때도 같은 모양이었으므로
   재현 결과이지 새 결함은 아니다.
4. 텍셀 보간 때문에 얼룩 가장자리가 이론값보다 아주 미세하게 부드럽다(2~5% 오차 범위).

바닥 얼룩 자체의 위치·색·반경·페이드는 프로파일 값 그대로다.

## 6. 검증

실행한 명령과 결과만 적는다.

```
npx vitest run src/lib/stageLightingProfile.test.js src/lib/stageFloorLightBake.test.js \
               src/components/Game.stageLighting.test.js src/components/ClassroomFloor.test.jsx
→ Test Files 4 passed (4) / Tests 35 passed (35)

npm run build
→ ✓ built in 619ms
→ Legacy B02 artifact gate passed (dist).
→ Hosting JavaScript asset verification passed (59 assets checked).
```

전체 스위트(`npx vitest run`)는 14개 파일 21건이 실패하지만, 동일한 14파일 21건이
**변경 전 clean HEAD(`git archive HEAD` 읽기 전용 사본)에서도 같은 줄 번호로 실패**한다.
Firebase hydrate fail-closed, 타이틀 `playerVisualReady`, 프롭 배치, 무기 영구 업그레이드
관련이며 조명·바닥과 무관한 기존 실패다.

CRLF 오염 없음:

```
git diff --numstat                    == git diff --numstat --ignore-cr-at-eol
30 5 ClassroomFloor.jsx / 2 1 ClassroomFloor.test.jsx / 4 2 Game.jsx
66 9 Game.stageLighting.test.js / 0 41 StageLighting.jsx / 0 28 StageLighting.test.js
```

시각 확인: 실기기·브라우저 스크린샷은 찍지 않았다(게임 진입에 Google 로그인이 필요해
헤드리스 캡처가 불가능하다). 대신 굽기 결과 캔버스를 PNG로 뽑아 직접 눈으로 확인했다 —
세 스테이지 모두 뒤/중앙/앞 색 얼룩이 프로파일 target 위치에 프로파일 색으로,
부드러운 가장자리로 찍혔다. 임시 PNG는 세션 스크래치패드에만 있고 저장소에 남기지 않았다.

## 7. 회귀 방지선

`src/components/Game.stageLighting.test.js`가 `src/` 전체(테스트 파일 제외)를 훑어
`<spotLight` 와 `new THREE.SpotLight`가 **하나도 없음**을 단언한다. 이 단언이 이번 성능
회귀 해소의 유일한 판정 기준이다. 색 구역을 다시 조명으로 만들려는 변경은 이 테스트에서
막힌다.
