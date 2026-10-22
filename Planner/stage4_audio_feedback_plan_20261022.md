# Stage 4 급식실 — 오디오·피드백 고도화 제안

작성일: 2026-10-22 · 담당: soundmini · Kanban: `t_c2fa04cc`
상태: DOCUMENT ONLY. 현재 구현의 정적 관찰과 미승인 `PROPOSAL`을 구분한 완성 기획서이며 구현 지시·승인서가 아니다.
상위 종합 기획은 levelmini 소유 `Planner/stage4_advancement_plan_20261022.md`이며 이 작업에서 편집하지 않았다.

## 1. 범위와 진행 조건
- 사용자 확정: Stage 4 입장은 Stage 3 보스 사망만으로 즉시 영구 해금한다.
- 사용자 확정: Stage 5 입장은 Stage 4 보스 사망만으로 즉시 영구 해금한다.
- 탈출·경과 시간·퀘스트·징글 재생 성공은 추가 해금 조건이 아니다. 보스 처치와 포탈 클리어는 별개 사건이다.
- PROPOSAL: 해금 피드백은 확정된 보스 사망/진행 이벤트를 관찰할 뿐, 오디오 완료 콜백으로 저장·진행을 제어하지 않는다.
- 이번 변경은 본 문서와 전용 receipt뿐이다. 런타임·DB·브라우저·테스트·배포·에셋 생성·타이틀 변경은 하지 않는다.
- 타이틀 BGM `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`와 그 재생 경로·설정은 전면 보존한다.
- 아래 새 큐·신규 적·음량·반복 제어는 모두 PROPOSAL이며 오너의 기존 확정값을 대체하지 않는다.

## 2. 근거 시점과 읽는 법
- 저장소 정본 작업 경로: `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration`.
- 아래 `SRC/`는 `Developer/r3f_prototype/src/`, `SFX/`는 `Developer/r3f_prototype/public/sfx/`의 정확한 접두어다.
- a9 스냅샷: `Planner/stage1_10_balance_implementation_20261019/stage04.md:3`의 `a9f84bf8e7f22d2b1b1c191f7b23ee2e0e908ff8`.
- 이 스냅샷은 별도 release 경로의 고정 추출 설명이다. 현재 dirty 작업본이나 운영 배포 상태와 동일하다고 보지 않는다.
- 조사 시 HEAD는 `6f416d836e355d22a4e348516cca45e194bcc56c`, 로컬 추적 origin은 `ef9b701ed30a45144937686a5fe1c1eef1ed105c`다.
- `origin/zombie_only`는 이미 보유한 로컬 참조만 `git show`/`git diff`로 읽었다. fetch하지 않아 서버 최신 여부는 미확인이다.
- 작업본은 여러 작업자의 변경이 섞여 있다. 아래 줄 번호는 조사 시점 기준이며 타인의 변경을 복원·정리하지 않는다.

