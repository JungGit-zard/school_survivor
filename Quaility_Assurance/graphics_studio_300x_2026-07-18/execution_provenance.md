# Graphics Studio 전체 모델 300회 QA 실행 출처

최초 기록 시각: `2026-07-18T03:33:36+09:00`  
5173 listener 재확인 시각: `2026-07-18T03:36:53+09:00`

이 문서는 코드, 브라우저, Graphics Studio 상태를 변경하지 않고 Git, Windows 프로세스, 기존 실행 로그와 QA 파일을 읽어 작성한 실행 출처 기록이다.

## 1. 저장소와 Git 기준점

- 이번 실행에 허용된 브랜치: `zombie_only`
- 실행 시작 브랜치: `zombie_only`
- 현재 체크아웃 브랜치: `zombie_only`
- 실행 시작 HEAD: `88591bbbe7d656e16ff621f3994c5ed0c499577c`
- 현재 HEAD: `88591bbbe7d656e16ff621f3994c5ed0c499577c`
- 저장소 루트: `D:\JungSil\2.Minigame_project\school_survivor-integration`
- 실제 애플리케이션 작업 경로: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype`
- QA 산출물 경로: `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18`
- 병합 진행 상태: 없음

시작 HEAD와 현재 HEAD가 다르면 같은 실행 결과로 합치지 않는다. 이 기록 시점에는 두 값이 같다.

## 2. 현재 5173 서버와 Python 브랜치 가드

재확인 결과 같은 로컬 포트 번호에 주소가 다른 listener 두 개가 존재한다. 둘을 한 서버로 합쳐 기록하지 않는다.

### Listener A: QA 메타데이터에 기록된 서버

- 주소: `127.0.0.1:5173`
- PID: `32492`
- 프로세스: `node.exe`
- 시작 시각: `2026-07-18T03:25:31+09:00`
- 명령:

```text
"node" "D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\node_modules\.bin\\..\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort
```

- 직접 부모 PID: `27512`
- 직접 부모 프로세스: `cmd.exe`
- 직접 부모 명령:

```text
C:\Windows\system32\cmd.exe /d /s /c vite --host 127.0.0.1 --port 5173 --strictPort
```

부모 프로세스 계보:

```text
python.exe 34120
  -> cmd.exe 25496
    -> node.exe 16060 (npm-cli.js exec vite)
      -> cmd.exe 27512
        -> node.exe 32492 (Vite, 127.0.0.1:5173)
```

### Listener B: 재확인 중 발견된 별도 서버

- 주소: `[::]:5173`
- PID: `26672`
- 프로세스: `node.exe`
- 시작 시각: `2026-07-18T03:30:25+09:00`
- 명령:

```text
"node" "D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\node_modules\.bin\\..\vite\bin\vite.js"
```

- 직접 부모 PID: `25644`
- 직접 부모 프로세스: `cmd.exe`
- 직접 부모 명령:

```text
C:\Windows\system32\cmd.exe /d /s /c vite
```

부모 프로세스 계보:

```text
node.exe 20832 (npm run dev)
  -> cmd.exe 15064
    -> python.exe 17524
      -> cmd.exe 33148
        -> node.exe 32268 (npm-cli.js exec -- vite)
          -> cmd.exe 25644
            -> node.exe 26672 (Vite, [::]:5173)
```

### Python guard A

- PID: `34120`
- 프로세스: `python.exe`
- 시작 시각: `2026-07-18T03:25:29+09:00`
- 부모 PID: `27616`
- 부모 프로세스: 현재 프로세스 목록에서 종료되어 `미확인`
- 명령:

```text
"C:\Python314\python.exe" scripts/single_branch_guard.py run -- npm.cmd exec vite -- --host 127.0.0.1 --port 5173 --strictPort
```

### Python guard B

- PID: `17524`
- 프로세스: `python.exe`
- 시작 시각: `2026-07-18T03:30:23+09:00`
- 부모 PID: `15064`
- 부모 프로세스: `cmd.exe`
- 명령:

```text
python scripts/single_branch_guard.py run -- npm.cmd exec -- vite
```

### 로그 경로

- 두 가드가 실행한 저장소 경로: 각 가드의 상대 명령과 자식 Vite 절대경로를 통해 `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype`로 확인
- 두 가드 자체 stdout/stderr 파일 경로: `미확인`
- 두 가드 하위 Vite의 설정상 기본 런타임 로그 경로:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\playtest-logs\current-session.ndjson`
- 위 런타임 로그 파일의 현재 존재 여부: 없음. POST 기록이 아직 생성되지 않은 상태이므로 이 파일을 실행 성공 증거로 사용하지 않는다.
- 이번 300회 QA의 별도 진행 로그:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\progress.ndjson`

## 3. 현재 브라우저와 Studio 연결 정보

브라우저를 새로 조회하거나 조작하지 않고, 기존 실행 로그와 현재 QA 메타데이터에서 확인되는 값만 기록한다.

- 기록된 브라우저 세션 이름: `studio-300x`
- 기록된 브라우저 형태: 기존 headed window
- Studio 탭: `t1`
- Studio URL: `http://127.0.0.1:5173/graphics-studio`
- 이 명시적 IPv4 URL에 대응하는 listener: `127.0.0.1:5173`, PID `32492`
- Studio URL 최종 확인 시각: `2026-07-18T03:28:46+09:00`
- 게임 탭으로 기록된 탭: `t2`
- 게임 URL로 기록된 값: `http://localhost:5173/`
- 게임 탭의 현재 실시간 URL: `미확인`
- Studio의 `Game URL Connect` 입력값: 기존 확인 명령 출력에 값이 없어 `미확인`
- Studio와 게임 창 사이의 현재 메시지 연결 성공 여부: `미확인`
- 브라우저 PID, Chrome 프로필, CDP URL: `미확인`

