# Stage4 비모델 구현 계약 — 2026-10-24

담당 levelmini · Kanban t_787d1632 · READONLY gameplay synthesis. 이 산출물은 구현 담당/Balance_QA_Mini 인계 계약이며 실행 빌드 PASS가 아니다. 최신 사용자 구현 승인이 과거 문서의 DOCUMENT ONLY 상태를 이번 제한 범위에서 대체한다. Stage1 모바일 루프 회귀를 허용하지 않는다.

## 1. 정본·근거·분리
- canonical: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration
- 후보 lane: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024
- 후보 .git/HEAD와 loose ref를 읽어 zombie_only / 0bcf4bff123f58c28a12598bbf9f4d68e5aada5b 체크아웃 확인. fetch/checkout/Git 명령 미실행. 별도 checkoutready 인계 파일은 발견하지 못했으며 ref 및 package 존재 확인 뒤 후보 소스만 읽었다. 원격 최신/운영 반영 증거는 아니다.
- 사용자 정본 Planner/stage_zombie_concept_plan_20261023.html: 전체 1행. 실제 SHA-256 320d7db4542023d4b69a4f0e10802fbcbcfce7a708c0a31eaa097df3d84c300a 일치. #stage-4 및 '기존 구현과 연결할 때 지킬 점'이 활성 기준. 후보의 오래된 general concept가 우선하지 않는다.
- canonical Planner/stage4_advancement_plan_20261022.md:12–17,69–105,123–151,153–180,200–219,233–241.
- canonical Graphic_designer/stage4_graphics_and_zombies_20261022.md §7:241–351. 특히 266–298 보존/보류, 321–350 비모델 개선.
- canonical Planner/stage4_audio_feedback_plan_20261022.md:69–89,101–138. 신규 음원/믹스는 제안일 뿐; 이번에는 기존 cue를 soundmini가 검토하며 음향이 판정/진행을 제어하지 않는다. audio315 유지.
- 이하 SRC는 후보 Developer/r3f_prototype/src/. 아래는 정적 관찰이며 사용자 Studio 실효값을 읽거나 복원한 결과가 아니다.

## 2. 지금 구현할 범위와 합격 기준
| 담당 접점 | 활성 납품 | 필수 수용 기준 |
|---|---|---|
| 기존 PressureCauldron 위험 시각 | 중앙 고정 연속 경계로 3초 전체 예고 | 게임시각 주기 마지막 3000ms 전 구간에 표시; 15초 주기/250ms 발동 보존. 경계의 world radius 3.2 units / 0.8 blocks가 실제 피해 반경과 일치. 부모 0.4 base scale/Studio scale에 이중 축소되지 않으며 owner transform을 덮어써 해결하지 않음 |
| 기존 B04 soup 시각 | 중앙 솥과 다른 분절 경계 | 실제 생성 원만 표시, 0~3개 허용. 반경 1.1 units / 0.275 blocks, 1200ms 예고→250ms 폭발→기존 P2; 회색조/무음에서도 중앙 연속 링과 구분. 신규 좀비 메시 파트가 아님 |
| 취소·pause·restart | 시각/피해/기존 cue의 동일 상태 생명주기 | playing 외 피해·타이머 누적 없음. pause/resume에 경고 시간 건너뜀/과거 cue 몰아재생 없음. death/despawn/런 종료/gameKey 변경에 이전 원·피해·지연음 잔류 0건; 슬롯 재사용 시 이전 공격 재발 0건. 기존 Physics gameKey 전체 리마운트 유지 |
| 기존 주방·장애물 읽기 | 북 조리/중앙 전투/남 접근의 랜드마크·가림·solid/clutter 구별 | 8종 solid+솥과 통과 clutter 구별; 냉장고/랙/솥 뒤 위험 경계·보스 방향 판독. 기존 조명/재질/좌표/스케일/충돌/Studio 입력 불변. 변경 권한이 없는 owner 값이 필요하면 정확한 충돌만 인계하고 자동 교체 금지 |
| uimini | 맥락형 Stage4 gameplay 안내 | 가마솥 주기, 국물 전환, 보스 처치 해금과 포탈 탈출의 차이를 실제 상태에 맞춰 안내. 조작 잠금/강제 튜토리얼 없음. 기존 퀘스트 start/completion 우선·원문/ID/보상 불변. 205/210초 위험과 전투 판단 가림 없음 |
| soundmini | 기존 cue 검토 | 새 SOUND_MAP/음원/캡/믹스 확정 없이 현재 cue 연결·중복·취소 검사. muted/autoplay 실패에도 시각·피해·진행 동일. 타이틀 BGM 및 audio315 보존 |

