# Escape! zombie school complete guide evidence (2026-10-11)

이 문서는 `Planner/escape_zombie_school_complete_guide_20261011.html` 작성/보강 근거를 빠르게 추적하기 위한 증거 목록이다. 소스 관찰 기준이며, live Firebase/배포/로그인/게임플레이 검증은 수행하지 않았다.

## 이번 보강 범위
- 소유 파일: `Planner/escape_zombie_school_complete_guide_20261011.html`, `Planner/game_guide_evidence_20261011.md`만.
- 목적: 기존 가이드를 “전체 기획/개발/구현 설명” 요구에 맞게 보강하고, 초보자용 사용성 설명과 구현 근거를 분리한다.
- 추가/보강 항목:
  - 빠른 시각 지도/내비게이션.
  - 20개 무기 전체 행: 이름, 기능, 해금/등장, 핵심 기본값.
  - 8개 NPC fetch/return/install 퀘스트와 rewardGold.
  - 런 중 레벨업 vs 코인샵 영구 패시브/무기 영구 성장 구분.
  - ReadyGameApp 화면 라우팅(title/lobby/coinShop/ranking/missionCenter/game)과 store phase 구분.
  - 모바일 조이스틱 및 WASD/방향키 입력.
  - Firebase Auth inMemoryPersistence, progress save/load 경계, browser durable storage 금지.
  - Graphics Studio Apply/Firebase-only 저장 정책과 그래픽 표시 독립 정책. 단, compliance audit를 수행했다는 주장은 하지 않음.
  - 데이터 흐름 ASCII 다이어그램.
  - 실제 상대 링크(`href`)로 소스 목록 연결.
  - table horizontal overflow, sticky nav scroll-margin, print readability 스타일.

## 필수 문서/규칙
- `AGENTS.md`
- `Bang_Rules.md`
- `project_develop_policy.md`
- `CLAUDE.md`
- `SESSION_CONTINUITY.md`
- latest single `SESSION_MEMORY.md` entry per mandatory rule
- mandatory precommand checker:
  - Profile: `levelmini`
  - Domain: `auto`
  - TaskSummary: `game guide systems usability documentation update`
  - matched_domains: `ui`
  - resolved_domains included `common`, `ui`, `gameplay`
  - combined_receipt_sha256: `4530f079b8f296a7e041530c7f8d6ffec12cad523fbb2f9e2836056e71b929d0`

## 코드 정본
- 스테이지/타이밍/해금: `Developer/r3f_prototype/src/lib/stageConfig.js`
  - Stage 1~4 존재.
  - 기본 duration 240초.
  - Stage 1 boss spawn 150초, portal/Matilda 210초.
  - Stage 1 맵 halfX 10, halfZ 14.4; Stage 2/3 halfX 7.5, halfZ 19.2; Stage 4 halfX 9.36, halfZ 16.
- 버스트/보스 파생: `Developer/r3f_prototype/src/lib/burstEvents.js`
  - boss type: B01/B02/B03/B04.
  - boss phase는 earliest boss burst event에서 파생.
- 무기 카탈로그: `Developer/r3f_prototype/src/lib/weaponCatalog.js`
  - 총 20종.
  - starter 4종: pencilThrow, schoolBag, boxCutter, tumbler.
  - account unlockable 13종.
  - runtime combination 3종: hanako, bikittyCutter, lineDraw. Firebase 영구 해금 플래그 대상처럼 쓰지 않는다.
- 레벨업/카드: `Developer/r3f_prototype/src/lib/upgrades.js`
  - `MAX_OWNED_WEAPONS = 10`.
  - `MAX_WEAPON_LEVEL = 5`.
  - `LEVELUP_CHOICE_COUNT = 4`.
  - full-cap에서도 계정 해금/최소 레벨 조건을 만족한 획득 카드는 교체 후보로 표시될 수 있고, 실제 활성 무기 수는 교체 확정 시 기존 무기를 제거해 10개로 유지한다.
