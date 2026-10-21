# 완료·미완료 통합 ledger — t_0042294f

기준 원격: origin/zombie_only = 4656bdcf75908b8cfba5bc7b0deb5a4728381688.
이번 변경은 AGENTS.md, CLAUDE.md, Kanban workflow의 Git 절과 본 계약/ledger뿐이다. 게임 runtime, 과거 uncommitted 작업, stage 문서 archive는 이번 commit에 포함하지 않는다.

## 이미 원격에 포함된 로컬 브랜치 HEAD

| 정본 local ref | HEAD | 판정 |
|---|---|---|
| feature/comic-gallery-20261016 | a80435641741e1e9f9ffd1e1a95cd327676b9b83 | 조상 확인, 고유 commit 0; 해당 worktree dirty 작업 7항목은 별도 미완료 |
| fix/boss-only-unlock-20261019 | a9f84bf8e7f22d2b1b1c191f7b23ee2e0e908ff8 | 조상 확인, 고유 commit 0 |
| launchmini/t_25c9cb8a-owned-weapon-push | 709be06a90dc8c8bedbed111d8d8793a6b2ade7a | 조상 확인, 고유 commit 0; worktree dirty 1항목 별도 |
| sync/posting-20261015 | a80435641741e1e9f9ffd1e1a95cd327676b9b83 | 조상 확인, 고유 commit 0 |

자판기 전면 개선 4656bdcf, stage balance 문서 보관 57a58d54, boss-only unlock f8a0ee89는 이미 base 이력에 있다. 중복 cherry-pick하지 않았다. 이력 포함은 현재 production 배포/전체 QA 판정이 아니다.

## 고유 이력 미완료 — 삭제/재작성/일괄 import 없음

- 정본 zombie_only HEAD 6f416d836e355d22a4e348516cca45e194bcc56c: 원격에 없는 고유 21 commits, 원격보다 뒤 117 commits. dirty/tracked/user-deleted 및 untracked 그대로 보존. 모델/오디오/소셜/Android/문서 등 혼합된 과거 작업이며 현행 승인·patch-equivalence 미확인. 통합되지 않았다고 일괄 단정하거나 모두 통합됐다고 주장하지 않는다.
- sync/zombie_only_20261013 HEAD 08862d23366c6c31255bc7ab84c4a05686ec05c9: 고유 16 commits, 뒤 117. 위 21개와 일부 겹치므로 합산 고유 건수로 보지 않는다. 출처/승인/현행 정책 QA 대기.
- C:/tmp/zr09477_release HEAD 73809a0649986402a26a047abffb94e5464a8791: 원격 조상 아님, clean이지만 provenance/최종 QA 없으므로 pending.
- escape-bgm-release-bcca78a: 정본과 같은 divergent HEAD, dirty 6182항목 관측. 그대로 보존, 가져오지 않음.

## 최근 release/기존 worktree 검토

전체 경로별 실제 HEAD와 dirty 경로는 정본 `Developer/agent_room/shared_agent_integration_20261021/workspaces.json`, 전체 local refs/unique commit 목록은 `local-branches.json`에 있다. 아래는 해당 시점 관측치이며 다른 checkout을 수정하지 않았다.

| checkout (releases/ 이하 unless stated) | 관측 |
|---|---|
| boss-only-unlock-20261019 | HEAD 57a58d54 포함; dirty 49 pending |
| homepage-board-inline-20261018 | HEAD bb3fef97 포함; dirty 1 pending |
| hud-save-live-20261020 | HEAD 4656bdcf 포함; clean, artifact 배포는 별도 |
| vending-front-20261020 | HEAD 4656bdcf 포함; dirty 21 pending |
| vending-owner-20261018 | HEAD 86e81c7d 포함; dirty 3 pending |
| respawn-live-aa3cdc7d / respawn-push-06b822a0 | HEAD aa3cdc7d 포함; clean |
| glowing-stone-publish | HEAD ff7f28f3 포함; clean |
| Temp/escape-zombie-school-matilda-worktree-20261019 | HEAD 66c9198b 포함; clean |
| Temp/escape-appearance-publish-20261005 | HEAD dbd2209c 포함; dirty 3800 pending |
| integrated-game-20261016-t_e2815ba8 | HEAD 62dc162b; 本 clone에서 base object 미보유로 조상 판정 불가, dirty 47; pending |
| owner-all-complete-20261018 | HEAD a9f84bf8 자체는 canonical local ref 기준 포함; 해당 clone에서는 base object 미보유로 조상 판정 불가, dirty 315 pending |
| vending-owner-20261018-ready | HEAD 86e81c7d는 다른 worktree 기준 포함; 해당 clone에서는 base object 미보유로 조상 판정 불가, dirty 18 pending |
| lobby-cdn-20261005 / title-cdn-20261005 | 이전 D: object alternates 경로 끊김, status 읽기 실패/bad object HEAD. 고치거나 우회하지 않고 pending |
| Kanban workspaces/t_309e540a/release/repo | 등록은 있으나 실제 .git 위치 없음. prune하지 않고 pending |
| shared-agent-integration-20261021 | 새 clean lane, base 4656bdcf. 이번 문서만 commit/push |

## stage-list-five / 별도 stage authoring archive

- releases/stage-list-five-20261021 HEAD 4656bdcf, dirty 12항목, runtime 미커밋 그대로 보존.
- t_3377c4ea uimini: stage1–5만 노출 및 lazy preview 구현. t_9489598b source-only/focused/archive 검토만 GO, 6 suites 75 PASS 기록. `.env` 복사 pending approval로 정상 build blocked. 브라우저/모바일/성능 미검증. 이번 통합에서 credential 복사/재시도/합성 없이 pending 유지.
- t_02a70adc 문서 archive: 별도 보관 검증 완료이나 canonical 미추적 산출물은 이번 커밋 범위 아님. 원본/복사/ZIP 보존. archive 완료와 runtime 승인/출시는 다르다.

## 통지·독립 검증

최근 미완료 card 및 각 등록 프로필의 미완료 card에 동일 목적지를 댓글로 알린다. 실제 성공 댓글 receipts는 정본 notifications.json에 남긴다. 이미 blocked인 카드는 unblock/dispatch하지 않는다. 댓글은 소비 확인이 아니며 worker acknowledge는 미확인이다.

독립 검증 t_68e2c734는 기존 Advisor 카드이며 이 invocation에서는 새 worker를 만들거나 실행하지 않는다. 보드 전체의 수백 blocked 작업을 이번 lane 완료와 섞어 wave 완료로 주장하지 않는다. 결과 SHA·검증·한계는 정본 result.json/report.md에 기록한다.
