# Orca CLI 스레드 확인 핸드오프 — 2026-08-22

## 목적

Hermes/Hana가 같은 Windows PC에서 실행 중인 Orca 앱 안의 Claude/Codex CLI 스레드를 확인하고, 다른 Hermes/Agent 쓰레드에서도 같은 방식으로 Orca 작업 내용을 이어서 파악할 수 있게 남긴 문서다.

## 결론 요약

- Orca 앱은 이 PC에서 실행 중이었다.
- Hermes 스킬 목록에는 `Orca CLI`라는 별도 스킬은 없었다.
- 대신 Orca가 자체적으로 CLI 터미널 기록과 체크포인트를 로컬에 저장하고 있어서, 화면 OCR보다 더 정확하게 로그 파일을 읽어 스레드 내용을 요약할 수 있었다.
- PowerShell + Win32 API + Clipboard/SendKeys로 Orca 안의 특정 Claude CLI 입력창에 직접 클릭/붙여넣기/Enter 전송이 가능함을 확인했다.
  - 테스트 대상: 오른쪽 `Zombie death voice SFX` Claude CLI 패널.
  - 결과: 입력과 전송은 됐지만 Claude session limit 때문에 응답은 실패했다.
  - 주의: PowerShell 5.1 스크립트 안에 한글 프롬프트를 직접 embed하면 화면에서 한글이 깨질 수 있다. 다음부터는 UTF-8 텍스트 파일에서 prompt를 읽어 Clipboard에 넣거나, 영어/ASCII 지시문으로 전송하는 편이 안전하다.
- 현재 확인한 주요 Orca/Claude CLI 스레드는 2개였다.
  1. `spawnCatchUp / 빈 경기장 스폰 보정`
  2. `Zombie death voice SFX / 좀비 사망음 사운드 개선`

## Orca 실행 상태

확인된 Orca 프로세스:

```text
C:\Users\admin\AppData\Local\Programs\orca\Orca.exe
MainWindowTitle: Orca
```

대표 프로세스 ID는 당시 `11456`이었다. 단, PID는 실행 때마다 바뀔 수 있으니 절대값으로 의존하지 말 것.

## 확인에 사용한 핵심 위치

### Orca 앱 데이터

```text
C:\Users\admin\AppData\Roaming\Orca
```

중요 하위 항목:

```text
C:\Users\admin\AppData\Roaming\Orca\terminal-history
C:\Users\admin\AppData\Roaming\Orca\profiles\local-default\orca-data.json
C:\Users\admin\AppData\Roaming\Orca\codex-runtime-home
C:\Users\admin\AppData\Roaming\Orca\claude-accounts
```

### CLI 터미널 기록

Orca 안에 붙은 CLI별 기록은 대략 다음 형태로 저장된다.

```text
C:\Users\admin\AppData\Roaming\Orca\terminal-history\<workspace-id>%3A%3A<encoded-project-path>%40%40<thread-id>\output.log
C:\Users\admin\AppData\Roaming\Orca\terminal-history\<workspace-id>%3A%3A<encoded-project-path>%40%40<thread-id>\checkpoint.json
C:\Users\admin\AppData\Roaming\Orca\terminal-history\<workspace-id>%3A%3A<encoded-project-path>%40%40<thread-id>\meta.json
```

이번 프로젝트의 경로는 인코딩되어 다음 문자열을 포함했다.

```text
school_survivor-integration
```

실제로 확인된 대표 스레드 디렉터리:

```text
C:\Users\admin\AppData\Roaming\Orca\terminal-history\2db22fcb-9725-4f06-a521-8a96648fae8e%3A%3AD%3A%2FJungSil%2F2.Minigame_project%2Fschool_survivor-integration%40%40f2a709c9
C:\Users\admin\AppData\Roaming\Orca\terminal-history\2db22fcb-9725-4f06-a521-8a96648fae8e%3A%3AD%3A%2FJungSil%2F2.Minigame_project%2Fschool_survivor-integration%40%40db95249d
C:\Users\admin\AppData\Roaming\Orca\terminal-history\2db22fcb-9725-4f06-a521-8a96648fae8e%3A%3AD%3A%2FJungSil%2F2.Minigame_project%2Fschool_survivor-integration%40%402d8edd4a
```

## 확인 절차

### 1. Orca 프로세스 확인

PowerShell 스크립트를 파일로 작성해 실행했다. Hermes terminal은 bash/MSYS를 거치므로 PowerShell은 `.ps1` 파일로 저장 후 실행하는 방식이 안전했다.

예시:

```powershell
Get-Process Orca | Select-Object Id,Path,MainWindowTitle,StartTime | Format-List
```

### 2. 화면 캡처로 Orca 창 확인

스크린샷 저장 경로 예:

```text
D:\JungSil\2.Minigame_project\school_survivor-integration\desktop_orca_cli_clear.png
```

스크린샷상 Orca 안에 CLI 패널 2개가 보였고, 왼쪽/오른쪽에 각각 Claude/Codex 계열 작업 스레드가 붙어 있었다.

### 3. Orca 로컬 artifact 확인

Orca 데이터 디렉터리에서 다음을 확인했다.

- `terminal-history`에 프로젝트별 CLI 기록 존재
- 각 스레드 폴더에 `output.log`, `checkpoint.json`, `meta.json` 존재
- `output.log`는 제어문자가 섞이지만 전체 transcript tail을 볼 수 있음
- `checkpoint.json`은 현재 화면/스크롤백 snapshot을 더 짧게 확인할 수 있음

