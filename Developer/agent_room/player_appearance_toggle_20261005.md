# 설정의 주인공 외형 신/구 선택

- 요청: 설정에서 이번 Player V9(신)와 기존 PlayerMesh(구)를 선택해 게임에서 사용.
- 라우팅: `escape-zombie-school` / threemini `t_3891e391`. Hermes 실행은 이전 `D:/` 필수 문서 경로 때문에 차단되었다는 Advisor 인계에 따라, 현재 `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration`에서 Codex Worker로 구현했다. 전역 경로/프로필은 수정하지 않았다.
- 필수 문서 검사: threemini / auto / `player graphics settings UI Firebase selection`, receipt `7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c`.

## 구현

- 설정에 `주인공 외형`과 `신`/`구` 버튼. 영어/일본어 문구 포함.
- Firebase `progress.titleSettings.playerAppearance`는 `v9` 또는 `legacy`만 허용. 기존 계정에 키가 없으면 현재 V9를 표시하며 설정 열기만으로 새 키를 저장하지 않는다.
- 선택은 기존 Firebase 저장 요청으로 확인하며 실패 시 이전 선택 또는 키 부재를 복원한다. 저장 중 외형 버튼, 닫기, 로그아웃, 계정 삭제를 막는다. 다른 설정 변경은 보존한다. 계정이 바뀌면 이전 계정의 실패 처리로 새 계정 값을 덮어쓰지 않는다.
- 게임은 저장된 선택을 사용하며 게스트도 즉시 V9를 렌더한다. F8은 개발 환경의 임시 비교로 유지하고 저장된 구형 선택에서는 신형으로 먼저 전환한다.
- 모델 자산/구조/색상/크기/외곽선, Studio, 타이틀, 인증 구현은 변경하지 않았다.

## 변경 파일

모두 `Developer/r3f_prototype/` 기준:

- `database.rules.json`
- `src/components/LobbySettingsModal.jsx`, `LobbySettingsModal.test.jsx`
- `src/components/Player.jsx`, `Player.modelComparison.test.jsx`
- `src/lib/titleSettings.js`, `firebaseProgress.js`, `firebaseProgress.test.js`, `firebaseProgressRules.test.js`
- `src/lib/locales/ko.js`, `en.js`, `ja.js`

## 검증

2026-10-05 KST, 다음 명령으로 6개 파일 65개 테스트 통과:

```text
npx vitest run src/components/LobbySettingsModal.test.jsx src/components/Player.modelComparison.test.jsx src/lib/firebaseProgress.test.js src/lib/firebaseProgressRules.test.js src/lib/titleSettings.guest.test.js src/lib/i18nCoverage.test.js
```

검증은 메모리의 모의 Firebase 데이터만 사용했다. 실제 Firebase 읽기/쓰기, 데이터 스냅샷, Apply, 배포, 빌드, Git 변경 명령은 실행하지 않았다. 실제 계정/시각 검증 결과로 확대 해석하지 않는다. 서버에 새 enum 규칙이 아직 배포되지 않았으면 선택 저장은 실패 안내와 함께 이전 값으로 복원된다. 규칙 배포는 Advisor 후속 처리 영역이다.
