# PLAYER v9 backpack geometry final QA — t_8166eb19

일시: 2026-10-04 20:33 local
담당: balanceqa
범위: `Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final.blend` 및 `PLAYER_v9_final.glb` 최종 독립 QA
작업 성격: v9 백팩 seam cleanup 이후 final 산출물 재검증/QA 기록 갱신. 런타임, Studio, title, Firebase, v8 원본 수정 없음. 커밋 없음.

## 결론 / integration gate

- 판정: PASS for gameplay integration gate.
- 최종 v9 side/back/8-way 시각 QA: PASS. 분리된 파란 seam fragments는 관찰되지 않았다.
- 백팩 깊이: PASS. v9 actual blend 기준 main pack Y depth는 v8 대비 +0.0800 units, pack union Y depth는 v8 대비 +0.1405 units로 v8 이상을 유지한다.
- 어깨끈 연결: PASS. v9 actual blend 기준 strap union은 몸통 Y와 0.7000 units, main pack Y와 0.3931 units 겹친다. 전면/어깨/가방 방향으로 연결된 메쉬 관계이며 detached card가 아니다.
- 최종 GLB load: PASS. Blender GLB import OK, local viewer load OK, Playwright viewer assertions 24/24 PASS.
- 구조 게이트: PASS. v9 actual blend closed meshes nonmanifold 0, negative signed volume 0. v9 GLB raw import는 material/normal split로 raw nonmanifold object 36개가 검출되지만 1e-6 weld 후 closed-object nonmanifold 0, negative 0으로 통과한다. `Decal_*` 평면은 의도된 open decal로 별도 분류했다.
- 이전 pre-fix/stale 수치와 해시는 superseded 처리한다. 본 문서의 아래 hash/metrics가 final QA 정본이다.

## Mandatory gate / 정책 준수

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "v9 backpack final QA geometry screenshots glb integration gate"
exit_code=0
resolved_domains=["common","qa"]
matched_domains=["qa"]
match_evidence=[{"domain":"qa","keyword":"qa"}]
combined_receipt_sha256=fc665bc16eabd313a9535bb19c244ac187b5f1e27661f368959ed58b31982daa
```

필독 확인: `AGENTS.md`, `project_develop_policy.md`, `Bang_Rules.md`, `CLAUDE.md`, `SESSION_CONTINUITY.md`, latest `SESSION_MEMORY.md` entry, mandatory pre-command README/manifest, `Developer/agent_room/balanceqa_zombie_obstacle_avoidance_2026-07-25.md`, 기존 최신 QA record.

```text
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
GSTACK_OK
```

초기 repo 상태 확인:

```text
git status --short --branch
## zombie_only...origin/zombie_only
... existing unrelated dirty/untracked files present before this QA, including AGENTS.md, guard files, App.jsx, marketing files, and prior untracked Graphic_designer/Quaility_Assurance artifacts.
```

## 실행 명령 및 실제 결과

### 1) v9 final Blender rerender / GLB regenerate

```text
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/build_player_v9.py -- --final
exit_code=0
```

주요 출력:

```text
Saved: .../final/PLAYER_v9_final_front.png
Saved: .../final/PLAYER_v9_final_side.png
Saved: .../final/PLAYER_v9_final_back.png
Saved: .../final/PLAYER_v9_final_threequarter.png
Saved: .../final/PLAYER_v9_turn_000.png ... PLAYER_v9_turn_315.png
Saved: .../final/PLAYER_v9_pose_walk.png
Saved: .../final/PLAYER_v9_pose_right_arm_swing.png
PLAYER_V9_QA={"mode":"final", ... "triangle_count_structural":3776, "mesh_parts":36, "triangle_count_export_total":3784, "nonmanifold_edges_by_object":{}, "negative_signed_volume_by_object":{}, "blend_size_bytes":355834, "glb_size_bytes":388988, "runtime_integration":"not connected; PlayerMesh.jsx untouched"}
```

### 2) v9 contact sheet regeneration + geometry verifier

```text
python Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/make_final_contact_v9.py
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_verify_v9_backpack_geometry.py > Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_verify_v9_backpack_geometry.log 2>&1
CONTACT_AND_GEOMETRY_EXIT=0
```

Geometry summary from `PLAYER_v9_backpack_geometry_verification.json`:

```text
v8 actual final blend meshes 35 tris 3244 pack_objs 7 straps 4
main dims [0.6999999881, 0.3200000077, 0.7300000191]
pack union dims [0.7549999952, 0.9795000255, 0.7300000191]
closed nonmanifold 0 negative 0
strap overlaps torso/main 0.6999999732 / 0.1514075696

