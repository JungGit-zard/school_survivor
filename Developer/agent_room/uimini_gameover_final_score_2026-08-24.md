# 게임오버 팝업 최종 점수 표기 (uimini, 2026-08-24)

지시: "게임오버 팝업의 생존시간과 획득골드 사이에 최종점수를 크고굵게 써 넣어"

## 1. 점수 인자를 랭킹 제출부와 어떻게 일치시켰나

랭킹 제출 경로는 `src/store/useGameStore.js`다.

- `useGameStore.js:567` — `const runSurvivalSeconds = Math.floor(elapsedMs / 1000)`
- `useGameStore.js:647` — `const policy = getRankingScorePolicy()`
- `useGameStore.js:657` — `getRankingScore({ stageId: s.currentStageId, survivalSeconds: runSurvivalSeconds, cleared, bossBonus }, policy)`

HUD에는 이미 같은 정본을 쓰는 실시간 점수가 있다.

- `src/components/HUD.jsx:712` — `elapsed: s.elapsedMs`
- `HUD.jsx:759` — `getRankingScore({ stageId: currentStageId, survivalSeconds: Math.floor(elapsed / 1000), cleared: false })`

즉 `liveScore`의 인자 3종이 제출부와 글자 그대로 같다.
`stageId = currentStageId`, `survivalSeconds = Math.floor(elapsedMs / 1000)`,
policy는 양쪽 다 인자 없는 `getRankingScorePolicy()`(HUD는 기본값 인자로 호출).
게임오버 phase는 `cleared === false`라 제출부의 `bossBonus`는 `getRankingScore` 내부에서
`cleared ? bossBonus : 0`으로 잘려 나가므로 값에 영향이 없다.

따라서 **점수식을 새로 만들지 않고 기존 `liveScore`를 그대로 결과창에 재사용했다.**
계산이 한 벌뿐이라 결과창과 랭킹보드가 구조적으로 갈릴 수 없다
(`src/lib/xpCurve.js` 상단 주석이 경고하는 3중 복제 사고의 재발 방지).

검증은 `getRankingScore`를 테스트에서 제출부와 같은 인자로 직접 불러
화면 텍스트와 대조하는 방식이다(`HUD.test.jsx` — 아래 4번).

## 2. 폰트 크기·굵기 결정 근거

`styles.gameoverFinalScore` (HUD.jsx styles):

