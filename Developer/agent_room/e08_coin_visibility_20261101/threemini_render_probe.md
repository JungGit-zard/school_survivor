# E08 코인 좀비 화면 미표시 — threemini 렌더 경로 조사 (2026-11-01)

- 역할: threemini, 조사 전용 (코드 수정 없음). 라우팅 receipt 7af28611.
- 기준 트리: `C:\Dev\ezs-cf2` (zombie_only, HEAD 5f88e2c0). Enemy.jsx는 `git show HEAD:` 사본으로만 읽음.
- 실행한 것: 소스 읽기, `PooledEnemyVisuals.js`를 node로 import해 파트 필터 값 확인(아래 증거), 카메라 화면 범위 수치 계산. vitest·dev 서버·브라우저·빌드는 실행하지 않음.

## 0. E08은 어느 경로로 그려지나 (확정)

- `Enemies.jsx:1161-1168` `isPooledEnemyType`: 타입 코드 1~16은 풀(pool) 경로. E08 = 코드 16 (`enemyEntityPool.js:27,54`).
- 따라서 E08은 개별 `Enemy`/`ZombieMesh` 컴포넌트가 아니라 **`ZombieInstanceLayer.jsx`(InstancedMesh 레이어)** 가 그린다.
  - HEAD `Enemy.jsx:626` `INSTANCED_TYPES`는 E01~E06뿐이지만, E08은 애초에 `<Enemy>`로 마운트되지 않는다 (`Enemies.jsx:1642` 풀이 아닌 타입만 개별 마운트).
  - `ZombieMesh.jsx:1489` E08 분기(`CoinJingleZombieMesh`)는 게임 중엔 쓰이지 않는다 (타이틀/프리뷰용).
- E08 파트 테이블: `ZombieInstanceLayer.jsx:67-69` `COIN_JINGLE` 15파트. 슬롯 시작 `COIN_JINGLE_OFFSET` = STANDARD 12 + RUN 21 + RZT 16 + RZG 17 = **66** → E08 파트 슬롯은 **66~80** (`ZombieInstanceLayer.jsx:91-93`).

## 1. 원인 후보 (확신도 순서)

### 후보 1 — 확신도: 높음 — 먼 거리 단계(FAR)에서 E08 파트가 하나도 그려지지 않음

- 근거:
  - `ZombieInstanceLayer.jsx:246` 파트 루프는 `shouldRenderPooledEnemyPart(type, posed ? j : slot, tier)`를 호출한다. E08은 포즈형이 아니므로 **슬롯 번호 66~80**이 넘어간다.
  - `PooledEnemyVisuals.js:59-76` `shouldRenderPooledEnemyPart`에는 타입 13·14·7·8 전용 분기만 있고, 16(E08)은 기본 분기로 떨어진다. 기본 분기의 FAR 규칙은 `partIndex === 0||3||4||6||8||10`(`:75`), 즉 **E01 슬롯 번호(0~11)를 전제로 한 규칙**이다. 66~80은 하나도 걸리지 않는다.
  - 실측 (node로 import): `E08 slots66-80 FAR 000000000000000 / MID 111111111111111 / NEAR 111111111111111`. 비교용 E01 FAR는 `100110101010`(6개 파트 표시).
  - FAR 단계에서는 체력바도 안 그린다 (`ZombieInstanceLayer.jsx:247` `if(tier!==ENEMY_RENDER_FAR)`). 그래서 **남는 건 바닥 그림자 원 하나뿐**이다 (`:245`). 사용자 눈에는 "코인 좀비가 없다".
  - FAR 판정: 화면 안(`screenBounds`, `Game.jsx:171-174`)이면서 플레이어와의 거리가 11 units(2.75 블록) 초과 (`PooledEnemyVisuals.js:39,41-47`).