`http://localhost:5173/`는 현재 QA 메타데이터에 기록된 게임 URL일 뿐, 이 문서 작성 과정에서 실시간 연결 성공을 다시 검증한 값이 아니다.
또한 `[::]:5173` PID `26672`가 별도로 존재하므로, `localhost` 게임 URL이 실제로 어느 listener에 도달했는지는 `미확인`이다.

## 4. 이번 실행에서 사용할 실제 UI 검증 방식

각 카탈로그 모델의 선택 가능한 각 파트에 대해 다음 순서를 실제 UI에서 반복한다.

1. Graphics Studio 카탈로그에서 모델 버튼을 클릭한다.
2. 캔버스에서 대상 파트를 더블클릭한다.
3. 대상 파트에 녹색 선택 표시가 나타났는지 확인한다.
4. 숫자 입력란의 원래 값을 읽어 회차 로그에 기록한다.
5. 같은 숫자 입력란에 원래 값과 다른 유효 숫자를 직접 입력한다.
6. 화면에서 대상 파트의 scale, position 또는 rotation 변화가 나타났는지 판정한다.
7. `Apply` 또는 `Reset`을 누르지 않고 같은 숫자 입력란에 기록해 둔 원래 값을 직접 다시 입력한다.
8. 화면에서 대상 파트가 원래 모습으로 복원됐는지 판정한다.
9. 원값, 변형값, 입력 후 값, 화면 변화 판정, 화면 복원 판정을 `progress.ndjson`의 해당 회차 기록으로 남긴다.

금지 사항:

- `Apply` 사용 금지
- `Reset` 사용 금지
- 새 스크린샷 촬영 금지
- source-string, mock DOM 또는 직접 Three.js 객체 조작 결과를 실제 UI 300회 결과로 대체 금지

## 5. 과거 중단 시도와 이번 실행의 분리

과거 중단 시도에서 확인되는 실제 변형·복원 증거는 다음 한 건뿐이다.

- 대상: `Zombie E04 / BoxGeometry`
- 변형 입력 확인값: `1.23`
- 원값 재입력 확인값: `1.00`
- 변형 증거:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\screenshots\zombie-e04-boxgeometry-mutated.png`
- 복원 증거:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\screenshots\zombie-e04-boxgeometry-restored.png`

이 한 건은 `incomplete_prior_attempt`이다. 300회 완료 결과가 아니며 이번 실행의 회차, Pass, Fail 합계에 포함하지 않는다.

기록 시점의 이번 실행 상태:

- 카탈로그 모델 수 메타데이터: `72`
- 이번 실행 완료 회차: `0`
- 이번 실행 Pass: `0`
- 이번 실행 Fail: `0`
- 300회 완료 결과: `0건`
- 상태: `in_progress`

과거 중단 시도의 이미지, 수치, 판정과 `2026-07-18T03:28:44+09:00`에 재개된 이번 실행 결과를 서로 합치지 않는다. 이번 실행 결과는 같은 run ID, 브랜치, 시작 HEAD와 저장소 루트를 가진 `progress.ndjson` 기록만 집계한다.

## 6. 산출물 목록과 용도

이번 실행의 정본 산출물:

- 실행 출처:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\execution_provenance.md`
- 회차별 기계 판독 로그:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\progress.ndjson`
- 사람용 진행·최종 보고:
  `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\report.md`

기존 스크린샷 폴더:

`D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\screenshots`

현재 보존된 기존 파일:

- `initial-studio.png`
- `initial-studio-annotated.png`
- `after-connect.png`
- `studio-connected.png`
- `player-center-dblclick.png`
- `zombie-e04-boxgeometry-mutated.png`
- `zombie-e04-boxgeometry-restored.png`

이 스크린샷들은 새로 촬영한 이번 실행 증거가 아니다. 특히 마지막 두 파일만 과거 중단 시도의 단 1회 E04 변형·복원 증거이며, 다른 파일을 300회 완료 증거로 사용하지 않는다.

## 7. 확인에 사용한 읽기 전용 근거

- `git rev-parse --show-toplevel`
- `git rev-parse HEAD`
- `git branch --show-current`
- `git status --short --branch`
- `git worktree list --porcelain`
- `Get-NetTCPConnection -State Listen -LocalPort 5173`
- `Get-CimInstance Win32_Process`
- `Get-ChildItem`과 `Get-Content`로 기존 QA 산출물 확인
- 현재 Codex 실행 로그의 기존 Studio URL 확인 결과

이 문서 작성 중 브라우저 제어, 스크린샷 촬영, 숫자 입력, 파트 선택, Apply, Reset, 빌드, 테스트, 커밋은 수행하지 않았다.