| 항목 | 값 | 근거 |
|---|---|---|
| fontSize | 22 | 생존 시간/획득 골드 줄은 fontSize 미지정(본문 상속, 약 16). 제목 `modalTitle`은 26. 22는 본문보다 확실히 크고 제목보다는 작아 "GAME OVER"와 경쟁하지 않는다. |
| fontWeight | `uiType.weightHeavy` (1000) | 프로젝트 최대 굵기. `modalTitle`, `liveScoreValue`와 같은 값. |
| fontFamily | `uiType.numeric` | HUD 실시간 점수(`liveScoreValue`)와 같은 숫자 서체 — 같은 수치를 같은 글꼴로 읽게 한다. |
| color | `uiPalette.paperLight` (#fff8e8) | 생존 #ccc, 골드 #ffd040, 제목 #ff4060 위에 네 번째 색을 얹지 않고, 최고 명도로 시선을 가져간다. |
| lineHeight 1.15 / `wordBreak: keep-all` | 자릿수 폭발(무한모드는 점수 상한 없음) 시 잘라내지 않고 줄바꿈으로 흘린다. HUD 실시간 점수는 ellipsis지만 결과창에서 점수 truncation은 치명적이라 정책을 반대로 잡았다. |

### 세로 밀도 보정

모달은 이미 세로로 길다(미션 요약 + 버튼 4개). `styles.overlay`는 flex 중앙정렬이고
스크롤이 없어 컨텐츠가 길면 화면 밖으로 밀린다(기존 구조). 새 줄이 늘리는 높이를 상쇄했다.

- `modalTitle` marginBottom 24 → 14 (게임오버 블록에서만 로컬 오버라이드, 클리어 결과창은 24 유지): -10px
- 생존 시간 줄 marginBottom 8 → 2: -6px
- 최종 점수 줄 22 * 1.15 + margin 8: +33.3px

순증 **약 +17px**. 마틸다 사망 대사(`gameoverDeathLine`)는 `margin: '-12px 0 12px'`로
제목 여백 24를 당겨 쓰고 있었으므로 `-2px 0 12px`로 함께 조정해 실제 간격 12px를 유지했다.

## 3. i18n

추가 키: **`hud.finalScore`** (플레이스홀더 `{score}`)

| 로케일 | 파일 | 값 |
|---|---|---|
| ko | `src/lib/locales/ko.js:288` | `최종 점수 {score}` |
| en | `src/lib/locales/en.js:298` | `Final score {score}` |
| ja | `src/lib/locales/ja.js:298` | `最終スコア {score}` |

`src/lib/locales/`에 있는 로케일 3종을 전부 채웠다(누락 시 키 문자열 노출).
숫자는 골드/실시간 점수와 같은 `useGameNumber()`(`src/lib/numberFormat.js`)로 포맷한다 —
과학적 표기 설정도 자동으로 따라간다.

**모지바케 확인**: 편집 후 세 파일의 해당 줄을 `grep`으로 다시 읽어 한글/일본어가 온전한지
눈으로 확인했다(위 표의 값이 재확인한 실제 출력). `iconv -f UTF-8 -t UTF-8`로 ko.js 라인
UTF-8 유효성도 통과. 5개 파일 모두 CR 0개.

## 4. 검증

```
npx vitest run src/components/HUD.test.jsx src/lib/rankingScorePolicy.test.js
  Test Files  2 passed (2)
  Tests  57 passed (57)

npx vitest run src/lib/i18n
  Test Files  3 passed (3)
  Tests  24 passed (24)

npm run build
  ✓ built in 670ms
  Legacy B02 artifact gate passed (dist).
  Hosting JavaScript asset verification passed (59 assets checked).
```

추가 테스트 (`src/components/HUD.test.jsx`, `describe('gameover final score')`):

1. `gameover-final-score`가 게임오버 오버레이에 존재하고, 그 텍스트가
   `getRankingScore({ stageId: 'stage2', survivalSeconds: 210, cleared: false })` = 270과 일치.
   또한 오버레이 `<p>` 순서로 생존 시간 → 최종 점수 → 획득 골드 배치를 단언.
2. 스테이지 보너스 반영: stage3 200초 → 320, stage1 200초 → 200.

CR 오염 확인:

```
git diff --numstat                        git diff --numstat --ignore-cr-at-eol
23  3  .../src/components/HUD.jsx          (동일)
64  0  .../src/components/HUD.test.jsx     (동일)
1   0  .../src/lib/locales/en.js           (동일)
1   0  .../src/lib/locales/ja.js           (동일)
1   0  .../src/lib/locales/ko.js           (동일)
```

`diff` 결과 두 출력 완전 일치.

## 5. 범위 밖으로 남긴 것

클리어 결과창(`HUD.jsx`의 `{phase === 'cleared' && ...}` 블록)은 게임오버 블록과
JSX를 공유하지 않는 별도 블록이다. `styles.modal` / `styles.modalTitle` / `styles.overlay`만
공유하므로 제목 여백은 게임오버 쪽 인라인 오버라이드로만 줄였고 클리어 표기는 손대지 않았다.
클리어 결과창에도 최종 점수를 넣으려면 별도 지시가 필요하다(그쪽은 탈출·보스 보너스가
붙어 `cleared: true` + `bossBonus` 인자를 넘겨야 하므로 `liveScore` 재사용이 불가하다).

커밋하지 않았다.
