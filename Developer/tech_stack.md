# BangBang Survivor — 기술 스택 및 구현 정리

> 정리 시점: 2026-05-16. 이 문서는 현재 코드(`Developer/r3f_prototype/`)와 운영 환경 기준의 스냅샷이다.
> 백엔드 없음 — 순수 클라이언트.

---

## 1. 런타임 의존성 버전

`Developer/r3f_prototype/package.json` 기준.

| 패키지 | 버전 | 분류 |
|---|---|---|
| `react` / `react-dom` | 18.3.1 | UI 프레임워크 |
| `three` | 0.164.1 | 3D 코어 |
| `@react-three/fiber` | 8.17.10 | React + Three.js 브리지 |
| `@react-three/drei` | 9.109.5 | R3F 유틸 (키보드 입력) |
| `@react-three/rapier` | 1.4.0 | 물리 엔진 (Rust → WASM) |
| `zustand` | 4.5.4 | 상태 관리 (`subscribeWithSelector`) |
| `vite` | 8.0.10 | 번들러 / 개발 서버 (dev) |
| `@vitejs/plugin-react` | 6.0.1 | React 플러그인 (dev) |

추가 외부 의존성 없음 — fetch/axios/firebase/supabase 등 BE 통신 라이브러리 0개.

---

## 2. 레이어 구조

```
┌───────────────────────────────────────────────────────────┐
│ React DOM Layer (Canvas 외부)                             │
│   HUD · 레벨업 모달 · 게임오버/클리어 · VirtualJoystick   │
├───────────────────────────────────────────────────────────┤
│ Zustand Store Layer (useGameStore)                        │
│   player · weapons · phase · 시간 · 골드/XP · gameKey     │
├───────────────────────────────────────────────────────────┤
│ React Three Fiber Layer (Canvas 내부)                     │
│   <Canvas> · useFrame 게임루프 · 카메라 · 메시 트리       │
├───────────────────────────────────────────────────────────┤
│ Rapier Physics Layer                                      │
│   <Physics gravity=0> · RigidBody · Collider · Sensor     │
├───────────────────────────────────────────────────────────┤
│ Three.js 3D Layer                                         │
│   Geometry · Material · Vector3 · CanvasTexture           │
├───────────────────────────────────────────────────────────┤
│ Browser Persistence Layer                                 │
│   localStorage (`school_survivor:goldTotal` 단일 키)      │
└───────────────────────────────────────────────────────────┘
```

---

## 3. 각 기술의 역할

### React 18

- **역할**: Canvas 외부 2D UI 트리, 게임 페이즈에 따른 모달/오버레이
- **사용처**
  - `HUD.jsx` — HP/XP 바, 타이머, 골드 표시, 레벨업 모달, 게임오버/클리어 화면
  - `App.jsx` — `<Canvas>` 마운트 + 레이아웃 + 가상 조이스틱
  - `VirtualJoystick.jsx` — 터치 입력 보조 (모바일 대비)
- **특이사항**: Canvas 내부 트리는 R3F가 단독 관리. React 상태 변경이 Canvas 트리에 영향 주려면 Zustand 경유.

---

### Zustand 4 (`subscribeWithSelector`)

- **역할**: 게임 전역 상태 단일 출처, 액션은 순수 함수
- **위치**: `src/store/useGameStore.js`

| 슬라이스 / 키 | 내용 | 영속화 |
|---|---|---|
| `player` | hp, maxHp, speed, level, xp, invulnerable | 메모리 |
| `weapons` | 9종 무기 객체 (각: active, level, damage, cooldown, range, …) | 메모리 |
| `phase` | `playing` / `levelup` / `gameover` / `cleared` | 메모리 |
| `elapsedMs` | 게임 경과 시간 (ms) | 메모리 |
| `bossSpawned` | 보스 등장 여부 | 메모리 |
| `gameKey` | `<Physics>` 강제 재마운트 트리거 (리셋용) | 메모리 |
| `goldSession` | 이번 게임에서 획득한 골드 | 메모리 |
| `goldTotal` | 누적 골드 (영구) | **localStorage** |

- **읽기 패턴**: 컴포넌트는 셀렉터로 구독, `useFrame` 내부는 `useGameStore.getState()`로 최신값 직접 읽기 (stale closure 회피)
- **액션**: `gainXp`, `gainGold`, `applyUpgrade`, `tickTime`, `clearStage`, `resetGame` 등. 액션은 순수 reducer 패턴.

---

### React Three Fiber 8