- 퀘스트: `Developer/r3f_prototype/src/lib/quests.js`
  - 8개 정의.
  - stage1: `stage1-talk-book`, `stage1-attendance`.
  - stage2: `stage2-bandage`, `stage2-broadcast-key`.
  - stage3: `stage3-whistle`, `stage3-scoreboard-fuse`(install).
  - stage4: `stage4-allergy-list`, `stage4-gas-valve`(install).
  - 코드 관찰상 각 rewardGold는 2.
- 영구 패시브: `Developer/r3f_prototype/src/lib/passiveCatalog.js`
  - 활성 MVP 5종: magnet, moveSpeed, maxHp, might, growth.
  - maxLevel 3.
  - BASE_PRICES: 20, 45, 90; 항목별 priceMultiplier.
  - armor/cooldown/greed는 등록되어 있으나 `enabled:false`.
- 무기 영구 강화: `Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.js`
  - 무기별 maxLevel 10 계획.
  - 예: chibiko Lv5 동료 피해 +10%, Lv10 투척체 +1; inucon Lv5 회복량 +2%, Lv10 밀어내기 범위 +10%; compassBlade Lv5 회전 속도 +10%, Lv10 스택 폭발 범위 +10%.
- 진행 저장/골드/런 상태: `Developer/r3f_prototype/src/store/useGameStore.js`
  - phase: playing/paused/levelup/gameover/cleared.
  - Firebase progress hydration 여부가 계정 진행/골드의 기준으로 쓰인다.
- 무기 해금 저장: `Developer/r3f_prototype/src/lib/weaponUnlocks.js`
  - Firebase player progress 기반.
  - starter는 저장하지 않고 항상 해금.
  - 게스트/미 hydration 상태는 starter 외 계정 해금 없음.
- 미션: `Developer/r3f_prototype/src/lib/missionCatalog.js`
  - MISSION_CATALOG 30개.
  - MISSION_REWARD_APPROVED = true.
  - rewardProposal/status proposal 필드는 남아 있으므로 문서에서는 “코드상 승인 플래그와 제안 메타가 공존”으로 표현.
- 적 스탯: `Developer/r3f_prototype/src/components/Enemy.jsx`
  - E01/E02/E03/E04/E05/E06/E07/E08, RZ* run crew, B01~B04.
- UI/화면/조작:
  - `Developer/r3f_prototype/src/components/ReadyGameApp.jsx`: TitleScreen, Lobby, GameplayScreen, CoinShop, UserRanking, StageRanking, MissionCenter 등 lazy route; 스테이지 진입은 Google/Firebase progress hydration에 막히면 안 된다는 주석/흐름 존재.
  - `Developer/r3f_prototype/src/lib/keyboardInput.js`: WASD/방향키, blur/visibilitychange reset.
  - `Developer/r3f_prototype/src/components/VirtualJoystick.jsx`: 모바일 이동.
- Firebase/Auth:
  - `Developer/r3f_prototype/src/lib/firebaseAuth.js`: `setPersistence(auth, inMemoryPersistence)` 경로.
  - `Developer/r3f_prototype/src/lib/firebaseProgress.js`: Firebase-only player progress, durable browser storage guard, mission reward transaction.
  - `DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'` 이름만 문서화; 실제 값/credential은 기록하지 않음.
- 코인샵:
  - `Developer/r3f_prototype/src/components/CoinShop.jsx`: goldTotal 표시, passive/weapon 탭, PassiveUpgradeList와 WeaponPermanentUpgradeList 렌더.
- 기술 스택/스크립트: `Developer/r3f_prototype/package.json`
  - React 18, Vite 8, Three/R3F, Zustand, Firebase, Howler, Capacitor.
  - scripts: dev/build/test/verify:studio-game-sync 등.

