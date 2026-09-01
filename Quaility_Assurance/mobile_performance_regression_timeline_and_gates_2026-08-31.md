# 모바일 성능 회귀 타임라인 및 acceptance gates — balanceqa

- Kanban task: `t_b9bcb1c8`
- 작성 시각: 2026-08-30 15:56:44 KST (`TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'`)
- 대상 워크스페이스: `D:\JungSil\2.Minigame_project\school_survivor-integration`
- 대상 HEAD: `3d759c5c327a72eab5964be9cc60f79a474b10f0` / `Nerf Starlink cadence and rotate LineDraw`
- 작업 성격: 읽기 전용 QA synthesis. 이 문서 외 source/test/device/Firebase/git mutation 없음.
- 검증 한계: Galaxy A24 실기기 baseline은 launchmini 카드 기준 ADB 연결 기기 부재로 미측정이다. 따라서 성능 원인 또는 fix를 verified로 판정하지 않는다.

---

## 0. 필수 게이트

### 0-1. mandatory pre-command checker

실행 명령:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'mobile-performance-regression-timeline-gates'
```

확인 결과:

```text
resolved_domains= ['common', 'ui', 'qa']
matched_domains= ['ui', 'qa']
match_evidence= [{'domain': 'ui', 'keyword': 'mobile'}, {'domain': 'qa', 'keyword': 'regression'}]
combined_receipt_sha256= 1cf5694e1e7a2039dcb55e8b446e13ecf471ad3b1cefc0f17f7e8a12d3813c85
```

읽은 READ_REQUIRED:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/balanceqa_player_only_pocket_audit_2026-08-30.md`
- `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/mandatory_precommand/README.md`
- `Developer/agent_room/uimini_gameover_final_score_2026-08-24.md`
- `project_develop_policy.md`
- `Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 단일 entry: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`

추가로 성능/물리 진단 정본 `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md` §6을 읽고 본 gates에 반영했다.

### 0-2. 상태 확인