- **역할**: Three.js를 React 컴포넌트로 선언, 게임 루프 (`useFrame`) 제공
- **카메라**: Orthographic, zoom 60, 위치 `[0, 20, 20]`. 플레이어 위치를 `lerp(target, 0.08)`로 부드럽게 추적 (`Game.jsx`)
- **Canvas 설정**: `gl={{ stencil: true }}` 명시 (Stencil Layer 외곽선용)

---

### @react-three/drei 9

- **사용처**: `<KeyboardControls>` + `useKeyboardControls` — 키 매핑 컨텍스트와 입력 폴링
- 그 외 drei 헬퍼는 사용하지 않음 (의도적 미니멀)

---

### @react-three/rapier 1.4

- **역할**: 충돌 감지 + 물리 이동
- **설정**: `gravity={[0,0,0]}` (탑뷰 2D 게임)
- **리셋 패턴**: `<Physics key={gameKey}>` — `gameKey` 증분 시 물리 트리 전체 재마운트로 깨끗한 초기화

| 컴포넌트 | 사용 패턴 |
|---|---|
| `<RigidBody type="dynamic">` | Player, Enemy — `setLinvel` 으로 속도 제어 |
| `<RigidBody type="kinematicPosition">` | SchoolBagAura, GuidedMissile 등 플레이어 추적 센서 |
| `<RigidBody type="dynamic" sensor>` | 투사체 충돌 감지 (HitBox만 사용) |
| `<CuboidCollider>` / `<BallCollider>` | 히트박스 정의 |

- **충돌 처리**: RigidBody ref에 `_enemyHit(dmg)` / `_playerHit(dmg)` / `_enemyId` 커스텀 프로퍼티 부착 → `onIntersectionEnter`에서 직접 호출
- **범위 무기**: `onIntersectionEnter/Exit`로 범위 내 적을 `Map`에 등록 → `useFrame` 틱마다 일괄 피해 (SchoolBag, Tumbler)

---

### Three.js 0.164

- **카툰 셰이딩**: `MeshToonMaterial` + `CanvasTexture` 5스텝 그래디언트 (`lib/toon.js` `getToonGradient`)
- **외곽선**: BackSide 인플레이션 헐 + **Stencil Layer 기법** (§4 참조)
- **공유 벡터**: `lib/refs.js`의 `playerPos: THREE.Vector3` — 플레이어 좌표를 re-render 없이 모든 컴포넌트가 읽음

| 사용 API | 위치 |
|---|---|
| `THREE.Vector3` | refs.js, Enemy, Game, Weapons |
| `THREE.BackSide` | outlineMat (lib/toon.js) |
| `THREE.DoubleSide` | 무기 오라/이펙트 링 |
| `boxGeometry` / `cylinderGeometry` / `coneGeometry` / `sphereGeometry` / `planeGeometry` / `ringGeometry` / `octahedronGeometry` | 캐릭터/무기/이펙트 메시 |
| `CanvasTexture` | toon 그래디언트 맵 |
| `AlwaysStencilFunc` / `NotEqualStencilFunc` / `ReplaceStencilOp` / `KeepStencilOp` | 외곽선 stencil 제어 |

---

### Vite 8

- **사용**
  - `npm run dev` — HMR 개발 서버 (기본 5173)
  - `npm run build` — 프로덕션 번들
  - `npm run preview` — 빌드 결과물 로컬 미리보기
- **plugin**: `@vitejs/plugin-react` (JSX 변환)

---

## 4. 게임 시스템 모듈 (`src/lib/`, `src/components/`)

코드 분리는 두 축. **데이터/순수 로직은 `lib/`, 렌더링/생명주기는 `components/`**.

### 4-1. 카툰 외곽선 — Stencil Layer (`lib/toon.js`)

- `toonMat(color, emissive)` — 지오메트리는 stencil=1 기록 (`AlwaysStencilFunc`, `ReplaceStencilOp`)
- `outlineMat(opacity)` — BackSide 인플레이션 헐, stencil≠1인 픽셀만 그림 (`NotEqualStencilFunc`, `KeepStencilOp`)
- `inflateScale(s)` — 외곽선 mesh의 scale을 글로벌 곱수 `OUTLINE_THICKNESS_MULT`로 일괄 두께 조절. 모든 외곽선 mesh는 이 헬퍼 경유 필수.
- 결과: 다중 부품 모델의 부품 사이 seam에 외곽선이 그려지지 않고 **외곽 silhouette만** 표시.
- 상세 문서: `Planner/Tech_plan/effect_sloution.md`

### 4-2. VFX 효과 시스템 (`lib/vfxEvents.js`, `lib/vfxPalette.js`, `lib/vfxMath.js`, `components/VFXLayer.jsx`)

