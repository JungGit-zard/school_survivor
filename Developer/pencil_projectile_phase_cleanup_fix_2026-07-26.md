# 연필 화면 잔류 수정 — 2026-07-26

## 원인

`usePlayingFrame`은 `phase !== 'playing'`이면 실행되지 않는다. 따라서 레벨업에서 멈춘 연필은 피격·3.5초 수명 만료의 `onExpire` 경로도 실행하지 않아 화면에 고정되어 남았다.

## 수정

`PencilThrow`가 `phase`를 구독하고 비게임 상태 전환 effect에서 기존 `requestProjectiles([])` 경로로 목록을 비웠다. 프레임 루프의 React 상태 갱신이나 새 투사체 구조는 추가하지 않았다.

## 보존

- 관통 후 연속 발사 append
- 3zm/2.25 world units 자격, 550ms, 관통 1→2→3, 3.5초 수명
- 피해·속도·치명타·호밍 해제·PencilModel/StudioTunedGroup

## 검증

- `npx vitest run src/components/Weapons/PencilPierceFireRegression.test.jsx src/components/Weapons/Pencil.test.jsx src/lib/pencilRangeBoundary.test.js src/lib/weaponCollision.test.js src/lib/gameplayUnits.test.js src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/components/Weapons/WeaponHitSfx.test.jsx` — 8 files, 99 tests PASS
- `npm run build` — PASS (기존 vendor-three chunk-size 경고만 있음)