실행 명령:

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch && git log -1 --oneline
```

결과:

- `GSTACK_OK`
- branch: `zombie_only...origin/zombie_only`
- HEAD: `3d759c5c Nerf Starlink cadence and rotate LineDraw`
- 작업트리는 기존 dirty/untracked/deleted 파일이 대량 존재한다. 본 작업은 이 QA 문서만 신규 작성한다.

---

## 1. 사실 / 추론 구분

### 확인된 사실

1. 최근 1개월 git history에서 `Developer/r3f_prototype/src`, `package.json`, `vite.config.js`, `android`를 대상으로 2026-07-31 이후 커밋 267개를 스캔했다.
2. 키워드 기반 성능 관련 후보 커밋은 126개였다.
3. 후보 커밋 분류 카운트는 `test/gate 107`, `enemy/spawn/pool 69`, `UI/HUD 66`, `mobile/release 16`, `physics/frame 1`이다.
4. 가장 자주 변경된 성능 민감 파일은 `HUD.jsx` 46회, `Enemy.jsx` 42회, `Enemies.jsx` 31회, `Enemies.test.jsx` 29회, `HUD.test.jsx` 26회, `useGameStore.js` 20회다.
5. `Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31.md`는 ADB에 연결·인증된 실기기가 없어 Galaxy A24 Play v50 baseline을 수집하지 못했다고 기록한다.
6. `Quaility_Assurance/mobile_react_hud_performance_audit_2026-08-31.md`는 HUD가 `elapsedMs` 10Hz 발행마다 넓은 selector/렌더 트리를 다시 타는 구조를 가장 먼저 계측할 가설로 기록한다.
7. 이번 focused test 실행에서 pretest gate는 통과했지만 `spawnCatchUpGates.test.js` 1건이 실패했다. 나머지 43개 focused tests는 통과했다.

### 추론 / 미검증

1. Galaxy A24 체감 느려짐의 실제 원인은 아직 확정할 수 없다. 실기기 frame pacing, memory, CPU/GPU, WebView trace가 없다.
2. HUD 10Hz rerender, enemy/spawn density, boss/Matilda/event VFX, Rapier handle 안정화, mobile visual polish 중 어느 것이 주원인인지 아직 판정할 수 없다.
3. focused soak test가 stage1 seed 1에서 12000 frame 불변식을 유지한 것은 좋은 신호지만, Galaxy A24 실제 GPU/WebView frame pacing PASS로 확장할 수 없다.
4. `spawnCatchUpGates.test.js` 실패는 성능 원인 증거라기보다 boss telegraph lead 기대와 현재 빈 화면 catch-up 정책이 갈라진 회귀 신호다. 다만 boss 전후 빈 화면/경고/스폰 타이밍 acceptance gate에는 포함해야 한다.

---

## 2. 1개월 성능 민감 변경 클러스터

아래는 원인 확정이 아니라 regression timeline을 만들기 위한 조사 후보 묶음이다.

### C1. 2026-08-04~08-11: HUD/quest/UI surface 확대

확인된 관련 커밋:

- `3ba97ada3` 계열: HUD 주요 구독/오버레이 구조의 과거 suspect로 기존 HUD 감사가 지목.
- `5877b1a9` Add LineDraw weapon and audio
- `0b8035e5` Add the Bikitty Cutter, a box cutter evolution
- `7f2021a4` Update quest UI and Matilda death feedback
- `8a5d5bc2` Fix game-over popup after coin shop return
- `2643f848` Update Android release and graphics login flow
- `4a025788` Bump Android version to 1.0.19

성능 리스크:

- HUD/UI 표시 항목과 modal/quest/death feedback이 늘면서 React commit 비용, CSS paint/composite 비용 후보가 증가했다.
- Android release 관련 변경이 끼어 있어 WebView 환경 변화와 앱 코드 변화를 timeline에서 분리해야 한다.

### C2. 2026-08-13~08-18: Matilda / spawn density / mission system

확인된 관련 커밋:

- `b81ebfae` Kill the player on Matilda contact and fix the lobby settings crash
- `c5c09efe` Speed every zombie up 10%, grow stage 1-2 spawns, and show the Matilda gameover at once
- `b7518b12` Add Firebase mission system
- `202fa7e4` Show the Matilda impact before the screen goes grey
- `875ebfe4` Update gameplay balance and runtime verification
- `f83c1d4c` Delay Stage 1 first zombie spawn
- `ba7a9ed1` Fix Stage 1 zombie spawn schedule
- `69305c52` Align zombie spawn regression coverage
- `8dfff20b` Align Stage 2 and 3 zombie spawn schedules
- `a62be5c5` Align Stage 4 zombie spawn schedule
- `2dc076c6` Rebuild the stage 2-4 spawn tables onto a 1.3x total-HP ladder
- `15fb44a6` Add B01 set square boss passive

성능 리스크:

- 적 속도 +10%, stage1~2 spawn 증가, 1.3x total-HP ladder는 active enemy 수, 타격 이벤트, VFX, collision/pathing work를 함께 키울 수 있다.
- mission system/HUD mission tracker는 UI rerender fanout 후보가 된다.
- Matilda gameover/impact/grayscale은 full-screen overlay/composite 비용 후보가 된다.

### C3. 2026-08-20~08-23: boss ultimate, passive drop, spawn catch-up, projectile/VFX

확인된 관련 커밋:

- `8a6b6e56` feat: give B03 and B04 their ultimate attacks and drop passives
- `e38235af` fix: stop freed Rapier handles from poisoning the physics world
- `485bcc28` Expand level-up choices and guarantee follow-up cards
- `d07dbccf` feat: add weapon unlock progression
- `3d3951f7` feat: show player level in HUD
- `1c393f97` feat: refine stage floor and critical VFX
- `3567210d` feat: tune escape scoring and overtime spawns
- `0ea6e6b1` feat: cap the empty-arena gap at 2 seconds by pulling the spawn schedule forward
- `b59138ee` fix: close three defects the spawn catch-up audit found
- `98671bab` Update boss ultimates and chef projectiles
- `80fc2884` Fix spherical projectile screen exit despawn
- `c40c5b21` Fix R3F boss ultimate label crash
- `191f2f25` Fix Stage 4 enemy bounds and prop layout

성능 리스크:

- Boss ultimate/projectile/VFX는 GPU/CPU event spikes 후보다.
- `0ea6e6b1` catch-up은 빈 화면을 줄이는 방향이지만, spawn work를 특정 시점에 당겨 frame spike를 만들 수 있다.
- `e38235af`는 안정화 수정이지만, Rapier handle invalidation이 실제로 있었음을 timeline상 중요한 회귀 위험으로 남긴다.
- stage bounds/prop layout은 enemy pathing/stuck/detour/teleport behavior에 영향을 줄 수 있다.

### C4. 2026-08-24~08-30: mobile polish, B03/B04 motion, weapon replacement, collider unification start

확인된 관련 커밋:

- `da41e205` Show the final score on the game over screen
- `1ed60ab5` Bake stage lighting into classroom floor
- `886cbe7b` feat(graphics): apply mobile visual polish plan
- `87f12da7` Make the B03 shuttle run actually run
- `54fcd865` fix: B03 왕복 달리기 레인과 속도 조정
- `b8ba93dc` feat: 플레이어 우세 기반 다수 리스폰 적용
- `ddb661e1` Draw the B03 telegraph only over the course it will walk
- `7c5e0ecc` chore: bump Android versionCode to 49 for the real-device test build
- `bd6647d8` test: 빈 화면 캐치업 우세 리스폰 결합 보장
- `67b4d982` Fix_weapon_upgrade_rotation_and_unlock_modal_layout
- `9abcb840` Fix Chibiko critical card rotation
- `5ceb2fa5` Fix Matilda obstacle passthrough
- `d00b5c4a` Allow replacing weapons at full capacity
- `35ef77c3` Polish full-cap weapon replacement prompt
- `31faa1e9` WIP: start unifying the zombie collider with the player's

성능 리스크:

- mobile visual polish, baked lighting, B03 telegraph/run, dominance respawn, full-cap modal UI는 모두 Galaxy A24 timeline에서 A/B 분기점으로 잡아야 한다.
- `31faa1e9`는 WIP 성격이고 현재 대상 HEAD 이후 커밋이다. 현 HEAD `3d759c5c` 기준 제품 상태에 포함되었는지 별도 확인 전에는 적용 사실로 쓰면 안 된다.

---

## 3. 현재 테스트/게이트 상태

실행 명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- --run src/lib/gameplayFrameTime.test.js src/lib/gameplaySoak.test.js src/lib/spawnCatchUp.test.js src/lib/spawnCatchUpGates.test.js src/lib/dominanceSwarmRespawn.test.js src/lib/enemySimulation.parity.test.js
```