이벤트 큐 + 공유 렌더 레이어 패턴.

| 모듈 | 책임 |
|---|---|
| `vfxEvents.js` | `emitVfx(event)` + `subscribeVfx(fn)` — 모듈 레벨 pub/sub 큐 |
| `vfxPalette.js` | `VFX_COLORS` 색상 상수 (chargeOrange / dangerRed / xpGreen 등) |
| `vfxMath.js` | `easeOutCubic` / `smoothStep` / `fadeAlpha` — 알파/곡선 헬퍼 |
| `VFXLayer.jsx` | `subscribeVfx`로 구독, type별 컴포넌트 매핑(`hitSpark`/`chargeWarningLine`/`pickupPop`)으로 렌더. `MAX_ACTIVE=80` 상한, `gameKey` 변경 시 자동 클리어 |

### 4-3. 아이템↔효과 레지스트리 (`lib/itemEffects.js`)

- `ITEM_EFFECTS` 단일 테이블 — itemId(예: `E05`, `B01`) → `{ kind, hooks: { onWarn, onHit, ... } }`
- `triggerItemVfx(itemId, hookName, payload)` — spec(정적) + payload(동적) 머지 → `emitVfx` 호출
- `getEffectByItem(itemId, hookName?)` / `getItemsByEffectType(vfxType)` / `listItemIds()` — 조회 헬퍼
- 게임플레이 컴포넌트는 `emitVfx` 직접 호출 금지, 반드시 `triggerItemVfx` 경유
- 현재 등록 항목: E05/B01 charge warn (점진 확장 예정)
- 상세 문서: `Planner/Tech_plan/effect_sloution.md`

### 4-4. 무기 업그레이드 (`lib/upgrades.js`)

- `UPGRADE_EFFECTS` 단일 테이블 — 업그레이드 ID → `{ kind: 'unlock'|'damage'|'stat'|'player', weapon?, dmg?, stat?, step?, cap?, minLevel? }`
- `applyUpgradeToWeapon(wpn, effect)` — 순수 함수, 새 무기 객체 반환
- `isUpgradeAvailable(effect, level, weapons)` — 가시 조건 (4종 보유 상한, Lv.5 캡, stat cap 등)
- 단일 진실 출처 패턴 — 호출부의 if-else cascade 제거

### 4-5. 픽업 / 마그넷 풀 (`lib/pickup.js`)

- `stepMagnetPull(pRef, delta)` — 플레이어와의 거리에 따라 자동 흡입/수집 처리
- `PULL_RADIUS_SQ` / `COLLECT_RADIUS_SQ` 상수
- 반환: `'collected' | 'pulled' | 'idle'`
- GoldCoin, XpTextbook이 공유 사용

### 4-6. 드랍 (이중 화폐)

| 드랍 | 컴포넌트 | 트리거 | 영속화 |
|---|---|---|---|
| **XP 교과서** | `XpTextbook.jsx` | 적 처치 30% 확률 | 게임 내 (세션) |
| **골드 코인** | `GoldCoin.jsx` | 시계태엽식 25–35초 (5분당 ~10개) | localStorage 누적 |

- 상세 기획: `Planner/dual_drop_system_2026-05-08.md`

### 4-7. 적 시스템 (`components/Enemy.jsx`, `Enemies.jsx`, `EnemyDeathCollapse.jsx`, `ZombieMesh.jsx`)

- 타입별 스탯 테이블 `ENEMY_STATS` (E01~E06, B01)
- 차저형 상태머신: `chase → warn → charge → stun`
- warn 진입 시 `triggerItemVfx(type, 'onWarn', ...)`로 charge 예고선 표시
- 사망 시 `EnemyDeathCollapse.jsx`가 블록 분리 애니메이션 + 외곽선 페이드

### 4-8. 음식 픽업 (`components/LunchItems.jsx`)

- `SPAWN_INTERVAL_MS = 60000` (1분당 1개)
- 도시락(전체 HP 회복)과 우유(부분 회복) 2종

---

## 5. 컴포넌트 ↔ 상태 데이터 흐름

```
useGameStore (Zustand)
    │
    ├── phase, player, weapons, goldSession ─→ HUD.jsx (React DOM)
    │
    ├── phase, elapsedMs ─→ Game.jsx (useFrame 루프, 카메라)
    │
    ├── player.speed, phase ─→ Player.jsx (Rapier RigidBody)
    │         │
    │         └── playerPos (THREE.Vector3, refs.js) ─→ Enemy / Weapons / Game(카메라)
    │
    ├── phase, weapons ─→ Weapons.jsx (9종 무기 컴포넌트)
    │
    └── phase, elapsedMs, bossSpawned ─→ Enemies.jsx
                │
                ├── onDeath → gainXp / drop XpTextbook (Zustand)
                └── clockwork → drop GoldCoin → gainGold (Zustand + localStorage)

triggerItemVfx (lib/itemEffects.js) ── emitVfx (lib/vfxEvents.js)
       ↑                                        │
       └── 게임플레이 컴포넌트                  └── subscribeVfx → VFXLayer (렌더)
```

