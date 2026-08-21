# Admin Operations Console Implementation Record

> 작성일: 2026-06-21  
> 역할: 개발 구현 기록  
> 상태: 구현 완료

## 구현 계획

- `src/lib/adminConfig.js`: 운영 설정 기본값, 정규화, 저장/로드/초기화 함수.
- `src/components/AdminPage.jsx`: `/admin`에서 보여줄 운영 콘솔 UI.
- `src/App.jsx`: `/admin` 경로일 때 게임 화면 대신 운영 콘솔 렌더링.
- `src/lib/stageConfig.js`: 스테이지 시간과 마일스톤 골드 배율 반영.
- `src/store/useGameStore.js`: 새 게임 시작 시 HP/속도 운영 설정 반영.
- `src/lib/rankingScorePolicy.js`: 시즌 점수 정책 반영.
- `src/components/UserRanking.jsx`: 시즌명과 보상 요약 표시.

## 검증 계획

- `adminConfig` 단위 테스트.
- `stageConfig` 운영 설정 반영 테스트.
- `rankingScorePolicy` 운영 설정 반영 테스트.
- `AdminPage` 렌더링/저장 테스트.
- 전체 테스트와 빌드.
- 브라우저에서 `/admin` 화면 조작 검증.

## 구현 결과

- `/admin` 경로에서 `AdminPage`를 별도 렌더링한다.
- `school_survivor:adminConfig` localStorage 키로 운영 설정을 저장한다.
- 게임 밸런스 탭:
  - Stage 1/2 생존 시간.
  - 시작 최대 HP 보너스.
  - 이동 속도 배율.
  - 생존 골드 배율.
- 랭킹/시즌 탭:
  - 시즌 ID/시즌명/상태/기간.
  - Stage 2 보너스 점수.
  - 클리어 보너스 점수.
  - TOP 1/TOP 10/TOP 100 보상 골드와 배지명.
- `stageConfig`가 운영 설정을 읽어 스테이지 시간과 마일스톤 골드 보상을 반영한다.
- `useGameStore`가 새 게임 시작 시 운영 설정의 HP/속도 값을 반영한다.
- `rankingScorePolicy`가 운영 설정의 점수 보너스를 반영한다.
- `UserRanking`이 현재 시즌명과 보상 요약을 표시한다.

## 검증 결과

- `npm test -- src/lib/adminConfig.test.js src/components/AdminPage.test.jsx src/lib/stageConfig.test.js src/lib/rankingScorePolicy.test.js src/components/UserRanking.test.jsx`: 통과.
- `npm test -- src/store/useGameStore.adminConfig.test.js src/components/UserRanking.test.jsx`: 통과.
- `npm test`: `Test Files 54 passed (54)`, `Tests 289 passed (289)`.
- `npm run build`: 성공. Vite의 500 kB 초과 chunk 경고는 기존 번들 크기 경고로 남아 있다.
- 브라우저 검증:
  - `http://127.0.0.1:5189/admin` 200 응답.
  - Stage 1 생존 시간 180초 저장 확인.
  - 랭킹/시즌 탭 전환 확인.
  - 시즌명 `방학 생존 시즌` 저장 확인.
  - 게임 타이틀의 `유저랭킹` 화면에서 시즌명과 보상 요약 표시 확인.

## 1280x720 레이아웃 조정

> 추가일: 2026-06-21

- `AdminPage`의 전체 높이를 `100vh`로 고정했다.
- 1280x720에서 헤더, 탭, 본문 2열이 한 화면 안에 들어오도록 상단 높이와 간격을 줄였다.
- 본문은 `minmax(0, 1fr) 318px` 2열로 조정해 입력 영역과 미리보기 패널을 안정적으로 유지한다.
- 랭킹/시즌 탭의 보상 3행까지 보이도록 입력 높이, 보상 행 패딩, 폼 간격을 줄였다.
- 검증:
  - `npm test -- src/components/AdminPage.test.jsx`: 통과.
  - `npm run build`: 성공.
  - 1280x720 Playwright/Chrome 검증에서 body/document scroll height가 720으로 유지됨.
  - 랭킹 탭 마지막 보상 배지 입력 하단 위치: 약 690px.

## 어드민 입력값 게임 반영 확인

> 추가일: 2026-06-21

- `AdminPage.test.jsx`에 어드민 입력 → 저장 → 게임 설정 반영 통합 테스트를 추가했다.
- 테스트 입력:
  - Stage 1 생존 시간 `180`
  - HP 보너스 `40`
  - 이동 속도 배율 `1.2`
  - 골드 배율 `2`
- 확인 결과:
  - `getStageConfig('stage1').durationSec === 180`
  - Stage 1 마일스톤 골드 `[2, 6, 8, 16]`
  - `resetGame('stage1')` 후 플레이어 `maxHp === 140`
  - `resetGame('stage1')` 후 플레이어 `speed === 3.6`
- 브라우저 실기동 검증:
  - 어드민에서 같은 값을 저장한 뒤 타이틀에서 게임 시작.
  - HUD 텍스트에서 `HP 140/140` 표시 확인.