- 화면 중 FAR 구역 비율 (카메라 fov 30, 높이·후방 17 기준, 플레이어가 화면 중심일 때 계산): **16:9 가로 약 32%, 4:3 약 22%, 세로 폰(9:19.5) 약 11%**. 화면 위쪽 띠와 위쪽 양 모서리가 여기에 해당한다. 맵 가장자리에서 카메라가 고정되어 플레이어가 화면 중심에서 벗어나면 이 비율은 더 커진다.
- E08 동작과의 결합: 감지 4.5 / 해제 6.25 units에서 도주를 멈추고, 그 뒤엔 자기 출발점(home)으로 돌아가 주변 1.2 units를 맴돈다 (`enemySimulation.js:35-40,383-436`). 플레이어가 멀어져도 E08은 출발점 근처에 남는다 → **화면 안이지만 11 units 밖에 있는 시간이 길다.** "가끔 안 보인다"는 증상과 맞는다.
- 재현 조건: 아무 스테이지(1~5)에서 90초 또는 180초에 E08이 나온 뒤(플레이어 4~6.5 units 거리, `Enemies.jsx:156-157,300-304`), 플레이어가 반대쪽으로 걸어가 E08이 **화면 위쪽이나 가로 끝 쪽에 보이는 상태로 11 units를 넘기면** 몸·외곽선·체력바가 사라지고 그림자만 남는다. 11 units 안으로 돌아오면 다시 나타난다. 가로 화면(데스크톱)에서 가장 잘 재현된다.
- 최소 수정안 1줄: `PooledEnemyVisuals.js` `shouldRenderPooledEnemyPart`에 `if (type === 16) return true` 추가 (E08은 동시에 최대 2마리라 비용은 무시할 수준이다. RZG(14)와 같은 처리).
- 검증 테스트 1줄: `PooledEnemyVisuals.test.js`에 `for (let s = 66; s <= 80; s++) expect(shouldRenderPooledEnemyPart(16, s, ENEMY_RENDER_FAR)).toBe(true)` 추가. 재발 방지용으로는 "모든 풀 타입 코드가 FAR에서 최소 1개 파트(머리 또는 몸통)를 그린다"는 단언(`resolvePooledZombieVisual`의 slotBase/partCount로 순회)이 더 낫다.

### 후보 2 — 확신도: 중간 (단독으로 "안 보임"을 만들진 않음, 후보 1을 키움) — 스폰 위치 대체 경로가 플레이어에서 먼 곳을 고를 수 있음

- 근거: `Enemies.jsx:288-298` `spawnPosOnValidRing`는 4.0~6.5 units 원 위 후보가 막히면 `findNearestFreeSpawnPosition`(`:234-243`)으로 넘어간다. 이 대체 경로는 축 방향 1.2 units 간격으로 최대 4칸(4.8 units)까지 밀어낸다(`:163-167`). 그래서 home이 플레이어에서 최대 약 11.3 units 떨어질 수 있다. 렌더 단계 경계값인 11 units와 거의 같아서, 처음부터 FAR 구역(후보 1에 걸려 그림자만 보임)에서 시작해 그 근처를 맴돌 수 있다. 세로 화면에서는 원 위의 가로 방향 후보 대부분이 화면 밖(가로 가시 반폭 2.4~4.2 units)이라 화면 밖에서 시작한다. 이건 정상적인 컬링이며 levelmini의 주원인 판단과 같다.
- 재현 조건: 가구·장애물이 많은 스테이지에서 플레이어가 벽이나 구석에 붙은 채 90초/180초를 맞는 경우.
- 최소 수정안 1줄: 스폰 위치 결정은 levelmini 담당이다. 렌더 쪽에서는 후보 1 수정만으로 "화면 안인데 안 보임" 상태가 사라진다.
- 검증 테스트 1줄: `Enemies.test.jsx`에서 원 위 후보가 막힌 장애물 배치로 `randomSpawnPos('E08', …)`를 호출하고, 결과와 플레이어의 거리(≤ 6.5 + 4.8)를 기록·단언.

### 후보 3 — 확신도: 낮음 — 스튜디오 배선 누락으로 게임 속 E08이 기본 크기·색으로만 그려짐 (작고 어두움)

