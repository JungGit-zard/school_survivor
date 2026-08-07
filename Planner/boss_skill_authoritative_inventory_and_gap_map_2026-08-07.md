# 보스 스킬 정본 인벤토리·구현 갭 맵

- 작성일: 2026-08-07
- 범위: B01~B04와 공통 보스 행동. 조사·구현 브리프 전용이며 런타임, Firebase, 에셋은 변경하지 않았다.
- 우선순위: 사용자 최신 명시 결정 → `project_develop_policy.md` → `Bang_Rules.md`의 최신 addendum → 현재 런타임 코드/집중 테스트 → 승인된 역할 기록. 비평/감사 문서는 결함 후보이지 구현 승인이나 새 수치의 정본이 아니다.

## 판정 요약

현재 코드에는 **B01 삼각자 특수기**, **B02/B03 공통 돌진**, **B04 2페이즈(포격→격노 돌진)**가 모두 있다. 따라서 “문서에 적힌 보스 스킬을 전부 새로 구현”할 미구현 스킬 목록은 확인되지 않았다.

구현 전에 먼저 처리해야 할 것은 새 패턴 추가가 아니라 아래의 명세/회귀 갭이다.

| 우선순위 | 갭 | 상태 | 근거 | 최소 조치 |
|---|---|---|---|---|
| P0 | B04 보스 보상 | 누락 | `Enemies.jsx:49-55`의 `ELITE_BONUS`에 B04가 없음 | 보상이 B01~B03과 같아야 한다는 사용자/기획 정본이 새로 확인된 경우에만 B04를 추가하고 사망→픽업 통합 테스트 작성. 현재 문서에는 B04 보상 수치 승인값이 없어 추정 금지. |
| P0 | 보스별 행동 SFX | 부분 | 공통 파일/ID는 있으나 돌진·B04 포격·B01 삼각자 상태 전환에서 발화하지 않음. `Enemy.jsx:908-1019`, `sfxRegistry.js:65-75` | `soundmini`가 기존 ID 재사용 또는 새 자산/볼륨을 명시 승인한 뒤 상태 전환당 한 번만 연결하고 회귀 테스트. 임의 소리/수치 추가 금지. |
| P1 | 보스 경고/실제 등장 단일 시간축 | 부분·명세 충돌 | 런타임은 170~190초 난수(`stageConfig.js:7-18`, `burstEvents.js:116-124`)이나 오래된 정적 버스트는 Stage1 192, Stage2 120, Stage3 135, Stage4 140초(`burstEvents.js:29,42,72,95`) | `levelmini`가 각 스테이지의 사용자 승인 등장/경고 정책을 한 표로 확정한 뒤 scheduler/HUD/문서를 같은 단일 값에서 파생. 지금 임의로 고정하지 않는다. |
| P1 | B02 v2 시각 경로 | 구현됨·보호 필요 | `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md` | 어떤 작업도 과거 B02 코드·에셋·저장값을 복원/변환/fallback하지 말 것. `assert-no-legacy-b02.mjs` 포함 빌드 게이트 유지. |
| P1 | B01/B02/B03/B04 실제 전투 통합 검증 | 부분 | 순수 상태/소스 테스트는 존재하지만 보스 스킬→피격→SFX→보상 전 과정을 검증하지 않음 | Firebase에 닿지 않는 결정론 테스트로 보완. 실기기/실플레이는 별도 QA 카드와 스냅샷 규칙을 준수. |

## 공통 보스 계약

