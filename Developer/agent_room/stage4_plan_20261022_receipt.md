# Stage 4 기획 작업 영수증 — 2026-10-22

## 카드·범위

- Kanban card: `t_fca09e10` / Stage4 advancement plan 20261022.
- Worker: 기존 등록 `levelmini` 재사용. 추가 worker/서브에이전트 생성 없음.
- 산출물: `Planner/stage4_advancement_plan_20261022.md` 및 본 영수증만 신규 작성.
- 허용 범위: 문서 기획과 읽기 전용 소스 조사. Main Advisor 독립 검토 대기.
- runtime/DB/browser/deploy 수정·실행 없음. 운영 도구 수리 없음. git fetch/checkout/merge/stage/commit/push 없음.
- 기존 dirty 작업을 덮어쓰거나 되돌리지 않았다. 아래 W는 기존 dirty를 포함하므로 HEAD와 동일시하지 않는다.
- 프로세스/QA/메모리 등 별도 파일을 만들지 않았다. 스킬은 `kanban-worker` 지침 참조만 했다.

## 필수 사전 게이트

명령: `powershell -NoProfile -ExecutionPolicy Bypass -File F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary "stage4 planning"`

- exit code: 0.
- `resolved_domains`: common, gameplay / `matched_domains`: gameplay.
- `match_evidence`: domain=gameplay, keyword=stage. 프로필 기본 도메인 포함·중복 제거 확인.
- `combined_receipt_sha256`: `516d1c599a3564f6040c5c9df9168a0cc8848d300150dc4965f27eaa861d5d8a`.
- 필수 문서와 관련 Planner/current_game_rules·과거 stage04·역사적 Stage4 기획을 읽었다.
- SESSION_MEMORY는 최신 단일 엔트리 `Session 9 - Entry 1 - 2026-10-10 2323 KST`를 기준으로 사용했다. 과거 세션은 근거로 사용하지 않았다.
- 정책 읽기 과정에서 SESSION_MEMORY 시작부 100줄이 한 차례 도구 출력에 포함된 범위 초과가 있었다. 추가 과거 조회 없이 최신 엔트리로 한정했고 기록 내용은 수정하지 않았다.
- 문서 읽기 출력에 BOM과 기존 깨진 주석 문자열이 있으나 파일을 고치지 않았다. 시간·숫자·실행 분기 자체를 대조했다.

| 필수 문서 | 조사 파일 SHA-256 |
|---|---|
| `AGENTS.md` | `8e17ec9dd0fd5aecb43bb029543cffe826628789cfedf3198f8195500a0d7d23` |
| `Bang_Rules.md` | `1bb7caa9912ca3f4a222c8b9ce39f06bd2d418b7ea10ea4edf5729fa66f3889a` |
| `CLAUDE.md` | `9473b5951df1b321c17a7ed18e0fb8a4c80f0fe1833c0fb1c9b4441ec8edf40f` |
| `Developer/agent_room/balanceqa_zombie_obstacle_avoidance_2026-07-25.md` | `4f2e46d8787d2e7a29a0fcf49fd3a07a1fd9fc40e6aa062603f830081ad6f161` |
| `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md` | `ac6ff182f0818ddb89d34031ae4d56311cf92244918943d4e948de89b3e01b89` |
| `Developer/agent_room/levelmini_zombie_speed_spawn_tempo_2026-08-13.md` | `5b96de6fc1532e278488de7650895dee9cd3169a12de4f4cb3764a82bdcbe216` |
| `Developer/agent_room/mandatory_precommand/manifest.json` | `1302bca5289bc773291815e278456baec1433377eed1335367f1191da978258f` |
| `Developer/agent_room/mandatory_precommand/README.md` | `41cc048cdaa93db6accf1eb367329c8456b7fc834bc80feda2029e70ff92e0aa` |
| `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md` | `329873aafb024220ae3d5e5e9aabee91734d50a8692f17a15bcacb8c90aad55d` |
| `Planner/stage4_document_index_20261022.md` | `76c6eb8a3ab468aada9b64dfdd61cf942e313c677844e752fa82375a28504128` |
| `project_develop_policy.md` | `ab0595be95708387c079f9f88aa6fe222fc98d29d5867c02409617a9f3a6211b` |
| `SESSION_CONTINUITY.md` | `b6b6bbb6089eaeaa73b3601dc28946007f51aff7c60baa4218306842938422d2` |
| `SESSION_MEMORY.md` | `4094fc82b417104cc77a4c5e4fbb3b5aef049866d790192f1b23cf6008c42100` |

## Git 참조와 시점

