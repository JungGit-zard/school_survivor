# 게임 개발 서버 수동 실행 방법

대상 앱: `Developer/r3f_prototype` (Vite). 서버 주소는 항상 **`http://localhost:5173/`** 이어야 한다(타이틀 BGM 자동재생 정책이 이 포트에 묶여 있음).

## 기본 실행 (권장)

PowerShell 또는 터미널에서:

```powershell
cd D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype
npm run browser:reserve   # 브라우저 인스턴스 슬롯 예약(프로젝트 규칙, 상한 3)
npm run dev               # 브랜치 가드 통과 후 Vite 개발 서버 시작
```

정상 출력 예:

```text
VITE v8.1.1  ready in 3xx ms
➜  Local:   http://localhost:5173/
```

- 게임: 브라우저에서 `http://localhost:5173/`
- 그래픽 스튜디오: `http://localhost:5173/graphics-studio` (구글 로그인 필요)
- 관리 도구: `http://localhost:5173/admin` (마스터 계정만)
- 서버 종료: 터미널에서 `Ctrl + C`

## 동작 원리 (참고)

`npm run dev` = `python scripts/single_branch_guard.py run -- npm.cmd exec -- vite`

- **브랜치 가드**가 붙어 있다: 시작 시 현재 브랜치가 허용 브랜치(`zombie_only`)인지 확인하고, **실행 중 git HEAD가 바뀌면 서버를 자동 종료**한다. 커밋/리셋/브랜치 전환을 하면 서버가 꺼지는 이유가 이것이다 — 그럴 땐 다시 `npm run dev`.
- `browser:reserve`도 내부에서 `branch:check`를 먼저 돌린다.

## "Port 5173 is already in use" 가 뜰 때

**먼저 이미 서버가 살아있는지 확인한다. 무작정 죽이지 말 것.**

```powershell
# 응답하면 서버는 정상 가동 중 → 그냥 브라우저로 http://localhost:5173/ 접속하면 된다.
(Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 6).StatusCode
```

- `200`이 나오면 서버는 멀쩡하다. 새로 띄울 필요 없음.
- 실제 사례: `npm run dev`가 실패 코드로 끝나도, 브랜치 가드 래퍼(python)만 죽고 **Vite 본체는 살아남아 계속 서빙**하는 경우가 있다(예: 메모리 스파이크 시 `WinError 1455 페이징 파일 부족`). 이때 서버는 정상이며, 가드가 빠졌으므로 git HEAD가 바뀌어도 종료되지 않는다.
- 응답이 없는데 포트만 잡혀 있으면 아래 절차로 점유 프로세스를 정리한다.

## 포트가 5173이 아닐 때

다른 프로세스가 5173을 점유하면 Vite가 5174 등으로 밀린다. 그러면 BGM 자동재생 정책이 깨진다. 해결:

```powershell
# 5173 점유 프로세스 확인
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object {
  Get-Process -Id $_.OwningProcess | Select-Object Id, ProcessName
}
# 필요 시 해당 node 프로세스 종료 후 다시 npm run dev
```

## 브랜치 가드 없이 순수 Vite로 띄우기 (임시/디버그용)

커밋 작업 중 가드가 서버를 자꾸 내려서 방해될 때만 사용(정식 경로 아님):

```powershell
cd D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype
npx vite --port 5173
```

- 브랜치 가드를 건너뛰므로 HEAD가 바뀌어도 서버가 유지된다.
- 단, 프로젝트 규칙상 정식 실행은 `npm run dev`다. 임시로만 쓰고 평소엔 `npm run dev`를 쓴다.

## 프로덕션 빌드 미리보기 (선택)

개발 서버가 아니라 실제 빌드 결과를 확인하려면:

```powershell
npm run build     # dist/ 생성 (+ 레거시 B02 아티팩트 게이트 검사)
npm run preview   # 빌드 결과를 로컬 서버로 서빙
```
