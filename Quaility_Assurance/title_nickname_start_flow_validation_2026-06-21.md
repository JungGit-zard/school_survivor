# 타이틀 닉네임 시작 흐름 검증 기록 - 2026-06-21

## 검증 대상

- `게임 시작` 버튼 클릭 시 닉네임 입력 모달이 열리는지.
- 닉네임 저장 전에는 게임이 바로 시작되지 않는지.
- 닉네임 저장 후 선택된 스테이지가 시작되는지.
- Google `uid` 기준 닉네임 저장과 Firebase `profile.nickname` 반영이 되는지.
- 저장된 닉네임이 로컬 랭킹 표시명에 우선 적용되는지.

## TDD RED 확인

```powershell
npm test -- src/lib/userNickname.test.js src/lib/firebaseProgress.test.js src/components/TitleScreen.settings.test.jsx
```

초기 결과:

```text
Test Files 3 failed (3)
Failed to resolve import "./userNickname.js"
```

이 실패는 닉네임 저장 모듈과 UI가 아직 없는 기능 누락 상태라 예상한 RED였다.

추가 RED:

```powershell
npm test -- src/lib/userRanking.test.js
```

초기 결과:

```text
expected 'Google Name' to be '랭킹 생존자'
```

## 자동 테스트

```powershell
npm test -- src/lib/userRanking.test.js src/lib/userNickname.test.js src/lib/firebaseProgress.test.js src/components/TitleScreen.settings.test.jsx
```

결과:

```text
Test Files 4 passed (4)
Tests 23 passed (23)
```

전체 테스트:

```powershell
npm test
```

결과:

```text
Test Files 50 passed (50)
Tests 275 passed (275)
```

## 빌드 검증

```powershell
npm run build
```

결과:

```text
✓ built in 1.41s
```

비고: Vite가 500 kB 초과 chunk 경고를 출력했다. 기존 대형 에셋/번들 경고이며 이번 기능 실패는 아니다.

## 브라우저 검증

대상:

```text
http://127.0.0.1:5189/
```

검증 결과:

```json
{
  "storedNicknames": {
    "local": "테스트 생존자"
  },
  "hasInput": false,
  "bodyTextSample": "Stage 100:00Lv.1HP100/100연필0ⅡR"
}
```

스크린샷:

- `Quaility_Assurance/title_nickname_modal_2026-06-21.png`
- `Quaility_Assurance/title_nickname_start_flow_2026-06-21.png`

## 남은 위험

- 닉네임 중복 검사와 금칙어 필터는 아직 없다.
- 공개 온라인 랭킹 제출에는 서버 검증과 별도 보안 규칙이 필요하다.
