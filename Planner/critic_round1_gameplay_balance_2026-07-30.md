# 1차 게임플레이 루프·밸런스 비평

- 작성일: 2026-07-30
- 범위: 현재 작업 트리의 Stage 1(4분 생존 표방) 우선 평가. 코드를 변경하거나 Firebase·Graphics Studio·브라우저 `localStorage`에 접근하지 않았다.
- 평가 기준: 4분 생존 루프, 웨이브, 무기·업그레이드, 난이도 곡선, 보상 템포, 반복 플레이성.
- 증거 한계: `Quaility_Assurance/evidence/critic_round1_title_loaded_2026-07-30.png`는 현재 타이틀 로딩을 보여 주지만 실제 전투·모바일 조작·사운드·4분 완주 증거는 아니다. 8점 이상은 직접 플레이/실기기 증거가 없어 부여하지 않았다.

## 결론

**전체 5.2 / 10 (재평가 보류)**. 코드에는 자동 전투, 무기/레벨업, 터치 조이스틱, 풀 기반 적 런타임, SFX라는 실체가 있다. 그러나 Stage 1이 표방하는 240초 생존과 실제 완료 흐름이 충돌한다. B01은 120초에 나오고 처치 즉시 클리어되므로, 보통의 성공 런은 150초 포탈·180초 마틸다·192/240초 보상까지 갈 수 없다. 이는 숫자 튜닝 전에 먼저 해결할 플레이 루프 단절이다.

가중치는 전투 25%, 성장/밸런스 20%, UI·모바일 15%, 시각 10%, 오디오 10%, 성능·안정성 10%, 제품·온보딩 10%로 계산했다. 0.1×6.0 + 0.25×5.0 + 0.2×4.0 + 0.15×6.0 + 0.1×5.5 + 0.1×6.5 + 0.1×4.5 = **5.2**다.

## 7개 범주 점수

