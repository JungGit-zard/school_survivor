# Stage 4 중앙 압력 가마솥 — Close-up 원화 대비 재설계 감사

## 감사 범위와 고정값

- 이 문서는 읽기 전용 시각 감사다. `PressureCauldron.jsx`, 충돌체, 테스트, Stage 4 폭 재배치, Firebase에는 변경을 가하지 않는다.
- 원화 정본은 낮고 넓은 10각 백색 압력 가마솥이다. 현재의 게임/Graphics Studio 공용 트리, Firebase Studio id `stage-object-pressure-cauldron`, 정확한 중심 `[0, 0, 0]`, placement scale `1`, 공용 루트 선형 scale `0.2`는 유지한다.
- 아래 **raw-space** 수치는 `PressureCauldron.jsx` 안의 기존 모델 단위다. 공용 루트 `0.2` 뒤 실제 Stage 4 크기는 모든 길이가 정확히 1/5다.
- 모든 불투명 표면은 기존 depth-writing toon material을 사용하고, 제안된 외곽선은 기존 inverted-hull 방식(`BackSide`, `depthWrite:false`)만 쓴다. 새 텍스처·비트맵·투명 표면은 금지한다.

## 원화와 현재 모델의 차이

| 원화 정본 부품/실루엣 | 현재 `PressureCauldron.jsx` 관찰값 | 차이와 재설계 의도 |
| --- | --- | --- |
| 낮고 넓은 10각 백색 vessel | 10각이지만 raw 반경 `2.95/2.58`, 높이 `2.72`; 상부에서 상대적으로 세로가 길다 | vessel을 더 넓고 낮게 해, 단단한 조리 설비의 무게중심을 만든다. |
| 2~3단의 faceted lid | 얇은 3개 원통 층은 있으나 검정 rim이 지배적이다 | 백색 2단 경사 + 낮은 백색 cap의 3단으로 명확히 읽히게 한다. |
| 노란 U자 top handle | 노란 직선 bar와 두 짧은 사선 bar | 두 다리가 lid에 꽂히는 굵은 U자와 어두운 고정 블록을 분명히 한다. |
| top white safety valve와 top-right gauge | gauge가 전면 중앙, safety valve 없음 | 안전 밸브를 top-left/center, bezel·눈금·빨간 바늘 gauge를 top-right로 분리한다. |
| lid/body 둘레의 black latch·hinge blocks | 왼쪽 작은 dark housing만 있어 반복 리듬이 없다 | 전면 3 + 좌우 2의 latch, 후면 힌지 2를 추가해 뚜껑의 잠금 구조를 만든다. |
| 왼쪽 tall gray control cabinet | 작은 왼쪽 dark box (`0.38 × 0.72 × 0.72`) | vessel보다 높게 보이는 회색 캐비닛, vent/panel/fastener로 원화의 비대칭을 만든다. |
| 오른쪽 아래 large white auxiliary housing | 작은 오른쪽 dark box 하나 | 흰 보조 하우징과 어두운 상단 fittings로 큰 오른쪽 질량을 만든다. |
| 전면 twin black/yellow steps·pipes | 검정 단일 step, 흰 strip, pipe 1개 | 서로 분리된 두 black step과 yellow edge, 대칭 pipe 2개로 전면 읽기성을 높인다. |
| right/front red handwheel | 우측 측면 wheel만 있으며 hub/spoke 깊이가 약하다 | 우전면으로 옮기고 hub, 4 spokes, neck을 분명히 한다. |
| dark decagonal base | 10각 base는 있으나 vessel 대비 외곽선이 없다 | vessel보다 약간 큰 10각 2단 base와 외곽선으로 접지 실루엣을 고정한다. |
| 선명한 외곽선 | `Box` 일부만 outline; cylinder vessel/lid/base/gauge/handwheel 및 주요 형태는 outline 없음 | 주요 silhouette 전부에 기존 inverted-hull outline을 적용한다. outline은 `depthWrite:false`를 유지한다. |

## 구현용 raw-space 모델 제안

### 공용 형태와 색

공용 root와 StudioTunedGroup hierarchy는 바꾸지 않고, 아래 값은 그 안의 primitive 위치/크기만 바꾸거나 추가하는 제안이다. 색은 cached depth-writing toon material 팔레트로 제한한다: body `#F2F3EE`, shade `#D5D9D6`, dark `#242A2F`, edge `#111417`, yellow `#F2BF2E`, red `#C93A2F`, gauge face `#F7F6EE`, cabinet gray `#697078`.