- W HEAD: `6f416d836e355d22a4e348516cca45e194bcc56c` — Repair Facebook comic rotation and on-demand posting.
- 로컬 브랜치: zombie_only. 조사 시 origin 대비 ahead 21 / behind 119, 대량의 선행 수정/미추적 파일 존재.
- R origin/zombie_only: `ef9b701ed30a45144937686a5fe1c1eef1ed105c`.
- R 커밋 시각/제목: 2026-10-22T10:20:41+09:00 / fix: recover paused ranking reads and preserve silent gameplay saves.
- R은 로컬에 저장된 원격 추적 참조이며 서버 최신성·운영 배포 확인이 아니다. `git show`로 읽었고 fetch하지 않았다.
- A: `a9f84bf8e7f22d2b1b1c191f7b23ee2e0e908ff8`는 `git cat-file -t`에서 commit 존재 확인.
- A 조사 방식: 20261019 stage04 고정 추출 문서 읽기. A의 모든 런타임 파일을 재추출하거나 live와 대조한 작업은 아니다.
- A 문서 SHA-256: `b34ddf892d2759caa114d0c887b82baf946ffd854913e1241c5718a159575d6e`.

## 소스 조사 SHA-256

W는 조사 시 파일 bytes, R은 `git show origin/zombie_only:<path>` bytes 기준이다. 줄번호는 종합 기획서 링크와 R 명시 인용을 따른다.
같은 해시인 파일도 운영 Firebase 실효값과 동일하다는 의미는 아니다.

| 파일 | W SHA-256 | R SHA-256 |
|---|---|---|
| `Developer/r3f_prototype/src/lib/stageConfig.js` | `2b07dad1ec6ee15265fa0de6c5a1bab4b23615d30db388edbb50581b225c6124` | `251e535d731a92d03bb7573391f0a8015358ee73a3ecb4c5f03734a2fe264728` |
| `Developer/r3f_prototype/src/lib/burstEvents.js` | `96fbdaf694fa714cc6100bf21e6db174a7e3cd5a50caa26283e2c3c6ca8481cc` | `96fbdaf694fa714cc6100bf21e6db174a7e3cd5a50caa26283e2c3c6ca8481cc` |
| `Developer/r3f_prototype/src/components/Enemy.jsx` | `d4a4afb783f6d3953f9eb4b78c69fd692029dffd0fbfaa7019c0c70841cd251b` | `f7d6dbfdc0ea347b8a414e184f18cb44ed57487054743d39d7ea22f99f36497f` |
| `Developer/r3f_prototype/src/components/Enemies.jsx` | `730caaaa240dbe05aa8294965f07bea092e00a7555d4cc051dde2553da742764` | `360fd766e324d82329e93dc84b08d05eefb2d1311711f42f9a1ea162d2b6afb9` |
| `Developer/r3f_prototype/src/components/Game.jsx` | `29d981b13c45be03b32d75c1886d3869242f615333b33e9d8c7f4be3e38bcc2e` | `bbf864a85c58f95a518c894c64b07998f50409baccb640327659f2905379cf49` |
| `Developer/r3f_prototype/src/components/ClassroomFloor.jsx` | `d9fc7d2b702d205c5d18b130fea66b5679572bf3d847885825d2564a1e530b3c` | `d9fc7d2b702d205c5d18b130fea66b5679572bf3d847885825d2564a1e530b3c` |
| `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js` | `fc573f31a1a8c97a83422021f4aa2d983b6436431b3641e1b49cafd7920e9661` | `070ef70a75f388101960dc3dbcc42720011657fe436030a08501f35dace81998` |
| `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.js` | `06f61d121da6cd0175ad51682f568038393ddb132be6885fd52043e5a6d30eca` | `06f61d121da6cd0175ad51682f568038393ddb132be6885fd52043e5a6d30eca` |
| `Developer/r3f_prototype/src/lib/quests.js` | `7fb644a197626f090c249ca574a5c4e3a400c85571575a57d33a9e37e703012d` | `7fb644a197626f090c249ca574a5c4e3a400c85571575a57d33a9e37e703012d` |
| `Developer/r3f_prototype/src/lib/chefBossPhase.js` | `02a3cb90fb704aacc15ad89e12aa15042a2434881d9df2efaf81ea87edf82ef2` | `02a3cb90fb704aacc15ad89e12aa15042a2434881d9df2efaf81ea87edf82ef2` |
| `Developer/r3f_prototype/src/lib/b04SoupBlast.js` | `f6d234b9180ef69458cb30931fda29ba47a04f05439e96e48f14b35af37cd91e` | `f6d234b9180ef69458cb30931fda29ba47a04f05439e96e48f14b35af37cd91e` |
| `Developer/r3f_prototype/src/lib/stage4PressureCauldronHazard.js` | `0842d2600a4a00529e4bd151ed25e05a9065e240eeaf7935724e8808352c1588` | `0842d2600a4a00529e4bd151ed25e05a9065e240eeaf7935724e8808352c1588` |
| `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js` | `b072e421308e100013a629f00cb4c18dc531abb22e862a1b43f7e708a53c601d` | `b072e421308e100013a629f00cb4c18dc531abb22e862a1b43f7e708a53c601d` |
| `Developer/r3f_prototype/src/lib/lowDensityReinforcement.js` | `b7624688c4e46deea26a1ed216cc60f743e5a45b0fa20e37a74d0d1daef1d18a` | `b7624688c4e46deea26a1ed216cc60f743e5a45b0fa20e37a74d0d1daef1d18a` |
| `Developer/r3f_prototype/src/store/useGameStore.js` | `5ab6377d5bb976b39aaa3f3a46cc6538e4c26cf9315260a51ae79f82948210cf` | `a08ad30fa82e229c82d918308f059effca8ee76d20af1082dc931f95208bffb0` |
| `Developer/r3f_prototype/src/lib/firebaseProgress.js` | `2c594de99f605cf2cd6cd853216236addbe7ec9af110c0dbc944544880f43a1a` | `ac061815e516e9734faf3dfb1093cf67e3c0575f7a6013f312db12ec80d82eac` |
| `Developer/r3f_prototype/src/lib/playerRecords.js` | `9c0136cd80e1600efabbf9f60104c812ccb6c2f3032a0dca6bc906c49dbecded` | `987dcd7bb4938d309179bd1044c2e6d5bd618ef78ac6dac4ed72667b019e5aba` |
| `Developer/r3f_prototype/src/lib/waveTimelines.js` | `b5e19839f1810d7673d4ab0752506f970b8b5ec8387d92e9e6f8c49637573f50` | `b5e19839f1810d7673d4ab0752506f970b8b5ec8387d92e9e6f8c49637573f50` |

