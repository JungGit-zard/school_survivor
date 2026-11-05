# 게임 전체 디버깅 패스 — 2026-11-06 (Advisor [3d_work] + threemini/uimini/levelmini/balanceqa)

기준: origin/zombie_only 4abf5c0e에서 QA, 148b82ac 위에서 수정. 브라우저는 agent-browser(dev localhost:5174, 게스트). 테스트는 vitest 한 파일씩.

## 정적 검사
- prebuild 게이트 3종(legacy B02, dialogue store 456 ID, studio-game sync) 통과, branch guard ok.
- vitest 전수 418 파일 / 4498 passed / 0 failed (4abf5c0e). 수정 후 변경 영역 15 파일 재실행 전부 통과.

## 런타임 QA 결과 (수정 전 4abf5c0e)
| 심각도 | 항목 | 처리 |
|---|---|---|
| 치명 | E46~E60·E08 몸체 미표시(InstancedMesh 파트 스케일 0; `STUDIO_TUNED_TYPE_CODES` 누락) | 0f `220bfdb2`가 수정. 148b82ac에서 재검증 PASS(S4 E58·S5 E53 자연 스폰, 15종+E08+E07 오버플로 24/24, 0 스케일 0개) |
| 중간 | 게스트 자판기 팝업이 'available'로 열리지만 store가 `progressUnavailable`로 거절 → 일시정지 상태 고착 | `StageVendingPrompt.jsx` 게스트 'loginRequired' 힌트만, 닫기 버튼 |
| 중간 | 조사 대화 전역 쿨다운 없음(S4 4초 안 3회 일시정지) | `StudentDialogueTrigger.jsx` 8초 전역 쿨다운(게임 시간), 플래그 미소모, 보장 보상 대상(사물함)은 예외(balanceqa 지적 반영) |
| 중간 | 844×390 로비 가로 밀림(설정 모달 잘림, 닉네임 사라짐) | `Lobby.jsx` overflow clip + 가로폰 헤더 2줄 |
| 중간 | 844×390 인트로 대사 박스 폭 50px(9줄) | `HUD.jsx` 좁은 컬럼에서 대사가 초상 아래로 |
| 중간 | 설정 모달 포커스 미진입·Tab 이탈 | `LobbySettingsModal.jsx` 포커스 트랩 |
| 중간 | 랜딩 언어가 게임으로 미전달, "홈페이지로"에 lang 없음 | `/game?lang=`·첫 로드 1회 적용(ko/en/ja)·`/landing?lang=` |
| 중간 | 랜딩 푸터 법적 링크 없음 | `/privacy.html`·`/terms.html` 6개 언어 |
| 경미 | 인트로 초상 얼굴 우하단 치우침 | transform-origin 100% 100%, object-position center(0f 합의) |

## 설계대로 / 보류 (버그 아님 또는 Terry 판단 필요)
- 랭킹 All-time 766 vs Weekly 361: 버킷별 best-only, 리셋 주기 독립(`firebaseRanking.js:287`) — 설계대로.
- 로비 노출 S1~S4(`VISIBLE_STAGE_IDS`), S5는 정상 경로 진입 불가 → S5 스폰(b2c8ec88, 7c630d42)은 현재 플레이어가 못 봄. 정책 확인 필요.
- 로비 ≡ 메뉴 placeholder "메뉴 항목 준비 중" 한국어 하드코딩 — Terry 지정 대기 중(의도).
- 로비 캔버스 5개 + 게임 2개, 전환마다 WebGL Context Lost 4~5회 — 모바일 컨텍스트 한도 리스크(최적화 후보).
- 대량 스폰 순간 FPS 31~46 일시 하락(headless 데스크톱) 후 즉시 60 복귀.
- 경미 UI: 세그먼트 버튼 34px·슬라이더 36px(44px 미만), 타이틀 "Contact us/お問い合わせ" 2줄(언어 버튼 배치와 연동 필요), 잠긴 카드 자물쇠 대비, 미션 문구 내부 ID 노출, 게스트 Claim 버튼 활성, 무기 배지 4/18 vs 목록 21, 상점 "View unlock condition" 동명 14개, "My runs" 배지 클릭 불가.
- 쿨다운 미확인 1건: levelmini 브라우저 확인에서 판 시작 직후 2.4~2.9초에 들른 소품 2개가 쿨다운과 무관하게 열리지 않음(순간이동 위치 덮어쓰기 추정, 미확증).

## balanceqa acceptance
ACCEPT_WITH_NOTES. S1 게스트 자판기 접근 시 일시정지 없음·골드 불변 확인, S4 강제 진입 보행에서 조사 대화 간격 8.0/11.1/13.2초(연속 멈춤 재현 안 됨). 경미 메모: 강제 리셋 직후 대화 1회 추가 의심(일반 진입 재현 안 됨), 로그인 후 진행도 로드 전 팝업은 기존 동작(닫기 버튼으로 탈출 가능), `/privacy.html`·`/terms.html`은 dev에선 SPA 폴백(배포 시 hosting/에서 복사).

## 부작용
- QA 중 게스트 런 종료로 실제 랭킹에 "생존자-5oFMH3" 8pts 1건 등록됨(삭제는 Terry 결정).

## 증거
스크래치패드 `qa_play/`, `qa_ui/`, `qa_verify/`, `fulltest/results.tsv` (세션 c13da572).