| 그룹 | raw-space 위치/치수 제안 | 외곽선/세부 |
| --- | --- | --- |
| dark decagonal base | 10각 cylinder `(0, 0.24, 0)`, radius top/bottom `3.34/3.48`, height `.48`; upper ring `(0, .52, 0)`, `3.16/3.30/.16` | 두 층 모두 inverted-hull. 좌우 foot block은 `x=±2.50`, `y=.28`, size `.44/.38/1.40`. |
| low wide white vessel | 10각 cylinder `(0, 1.64, 0)`, radius top/bottom `3.18/2.86`, height `2.34` | bottom `.47`, top `2.81`; 큰 body는 surface + outline 모두 적용. |
| faceted 3-step lid | lower bevel `(0, 2.88, 0)`, `3.22/3.18/.18`; middle bevel `(0, 3.06, 0)`, `3.18/2.78/.26`; top cap `(0, 3.25, 0)`, `2.76/2.42/.16` | 모두 10각, white/shade/white 순. 검정 ring은 `2.46/2.40/.09`로 cap 바로 아래 한 줄만 유지. |
| yellow U handle | top bar `(0, 3.67, -.04)`, size `1.72/.28/.42`; legs `(-.74,3.47,-.04)`, `(.74,3.47,-.04)`, size `.28/.58/.42`, Z rotation `-.40/+ .40` | 세 box에 outline. leg 하단에 dark mounting block size `.44/.18/.52` 2개. |
| white safety valve | `(-.88, 3.52, .08)`에 dark stem radius `.13`, height `.20`; white cap radius `.27`, height `.18`; small red pin radius `.07`, height `.09` | cap/stem 모두 outline; final cap 지름 `.108`로 충분히 읽힌다. |
| top-right gauge | `(1.16, 3.46, .28)`의 dark bezel radius `.43`, depth `.18`; white face radius `.33`, depth `.035`; red needle size `.045/.23/.035` | face 앞에 6개 dark tick (`.035/.11/.02`)과 hub radius `.06`; bezel/face outline, gauge가 handle과 겹치지 않음. |
| black latch/hinge | front latch 3개 at `(-1.55,2.77,2.48)`, `(0,2.77,2.64)`, `(1.55,2.77,2.48)`, size `.46/.34/.26`; side latch 2개 at `x=±2.95,z=.52`; rear hinges 2개 at `x=±1.30,z=-2.52` | dark blocks + smaller yellow/gray catch each; 큰 검정 형태는 outline. |
| left gray control cabinet | body `(-3.46,1.45,.18)`, size `.78/2.18/1.18`; top cap `.86/.18/1.26`; front panel `z=.80`, `.52/.62/.05` | gray cabinet surface+outline; three horizontal vent strips `.44/.07/.04`, four `.10` fasteners, yellow status tab `.16/.32/.06`. |
| right lower white auxiliary housing | body `(3.38,.92,-.16)`, size `1.24/1.38/1.58`; dark top fitting `(3.38,1.68,-.16)`, `.96/.16/1.08`; two dark ports at `z=±.35` | white body, dark fittings, both outline. main vessel와 다른 낮은 큰 덩어리로 읽힌다. |
| right/front red handwheel | neck `(2.92,1.18,1.82)` dark cylinder; wheel center `(3.18,1.18,2.04)`, red radius `.68`, depth `.20`; hub radius `.20`, four spoke boxes length `1.30` | wheel/bezel/hub outline; spokes는 빨강, neck은 dark. wheel 최외곽은 raw `x=3.86,z=2.72`다. |
| front twin steps/pipes | steps at `(-.76,.28,3.38)`, `(.76,.28,3.38)`, each size `1.10/.34/.76`; yellow edge strips at `z=3.79`, each `1.10/.12/.10`; pipes at `x=±1.26,y=.62,z=3.08`, radius `.14`, length `.82` | 두 step·edge·pipe 모두 silhouette outline. pipe는 dark, yellow은 edge only. |

## 0.2 최종 크기에서의 읽기성 및 외곽선 규칙

- 구조부(손잡이 다리, latch, step edge, cabinet frame)는 raw 최소 두께 `.28`(최종 `.056`) 이상으로 한다.
- 기능 디테일(needle, gauge tick, vent, fastener, pipe)은 raw 최소 두께 `.16`(최종 `.032`) 이상으로 한다. 이보다 작은 장식은 생략하며, 색 대비와 외곽선으로 대체한다.
- `Box`뿐 아니라 `Cylinder`도 선택적 `outlined` 인자를 받아 surface와 같은 geometry의 약 `1.035` inverted hull을 한 장 더 렌더한다. body, 3단 lid, base 2단, safety valve, gauge bezel/face, wheel/hub, cabinet, auxiliary housing, step이 대상이다.
- outline material은 기존 `getStagePropOutlineMaterial(0.96, 0x050209)`만 쓰며 `depthWrite:false`는 절대 변경하지 않는다. 표면 material은 기존 `getStagePropDepthWritingToonMaterial`을 유지한다.

