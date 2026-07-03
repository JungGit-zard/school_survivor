# 모바일 최적화 QA 리포트 — Escape! zombie school — 2026-07-03

## 요약

- 대상: `Developer/r3f_prototype`
- 기준 URL: `http://127.0.0.1:5174/` 프로덕션 preview
- 검수 기준:
  - `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`
  - `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`
  - `dogfood` R3F/Rapier web game QA reference
- 검수 디바이스:
  - iPhone SE emulation: 320x568 CSS px, DPR 2
  - Pixel 7 emulation: 412x839 CSS px, DPR 2.625
- 실행 방식:
  - Playwright mobile/touch emulation
  - title / coin shop / ranking / gameplay / joystick touchstart+touchmove / 12초 gameplay soak 캡처
  - 콘솔 warning/error 수집
  - 모바일 관련 Vitest focused suite 실행

## 산출물

- 모바일 전문가 상주 문서:
  - `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`
- 모바일 캡처 메트릭:
  - `Quaility_Assurance/mobile_optimization_audit_2026-07-03.metrics.json`
- 스크린샷 폴더:
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/`

## 검증 명령 결과

```text
npm test -- src/App.virtualJoystick.test.jsx src/components/VirtualJoystick.test.jsx src/components/TitleScreen.settings.test.jsx src/components/CoinShop.test.jsx

Test Files  4 passed (4)
Tests       27 passed (27)
```

참고: Vitest stderr에 React `act(...)` 테스트 환경 warning이 반복되지만 테스트 실패는 아님.

## 모바일 런타임 관찰

- iPhone SE / Pixel 7 모두 문서 overflow 없음:
  - `overflowX=false`
  - `overflowY=false`
- Canvas는 각 모바일 viewport 전체를 채움:
  - iPhone SE: 320x568
  - Pixel 7: 412x839
- Virtual joystick은 canvas touch에서 표시됨:
  - iPhone SE probe: 104x104 joystick at approx x=38, y=380
  - Pixel 7 probe: 104x104 joystick at approx x=40, y=586
- 코인상점 `코인 부족` 버튼은 disabled 상태 확인.
- 콘솔/pageerror:
  - 앱 크래시성 JS error 없음.
  - iPhone SE headless screenshot 중 WebGL ReadPixels performance warning 발생. 이전 검수와 동일하게 캡처 환경성 note로 분류.
  - Firebase OAuth authorized domain warning 발생: `127.0.0.1` 로컬 도메인 미등록으로 Google OAuth popup/redirect가 막힐 수 있음.

---

# 발견 이슈

## 1. iPhone SE 타이틀 상단 Google 계정 패널이 과도하게 압축되어 텍스트가 깨져 보임

- 심각도: Medium
- 카테고리: Mobile UX / Layout
- 디바이스: iPhone SE 320x568
- 근거 스크린샷:
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_01_title.png`
- 코드 참고:
  - `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
  - panel width: `width: 'min(218px, calc(100% - 154px))'`

### 재현 단계

1. iPhone SE viewport로 `http://127.0.0.1:5174/` 접속
2. 타이틀 상단 좌측 Google 계정 영역 확인

### 기대 동작

- Google 계정/로그인 영역이 모바일에서도 읽을 수 있어야 함.
- disabled 상태라도 로그인 버튼과 사용자/상태 텍스트가 서로 밀려 주요 문구가 깨져 보이지 않아야 함.

### 실제 동작

- 좌측 계정 텍스트가 `저...` 형태로 강하게 줄임 표시됨.
- 같은 패널 안의 Google 로그인 버튼이 상대적으로 커서 패널 내부 정보 위계가 불명확함.
- 측정상 Google 로그인 버튼 높이가 35px로, 모바일 권장 터치 타깃 44px보다 작음. 현재는 disabled이지만 로그인 가능 상태에서는 터치 타깃 리스크가 됨.

### 권장 조치

- 320px 폭에서는 Google 계정 패널을 한 줄 카드가 아니라 compact icon + short status 또는 별도 top row로 재배치.
- 로그인 가능 상태의 버튼은 최소 44px 높이를 보장.
- 치트/설정 버튼과 함께 상단 3개 영역이 경쟁하지 않도록 top bar layout을 모바일 전용으로 분리.

---

## 2. 프로덕션 preview 모바일 타이틀에서도 치트 버튼이 기본 노출됨

- 심각도: High
- 카테고리: Release / Mobile QA / Debug leakage
- 디바이스: iPhone SE, Pixel 7
- 근거 스크린샷:
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_01_title.png`
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/pixel_7_01_title.png`
- 기존 리포트 관련 이슈:
  - `Quaility_Assurance/bug_audit_2026-07-03.md` 이슈 1

### 재현 단계

1. 프로덕션 preview URL 접속
2. 모바일 타이틀 우상단 확인

### 기대 동작

- 외부 테스터/릴리스 후보 모바일 화면에서 치트 버튼은 기본 비노출이어야 함.

### 실제 동작

- iPhone SE 타이틀 상단에 `치트` 버튼이 명확히 노출됨.
- 모바일에서는 화면 폭이 좁아 치트 버튼이 설정/계정/로그인보다 더 눈에 띄는 주요 CTA처럼 보임.

### 권장 조치

- `DEFAULT_ADMIN_CONFIG.operations.cheatMenuButtonVisible` 기본값을 release/preview에서 false로 전환.
- 또는 `import.meta.env.DEV` / 명시적 internal QA flag로 보호.

---

## 3. iPhone SE 게임플레이 상단 HUD가 과밀하여 타이머/버튼 가독성이 낮음