| 범주 | 점수 | 직접 근거와 감점 사유 |
| --- | ---: | --- |
| visual readability / art direction | 6.0 | 타이틀 증거에는 학교·좀비·인물의 3D 군상, 대비가 큰 제목, 큰 시작 버튼이 있어 테마와 시작 행동은 읽힌다. 다만 이것은 전투 화면이 아니며, 적 겹침·피격·투사체·후반 웨이브에서의 판독성은 현재 직접 증거가 없다. |
| core combat loop / game feel | 5.0 | 자동 무기, 적 스폰/피격, 보스, 탈출구가 코드상 연결돼 있다([Game.jsx](../Developer/r3f_prototype/src/components/Game.jsx) 91–105, 166–193). 하지만 B01 120초 등장([burstEvents.js](../Developer/r3f_prototype/src/lib/burstEvents.js) 27)과 처치 즉시 클리어([Enemy.jsx](../Developer/r3f_prototype/src/components/Enemy.jsx) 673–675)가 4분 생존 전제를 끊는다. 실제 4분 손맛 검증도 없다. |
| progression / balance | 4.0 | Stage 1 웨이브는 E01 단독→러너/탱커→돌진/거대→후반 완화로 읽히는 곡선을 갖고 있다([waveTimelines.js](../Developer/r3f_prototype/src/lib/waveTimelines.js) 9–35). XP 임계값 증가와 무기 8개·무기 레벨 5 상한도 구현돼 있다([useGameStore.js](../Developer/r3f_prototype/src/store/useGameStore.js) 224–243, [upgrades.js](../Developer/r3f_prototype/src/lib/upgrades.js) 130–171). 그러나 192/240초 마일스톤이 성공 런에서 도달 불가능할 수 있고, 문서의 5분/4분·4슬롯/8슬롯 규칙이 상충한다. 실측 승률·레벨·선택률 데이터가 없다. |
| UI / mobile / accessibility | 6.0 | 터치 시작·이동·취소를 처리하고 dead zone/반경 제한을 둔 가상 조이스틱이 있다([VirtualJoystick.jsx](../Developer/r3f_prototype/src/components/VirtualJoystick.jsx) 61–155). HUD에는 일시정지와 레벨업 선택, 알림 역할이 있다([HUD.jsx](../Developer/r3f_prototype/src/components/HUD.jsx) 762, 811–877, 934–969). 다만 좁은 실기기 전투 검증은 QA에서도 미실시이며, 일시정지 아이콘 버튼에는 접근성 이름이 없다([HUD.jsx](../Developer/r3f_prototype/src/components/HUD.jsx) 813–815). |
| audio / feedback | 5.5 | 무기 발사·타격, 적, UI, 보스까지 SFX 맵이 존재한다([sfxRegistry.js](../Developer/r3f_prototype/src/lib/sfxRegistry.js) 13–80). 재생에는 쿨다운·볼륨·재생속도 제한이 있다(199–227). 다만 현재 런에서 소리가 들리고 구분되는지, 자동 발사 다발음이 피로하지 않은지, 모바일 스피커에서 충분히 들리는지 직접 증거가 없다. |
| performance / stability | 6.5 | 적 풀은 200개 고정 슬롯/typed array를 사용한다([enemyEntityPool.js](../Developer/r3f_prototype/src/lib/enemyEntityPool.js) 1–3, 57–117). 2026-07-30에 `waveTimelines`·`gameRuntimeTime` 2파일 22테스트를 직접 통과했고, 소크 하네스도 적·무기·이동·리스폰 불변식을 검사하도록 작성돼 있다([gameplaySoak.js](../Developer/r3f_prototype/src/lib/gameplaySoak.js) 179–182, 453–454). 그러나 이 하네스의 기본값은 40초이며 실제 렌더링/Android 4분 성능 증거는 아니다. |
| product / onboarding / retention | 4.5 | 타이틀은 “4분만 버티면”이라는 간단한 약속과 시작 버튼을 명확히 제시한다(제목 증거). Stage 2 해금도 Stage 1 클리어 또는 180초 생존 3회로 설계돼 있다([stageConfig.js](../Developer/r3f_prototype/src/lib/stageConfig.js) 155–163). 하지만 실제 120초 보스 클리어 흐름은 약속을 깨며, 해금·코인·보스·포탈의 보상 템포가 어떤 성공 행동을 보상하는지 불명확하다. 신규 유저의 첫 10분과 재시작 동기를 검증한 증거가 없다. |

## 플레이어 영향 기준 상위 5개 문제