## 충돌체 envelope 제안 (후속 구현용, 이번 감사에서 미적용)

원화의 확장 부품을 보이기만 하고 통과시키지 않도록, placement scale `1` 기준의 **final world-space** AABB를 제안한다. 이 값은 raw-space 제안의 `0.2` 결과이며, Stage 4 start `[0,0,7]`와 중심 `[0,0,0]`을 바꾸지 않는다.

| collider key | final position | final size | 포함 대상 |
| --- | --- | --- | --- |
| `pressure-cauldron-vessel` | `[0, 0.36, 0]` | `[1.376, 0.592, 1.376]` | 10각 base+vessel의 안전한 주 footprint |
| `pressure-cauldron-front-twin-steps` | `[0, 0.056, 0.676]` | `[0.592, 0.112, 0.168]` | 두 전면 step/edge/pipes |
| `pressure-cauldron-left-cabinet` | `[-0.692, 0.290, 0.036]` | `[0.172, 0.436, 0.252]` | tall gray cabinet의 돌출부 |
| `pressure-cauldron-right-auxiliary` | `[0.676, 0.184, -0.032]` | `[0.248, 0.276, 0.316]` | right white housing과 dark fittings |
| `pressure-cauldron-handwheel` | `[0.636, 0.236, 0.408]` | `[0.168, 0.236, 0.184]` | wheel 최외곽·neck |

현재의 vessel/step 2-part collider는 위 실루엣 변경 후에는 작아진다. 후속 구현은 Stage 4의 전체 blocking footprint non-overlap, player start 안전성, LOS/obstacle consumer 회귀 테스트와 함께 이 5부품 proposal을 검증해야 한다.

## 성능·리소스 예산

- 모델은 단일 `PressureCauldron.jsx`와 하나의 Studio item id를 계속 공유한다. 별도 Studio preview model, bitmap, Firebase migration, placement-only scale은 만들지 않는다.
- `STAGE_PROP_UNIT_BOX_GEOMETRY`를 모든 box에 재사용한다. 10각 원통 geometry는 동일 치수·10 segment 조합별로 cached/memoized resource를 재사용하고 HMR dispose 대상에서 제외한다.
- 팔레트는 위 8개 cached toon material + 기존 cached outline material만 쓴다. 새 material을 primitive마다 만들지 않는다.
- 구현은 원화의 세부 부품을 유지해 surface 61개와 inverted-hull outline 20개, 총 약 81 meshes로 제한한다. latch/tick/vent/fastener/yellow edge/pipe는 불투명 surface만 쓰고, body/lid/base/gauge/white valve cap/housing body/dark step/wheel만 outline을 유지한다. 10각 low-poly 유지, texture/normal map/투명 decal/고세그먼트 원통은 쓰지 않는다.

## 수용 스크린샷 각도

1. **정면 약간 위**: 전면 twin step, 3 front latches, top-right gauge의 red needle와 yellow U handle이 서로 가려지지 않아야 한다.
2. **우전면 45°**: red handwheel, 큰 right white auxiliary housing, decagonal base의 외곽선이 한 실루엣으로 읽혀야 한다.
3. **좌전면 45°**: tall gray control cabinet의 vent/panel/fastener와 vessel의 낮고 넓은 비율이 확인되어야 한다.
4. **높은 우전면**: 2~3단 faceted lid, white safety valve, gauge bezel/ticks, latch 배치가 확인되어야 한다.
5. **Stage 4 gameplay 거리**: root `0.2` 상태에서 yellow/red/white/dark 네 색의 기능 구분과 주요 outer outline이 보이고, 가마솥·step·cabinet·handwheel collider 바깥에서 player가 시작해야 한다.

## 구현 수용 조건

- 어느 방향에서도 10각 base → 낮고 넓은 white vessel → 2~3단 lid → yellow U handle의 네 단계 실루엣이 읽힌다.
- 모든 주요 silhouette는 opaque depth-writing surface와 depthWrite:false inverted-hull outline을 함께 가진다.
- small detail은 above min thickness를 지키며, red handwheel, white safety valve, gauge red needle, black/yellow steps, cabinet/auxiliary housing을 구별할 수 있다.
- 최종 구현 전에는 이 문서의 collider proposal을 실제 geometry envelope와 대조하고 Stage 4 start/other props non-overlap 테스트를 갱신한다.