- 심각도: Medium
- 카테고리: Mobile Gameplay HUD / Readability
- 디바이스: iPhone SE 320x568
- 근거 스크린샷:
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_04_gameplay_initial.png`
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_06_joystick_touchmove.png`
- 측정:
  - gameplay button min dimension: 40px

### 재현 단계

1. iPhone SE viewport에서 게임 시작
2. 닉네임 입력 후 gameplay 진입
3. 상단 pause / restart / menu / timer / level / coin HUD 확인

### 기대 동작

- 320px 폭에서도 타이머, 레벨, 코인, pause/restart/menu가 명확히 분리되어 보여야 함.
- 핵심 버튼은 최소 44px 터치 타깃을 유지해야 함.

### 실제 동작

- 상단 좌측 pause/restart/menu 버튼이 크게 붙어 있으며, 중앙 타이머 패널과 시각적으로 겹쳐 보임.
- 타이머의 왼쪽 부분이 버튼 군집에 밀려 읽기성이 낮음.
- 일부 HUD 버튼의 측정 최소값이 40px로 모바일 권장 44px보다 작음.

### 권장 조치

- iPhone SE 전용 HUD compact layout 적용:
  - pause/restart/menu를 하나의 햄버거/일시정지 메뉴로 묶기
  - timer는 중앙 상단 단독 pill로 유지
  - level/coin은 우측 상단 2단 compact badge로 축소
- 최소 터치 타깃 44px 확보.

---

## 4. 코인상점 구매 버튼 높이가 37px로 모바일 권장 터치 타깃보다 작음

- 심각도: Medium
- 카테고리: Mobile Touch Target / Shop UX
- 디바이스: iPhone SE, Pixel 7
- 근거 스크린샷:
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_02_coin_shop.png`
  - `Quaility_Assurance/screenshots/mobile_optimization_audit_2026-07-03/iphone_se_02b_coin_shop_scrolled_bottom.png`
- 코드 참고:
  - `Developer/r3f_prototype/src/components/CoinShop.jsx:372-389`
  - `buyButton.minHeight: 37`
  - `insufficientButton.minHeight: 37`

### 재현 단계

1. 모바일 viewport로 코인상점 진입
2. 각 패시브 카드 우측 구매/코인 부족 버튼 확인

### 기대 동작

- 실제 구매 가능 상태의 버튼은 44px 이상 높이와 충분한 간격을 가져야 함.

### 실제 동작

- 현재 `코인 부족` disabled 버튼은 37px로 표시됨.
- 같은 스타일 계열의 구매 가능 버튼도 `minHeight: 37`이라 실제 구매 상태에서 작은 터치 타깃이 될 가능성이 높음.

### 권장 조치

- `buyButton`, `insufficientButton`, `maxButton`의 `minHeight`를 최소 44로 상향.
- 320px 폭에서 카드 높이와 정보량을 조정해 버튼만 커져도 레이아웃이 무너지지 않도록 카드 grid를 재조정.

---

## 5. 로컬 preview에서 Google OAuth domain warning 발생

- 심각도: Low / Environment note
- 카테고리: Auth / Local QA Environment
- 디바이스: iPhone SE, Pixel 7
- 관찰 로그:

```text
Info: The current domain is not authorized for OAuth operations. This will prevent signInWithPopup, signInWithRedirect, linkWithPopup and linkWithRedirect from working. Add your domain (127.0.0.1) to the OAuth redirect domains list in the Firebase console -> Authentication -> Settings -> Authorized domains tab.
```

### 해석

- 로컬 `127.0.0.1` preview에서 Google OAuth popup/redirect 테스트가 막힐 수 있음.
- 배포 도메인 이슈인지 로컬 환경 이슈인지는 별도 확인 필요.

### 권장 조치

- 모바일 QA에서 Google 로그인까지 검수하려면 Firebase authorized domains에 로컬/preview 도메인을 임시 추가하거나, 배포 preview URL에서 검수.
- 실제 Play 내부테스트 빌드에서는 Android OAuth 설정/SHA/패키지명까지 별도 검증.

---

# 정상/양호 판정

## Virtual joystick 기본 동작

- iPhone SE / Pixel 7에서 canvas touchstart/touchmove 시 joystick이 표시됨.
- iPhone SE에서 joystick은 HP bar를 직접 가리지 않음.
- `VirtualJoystick` focused tests 7개 통과.
- 향후 실제 기기에서는 장시간 이동 중 손가락이 weapon slot/HP 영역을 가리는지 추가 검수 권장.

## Viewport overflow

- iPhone SE / Pixel 7 주요 화면에서 horizontal/vertical document overflow 없음.
- Canvas가 viewport 전체를 채움.

## 코인상점 스크롤

- iPhone SE에서 최하단 스크롤 시 마지막 `학습력` 카드와 `타이틀로 돌아가기` 버튼은 분리되어 표시됨.
- 초기 화면에서 마지막 카드가 일부만 보이는 것은 스크롤 목록의 자연스러운 일부 노출로 판단. 겹침 자체는 재현되지 않음.

---

# 다음 권장 작업

1. 모바일 릴리스 차단 우선:
   - 치트 버튼 / 개발 로그 복사 버튼 release 기본 비노출 처리.
2. iPhone SE HUD compact layout:
   - timer와 pause/restart/menu 분리.
   - 44px 터치 타깃 보장.
3. 코인상점 버튼 44px 이상 상향 및 카드 layout 재검증.
4. Google OAuth는 로컬이 아닌 실제 배포/Android 내부테스트 환경에서 재검수.
5. Stage 2 모바일 장시간 soak:
   - E04 투사체
   - 복도 경계
   - joystick 이동 + 회피 중 HUD 가림
   - R3F/Rapier 안정화 규칙 위반 영향 확인
