# 주인공·스테이지 보스 B01~B04 파셋 저폴리 구현 브리프

- 작성일: 2026-08-23
- 범위: 플레이어와 B01~B04의 3D 카툰 외형만 저폴리 파셋 문법으로 전환한다.
- 기준: `school_survivor_ForTheKing풍_저폴리_그래픽_실행계획.md`의 원리(실루엣, 큰 면, 접지, 짧은 파츠 애니메이션)만 적용한다. 특정 외부 IP의 캐릭터, 비율, 복장, 무기, 색 배치는 복제하지 않는다.
- 제외: 카메라, 물리 좌표/충돌체, 보스 HP·속도·공격 타이밍, 스테이지 밸런스, Firebase/Auth, 타이틀 프레젠테이션, 신규 오디오·VFX.

## 1. 공통 비주얼 계약

프로젝트 고유 스타일 문장은 **“종이 공작과 보드게임 말을 섞은 파셋형 학교 판타지”**다. 작은 화면에서는 눈·문양 대신 머리, 어깨, 손에 든 물건, 등짐의 큰 덩어리로 읽힌다.

- 모든 캐릭터는 현재 `MeshToonMaterial`과 인버티드 헐 외곽선을 계속 사용한다.
- 각 주 파츠의 `BoxGeometry`는 아래 `geometryKind`로만 치환한다. `tetra`(4면), `wedge`(쐐기), `octa`(8면), `dodeca`(12면), `lowCylinder`(6면), `lowCone`(5~6면), `flatDisc`(6면) 중 하나를 쓴다. smooth normal, normal map, PBR, 새 텍스처는 추가하지 않는다.
- 3단 툰 명암의 기준값은 어두움 55%, 중간 78%, 밝음 100%이다. 일반 의상·피부의 emissive는 `0`; 눈, 랜턴 렌즈, 감염 표식처럼 정보 전달이 필요한 작은 강조부만 `0.25~0.45`다.
- 외곽선 색은 짙은 자주회색 `#241C2A`를 목표로 하고, 외곽선 팽창은 주 실루엣 `1.04~1.06`, 내부 장식 `1.01~1.02`다. Studio에서 이미 승인된 색·외곽선 값은 이 시작값으로 덮어쓰지 않는다.
- 접지 그림자는 현재 플레이어 원형 그림자 위치와 보스의 발 중심을 보존한다. 반투명 검정 `0.18~0.26`, `depthWrite=false`, 바닥보다 `y=0.015` 위만 허용한다. 발, 그림자, 물리 충돌 중심이 분리되어 보이면 불합격이다.
- 스켈레톤은 추가하지 않는다. 현재 `head/body/armL/armR/legL/legR` 피벗과 `animPhase`만 사용한다.

## 2. Studio·런타임 불변 조건

- 대상 파일은 `PlayerMesh.jsx`, `ZombieMesh.jsx`, `StageBossPreview.jsx`, `GraphicsStudioPreview.jsx`이며, Studio/게임/타이틀은 같은 모델 트리와 Firebase의 같은 승인 revision을 소비해야 한다.
- 구현 시 `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`의 base transform 캡처 → 위치 합산·스케일 곱셈·회전 합산 → base 복원 순서만 사용한다. 별도 변형 저장·적용 경로는 금지한다.
- 파츠 선택 키가 자식 순서 숫자 경로일 수 있으므로, 기존 `StudioTunedGroup` 아래의 그룹 순서와 `head/body/armL/armR/legL/legR` 피벗은 바꾸지 않는다. 기존 `ZBlock` 수·순서를 유지한 채 각 블록의 geometry만 `geometryKind`로 치환한다.
- B02는 현행 `stage2-boss-v2`만 쓴다. 구형 B02, `id:b02-face-texture`, 과거 캡처/튜닝/코드의 복구·변환·fallback은 절대 사용하지 않는다.
- 본 문서의 색과 수치는 아트 제작 목표다. Firebase에 이미 승인된 Studio 값의 대체값, 로컬 시드, localStorage 기본값으로 사용하지 않는다.

## 3. 개별 캐릭터 사양

