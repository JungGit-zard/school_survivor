# 탈출 성공 HUD 모바일 검증 — 2026-10-13

## 범위

- Kanban: `t_43c0aea9`
- 담당: `uimini`
- 검증 대상: 탈출 성공 HUD 이미지, 선택 버튼, 누적 점수 가독성, 모바일 화면 맞춤.

## 명령 검증

```text
npm test -- src/components/HUD.escapeSuccess.test.jsx src/components/HUD.test.jsx -- --runInBand
Test Files 2 passed (2)
Tests 66 passed (66)
```

```text
npm run build
prebuild branch/Firebase env/legacy B02/dialogue/studio sync gates passed
studio-game sync tests: Test Files 4 passed, Tests 45 passed
production build succeeded
postbuild legacy B02 artifact gate and hosting asset verification passed
```

## 모바일 Chromium 실측

- URL: `http://localhost:5173/game`
- Viewport: `390x844`, mobile/touch emulation
- 사용자 흐름: `로그인 없이 들어가기` → `입장하기` → 테스트용 store state로 Stage 1 clear 상태 진입
- 결과:
  - 제목: `탈출 성공`
  - 누적 점수 표시: `누적 점수 276`
  - 주요 선택 버튼: `다음 스테이지 계속`, `다른 스테이지 선택`, `로비에서 쉬기`
  - 버튼 높이: `54px`, `47px`, `47px`로 44px 이상
  - 패널 크기: `366x660`, viewport 내부
  - 가로 overflow: 없음
  - 패널 `overflowY`: `auto`
  - 이미지 src: `escape_success` 포함

## 증거 파일

- Screenshot: `Quaility_Assurance/escape_success_mobile_390x844_20261013.png`

## 판정

HUD 선택 화면은 모바일 390px 폭에서 가로 넘침 없이 표시되고, 주 선택 버튼은 터치 타깃 44px 이상을 만족한다. 실제 사용자 Firebase 값·인증·타이틀·퀘스트 스타일은 변경하지 않았다.
