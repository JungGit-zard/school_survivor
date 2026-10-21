# 공통 에이전트 통합 계약 — 2026-10-21

카드: escape-zombie-school / t_0042294f
사용자 승인: 다른 에이전트들도 같이 머지할 하나의 브랜치로 통합. 목적지 통일은 과거 모든 변경의 병합 승인이 아니다.

## 반드시 지켜야 할 사항

- 반드시 모든 IDE/Codex/Claude/Hermes 및 등록 프로필의 유일한 통합 목적지는 `https://github.com/JungGit-zard/school_survivor.git`의 `refs/heads/zombie_only` (`origin/zombie_only`)로 한다. `main`, `claude-dev`, feature/fix/sync는 별도 장기 목적지가 아니다.
- 반드시 통합 작업공간은 `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/shared-agent-integration-20261021`를 사용한다. 로컬 브랜치 `zombie_only`, upstream `origin/zombie_only`. 정본 `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration`는 작업 기록/필수 checker 정본이며 현재 dirty/divergent 상태 그대로 보존한다.
- 반드시 Worker는 자기 전용 checkout/worktree에서 작업한다. 로컬 task feature/fix 브랜치는 격리만을 위한 source이며 공통 lane을 다른 Worker와 동시에 수정하지 않는다.
- 반드시 Advisor가 카드 댓글로 integrator 한 명과 대상 카드/정확한 소스 SHA/명시 경로/작업 종료 조건을 지정한다. 현재 소유자는 `madangsue`, 범위 `t_0042294f` 문서 통합 한 번이며 결과 기록 후 소유권은 종료한다. 이후 integrator는 기존 카드의 명시 인계가 필요하다. 영구 daemon/자동 병합/새 Worker는 만들지 않는다.
- 반드시 동시 integrator가 없음을 보드/댓글에서 확인한다. 소유권 불명·중복 실행·실행 중 publisher가 있으면 push를 중단한다. 이것은 협업 절차이며 서버 측 강제 lock이 설치되었다는 주장이 아니다.
- 반드시 첫 명령으로 정본 mandatory checker를 실제 프로필과 domain auto, 짧고 안전한 TaskSummary로 실행하고 emitted docs 전부 및 gstack을 확인한다. receipt/domain 변경 시 재확인한다. 보안 hook/voice normalizer/빌드·Firebase·QA 게이트는 그대로 유지한다.
- 반드시 작업 handoff에는 원본 repo/base/commit 또는 uncommitted 정확한 경로별 SHA-256, 승인 주체, 테스트 명령/실제 결과, 미검증 항목을 포함한다. 카드 done이나 조상 관계만으로 현재 변경을 승인하지 않는다.
- 반드시 통합 전 clean status, 정확한 origin/upstream을 확인하고 `git fetch origin` 후 깨끗한 lane에서 fast-forward 가능한 경우에만 `git merge --ff-only origin/zombie_only`로 갱신한다. 승인된 변경만 명시 경로로 반영한다. 원본 workspace는 수정하지 않는다.
- 반드시 합쳐진 최종 소스 자체에 대해 적합한 QA를 한다. 코드 변경은 관련 focused test/정상 build 및 필요한 시각·모바일 검증과 기존 release gate를 충족해야 한다. 충돌 해결/원격 전진으로 소스가 바뀌면 기존 승인을 재사용하지 않는다. 문서 전용 작업은 diff/내용/링크/목적지/보존 검사로 제한하며 게임 build 통과를 주장하지 않는다. 본 문서 작업의 독립 검증은 별도 기존 카드 `t_68e2c734`에 남아 있다.
- 반드시 `git add <정확한 파일들>` → staged diff/secret 확인 → 일반 commit → fresh fetch/원격 base 확인 → `git push origin HEAD:refs/heads/zombie_only` → `git ls-remote origin refs/heads/zombie_only` SHA 일치를 기록한다. 비 fast-forward 또는 원격 변경은 중단하고 재통합/재검증한다.
- 반드시 통합과 배포를 구분한다. 이 계약/카드는 Hosting, Firebase Rules, Play 업로드 또는 production data 변경을 승인하지 않는다.
- 반드시 완료/미완료 ledger를 유지한다. `ledger.md` 및 정본 result.json/report.md를 읽는다. 통지 댓글은 전달 흔적일 뿐 읽음·동의·실제 작업공간 전환의 증명이 아니다. Worker는 다음 재개 시 계약을 읽고 자기 카드에 acknowledgment를 남겨야 한다.

## 절대로 하면 안 되는 사항

- 절대로 정본이나 타인의 checkout에서 reset, forced checkout, stash, branch switch, prune, delete, 광범위 staging을 하지 않는다.
- 절대로 force push, 원격 브랜치 삭제, 이력 재작성, hook 우회, 미완료 파일 일괄 import를 하지 않는다.
- 절대로 `.env`, token, credential, browser profile, 비공개 사용자 데이터를 복사하거나 commit하지 않는다. 자격증명 복사 승인이 pending이면 다른 방법으로 우회하지 않는다.
- 절대로 stage-list-five를 현재 QA source-only 결과만으로 통합/출시 승인 처리하지 않는다. `.env` 복사 승인 대기 및 build 미완료 상태를 보존한다.
- 절대로 같은 원격을 향하게 했다는 이유로 canonical의 고유 21 commits, sync 브랜치의 고유 16 commits, dirty/미추적 산출물을 모두 병합했다고 보고하지 않는다. 고유 이력은 patch-equivalence/승인/현행 정책 적합성 미확인 상태다.

## 이번 lane 생성의 정확한 의미

원격 base `4656bdcf75908b8cfba5bc7b0deb5a4728381688`에서 새 독립 Git index/branch checkout을 만들었다. clone의 object alternates는 정본 `.git/objects`를 읽기 참조하므로 그 저장소의 object 보존에 의존한다. 자격증명/환경 파일은 복사하지 않았다. 기존 모든 workspace와 refs는 그대로 남는다. 새 lane은 새로운 장기 브랜치가 아니라 기존 zombie_only를 향하는 단일 직렬 통합 장소다. 원격에 이미 포함된 완료 이력을 유지하고 이번에는 라우팅 문서만 추가한다.