| 근거 | 정확한 위치 | 관찰·해석 |
|---|---|---|
| a9 기본 진행 | `Planner/stage1_10_balance_implementation_20261019/stage04.md:9-24,267-288` | clear 기반 구현과 보스 사망 해금 요구를 이미 분리함 |
| a9 보스·버스트 | 같은 문서 `:45-80,106-142` | B04 명시 등장 150초, HP 절반에서 국물 대폭발 설명 |
| 현행 Stage 4 | `SRC/lib/stageConfig.js:96-126,189-203` | 급식실 경계·시각 필드 유지, 입장은 여전히 stage3Clears 참조 |
| 현행 Stage 5 | `SRC/lib/stageConfig.js:189-202` | stage4Clears 참조이므로 사용자 확정 진행 조건과 불일치 |
| origin 해금 | `origin/zombie_only:SRC/lib/stageConfig.js:190-198` | 실제 경로는 SRC 접두어 확장; 이전 stage BossDefeats만 허용 |
| origin 처치 | `origin/zombie_only:SRC/store/useGameStore.js:1399-1411` | bossType 검증·checkpointRun·징글 경로가 작업본과 다름 |
| 작업본 처치 | `SRC/components/Enemy.jsx:1080-1086`, `SRC/store/useGameStore.js:1380-1393` | 사망음 후 처치 기록·징글; 해당 recordBossDefeat에는 checkpointRun 없음 |
| 등장 음향 | `SRC/components/Enemy.jsx:254-266` | B04도 공통 bossSpawn, 호출 volume 0.78; 기존 관찰값 |
| 편대 경고 | `SRC/lib/burstEvents.js:235-254`, `SRC/components/HUD.jsx:1078-1117` | 형태 버스트 예고와 bossWarning 발행 존재 |
| 레지스트리 | `SRC/lib/sfxRegistry.js:14-129` | 공통 적·보스·UI·이벤트 ID; Stage4/B04/가마솥 전용 ID 없음 |
| 보스 국물 | `SRC/components/Enemy.jsx:1295-1325`, `SRC/lib/b04SoupBlast.js:1-4,24-25,44-86` | 국물 경고·폭발·페이즈 전환 분기에 전용 emitSfx 없음 |
| 보스 공격 | `SRC/components/Enemy.jsx:1367-1404,1496-1514` | B04 투사체 발사·돌진 예고/시작 분기에 전용 emitSfx 없음 |
| 가마솥 | `SRC/lib/stage4PressureCauldronHazard.js:1-35`, `SRC/components/Game.jsx:82-95` | 주기·피해 처리 존재, 해당 폭발 처리에 emitSfx 없음 |
| 가마솥 시각 | `SRC/components/StageObjects/PressureCauldron.jsx:94-114,159-162` | 끓음·폭발 상태를 읽는 시각 경로, 오디오 연결 근거는 아님 |
| 사망음 | `SRC/lib/enemyDeathSfx.js:20-25,49-52`, `SRC/components/Enemies.jsx:1560` | 일반 적은 공용 무작위 풀, 보스는 bossDeath |
| 재생 정책 | `SRC/lib/sfxRegistry.js:145-165,188-212,233-299,354-423` | combat 상한·보호 큐·쿨다운·실패 재시도 구조 |
| 전달 경로 | `SRC/lib/sfxEvents.js:8-15`, `SRC/components/SfxLayer.jsx:10-16` | 이벤트 구독 후 Howler 재생; 완성된 mute 정책의 증명은 아님 |
| 포탈 | `SRC/components/Game.jsx:99-100` | 활성화 시 portalAppear 발행, 보스 처치 해금음으로 오용 금지 |

- 비교 결과: 작업본 sfxRegistry 전체는 로컬 origin과 동일하지만 HEAD 대비 dirty다. “dirty=미반영 신기능”으로 해석하지 않는다.
- 가마솥 hazard 모듈·PressureCauldron 컴포넌트는 HEAD 및 로컬 origin 대비 차이가 없었다.
- Enemy/Game/stageConfig/store는 origin 대비 차이가 있다. origin의 보스 기록 경로를 작업본에 이미 구현됐다고 주장하지 않는다.
- 제한: Firebase 실효 튜닝·계정 영구 저장·실기기 청감·동시 재생 실측은 수행하지 않았다. 다음 절의 구현 판정은 소스 연결 기준이다.

## 3. 기존 자산 우선 재사용 결정
| 기존 ID / 실제 파일 쌍 | 확인된 상태 | Stage 4 선택 |
|---|---|---|
| bossSpawn / `SFX/events/bossSpawn.ogg`, `.mp3` | 등장 매핑·발행 확인 | PROPOSAL: 기존 연결 유지, 중복 등장음 추가하지 않음 |
| bossWarning / `SFX/events/bossWarning.ogg`, `.mp3` | HUD 보스·편대 경고 발행 확인 | PROPOSAL: 기존 의미 유지; 가마솥 전용 경고로 상시 차용하지 않음 |
| bossDeath / `SFX/enemies/bossDeath.ogg`, `.mp3` | 보스 사망 디스패치 확인 | PROPOSAL: B04도 그대로 사용 |
| bossClearJingle / `SFX/events/bossClearJingle.ogg`, `.mp3` | 마지막 생존 보스 처치 시 발행 | PROPOSAL: 해금과 연계하되 별도 stageClear 중첩 금지 |
| bossRoar / `SFX/enemies/bossRoar.ogg`, `.mp3` | 등록·파일 목록 확인, B04 전환 호출은 없음 | PROPOSAL: 국물 폭발 후 격노 진입 후보 |
| zombieRangedShoot / `SFX/enemies/zombieRangedShoot.ogg`, `.mp3` | 등록됨; B04 발사 분기 호출 없음 | PROPOSAL: B04 실제 투사체 생성 성공 시 재사용 후보 |
| zombieChargeRoar / `SFX/enemies/zombieChargeRoar.ogg`, `.mp3` | 등록됨; B04 돌진 분기 호출 없음 | PROPOSAL: 돌진 예고 시작 후보, 시작음까지 복제하지 않음 |
| flaskHit / `SFX/weapons/flaskHit.ogg`, `.mp3` | 등록·파일 목록 확인 | PROPOSAL: 국물 폭발 임시 청취 후보만; 무기 명중음 혼동 시 채택하지 않음 |
| playerHit / `SFX/player/playerHit.ogg`, `.mp3` | 공용 등록 | PROPOSAL: 기존 실제 피격 전달을 먼저 확인; hazard가 별도로 중복 발행하지 않음 |
| portalAppear·escapePortalClear / `SFX/events/`의 동명 `.ogg`, `.mp3` | 공용 등록, portalAppear 발행 확인 | PROPOSAL: 포탈 사건 전용으로 보존 |

