# Faceted Player/B01~B04 Studio Path QA — 2026-08-23

- Kanban: `escape-zombie-school` / `t_fc744979` (`balanceqa`)
- Baseline: `c40c5b2` (`zombie_only`)
- Scope: Player, B01~B04의 저폴리 기하 교체. 물리, 게임 수치, 스폰/타이밍, Firebase/Studio 저장 경로는 범위 밖이며 변경 금지.

## Studio scene-tree regression result

`PlayerMesh.jsx`, `ZombieMesh.jsx`를 baseline과 정적 대조했다.

| 대상 | `reg()` 순서 | pivot 행 | ZBlock 수 |
| --- | --- | --- | --- |
| Player | 동일 (15) | 동일 | 해당 없음 |
| B01 | 동일 (7) | 동일 | 21 → 21 |
| B02 | 동일 (6) | 동일 | 30 → 30 |
| B03 | 동일 (6) | 동일 | 27 → 27 |
| B04 | 동일 (6) | 동일 | 44 → 44 |

- B01: `head, body, armL, armR, mathSetSquare, legL, legR`
- B02/B03/B04: `head, body, armL, armR, legL, legR`
- Player: 기존 15개 파트 키 순서 유지.
- `geometryKind`와 `getCachedFacetedGeo()`만 각 기존 mesh에 추가되었고, 그룹/메시 삽입·삭제·재정렬은 없다.
- Studio ID 유지: `player`, `zombie-b01`, `stage2-boss-v2`, `zombie-b03`, `zombie-b04`.
- `node scripts/assert-no-legacy-b02.mjs`: 통과. B02는 `stage2-boss-v2`만 사용한다.

## Shared runtime proof

- 게임: `Player.jsx -> PlayerMesh`, `Enemy.jsx -> ZombieMesh`.
- Graphics Studio: `GraphicsStudioPreview -> PlayerVisual/EnemyVisual -> shared mesh`.
- Boss preview: `StageBossPreview -> EnemyVisual -> ZombieMesh`.
- 타이틀: `TitleScene3D -> PlayerMesh` 및 `ZombieMesh` 직접 import.
- Firebase, local/session storage, readiness, Matilda/E01~E07, collider, stat, spawn, timing 관련 변경 행은 없다.

## Verification

```text
git diff --check                                      PASS
node scripts/assert-no-legacy-b02.mjs                 PASS
npx vitest run ZombieMesh.test.js -t "Faceted ..."   PASS (1 passed, 25 skipped)
npm exec vitest run PlayerMesh/StageBossPreview/TitleScene3D tests
                                                     PASS (4 files, 59 tests)
```

전체 관련 suite는 129개 중 126개 통과, 다음 3개는 현재 diff와 무관한 기존 불일치로 분리했다.

1. `ZombieMesh.test.js`: RZT 기대 HP/scale(28/0.88)과 현재 `Enemy.jsx` 값(140/1.76)이 이미 다름.
2. `GraphicsStudioPreview.test.js`: 변경되지 않은 `TitleScene3D.jsx`에 제거된 `playerVisualReady ?` 문자열을 기대함.
3. `StudioAnimationContract.test.js`: 변경되지 않은 `PressureCauldron.jsx`에 `STUDIO_OUTER_MOTION_ONLY` 선언이 없음.

## Acceptance

PASS — 저폴리 기하 적용은 기존 Studio numeric child-path, 파트 피벗, 공유 game/Studio/title 소스, B02 v2 정본을 보존한다.