| 우선순위 | 문제와 플레이어 영향 | 근거 | 8점 도달을 위한 가장 작은 구체적 개선 | 재평가 합격 조건 |
| ---: | --- | --- | --- | --- |
| 1 | **4분 생존 약속과 실제 완료 조건이 서로 다르다.** 플레이어는 4분을 기대하고 시작하지만 B01을 빨리 잡으면 2분 부근에 결과로 나갈 수 있다. 후반 생존·탈출의 성취감이 사라진다. | `STAGE_DURATION_SEC=240` 및 “240초 동안 버티기”([stageConfig.js](../Developer/r3f_prototype/src/lib/stageConfig.js) 6, 13)와 달리 B01은 120초([burstEvents.js](../Developer/r3f_prototype/src/lib/burstEvents.js) 27), 처치 시 `clearStageWithBossBonus()`가 즉시 호출된다([Enemy.jsx](../Developer/r3f_prototype/src/components/Enemy.jsx) 673–675). | Planner에서 Stage 1의 **단 하나의 완료 조건**을 먼저 확정하고, `burstEvents`, `stageConfig`, 보스 사망 콜백을 그 한 규칙으로 맞춘다. 타이틀이 4분을 약속한다면 240초 전 보스 처치만으로 결과로 가지 않게 해야 한다. | 새 계정으로 0:00부터 실제 240초까지 3회 성공/3회 실패를 녹화한다. 타이머·보스 등장·클리어 조건이 타이틀/설정/결과 화면에서 모두 같은 초를 보이며, 그 이전에 결과 화면이 열리지 않는다. |
| 2 | **보상 템포가 성공 루프 바깥으로 밀려 있다.** 150초 포탈, 180초 마틸다, 192·240초 골드가 설정돼도 120초 보스 처치가 일반 성공이면 보지 못한다. 플레이어가 왜 후반까지 생존해야 하는지 약해진다. | Stage 1 포탈 150초·마틸다 180초·마일스톤 48/144/192/240초([stageConfig.js](../Developer/r3f_prototype/src/lib/stageConfig.js) 17–34), 포탈은 해당 시각에 활성화([Game.jsx](../Developer/r3f_prototype/src/components/Game.jsx) 97–101). | 1번에서 확정한 완료 조건에 맞춰 **도달 가능한 보상만** 남기거나, 보스/포탈/마틸다/마일스톤의 시간을 한 타임라인 표로 재배열한다. 첫 단계는 Stage 1 표 한 장과 코드 상수 4곳의 일치다. | 3개 성공 런에서 모든 의도된 보상 이벤트가 정확히 한 번 나타나고, 각 이벤트 뒤에 다음 목표(보스/탈출/생존)가 HUD로 읽힌다. 192·240초 보상이 설계상 존재한다면 실제로 획득 가능해야 한다. |
| 3 | **정본 문서가 구식 5분·`localStorage`·4슬롯을 함께 담아 현재 코드와 충돌한다.** 기획자·개발자·플레이어 문구가 다른 게임을 가리키므로 다음 밸런스 변경의 기준이 사라진다. | [current_game_rules.md](current_game_rules.md) 1–7은 4분 전환 메모와 본문의 5분/300초를 함께 갖고, §5·§6은 `localStorage`와 4보유 상한을 서술한다. 현재 코드는 240초([stageConfig.js](../Developer/r3f_prototype/src/lib/stageConfig.js) 6), Firebase progress 읽기([useGameStore.js](../Developer/r3f_prototype/src/store/useGameStore.js) 97–105), 8보유 상한([upgrades.js](../Developer/r3f_prototype/src/lib/upgrades.js) 130–171)을 사용한다. | `Planner/current_game_rules.md`에서 폐기된 5분/`localStorage`/4슬롯 서술을 제거하고, Stage 1 한 장짜리 정본 표(길이·보스·클리어·보상·슬롯·영구 저장 경계)를 코드와 동일하게 갱신한다. | 독립 검토자가 문서 표와 `stageConfig`·`burstEvents`·`upgrades`를 대조해 시간/완료/보상/슬롯/저장 경계 불일치 0건을 기록한다. Firebase-only 정책 위반 서술도 0건이어야 한다. |
| 4 | **난이도 곡선은 데이터만 있고 플레이 결과로 닫히지 않았다.** 타깃 수가 17→34→11→17로 변하지만, 랜덤 20–40초 웨이브 간격과 1.15배 Stage 1 스폰 배율에서 초보자 포위·중간 이완·보스 대비가 실제로 느껴지는지 모른다. | Stage 1 phase 값([waveTimelines.js](../Developer/r3f_prototype/src/lib/waveTimelines.js) 9–35), 랜덤 간격/0.5 크기/1.15배([Enemies.jsx](../Developer/r3f_prototype/src/components/Enemies.jsx) 435–457). 문서상 과거 50초 플레이 및 상태 소크는 있지만 현행 4분 완주 체감 데이터가 없다. | 코드 수치 변경 전, 고정 시드 3개와 일반 랜덤 7개로 **현행 Stage 1 4분 플레이 로그**를 수집한다. 최소 항목은 첫 레벨업 시각, 레벨/무기 수, 피격·사망 시각, 보스 소요, 골드·포탈 도달 여부다. | 10런 로그에 생존/사망 분포, 첫 레벨업, 각 웨이브 구간 HP, 보스 도달·처치 시각이 모두 있고, 의도한 완화구간(90–108초)이 평균 HP 회복 또는 탈출 공간으로 식별된다. 결과를 보고 나서만 수치 변경을 판단한다. |
| 5 | **전투 UI·오디오·성능의 모바일 체감 증거가 없다.** 터치 조이스틱과 SFX가 있어도, 좁은 화면에서 레벨업 카드/보스 경고/피격 피드백이 겹치면 초보자는 패배 원인을 이해하지 못한다. | 조이스틱 구현([VirtualJoystick.jsx](../Developer/r3f_prototype/src/components/VirtualJoystick.jsx) 85–155), HUD 보스 경고·레벨업 오버레이([HUD.jsx](../Developer/r3f_prototype/src/components/HUD.jsx) 721–724, 859–877), SFX 레지스트리([sfxRegistry.js](../Developer/r3f_prototype/src/lib/sfxRegistry.js) 13–80). QA는 Android/AAB·실기기·수동 reduced-motion 검증 미실시를 명시한다([critical_hit_screen_shake_qa_plan_2026-07-25.md](../Quaility_Assurance/critical_hit_screen_shake_qa_plan_2026-07-25.md)). | iPhone SE급과 저사양 Android에서 Stage 1 4분을 각각 1회씩 수동 검수하고, 일시정지 버튼에 `aria-label`을 추가해 화면읽기 이름을 제공한다. | 두 기기에서 조이스틱 시작/취소, 레벨업 선택, 보스 경고, pause/resume, reduced-motion, 전투 SFX를 4분 동안 확인한다. 치명적 UI 겹침·입력 소실·오디오 폭주·프레임 중단이 0건이며, 스크린샷/동영상과 기기 정보를 QA에 남긴다. |

