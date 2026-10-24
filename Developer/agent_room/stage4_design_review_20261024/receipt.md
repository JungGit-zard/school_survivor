# Stage4 design document receipt — 2026-10-24

Task: t_f749fd18 / threemini / board escape-zombie-school.
Reuse decision: existing threemini for graphics source/evidence review. 새 에이전트 없음.
Scope: 지정 문서 section 7 append와 이 receipt만 작성. 런타임 구현·배포 없음.

## 초기/최종 해시 및 무결성
- 대상: Graphic_designer/stage4_graphics_and_zombies_20261022.md
- initial bytes: 35910
- initial SHA-256: 3bdb495ba992764a83f0b7c42c9367cf1e0aed3e7353f226a3a5386eeb24be8a
- final bytes: 52302
- final SHA-256: 673820978b9406d9bd6d59c1adf2c4f81b9a1da61e38f5744f87fddeaf791bca
- final[:initial_length] == initial bytes: PASS. 기존 1~6절 prefix byte-identical.
- appended lines: 113; A01~A12 실행 후보와 서로 다른 수용 체크 12개.
- receipt initial: ABSENT, hash N/A. 새 파일이라 이전 prefix 없음.
- receipt final: 자기 파일 전체 해시의 자기참조는 불가능하므로 최종 tool stdout에 별도 기록.
- 상대 Markdown 링크 7개 실제 파일 존재: PASS.
- 기존 작업자 문서·참고 이미지 7개 초기/최종 SHA-256 동일: PASS.
- Git staging/commit/push/checkout/fetch/merge 없음. canonical dirty를 정리·복원하지 않음.

## 사전 확인
- mandatory checker: powershell -NoProfile -ExecutionPolicy Bypass -File Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile threemini -Domain auto -TaskSummary "stage4 design document"; exit 0.
- combined_receipt_sha256: 7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c
- START_HERE, SOURCE_MANIFEST 및 manifest 대상 본문은 선행 컨텍스트 수집에서 읽음. 일부 결과가 내용 대신 읽기 receipt만 노출되어 이 receipt에서 내용을 추정하지 않음. 추가 checker 재확인 exit 0, resolved_domains common/gameplay/graphics, matched gameplay(stage).
- checker 추가 READ_REQUIRED: persistent_subagent_lounge_routing_2026-08-29.md 및 lowpoly_player_b01_b04_faceted_geometry_implementation_2026-08-23.md 전체 읽음.
- gstack 디렉터리 probe는 선행 합본 명령에 포함되었으나 노출 stdout으로 결과를 확정하지 않음. 이번 작업은 브라우저를 사용하지 않음.
- Three_Mini.toml [paths]/[learning], configured graphics_rendering_knowledge_base.md, latest relevant iteration 20261023_t_446df6c0_boss_preview_lifecycle_verified.md 읽음.
- kanban-worker skill 로드. 제공된 카드의 blocked 상태는 인지했으며 이번 명시 사용자 재지시로 지정 문서만 수행; 카드 상태나 DB는 변경하지 않음.