현재 후보 PressureCauldron.jsx:94–135는 boiling 때 steam을 켜지만 burstRef는 bursting에만 켜며 :167–179 경계도 8개 박스다. 즉 기존 3초 끓음이 곧 '3초 연속 world-radius 경고 구현 완료'는 아니다. :25–26 base scale 환산만으로 임의 Studio scale까지 패리티라고 단정하지 않는다.

## 3. 변경 불가 수치·진행
- 1 block=4 units. 맵 전체 18.72×32 units / 4.68×8 blocks; 반폭 9.36×16 units / 2.34×4 blocks. 장식 타일 0.8 units / 0.2 blocks를 block으로 오독하지 않는다.
- 후보 SRC/lib/stageConfig.js:7–19,102–130,198–207: Stage1~4 현재 선택 목록 노출 유지. Stage4 B04=150초, Matilda warning=205초/spawn=210초, portal=210초, 명목 240초. 자동 승리/강제 종료 추가 없음.
- SRC/lib/stage4PressureCauldronHazard.js:1–5,11–35: 15000ms/3000ms/250ms, maxHP 20% 피해, radius 3.2 units / 0.8 blocks. 중심/판정/주기/피해 변경 없음. cauldron 피해는 기존 ignoreInvulnerability 경로를 유지하며 무적으로 통과하라는 안내 금지.
- SRC/lib/b04SoupBlast.js:1–4,22–25,44–86: HP≤50% 1회, 최대 3원, 1200ms/250ms, 피해16, radius 1.1 units / 0.275 blocks. 후보 실패 때 정확히3원을 강제하지 않음. soup done 후 P2에 별도 1000ms 무적/새 대기 추가 금지. 기존 돌진 warn800ms/charge2200ms/stun1200ms 보존.
- Stage3 대표 보스 사망만→Stage4 즉시 영구 해금, B04 사망만→Stage5 즉시 영구 해금. 포탈/시간/퀘스트/오디오 완료/clear는 대체 증거가 아님. Stage5 해금 기록과 Stage5 목록 노출은 별개; 목록 확대 금지. 사망 이후 현재 런 지속 가능.
- 기존 title/room/auth/progress/ranking/quest/audio315 전부 보존. 인증 memory-only, localStorage 전면 금지. Rules/Functions/Firebase writes/production/Play/AAB 작업 없음.

## 4. 역사 자료·보류·별도 모델 인계
- 활성 일반 좀비는 기존 공통 BOX E03/E02/E04. geometry/palette/type/costume/slot/스탯 변경 없음. 새 모델은 다른 담당의 독립 인계이며 완료를 비모델 작업의 선행 조건으로 만들지 않는다.
- 그래픽 구안 §4 C4_SERVE/C4_TRAY/C4_LADLE/C4_MOP, 식판/앞치마/국자/걸레·신규 타입·스폰·판정은 §7.3으로 보류. 오디오 §5의 해당 신규 적 큐도 함께 보류.
- 과거 옥상/B03/140초/clear 해금/갈색 바닥/중앙 조리대/이전 맵 폭은 현행 복구 명세가 아니다. advancement 과거 W의 clear 불일치를 현재 후보 오류라고 확정하지 않는다.
- 통로 2.4 units / 0.6 blocks 목표 및 p95 10% 후보는 과거 PROPOSAL이지 배치/성능 확정값이 아니다. 연결 탈출로 관찰은 하되 이번에 wave/피해/HP/장애물 위치를 변경하지 않는다. 새 damage/waves/IDs/costumes 없음.

