# Stage4 기존 오디오 재사용 — 초기 통합 브리프

담당 soundmini / 카드 t_218319ae / 수신자 threemini 및 Root Advisor.
상태: READONLY 소스 검토 완료, 아래 기존 ID 재사용 연결 승인. 구현·청감·게임 QA·실행 빌드 승인 아님. Enemy/PressureCauldron의 유일 구현 담당은 threemini. 이 문서만 canonical에 생성했다. Git은 Root 담당이다.

## 1. 기준과 범위

- Canonical: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration
- 조사 후보 SRC: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024/Developer/r3f_prototype/src
- 사용자 전달 기반: zombie_only / latestremote0bcf4bff. Git 재조회·수정하지 않았다. 아래 행 번호는 조사 순간의 candidate 작업 파일 기준이며 병행 편집 시 심벌을 우선한다.
- 첫 명령 mandatory checker exit 0. matched_domains gameplay(stage), qa(review), audio(audio); resolved common/gameplay/qa/audio. receipt 3d874c41ac05cb2337e1c2a1baab77e36aa061f32b935af2464c0d0ef8d47587. emitted 문서를 읽었고 SESSION_MEMORY는 최신 단일 엔트리만 읽었다. GSTACK_OK.
- Canonical Planner/stage_zombie_concept_plan_20261023.html 전체 원문 확인 및 SHA-256 실측: 320d7db4542023d4b69a4f0e10802fbcbcfce7a708c0a31eaa097df3d84c300a, 사용자 지정값 일치. 자산 해시/포맷 검수는 하지 않았다.
- Planner/stage4_advancement_plan_20261022.md, Planner/stage4_audio_feedback_plan_20261022.md, Graphic_designer/stage4_graphics_and_zombies_20261022.md §7 확인. 옛 오디오 계획 §5의 네 복장 아이디어(C4_SERVE/TRAY/LADLE/MOP)는 보류다. 활성 역할은 E03 소형 러너 / E02 대형 탱커 / E04 원거리의 현재 공유 박스 메시다. 새 타입·스탯·슬롯·복장·팔레트·geometry 변경이나 종별 새 보이스 배정 없음.
- 런타임·registry·mix·master·타이틀·자산·Firebase·인증·진행·랭킹·퀘스트·audio315 변경 없음. 자식 에이전트, 테스트, 브라우저, 서버/게임 프로세스 실행 없음. 필수 checker와 읽기 명령만 실행했다.

## 2. 최소 연결 승인표

새 ID/파일/루프/예약 타이머 없이 기존 emitSfx 경로만 사용한다. 별도 volume/rate 조절 없이 기존 registry/Studio 튜닝을 따른다. 아래 우선순위는 의미상 구현 순서이며 registry의 우선순위 API가 아니다.

| 사건 | 승인 기존 ID 및 SOUND_MAP 경로 | 정확한 단일 발행점 | 중요도/제약 |
|---|---|---|---|
| 중앙 솥 경고 | zombieGiantThud → /sfx/enemies/zombieGiantThud.ogg | Game.jsx의 playing fixed-step 시계에서 현재 주기 warning 구간 진입 1회. getPressureCauldronHazardVisual 또는 동일 상수로 상태 관찰 | P0 위험. giant 의미를 가진 기존 저역 타격의 임시 환경 신호 재사용이며 전용 압력음이라고 주장하지 않음. bossWarning 반복 차용 금지 |
| 중앙 솥 발동 | flaskHit → /sfx/weapons/flaskHit.ogg | Game.jsx:82–95 getPressureCauldronExplosionTimes 소비 시 주기당 1회, 위치 반경/피해 가드보다 앞에서 현재 주기만 발행 | P1 발동. 플레이어가 솥 밖이어도 실제 폭발이면 발행. catch-up 과거 폭발 전부 재생 금지 |
| B04 P1 사격 | zombieRangedShoot → /sfx/enemies/zombieRangedShoot.ogg | Enemy.jsx:1396–1406 enemyProjectilePool.spawnInto(...)가 true 반환한 직후, type B04 + stage4 한정 | P1 공격. canFire 진입/발사 시도만으로 발행 금지. 재료 4종은 같은 큐 |
| B04 국물 예고 | zombieChargeRoar → /sfx/enemies/zombieChargeRoar.ogg | Enemy.jsx:1312–1321 startB04SoupBlast의 idle→telegraph 성공 직후 | P0 위험. 원 전체 묶음 1회; circles.length>0일 때만 공간 위험음 발행 |
| B04 국물 발동 | flaskHit → /sfx/weapons/flaskHit.ogg | Enemy.jsx:1300–1306 advanceB04SoupBlast 전후 telegraph→explode 전이에서만 | P1 발동. 원 묶음 1회; 실제 원이 없으면 무음. consumeB04SoupBlastHit 결과와 무관 |
| B04 P2 | bossRoar → /sfx/enemies/bossRoar.ogg | Enemy.jsx:1324–1327 soup done 처리에서 기존 chefPhaseRef가 CHEF_PHASE2가 아닐 때, 실제 P2 전이 1회 | P1 단계. soup done은 여러 프레임 유지되므로 단순 done 조건 안의 무조건 emit 금지. 일반 chef telegraph 경로에도 이중 발행 금지 |
| B04 dash | zombieChargeRoar → /sfx/enemies/zombieChargeRoar.ogg | Enemy.jsx:1501–1508 chargeState chase→warn 진입, stage4/B04/P2 한정 | P0 위험. 실제 dash의 800ms 선행 경고에만 1회. :1513–1518 warn→charge에는 추가 발행하지 않음 |

