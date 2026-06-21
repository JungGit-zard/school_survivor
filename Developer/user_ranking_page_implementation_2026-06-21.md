# 유저랭킹 페이지 구현 기록 - 2026-06-21

## 구현 요약

- `App.jsx`에 `ranking` 화면 상태를 추가했다.
- `TitleScreen.jsx`에 `유저랭킹` 버튼과 `onOpenRanking` 콜백을 추가했다.
- `UserRanking.jsx`를 추가해 1위부터 100위까지의 랭킹 행을 표시한다.
- `userRanking.js`를 추가해 랭킹 정렬, 100개 슬롯 보정, 생존 시간 표시를 분리했다.

## 데이터 기준

현재 공개 경쟁 서버 랭킹은 구현하지 않았다.
이유는 현재 저장 구조가 브라우저 클라이언트의 로컬 진행도를 Firebase 개인 경로에 저장하는 방식이라, 공개 경쟁 점수로 바로 쓰기에는 조작 위험이 있기 때문이다.

이번 구현은 다음 단계로 온라인 랭킹을 붙이기 쉽도록 표시 유틸과 화면을 분리했다.

## 주요 파일

- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/UserRanking.jsx`
- `Developer/r3f_prototype/src/lib/userRanking.js`
- `Developer/r3f_prototype/src/lib/userRanking.test.js`
- `Developer/r3f_prototype/src/components/UserRanking.test.jsx`

## 검증

- 랭킹 유틸/화면/타이틀 관련 테스트 통과.
- Vite 프로덕션 빌드 통과.
- Playwright + 로컬 Chrome으로 타이틀 버튼과 랭킹 100행 렌더링을 확인했다.