## 5. LOCAL fixture와 정확한 차단 사항
확인된 기존 메모리 fixture:
- 후보 SRC/lib/firebaseProgress.js:273–297 applyCloudProgressSnapshot(snapshot, fakeUser, {keepCloudUserNull:true}). cloudUser=null을 유지해 진행도 쓰기 대상을 등록하지 않는 기존 함수다.
- 후보 SRC/lib/firebaseProgress.test.js:424–437: e2e-local-test, hydrated=true, getUserProgressPath()==빈 문자열, requestCloudProgressSave()==false, save 미호출을 검증하는 기존 단위 fixture. 본 작업은 읽기만 했으며 실행 PASS 주장 아님.
- 이것은 진행도용 메모리 경로이지 Studio 로컬 시드 허가가 아니며 auth/화면 진입/랭킹/모든 네트워크 차단을 보장하지 않는다.

실제 Stage4 장면까지 안전하게 진입하는 완결된 기존 LOCAL E2E 경로는 이번 조회에서 확인되지 않았다. 다음은 root/QA 환경 차단:
1. 후보 Developer/r3f_prototype/node_modules 없음(조회 시점). 설치/서버/빌드/브라우저/테스트는 levelmini 권한 밖, 실행하지 않음.
2. 후보 useAuthStore.js:20–27에 DEV E2E 주석은 있으나 실제 분기는 !isFirebaseAuthConfigured()→unconfigured뿐. URL e2e 우회가 작동한다는 증거 없음. canonical Game.jsx:58–60도 쿼리 무장 주석만 남아 있음.
3. 후보 e2e에는 shark_missile_check.spec.js 하나가 있고 :11–12 addInitScript에서 localStorage.setItem 사용. 현재 정책 위반이므로 재사용/실행 금지. package의 benchmark:stage2-mellow가 가리키는 spec도 현재 e2e 파일 목록에 없음.
4. 실제 인증/랭킹 송신 및 Studio 정본까지 분리한 scene fixture는 확인하지 못했다. 위 진행도 함수 하나만 적용해 안전한 실제 Stage4 런이라고 보고하면 안 됨. root/QA가 기존 진입 seam을 추가 확인하거나 제한된 테스트 하니스 권한을 확정해야 함; title/room/auth 제품 코드 변경이나 Firebase userdata/localStorage 우회는 해결책 아님.
5. credential/env 복사·신규 승인 요청 대행 없음. Firebase 현재 revision·실효 Studio 좌표·모바일 청감·프레임·영구 저장 성공은 관측하지 않았으므로 해당 PASS 보류. 모델 인계 대기와 별개이며 비모델 구현 자체의 차단 사유가 아님.

## 6. Balance_QA_Mini 최소 인계(미실행)
- 가마솥 예고 시작/중간/마지막 프레임과 250ms 발동을 같은 게임시계로 기록. world 경계 안/밖, pause/resume/restart/death를 검사; radius 패리티는 승인된 owner transform을 유지한 실제 장면 증거 필요.
- HP50% 전후 국물 0~3원·예고·폭발·P2 순서·첫 돌진800ms 및 중복 피해/잔류0건. 스폰/공격을 느리게 만들어 합격시키지 않음.
- 150/168/184/205/210/216초 중첩에서 좌우 우회·북 퀘스트 접근·회색조·무음·모바일 터치 판독 검사. 연결 탈출로 부족은 구체 좌표 units/blocks와 상태를 기록, wave/Studio 자동 변경 금지.
- Stage3/B04 사망만 양성, 시간/포탈/퀘스트만 음성, 중복 사망·사망 후 런 종료 사례를 메모리 격리 환경에서 검증. 재접속 영구성은 Firebase writes 금지인 이번 로컬 lane만으로 실증 불가; 기존 통과 증거와 로컬 회귀를 구분.
- 실제 source SHA/URL/화면/명령·종료코드·미실행 항목을 root가 최종 대조. 문서/단위 함수 존재는 running reflected build 증거가 아니다.