- 근거:
  - `ZombieInstanceLayer.jsx:117` `STUDIO_TUNED_TYPE_CODES`에 16이 없다. 그래서 `rootMatrices[16]`이 IDENTITY가 되고 파트 튜닝도 0이다 (`:243` refresh 루프, `:245` `||IDENTITY`).
  - `graphicsStudioConfig.js:186` 스튜디오 적 목록에 E08이 없어서 그래픽 스튜디오에서 E08을 선택할 수 없다. 반면 `ZombieMesh.jsx:1491`은 `StudioTunedGroup itemId='zombie-e08'`로 감싸져 있어 프리뷰/타이틀 쪽과 게임 쪽 연결이 서로 다르다.
  - 게임 속 크기는 `scale 0.92 × ENEMY_SIZE_MULTIPLIER × 0.333`(`Enemy.jsx(HEAD):463`, `ZombieInstanceLayer.jsx:245`)이다. 몸 색 `0x5a3b16`(짙은 갈색, `ZombieMesh.jsx:35`)에 거의 검은 외곽선이 붙는다. 어두운 바닥·조명 프로필에서는 대비가 약하다. 원근 카메라라서 화면 아래쪽(앞쪽)의 키 큰 소품에 가려질 수도 있다.
- 재현 조건: 어두운 조명 스테이지(조명 프로필 `stageLightingProfile.js`는 다른 에이전트가 수정 중이라 HEAD 기준 확인 필요)에서 E08이 가구 뒤쪽(화면 위쪽)에 있을 때.
- 최소 수정안 1줄: 사용자가 승인하면 E08을 스튜디오 목록에 등록하고 `STUDIO_TUNED_TYPE_CODES`에 16을 추가해 Studio와 게임 수치를 맞춘다 (절대 동일성 법칙 범위. Firebase 정본 값을 대신할 로컬 기본값은 만들지 않는다).
- 검증 테스트 1줄: `resolvePooledZombieVisual(16).studioTuned === true`와 스튜디오 카탈로그에 `zombie-e08`이 있는지 단언.

## 2. 점검했지만 원인이 아닌 것 (배제)

- frustum 컬링·boundingSphere: 모든 InstancedMesh가 `frustumCulled = false`다 (`ZombieInstanceLayer.jsx:160-163`). 컬링은 `screenBounds` 사각형 판정만 한다. 화면 밖으로 도망간 E08이 안 보이는 건 정상 동작이다.
- `'chamfer2'` 형상: `im()`가 `part[6]==='chamfer2'`면 2단계로 처리하고, `toon.js:99 getCachedChamferedBoxGeo(…, steps)`가 이를 지원한다. 파싱 실패나 조용한 건너뛰기는 없다. 8번째 칸은 형상 선택에만 쓰이고, 파트 루프는 `part[0..5]`만 읽는다. `part[7]`(pose)과 `part[8]`(box)은 E08에선 undefined라서 0/생략으로 정상 처리된다.
- `count` / `instanceMatrix.needsUpdate`: `counts[slot]`을 슬롯별로 세고 매 프레임 `markFrameMeshes`로 앞부분을 갱신한다 (`:251-252`). E08 슬롯 66~80도 `ALL_PARTS`에 포함되어 InstancedMesh가 생성된다 (`:93,212`).
- 출현 직후: `SPAWN_REVEAL_MS` 300ms 동안은 연기만 보이고 몸은 숨긴다. 모든 타입이 같다 (`:244`).
- 풀 재사용: `enemyEntityPool.js:325-372`(할당)와 `:480-501`(해제)에서 state, timer, homeX/Z, hitFlash를 모두 다시 쓴다. 렌더러는 `resetKey`마다 행렬·색·알파를 초기화한다 (`ZombieInstanceLayer.jsx:225-261`). E08만 놓치는 시각 상태는 없다.
- y 좌표·스케일 0·투명도: `posY`는 스폰 `BASE_COL_Y*scale`이고 `visualScale`은 0 이상만 허용한다 (`enemyEntityPool.js` 검증). 몸 재질은 불투명 MeshToon이고 E08만의 알파/레이어 마스크는 없다.
- 확장 레이어 충돌: `isExpansionNormalCode`는 17~31만 해당한다 (`expansionVisuals.js:80`). 16과 겹치지 않는다.
- 도주 로직(렌더 관점 한 줄): 도주는 맵 경계 안쪽 1.1 units에서 반사되므로(`enemySimulation.js:404-405`) 맵 밖으로 나가지 않는다. 다만 맵이 화면보다 넓어서 화면 밖으로 나가는 건 정상 컬링이다. 위치 쪽은 levelmini가 판정한다.
- 스테이지 1~5 차이: `getRuntimeSpawnEventsForStage`가 모든 스테이지에 90s/180s 이벤트를 똑같이 붙인다 (`burstEvents.js:335-337`). 렌더러에 스테이지별 분기는 없다. 차이는 화면 비율, 맵 크기에 따른 카메라 고정, 조명뿐이다.

