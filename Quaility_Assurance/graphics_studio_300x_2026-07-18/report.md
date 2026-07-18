# Graphics Studio 전체 모델 파츠 300회 UI 복원 QA

## 실행 메타데이터

- 상태: 진행 중
- Git 브랜치: `zombie_only`
- 시작 HEAD SHA: `88591bbbe7d656e16ff621f3994c5ed0c499577c`
- 종료 HEAD SHA: 진행 중
- 저장소 루트: `D:\JungSil\2.Minigame_project\school_survivor-integration`
- Studio URL: `http://127.0.0.1:5173/graphics-studio`
- Game URL: `http://localhost:5173/`
- 브라우저: 기존 headed `agent-browser` 세션 `studio-300x`, Studio `t1`, Game `t2`
- 서버 PID: `32492`
- 서버 시작 명령: `"node" "D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\node_modules\.bin\\..\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort`
- 재개 시작 시각(KST): `2026-07-18T03:28:44+09:00`
- 종료 시각(KST): 진행 중
- 로그 절대경로: `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\progress.ndjson`
- 기존 스크린샷 폴더: `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\graphics_studio_300x_2026-07-18\screenshots`

## 범위와 현재 집계

- Studio Graphics 탭 등록 모델: 72개
- 선택 가능한 파츠: 집계 진행 중
- 총 예정 회차: 파츠 수 × 300
- 실제 실행 회차: 0
- Pass / Fail: 0 / 0
- 완료 여부: 미완료

## 실제 UI 조작 순서

1. Studio의 모델 버튼을 실제 클릭한다.
2. 캔버스에서 대상 파츠를 실제 더블클릭한다.
3. `Part Focus`와 녹색 선택 표시 상태를 확인한다.
4. 노출된 숫자 입력란의 원값을 읽어 기록한다.
5. 같은 입력란에 다른 유효 숫자를 직접 `fill`한다.
6. 변형 상태를 화면에서 판정한다.
7. `Apply`와 `Reset`을 누르지 않고 같은 입력란에 원값을 직접 다시 `fill`한다.
8. 복원 상태를 화면에서 판정하고 NDJSON 한 줄을 추가한다.

## 금지 버튼 사용

- Apply 사용 횟수: 0
- Reset 사용 횟수: 0

## 중단·재개 이력

- 최초 시도에서 `Zombie E04 / BoxGeometry` 1회 변형·복원을 수행했으나, 이후 사용자가 실행 조건을 갱신하여 중단되었다.
- 해당 기록은 `incomplete_prior_attempt`로 분류하며 새 300회 실행 횟수에 포함하지 않는다.
- `2026-07-18T03:28:44+09:00`부터 `zombie_only` 브랜치와 5173 서버를 재확인하고 재개했다.
- 재개 후 사용자가 스크린샷 촬영을 금지했다. 기존 이미지는 삭제하지 않았고 새 증거로 사용하지 않는다.

## 실패 재현

- 현재까지 없음. 완료 전 성공으로 단정하지 않는다.
