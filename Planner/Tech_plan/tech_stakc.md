# Escape! zombie school — 기술스택 및 선택 이유 종합

> 작성일: 2026-05-17
> 위치: `Planner/Tech_plan/tech_stakc.md`
> 목적: 게임의 모든 구현 파트에 사용된 언어 · 도구 · 패키지 · 인프라를 한 곳에 정리하고, **각 선택의 이유**를 명시한다.
> 자매 문서:
> - `Developer/tech_stack.md` — 엔지니어링 세부 (실제 코드 위치까지 매핑)
> - `Planner/Tech_plan/effect_sloution.md` — VFX·외곽선 구조 상세

---

## 0. 게임 개요 (스택 선택의 전제)

| 항목 | 값 |
|---|---|
| 장르 | 탑다운 서바이버 액션 (Vampire Survivors 풍) |
| 플랫폼 | 브라우저 (데스크톱 + 모바일 웹) |
| 세션 길이 | 단일 런 5분 |
| 그래픽 | 3D 카툰 렌더링 + 외곽선 |
| 백엔드 | 없음 (현 단계 클라이언트 단독, 추후 메타프로그레션 도입 시 검토) |
| 화면 비율 | iPhone 12 Pro 기준 (390×844) |
| 입력 | 키보드(WASD/방향키) + 가상 조이스틱(터치) |

이 전제들이 **모든 스택 선택의 출발점**이다. 예를 들어 "3D 카툰"이라는 요구가 Three.js를 강제하고, "브라우저"가 Unity/Unreal을 자동 배제하며, "단일 런 5분"이 무거운 ECS 프레임워크 도입을 무의미하게 만든다.

---

## 1. 언어 · 런타임

| 영역 | 선택 | 이유 |
|---|---|---|
| 클라이언트 언어 | **JavaScript (ES2020+, JSX)** | (1) 브라우저 네이티브, 빌드 후 단일 번들 배포. (2) 솔로 프로토타입 단계라 TS 도입 비용 미감수. (3) R3F/Three 생태계가 JS 중심. |
| 모듈 시스템 | **ESM (`"type": "module"`)** | Vite의 기본값. Tree-shaking 효율적, 동적 import 자유로움. |
| 실행 런타임 | **Browser (Chromium/Firefox/Safari)** | WebGL 2.0 + WebAssembly + WebGL stencil buffer 지원 필요. |
| Node.js | **v24.15.0** | Vite 빌드/개발 서버 실행용. 코드 자체는 Node 의존성 없음. |
| Bun | **v1.3.14** | gstack 도구 체인 의존성. 게임 코드는 Bun 미사용. |

### TypeScript 미도입 이유
- 솔로 개발, 코드 변동성 높음 → 타입 정의 유지 비용 > 잡히는 버그
- 핵심 lib 테이블(`UPGRADE_EFFECTS`/`ITEM_EFFECTS`)은 Vitest로 무결성 보장 가능
- 추후 코드 안정화 + 신규 무기/적 추가 빈도 ↓ 시점에 `lib/`만 점진 도입 검토

---

## 2. 런타임 의존성 (게임 동작에 직접 사용)

`Developer/r3f_prototype/package.json` 기준. 모두 메이저 안정 버전.

### 2-1. UI 프레임워크

| 패키지 | 버전 | 사용 영역 | 이유 |
|---|---|---|---|
| `react` | 18.3.1 | 모든 컴포넌트 트리 | 가장 안정적인 선언적 UI. R3F가 이 위에서 동작. |
| `react-dom` | 18.3.1 | DOM 렌더링 | React 18 자동 batching이 VFX 디바운스 패턴 최적화에 유리. |

### 2-2. 3D 렌더링 / 게임 엔진

| 패키지 | 버전 | 사용 영역 | 이유 |
|---|---|---|---|
| `three` | 0.164.1 | 3D 코어 (Geometry, Material, Vector3) | 브라우저 3D 표준. Unity/Unreal은 브라우저 배포 비효율. Babylon.js 대비 React 생태계 통합 우수. |
| `@react-three/fiber` | 8.17.10 | Three.js → React 컴포넌트 브리지 | useFrame 게임루프 + 선언적 씬 그래프. 명령형 Three 코드보다 유지보수성 ↑. |
| `@react-three/drei` | 9.109.5 | R3F 유틸 (KeyboardControls만 사용) | 키 매핑 컨텍스트 표준 패턴. 다른 drei 헬퍼는 의도적 미사용 (번들 절약). |

