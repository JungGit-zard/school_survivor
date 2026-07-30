# Round 3 UI/UX·모바일 접근성 비평 — 2026-07-30

## 범위·판정 원칙

- 역할: UI/UX·모바일·접근성 비평(`uimini` 관점). 구현하지 않고, 현재 코드·테스트·제공된 실제 브라우저 실측과 `Quaility_Assurance/evidence/critic_round3_*` 이미지만 검토했다.
- 비변경 경계: Firebase/RTDB, Graphics Studio/Apply, 인증·브라우저 저장소에는 접근·변경하지 않았다. 이 문서만 새로 작성했다.
- 2차 UI 종합은 **5.8 / 10**이었다. 이번 점수는 새 실측이 있는 항목만 올렸으며, 미실행 스크린리더·실기기 터치·실제 OAuth 로그인·결과/재도전은 통과로 추정하지 않았다.
- 관련 단위 테스트를 직접 재실행했다: `ConsentGate`, `GoogleAccountPanel`, `Lobby`, `HUD`, `TitleScreen.settings` **5 files / 76 tests passed**. 이는 DOM·회귀 근거이고 실제 보조기술 사용의 대체 근거는 아니다.

## Round 2 대비 재채점

| 공통 범주 | Round 2 | Round 3 /10 | 새로 확인된 근거와 남은 감점 |
| --- | ---: | ---: | --- |
| 시각 가독성·아트 디렉션 | 7.0 | **7.4** | title의 320×568·390×844·412×915·1280×720에서 계정 패널/카피/CTA 겹침 없음, `scrollHeight = viewport`가 실측됐다. 로비와 Stage 1도 네 크기로 캡처됐다. 다만 390/412 title 이미지는 인트로 도중의 한 프레임이고, 저시력·확대·reduced-effects의 실제 판독은 미측정이다. |
| 핵심 전투 루프·게임 감각 | 5.6 | **6.0** | Stage 1 네 크기 Canvas가 모두 화면을 채우고, 390 밀집 전투·pause 장면이 있다. pause/resume 10회에서 타이머가 모두 멈췄고 `00:26 → 00:26`(1.1초)도 실측됐다. 일반 난이도에서 이동/회피/사망/결과를 끝낸 사용성 기록은 없다. |
| 성장·밸런스 | 5.3 | **6.1** | 390×844 레벨업 캡처에서 세 카드의 제목·효과가 판독되며, 현재 DOM은 네이티브 `button`과 이름+효과 `aria-label`을 제공한다. 320px에서 3회 연속 선택과 결과/재도전은 미검증이다. |
| UI·모바일·접근성 | 5.8 | **7.0** | 설정 버튼은 44×44, pause는 44×44이며 safe-area CSS가 있다. `P`와 수정 후 `Escape`는 모두 pause/resume하고, level-up에서 Escape가 phase를 바꾸지 않는 테스트도 통과했다. 동의 대화상자·버튼·체크박스·카드는 이름 있는 DOM이다. 그러나 로비 `입장하기` 42px·`점수 레코드` 30px은 미달이고, 실제 스크린리더/실기기 터치는 없다. |
| 오디오·피드백 | 4.8 | **4.8** | 새 청취·마스킹·상태전환 증거가 없다. 화면상 pause/전투 피드백만으로 점수를 올리지 않는다. |
| 성능·안정성 | 5.6 | **6.3** | 네 뷰포트에서 Canvas fill과 10회 정지/재개 동작은 UI 런타임 안정성의 제한적 근거다. Android 저사양, frame time, context loss, 실제 로그인 뒤 안정성은 미측정이다. |
| 제품성·온보딩·리텐션 | 5.8 | **6.4** | title의 `자동 공격 · 화면을 드래그해 이동 · 레벨업 때 카드 선택` 안내와 동의 화면의 목적/필수 여부가 실제 화면에서 보인다. 실제 OAuth sign-in부터 동의·닉네임·결과·재시작까지 한 사용자가 완료한 증거는 없다. |

가중치(시각 15%, 전투 20%, 성장 12%, UI·모바일·접근성 25%, 오디오 8%, 성능 10%, 제품성 10%)로 계산하면

`7.4×0.15 + 6.0×0.20 + 6.1×0.12 + 7.0×0.25 + 4.8×0.08 + 6.3×0.10 + 6.4×0.10 = 6.45` → **6.5 / 10**.

**판정: FAIL — 8.0 UI 게이트 미통과.** Round 2 대비 **+0.7점**이다. 새 브라우저 증거로 좁은 화면/정지/키보드 결함은 상당 부분 해소됐지만, 명백한 로비 터치 타깃 미달과 입력·보조기술 전 흐름 미검증이 남아 있다.

## 8개 통과/실패 체크