- 이 목록은 현재 등록·경로 조사이며 디코드·청감·라이선스 검증을 대신하지 않는다. audition 디렉터리의 후보 WAV를 출시 정본으로 바꾸지 않는다.
- 출처 기록: `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json:586-604,1066-1084,1246-1264,1526-1564,1666-1684`에 관련 ID 항목이 있다.
- 해당 장부의 생성 방식 기록만 근거로 삼고 모든 파일의 CC0·퍼블릭 도메인·권리 확보를 선언하지 않는다. 신규 외부 음원·의존성은 제안하지 않는다.

## 4. 급식실 사건별 청각·시각 계약 — 전부 PROPOSAL
| 사건 | 제안 큐와 발행점 | 무음에서도 남을 피드백 |
|---|---|---|
| 진입·초반 학습 | 기존 게임플레이 음향 유지; 급식실 진입 징글 신설 보류 | 중앙 가마솥·외곽 조리대·탈출 방향의 구역 구분 |
| 원거리 압박 | 생성 성공 시 zombieRangedShoot 후보; 재료 종류별 음색 증식 금지 | 발사 자세·투사체 궤적, 식칼도 같은 공격군으로 인지 |
| 편대 포위 | 기존 HUD bossWarning 재사용, 편대 개체마다 울리지 않음 | 기존 예고 문구·편대 방향 표식 보존 |
| 가마솥 끓음 시작 | 전용 압력 경고 필요성 우선; bossWarning 무차별 차용 보류 | 솥 흔들림·증기·위험 영역 경계와 짧은 안내 문구 |
| 가마솥 폭발 | 실제 주기 전환에 짧은 압력 파열 후보; flaskHit은 임시 비교용 | 솥 중심 폭발·잔류 위험 종료 구분, 피격 여부는 HP로 표시 |
| B04 국물 예고 | 원들 전체를 묶은 사건 경고; 원마다 중첩 재생 금지 | 현행 원형 표식에 패턴·명도·위험 아이콘 구분 후보 |
| B04 국물 폭발 | 실제 explode 진입에 묶음 충격 후보; 피해 성공 여부와 별개 | 실제 생성된 원만 폭발, 안전 구역을 연기로 가리지 않음 |
| B04 격노 | soup done→phase2 확정 전이에 bossRoar 후보 | 보스 자세·단계 라벨 후보, 색만으로 단계 구분하지 않음 |
| B04 돌진 | warn 진입에 zombieChargeRoar 후보; 지속 프레임 발행 금지 | 기존 예고 자세·진행 방향·회피 공간 보존 |
| B04 경직 | 신규 큰 충격음 보류, 공격 가능한 틈은 시각 우선 | 경직 자세와 회복 시작 구분 |
| B04 사망·Stage 5 해금 | 기존 bossDeath→bossClearJingle 경로 유지, 별도 승리곡 보류 | 보스 사망·Stage 5 영구 해금 문구; 현재 런은 계속 가능 |
| 마틸다·포탈 중첩 | 기존 경고·등장·포탈 신호 유지, 급식실 장식음 억제 | 각 사건의 기존 HUD와 포탈 표시를 소리와 독립 유지 |

- 오너값/소스 관찰 보존: 가마솥 주기 15,000ms, 끓음 선행 3,000ms, 폭발 250ms, 최대 HP의 0.20 피해, 반경 3.2 units / 0.8 blocks다.
- 오너값/소스 관찰 보존: B04 국물 HP 임계 0.5, 예고 1,200ms, 폭발 250ms, 피해 16, 반경 1.1 units / 0.275 blocks, 원 최대 3개다.
- 소스 판독 주의: chefBossPhase의 1,000ms 전환 상수와 실제 Stage4 soup done→phase2 경로를 합산해 새 공격 지연으로 만들지 않는다.
- 기존 관찰값: B04 발사 간격 2,600ms, 돌진 예고 800ms, 경직 1,200ms, 돌진 2,200ms (`SRC/components/Enemy.jsx:388-391`). 변경 제안이 아니다.
- PROPOSAL: 큐는 실제 공격 상태에 동기화하며 위 타이밍·판정·스폰 시각을 음원 길이에 맞춰 늘리거나 줄이지 않는다.