| 대상 | 실루엣 기억점 3개 | 주 파츠와 면 예산 | 색 역할 | 애니메이션 영향 |
| --- | --- | --- | --- | --- |
| 주인공 | 왼쪽으로 흐르는 분홍 쐐기 머리, 벌어진 빨간 재킷, 청록 가방/랜턴 | 10~12개 rigid part, 표면 900~1,150 triangles | 머리 `#FF8FB0`, 재킷 `#C9323C`, 가방 `#2AAAC9`, 피부/밝은 면, 소울 `#241C2A` | 기존 보행·가방 휘두르기·랜턴 조준 피벗 유지 |
| B01 수학 교사 | 비스듬한 오각 머리, 긴 넥타이 쐐기, 한 손의 삼각자 | 11~13개, 1,300~1,600 triangles | 먹청 재킷 `#1D2732`, 황록 피부 `#9FB87A`, 벽돌색 넥타이 `#9F2222`, 노랑 삼각자 `#F6C844`, 어두운 신발 | `special`에서 삼각자만 가시화; warn/charge는 몸통 기울기만 보강 |
| B02 복도 봉쇄 반장 | 뒤쪽 육각 번, 넓은 사다리꼴 블레이저, 길게 늘어진 출입 배지 | 12~14개, 1,350~1,650 triangles | 남청 블레이저 `#26384E`, 푸른 창백 피부 `#8FB0D8`, 회백 셔츠, 적갈색 타이, 청록 배지 | 현재 B02 보행/돌진 주기만 사용. 봉쇄선 상태와 모델 애니메이션을 연결하지 않음 |
| B03 체육 교사 | 넓은 오각 어깨, 낮은 머리띠 쐐기, 큰 6면 운동화 | 12~14개, 1,400~1,750 triangles | 딥블루 저지 `#18324A`, 석회 피부 `#91AD68`, 백색 라인, 붉은 손목밴드 | 현재 셔틀런/돌진 동안 어깨 전방 기울기와 팔 펌핑만 크다 |
| B04 급식실 셰프 | 다섯 덩이의 높은 요리모, 다이아몬드 앞치마, 넓은 국자 손 | 13~15개, 1,500~1,900 triangles | 따뜻한 백색 조리복 `#F2EFE2`, 올리브 피부 `#7FA65A`, 적색 스카프, 탄색 국자, 짙은 신발 | 1페이즈는 국자 손이 먼저 향하고, 2페이즈 돌진은 모자·앞치마가 몸통 기울기를 따라간다 |

### 주인공 세부

- `PlayerMesh.jsx`의 현재 `head`, `hairTop`, `hairFr`, `hairSL`, `hairSR`, `hairTail`, `hairClip`, `bag`, `slvL`, `slvR`, `legL`, `legR`, `lantern` 그룹을 그대로 둔다.
- 머리는 `dodeca`, 앞머리는 `wedge`, 옆머리/꼬리는 `lowCone` 또는 비대칭 `wedge`, 재킷은 위가 좁고 아래가 넓은 `wedge`, 가방은 얇은 `wedge`, 신발은 앞이 넓은 6면 쐐기로 전환한다.
- `PLAYER_FLOOR_LIFT`, `PLAYER_MESH_SCALE`, `PLAYER_MESH_LAYOUT`, hit-flash, 스텐실 render order와 그림자 anchor는 그대로 둔다. 외형 변경으로 플레이어의 중심이나 발 높이를 보정하지 않는다.

### B01 세부

- `B01BossZombieMesh`의 `head/body/armL/armR/legL/legR/mathSetSquare` 그룹과 기존 얼굴 데칼·`BossFacePartsOverlay`는 유지한다.
- 머리 `dodeca`, 머리카락 `wedge` 2개, 재킷 몸통 사다리꼴 `wedge`, 넥타이와 재킷 찢김은 얇은 `flatDisc`/`wedge`, 삼각자는 3개의 5면 막대로 바꾼다.
- 특수공격의 보이는 시간과 타격 판정은 건드리지 않는다. 삼각자는 현재 `mathSetSquare.visible`가 true인 `special`에만 보인다.

### B02 세부

- `B02Stage2BossMesh`의 v2 그룹, 현행 얼굴 데칼, `BossFacePartsOverlay`와 `getStudioZombieItemId('B02') === 'stage2-boss-v2'`를 보존한다.
- 머리는 작은 `dodeca`, 앞/옆/뒤 머리는 5면 `wedge`, 번은 `lowCylinder(6)`, 블레이저 몸통은 넓은 어깨의 `wedge`, 치마는 역사다리꼴 `wedge`, 출입 배지는 얇은 `flatDisc`다.
- `b02CorridorBlockade`의 telegraph/active/completed/future 바닥선은 별도 전투 시각이며 변경하지 않는다.

### B03 세부

