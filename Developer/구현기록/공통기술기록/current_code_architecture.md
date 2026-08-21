# Current Code Architecture

Last updated: 2026-05-16

## 1. 대상

현재 플레이 가능한 프로토타입은 `Developer/r3f_prototype/` 아래에 있다.

## 2. 기술 스택

- React 18
- Vite 8
- Three.js
- React Three Fiber
- React Three Rapier
- Zustand
- Vitest
- localStorage

백엔드는 아직 없다.

## 3. 주요 레이어

```text
React DOM
  HUD, modal, layout

Zustand Store
  player, weapons, phase, elapsedMs, gold, gameKey

React Three Fiber
  Canvas, Game, useFrame, camera

Rapier Physics
  RigidBody, Collider, Sensor

Three.js
  geometry, toon material, outline, vector math

Browser Persistence
  localStorage school_survivor:goldTotal
```

## 4. 주요 파일 책임

| 파일/폴더 | 책임 |
|---|---|
| `src/App.jsx` | 전체 레이아웃, Canvas, Physics, HUD 마운트 |
| `src/components/Game.jsx` | 게임 루프, 카메라, 월드/플레이어/무기/적 배치 |
| `src/store/useGameStore.js` | 전역 상태와 게임 액션 |
| `src/components/Player.jsx` | 플레이어 이동, 피격, 무적 시간 |
| `src/components/Enemies.jsx` | 적 스폰, 웨이브, 버스트, 드롭 |
| `src/components/Enemy.jsx` | 적 행동, 충돌, E05/B01 돌진, E04 원거리 잔존 코드 |
| `src/components/HUD.jsx` | HP/XP/골드/타이머/레벨업/결과 UI |
| `src/components/Weapons/` | 7종 무기 구현 |
| `src/lib/upgrades.js` | 업그레이드 효과와 후보 필터 |
| `src/lib/refs.js` | 프레임 루프용 전역 참조 |
| `src/lib/itemEffects.js` | 적/아이템 효과 연결 |
| `src/components/VFXLayer.jsx` | 공용 VFX 렌더링 |

## 5. 현재 자동 테스트

테스트 파일:
- `src/lib/upgrades.test.js`
- `src/store/useGameStore.test.js`
- `src/components/Enemies.test.jsx`

현재 범위:
- `applyUpgradeToWeapon`
- `isUpgradeAvailable`
- `UPGRADE_EFFECTS` 테이블 무결성

아직 부족한 테스트:
- 골드 드롭 최소/평균 분포
- Stage 1 E04 제외 회귀
- 모바일 HUD/조이스틱은 gstack 기반 검증 필요

## 6. 현재 반드시 조심할 코드 위험

| 위험 | 위치 |
|---|---|
| E04 투사체 회귀 | `Enemy.jsx`, `Enemies.jsx` |
| 모바일 HUD 안전 영역 | `HUD.jsx`, `VirtualJoystick.jsx` |

## 7. 구현 변경 후 기본 검증

```powershell
cd Developer/r3f_prototype
npm test
npm run build
```

프론트/시각 변경이면 gstack browser 검증도 추가한다.
