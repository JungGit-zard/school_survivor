# threemini 구현 기록 — 플레이어 stage prop 가림 방지

- Kanban: `t_7f8a37db`
- 시각: 2026-08-09 11:09
- 범위: 플레이어 3D 모델이 stage prop 뒤에서 완전히 사라지고 바닥 그림자만 남는 렌더/깊이 회귀.

## 재현

- 집중 회귀 테스트를 먼저 실행했다.
- 최초 실행: `npm test -- src/components/PlayerMesh.test.js -t 'draws the complete player body above every stage prop instead of leaving only its floor shadow'`
- 결과: RED. 테스트 하니스의 `document` 누락으로 `toon.js:getToonGradient()`가 실패해 회귀 테스트가 완주하지 못했다.

## 원인/결정

- stage prop 모델·asset은 변경하지 않았다.
- prop 쪽 depthWrite/shadow 설정을 건드리지 않고, 플레이어 메시 표면과 외곽선 쪽에 공유 렌더 안전층을 둔다.
- 플레이어 toon surface와 outline material은 `depthTest=false`, `depthWrite=false`로 렌더하고, stage prop 표면 render order 18/outline 19보다 높은 `PLAYER_OCCLUSION_SAFE_SURFACE_RENDER_ORDER=90`, `PLAYER_OCCLUSION_SAFE_OUTLINE_RENDER_ORDER=91`을 사용한다.
- 바닥 그림자는 기존처럼 depthTest를 유지해 바닥에 붙은 그림자 동작을 보존한다.

## 변경 파일

- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.test.js`

## 검증

- `npm test -- src/components/PlayerMesh.test.js -t 'draws the complete player body above every stage prop instead of leaving only its floor shadow'` → 1 passed / 12 skipped.
- `npm test -- src/components/PlayerMesh.test.js` → 13 passed.
- 참고 실행: `npm test -- src/components/PlayerMesh.test.js src/components/StageObjects/stageObjectAssets.test.jsx`는 PlayerMesh 13개와 StageObjects 23개는 통과했으나, 기존 stageObjectAssets 테스트 1건이 `ClassroomDesk.jsx`의 기존 `getStagePropDepthWritingToonMaterial` 사용 기대 불일치로 실패했다. 이번 카드 변경 파일은 아니다.

## 범위 제외

- prop 모델, prop shadow, Firebase, Graphics Studio 저장값, 사운드, UI, enemy/stage 밸런스는 변경하지 않았다.
- 커밋/푸시는 Advisor 검증 전이라 수행하지 않았다.
