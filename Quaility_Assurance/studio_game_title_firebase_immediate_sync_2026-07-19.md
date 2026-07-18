---
module: Graphics Studio Firebase canonical state
tags: [graphics-studio, firebase, game, title, revision, immediate-sync]
problem_type: integration_test
date: 2026-07-19
status: automated_pass_browser_e2e_pending
---

# Studio → 게임 → 타이틀 Firebase 즉시 반영 검사

## 판정

자동 통합검사 판정은 **PASS**다. 실제 로그인 브라우저 E2E 검사는 아직 수행하지 않았다.

Firebase snapshot을 런타임에 적용한 뒤 `player` 값을 소비하는 게임·타이틀 두 소비자는 같은 이벤트에서 함께 갱신됐다. 저장 성공 뒤 Studio 런타임도 원격 Firebase와 같은 revision을 사용하도록 수정했다.

## 검사 범위

- Studio 입력값: `player.scale`
- Firebase 저장 전 revision: `7`
- Firebase 저장 후 revision: `8`
- 변경값: `player.scale = 1.37`
- 게임 소비 경로: `Player` → `PlayerVisual` → `PlayerMesh` → `StudioTunedGroup itemId="player"`
- 타이틀 소비 경로: `TitlePlayer` → `PlayerVisual` → `PlayerMesh` → `StudioTunedGroup itemId="player"`

## 결과

### PASS: Firebase snapshot 소비 결과

revision `8`, `player.scale = 1.37`인 Firebase snapshot을 적용하자 게임 소비자와 타이틀 소비자가 모두 `1.37,1.37,1.37` 스케일로 같은 렌더 갱신 이벤트에서 변경됐다.

### PASS: 저장 직후 revision 일치

Firebase transaction 저장 결과:

- 저장 결과: `saved`
- Firebase 원격 revision: `8`
- Firebase 원격 `player.scale`: `1.37`
- Studio 런타임 revision: `8`

`saveFirebaseStudio()`가 새 revision `8`을 반환하면 Studio 런타임도 revision `8`로 확인한다. 저장 도중 더 최신의 미저장 Studio 변경이 생기면 이전 저장 revision을 덮어쓰지 않도록 차단한다.

### PASS: 즉시 반영 회귀 테스트

관련 자동 테스트는 수정 후 101/101개 통과했다. 최종 핵심 회귀 테스트도 60/60개 통과했고 프로덕션 빌드도 통과했다.

`StudioTunedGroup` 검사는 Firebase hydrate 후 게임·타이틀 소비자에 동일한 revision과 변형값이 함께 적용되는지 확인한다.

## 추가 위험

- Studio의 게임 갱신 신호는 Studio가 열거나 연결한 게임 창에만 전송된다.
- 별도로 열린 게임·타이틀 창이 즉시 새 revision을 hydrate한다는 보장은 현재 검사에서 확인되지 않았다.
- 실제 Google 로그인 계정과 원격 Firebase를 사용하는 브라우저 E2E 검사는 이번 자동 단위·통합 검사에 포함하지 않았다.

## 결론

자동 통합검사에서는 Studio 저장 revision과 게임·타이틀의 동일 Firebase snapshot 적용이 일치한다. 실제 로그인 계정과 원격 Firebase를 사용한 브라우저 E2E 확인은 별도 남아 있다.
