# 주인공 신·구 외형 Firebase 규칙 배포 — 2026-10-05

- 사용자 후속 명시 승인에 따라 Advisor가 규칙을 배포했다. 이 기록은 Advisor의 실제 명령 결과를 전달받아 작성했다.
- 라우팅: `escape-zombie-school / backendmini / t_c79db86d` 재사용. Hermes의 이전 D: 경로 차단 때문에 기존 F: 작업공간 검토 대체 경로를 유지했다.
- 프로젝트: `escape-zombie-school` (`1081021544915`). DB: `escape-zombie-school-default-rtdb`, `asia-southeast1`, `DEFAULT_DATABASE`, `ACTIVE`.
- 변경은 `rules/users/$uid/progress/titleSettings/playerAppearance/.validate` 하나뿐이다. 값은 `newData.isString() && (newData.val() === 'v9' || newData.val() === 'legacy')`이다. 기존 계정에서 해당 키의 부재는 계속 허용한다.

## 배포·재조회 증거

```text
firebase.cmd database:instances:list --project escape-zombie-school --json
firebase.cmd database:get /.settings/rules --instance escape-zombie-school-default-rtdb --project escape-zombie-school --output C:/Users/admin/AppData/Local/Temp/escape-appearance-rules-before-20261005.json
firebase.cmd deploy --only database --project escape-zombie-school --non-interactive
firebase.cmd database:get /.settings/rules --instance escape-zombie-school-default-rtdb --project escape-zombie-school --output C:/Users/admin/AppData/Local/Temp/escape-appearance-rules-after-20261005.json
```

- 배포 전 조회 exit 0, UTC `2026-10-05T14:29:33.3902225Z`. SHA-256 `CDD168E5A0B200CDB9FE15D49A3301DE115E5EE3B6B3A98DEC468AE6309DAA2C`.
- 배포 exit 0: 구문 유효, rules released successfully, Deploy complete.
- 배포 후 조회 exit 0, UTC `2026-10-05T14:30:22.3257817Z`. SHA-256 `06292A32C4DA93EB4D149312E9E62EBD129B3696E03C2007F5D28EB0F06F9921`.
- JSON 구조 비교: 배포 전 원격 규칙은 로컬 규칙에서 새 외형 키만 제외한 구조와 완전히 동일했다. 배포 후 `RemoteMatchesLocal=true`, 새 키를 제거한 전후 비교 `OnlyAppearanceChanged=true`를 확인했다.
- 인증·읽기·쓰기 권한을 포함한 다른 원격 규칙은 모두 유지됐다. 다른 저장 경로나 규칙 추가는 필요하지 않았다.

## 범위와 검증 한계

원격 접근은 `/.settings/rules` 조회와 규칙 배포뿐이다. 사용자 데이터 조회·쓰기, 로그인 변경, 실제 로그인·외형 선택 테스트, Hosting 배포는 하지 않았다. 규칙 배포와 원격 일치는 확인했지만 실제 사용자 세션의 저장 동작을 검증했다고 주장하지 않는다. 이전 로컬 코드·격리 UI 검증은 `Quaility_Assurance/player_appearance_settings_20261005.md`에 기록돼 있다.
