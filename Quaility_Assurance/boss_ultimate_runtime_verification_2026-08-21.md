# B02~B04 보스 필살기 런타임 검증 기록

- 작성: Balance QA
- 일자: 2026-08-21
- Kanban: `t_f499336c` — Boss ultimate runtime verification
- 범위: 기존 5173 서버를 유지한 읽기 전용 런타임 진입 시도와, 인증 차단 시의 안전한 비인증 경로 조사.

## 결론

**NO CLAIM — 실제 B02/B03/B04 전투·필살기·퀘스트 가방 런타임은 검증하지 못했다.** 미로그인 browser session에서 Title의 `게임 시작`을 한 번 눌렀고, Google OAuth 로그인 페이지로 이동했다. 지시대로 OAuth 입력·클릭은 하지 않고 즉시 종료했다.

## 관찰 근거

1. `npm run browser:reserve` 통과: `GAME_BROWSER_INSTANCES=1`, limit 3.
2. `http://localhost:5173/` Title은 정상 로드됐고, `Google 로그인`과 `게임 시작`을 표시했다. Vite 연결 로그 외 runtime console error는 관찰되지 않았다.
3. `게임 시작` 1회 뒤 `escape-zombie-school.firebaseapp.com` Google 로그인 화면(이메일 또는 휴대전화 입력)이 열렸다. OAuth 페이지에서는 상호작용하지 않았다.
4. browser를 닫았으며 5173 개발 서버는 종료·재시작하지 않았다.

## 정확한 차단 원인

공개 Title의 `handleStartClick`은 `authUser?.uid`가 없으면 `signInWithGoogle()`을 호출하고, 성공한 경우에만 lobby로 넘긴다. 현재 새 browser session에는 로그인 사용자가 없었으므로 Stage 2/3/4 카드, 보스 전투, 가방에 도달할 수 없었다.

## 안전한 비인증 경로 조사

- `ReadyGameApp.startGame(stageId)` 자체는 cloud progress hydration 실패/guest 상태에서도 메모리 기본 progress로 시작하도록 되어 있다.
- 그러나 public Title은 미로그인 상태에서 lobby 진입 전에 Google 로그인을 강제하므로, 코드 수정·개발자 치트·URL 우회 없이 그 경로에 도달하는 기존 공개 비인증 preview는 발견하지 못했다.
- `StageBossPreview`와 Admin preview는 전투 runtime/필살기 검증 경로가 아니며, Studio/Admin 접근이나 인증 우회는 이 QA 범위 밖이므로 사용하지 않았다.

## 제한

- Firebase data, localStorage, Studio, Title 설정, OAuth 및 5173을 변경하지 않았다.
- Google 로그인 이미 보유 세션이 제공되면, 그 세션만 사용하여 Stage 2→B02, Stage 3→B03, Stage 4→B04와 가방 표시를 다시 검증할 수 있다.

## 증거

- `Quaility_Assurance/evidence_boss_runtime_2026-08-21.png` — 최초 `127.0.0.1` 접근은 browser host policy가 localhost만 허용해 차단된 화면이다. 이 뒤 허용된 `localhost:5173`으로 재시도했다.