### 4. 요약 대상 스레드 식별

이번에 확인한 `school_survivor-integration` 관련 terminal-history는 4개였고, 그중 현재 의미 있는 2개는 다음이었다.

#### A. `f2a709c9` — spawnCatchUp / 빈 경기장 스폰 보정

요약:

- 새 파일/수정 예정:
  - `src/lib/spawnCatchUp.js`
  - `src/lib/spawnCatchUp.test.js`
  - `src/components/Enemies.jsx`
- 핵심 지시:
  - offset에 임의 clamp 금지
  - 오버타임에서도 catch-up 계속 동작
  - 나중에 누가 폭주 버그로 오인해 clamp를 넣지 못하게 주석에 정본 기록
- 상태:
  - 구현 진행 중이었으나 백그라운드 에이전트 실패
  - 실패 이유: Claude session limit
  - 메시지: `You've hit your session limit · resets 9:10pm (Asia/Seoul)`

#### B. `2d8edd4a` — Zombie death voice SFX / 사운드 개선

요약:

- 핵심 문제:
  - 좀비 사망음이 동시재생 제한/쿨다운 때문에 씹힘
  - `POLYPHONY_COOLDOWN`이 `grunt 50ms`, `bellow 200ms`로 걸려 있음
  - 같은 프레임에 20마리가 죽으면 소리가 동시에 시작되어 군중감이 아니라 큰 소리 한 덩어리처럼 들림
- 제안:
  - 수십 ms 랜덤 지연으로 사망음 시간 분산
  - `Howler.masterGain` 뒤에 `DynamicsCompressorNode` 리미터 추가
  - 동시재생 제한/게이트 제거 또는 완화
  - `_activeCombatVoices` 같은 죽은 장부 제거
- 클리핑 근거:
  - 87개 에셋 중 18개 peak 1.000
  - N=6, gain=1.0에서도 클리핑률 91.3%
  - 현재 master가 0.5로 눌려 있으나 무제한 동시재생이면 0.5로도 부족할 수 있음
- 피치 서열:
  - `bellow < heavy < grunt < gurgle < shriek`
  - 변종을 많이 넣어도 타입별 음역 질서는 유지해야 함
- 우선순위:
  1. 제한 해제 + 리미터
  2. 변종 최대 살포 — 특히 grunt에 최다 배정
  3. 포맷 효율화 → 마틸다 → 주인공
- 상태:
  - 에이전트 `Zombie death voice SFX`가 Claude session limit으로 실패
  - `Auto-update failed: claude.exe in use`도 표시됨

#### C. `db95249d` — 완료된 무기 레벨업 순환 작업

요약:

- 커밋 완료:
  - `c53e1c5 feat: rotate level-up weapon choices fairly`
- 내용:
  - 신규 무기 선택지를 미노출 순서대로 4개씩 표시
  - 20종이 모두 가능하면 5회 동안 각 무기가 한 번씩 노출
  - 한 바퀴가 끝난 뒤 새 순환 시작
  - 기존 치비코→하나코, 커터칼→바이키티 보장 규칙 유지
  - 집중 테스트 107개 통과

## 재현용 Python 스크립트 위치

이번 세션에서 임시로 만든 검사/추출 스크립트:

```text
D:\JungSil\2.Minigame_project\school_survivor-integration\_inspect_orca_artifacts.ps1
D:\JungSil\2.Minigame_project\school_survivor-integration\_summarize_orca_terminal_logs.py
D:\JungSil\2.Minigame_project\school_survivor-integration\_inspect_orca_checkpoints.py
D:\JungSil\2.Minigame_project\school_survivor-integration\_extract_orca_sound_thread.py
```

다른 쓰레드에서는 위 스크립트를 참고하거나, 새로 간단히 만들어 `terminal-history`의 `output.log` tail과 `checkpoint.json`을 읽으면 된다.

## 주의사항

- `output.log`에는 ANSI 제어문자와 binary-like 제어문자가 섞인다. 정규식으로 제거하고 읽어야 한다.
- 인증 파일은 읽지 말 것.
  - 특히 `claude-accounts`, `auth.json`, `.credentials.json` 등은 민감정보일 수 있다.
- 사용자가 요청한 것은 스레드 작업 내용 요약이지 토큰/인증값 출력이 아니다.
- 화면 캡처는 현재 보이는 부분만 보여주므로, 가능한 경우 `terminal-history`를 직접 읽는 것이 더 정확하다.
- `checkpoint.json`은 현재 화면/스크롤백 상태 파악에 좋고, 긴 작업 흐름은 `output.log` tail이 더 낫다.

## 다음 쓰레드가 바로 할 일

1. 이 문서를 먼저 읽는다.
2. 사용자가 지정한 스레드가 사운드면 `2d8edd4a` terminal-history를 본다.
3. 사용자가 지정한 스레드가 스폰 보정이면 `f2a709c9` terminal-history를 본다.
4. 구현 지시를 내리기 전, 현재 git 상태와 실제 파일 변경사항을 반드시 확인한다.
5. Claude/Codex 세션 limit으로 멈춘 작업은 완료됐다고 단정하지 말고, 로그와 실제 diff를 비교한다.
