# 타이틀 주인공 핑크 블록 레퍼런스 / Studio 패리티 QA

- 날짜: 2026-07-18
- 담당: balanceqa
- Kanban: t_6a3174ac
- 프로젝트: Escape! zombie school
- 작업 위치: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- 판정: TARGET PASS / RELEASE-SCOPE HOLD

## 결론

주인공 레퍼런스 매칭 자체와 Studio/runtime/title 공유 경로는 PASS로 판단한다. `PlayerMesh`는 계속 `StudioTunedGroup itemId="player"`를 사용하고, `TitleScene3D`의 `TitlePlayer`는 별도 프록시가 아니라 공유 `<PlayerMesh />`를 렌더링한다. focused 테스트 141/141 및 production build가 통과했다.

다만 현재 작업 트리는 다른 카드의 보스/로비/스테이지락/Stage 4 관련 미커밋 변경이 함께 섞인 상태라, 릴리스 범위 기준으로는 “이번 주인공 변경 외 unrelated visual/layout/gameplay change 없음”을 깨끗하게 증명할 수 없다. 이 QA는 주인공/타이틀/Studio 패리티 검증은 PASS로 기록하되, 릴리스 후보로 묶기 전에는 unrelated diff 분리 또는 별도 승인 확인이 필요하다.

## 필수 문서 확인

확인한 문서:

- `project_develop_policy.md`
- `AGENTS.md`
- `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
- 부모 카드 결과: t_7f4596b5 — Advisor visual review PASS, focused tests 141/141, production build PASS, screenshot `Graphic_designer/QA_Reviews/title_player_reference_2026-07-18.png`
- 구현 기록: `Developer/player_pink_block_reference_implementation_2026-07-18.md`
- 그래픽 기록: `Graphic_designer/player_pink_block_reference_match_2026-07-18.md`

정책상 주의한 점:

- Source-Controlled Player Seed는 Firebase 정본/원격 승인으로 기록하지 않음.
- 숫자 scene-tree 파츠 경로는 임의 변환/재구성하지 않음.
- 삭제된 타이틀 사각 조명은 복구 대상으로 보지 않음.
- 검증하지 않은 AAB/Android WebView 시각 패리티는 검증 완료로 기록하지 않음.

## 현재 diff / 범위 확인

명령:

```bash
git status --short --branch && git diff --stat && git diff -- Developer/r3f_prototype/src/components/PlayerMesh.jsx Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx Developer/r3f_prototype/src/lib/graphicsStudioConfig.js Developer/r3f_prototype/src/components/StudioTunedGroup.jsx
```

결과 요약:

- 브랜치: `zombie_only...origin/zombie_only`
- 주인공 관련 직접 변경: `Developer/r3f_prototype/src/components/PlayerMesh.jsx`, `Developer/r3f_prototype/src/components/PlayerMesh.test.js`, `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`
- title component 본체 `TitleScene3D.jsx`는 현재 relevant diff name-only에 없음.
- `StudioTunedGroup.jsx`는 현재 relevant diff name-only에 없음.
- `graphicsStudioPlayerSource.js`는 status/diff 없음.
- 현재 전체 작업 트리에는 `Enemy.jsx`, `Lobby.jsx`, `StageBossPreview.jsx`, `ZombieMesh.jsx`, `stageConfig.js`, StageLock 신규 파일, Stage 4/로비/보스 관련 문서·이미지 등 다른 카드의 미커밋 변경이 함께 존재함.

범위 리스크:

- 이 혼합 작업 트리 때문에 “릴리스 후보 전체에 unrelated visual/layout/gameplay change가 없다”는 전역 조건은 이 QA에서 PASS 처리하지 않는다.
- 단, 주인공 참조 매칭 변경 자체는 기존 PlayerMesh 블록의 크기/위치/색 조정 중심이며, `graphicsStudioPlayerSource.js`를 수정하지 않은 것을 확인했다.

## 레퍼런스 특징 체크

근거:

- 코드 정적 확인: `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- 회귀 테스트: `Developer/r3f_prototype/src/components/PlayerMesh.test.js`
- 실제 타이틀 스크린샷: `Graphic_designer/QA_Reviews/title_player_reference_2026-07-18.png`
- 시각 기록: `Graphic_designer/player_pink_block_reference_match_2026-07-18.md`

체크 결과:

