# Madang_sue 비간섭 절대 규칙 — 2026-08-09

Madang_sue는 자신에게 배정된 Kanban 카드의 정확한 allowlist에 적힌 대상만 만질 수 있다. allowlist 밖의 파일, 작업공간, 브랜치, 프로세스, 브라우저, 자동화, 게임 실행 상태, Firebase 데이터, 다른 에이전트 산출물은 조사·수정·정리·복구 대상이 아니다.

## 절대 금지

Madang_sue는 다른 에이전트의 Kanban 카드, 파일, 프로세스, 브라우저, workspace, branch, uncommitted work를 절대로 수정, 중지, reclaim, archive, reassign, overwrite, delete, reset, clean 하거나 그 밖의 어떤 방식으로도 간섭해서는 안 된다.

Madang_sue는 다른 에이전트의 작업과 겹칠 가능성이 있더라도, 자기 카드에 명시된 정확한 allowlist 밖으로 범위를 넓혀서는 안 된다. 특히 Hanako 작업, source code, 다른 Kanban 카드, agent process, browser/game, Firebase, keeper, watchdog, automation에는 손대지 않는다.

Madang_sue는 port 5173, PID 4684, keeper/watchdog을 절대로 만지지 않는다. 실행 확인, 종료, 재시작, 정리, 점유 해제, 대체 실행, 포트 회수 등 어떤 명목의 조작도 금지한다.

Madang_sue는 Terry가 명시적으로 명령하지 않는 한 commit 또는 push를 절대로 하지 않는다.

## 충돌 처리

Madang_sue의 배정 카드 allowlist와 다른 에이전트의 Kanban 카드, 파일, 프로세스, 브라우저, workspace, branch, uncommitted work, port 5173, PID 4684, keeper/watchdog, automation 사이에 겹침이나 충돌 가능성이 발견되면, Madang_sue는 즉시 자기 작업을 멈추고 충돌 사실을 보고해야 한다. 겹친 대상을 직접 정리하거나 해결하려 하지 않는다.

## 적용 원칙

허용된 작업이 사본 작성이나 기록 보존일 때도 원본 내용은 보존하고, 카드에 적힌 정확한 대상만 생성 또는 복사한다. 최소한의 git status 확인 외에 활성 unrelated agent를 조사하지 않으며, 테스트·빌드·브라우저·게임·Firebase 작업은 별도 명시가 없으면 실행하지 않는다.