### 2-3. 물리

| 패키지 | 버전 | 사용 영역 | 이유 |
|---|---|---|---|
| `@react-three/rapier` | 1.4.0 | 충돌 감지 + 물리 이동 | Rapier(Rust→WASM)는 cannon-es 대비 성능 우수. 동시 적 80+ 시 안정적. 탑다운이라 중력 0. |

### 2-4. 상태 관리

| 패키지 | 버전 | 사용 영역 | 이유 |
|---|---|---|---|
| `zustand` | 4.5.4 | 게임 전역 상태 (`useGameStore`) | Redux 대비 보일러플레이트 80% ↓. Provider 불필요. `subscribeWithSelector`로 useFrame 핫패스 셀렉터 구독 가능. |

### 2-5. 빌드 도구

| 패키지 | 버전 | 영역 | 이유 |
|---|---|---|---|
| `vite` | 8.0.10 | 번들러 + dev 서버 | HMR 빠름. esbuild 기반 transform. Vitest와 transformer 공유. |
| `@vitejs/plugin-react` | 6.0.1 | JSX 변환 | Vite 표준 React 통합. |

### 2-6. 테스트 (devDeps)

| 패키지 | 버전 | 영역 | 이유 |
|---|---|---|---|
| `vitest` | 4.1.6 | 유닛 테스트 러너 | Vite와 transformer 공유로 추가 설정 0. esbuild 빠름. `upgrades.test.js` 24 케이스. |
| `jsdom` | 29.1.1 | DOM 모킹 (예약) | 현재 `environment: 'node'` 사용 중. 컴포넌트 테스트 추가 시 활성화. |

### 2-7. 외부 의존성 0개

- HTTP 클라이언트(`axios`/`fetch wrapper`) 없음 — 백엔드 없으니 불필요
- 인증(`firebase`/`supabase`/`auth0`) 없음
- 상태 영속화(`redux-persist`) 없음 — `localStorage` 직접 호출로 충분
- UI 컴포넌트(`mui`/`chakra`/`antd`) 없음 — HUD가 단순해 인라인 style로 충분
- CSS 프레임워크(`tailwind`/`styled-components`) 없음 — 컴포넌트 수 작아 불필요
- 이펙트 라이브러리(`@react-three/postprocessing`) 없음 — Stencil Layer 직접 구현으로 회피
- ECS 프레임워크(`miniplex`/`bitecs`) 없음 — 5분 단일 런에 과한 추상화

---

## 3. 구현 파트별 기술 매핑

### 3-1. 화면 진입 / 흐름 제어 (Title / CoinShop / Game)

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 화면 라우팅 | React `useState` 단일 변수 (`'title' | 'coinShop' | 'game'`) | `App.jsx` |
| 화면 컴포넌트 | 인라인 함수 컴포넌트 + 인라인 styles | `App.jsx` (TitleScreen, CoinShopScreen) |
| 프레임 | 모바일 비율 고정 컨테이너 (iPhone 12 Pro 390×844) | `App.jsx` styles |

**이유**: React Router 같은 라이브러리는 3 화면 짜리에 과함. 단일 상태 변수로 충분. 화면 추가 시 enum 확장으로 대응.

### 3-2. 3D 씬 / 게임 루프

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| Canvas | `<Canvas gl={{ stencil: true }}>` (R3F) | `App.jsx` |
| 게임 루프 | `useFrame((_, delta) => ...)` (R3F) | `Game.jsx` + 55 컴포넌트 |
| 카메라 | Orthographic, zoom 60, 플레이어 위치 lerp 추적 | `Game.jsx` |
| 조명 | `<ambientLight>` + 2 `<directionalLight>` (그림자) | `Game.jsx` |

**이유**: 탑다운 2D 느낌이 목표 → Orthographic이 perspective보다 일관된 시각. R3F `useFrame`은 단일 RAF로 묶여 콜 오버헤드 적음.

### 3-3. 입력

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 키보드 | `<KeyboardControls>` + `useKeyboardControls` (drei) | `App.jsx` 매핑, `Player.jsx` 소비 |
| 터치/마우스 | 직접 구현 가상 조이스틱 | `VirtualJoystick.jsx` |
| 입력 공유 | 모듈 레벨 mutable ref (`playerFacing`) | `lib/refs.js` |

**이유**: drei의 KeyboardControls가 사실상 표준. 가상 조이스틱은 모바일 대비로 커스텀 — drei에 동일 기능 없음.