결과 요약:

```text
pretest:
branch guard: ok
Legacy B02 source gate passed.
Dialogue store gate passed (451 Korean IDs).
Studio-game sync source contract passed.

Vitest:
Test Files  1 failed | 5 passed (6)
Tests       1 failed | 43 passed (44)
```

통과:

- `src/lib/spawnCatchUp.test.js` 11 tests
- `src/lib/gameplayFrameTime.test.js` 3 tests
- `src/lib/dominanceSwarmRespawn.test.js` 5 tests
- `src/lib/enemySimulation.parity.test.js` 9 tests
- `src/lib/gameplaySoak.test.js` 2 tests

soak stdout:

```text
[soak] {"spawns":3059,"spawnFailures":115,"drainDropped":0,"kills":2918,"hits":7351,"contacts":137,"despawns":0,"deaths":2918,"rangedFires":0,"errorEvents":0,"maxActive":150,"maxProjectiles":0,"runs":1,"bursts":21,"crewSpawns":0,"saturationRuns":1,"maxOverlapFrames":1,"maxStuckMs":1183.33349609375,"contactCooldownViolations":0,"staleHitProbes":190647,"staleHitViolations":0,"upgradesApplied":76,"playerKnockbacks":137,"playerDamageEvents":70,"invulnerableBlocks":67,"heapStartMb":72,"heapEndMb":75,"heapGrowthMb":3,"stagesCovered":["stage1"],"invulnerabilityReleases":69}
```

실패:

```text
FAIL src/lib/spawnCatchUpGates.test.js > P2 — 보스 앵커 앞에서 점프를 끊어 HUD 경고 시간을 확보한다 > 다음 후보가 보스면 보스 시각 3초 전을 낸다
AssertionError: expected 150 to be 147
```

현재 코드 독해:

- `Enemies.jsx:1187-1190` 주석은 빈 화면 캐치업이 보스 경고 3초 리드보다 우선이라 `return best`를 유지한다고 설명한다.
- 따라서 테스트 기대와 현재 정책이 다르다. 어느 쪽이 제품 정본인지 levelmini/uimini/balanceqa 재합의 전에는 임의 수정 금지.