OGG/MP3 선택은 기존 sfxRegistry.js:381–405가 처리한다. 파일별 소스·권리 근거는 기존 Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json과 원 기획 §3의 장부 포인터를 유지한다. 새 외부 자산·라이선스·의존성을 도입하지 않았으며 기존 자산의 CC0/권리 검증 완료를 새로 선언하지 않는다.

선택 근거: bossWarning은 HUD의 보스/편대 의미를 보존한다. 새 압력음 제작 대신 giantThud 단발을 허용한다. flaskHit은 기존 충격음의 최소 재사용이며 무기 명중과의 의미 혼동/음색 적합성은 실청 미확인이다. 의미는 중앙 솥/분산 국물 시각으로 구별하고 이 음색만으로 위험 종류를 전달하지 않는다. 이 제한을 수용할 수 없으면 해당 환경/발동 큐는 무음 유지가 안전한 대안이다.

## 3. 중복 제거·우선순위·수명 계약

- 모든 신규 emit은 stage4 && phase===playing, B04는 살아 있는 현재 개체에만 허용한다. run gameKey + stageId + enemy id/생성세대 + 패턴 종류/주기번호를 메모리에서 구분한다. 이벤트 버스의 _id는 매 emit 증가할 뿐 중복 제거 키가 아니다.
- warning/폭발/P2/dash 각각 전이 1회만 소비한다. soup 원 3개와 fixed substep/render 횟수만큼 울리지 않는다. 피해·공격·보상 처리 이후 음향 실패로 해당 로직이 되돌아가면 안 된다.
- 즉시 회피 경고·플레이어 사망/피격을 최우선, 기존 bossDeath/clear/마틸다/포탈 사건 보존, 다음 P2 및 발동, 이후 사격/장식 순이다. 기존 큐를 취소하거나 전역 믹스를 바꾸는 권한은 없다. 새 반복/장식 큐를 먼저 생략한다.
- 중앙 솥과 국물 폭발이 같은 때 flaskHit을 공유하면 기존 100ms ID 쿨다운으로 한 소리만 들릴 수 있다. 동일 프레임엔 하나의 충격으로 병합 허용, 두 시각/두 피해는 각각 원래대로 유지. 사라진 음을 나중에 재생하지 않는다. 경고는 서로 다른 ID이므로 의도적 병합하지 않는다.
- zombieRangedShoot/zombieChargeRoar/zombieGiantThud/bossRoar는 registry protected다. combat cap 6 밖이므로 전역 동시음 6개 보장으로 설명하지 않는다. flaskHit은 combat이며 포화/쿨다운으로 탈락 가능하다. 이 문서는 cap 6, 사망 예약 2, master 0.5 및 튜닝을 그대로 둔다. priority/owner/eventKey를 emit에 붙여도 현재 SfxLayer는 처리하지 않는다.
- pause/levelup/auth overlay/탭 중단: 새 emit·미소비 예약을 중단하고 게임 시계 기준 상태를 유지한다. resume으로 같은 warning/폭발/P2/dash를 재발행하지 않는다. PressureCauldron의 visual 함수는 playing 외에 false를 주므로 false→true만으로 warning을 판단하면 재개 시 중복된다. 주기번호+이미 발행 여부를 pause 동안 보존한다.
- 경고 도중 pause 후 재개해도 원래 잔여 예고를 따르며 새 3초/1200ms/800ms를 오디오 때문에 추가하지 않는다. 과거 사이클 catch-up 음은 버리고 현재 위험 상태만 관찰한다. gameKey/stage 변경에는 중복키를 폐기하고 새 런 기준으로 시작한다.
- death/despawn/공격 취소 시 아직 발행하지 않은 공격 큐를 버린다. 보스 사망 시 이미 비워지는 soup 상태(Enemy.jsx:1070–1076)를 따라가며 취소된 explode/P2를 예약 실행하지 않는다. setTimeout/Howl onend로 폭발·전환·해금을 예약하지 않는다.