### 3-4. 물리 / 충돌

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 물리 월드 | `<Physics gravity={[0,0,0]} key={gameKey}>` | `App.jsx` |
| 플레이어 | `<RigidBody type="dynamic">` + setLinvel | `Player.jsx` |
| 적 | `<RigidBody type="dynamic">` + 추격 로직 | `Enemy.jsx` |
| 무기 센서 | `<RigidBody type="kinematicPosition" sensor>` | `Weapons/*.jsx` |
| 충돌 처리 | RigidBody ref에 커스텀 함수 부착 (`_enemyHit`, `_playerHit`) | 전체 |

**이유**:
- Rapier가 Rust→WASM이라 cannon-es 대비 동시 객체 80+ 환경에서 안정적
- `gravity=0` 탑다운 정책 (Bang_Rules §2)
- `key={gameKey}` 패턴으로 게임 리셋 시 물리 트리 깨끗하게 재마운트 (Bang_Rules §9-6)
- 충돌 핸들러 직접 호출 패턴은 React state 우회로 성능 ↑

### 3-5. 상태 관리

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 게임 전역 스토어 | Zustand `create + subscribeWithSelector` | `store/useGameStore.js` |
| 슬라이스 | `player`, `weapons`, `phase`, `elapsedMs`, `goldSession`, `goldTotal`, `gameKey`, `pendingLevelUps` | 단일 store 내부 |
| 플레이어 좌표 공유 | 모듈 레벨 `THREE.Vector3` (mutable) | `lib/refs.js` `playerPos` |
| VFX 이벤트 큐 | 모듈 레벨 `Set<listener>` | `lib/vfxEvents.js` |

**이유**:
- Zustand: 가장 가벼운 React 상태관리. Redux/MobX는 보일러플레이트 과다.
- `subscribeWithSelector`: useFrame 안에서 `useGameStore.getState()` 직접 호출로 stale closure 회피
- 모듈 레벨 mutable refs: 좌표는 매 프레임 변하므로 React state로 관리하면 리렌더 폭주 → mutable로 우회

### 3-6. UI / HUD

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| HP/XP 바, 타이머, 골드 | React DOM (Canvas 외부) | `HUD.jsx` |
| 레벨업 모달 | React 모달 + UPGRADE 카탈로그 | `HUD.jsx` `pickThree` |
| 게임오버/클리어 화면 | React 모달 + 플레이테스트 로그 복사 버튼 | `HUD.jsx` |
| 다음 해금 무기 미리보기 | UPGRADE_EFFECTS 역조회 + UpgradeIcon | `HUD.jsx` `nextUnlock` |
| 자 쿨다운 링 | SVG + requestAnimationFrame poll | `HUD.jsx` `bagReady` |

**이유**:
- Canvas 외부 UI는 React DOM이 가장 빠름 (Canvas 내부 UI는 R3F의 텍스트 처리가 비싸짐)
- 인라인 style: 컴포넌트 수 작고 styled-components 도입 비용 미감수
- UPGRADE 카탈로그를 HUD에 두는 건 카드 표시 책임을 한 곳에 모으기 위함

### 3-7. 카툰 렌더링 / 외곽선

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 셰이딩 | `MeshToonMaterial` + 5단계 그래디언트 (`CanvasTexture`) | `lib/toon.js` `toonMat` |
| 외곽선 | BackSide 인플레이션 헐 + **Stencil Layer** | `lib/toon.js` `outlineMat` |
| 굵기 글로벌 곱수 | `OUTLINE_THICKNESS_MULT` × `inflateScale(s)` | `lib/toon.js` |

**이유**:
- MeshToonMaterial: Three.js 빌트인 toon 셰이더, 추가 의존성 0
- Stencil Layer: 다중 부품 모델(플라스크 등)에서 부품 사이 seam에 외곽선이 그려지는 문제를 postprocessing 의존성 없이 해결 (Delt06/toon-rp wiki 기법)
- 글로벌 곱수: 향후 굵기 조절 시 상수 한 줄만 수정
- 상세: `effect_sloution.md` §1-9

### 3-8. VFX (이펙트 시스템)

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 이벤트 큐 | 모듈 레벨 pub/sub (Set<listener>) | `lib/vfxEvents.js` |
| 색상 팔레트 | 상수 객체 `VFX_COLORS` | `lib/vfxPalette.js` |
| 곡선 헬퍼 | `easeOutCubic` / `smoothStep` / `fadeAlpha` / `lerpAngle` | `lib/vfxMath.js` |
| 렌더 레이어 | type별 컴포넌트 매핑 + `MAX_ACTIVE=80` 상한 | `components/VFXLayer.jsx` |
| 아이템↔효과 레지스트리 | 단일 ITEM_EFFECTS 테이블 | `lib/itemEffects.js` |
| 디바운스 | queueMicrotask로 setState 1회 합치기 | `VFXLayer.jsx` `flushPending` |

