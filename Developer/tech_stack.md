# BangBang Survivor — 기술 스택 및 역할 정리

## 의존성 버전

| 패키지 | 버전 |
|--------|------|
| react / react-dom | 18.3.1 |
| three | 0.164.1 |
| @react-three/fiber | 8.17.10 |
| @react-three/drei | 9.109.5 |
| @react-three/rapier | 1.4.0 |
| zustand | 4.5.4 |
| vite + @vitejs/plugin-react | 8.0.10 / 6.0.1 |

---

## 레이어 구조

```
┌─────────────────────────────────────────┐
│            React (UI 레이어)             │
│  HUD  ·  Modal  ·  레벨업 선택  ·  상태  │
├─────────────────────────────────────────┤
│         Zustand (상태 레이어)             │
│  플레이어 스탯  ·  무기  ·  게임 페이즈   │
├─────────────────────────────────────────┤
│    React Three Fiber (렌더 레이어)        │
│  Canvas  ·  useFrame 게임루프  ·  메시   │
├─────────────────────────────────────────┤
│       Rapier (물리 레이어)               │
│  RigidBody  ·  Collider  ·  Sensor      │
├─────────────────────────────────────────┤
│         Three.js (3D 레이어)             │
│  Geometry  ·  Material  ·  Vector3      │
└─────────────────────────────────────────┘
```

---

## 각 기술의 역할

### React 18
- **역할**: UI 컴포넌트 트리 관리, HUD 렌더링
- **실 사용처**
  - `HUD.jsx` — HP바, XP바, 타이머, 레벨업 모달, 게임오버/클리어 화면
  - `App.jsx` — Canvas 및 전체 레이아웃 구성
- **특이사항**: Canvas 내부(3D 월드)는 R3F가 담당, Canvas 외부(2D UI)만 순수 React

---

### Zustand 4 (`subscribeWithSelector`)
- **역할**: 게임 전역 상태 단일 관리
- **실 사용처** (`src/store/useGameStore.js`)

| 상태 슬라이스 | 내용 |
|-------------|------|
| `player` | hp, maxHp, speed, level, xp, invulnerable |
| `weapons` | 4종 무기 스탯 및 active 여부 |
| `phase` | playing / levelup / gameover / cleared |
| `elapsedMs` | 게임 경과 시간 (ms) |
| `bossSpawned` | 보스 등장 여부 |
| `gameKey` | 리셋 시 Physics 재마운트 트리거 |

- **액션 패턴**: 순수 함수로만 작성 (`setTimeout` 등 사이드이펙트 없음)
- **읽기 패턴**: 컴포넌트는 셀렉터로 구독, `useFrame` 내부는 `getState()`로 최신값 직접 읽기

---

### React Three Fiber (R3F) 8
- **역할**: Three.js를 React 컴포넌트 방식으로 선언, 게임 루프 관리
- **실 사용처**

| 훅/컴포넌트 | 사용 위치 | 역할 |
|------------|----------|------|
| `<Canvas>` | App.jsx | Three.js 렌더러 컨텍스트 생성 |
| `useFrame` | Game, Player, Enemy, Weapons | 매 프레임 게임 로직 실행 |
| `useThree` | Game.jsx | 카메라 참조 획득 |
| `<ambientLight>` / `<directionalLight>` | Game.jsx | 조명 설정 |

- **카메라**: Orthographic, 플레이어 위치 lerp 추적 (계수 0.08)
- **렌더링 방식**: Toon Shading (`meshToonMaterial` + 커스텀 그래디언트)

---

### @react-three/drei 9
- **역할**: R3F 유틸리티 모음 — 현재는 키보드 입력에만 사용
- **실 사용처**

| 컴포넌트/훅 | 사용 위치 | 역할 |
|------------|----------|------|
| `<KeyboardControls>` | App.jsx | 키 매핑 컨텍스트 제공 |
| `useKeyboardControls` | Player.jsx | 매 프레임 키 입력 상태 읽기 |

---

### @react-three/rapier 1.4 (Rapier 물리엔진)
- **역할**: 충돌 감지 및 물리 이동
- **설정**: `gravity={[0,0,0]}` — 탑뷰 2D 게임, 중력 없음
- **실 사용처**

| 컴포넌트 | 사용 위치 | 설정 |
|---------|----------|------|
| `<Physics>` | App.jsx | 물리 월드 컨텍스트, `key={gameKey}`로 리셋 |
| `<RigidBody type="dynamic">` | Player, Enemy | 물리 이동 (`setLinvel`으로 속도 제어) |
| `<RigidBody type="kinematicPosition">` | SchoolBagAura | 플레이어 위치 추적 센서 |
| `<RigidBody type="dynamic" sensor>` | Projectile | 투사체 충돌 감지 |
| `<CuboidCollider>` | Player, Enemy, Weapons | 히트박스 정의 |

- **충돌 처리 패턴**: RigidBody ref에 `_enemyHit(dmg)`, `_enemyId` 커스텀 프로퍼티 부착 → `onIntersectionEnter`에서 직접 호출
- **가방 오라 특이사항**: `onIntersectionEnter/Exit`로 범위 내 적을 `Map`에 등록 → `useFrame` 틱마다 일괄 피해

---

### Three.js 0.164
- **역할**: 저수준 3D 수학 및 기하학 처리
- **실 사용처**

| API | 사용 위치 | 역할 |
|-----|----------|------|
| `THREE.Vector3` | refs.js, Enemy, Game | 플레이어 위치 공유, 방향 계산 |
| `THREE.BackSide` | Enemy, PlayerMesh | 외곽선 효과 (Back-face outline) |
| `THREE.DoubleSide` | Weapons | 오라 링 양면 렌더링 |
| `boxGeometry` | Enemy, PlayerMesh | 캐릭터 메시 |
| `cylinderGeometry` | Weapons | 연필 투사체 메시 |
| `ringGeometry` | Weapons | 가방 오라 시각 효과 |
| `planeGeometry` | Enemy | 적 HP바 |
| `DataTexture` | toon.js | 툰 셰이딩 그래디언트 맵 생성 |

---

### Vite 5
- **역할**: 개발 서버 및 번들러
- **사용 방법**
  ```
  npm run dev      # 개발 서버 (HMR)
  npm run build    # 프로덕션 빌드
  npm run preview  # 빌드 결과 미리보기
  ```

---

## 컴포넌트 간 데이터 흐름

```
useGameStore (Zustand)
    │
    ├── phase, player, weapons → HUD.jsx (React DOM)
    │
    ├── phase, elapsedMs → Game.jsx (useFrame 루프)
    │
    ├── player.speed, phase → Player.jsx (Rapier RigidBody)
    │         │
    │         └── playerPos (THREE.Vector3) ──→ Enemy, Weapons, Game (카메라)
    │
    ├── phase, weapons → Weapons.jsx (Rapier Sensor)
    │
    └── phase, elapsedMs, bossSpawned → Enemies.jsx
                │
                └── onDeath → gainXp (Zustand)
```

- **`playerPos`** (`src/lib/refs.js`): 플레이어 월드 좌표를 re-render 없이 공유하는 `THREE.Vector3` 전역 ref
- **Zustand → R3F 방향**: 게임 상태 변경은 항상 Zustand를 통해, R3F는 읽기만
- **R3F → Zustand 방향**: 피해, XP 획득 등 게임 이벤트만 역방향으로 액션 호출
