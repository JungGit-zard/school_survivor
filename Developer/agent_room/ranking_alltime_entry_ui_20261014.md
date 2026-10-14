# 무제한 누적 랭킹 UI와 진입 등록

- Kanban: coordinator-owned `t_75f70424`. uimini precommand `ranking guest entry`, receipt `aa917e9a4c0cc845c294e95607125db709d7d2025abe0f76b04a858f8b83625d`. 공통 정책과 UI 문서 적용.
- 통합 랭킹 기본 창은 `allTime`. 일일/주간과 함께 3열, 최소 높이 44px. 스테이지 랭킹은 일일 기본을 유지하고 allTime 구독과 문구 추가. allTime에서 시즌 보상과 시즌 최고점 문구를 숨긴다.
- 연속 플레이 누적 최고점을 보존하며 별도 게임의 점수를 합산하지 않는다고 ko/en/ja에서 안내한다. configured 클라우드 대기 중 로컬 기록을 가짜 순위로 섞지 않는다. 진행도 미준비 게스트도 랭킹 화면을 표시하며 계정 진행도 준비 시 부가 통계를 다시 읽는다.
- 실제 resetGame 진입 시 score/stageScore/timeMs/globalTimeMs 모두 0으로 비동기 등록한다. 종료·체크포인트·재시도는 별도 게스트 식별 helper를 사용한다. 계정 진행도 준비를 랭킹 제출 조건으로 사용하지 않는다. gameKey와 pending 객체 확인으로 늦은 응답이 새 제출 상태를 덮지 않는다.
- UID와 명시적 유한 비음수 score/timeMs가 있는 0점 행을 표시한다. 누락·잘못된 0초 기록은 계속 제외한다.
- 검증: npm pretest gates 통과. UserRanking/StageRanking/userRanking/i18nCoverage/useGameStore/rankingEntry/escapeSuccess 7파일 91 tests 통과, 게스트 checkpoint/end 검사 추가 후 rankingEntry 6 tests 통과(최종 고유 92 tests). npm 갱신 notice stderr 때문에 PowerShell wrapper는 exit 1을 보고했으나 Vitest 실패는 0. git diff --check 통과.
- 실제 사용자 Firebase 데이터는 읽거나 쓰지 않았다. 단위 테스트의 가짜 제출/격리 메모리만 사용했다. 실제 인증/배포/커밋은 수행하지 않았다. Firebase 랭킹·규칙과 guest helper는 별도 작업자 소유다.

## 추가 범위: 앱 최초 진입과 게스트 닉네임

- ReadyGameApp 최초 표시 시 시작 버튼·로그인·진행도와 무관하게 0점을 제출한다. mount 내 같은 identity 재렌더는 중복 제출하지 않고 새 Google UID는 별도로 등록한다. 실제 게임 resetGame 등록도 유지한다. 타이틀 프레젠테이션 변경 없음.
- Lobby와 설정은 Firebase helper에서 확인한 게스트 닉네임을 표시한다. 게스트 이름 편집은 Google/계정 진행도 준비를 요구하지 않는다. 2..12자 기존 검증 후 비동기 저장하며 저장 중 중복 제출·닫기·로그아웃을 막고 실패 시 입력과 오류를 유지한다. Google 계정은 기존 Firebase 닉네임/프로필을 읽으며 게스트 정보 이전은 구현하지 않았다.
- 최종 최소 검증: `ReadyGameApp.test.jsx`, `LobbySettingsModal.test.jsx`에서 `registers zero immediately|edits a guest nickname` 정규식으로 신규 3 tests 통과(exit 0). 자동닉 helper와 제출은 mock. 별도 최소 로비 4 tests 통과. 기존 10,000회 로비 반복 검사는 중단했고 완료로 계산하지 않았다.
- 검증 제한/정정: 추가 범위 첫 테스트 실행에서 기존 Lobby guest 테스트에 새 helper mock이 누락되어 실제 게스트 Firebase 경로 호출 가능성을 발견했다. 프로세스를 중단하고 helper mock을 명시한 후 위 최소 검사를 수행했다. 앞선 실행의 원격 요청 성공 여부는 이 작업자가 확인하지 못했으므로 **이 추가 작업 전체에 대한 원격 데이터 무변경을 단정하지 않는다**. Advisor에게 보고했으며 원격 기준 비교는 Advisor 소유다. 실제 Google 로그인 검증/배포/커밋/푸시는 수행하지 않았다.