**이유**:
- 이벤트 큐 패턴: React 리컨실리에이션 우회로 핫패스 성능 ↑
- ITEM_EFFECTS 단일 테이블: 새 아이템/효과 추가 시 한 파일만 수정
- queueMicrotask 디바운스: 한 프레임에 다수 이펙트가 emit/done될 때 React 재조정 횟수 ↓

### 3-9. 무기 시스템

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 무기 7종 (시스템 컴포넌트) | 무기당 1 파일 (Pencil/SchoolBag/Tumbler/Bell/Flask/StunGun/Onigiri) | `components/Weapons/*.jsx` |
| barrel | re-export 모음 | `components/Weapons/index.js` |
| 타겟팅 헬퍼 | `findClosestEnemy` / `findBestSplashTarget` | `lib/weaponTargeting.js` |
| 업그레이드 테이블 | `UPGRADE_EFFECTS` 단일 정의 | `lib/upgrades.js` |
| 적용 로직 | `applyUpgradeToWeapon` 순수 함수 + `isUpgradeAvailable` | `lib/upgrades.js` |

**이유**:
- 무기당 1 파일: 1808줄 단일 파일에서 분할 (2026-05-16). 새 무기 추가 시 새 파일 + barrel 1줄. 변경/리뷰 표면적 ↓.
- UPGRADE_EFFECTS 단일 테이블: 업그레이드 카드 변경 시 한 곳만 수정. Vitest 24 케이스로 회귀 안전망.

### 3-10. 적 / 스폰

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 적 컴포넌트 | 상태머신(chase/warn/charge/stun) + `ZombieMesh` | `Enemy.jsx`, `ZombieMesh.jsx` |
| 적 스탯 테이블 | `ENEMY_STATS` 단일 정의 (E01–E06, B01) | `Enemy.jsx` |
| 스폰 매니저 | 시간 기반 WAVE_PHASES + BURST_EVENTS | `Enemies.jsx` |
| 사망 연출 | `EnemyDeathCollapse` 블록 분리 애니메이션 | `EnemyDeathCollapse.jsx` |
| 미니 체력바 | 적 위 떠 있는 평면 | `MiniHealthBar.jsx` |

**이유**:
- 상태머신: 차저(E05/B01)는 chase→warn→charge→stun 사이클. JSX 안에서 useState로 관리하기엔 복잡 → useRef + switch.
- ENEMY_STATS 단일 테이블: 밸런스 튜닝 시 한 곳만 변경.
- 시간 기반 스폰: Vampire Survivors 패턴 정석.

### 3-11. 드랍 / 픽업

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| XP 교과서 | 적 처치 30% 확률 드랍 | `XpTextbook.jsx` |
| 황금 코인 | 시간 기반 25–35초 시계태엽 | `GoldCoin.jsx` |
| 마그넷 풀 헬퍼 | 거리 기반 자동 흡입 | `lib/pickup.js` `stepMagnetPull` |
| 음식 (HP 회복) | 1분당 1개 스폰 | `LunchItems.jsx` |

**이유**:
- 이중 화폐: XP는 세션 내, 골드는 영구 (V.S 스타일 메타프로그레션 준비). `Planner/Rewards_Drops/dual_drop_system_2026-05-08.md` 근거.
- 마그넷 풀 공유: GoldCoin/XpTextbook 모두 같은 흡입 로직 → 헬퍼 분리.

### 3-12. 영속화

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 누적 골드 | `localStorage` 키 `school_survivor:goldTotal` | `store/useGameStore.js` `loadGoldTotal/saveGoldTotal` |
| 세션 상태 | 메모리 (페이지 새로고침 시 리셋) | 동일 store |

**이유**:
- localStorage 1키만: 현재 단계는 메타프로그레션 미구현이라 영속할 게 골드 누적 뿐.
- 추후 패시브 카탈로그/스테이지 해금 도입 시: 추가 키 또는 IndexedDB(`localforage`) 검토.

### 3-13. 플레이테스트 로깅

