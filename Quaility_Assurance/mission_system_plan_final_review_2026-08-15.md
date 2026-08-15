# Balance QA 최종 미션 시스템 플랜 리뷰 — 2026-08-15

## 결론

판정: 최종 기획 수용 가능 / 구현 진입 전제 조건부 승인.

수정된 `Planner/mission_system_implementation_and_layout_master_2026-08-15.md`는 이전 Balance QA 리뷰의 핵심 보류 사유를 “현재 구현 완료”로 과장하지 않고 명시적 구현 gate와 ticket prerequisite로 전환했다. 본 리뷰는 최종 문서 리뷰 전용이며, 실제 코드·Firebase·Rules·UI 동작은 검증하지 않았다.

최종 수용 범위:

- Mission catalog / pure reducer / Stage 1 중심 첫 활성 slice 기획: 승인.
- 30개 mission catalog를 hidden/future bucket 포함으로 보유하는 기획: 승인.
- 보상 수령 가능한 rewarded mission system: 구현 gate 통과 전까지 승인 아님.
- Stage 2~4 clear 미션 첫 활성화: 별도 QA 전까지 hidden/locked 유지 조건.

## 작업 범위와 금지 준수

요청 범위:

- 읽기:
  - `Planner/mission_system_implementation_and_layout_master_2026-08-15.md`
  - `Quaility_Assurance/mission_plan_acceptance_review_balanceqa_2026-08-15.md`
  - mandatory precommand checker가 반환한 READ_REQUIRED 문서들
  - `SESSION_MEMORY.md`는 최신 단일 entry만 확인
- 생성:
  - `Quaility_Assurance/mission_system_plan_final_review_2026-08-15.md`

수행하지 않은 것:

- 코드 수정 없음.
- Firebase/Realtime Database/Rules 배포 또는 수정 없음.
- 타이틀, Studio, 오디오 수정 없음.
- 테스트/빌드/브라우저 실행 없음.
- Git 명령 실행 없음.
- 기존 문서 수정 없음.

## Precommand / 필수 문서 확인 기록

실행 명령:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "corrected mission plan final review"
```

결과:

- exit code: 0
- profile: `balanceqa`
- domain: `auto`
- resolved_domains: `common`, `qa`
- matched_domains: `qa`
- match_evidence: `qa` / keyword `review`
- combined_receipt_sha256: `9e00069f0266c75f9d73e3632a8e7da725bd93e8547102accc5011d1ba4c23be`

READ_REQUIRED로 반환된 문서 확인:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/balanceqa_stage2_pencil_anomaly_2026-08-15.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/mandatory_precommand/README.md`
- `project_develop_policy.md`
- `Quaility_Assurance/mission_plan_acceptance_review_balanceqa_2026-08-15.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 단일 entry: `Session 7 · Entry 4 · 2026-08-09 1641 KST`

GSTACK 확인:

```text
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

결과:

```text
GSTACK_OK
```

## 이전 QA gap 최종 확인

아래 항목은 실제 구현 완료 여부가 아니라, 수정된 플랜이 구현 전 필수 gate로 충분히 표현했는지를 판정한 것이다.

| 이전 gap | 최종 플랜 반영 상태 | 판정 |
|---|---|---|
| missions schema normalization 부재 | §0, §6-1, §6-2, §11, Ticket 4, §13-2에서 `progress.missions` create/normalize/clone prerequisite 명시 | PASS |
| strict RTDB rules 부재 | §6-1, 의존성 순서 2번, Ticket 4B에서 `progress.missions` strict rules와 `$other: false` 유지 명시 | PASS |
| atomic claim transaction 부재 | §2-1, §6-1, §6-4, Ticket 5, §13-2에서 goldTotal+claimLedger transaction과 double claim 차단 명시 | PASS |
| rewarded UI가 approval 전 enabled될 위험 | §2-1, §6-1 의존성 4번, §6-4, Ticket 5 주의, §13-2에서 gate 전 disabled와 non-final rewardProposal 명시 | PASS |
| Stage 1-centric first activation 부족 | §11 Phase 1B에서 #1/#2/#5/#6/#7/#11/#25 7개만 첫 활성 배포로 명시 | PASS |
| Stage 2~4 hidden/locked 필요 | §11 Phase 1B, §13-2에서 #17/#19/#20은 catalog에는 둘 수 있으나 첫 활성 release slice에서는 hidden/locked/future bucket 유지 명시 | PASS |
| dual enemy path instrumentation/dedupe 필요 | §5-1 contract와 Ticket 8에서 pooled enemy 경로 + component Enemy.jsx 경로 양쪽 계측, `enemyId + enemyGeneration + runId` dedupe 명시 | PASS |
| any-boss vs bossId 구분 필요 | §5-3 #30, Ticket 9에서 any boss는 기존 `bossKills`, boss-type 확장은 `bossId` payload와 `boss.{bossId}.killCount` 필요로 구분 | PASS |

## 원래 정책 gate 최종 확인