- `playerPos`: 좌표 공유는 re-render 없이 mutable Vector3로 처리 (성능 핫패스 최적화)
- Zustand → R3F 단방향이 기본. R3F → Zustand는 게임 이벤트(피해/획득) 시만 역방향.

---

## 6. 영속화

- **현재**: `localStorage` 키 1개만 — `school_survivor:goldTotal` (누적 골드)
- 그 외 모든 게임 상태(HP/XP/세션 골드/무기 레벨/스폰 카운터)는 메모리 → 새로고침 시 리셋
- **BE 없음** — 리더보드/계정/메타프로그레션 필요 시점에 BE 결정 (예: Supabase 또는 Cloudflare Workers + D1)

---

## 7. 개발 환경 / 도구

| 도구 | 버전 | 위치 / 용도 |
|---|---|---|
| Node.js | 24.15.0 | Vite 실행 |
| Bun | 1.3.14 | `C:\Users\admin\.bun\bin\bun.exe` — gstack 빌드 의존성 |
| Git | 2.54.0.windows.1 | VCS |
| Vite Dev | 8.0.10 | `npm run dev` → http://localhost:5173 |
| Windows PowerShell | 5.1 | 기본 셸. `$PROFILE`에 `cs` 별칭 (= `claude --dangerously-skip-permissions`) |
| Git Bash | — | POSIX 스크립트용 (Bash 툴) |

### Claude Code 통합 (AI-assisted)

| 항목 | 위치 |
|---|---|
| gstack 전역 설치 | `~/.claude/skills/gstack/` (자동 업데이트, 시간당 1회 throttled) |
| gstack 팀 강제 훅 | `.claude/settings.json` + `.claude/hooks/check-gstack.sh` (tracked in git, 커밋 `b39d604`) |
| 권한 prompt 자동 통과 (개인) | `.claude/settings.local.json` — `permissions.defaultMode = "bypassPermissions"` (gitignored) |
| 세션 메모리 정본 | `SESSION_CONTINUITY.md` (LOCKED 2026-05-16) |
| 세션 메모리 데이터 | `SESSION_MEMORY.md` (append-only) |

---

## 8. 빌드 / 실행 / 검증

```bash
# 개발
cd Developer/r3f_prototype
npm install         # 첫 실행 시
npm run dev         # http://localhost:5173

# 프로덕션 빌드
npm run build       # dist/
npm run preview     # 빌드 결과 로컬 검증
```

- 코드 변경 시 Vite HMR 자동 반영 (JSX/JS 핫리로드)
- 외곽선/VFX 변경은 브라우저 새로고침으로 시각 확인

---

## 9. 의도적 미사용 / Anti-patterns

이 프로젝트에서 의도적으로 **쓰지 않는** 것들:

- ❌ Backend / API 통신 — 클라이언트 전용
- ❌ Redux / MobX — Zustand로 충분
- ❌ Tailwind / CSS-in-JS — 인라인 style 또는 styled DOM만 (HUD가 단순)
- ❌ drei의 무거운 헬퍼(Sky, Environment, OrbitControls 등) — 미니멀 유지
- ❌ 2D 스프라이트 / 2D 픽셀 (project_develop_policy.md Graphic Designer 정책) — 모든 캐릭터/적은 3D 카툰 렌더링 필수
- ❌ Postprocessing (`@react-three/postprocessing`) — Stencil Layer + 인라인 머티리얼로 충분, 의존성 회피
- ❌ 직접 `emitVfx` 호출 — `triggerItemVfx` 한 줄로 통일

---

## 10. 참고 문서

- `Planner/Tech_plan/effect_sloution.md` — 외곽선 + VFX 효과 구조 / 레지스트리 설명
- `Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md` — VFX 구현 마스터플랜
- `Planner/dual_drop_system_2026-05-08.md` — 골드/XP 이중 드랍 기획
- `Planner/stage1_replan_2026-05-06.md` — Stage 1 재기획 (무기/적/스폰)
- `Bang_Rules.md` — 게임 룰/콘텐츠 정책
- `project_develop_policy.md` — 부서별 정책 (최우선)
- `SESSION_CONTINUITY.md` — 세션 메모리 규정 (LOCKED)