| 항목 | 사용 기술 | 코드 위치 |
|---|---|---|
| 자동 이벤트 기록 | Zustand subscribe + 모듈 레벨 array | `lib/playtestLogger.js` |
| 게임 종료 시 JSON 빌드 | `buildPlaytestSummary()` | 동일 파일 |
| 복사 버튼 | `navigator.clipboard.writeText` | `HUD.jsx` |
| 진입 초기화 | `initPlaytestLogger()` 모듈 사이드이펙트 | `App.jsx` |

**이유**:
- 단일 런 측정 비용 ↓ (사용자가 결과창에서 클릭 → 채팅 붙여넣기 → AI 분석)
- 외부 분석 서비스 없이 클립보드 만으로 완결되는 폐쇄 루프

---

## 4. 개발 환경 / 도구

| 도구 | 버전 | 용도 / 이유 |
|---|---|---|
| Node.js | 24.15.0 | Vite/Vitest 실행. 게임 코드 자체엔 의존 0. |
| npm | (Node 동봉) | 패키지 매니저. 단일 dev 환경이라 yarn/pnpm 도입 무의미. |
| Git | 2.54.0 (Windows) | VCS. 브랜치 `feature/codex-gameplay-iteration`. |
| Vite Dev | 8.0.10 | `npm run dev` → http://localhost:5173. HMR. |
| Bun | 1.3.14 | gstack 도구 의존성 (게임 코드 외부). |
| Windows PowerShell 5.1 | OS 내장 | 기본 셸. `$PROFILE`에 `cs` 별칭(= `claude --dangerously-skip-permissions`). |
| Git Bash | 2.54.0 동봉 | POSIX 스크립트 실행용. |

### 빌드 / 검증 워크플로우
```
npm run dev       # HMR 개발 서버
npm run build     # 프로덕션 번들 (~3.1MB / gzip 1.06MB)
npm run preview   # 빌드 결과 로컬 검증
npm run test      # vitest run (24 케이스)
npm run test:watch # 변경 감지 + 재실행
```

---

## 5. 테스트 / 품질

| 항목 | 사용 기술 | 적용 범위 |
|---|---|---|
| 유닛 테스트 | Vitest 4.1.6 | `lib/upgrades.test.js` 외 24 케이스 |
| 환경 | `environment: 'node'` (jsdom 미사용) | 순수 로직만 테스트 |
| 통합 테스트 | 없음 | 게임 컴포넌트는 시각 검증이 더 효율적 |
| 시각 검증 | Vite dev 서버 + 플레이테스트 로그 | 5분 단일 런 |

**이유**:
- 게임은 시각/체감이 검증의 1차. 유닛 테스트는 순수 로직(`upgrades.js` 등) 회귀 안전망만
- 컴포넌트 테스트는 React Testing Library 도입 비용 > 효과 (수동 플레이가 더 빠른 피드백)

---

## 6. AI 보조 / 세션 운영

| 도구 | 용도 | 위치 |
|---|---|---|
| Claude Code | AI 페어 프로그래밍 | 글로벌 설치 |
| gstack | Claude Code용 23+ 스킬 패키지 | `~/.claude/skills/gstack/` (글로벌 자동 업데이트), `.claude/settings.json` (프로젝트 강제 훅) |
| 세션 메모리 정본 | 룰 정의 | `SESSION_CONTINUITY.md` (LOCKED 2026-05-16 v2) |
| 세션 메모리 데이터 | 영구 누적 로그 | `SESSION_MEMORY.md` (append-only) |
| 권한 prompt 자동 통과 | 개인 설정 | `.claude/settings.local.json` `permissions.defaultMode = bypassPermissions` |
| PowerShell 별칭 | 빠른 실행 | `$PROFILE`의 `cs` 함수 |

**이유**:
- AI 보조 도구를 명시 정리한 이유: 다른 개발자/세션이 합류해도 같은 워크플로우로 진입 가능하게
- 세션 메모리 룰은 3h cadence + 12h 사이클 (Entry 4 작성 후 `/clear` 권고)

---

## 7. 의도적으로 사용하지 않는 것 (Anti-patterns)