| 항목 | 현재 값/행동 | 런타임 근거 | 검증 | 상태 |
|---|---|---|---|---|
| 보스 식별 | `B01`, `B02`, `B03`, `B04`만 보스 타입 | `burstEvents.js:11-12` | `burstEvents.test.js`의 보스 event 검증 | 구현됨 |
| 기본 본체 | **base** HP B01~B04 = 1150/1150/1150/1500, 속도 0.475 units/s (0.11875 블록/s), 접촉 피해 22, scale 2.00, XP 0, 접촉 기준 0.36 units (0.09 블록). 스폰 시 보스 HP는 Stage1/2/3/4에서 ×1.0/×1.10/×1.21/×1.331 오버라이드가 적용된다. | `Enemy.jsx:268-281`; `Enemies.jsx:626-635` | `Enemies.test.jsx:345-364,489-503`, chef phase test | 구현됨 |
| 차저 공통 흐름 | 추적 → 거리 `< 6.0u`(`<1.5블록`)에서 800ms 경고·정지 → 1.4u/s(0.35블록/s)로 2200ms 돌진 → 적중 또는 시간 만료 → 1200ms 기절 → 추적 | `Enemy.jsx:908-1019`; B01~B03 스탯 `Enemy.jsx:268-273` | `EnemyVisual.test.js`, `EnemyMathTeacherSpecial.test.js` | 구현됨 |
| 일반 차저 적중 반경 | `contactDist × ENEMY_SIZE_MULTIPLIER × 1.5`; 현재 보스 수치상 `0.36 × 4/3 × 1.5 = 0.72u (0.18블록)` | `Enemy.jsx:222-226, 955` | `EnemyVisual.test.js:97-102` | 구현됨 |
| 텔레그래프 시각 | 경고 상태일 때만 인월드 3D toon `GO!` 말풍선/표식. 노란 기호, 붉은 점, 주황 화살, 검은 외곽선 | `Enemy.jsx:302-384, 432-433` | `EnemyVisual.test.js:104-...`; `Graphic_designer/enemy_charge_toon_cue_visual_direction_2026-06-24.md` | 구현됨 |
| 모델 공통 | 네 보스 모두 전용 `ZombieMesh` 경로, toon 재질/검은 외곽선/Studio-tuned group | `ZombieMesh.jsx:910-947` | 전용 시각/Studio QA 기록 | 구현됨 |
| 공통 SFX 자산 | `bossSpawn`, `bossRoar`, `bossDeath`, `bossWarning`, `bossClearJingle` 파일/registry 존재 | `sfxRegistry.js:67,75,89-96`; `Enemy.jsx:191,297` | `sfxRegistry.test.js` | 부분: 행동별 발화 연결은 별도 |
| 보상 | B01~B03: 교과서 3개, 교과서당 XP 40, 골드 5. B04는 현재 목록에 없음 | `Enemies.jsx:49-60`; `Enemies.test.jsx:58-64` | B01/B02 tests만 명시 | 부분/미확정 |

### 공통 시각·데이터 보호

- 모든 거리의 환산은 `1 블록 = 4 units`다. `Bang_Rules.md:19-25`.
- Stage 2 B02 시각 구현은 `stage2-boss-v2`만 정본이며, 과거 구현·Git 이력·빌드 산출물·저장 상태를 복원 또는 fallback하면 안 된다. `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md:11-46`.
- B04는 주방장 보스이며, Stage 4의 과거 B03/옥상 초안은 폐기된 후보일 뿐 스킬 요구사항이 아니다. `Planner/stage4_lobby_card_content_spec_2026-07-18.md:7-18, 70-77`.

## 보스별 스킬 매트릭스