---

## 4. deterministic red-capable reproduction matrix

목표는 “느리다” 체감 신고를 수정 전 RED로 재현 가능하게 만드는 것이다. 각 행은 같은 seed/스테이지/시간창/입력 조건에서 baseline과 후보 patch를 비교할 수 있어야 한다.

| ID | 장면 | 목적 | 입력 고정 | 수집 지표 | RED 조건 |
|---|---|---|---|---|---|
| R0 | title cold 60s | 앱 시작/타이틀 GPU·WebView baseline | Play 설치본, `am force-stop` 후 start, 로그인/탭 없음 | gfxinfo framestats, meminfo, top, screencap | p95 frame > 33.3ms 또는 janky frame > 5% 또는 PSS 10분 누적 +15% |
| R1 | title warm 60s | resume/foreground 비용 | HOME 3s 후 launcher 복귀 | R0 동일 | R0 대비 p95 +20% 이상 또는 long frame cluster 발생 |
| R2 | stage1 early 0~60s | 초반 playable loop 안정성 | 같은 계정/스테이지, 조이스틱 idle 30s + circular drag 30s | frame p95/max, active enemy, projectile, heap, React commits | p95 > 33.3ms, max > 100ms 2회 이상, active count invariant mismatch |
| R3 | stage1 3+min soak | max-enemy/오버타임 전 pressure | 180s 이상 자동 생존 또는 deterministic harness + 실제기기 관찰 | maxActive, spawnFailures, heap slope, stale handle violations, gfxinfo | active/render/body 불일치, errorEvents > 0, heap slope > 1MB/min sustained |
| R4 | boss/Matilda warning window | 보스 telegraph/catch-up 정책 충돌 검출 | boss 전 10초~후 10초, 화면 비움/스폰 캐치업 상황 포함 | event timestamps, HUD warning visible duration, frame p95 | 보스 경고 visible < 3s(정책 유지 시) 또는 empty arena > 2s(빈 화면 상한 유지 시) 중 합의된 gate 실패 |
| R5 | low HP overlay 30s | full-screen vignette/composite 비용 | HP를 낮은 상태로 유지, enemy pressure 동일 | paint/composite time, GPU raster, frame p95 | overlay on/off p95 차이 > 20% 또는 composite time 2배 |
| R6 | portal open 30s | portal objective 4Hz setState 비용 | 210s 후 portal active, 이동 방향 고정 | React commits/sec, `setPortalObjective` call stack, p95 | commit/sec가 14Hz 근처로 증가하고 p95도 20% 이상 상승 |
| R7 | weapon replacement modal | full-cap prompt UI 비용/입력 stall | 무기 4개 full 상태에서 level-up replacement prompt 열기 | input latency, React actualDuration, long tasks | modal open/close max frame > 100ms 또는 tap latency > 150ms |

필수 전제:

- 실기기에서는 package identity부터 고정한다: `com.jungyoon.zombieschool`, versionCode/versionName, Play install source.
- Firebase/Auth/Play Console mutation 금지. baseline 수집은 관찰 전용이어야 한다.
- ADB 기기가 없으면 R0~R7은 NOT_RUN으로 기록하고 원인 판정 금지.

---

## 5. quantitative pass/fail gates

### 5-1. frame pacing gate

- PASS: 각 60s window에서 p50 <= 16.7ms, p95 <= 33.3ms, max <= 100ms, janky frame 비율 <= 5%.
- WARN: p95 33.3~50ms 또는 janky 5~10%.
- FAIL: p95 > 50ms, max > 200ms, janky > 10%, 또는 1초 내 3회 이상 연속 long frame cluster.
- 30fps target로 임시 하향 판정하려면 별도 제품 결정이 필요하다. 현재 Stage 1 mobile playable loop 안정성 기준으로는 60Hz 기기에서 p95 33.3ms를 1차 gate로 둔다.

### 5-2. title gate

- PASS: cold/warm title 60s 모두 `screencap` 정상, gfxinfo p95 <= 33.3ms, meminfo PSS 증가 <= 10MB/10min projected, fatal console/native crash 없음.
- FAIL: 타이틀 그래픽/캐릭터 표시 여부를 Firebase/Studio 정책과 혼동해 fallback이나 local seed로 보정하려는 시도. 성능 문제라도 타이틀 정본 잠금과 Firebase-only 법칙을 우회할 수 없다.