v9 actual final blend meshes 40 tris 3784 pack_objs 12 straps 6
main dims [0.7599999905, 0.4000000060, 0.8199999332]
pack union dims [0.8849999905, 1.1200000346, 0.8248939514]
closed nonmanifold 0 negative 0
strap overlaps torso/main 0.6999999732 / 0.3930771947

v8 actual final glb load_ok True meshes 35 tris 3244 raw_nm_objs 31 welded_nm_objs 0 welded_neg_objs 0
v9 actual final glb load_ok True meshes 40 tris 3784 raw_nm_objs 36 welded_nm_objs 0 welded_neg_objs 0

delta={"main_width_x_delta":0.0600000024,"main_depth_y_delta":0.0799999982,"main_height_z_delta":0.0899999142,"pack_union_depth_y_delta":0.1405000091,"pack_object_count_delta":5,"strap_object_count_delta":2}
```

### 3) v8/v9 stale SHA 비교

```text
PLAYER_v8_final_side.png 342405 47e13aa2d3c709e3902e90bc58dd6e4f00159687d64088ed338250536b19a058
PLAYER_v9_final_side.png 339099 a6a1822a2aa6f1ed5e5754b920d13faa60a6d519160197809e976ef156544a78
PLAYER_v8_final_back.png 384986 636e90882ed87b2c61bda29075c25c2a25bd54ef0f5932f3566990ef13704be3
PLAYER_v9_final_back.png 377041 653278be8ef34003a979f6fa676347f0bd3bb88aab20b337d3719a1f2488f1fe
```

결과: v8/v9 side/back hash가 서로 다르므로 이번 final v9 PNG는 stale copied evidence가 아니다.

### 4) local viewer load / Playwright QA

브라우저 상한 가드:

```text
npm run browser:reserve
exit_code=0
branch guard: ok
GAME_BROWSER_INSTANCES=1 LIMIT=3 MODE=reserve
```

로컬 서버와 viewer QA:

```text
python -m http.server 8788 --bind 127.0.0.1
node Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_v9_viewer_yup_assertions.mjs > Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_playwright_v9_viewer.log 2>&1
VIEWER_QA_EXIT=0
```

`PLAYER_v9_yup_viewer_qa.json` 결과:

```text
url=http://localhost:8788/.../PLAYER_v9_standalone_viewer.html
html loaded over local server status=200
GLB upright Y-up bboxSize=[1.6620327740,3.0900000194,1.2847305591]
front/side/back/threeq frame assertions pass
consoleMessages=[]
pass=true
summary=24/24 assertions passed
screenshots=8
```

## Visual QA observations

- Source/model contact sheet: v9 side와 back에서 백팩은 몸 뒤쪽에 두께 있는 파란 직육면체 덩어리로 보인다. 후면 flap, pocket panel, buckle, side vertical rails가 정렬되어 있고 floating seam 조각은 보이지 않는다.
- 8-way contact: 045/090/135/180/225/270/315도 모두 backpack mass가 유지된다. 135/180/225도에서 후면 flap/pocket이 명확하며, 000/045/315도에서는 전면 straps가 몸 앞쪽에서 보인다.
- GLB viewer back screenshot: `final/PLAYER_v9_final.glb`가 로드되어 후면 backpack과 side straps/rails가 표시된다. 별도 분리 seam 조각은 관찰되지 않았다.
- 제한: 모델은 원본 일러스트 대비 더 blocky/boxy하다. 이번 gate는 cleaned seam + depth + strap connection + GLB load + mesh integrity 검수이므로 style fidelity 결함으로는 분류하지 않았다.

## 산출물 / evidence paths

- Fresh F/S/B/3q renders:
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final_front.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final_side.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final_back.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final_threequarter.png`
- Eight-way render contact: `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_360_contact.png`
- Source/model contact: `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_source_vs_model_contact.png`
- Geometry verification JSON/log/script:
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_backpack_geometry_verification.json`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_verify_v9_backpack_geometry.log`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_verify_v9_backpack_geometry.py`
- Updated QA JSON from Blender build: `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final_qa.json`
- Viewer QA JSON/log/screenshots:
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/PLAYER_v9_yup_viewer_qa.json`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/qa_playwright_v9_viewer.log`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_yup_screenshots/view_front.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_yup_screenshots/view_side.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_yup_screenshots/view_back.png`
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_yup_screenshots/view_threeq.png`
- This QA report: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/player_v9_backpack_geometry_rerender_qa_2026-10-04.md`