| 보스 | 정본 스킬/수치 | 텔레그래프·시각·오디오 | 코드/테스트 매핑 | 구현 판정·갭 |
|---|---|---|---|---|
| **B01 수학 선생** | 공통 차저 후, 플레이어 적중 또는 2200ms 만료 시 **삼각자 준비 320ms → 충격 → 회복 430ms → 1200ms 기절**. 충격 반경 **1.575u (0.39375블록)**. 현재 플레이어 HP의 **30%** 피해, 일반 무적 무시. 같은 반경의 살아 있는 다른 좀비는 피해 없이 밖으로 **4.8u/s, 420ms** 밀침. | 경고 때 3D toon `GO!`; special 상태에서 전용 삼각자/팔 애니메이션. B01 전용 모델·얼굴·toon outline. 보스 spawn/death는 공통 SFX지만 삼각자 전용 SFX 요구/자산은 없음. | `mathTeacherSpecial.js:1-44`; `Enemy.jsx:960-1019`; `ZombieMesh.jsx:67-75, 742-755`; `mathTeacherSpecial.test.js:13-59`; `EnemyMathTeacherSpecial.test.js:7-30`. 최신 반경 승인 trail: `Developer/b01_triangle_swing_radius_1_5x_fix_2026-07-26.md:3-13`. | **구현됨.** 과거 1.05u 문서는 2026-07-26 사용자 지시(1.575u)로 대체. 삼각자 SFX는 요구가 없으므로 missing으로 구현하지 않는다. |
| **B02 Stage 2** | 고유 특수기 요구 없음. 공통 차저만: 6.0u 경고/800ms, 1.4u/s/2200ms 돌진, 1200ms 기절. | B02 전용 3D toon 모델·얼굴; 공통 charge cue와 보스 SFX. Stage 2에서는 E04가 원거리 압박을 담당하고 B02 자체 투사체 요구는 없다. | `Enemy.jsx:270-271, 908-1019`; `ZombieMesh.jsx:266-315, 942-947`; `stage2ProjectileRules.js`; `EnemyVisual.test.js`. | **구현됨.** `stage2-boss-v2` 외 시각/저장/legacy 경로는 치명적 금지. B02 전용 스킬 추가 수치·패턴은 정본 문서에 없음. |
| **B03 체육 교사** | 고유 특수기 요구 없음. 공통 차저 수치가 B02와 동일. Stage 3의 실제 보스는 B03 단일이다. | 체육교사 전용 3D toon 모델, 얼굴 텍스처, 공통 charge cue/SFX. | `Enemy.jsx:272-273, 908-1019`; `stageConfig.js:69-94`; `burstEvents.js:54-81`; `ZombieMesh.jsx:77-106, 926-931`; `stageConfig.test.js:71-89`. | **구현됨.** 더블 B02+B01, B03 포격→돌진, Stage 4 B03/옥상은 과거 초안·비평/제안으로 현행 요구가 아니다. B03 고유 스킬은 현재 **없음**. |
| **B04 주방장** | base HP 1500(실제 Stage4 스폰 HP는 ×1.331 오버라이드). **P1 (HP >50%)**: 원거리 포격, cooldown 2600ms, 피해 14, 탄속 1.6u/s (0.4블록/s), 선호거리 5.0u(1.25블록), 최소거리 3.0u(0.75블록). **HP ≤50%**: 1000ms 정지·붉은 hit-flash 텔레그래프(발사/돌진 없음) 후 **P2 공통 차저**. P2는 한 번 전환되면 되돌아가지 않는다. | P1은 고정 투사체 풀을 E04와 공유. 텔레그래프는 `warn`/red flash. 주방장 전용 3D toon 모델·검은 외곽선·chef 파츠 및 얼굴. 공통 보스 SFX만 있으며 포격/격노 전용 SFX 요구 없음. | `Enemy.jsx:274-281, 755-825`; `Enemies.jsx:626-635`; `chefBossPhase.js:1-40`; `chefBossPhase.test.js:14-97`; `EnemyChefBossSightExemption.test.js:7-36`; `ZombieMesh.jsx:108-146, 934-939`; `Graphic_designer/stage4_chef_zombie_visual_spec_2026-07-18.md`. | **구현됨.** B04는 장애물 시야 차단 early-return을 면제해 중앙 조리대 뒤 교착을 방지. B04 보상과 고유 SFX는 위 갭대로 승인/전문가 결정이 필요. |

## 문서 충돌 해소 기록

| 충돌 | 채택 기준 | 처리 |
|---|---|---|
| B01 HP 1200/1400 또는 삼각자 1.05u가 남은 과거 표 | 최신 사용자 지시·2026-07-26 구현/QA trail 및 현재 테스트 | 현행 base HP 1150, 삼각자 1.575u를 사용. 스테이지 HP override는 별도 스폰 경로에서만 적용될 수 있으므로 구현 전 해당 경로를 재검증한다. |
| Stage1 B01=192, Stage2 B02=120, Stage3 B03=135, Stage4 B04=140 정적 이벤트 vs 실제 170~190 | 실제 런은 `rollBossSpawnSec()` 값으로 모든 boss event를 치환 | 코드상의 170~190을 현재 런타임 사실로 기록. 시간 정책의 최종 UX 정본은 아직 표 하나로 통합되지 않아 P1 갭. |
| Stage3 더블 B02+B01 | 2026-07-21 사용자 지시를 반영한 `burstEvents.js`의 B03 단일 경로 | 더블 보스 문서/테스트/주석은 historical/conflict로만 취급하며 복구 금지. |
| Stage4 B03 포격→차저 옥상 초안 | 2026-07-18 B04 주방장 최신 확정 및 코드 | B03 Stage4 제안의 수치/기믹을 B04로 이식하지 않는다. B04의 현재 수치만 사용. |
| B04 얼굴 텍스처 검토의 오래된 FAIL 서술 | 이후 구현 기록 및 QA가 WebP bundle/UV 유지 PASS를 기록 | 현재 에셋 내용의 별도 변경 권한은 없음. 이번 스킬 구현 범위에서 모델/UV/Studio 경로를 수정하지 않는다. |

## 최소 Worker 분할