## 5. 추가 좀비와 그래픽 협업 — 미등록 콘셉트 PROPOSAL
- 다음 가칭은 확정 로스터·ID·스폰·모델이 아니다. levelmini/threemini의 최종 역할·외형과 합의 전 새 SOUND_MAP 키를 만들지 않는다.
- PROPOSAL: 그래픽 상세안의 P1 급식 배식원은 식판을 당기는 준비 자세에 짧은 금속 떨림 후보를 붙인다. 방패 면역·장비 파괴 기능을 뜻하지 않으며 이동·피격마다 반복하지 않는다.
- PROPOSAL: P2 식판 운반원은 직진 전 식판을 고정하는 사건에만 금속 긴장음을 검토한다. 고정 진로·회복 자세로 무음 대응하며 카트 모델·바퀴 루프는 추가하지 않는다.
- PROPOSAL: P2 국자 투척수는 국자를 들어 올리는 준비와 실제 단발 발사를 구분한다. 가마솥 압력 경고와 다른 질감 후보를 사용하고 지속 장판·쏟음 위험을 새로 가정하지 않는다.
- PROPOSAL: P2 청소 당번은 걸레 준비와 실제 정면 쓸기를 짧은 마찰음 후보로 구분한다. 무해한 잔여 얼룩에 위험 경고음을 붙이거나 미끄러짐 기능을 암시하지 않는다.
- 콘셉트 기준: [그래픽·신규 좀비 상세안](../Graphic_designer/stage4_graphics_and_zombies_20261022.md)의 네 종류를 참조한다. P2는 선택 후보이며 동시 제작·편성을 뜻하지 않는다.
- PROPOSAL: 일반 적의 사망 발성은 현행 무작위 공용 풀 유지. 종별 고정 사망음으로 회귀하지 않는다.
- PROPOSAL: 추가 생물 발성·대사·pseudo-voice는 이번 안에서 보류하며 의미 전달을 음성 전용으로 만들지 않는다.

## 6. 우선순위·반복 억제·모바일 예산
- 현재 구현 관찰: combat 상한 6, 사망 발성 예약 2, master 0.5다. 이 값은 이번 문서에서 변경하지 않는다.
- 현재 구현 관찰: playerHit 쿨다운 80ms, zombieSpawn 110ms, flaskHit 100ms이며 bossWarning·bossRoar의 개별 쿨다운 항목은 없다.
- 보호 큐는 combat 상한 밖이다. 따라서 “게임 전체 동시음이 6개 이하”라고 설명하면 틀리며 위험 큐 증식도 모바일 비용이다.
- 현재 criticalHit·tumblerHit은 논리 사건당 Howler 재생을 중복 호출한다. 사건 개수와 실제 보이스 개수를 따로 세어야 한다.
- PROPOSAL 우선순위: 즉시 회피 경고·플레이어 피격/사망 > 보스 단계·해금/포탈 > 일반 공격·사망 > 수집·장식.
- PROPOSAL: 보호 큐끼리 겹치면 가마솥/국물/돌진 위험 의미를 보존하고 장식·반복음을 먼저 포기한다. 전역 cap 상향은 보류한다.
- PROPOSAL: 신규 사건은 run 식별자·개체 식별자·상태 전환·주기 식별자로 중복 제거하고 render/useFrame 반복에서 직접 발행하지 않는다.
- PROPOSAL: 가마솥 경고와 폭발은 주기마다 각각 한 사건만 발행하고, 재개 시 지나간 주기 음향을 몰아서 따라잡지 않는다.
- PROPOSAL: 같은 프레임의 국물 원들은 묶고, 서로 다른 hazard를 ID 쿨다운만으로 지워버리지 않도록 사건별 의미를 유지한다.
- PROPOSAL 믹스 후보: 신규 경고 호출 volume 0.55–0.70, 신규 폭발 0.45–0.60을 비교 청취 시작점으로만 사용한다.
- PROPOSAL 반복 후보: 신규 압력 경고 ID 최소 간격 250ms, 폭발 ID 200ms; 실제 공격 주기를 바꾸는 값이 아니다.
- PROPOSAL 폴리포니 후보: 신규 hazard 계열 동시 보이스 최대 2, 동일 신규 ID 최대 1; 기존 보호 큐·오너 믹스는 자동 변경하지 않는다.
- PROPOSAL: 위험 구간에는 신규 실내 ambience·지속 끓음 루프를 넣지 않는다. BGM 추가·교체·ducking, 특히 타이틀 영향은 범위 밖이다.