## Hash manifest for final artifacts

```text
PLAYER_v9_final_front.png        391489  6886cfd374fc19d1e09c655d09494a373584cced9e6ddab7fe4437134382c6bf
PLAYER_v9_final_side.png         339099  a6a1822a2aa6f1ed5e5754b920d13faa60a6d519160197809e976ef156544a78
PLAYER_v9_final_back.png         377041  653278be8ef34003a979f6fa676347f0bd3bb88aab20b337d3719a1f2488f1fe
PLAYER_v9_final_threequarter.png 414667  2f4b7811b1a67a35af25d4da2b43a01f6201499c01dacf868244b0bbd13b74ea
PLAYER_v9_360_contact.png        597156  e8c4a9b4486f6e508ce0d292587aa04d1fbf693e93478be426aae99fb5dd25a6
PLAYER_v9_source_vs_model_contact.png 958710 5f05662b915bbb53c0f043b2723145f9af431e9ff5dfe86c50f1e25e99c91ece
PLAYER_v9_final.blend            355834  0383028dfa896a89f5ae82974d819fc940f63db8c3a600ff485e8364733473e6
PLAYER_v9_final.glb              388988  fc1c6ca450135f3cd3f69d72e6e57c4528fc6364b536e7d20aded5933403a099
PLAYER_v9_final_qa.json          4224    1c5922864489e7fcbb30c98aed01393495f78625cdeee22c0f7cd341dbb73f7b
PLAYER_v9_backpack_geometry_verification.json 11894 a7cb53bd3214545ed1e0c89ee8c389aa2a578b1d89e89942169d92987ff70c45
PLAYER_v9_yup_viewer_qa.json     11495   f89b121c8d23cb2e3190e42464c04c196c3ee119d5ffa7907345304181c31a90
```

## Blockers

- 없음.

## Observations / Risk list

1. GLB raw re-import nonmanifold counts are not a final fail by themselves because 1e-6 vertex weld resolves all closed-object nonmanifold counts to 0, and blend source closed objects are already manifold 0/negative 0. This appears to be GLTF import vertex/material/normal splitting rather than authored holes.
2. `Decal_*` planes are intentionally open surfaces and are separately reported as expected open-decal nonmanifold edges.
3. v9 model is boxier/larger than source art. This is not a blocker for the current cleaned-seam integration gate.
4. 작업 전부터 repository에는 unrelated dirty/untracked files가 많았다. 본 QA는 지정된 v9 final evidence와 QA report만 생성/갱신했고 runtime/Studio/title/Firebase/old v8는 수정하지 않았다.
5. `qa_playwright_v9_viewer.log`는 stdout/stderr가 없어 0 bytes다. pass evidence는 exit code 0 및 `PLAYER_v9_yup_viewer_qa.json`의 `summary=24/24 assertions passed`로 확인했다.

## Acceptance 판정

- Mandatory gate/read-required/gstack: PASS.
- Non-stale v9 side/back and eight-way renders: PASS.
- No detached blue seam fragments: PASS.
- Backpack depth remains >= v8: PASS.
- Both shoulder straps/front straps connect front/torso to pack: PASS.
- Blend closed mesh nonmanifold/negative volume: PASS.
- GLB load, mesh count, triangle count recorded: PASS.
- Viewer loads new GLB: PASS, 24/24 assertions.
- Firebase/runtime/title untouched: PASS.
- Commit not performed: PASS.