## 20개 무기 관찰 요약
- `pencilThrow` 연필 — starter, Lv1, startsActive, damage 2.4, cooldown 550ms, range 2.25 units(0.5625블록).
- `schoolBag` 30cm 자 — starter, Lv2, damage 12, cooldown 1300ms, range 0.633 units(0.158블록).
- `boxCutter` 커터칼 — starter, Lv2, damage 7.2, cooldown 1625ms, range 1.4 units(0.35블록), crit 33%.
- `tumbler` 텀블러 — starter, Lv2, damage 6, radius 1 unit(0.25블록), 2.5 hits/s.
- `scienceFlask` 과학 플라스크 — totalRuns 2, Lv4, damage 7.5, cooldown 8400ms, zoneRadius 1.4 units(0.35블록).
- `bell` 벨 — stage1Clears 1, Lv4, damage 10, cooldown 3200ms, 8 directions.
- `stunGun` 전기 — stage2Clears 1, Lv6, damage 18, cooldown 3000ms, chainCount 2.
- `onigiri` 오니기리 — totalKills 700, Lv6, damage 52.5, cooldown 5000ms, bounces 6.
- `chibiko` 치비코 — totalRuns 3, Lv8, damage 1.25, cooldown 1100ms, range 22 units(5.5블록).
- `hanako` 하나코 — runtime combination, healInterval 20000ms, healPercent 5%.
- `inucon` 이누콘 — bossKills 3, Lv8, healInterval 2000ms, healPercent 2%, pushRadius 0.85 units(0.2125블록).
- `guidedMissile` 보조배터리 미사일 — bossKills 1, Lv4, damage 8, cooldown 6000ms, range 7.34 units(1.835블록).
- `sharkMissile` 상어미사일 — stage2Clears 1, Lv8, damage 20.8, cooldown 4200ms, range 28 units(7블록).
- `starlink` 고장난 스타링크 — totalKills 2500, Lv8, damage 28, cooldown 6500ms, strikeCenter 5 units(1.25블록).
- `compassBlade` 오리요강 — totalKills 200, Lv3, damage 5, radius 1.15 units(0.2875블록), 2 hits/s.
- `umbrellaGuard` 우산 방어막 — totalSurvivalSeconds 300, Lv3, damage 12, cooldown 3600ms, radius 1.25 units(0.3125블록).
- `eraserBomb` 지우개 폭탄 — totalGold 160, Lv4, damage 26, cooldown 6000ms, radius 1.35 units(0.3375블록), range 12 units(3블록).
- `studentLantern` 학생용 랜턴 — stage3Clears 1, Lv5, cooldown 8000ms, duration 3000ms, lightLength 2.08 units(0.52블록).
- `bikittyCutter` 바이키티 커터칼 — runtime combination, Lv6, damage 5.4, cooldown 1200ms, segments 8.
- `lineDraw` 선긋기 — runtime combination, Lv8, damage 20, cooldown 4200ms, range 6 units(1.5블록), pierce 999.

## stale/주의 사항
- `Planner/current_game_rules.md`에는 Stage 1 boss 192초/portal 240초/weapon slots 8처럼 현재 코드와 맞지 않는 값이 있다.
- 현재 가이드는 코드 정본을 우선한다: Stage 1 boss 150초, portal 210초, duration 240초, run weapon cap 10.
- source default 값은 live Firebase/admin tuning과 다를 수 있다. live 검증 없이 배포 상태로 단정하지 않는다.
- 현재 로컬 워크트리는 unrelated dirty edits가 많으며, 이 문서 작업은 `Planner/escape_zombie_school_complete_guide_20261011.html`과 이 evidence 파일만 소유한다.
- obsolete v3-v8 art는 본문 이미지에서 제외했다. 사용 이미지는 `Graphic_designer/쇼츠프로젝트_20261010/images/`의 존재 확인된 쇼츠/콘셉트 이미지이며 “concept art, not gameplay capture”로 라벨링했다.
- 부활/광고/코인 부활 플로우는 이번 소스 확인에서 정본 기능으로 문서화하지 않았다. 확인된 경제는 골드 표시, 패시브/무기 영구 성장 탭, 생존/퀘스트/미션/랭킹 기반 보상 흐름이다.

## 검증
- `gstack` gate: `GSTACK_OK`.
- HTML readback 검증 예정/완료 항목은 Kanban handoff에 기록한다.
- 이번 문서 작업은 dev server, npm test, build, browser, Firebase write, deploy, commit, push를 수행하지 않는다.