- `B03PhysicalEducationBossMesh`의 머리·어깨·몸·양팔·양다리 피벗 및 얼굴 데칼을 보존한다.
- 어깨는 좌우가 넓은 6면 쐐기, 상체는 큰 `dodeca`를 세로로 납작하게 변형, 이두/주먹은 `octa`, 머리띠는 얇은 6면 고리, 운동화는 전방이 넓은 `wedge`다.
- 왕복 오래달리기의 레인 색·예고·피해 시간은 그대로다. 모델은 현재 `charge` 기울기와 보행 파츠 회전만 사용한다.

### B04 세부

- `B04ChefBossMesh`의 모자·머리·몸·팔·앞치마·골반·다리 계층과 현행 얼굴 데칼을 보존한다.
- 모자 5개 엽은 각기 높이가 다른 `lowCone(5)`, 몸은 둥글게 과장한 `dodeca`, 앞치마는 전면 다이아 `flatDisc`, 국자는 6면 반구와 짧은 `lowCylinder(6)` 조합이다. 국자는 모델 전용 장식이며 신규 투사체·피해·콜라이더가 아니다.
- `B04SoupBlastVisual`의 원 3개와 chef phase 상태/시간은 수정하지 않는다.

## 4. 구현 순서와 파일 단위 브리프

1. `Developer/r3f_prototype/src/lib/toon.js`: 기존 API를 깨지 않는 `faceted` 재질/geometry cache만 추가한다. gradient map은 `NoColorSpace`, 일반 emissive는 `0`, 외곽선 기본 팽창은 `1.04`로 둔다. 기존 legacy geometry와 재질을 제거하지 않는다.
2. `Developer/r3f_prototype/src/components/PlayerMesh.jsx`: 기존 리그·JSX 그룹 수·Studio base-capture를 유지하며 `Block`/`OutlineBlock`가 `geometryKind`를 받게 한다. 위 주인공 표의 파츠에만 명시적으로 적용한다.
3. `Developer/r3f_prototype/src/components/ZombieMesh.jsx`: `ZBlock`에 선택형 `geometryKind`를 추가하고 B01/B02/B03/B04의 기존 각 ZBlock에만 맵을 부여한다. B02의 v2 item id, 파츠 트리와 데칼은 변경하지 않는다.
4. `Developer/r3f_prototype/src/components/StageBossPreview.jsx`와 `GraphicsStudioPreview.jsx`: 새 모델을 따로 복제하지 않는다. 기존 `EnemyVisual`/공유 모델 경로를 그대로 렌더해 같은 트리와 같은 Firebase Studio revision을 확인한다.
5. 2D 작업: 각 캐릭터마다 정면·측면·후면·사선 탑뷰, 흑백 실루엣, 320×568 축소본, 걷기 최대 자세 2장, 피격 자세 1장을 만든 뒤에 3D geometry 변경을 시작한다.

## 5. 성능·검수 게이트

- 표의 triangles는 표면 메시 기준이다. 인버티드 헐을 포함한 실제 GPU 삼각형은 약 2배로 계산한다. 보스는 동시에 1체이므로 3,800 triangles 이하/보스(외곽선 포함)를 시작 상한으로 둔다. 플레이어는 2,300 triangles 이하(외곽선 포함)다.
- 신규 Material은 캐릭터당 만들지 않고 공용 toon/outline cache를 재사용한다. 새 texture/GLB/실시간 shadow draw call을 추가하지 않는다.
- 검수는 320×568, 412×839, 1280×720에서 흑백 실루엣·정면/측면/후면·warn/charge/stun·B01 special·B04 두 phase를 확인한다.
- 물리 중심/foot shadow, Studio 파트 선택·0값 복원, 게임/Studio/타이틀 동일 Firebase revision, B02 v2 외 레거시 경로 부재를 확인한다.
- 실제 화면 검증 없이 완료/성능 통과로 기록하지 않는다. 이후 구현 Worker가 범위별 테스트와 production build를 수행한다.

## 6. 금지사항

- 카메라/FOV, `PLAYER_FLOOR_LIFT`, RigidBody/CuboidCollider, 보스 스탯·판정·스폰·바닥 공격 상태를 그래픽 작업 명목으로 변경하지 않는다.
- 숫자 자식 경로를 깨는 파츠 재정렬, 별도 title proxy 모델, 로컬 Studio seed/fallback, localStorage 저장/읽기, B02 구형 구현·ID 탐색을 추가하지 않는다.
- 외부 IP의 고유 캐릭터·장비·복장·색 배치를 재현하지 않는다.
