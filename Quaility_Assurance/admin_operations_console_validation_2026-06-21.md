# Admin Operations Console Validation

> 작성일: 2026-06-21  
> 역할: QA 검증 기록  
> 상태: 검증 완료

## 검증 범위

- `/admin` 경로에서 운영 페이지가 열린다.
- 게임 밸런스 탭이 표시되고 저장할 수 있다.
- 랭킹/시즌 탭이 표시되고 저장할 수 있다.
- 저장된 설정이 `stageConfig`, `useGameStore`, `rankingScorePolicy`, `UserRanking`에 반영된다.
- 기본값 복원이 정상 동작한다.

## 자동 테스트 계획

- `adminConfig.test.js`
- `stageConfig.test.js`
- `rankingScorePolicy.test.js`
- `AdminPage.test.jsx`
- 전체 `npm test`
- `npm run build`

## 브라우저 검증 계획

- Vite dev server 실행.
- `/admin` 접속.
- 탭 전환.
- 수치 변경 후 저장.
- 새로고침 후 저장값 유지 확인.
- `/` 게임 화면 복귀 확인.

## 검증 결과

- RED 확인:
  - 신규 테스트 추가 직후 `adminConfig.js`, `AdminPage.jsx`, `getRankingScorePolicy`가 없어 실패하는 상태를 확인했다.
- 자동 테스트:
  - `npm test -- src/lib/adminConfig.test.js src/components/AdminPage.test.jsx src/lib/stageConfig.test.js src/lib/rankingScorePolicy.test.js src/components/UserRanking.test.jsx`: 통과.
  - `npm test -- src/store/useGameStore.adminConfig.test.js src/components/UserRanking.test.jsx`: 통과.
  - `npm test`: `Test Files 54 passed (54)`, `Tests 289 passed (289)`.
- 빌드:
  - `npm run build`: 성공.
  - Vite 500 kB 초과 chunk 경고는 기존 대형 자산/번들 경고로 확인했다.
- 브라우저 검증:
  - `http://127.0.0.1:5189/admin` 접속 성공.
  - 게임 밸런스 탭의 `Stage 1 생존 시간` 저장값이 localStorage에 `180`으로 반영됨.
  - 랭킹/시즌 탭에서 시즌명 `방학 생존 시즌` 저장 확인.
  - 타이틀의 `유저랭킹` 화면에서 `방학 생존 시즌`과 `1위 100G · TOP 10 50G · TOP 100 10G` 표시 확인.

## 스크린샷

- `Quaility_Assurance/admin_operations_console_2026-06-21.png`
- `Quaility_Assurance/admin_ranking_season_reflection_2026-06-21.png`
- `Quaility_Assurance/admin_1280x720_balance_2026-06-21.png`
- `Quaility_Assurance/admin_1280x720_ranking_2026-06-21.png`
- `Quaility_Assurance/admin_applies_to_game_hp_2026-06-21.png`

## 남은 리스크

- 현재 어드민 설정은 로컬 브라우저 저장소 기반이다. 공식 운영 서버, 관리자 권한, 시즌 보상 지급은 아직 구현 범위 밖이다.
- 공식 공개 랭킹은 서버 검증이 붙기 전까지 개인/테스트 랭킹으로 취급해야 한다.

## 1280x720 레이아웃 검증

> 추가일: 2026-06-21

- 기준 viewport: 1280x720.
- 밸런스 탭:
  - `body.scrollHeight = 720`
  - `documentElement.scrollHeight = 720`
  - `Stage 1 생존 시간` 입력 하단 위치 약 268px.
- 랭킹/시즌 탭:
  - `body.scrollHeight = 720`
  - `documentElement.scrollHeight = 720`
  - `클리어 보너스 점수` 입력 하단 위치 약 335px.
  - 마지막 보상 배지 입력 하단 위치 약 690px.
- 판정: 1280x720 한 화면 안에서 주요 운영 컨트롤과 미리보기 패널이 보인다.

## 어드민 입력값 게임 반영 검증

> 추가일: 2026-06-21

- `AdminPage.test.jsx`에 통합 검증을 추가했다.
- 검증 흐름:
  - 어드민 UI에서 Stage 1 생존 시간 `180`, HP 보너스 `40`, 이동 속도 배율 `1.2`, 골드 배율 `2`를 입력한다.
  - `설정 저장`을 누른다.
  - `getStageConfig('stage1').durationSec`가 `180`으로 바뀌는지 확인한다.
  - Stage 1 생존 마일스톤 골드가 `[2, 6, 8, 16]`으로 바뀌는지 확인한다.
  - `useGameStore.getState().resetGame('stage1')` 이후 플레이어 `maxHp`가 `140`, `speed`가 `3.6`으로 바뀌는지 확인한다.
- 판정: 어드민 입력값은 저장소에만 머무르지 않고 실제 게임 스테이지 설정과 새 게임 시작 플레이어 능력치에 반영된다.

### 브라우저 실기동 확인

- 어드민에서 Stage 1 생존 시간 `180`, HP 보너스 `40`, 이동 속도 배율 `1.2`, 골드 배율 `2` 저장.
- 타이틀에서 닉네임 입력 후 Stage 1 게임 시작.
- HUD 텍스트 샘플:

```text
Stage 1
00:02
Lv.1
HP
140/140
```

- 판정: 어드민 입력값의 HP 보너스가 실제 게임 HUD에 반영됨.