| 정책 gate | 플랜 표현 | 판정 |
|---|---|---|
| Stage 1 모바일 playable loop 우선 | §1-1, §11 Phase 1B, §13-2, §15에서 Stage 1 240초 루프 유지와 Stage 1 중심 first activation 명시 | PASS |
| 타이틀 화면 변경 금지 | §1-2, §2-1, §13-2에서 타이틀 UI/문구/그래픽/오디오 변경 금지 명시 | PASS |
| Firebase-only 저장 / localStorage 금지 | §1-2, §6-3, §7, §13-2에서 localStorage/IndexedDB/임시 JSON/token fallback 금지 명시 | PASS |
| 로그인·hydrate·save·claim 실패가 게임 진입 차단 금지 | §2, §7, §13-2, §15에서 non-blocking behavior 명시 | PASS |
| 런 중 remote write 남발 금지 | §5-1, §6-3, §13-2에서 raw log 저장 금지, in-memory aggregation, run-end batch 저장 명시 | PASS |
| Stage 1 E04 제외 유지 | §1-2, §5-3, §11 Phase 2, §13-2, §15에서 Stage 1 E04 제외 회귀 검증 명시 | PASS |
| gameplay 수치 비변경 | §1-2, §5-1, §13-2, §15에서 enemy HP/spawn/weapon damage/boss/Matilda timing 불변 명시 | PASS |
| reward amount 미확정 | §1-2, §6-2, §6-4, §13-2, §14에서 rewardProposal/non-final/Balance QA 승인 전 확정 금지 명시 | PASS |
| 모바일 UI 최소 터치/가독성 | §8, §10, §13-3에서 44~48px touch target, 숫자 병기, overlay 우선순위 명시 | PASS |
| QA 기록 위치 | 본 산출물을 `Quaility_Assurance/`에 생성 | PASS |

## 남은 plan-level blockers / major / minor

### Blockers

없음.

이전 보류 사유였던 schema, rules, transaction, reward enablement, first activation scope, Stage 2~4 lock, enemy path dedupe, bossId 구분은 모두 plan-level gate로 명시됐다. 따라서 “기획 문서로서 구현 wave를 시작해도 되는가” 기준의 blocker는 남지 않는다.

### Major

1. 구현 gate 통과 전 보상 수령은 여전히 승인 불가.
   - 이는 플랜 결함이 아니라 의도된 gate다.
   - 구현자가 `rewardProposal.amount`를 승인 보상처럼 사용하거나 claim UI를 enabled 처리하면 즉시 QA fail이다.

2. Stage 2~4 clear 미션은 catalog 포함과 첫 활성화를 계속 분리해야 한다.
   - 플랜은 분리 표현에 성공했다.
   - 구현 중 추천 탭, 받을 보상 카운트, 완료 조건 계산에 #17/#19/#20이 노출되면 major regression이다.

3. `weapon_hit` 계열 Phase 4는 성능·중복 이벤트 위험이 크다.
   - 플랜은 Phase 4와 Balance QA 확인 대상으로 분리했다.
   - 구현 시 프레임별 spam, 배터리/성능, duplicate hit count 검증이 별도 필요하다.

### Minor

1. 와이어프레임에는 `[모두받기]`, `받을 보상 2개`, `보상 제안 20골드 [받기 비활성]` 같은 예시가 남아 있다.
   - 본문 gate가 disabled/non-final을 충분히 명시하므로 blocker는 아니다.
   - 구현 브리프에서는 “모두받기 MVP 제외 또는 disabled copy”를 더 강하게 반복하는 편이 안전하다.

2. §6-2 예시 JSON의 `rewardProposal.amount`는 non-final status가 붙어 있어 수용 가능하지만, 구현 ticket에는 승인 전 `approvedReward`와 혼동하지 않도록 type/name 분리를 유지해야 한다.

## 최종 acceptance verdict

최종 판정: PASS — 기획 문서 수용.

단, 이 PASS는 “구현 계획의 충분성”에 대한 PASS다. 실제 rewarded mission system, Firebase 저장, RTDB rules, transaction claim, 모바일 UI, Stage 1 런 안정성은 아직 검증되지 않았다. 구현 wave는 이 문서의 ticket 순서대로 진행하되, `progress.missions` schema/normalize/clone, strict RTDB rules, claim transaction, reward UI disabled gate, Stage 1 first activation slice를 각각 독립 acceptance gate로 통과해야 한다.

Balance QA handoff:

- 첫 구현 wave에서 우선 검수할 범위: static catalog, pure reducer, in-memory aggregation, Stage 1 중심 7개 first active slice.
- 첫 구현 wave에서 절대 승인하지 않을 범위: 실제 gold claim, 30개 전부 활성화, Stage 2~4 clear mission 추천/claim 노출, localStorage fallback, raw event log remote write.
- 구현 완료 주장 시 필요한 증거: 파일 diff, focused unit tests, Firebase rules validation, transaction double-claim tests, Stage 1 모바일 playable loop 정적/실행 검증. 본 최종 문서 리뷰에서는 해당 실행 검증을 수행하지 않았다.
