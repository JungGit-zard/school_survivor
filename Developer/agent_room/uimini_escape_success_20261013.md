# 탈출 성공 선택 화면 구현

- Kanban `t_43c0aea9`, uimini Worker. 필수 precommand receipt `7c704a14ae52f24af955690438f473d48b25749a7b75816622cc6557f440b289`; matched domain `ui`, evidence keyword `hud`.
- `Planner/escape_success_continuous_run_20261011.md`대로 기존 cleared HUD를 탈출 성공 이미지·누적 점수·현재 스테이지 점수·사용자 선택 화면으로 연결했다.
- 기존 `Graphic_designer/쇼츠프로젝트_20261010/references/05_school_exit_finale.png`를 `src/assets/escape_success.png`로 그대로 복사하여 import했다. 새 그림이나 자산 대체를 만들지 않았다.
- 다음 스테이지는 `continueToNextStage()`만 호출한다. 다른 스테이지 선택과 로비에서 쉬기는 기존 로비 콜백을 호출한다. 최종 스테이지는 다음 버튼 없이 누적 점수를 표시한다.
- 보상·미션·해금·상점 기능은 접이식 상세에 보존하고, 랭킹은 보조 버튼으로 유지했다. 모바일 화면 안에서 스크롤 가능하며 선택 버튼 높이는 44px 이상이다.
- 실시간 점수 및 사망 결과에는 `continuousScoreBase`를 기존 점수식에 더한다. 한·영·일 기존 게임 번역 사전에 새 화면 문구를 추가했다.
- 격리 메모리 Firebase 시험만 사용했다. 실제 사용자 Firebase 값·인증·타이틀·퀘스트 스타일 변경 없음.

## uimini verification 2026-10-13

- `npm test -- src/components/HUD.escapeSuccess.test.jsx src/components/HUD.test.jsx -- --runInBand` → Test Files 2 passed, Tests 66 passed.
- `npm run build` → prebuild gates passed, studio-game sync tests 45 passed, production build succeeded, postbuild legacy/hosting asset gates passed. Existing large-chunk warnings only.
- Mobile Chromium visual smoke at `390x844` via `http://localhost:5173/game` → title `탈출 성공`, total score visible, actions `다음 스테이지 계속`/`다른 스테이지 선택`/`로비에서 쉬기`, action heights `54/47/47`, panel `366x660`, no horizontal overflow, panel `overflowY=auto`, image src includes `escape_success`.
- Screenshot evidence: `Quaility_Assurance/escape_success_mobile_390x844_20261013.png`.