## 현재 확인한 증거와 검증 한계

- 직접 실행: `npm.cmd test -- src/lib/waveTimelines.test.js src/lib/gameRuntimeTime.test.js` → **2 files, 22 tests PASS**. 이는 타임라인 데이터와 런타임 시간 함수의 회귀 확인일 뿐, 실제 4분 전투의 재미·렌더링·오디오·터치를 보증하지 않는다.
- 기존 `Quaility_Assurance/game_start_runtime_fix_qa_2026-07-26.md`는 타이틀→로비→Stage 1에서 00:04까지, 오류 0을 기록했다. 4분 전투의 증거는 아니다.
- 기존 `Quaility_Assurance/internal_gameplay_500_run_stress_2026-07-02.md`는 store 상태 시뮬레이션이며 렌더링/애니메이션/오디오/실기기 터치는 범위 밖이라고 명시한다.
- `runGameplaySoak`은 유용한 불변식 검사지만 기본 2,400프레임은 40초다([gameplaySoak.test.js](../Developer/r3f_prototype/src/lib/gameplaySoak.test.js) 4–8). 실제 플레이 품질 점수로 대체하지 않았다.

## 재평가 게이트

다음 다섯 조건이 모두 충족되어야 8점대 재평가를 시작할 수 있다.

1. Stage 1의 240초/보스/포탈/마틸다/클리어가 코드·Planner 정본·타이틀·결과 화면에서 한 규칙으로 일치한다.
2. Firebase-only 정책과 맞게 현재 규칙 문서의 구식 `localStorage` 저장 서술이 제거되고, 저장 경계 대조 결과가 0건 불일치다.
3. 현행 빌드에서 10개의 4분 Stage 1 로그와 최소 두 종류의 실패/성공 영상을 남겨 난이도·보상 템포를 측정한다.
4. iPhone SE급과 저사양 Android에서 각 1회 이상 4분 수동 전투 QA를 완료하고 UI, touch, audio, reduced motion, 프레임 저하 결과를 기록한다.
5. 변경 후 관련 타임라인/보상/클리어 회귀 테스트, 빌드, 실제 플레이 검증이 모두 통과하며 다른 Firebase 정본·Graphics Studio 값은 변경하지 않는다.

이 게이트 전에는 시각·오디오·성능의 직접 전투 증거가 부족하므로, 코드 존재만으로 8점 이상을 주지 않는다.