- 큰 블록 머리: PASS — `PLAYER_HEAD_SIZE` `[0.8, 0.68, 0.58]`, 타이틀 스크린샷에서도 몸보다 큰 직사각 머리로 보임.
- 분홍 캡/앞머리/옆머리: PASS — hairTop/hairFr는 `0xff8fb0`, side/back locks는 `0xd94070`; 스크린샷에서도 분홍 머리 덩어리와 옆머리가 보임.
- 흰 클립: PASS(code) / PARTIAL(타이틀 원거리) — `hairClip` 흰 블록 `0xf4f4f4`가 유지됨. 타이틀 스크린샷에서는 거리와 조명 때문에 작은 흰 클립이 약하게 보인다.
- 살구색 얼굴: PASS — face/head color `0xffc39b`, 스크린샷에서 살구색 얼굴 확인.
- 두 개 마젠타 블록 눈: PASS — eyeL/eyeR `0xcf2f77`; 스크린샷에서 두 눈 위치가 보임.
- 빨간 재킷/소매: PASS — body와 sleeve color `0xd42020`.
- 흰 상의 블록: PASS — 상단 흰 블록 `0xf4f4f4`.
- 빨간 중앙 패널: PASS with approximation — 별도 신규 child를 추가하지 않고 기존 빨간 jacket/body 영역이 중앙 빨간 영역 역할을 함. 숫자 파츠 경로 보존을 우선한 타협임.
- 전면 파란 스트랩 2개: PASS — 좌우 2개 strap color `0x005cff`.
- 노란 허리 trim: PASS — waist block `0xffd100`.
- 넓은 파란 치마 block: PASS — skirt/waist block `0x2d8cff`, 스크린샷에서도 하단 파란 블록으로 보임.
- 밝은 다리: PASS — leg color `0xebebf2`.
- 투톤 회색 신발: PASS — upper `0x8090a8`, lower `0x4a5566`.
- 살구색 손: PASS — sleeve 끝 hand block `0xffc39b`.
- 두꺼운 검정 외곽선: PASS — render-only outline blocks와 title screenshot 상 검정 외곽선 확인.
- 타원 그림자: PASS — `PLAYER_MESH_LAYOUT.floorShadow`, title screenshot에서 캐릭터 아래 검정 타원 확인.

## Studio / title / runtime 패리티 확인

명령:

```bash
git diff -- Developer/r3f_prototype/src/lib/graphicsStudioPlayerSource.js
printf '\n--- Title PlayerMesh refs ---\n'
grep -n "PlayerMesh\|TitlePlayer\|ToonBox\|StudioTunedGroup itemId=\"player\"\|StudioTunedGroup" Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/PlayerMesh.jsx Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx | head -80
printf '\n--- player tests refs ---\n'
grep -n "source-controlled player Studio part key registration order\|TitlePlayer\|proxy block\|StudioTunedGroup" Developer/r3f_prototype/src/components/PlayerMesh.test.js Developer/r3f_prototype/src/components/TitleScene3D.test.jsx Developer/r3f_prototype/src/components/GraphicsStudioPreview.test.js Developer/r3f_prototype/src/components/StudioTunedGroup.test.jsx Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js
```

결과 요약:

- `TitleScene3D.jsx:8` imports `PlayerMesh`.
- `TitleScene3D.jsx:195` defines `TitlePlayer()`.
- `TitleScene3D.jsx:210` renders `<PlayerMesh />`.
- `TitleScene3D.jsx:588` renders `<TitlePlayer />`.
- `PlayerMesh.jsx:257` keeps `<StudioTunedGroup itemId="player">`.
- `PlayerMesh.jsx:349` closes that same wrapper.
- `PlayerMesh.test.js:89` has the source-controlled player Studio part key registration-order guard.
- `StudioTunedGroup.test.jsx` still covers `StudioTunedGroup itemId="player"` runtime behavior.

판정:

- Title uses shared PlayerMesh: PASS.
- Graphics Studio/gameplay share `StudioTunedGroup itemId="player"`: PASS.
- Source-controlled player Apply snapshot modified/reconstructed: NOT OBSERVED.
- Numeric registered part order guarded: PASS by test and static source review.

## 금지 회귀 검색

명령:

```bash
printf '%s\n' '--- frozen/rest reset search ---'
grep -RIn "frozen\|rest.*reset\|reset.*rest\|ToonBox\|rectangle light\|Rect.*Light" Developer/r3f_prototype/src/components/PlayerMesh.jsx Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx Developer/r3f_prototype/src/components/StudioTunedGroup.jsx Developer/r3f_prototype/src/lib/graphicsStudioConfig.js || true
printf '%s\n' '--- player source snapshot status ---'
git status --short Developer/r3f_prototype/src/lib/graphicsStudioPlayerSource.js
git diff --name-only -- Developer/r3f_prototype/src/lib/graphicsStudioPlayerSource.js
printf '%s\n' '--- diff name-only relevant ---'
git diff --name-only -- Developer/r3f_prototype/src/components/PlayerMesh.jsx Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx Developer/r3f_prototype/src/components/StudioTunedGroup.jsx Developer/r3f_prototype/src/lib/graphicsStudioConfig.js Developer/r3f_prototype/src/lib/graphicsStudioPlayerSource.js
```

