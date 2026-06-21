# 유저랭킹 페이지 검증 기록 - 2026-06-21

## 검증 대상

- 타이틀 화면의 `유저랭킹` 버튼.
- 랭킹 화면의 1위부터 100위까지 표시.
- 랭킹 화면에서 타이틀로 돌아가기.

## 자동 테스트

```powershell
npm test -- src/lib/userRanking.test.js src/components/UserRanking.test.jsx src/components/TitleScreen.settings.test.jsx src/components/resultCoinShopFlow.test.jsx
```

결과:

```text
Test Files 4 passed (4)
Tests 19 passed (19)
```

## 빌드 검증

```powershell
npm run build
```

결과:

```text
✓ built in 755ms
```

비고: Vite가 500 kB 초과 chunk 경고를 출력했다. 기존 대형 에셋/번들 경고이며 이번 랭킹 기능의 실패는 아니다.

## 브라우저 검증

대상:

```text
http://127.0.0.1:5189/
```

검증 결과:

```json
{
  "rowCount": 100,
  "firstRow": "1위기록 없음-",
  "lastRow": "100위기록 없음-",
  "buttonCount": 1,
  "lastButtonText": "타이틀로 돌아가기"
}
```

스크린샷:

- `Quaility_Assurance/user_ranking_title_button_2026-06-21.png`
- `Quaility_Assurance/user_ranking_page_2026-06-21.png`

## 남은 위험

현재는 공개 온라인 경쟁 랭킹이 아니다.
서버 검증 없이 클라이언트 로컬 기록을 공개 랭킹에 제출하면 조작 위험이 있으므로, 온라인 랭킹 제출은 별도 보안 설계 후 진행해야 한다.