### 중요 제한: 이미 재생되었거나 Howler 로딩 대기 중인 소리의 강제 취소

현재 emitSfx(sfxEvents.js:8–10)는 핸들을 반환하지 않고 동기 listener를 호출한다. SfxLayer.jsx:13–15는 id/volume/rate만 playSfx로 전달한다. playSfx는 Howl/soundId를 호출자에게 반환하지 않고 scoped stop/pause API도 없다. 따라서 위 단발 계약은 미래 emit/중복/논리 예약 취소 계약이며, 이미 울린 꼬리나 cold-load로 Howler 내부에 대기한 play를 개체 사망·pause·restart 순간에 강제 정지시킨다는 보장은 없다.

registry/mix/master/runtime 공용층 수정 금지하에서는 이 한계를 해결했다고 주장하지 않는다. Howler.stop 전역 호출, 캐시 내부 접근, 매 큐 새 Howl 생성, SfxLayer 우회는 금지한다. 엄격한 무잔류가 release 필수이면 Root가 별도 scoped playback/cancel API 범위를 승인해야 한다. 현재 승인 범위에서는 취소가 필요한 미래음을 미리 큐에 넣지 않는 최소 직접 emit만 사용하고, 미실행 모바일/cold-load 검증을 남긴다. 누락 오디오가 게임을 차단해서는 안 된다. 동기 bus listener가 throw할 가능성도 있으므로 연결부는 실제 게임 로직과 분리된 안전한 호출 경계를 사용하고 사망/진행 로직을 오디오 성공에 의존시키지 않는다.

## 4. 이미 존재하는 발행 — 추가하지 말 것

- Enemy.jsx:255–267 getEnemySpawnSfx/emitEnemySpawnSfx: B04도 bossSpawn volume 0.78. 새 B04 등장음 중복 금지.
- Enemy.jsx:1085 deathSfxId(type,isMatilda) → 기존 bossDeath. :1087–1089 recordBossKill/recordBossDefeat 호출. 별도 bossDeath/해금음 추가 금지.
- store/useGameStore.js:1399–1411 recordBossDefeat: bossAliveCount 가드, 마지막 보스만 checkpointRun 후 bossClearJingle. 문서의 오래된 checkpoint 누락 관찰은 이 후보에 적용하지 않는다. 징글 종료를 영구 해금 조건으로 삼지 않는다.
- HUD.jsx:1124 bossWarning 카운트, :1130–1133 formationWarning이 bossWarning 발행. 솥/국물에 이 ID를 추가해 HUD 경고를 복제하지 않는다.
- Game.jsx:98–100 포탈 활성화 portalAppear. EscapePortal.jsx:98–101 완료 시 escapePortalClear 후 clearStage(). store/useGameStore.js:1414–1424 clearStage의 stageClear가 기존 경로다. 보스 사망에 stageClear/escapePortalClear를 새로 붙이지 않는다. 기존 포탈 완료 두 큐를 이번 검토로 제거·교체하지도 않는다.
- store/useGameStore.js:448/453 playerDeath/playerHit: hazard/국물은 damagePlayer를 통한 기존 피격 전달만 사용한다. 별도 playerHit 중복 없음. 기존 Matilda dash/laugh/경고 emit도 보존.
- PressureCauldronHazardVisual:94–130은 동일 runtime time을 읽는 시각 소비자이며 현재 emit 없음. 오디오는 Game의 단일 중앙 주기 소유로 하고 이 visual 컴포넌트에 이중 연결하지 않는다. Game 변경은 Root/해당 파일 owner에게 전달하며 threemini가 타 소유 파일을 무단 편집하지 않는다.

## 5. 변경 불가 수치와 인계 판정

맵18.72×32 units / 4.68×8 blocks; B04 150초, Matilda 예고205/스폰210초, 포탈210초, 명목240초 유지. 솥15초주기/3초예고/250ms발동/3.2 units(0.8 blocks), 최대HP20% 유지. B04 HP50% 1회 국물,1200ms예고/250ms발동/반경1.1 units(0.275 blocks)/최대3원 후 P2 유지. chefBossPhase의 별도1000ms를 추가하지 않는다. dash800ms 예고/2200ms 돌진/1200ms 경직 유지. bossdeath-only 영구해금 유지, 소리/퀘스트/포탈/경과시간은 해금 선행조건 아님.

초기 브리프 납품 완료. 실제 emit 패치·실청·pause/cold-load/재시작 무잔류·모바일 동시음·Firebase 저장·실행 빌드는 미검증이며 PASS로 보고하지 않는다. 이번 작업은 정적 소스 읽기와 본 파일 작성/재읽기만 수행했다. 최종 패치 리뷰는 요청 시 별도 수행한다.