결과:

- frozen/rest reset/ToonBox/rectangle light 검색: 출력 없음.
- `graphicsStudioPlayerSource.js` status/diff: 출력 없음.
- relevant diff name-only: `GraphicsStudioPreview.jsx`, `PlayerMesh.jsx`, `graphicsStudioConfig.js`.

해석:

- 금지된 frozen/rest-reset workaround, 삭제된 `ToonBox` 타이틀 사각 조명 복구는 발견되지 않음.
- player source snapshot은 수정되지 않음.
- `GraphicsStudioPreview.jsx`/`graphicsStudioConfig.js` diff에는 StageLock/Studio background 같은 다른 카드 변경이 함께 있어 릴리스 범위 HOLD 항목으로 분리한다.

## 테스트 결과

### Focused PlayerMesh / TitleScene3D / GraphicsStudioPreview / StudioTunedGroup / config / GraphicsStudio

명령:

```bash
npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx
```

작업 디렉터리:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

결과:

- Branch guard: PASS (`branch=zombie_only`, head `907b106a463faf3072e30eeda6528f0ad9eeb8f3`)
- Legacy B02 source gate: PASS
- Test files: 6 passed / 6
- Tests: 141 passed / 141
- Duration: 6.50s
- 관찰된 기존 경고: duplicate Three.js import warning, React `act(...)` warning, unrecognized `<mesh>/<group>` jsdom warning. 실패는 아님.

### Production build

명령:

```bash
npm run build
```

작업 디렉터리:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

결과:

- Branch guard: PASS (`branch=zombie_only`, head `907b106a463faf3072e30eeda6528f0ad9eeb8f3`)
- Legacy B02 source gate: PASS
- Vite build: PASS, 253 modules transformed, built in 474ms
- Postbuild legacy artifact gate: PASS (`Legacy B02 artifact gate passed (dist)`)
- 관찰된 기존 경고: 500 kB 초과 chunk warning. 실패는 아님.

## 브라우저/스크린샷 검증

이번 balanceqa 실행에서는 새 브라우저를 열지 않았다. 따라서 `npm run browser:reserve`는 실행하지 않았다.

사용한 기존 부모 카드 스크린샷:

- `Graphic_designer/QA_Reviews/title_player_reference_2026-07-18.png`

스크린샷 판정:

- 타이틀 실제 구성 안에서 주인공이 중앙 전면에 공유 PlayerMesh 기반 pink block student로 보인다.
- 큰 분홍 블록 머리, 살구 얼굴, 마젠타 눈, 빨강/흰색/파랑/노랑 의상 요소, 밝은 다리, 투톤 신발, 외곽선, 타원 그림자가 확인된다.
- 흰 머리 클립은 코드상 존재가 명확하지만 타이틀 원거리 스크린샷에서는 작은 요소라 약하게만 보인다.

## Blockers

- 릴리스 범위 blocker: 현재 작업 트리가 여러 카드의 미커밋 변경을 함께 포함한다. 주인공 레퍼런스 변경만 기준으로는 PASS지만, 전체 릴리스 후보로 “unrelated visual/layout/gameplay/audio changes 없음”을 주장하려면 diff 분리 또는 각 변경의 별도 QA 승인 연결이 필요하다.

## Observations

- PlayerMesh 직접 파츠 등록 순서는 테스트로 고정되어 있고, 이번 검증에서 `graphicsStudioPlayerSource.js` 변경은 관찰되지 않았다.
- TitleScene3D 본체는 변경되지 않았고, 테스트는 공유 PlayerMesh 사용을 강화했다.
- Audio 파일/registry 직접 변경은 이 focused diff 검증 범위에서 관찰하지 않았다. 다만 전체 작업 트리에는 다른 카드의 변경이 많아 audio-free 릴리스 전체 보증은 별도 전체 diff 기준으로 다시 확인해야 한다.
- AAB/Android WebView 실행은 이번 카드 acceptance에 production build까지만 요구되어 수행하지 않았다. Android 실제 화면 패리티는 검증 완료로 기록하지 않는다.

## 최종 QA 판정

- 주인공 레퍼런스 매칭: PASS
- Title uses shared PlayerMesh: PASS
- Graphics Studio/gameplay shared `StudioTunedGroup itemId="player"`: PASS
- Source-controlled player snapshot 보존: PASS
- 금지된 frozen/rest-reset/타이틀 사각 조명 복구 미발견: PASS
- focused tests: PASS, 141/141
- production build: PASS
- 릴리스 후보 전체 scope cleanliness: HOLD due mixed working tree