## 3. 코디네이터 추가 확인 2건 (levelmini 결과 연계)

### (1) 실제 버스트 스폰 높이 0.29u와 치트 소환 0.52u: 바닥에 묻히거나 z-fight가 생기는가 → 렌더 원인 아님

- 버스트: `y = BASE_COL_Y 0.24 × scale 0.92 × ENEMY_SIZE_MULTIPLIER 4/3 = 0.294` (`Enemies.jsx:152,288-290`). 치트: `0.42 × 0.92 × 4/3 = 0.515` (`HUD.jsx:134-151`). 시뮬레이션은 posY를 다시 쓰지 않는다 (`enemySimulation.js:660` 읽기만 함).
- 렌더 배율 = `visualScale(0.92×4/3) × 0.333 = 0.409` (`ZombieInstanceLayer.jsx:245`). 로컬 좌표 기준 가장 낮은 파트 위치:
  - foot 바닥 −0.63 (피벗 0, 오프셋 −0.57, 반높이 0.06) → 월드 `0.294 − 0.63×0.409 = 0.037`
  - coinBag 바닥 +0.09 → 월드 0.33
  - handCoin: 팔이 −1.15rad 앞으로 들려 있어 약 +0.36 → 월드 0.44
  - 즉 **coinBag·handCoin은 바닥보다 0.3u 이상 위에 있다.**
- 바닥 오버레이 평면 최고 높이는 약 0.03u다 (`Floor.jsx:201,215` group 0.012 + 0.018. HEAD `ClassroomFloor.jsx` 0.015/0.02). 발바닥과의 간격은 약 0.007u로 가깝지만, **E01도 같은 비율**이다 (0.32 − 0.63×0.444 = 0.040). 높이와 배율이 둘 다 scale에 비례하므로 E08만 묻히는 일은 없다. 겹칠 가능성이 있는 곳도 신발 밑면 몇 픽셀뿐이라 "몸 전체가 안 보임"은 만들 수 없다.
- 치트(0.52u)에서는 E08이 0.22u 떠 있어서 오히려 더 잘 보인다. 치트로 검수할 때 버스트 스폰과 화면이 다른 이유가 이것이다. 버스트 스폰이 보이지 않는 원인은 아니다.

### (2) FAR 단계(LOD)에서 E08 본체가 그려지는가, E08만 빠지는 분기가 있는가 → **있다 (후보 1, 렌더 원인 확정)**

- `shouldRenderPooledEnemyPart`의 기본 분기 FAR 규칙(`PooledEnemyVisuals.js:75`)은 E01 슬롯 번호(0,3,4,6,8,10)만 통과시킨다. E08 슬롯 66~80은 전부 제외된다 (node 실측 `000000000000000`). 체력바도 FAR에서는 생략되므로 남는 건 그림자뿐이다.
- 같은 함수에서 RZT(13)·RZG(14)·RUN(7/8)은 전용 분기로 FAR 핵심 파트를 지킨다. E07(15)은 이 레이어에서 파트가 0개라 해당 없다. **본체가 통째로 빠지는 타입은 E08(16) 하나다.**
- 따라서 levelmini의 주원인(세로 화면에서 화면 밖에 스폰된 뒤 제자리 배회, 비렌더)과 **별개로**, 렌더 쪽에도 독립된 원인이 있다. 이 원인은 화면 안이면서 플레이어로부터 11u 밖일 때 발생한다: 가로 화면 위쪽 띠와 양 모서리(16:9 기준 화면의 약 32%), 세로 화면 위쪽 끝(약 11%).

## 4. 결론

후보 1이 "화면 안에 있는데 안 보임"을 직접 만든다. 이건 코드상 확정된 결함이다 (E08 슬롯 66~80이 FAR 규칙의 E01 전용 인덱스 표에 걸리지 않음). 후보 2는 그 상태가 오래 이어지게 만들고, 후보 3은 보이는 상태에서도 잘 눈에 띄지 않게 만든다. 실제 화면 재현(RED/GREEN)은 이번 조사에서 하지 않았으므로 **미검증**이다.
