# 반복 명령창 조사 — 2026-10-18

포스팅 관련 별도 관찰: 18:00 회차는 `FacebookNative.ps1`의 `Expected one visible Facebook Chrome window; found 2` 오류로 중단되었다. 이는 CMD 반복 실행 경로와 별도 문제다. 지난 회차 재시도나 브라우저 조작은 하지 않았다.

- Kanban: `t_c66448c6`.
- 메인 관측: 표시된 Windows Terminal 창 HWND `44960036`, PID `8920`와 Gateway CMD 실행이 함께 있었다. 이 창과 Gateway의 연결은 당시 유일한 표시 터미널이라는 상관관계이며, 해당 Terminal HWND 자체를 CMD PID에 직접 연결한 증명은 아니다.
- 추가 직접 연결: `gateway-console-readonly-probe.json`에서 메인이 읽기 전용 `AttachConsole(5568)` 후 `GetConsoleWindow()`로 HWND `6753350`을 얻었고, 콘솔 프로세스 목록에 CMD PID `5568`이 포함됐다. 이는 별도 창 열거에서 확인한 `PseudoConsoleWindow` HWND `6753350`과 정확히 일치한다. CMD의 부모는 Task Scheduler 서비스 PID `960`이며 실행 대상은 `Hermes_Gateway.cmd`였다. 이 연결 증거는 메인이 수집했고, 작업자는 JSON을 직접 읽어 확인했다. 콘솔 입력·서비스 중단 없이 조회 후 분리했다.
- 읽기 확인: `Hermes_Gateway`와 매분 `Hermes_Gateway_Watchdog` 작업은 `.cmd` 파일을 직접 실행한다. `Hermes_Gateway_HourlyRestart`는 `-WindowStyle Hidden` 없는 PowerShell을 실행한다. 따라서 서비스 명령의 창 표시를 막는 실행 계층이 없다.
- Orca Codex 훅은 도구 호출마다 실행되지만 실제 보이는 창과 연결한 증거가 없어 원인으로 확정하지 않았고 수정하지 않았다.
- WMI 프로세스 시작 추적은 Access Denied로 실패했다. 빈 배열 파일이 있더라도 성공한 동적 추적 증거로 취급하지 않는다.

## 준비한 최소 변경

`Hermes_Gateway_HiddenRun.vbs`는 기존 CMD 명령을 `WScript.Shell.Run(..., 0, True)`로 숨김 실행하고 자식 종료 코드를 그대로 반환한다. 무해한 별도 fixture가 marker를 생성한 뒤 종료 코드 7을 반환한 것을 확인했다. 실제 Gateway·Watchdog 작업은 테스트로 시작하지 않았다. 표시 창 부재를 계측한 검증은 아직 없다.

`Apply-HermesHiddenTaskActions.ps1`는 관리자 여부를 먼저 검사하고, 정확히 지정한 세 작업의 Actions만 변경한다. XML·원본 스크립트 백업, 원본 바이트 해시, 작업 실행 대상 확인, Actions 재읽기, trigger/principal/settings/Enabled 보존 검증을 포함한다. UAC 요청·자동 권한 상승·서비스 종료·작업 즉시 실행·게시 기능 호출은 없다.

## 실제 적용 결과와 제한

일반 세션에서 첫 `Set-ScheduledTask -TaskName Hermes_Gateway -Action ...` 호출이 `Access is denied`, HRESULT `0x80070005`로 거부됐다. 변경된 작업 Actions는 0개다. 이후 세 작업의 Actions/Settings/Principals/Triggers가 초기 백업과 같음을 `tasks_unchanged_after_denial.json`에 기록했다. 기존 서비스는 계속 실행한다.

백업: `C:/Users/admin/AppData/Local/hermes/gateway-service/task-backups/20261018-184008-cmdflash`.

현재 문제는 수정 완료가 아니다. 관리자 세션에서 검토된 적용 스크립트를 실행하고, 다음 정상 예약 실행 때 실제 표시 창이 생기지 않는지 확인해야 한다. 관리자가 적용한 뒤에도 이미 실행 중이던 기존 표시 창은 자동으로 닫지 않는다.

추가 관찰: `hermes_cli/gateway_windows.py`의 `_install_scheduled_task`(389행)는 작업을 삭제·재생성하며 `.cmd`를 `/TR`에 직접 넣는다. 향후 서비스 재설치가 숨김 Actions를 덮어쓸 수 있다. 설치기는 이번 범위에서 수정하지 않았다.