## 7. 무음·실패·접근성 계약
- PROPOSAL: SFX 음소거·기기 무음·autoplay 차단·디코드 실패에도 경고·피격·해금·포탈 상태는 정상 표시하고 게임을 계속 진행한다.
- PROPOSAL: 기존 설정의 실제 mute 전달과 재개 동작부터 확인하며, 별도 로컬 저장소나 타이틀 설정 변경으로 해결하지 않는다.
- PROPOSAL: 화면 밖 위험은 방향과 종류를 HUD로 보완하고 stereo 위치나 저음 진동만으로 안전 방향을 전달하지 않는다.
- PROPOSAL: 붉음/주황만의 구분 대신 윤곽·패턴·아이콘·문구를 병행하고, 플래시/화면 흔들림을 필수 정보로 삼지 않는다.
- 현재 registry는 실패 backoff 후 다음 사건 재시도를 지원한다. PROPOSAL: 신규 큐 실패는 진행과 독립시키고 성공할 때까지 경고음을 큐에 쌓지 않는다.

## 8. 승인 후 제작 후보 체크리스트와 수용 기준
- [ ] PROPOSAL/기획: levelmini가 신규 적 역할·스폰·경고 의미를 확정하고 threemini가 시각 짝을 확정한다. 본 문서는 통합본을 덮어쓰지 않는다.
- [ ] PROPOSAL/발행 후보: `SRC/components/Enemy.jsx`, `SRC/components/Game.jsx`, `SRC/components/HUD.jsx`; 동일 사건의 단일 발행 책임자를 정한다.
- [ ] PROPOSAL/상태 참조 후보: `SRC/lib/b04SoupBlast.js`, `SRC/lib/stage4PressureCauldronHazard.js`; 판정 모듈에 음향 의존성을 주입하지 않고 전이만 관찰한다.
- [ ] PROPOSAL/재생 후보: `SRC/lib/sfxRegistry.js`, `SRC/lib/sfxEvents.js`, `SRC/components/SfxLayer.jsx`; 공유 경로 변경은 타이틀 영향 없이 분리 가능한지 선행 검토한다.
- [ ] PROPOSAL/그래픽 후보: `SRC/components/StageObjects/PressureCauldron.jsx`, `SRC/components/Enemy.jsx`의 국물 표식; 기존 정본 모델·Studio 값을 바꾸지 않는다.
- [ ] PROPOSAL/자산 후보: 기존 `SFX/enemies/`, `SFX/events/`, `SFX/weapons/` 우선. 새 압력음이 승인될 때만 별도 제작·출처 기록 작업을 연다.
- [ ] PROPOSAL/출처: 기존 provenance manifest의 해당 항목과 생성 스크립트 기록을 담당자가 대조한다. 새 의존성·외부 샘플 도입은 기본 경로가 아니다.
- [ ] PROPOSAL/향후 검증 후보: `SRC/lib/sfxRegistry.test.js`, `SRC/components/SfxLayer.test.jsx`, `SRC/components/Game.stage4PressureCauldron.test.js`, `SRC/components/EnemyVisual.test.js`; 이번에 수정·실행하지 않았다.
- [ ] 수용 예정: B04 등장·국물 예고·폭발·격노·돌진·사망을 실제 상태와 맞춰 구별하고 취소/사망/재시작 뒤 지연음이 남지 않는다.
- [ ] 수용 예정: 보스·가마솥·편대·마틸다·포탈이 겹쳐도 회피 경고가 묻히지 않고 불필요한 중복·클리핑·재개 폭주가 없다.
- [ ] 수용 예정: muted/첫 gesture 전/오디오 실패에서도 시각 경고와 Stage 4·5 보스 사망 해금이 유지되며 재접속 영구성은 별도 검증한다.
- [ ] 수용 예정: 모바일 스피커·이어폰·백그라운드 복귀에서 실제 보이스 수·CPU·청감을 기록하고 PROPOSAL 수치는 승인 전 확정하지 않는다.
- [ ] 수용 예정: 타이틀 BGM·재생 경로·오너 확정 수치·기존 공용 사망 풀은 그대로이며 신규 적 미승인 상태를 구현 완료로 보고하지 않는다.

문서 검증 범위는 줄 수·근거 경로/줄·제안 표기·소유 경계의 정적 확인이다. 위 수용 체크는 후속 승인 작업의 기준이며 이번 실행의 테스트 통과 결과가 아니다.
