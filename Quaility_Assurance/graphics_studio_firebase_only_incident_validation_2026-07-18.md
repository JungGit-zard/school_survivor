# 그래픽 스타지오 Firebase 단일 원본 사고 시정 검증

- 작성일: 2026-07-18
- 연결 보고서: `Developer/graphics_studio_firebase_only_incident_report_2026-07-18.md`
- 판정: 운영 규칙 배포, 최초 원격 스냅샷 저장·재조회, 자동 검증과 빌드 통과

## 검증 기준

- 로그인 UI와 타이틀 기본 UI는 전체 차단하지 않아야 한다.
- Firebase 정상 hydrate 전 Studio 값에 의존하는 3D·로비·편집기 화면은 렌더되지 않아야 한다.
- Firebase 원격값 누락·손상·읽기 실패 시 로컬값이나 기본 모델로 대체하면 안 된다.
- Graphics Studio 계열 브라우저 로컬 저장 키의 읽기·쓰기·삭제·전체 초기화 시도는 치명적 오류가 되어야 한다.
- Studio 다섯 데이터셋의 영구 저장은 Firebase 경로만 사용해야 한다.
- 다른 창으로 Studio 데이터 payload를 직접 전달하면 안 되며, Firebase 재조회 신호만 보내야 한다.
- 실행 중인 5173 서버가 수정된 소스를 실제로 제공해야 한다.

## 실행 결과

관련 테스트 명령의 최종 결과:

- 핵심 Firebase·규칙·App: 3개 파일, 19개 테스트 통과
- Studio 관련 8개 테스트 파일 묶음: 종료 코드 0

프로덕션 빌드:

- 통과

서버 전달 검증:

- `http://localhost:5173/` HTTP 200 및 기존 Google 로그인·게임 시작 UI 확인.
- `http://localhost:5173/graphics-studio` HTTP 200 및 기존 Google 로그인·Firebase 로드 안내 확인.
- 전체 앱을 막던 치명적 오류 게이트가 제거된 것을 브라우저 본문으로 확인.

Firebase 운영 검증:

- Realtime Database 규칙 실제 배포 성공.
- 현재 승인 후보를 schema 1, revision 1로 원격 저장 성공.
- 원격 재조회 데이터셋 수: 그래픽 28, 효과음 0, 보스 미리보기 3, 데칼 0, 프랍 3.
- 원본과 원격 재조회 정규화 해시 일치: `1b890d1ef0b3`.
- 점이 포함된 Studio 파츠 키를 JSON 문자열 봉투로 무손실 왕복하는 테스트 통과.

## 회귀 방지 판정

- Studio Firebase hydrate 전 읽기·쓰기: 차단
- Studio 로컬 저장 읽기: 치명적 오류
- Studio 로컬 저장 쓰기: 치명적 오류
- Studio 로컬 저장 삭제: 치명적 오류
- 로컬 저장 전체 초기화: 치명적 오류
- 원격 누락 시 로컬 seed: 제거
- 원격 실패 시 로컬 fallback: 제거
- Firebase 성공 전 전체 앱 차단: 제거
- Firebase 성공 전 Studio 의존 화면 렌더: 차단
- 창 메시지 데이터 payload: 제거

## 최종 판정

승인 원본 복구, 운영 규칙 배포, 최초 원격 저장, 원격 재조회, 해시 일치, 로그인 UI 복구, 로컬 대체 경로 차단 순서가 완료됐다. 게임과 Graphics Studio는 최종 확인을 위해 `localhost:5173` 두 탭으로 열어 두었다.