### 5-3. early gameplay gate

- PASS: Stage 1 0~60s 실제기기에서 input responsive, p95 <= 33.3ms, max <= 100ms, React HUD actualDuration p95 < 4ms, active enemy/render/body counts 일치.
- FAIL: 초반 60초 내 UI 입력 stall > 150ms, player/enemy NaN, errorEvents > 0, active entity mismatch, 또는 stage1 spawn rule 위반.

### 5-4. max-enemy 3+ minute soak gate

- PASS: 3분 이상 deterministic soak 또는 실제기기 soak에서 active enemy <= 150, render instances == active pooled enemies, Rapier body count는 설계 기대값과 일치, stale handle violations 0, event queue dropped 0, heap sustained slope <= 1MB/min.
- WARN: spawnFailures가 saturation 상황에서만 발생하고 active cap/invariants는 유지됨.
- FAIL: drainDropped/eventDropped > 0, staleHitViolations > 0, active/render/body mismatch, NaN/Infinity, maxStuckMs가 1200ms 이상으로 반복되어 gameplay 빈 화면/텔레포트 체감과 연결됨.

### 5-5. memory/body/entity invariant gate

- 매 sampling tick에서 기록:
  - pooled active enemies
  - live proxy count
  - render instance visible/count/highest index
  - dynamic special bodies(Boss/Matilda/props) count
  - projectiles active/max
  - event/hit queue dropped
  - heap used/PSS
- PASS: counts가 설계상 허용된 관계를 유지하고 단조 증가 누수가 없다.
- FAIL: body 참조 invalid, freed Rapier handle error, body count 증가가 phase 전환 뒤 회수되지 않음, heap/PSS가 10분 기준 15% 이상 증가.

### 5-6. boss/catch-up warning gate

현재 `spawnCatchUpGates.test.js`는 실패한다. acceptance 전 먼저 제품 정책을 둘 중 하나로 명시해야 한다.

- Gate A: “보스 경고 3초 보장”이 우선이면 `nextPendingSpawnSec`류 catch-up이 boss anchor 3초 전에 멈춰야 하고, empty arena 2초 상한 예외를 별도 정의해야 한다.
- Gate B: “빈 화면 2초 상한”이 우선이면 현재 `Enemies.jsx:1187-1190` 주석처럼 boss lead를 HUD-only로 제한하고, `spawnCatchUpGates.test.js` 기대값을 정본에 맞게 갱신해야 한다.

정책 미합의 상태에서는 이 항목을 FAIL/UNRESOLVED로 둔다.

---

## 6. 우선 계측 순서

1. launchmini baseline blocker 해소: Galaxy A24 또는 동급 Android `adb devices -l`에서 `device` 상태 확보.
2. R0/R1 title cold/warm 60s 수집. title이 이미 나쁘면 gameplay 원인 조사 전 title/Graphics/WebView 비용부터 분리.
3. R2 stage1 early 60s 수집. HUD React Profiler와 gfxinfo를 함께 잡아 HUD 10Hz 가설을 먼저 반증/확인.
4. R3 3+ minute soak. enemy/spawn/pool/Rapier/body invariant를 확인.
5. R4 boss/catch-up. 현재 실패하는 test 정책을 제품 결정으로 닫는다.
6. R5/R6/R7은 증상 발생 시점이 low HP/portal/modal과 겹칠 때 실행한다.

---

## 7. 최종 QA 판정

- 현재 상태: GO for further measurement, NO-GO for claiming root cause/fix.
- 가장 강한 확인 필요 가설: HUD 10Hz 넓은 selector/rerender 비용, enemy/spawn density와 catch-up에 따른 spike, boss/VFX/full-screen overlay composite 비용.
- 즉시 blocker: Galaxy A24/Android 실기기 ADB baseline 부재. `Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31.md` 기준으로 ADB device가 없어 Play v50 installed performance를 미측정했다.
- test blocker: `spawnCatchUpGates.test.js` 1건 실패. boss warning 3초 보장 vs 빈 화면 2초 상한 정책을 합의해야 한다.
- 이 문서는 regression timeline/gate 산출물이며, source/test/device/Firebase/git를 변경하지 않았다.