## 핵심 판단과 미확인 사항

- W stageConfig는 Stage4/5를 stage3Clears/stage4Clears로 판정한다. 오너 규칙과 불일치하므로 후속 P0로 명시했다.
- R stageConfig는 이전 stage BossDefeats를 검사한다. R store에는 보스 사망 체크포인트가 있으며 firebaseProgress는 per-run ledger 읽기용 투영을 만든다.
- R 구현 존재는 즉시 영구 저장 성공의 검증이 아니다. 계정/네트워크 실패·재접속·중복 지급은 QA 대기다.
- 보스 국물 모듈과 Enemy 실행 분기를 분리 조사했다. Stage4 국물 종료 후 P2 직접 설정 때문에 별도 1000ms 전환을 항상 더하는 설명을 배제했다.
- 가마솥의 150/210초 중첩과 216초 차저의 마틸다 등장 후 배치를 기록했다. 기존 코드 주석의 “직전”을 시간 근거로 사용하지 않았다.
- 기본 배치·차단 집합·실제 배치 해석을 구분했다. “전부 시각 전용” 주석으로 통행 가능을 단정하지 않았다.
- 모든 신규 수치 후보는 PROPOSAL이다. 전역 HP·스폰·오너 시간 변경은 제안 기본값에 포함하지 않았다.
- 실제 Firebase/Admin/Studio, 브라우저·실기기, GA/이용자 지표, 운영 버전은 조회하지 않았다.

## 문서 검증

- 종합 기획서: 231줄. 요청 범위 180–280줄 안이다.
- 종합 기획서 SHA-256: `64409293c9e0af983ef5d950aeccfd62fd4324170e9f1bc2878164f54520c30a`.
- 최초 링크 점검: 기존 대상 링크 27개 및 줄 범위 정상. 당시 미생성 영수증 링크 1개는 영수증 생성 뒤 재확인한다.
- `git diff --check -- <owned two paths>` exit 0. 신규 미추적 문서는 diff 대상으로 자동 포함되지 않으므로 별도 UTF-8/링크/줄 범위 검사로 보완한다.
- Advisor 최종 점검: 종합 기획서 231줄, 위 SHA-256과 일치. 목차·그래픽·오디오를 포함한 최종 본문 검토는 `Quaility_Assurance/stage4_documents_review_20261022.md`에 기록했다. 작성 중간의 미완료 표시는 본 최종 점검으로 대체한다.
- 게임플레이 테스트/QA/빌드/벤치마크/Firebase 쓰기 시험: 전부 미실행. 체크리스트는 실행 결과가 아니다.
- 변경 범위 근거는 write/patch 도구의 두 지정 경로 기록이다. 동시 작업자가 있는 전체 작업트리의 무변경 해시 동일성까지 주장하지 않는다.

## Advisor 인계

기획서는 현재/제안 표, 네 단계 학습, 급식실 동선, 기존 퀘스트, 보존 시간표, B04 감사, 겹침 공정성, 진행/보상 보존, P0/P1/P2 접점과 수용 시나리오, 모바일 측정안을 포함한다.
검토 시 W/R 해금 차이와 국물→P2 실제 경로를 먼저 확인하고, 기획서만으로 구현·릴리스 승인을 대신하지 않는다.