1. **levelmini — 시간/보상 정본 정리 카드**: 보스 등장·경고·포탈·보상 표를 사용자 승인 사실만으로 확정한다. B04 보상 수치와 170~190 난수 정책을 새로 추정하지 않는다.
2. **gameplay implementation worker — 코드 정합 카드**: 1번이 확정한 값만 적용한다. 범위는 `stageConfig.js`, `burstEvents.js`, `Enemies.jsx`, 관련 집중 테스트로 제한한다. B02는 v2 no-legacy gate를 선행한다.
3. **soundmini — 행동 SFX 카드**: B01 삼각자, B02/B03/B04 돌진, B04 포격/격노에 필요한 기존/신규 ID, cue, cooldown을 확정하고 연결한다. 자산 생성·registry 변경은 soundmini 승인 범위다.
4. **balanceqa — 합성/회귀 카드**: 스킬 상태 전환, 거리 경계, 보상 수집, HUD 경고와 실제 spawn, 기존 Stage1 B01 투사체 금지를 검수한다.

## 권장 집중 검증 명령

`Developer/r3f_prototype`에서 Firebase를 건드리지 않는 집중 테스트만 실행한다.

```powershell
npm.cmd exec -- vitest run src/lib/mathTeacherSpecial.test.js src/components/EnemyMathTeacherSpecial.test.js src/lib/chefBossPhase.test.js src/components/EnemyChefBossSightExemption.test.js src/components/EnemyVisual.test.js src/lib/burstEvents.test.js src/lib/stageConfig.test.js src/components/Enemies.test.jsx src/lib/sfxRegistry.test.js --maxWorkers=1 --no-file-parallelism
npm.cmd run build
```

보상 또는 행동 SFX를 실제로 변경할 때 추가할 최소 테스트:

- B04 보상은 승인된 정확 수치와 B04 사망→드롭 생성→수집까지의 통합 경로를 검증한다.
- 각 행동 SFX는 상태 전환당 정확히 한 번, polyphony/cooldown 정책을 지키는지 검증한다.
- HUD warning은 해당 런의 `bossSpawnSec`와 동일한 시점에서 파생되는지 검증한다.

브라우저/실기기 테스트는 이 인벤토리 작업에서 실행하지 않았다. Firebase가 관련되는 테스트는 프로젝트의 초기 스냅샷·복원·해시 동일성 규칙 없이는 실행하지 않는다.

## 조사 범위·명령 기록

읽은 핵심 정책/정본:

- `project_develop_policy.md`, `Bang_Rules.md`, `AGENTS.md`, `CLAUDE.md`, `SESSION_CONTINUITY.md`, `SESSION_MEMORY.md` 최신 엔트리
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md`
- Planner: `current_game_rules.md`, `B. GAME_DESIGN/Stage_balance_summary.md`, `stage1_math_teacher_special_plan_2026-07-17.md`, `stage2_boss_complete_rebuild_plan_2026-07-17.md`, Stage3/Stage4 계획·로비 카드 문서
- Developer/Graphic/QA: B01 삼각자, B04 주방장 모델/얼굴, charge cue, Stage3 QA, full content audit 관련 기록
- Runtime/tests: `Enemy.jsx`, `Enemies.jsx`, `ZombieMesh.jsx`, `stageConfig.js`, `burstEvents.js`, `chefBossPhase.js`, `mathTeacherSpecial.js`, `stage2ProjectileRules.js`, `sfxRegistry.js` 및 위 표의 집중 테스트.

실행한 읽기 전용 명령:

```powershell
git status --short --branch
rg -n -i --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' --glob '!cache/**' --glob '!history/**' "B01|B02|B03|B04|boss|보스" Planner Developer Graphic_designer Quaility_Assurance docs
rg -n "B01|B02|B03|B04|boss|charge|triangle|projectile|stun|phase" src
Get-Content -Encoding UTF8 <각 정책·기획·런타임·테스트 파일>
```

## 차단 사항·리스크

- **승인되지 않은 수치 금지:** B02/B03 고유 스킬, B04 보상, B04 전용 SFX의 정확 수치는 정본에서 발견되지 않았다. 채우기 위해 추정 구현하면 안 된다.
- **B02 v2 보호:** legacy B02의 코드/에셋/저장/빌드 산출물은 조사·복구 재료가 아니다.
- **문서 드리프트:** 구식 5분/정적 등장 시각/더블 Stage3 보스 서술이 남아 있다. 코드 반영보다 먼저 current-authority 표를 결정해야 한다.
- **기존 작업트리 보존:** 이 조사는 runtime/Firebase/에셋을 수정하지 않았으며 기존 dirty change를 되돌리지 않았다.