| 카테고리 | 미사용 항목 | 이유 |
|---|---|---|
| 백엔드 | Express / Fastify / Supabase / Firebase | 현 단계 클라이언트 단독. 리더보드/메타 도입 시점에 검토. |
| 상태관리 | Redux / MobX / Recoil | Zustand로 충분. 보일러플레이트 회피. |
| CSS | Tailwind / styled-components / Emotion | 컴포넌트 수 작음. 인라인 style로 충분. |
| 3D 유틸 | drei의 무거운 헬퍼(Sky/Environment/OrbitControls) | 미니멀 유지. 번들 크기 ↓. |
| 후처리 | `@react-three/postprocessing` | Stencil Layer + 인라인 머티리얼로 외곽선 해결. 의존성 회피. |
| 2D 그래픽 | Sprite sheets / Phaser / pixi.js | Bang_Rules: 캐릭터는 무조건 3D 카툰 렌더링 (Graphic 부서 정책). |
| ECS | bitecs / miniplex | 5분 단일 런에 과한 추상화. 적 80마리 정도는 React/Rapier로 처리 가능. |
| 타입 시스템 | TypeScript | 솔로 프로토타입 단계 도입 비용 > 이득. lib/만 점진 도입 검토 중. |
| 라우터 | React Router / Tanstack Router | 화면 3개라 useState 한 변수로 충분. |
| HTTP | axios / ky / wretch | 외부 호출 0건. |
| 직접 emitVfx 호출 | `emitVfx({type:...})` 직접 사용 금지 | 모든 VFX 발사는 `triggerItemVfx(itemId, hookName, payload)` 경유 (레지스트리 강제). |
| 직접 머티리얼 생성 | `new THREE.MeshToonMaterial({...})` 직접 호출 금지 | Stencil 설정 누락 위험. 반드시 `toonMat()` / `outlineMat()` 헬퍼 경유. |
| `--no-verify` git 옵션 | 훅 우회 금지 | 코드 품질 게이트 유지. |

---

## 8. 추후 확장 시 검토 사항

V.S 스타일 메타프로그레션 도입 시 새로 들어올 기술 후보:

| 영역 | 후보 | 검토 시점 |
|---|---|---|
| **백엔드** | Supabase (Postgres + Auth + Realtime) / Cloudflare Workers + D1 / Firebase | 리더보드, 계정 동기화 필요 시 |
| **영속화 확장** | IndexedDB (`localforage`) 또는 위 BE의 DB | 도전과제 / 도감 데이터 누적 시 |
| **분석/텔레메트리** | PostHog (셀프 호스팅) / Plausible | 플레이 분포 파악 필요 시 |
| **CI** | GitHub Actions (test + build + preview) | 협업 합류 시 |
| **타입 시스템** | TypeScript (lib/ 디렉토리만 부분 도입) | 코드 안정화 후 |
| **번들 분할** | dynamic import / Rolldown codeSplitting | 번들이 5MB 이상 될 때 |
| **오디오** | Howler.js 또는 Web Audio API 직접 | BGM/SFX 도입 결정 시 |
| **이펙트 강화** | `@react-three/postprocessing` (Bloom/SSAO) | 시각 품질 ↑ 결정 시 |
| **에디터/맵 툴** | LDtk / Tiled (외부) | Stage 2+ 환경 다양화 필요 시 |
| **광고 / 결제** | AdMob (네이티브 래퍼 후) / Stripe | 수익화 결정 시 |

각 후보는 도입 직전에 별도 의사결정 트리 문서를 작성한다.

---

## 9. 종합 요약

| 영역 | 핵심 선택 | 사유 한 줄 |
|---|---|---|
| 언어 | JavaScript | 브라우저 네이티브, R3F 생태계 |
| 3D | Three.js + R3F | 카툰 + 외곽선 요구를 가장 친숙하게 |
| 물리 | Rapier (WASM) | 동시 80+ 객체에서 안정 |
| 상태 | Zustand | 가장 가벼움 |
| 빌드 | Vite | HMR 속도 + Vitest 통합 |
| 테스트 | Vitest | 순수 로직 회귀 안전망 |
| 영속화 | localStorage | 현 단계 단순함 |
| AI 보조 | Claude Code + gstack | 솔로 개발 가속 |
| 미사용 (의도적) | BE / Redux / Tailwind / postprocessing / TS | 단계별 도입 비용 회피 |

---

## 참조

- `Developer/tech_stack.md` — 엔지니어링 세부 (실제 코드 라인 매핑)
- `Planner/Tech_plan/effect_sloution.md` — VFX/외곽선 구조
- `Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md` — VFX 마스터플랜
- `Bang_Rules.md` — 게임 룰/콘텐츠 정책 (최우선)
- `Planner/Stage1_Balance/stage1_replan_2026-05-06.md` — Stage 1 재기획
- `SESSION_CONTINUITY.md` — 세션 메모리 정본 (LOCKED 2026-05-16 v2)
