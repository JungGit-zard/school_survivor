# 주인공 외형 신·구 설정 검증 — 2026-10-05

이 기록은 Advisor가 직접 실행하고 전달한 검증 증거를 정리한 것이다. 기록 작성자는 테스트를 재실행하지 않았다. 백엔드 검토·라우팅 제한은 `Developer/agent_room/player_appearance_backend_review_20261005.md`에 기록했다.

## 자동 검증

`Developer/r3f_prototype`에서 다음 명령을 실행했다.

```text
npm test -- src/components/LobbySettingsModal.test.jsx src/components/Player.modelComparison.test.jsx src/components/Player.test.js src/components/PlayerV9Model.test.jsx src/lib/firebaseProgress.test.js src/lib/firebaseProgressRules.test.js src/lib/titleSettings.guest.test.js src/lib/i18nCoverage.test.js src/lib/localStoragePolicy.test.js
```

- npm pretest 필수 검사 전체 통과.
- 테스트 파일 9개, 테스트 98개 통과.
- 두 모델 선택, 선택값 보존, 저장 실패 복원, 계정 변경 중 이전 설정 쓰기 방지, 관련 저장 규칙·번역·로컬 저장 금지 범위를 검증했다.

## 브라우저 검증

- agent-browser 격리 세션 `appearance-review`에서 실제 `LobbySettingsModal`을 임시 HTML fixture로 렌더링했다.
- 가짜 UID `appearance-ui-fixture`, `_setFirebaseProgressClientForTests`의 가짜 저장만 사용했고 Firebase 원격 요청 경로는 차단했다. 실제 Firebase 데이터와 인증을 테스트하거나 변경하지 않았다.
- Advisor가 데스크톱 및 390×844 모바일 화면을 직접 확인했다. 신·구 버튼과 파란 선택 표시를 읽을 수 있고 모바일 스크롤 영역 안에 설정이 맞게 표시됐다.
- 구 선택 시 가짜 저장 payload는 `legacy`, 닫고 다시 열면 구 선택 유지, 신 선택 시 `v9`를 확인했다.
- 가짜 저장 실패 후 구를 선택하면 `외형을 저장할 수 없습니다. 연결을 확인한 뒤 다시 선택해 주세요.` 안내가 표시되고 신(`v9`)으로 복원됐다.
- 증거 이미지: `player_appearance_settings_desktop_20261005.png`, `player_appearance_settings_mobile_20261005.png`.

## 테스트 상태 복원

- fixture 전체 초기 스냅샷: `2026-10-05T14:20:29.885Z`.
- 복원 시각: `2026-10-05T14:22:03.923Z`.
- 초기/복원 JSON 전체 비교: 동일(`true`). 초기/복원 SHA-256 모두 `bced2a750093d7cae5c7c807439a82c595f8365f86e501420231a4ab90e76f95`.
- 가짜 저장 호출: 3회. 실제 사용자 Firebase 정본은 접근·변경하지 않았다.
- Advisor가 임시 fixture와 테스트 브라우저를 제거했다. 5173 개발 서버는 유지했다.
- 최초 복사된 Vite 캐시 때문에 504가 발생했다. 이번 작업에서 시작한 개발 서버만 의존성 재최적화 옵션으로 재시작한 뒤 정상 fixture 검증을 완료했다.

## 검증 한계

Firebase 보안 규칙과 Hosting은 배포하지 않았다. 실제 환경에서 선택값을 저장하려면 `playerAppearance`의 `v9`/`legacy`를 허용하는 규칙 배포가 별도로 필요하다. 이 기록은 로컬 코드·격리 UI 검증 결과이며 라이브 저장 또는 배포 완료를 의미하지 않는다.