## 판본과 실제 읽기
- git -C ../releases/stage4-planning-20261022 rev-parse refs/remotes/origin/zombie_only: a65683af15c14986ad33bb4e725312e96cdbdd11.
- canonical git rev-parse HEAD: e6a252ea6280c50e55eab31b4fe40a6b605b4fa2. 전달된 6f와 달라 실제 조회값을 부록에 표기.
- git show 1fcfc848 --stat --oneline 및 위 ref stageConfig.js: Stage1~4 표시, 정상 계정 잠금 유지 SOURCE 확인. live 증거 아님.
- 소스는 전부 git -C 위 release show REF:path로 한정 구간 읽음; 아래 SHA는 전체 git blob bytes의 SHA-256.
- `Developer/r3f_prototype/src/lib/stageConfig.js` SHA-256 `852d75c686fccf5c7874a3d0f9569a5a043d23813cafee8060d25be345be4521`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js` SHA-256 `070ef70a75f388101960dc3dbcc42720011657fe436030a08501f35dace81998`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.js` SHA-256 `06f61d121da6cd0175ad51682f568038393ddb132be6885fd52043e5a6d30eca`
- `Developer/r3f_prototype/src/components/ClassroomFloor.jsx` SHA-256 `d9fc7d2b702d205c5d18b130fea66b5679572bf3d847885825d2564a1e530b3c`
- `Developer/r3f_prototype/src/components/StageObjects/KitchenProps.jsx` SHA-256 `fae772d0cb03445fa32eff134c90a3c9367f2d079d5807ecffec07a1320467df`
- `Developer/r3f_prototype/src/components/StageObjects/PressureCauldron.jsx` SHA-256 `f922609cb41eaf262acfeee10911c968fb45b1875e1a510784ddf6bc8edaa29b`
- `Developer/r3f_prototype/src/lib/stage4PressureCauldronHazard.js` SHA-256 `0842d2600a4a00529e4bd151ed25e05a9065e240eeaf7935724e8808352c1588`
- `Developer/r3f_prototype/src/components/Enemy.jsx` SHA-256 `f7d6dbfdc0ea347b8a414e184f18cb44ed57487054743d39d7ea22f99f36497f`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx` SHA-256 `69d36f4bf665266e0aebb9b506e974e21dd5ca7a2c884551763b37accddace61`
- `Developer/r3f_prototype/src/lib/b04SoupBlast.js` SHA-256 `f6d234b9180ef69458cb30931fda29ba47a04f05439e96e48f14b35af37cd91e`
- `Developer/r3f_prototype/src/lib/chefBossPhase.js` SHA-256 `02a3cb90fb704aacc15ad89e12aa15042a2434881d9df2efaf81ea87edf82ef2`
- `Developer/r3f_prototype/src/lib/burstEvents.js` SHA-256 `96fbdaf694fa714cc6100bf21e6db174a7e3cd5a50caa26283e2c3c6ca8481cc`
- `Developer/r3f_prototype/src/lib/quests.js` SHA-256 `7fb644a197626f090c249ca574a5c4e3a400c85571575a57d33a9e37e703012d`
- `Developer/r3f_prototype/src/store/useGameStore.js` SHA-256 `44a3da37bf5384aaca6e48fc8bfc0fa24d85eb308d86b6248eb12a1a7971683d`

## 로컬 근거: 초기/최종 동일 해시
- `Planner/stage_zombie_concept_plan_20261023.md` SHA-256 `cc88c0f91d172412a529f12631a8a8d95be26a1db820506ecfdf49c46c7fe612`
- `Graphic_designer/stage_zombie_visual_method_20261023.md` SHA-256 `dcd134c1f6f1c197f47407d6545255b39d4222cdc1b9905d9e28d8d93560d474`
- `Graphic_designer/stage_zombie_blockout_20261024/README.md` SHA-256 `2cfa549947b5d0b8e028e24b67b06ae81eeeec4d51671d920d18cef3ab9bc8dd`
- `Graphic_designer/stage_zombie_blockout_20261024/stage4_cafeteria_blockout.png` SHA-256 `c33a4179ed1026f5d4b3a04a532538b9239659f3419ef3a45591070ebe022395`
- `Graphic_designer/graphic_asset/background_floor/4stage/stage4_prop.png` SHA-256 `1583fa7d5b93941b75ba828e4ea822c5879c1562717db1c53611c97bf167a49e`
- `Quaility_Assurance/screenshots/stage4_gamecam_tilefix_2026-07-26.png` SHA-256 `1e46825b99db24139f61b4cf769b972a87dc8039a73b38f1f62721761be0c9b3`
- `Quaility_Assurance/screenshots/stage4_topdown_tilefix_2026-07-26.png` SHA-256 `2b5bd2b411b010ef97395c6404912fee13a6e8da8286f494b4a9d968d29116e0`
- Planner 및 visual method·blockout README: 전체 읽음. Stage4 blockout PNG: vision_analyze로 직접 열람.
- 주방 sheet와 2026-07-26 캡처의 내용 설명은 Advisor의 실제 열람 전달을 인용; 이번 worker는 해당 이미지들을 시각 재열람하지 않음.
- PNG 해시는 보존 검증용이며 자산 품질·입력 승인 검수나 게임 렌더 증거가 아님.
- lib/stageQuestConfig.js 조회 실패: 해당 ref에 없음. 제한된 lib tree 이름 확인으로 실제 lib/quests.js를 찾아 읽고 인용; 가상 파일 근거를 만들지 않음.
- 선행 manifest 합본 읽기의 stdout은 내용 대신 실행 receipt로 노출되었음. 실패 원인이나 미노출 내용을 임의로 확정하지 않음.

## 한계·금지 준수
- 새 현재 게임플레이 렌더 없음. Firebase read/write 없음. 실제 게임 QA·게임 테스트·빌드·브라우저·실기기 검증 없음.
- 통행·모바일 성능·시야·보스 해금 영속화는 후속 수용 기준이며 PASS 아님.
- 2026-07-26 brown floor/center prep는 과거 자료. 현재 버그라고 진단하지 않음.
- stage-only 외형은 승인된 별도 매핑 없이는 공유 E타입을 변경할 수 없음.
- 기존 models/palette/scale/animation만 활성 제안. 신규 복장 후보는 보류/superseded로 명시, 원문 보존.
- GraphicsStudio.jsx, HTML builder, 다른 작업자의 소스·문서·아트는 수정하지 않음.
- canonical 전체에 다른 worker 동시 변경이 있으므로 모든 dirty의 전역 불변을 주장하지 않음; 이 worker의 쓰기는 위 두 문서뿐.

## 검증된 redacted learning iteration — 20261024 / t_f749fd18
- profile: threemini. reviewer: threemini self-review; Advisor 독립 검토 미수행.
- sources/hashes: 위 source a65683af와 initial/final 문서 SHA, 최신 Planner/visual method 보존 해시.
- tested evidence: append 후 initial 길이 prefix bytes 비교 PASS, 상대 이미지 링크 존재 PASS, 지정 reference 문서·이미지 해시 보존 PASS.
- verified lesson: source configuration, dirty 작업본, generated blockout, historical screenshot, live 관찰은 서로 다른 증거층이다.
- negative lesson: 과거 screenshot의 brown floor/center prep를 최신 버그로 재해석하거나 오래된 costume 제안을 현행 box-only 지시보다 우선하면 안 됨.
- redaction result: PASS. credential·토큰·개인 계정·Firebase payload 없음. 경로·task ID·source hash·검증 결과만 기록.
- iteration은 허용된 이 receipt에 신규 절로 기록. 두 파일 소유권을 지키기 위해 외부 knowledge/iterations 파일·TOML·skill 추가 수정 없음.