| # | 체크 | 판정 | 실제 근거 |
| ---: | --- | --- | --- |
| 1 | title 4 뷰포트에서 계정·제목·시작 CTA 겹침/세로 overflow 없음 | **PASS** | `critic_round3_title_e2e_{320,390,412,1280}*`; Advisor 실측: overlap false, `scrollHeight=viewport` 전부. |
| 2 | 로비 4 뷰포트에서 스테이지·하단 메뉴가 보이고 320 설정 타깃 보정됨 | **PASS** | `critic_round3_lobby_*`, `...320x568_after_touch_fix*`; `Lobby.jsx` 설정 버튼 44×44, `Lobby.test.jsx` 통과. |
| 3 | Stage 1 Canvas가 4 뷰포트를 채우며 HUD 기본 정보가 보임 | **PASS** | `critic_round3_stage1_{320,390,412,1280}*`; Advisor Canvas-fill 실측. |
| 4 | pause가 최소 44×44이고 반복 정지/재개 및 키보드 `P`/`Escape`가 동작 | **PASS** | Advisor: pause 44×44, 10 cycle 모두 freeze, P 동작, 수정/HMR 뒤 Escape pause·resume 동작. `HUD.test.jsx`도 playing↔paused 및 level-up guard 통과. |
| 5 | 동의 모달의 대화상자·버튼·체크박스·행 단위 터치 영역 | **PASS (DOM 기준)** | `ConsentGate.jsx`: named dialog, close/cancel/confirm 44px 이상, 각 label 행 `minHeight:44`; raw checkbox 자체는 20px이나 label 행이 연결되어 있다. 실제 손가락 시험은 이 PASS에 포함하지 않는다. |
| 6 | 레벨업 카드가 이름/효과를 가진 버튼으로 노출되고 390에서 판독됨 | **PASS** | `critic_round3_levelup_390x844*`, `HUD.jsx`의 button/`aria-label`, `HUD.test.jsx` 통과. |
| 7 | 로비의 모든 주 행동이 44×44 이상 | **FAIL** | `Lobby.jsx`: `입장하기` `minHeight:42`, `점수 레코드` `minHeight:30`; 별도의 상위 hit-area 확장 증거도 없다. 네 뷰포트 화면 모두에 해당한다. |
| 8 | 실제 터치·Tab/Enter·스크린리더·OAuth를 포함한 로그인→결과→재도전 완주 | **FAIL** | 접근성 DOM snapshot은 존재하지만 실제 screen reader, 실기기 터치, OAuth signing-in, 결과/재도전은 테스트하지 않았다. |

## 최소 상위 3개 잔여 조치와 재증거

1. **로비 주 행동 두 개를 44px 이상으로 만든다.** `입장하기`(42px)와 `점수 레코드`(30px) 중 후자는 독립 버튼이므로 최소 높이 또는 검증 가능한 확장 hit-area가 필요하다. 수정 뒤 320/390/412/1280 bounding box와 각 10회 터치 성공을 표로 남긴다.
2. **실제 입력·보조기술 완주을 수집한다.** 같은 빌드에서 Tab/Enter/Escape/P로 login/consent/nickname/pause/level-up/result를 끝내고, 스크린리더가 dialog·checkbox·세 카드의 이름과 효과를 읽는 기록을 남긴다. 각 모달 닫기 후 포커스 복귀도 포함한다.
3. **실기기 또는 동등한 터치 환경에서 OAuth 포함 시작→결과→재도전을 한 번 완주한다.** 4뷰포트 정적/DEV E2E 증거는 확보됐지만 실제 signing-in과 일반 플레이 결과는 아직 비어 있다. Firebase 정본을 반복 시험 데이터로 바꾸지 않는 격리 계정/무기록 경로로 검증한다.

## 검토한 구현 경계

- `GoogleAccountPanel.jsx`: account action 44px 및 좁은 화면 줄바꿈 규칙, focus-visible 확인.
- `ConsentGate.jsx`: 명명된 modal, 44px close/expand/footer 버튼, 각 44px label 행과 20px native checkbox 확인.
- `Lobby.jsx`: 설정은 44px으로 수정됐으나 Stage card의 primary/ranking controls는 각각 42px/30px임을 확인.
- `HUD.jsx`: 44px pause와 `KeyP`/`Escape` 공통 guarded transition, level-up card button/ARIA 확인.

## 라우팅·자체 점검

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: Round 3의 UI/HUD/모바일/접근성 QA 재평가.
- Specialist involvement: 본 문서는 상위 Round 3 다중 역할 비평에서 맡은 `uimini` 관점 산출물이다.
- Verification: 이전 UI 1·2차 및 1차 통합 게이트, Escape/설정 보정 기록, 현재 UI 코드·테스트, Round 3 evidence 이미지, targeted Vitest 76/76을 확인했다.
- Remaining blockers: 위 3개 최소 조치와 그 직접 증거. Firebase/Studio/localStorage에는 접근·변경하지 않았다.
