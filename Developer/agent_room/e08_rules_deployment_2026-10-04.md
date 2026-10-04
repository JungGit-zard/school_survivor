# E08 Firebase 규칙 배포 기록 — 2026-10-04

- Kanban: `escape-zombie-school` / `t_fba8a952`, backendmini 역할, 사용자 승인 GPT-6 대체 Worker.
- 중앙 precommand 영수증: `5ab7befca4476b5cc8360f1d5f844247525a771e8e3a18f171b9bb7366acbc80`.
- 사용자 조건인 저장 오류 검증 및 10,000회 이상 헤드리스 게임 상태 실행을 충족한 뒤 Advisor GO로 배포했다.
- 프로젝트: `escape-zombie-school`; 명시 인스턴스: `escape-zombie-school-default-rtdb`; Firebase CLI `15.22.4`.
- 변경은 `users/$uid/progress/encounteredZombieTypes/$zombieType` 검증식에 `E08` 허용 한 항목 추가뿐이다. 배포 직전 원격 전체 규칙과 비교해 다른 차이가 없음을 확인했다.

## 명령과 원격 재조회

```text
firebase -P escape-zombie-school deploy --only database --config C:/Users/admin/AppData/Local/Temp/escape-e08-rules-20261004_180531017/deploy.firebase.json
firebase -P escape-zombie-school database:get /.settings/rules --instance escape-zombie-school-default-rtdb --output C:/Users/admin/AppData/Local/Temp/escape-e08-rules-20261004_180531017/post-deploy-rules.json
```

배포 종료 코드 `0`: 규칙 문법 검사와 해당 인스턴스 release 성공. 재조회 종료 코드 `0`: 전체 JSON이 검증한 배포 대상 규칙과 완전히 일치하고 E08 허용을 확인했다. 롤백은 필요하지 않았다.

아래 값은 같은 C 임시 폴더의 `deployment-receipt.json` 원문에서 옮겼다. 해시는 CLI가 저장한 전체 원격 규칙 파일 bytes의 SHA-256이다. 규칙 응답에는 별도 revision 필드가 없어 전체 규칙 비교와 해시로 검증했다.

| 시점 | 정확한 UTC 시각 | KST 시각 | SHA-256 |
| --- | --- | --- | --- |
| 배포 직전 | `2026-10-04T09:10:29.526+00:00` | `2026-10-04 18:10:29.526` | `0358f637eca2b9ffa3ed3a393dc0dca3fe43dbdc96cd65c884274438cc3eaf96` |
| 배포 후 재조회 | `2026-10-04T09:10:54.725+00:00` | `2026-10-04 18:10:54.725` | `cdd168e5a0b200cdb9fe15d49a3301de115e5ee3b6b3a98dec468ae6309daa2c` |

최초 원격 규칙 `live-rules.json`, 직전 `pre-deploy-rules.json`, 이후 `post-deploy-rules.json`, 검증 대상 `verified-local-rules.json`, 인스턴스를 고정한 `deploy.firebase.json` 및 `rollback.firebase.json`을 같은 폴더에 보존했다. 복구가 필요하면 원본 `live-rules.json`을 참조하는 `rollback.firebase.json`으로 동일한 database 전용 명령을 사용한다.

## 배포 전 검증과 범위

- `npm test -- src/lib/firebaseProgressRules.test.js src/lib/firebaseProgress.test.js`: 26/26 PASS. 전체 도감 16종 허용, 미등록 타입·잘못된 값 거부, 저장 실패 뒤 재시도와 계정 전환 경고 격리를 포함한다.
- 독립 QA: 격리 저장 20,000 case PASS, 최초 fixture revision `17`과 fixture/runtime 전체 SHA-256 복원 일치.
- 독립 QA: 실제 Zustand 게임 store 상태 20,000 시나리오 PASS, stage1~4 각 5,000, action 617,748, 최초 store/합성 Firebase fixture SHA-256 복원 일치. 외부 진행도 쓰기와 localStorage 접근 모두 0.
- Advisor 직접 최종 재검증: backend 26/26 PASS, 게임 상태 20,000 시나리오 3/3 PASS(62.23초), diff 검사 PASS 후 GO.
- 세부 QA와 해시: `Quaility_Assurance/save_headless_independent_review_2026-10-04.md`.
- 최신 라이브 JS 번들 59개를 읽어 90/180초 E08 스폰, 도감 기록 후 저장, 저장 실패 경고 흐름이 현재 소스와 일치함을 확인했다.

사용자 게임 데이터, Auth, Hosting, 타이틀, Graphics Studio와 AAB는 변경하지 않았다. 실제 로그인 상태의 라이브 저장 테스트는 수행하지 않았다. 격리 저장과 게임 상태 검증은 실제 서버 네트워크·OAuth·렌더·물리·적 AI 또는 실제 게임 20,000판 완주 검증을 의미하지 않는다.
