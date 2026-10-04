# 저장 / 헤드리스 독립 검증

- Kanban: `t_9447f237`, balanceqa, 사용자 승인 GPT-6 대체.
- 중앙 precommand 영수증: `373891ec45ee91ed9d5fd667814c05df0b2609a2ae3fa73e90974fa103688cf7`.
- 실제 Firebase와 인증 세션에 접근하거나 데이터를 변경하지 않았다. 브라우저, 게임 화면, 배포를 실행하지 않았다.

## E08 저장 수정 검토

`database.rules.json` 변경은 encounter allow-list에 E08 한 항목을 추가한다. 다른 권한과 값 제한은 유지한다. 이전 식에서 E08=1은 거절, 수정 식에서 허용됨을 직접 평가했다. 전체 RTDB emulator 검증은 아니다.

기존 설치 확인: Firebase CLI는 있으나 Java 명령, Firebase emulator cache 디렉터리, `@firebase/rules-unit-testing` 패키지가 없다. 새 의존성 설치 없이 실제 RTDB emulator 검증은 수행할 수 없었다.

`npm test -- src/lib/firebaseProgressRules.test.js src/lib/firebaseProgress.test.js`: 모든 pretest gate 통과, 2 files / 26 tests PASS, Vitest 1.31초.

## 격리 저장 20,000회

`node Quaility_Assurance/e08_save_headless_isolated_validation_2026-10-04.mjs`

- 실측 693.44ms, 실패 assertion 0.
- 저장 성공 6,401 / 권한 거절 12,799 / 오류 뒤 재시도 400 / 전송 중 계정 전환 400.
- E08 관련 1,828회, 성공 1,126회.
- 실제 소스 저장 함수와 encounter / user-write 규칙식을 실행했다. 다른 RTDB 규칙 전체, 서버 네트워크, OAuth 로그인은 범위 밖이다.
- 기존 QA script의 기대값 오류를 수정했다. 소스는 transport 전에 알 수 없는 encounter key를 제거하고 지원된 truthy 값을 1로 정규화하므로 raw 규칙 검증과 transport 결과를 별도로 검증한다. 계정 전환은 실제 가짜 전송이 시작된 후 수행한다.

원상복구 증거:

```text
Captured UTC 2026-10-04T08:58:28.649Z
Fixture revision before/after 17
Fixture initial/final SHA256 5e52017cfe5b104d1aa5b00367ba26134c45d7eca0650849cf784015b45c63d4
Runtime initial/final SHA256 d5b60a295519bb9d89643de6ed18244338ca967ebfe9ec304bd40442df6e357f
localStorage accesses 0
```

격리 상태는 finally에서 최초 snapshot으로 복원한 뒤 전체 JSON 해시를 비교했다. 실제 사용자 Firebase 정본은 테스트 대상이 아니며 변경하지 않았다. 실제 게임 20,000판 또는 화면 20,000프레임을 검증했다는 뜻이 아니다.

## 게임 상태 독립 실행 (무기 잠금 계정)

`npm test -- src/lib/gameplayStateVerifier.test.js --environment node --disableConsoleIntercept`

- 3 tests PASS, 20,000 상태 시나리오 실측 100,943ms. 병렬 작업으로 CPU 경합 가능.
- stage1~4 각 5,000 / 실제 store action 617,874 / digest `9d004512`.
- levelup 41,544 / upgrade 148,047 / gameover 22 / clear 5,608 / nextStage 5,286 / localStorage 0.
- capture `2026-10-04T09:01:41.711Z`, store 전후 SHA256 `ed960c16ea29f168b13bedc01ffa5ebdb7d005edb55e34cea89fa8d1977c7164`, Firebase 합성 fixture 전후 SHA256 `edf7f129059e3a6b66636b0a4b0bfb4144b6973c30372b68138816a3f31c16d8`.
- 예외, 불변식 실패, 동일 seed 재현과 최초 상태 복원을 검증했다.
- 이 실행에서 무기교체 0회. 전체해금 계정 fixture 보강 후 검증은 별도 최종 실행으로 기록한다.
- 실제 Zustand store 상태 전이는 실행하지만 렌더, 물리, 적 AI, 프레임, 네트워크, 실제 게임 완주를 검증하지 않는다.

## 최종 게임 상태 독립 실행 (전체 무기 해금 합성 계정)

같은 명령으로 worker CPU 실행 종료 뒤 최종 파일을 독립 실행했다.

- 3 tests PASS / 실측 20,000 시나리오 63,513ms / 전체 Vitest 65.14초.
- digest `1cd412ad`, seed `0xaaa07e74`, actions 617,748.
- stage1~4 각 5,000 / levelup 41,524 / upgrade 148,073.
- 무기교체 확인 2 / 버리기 5 / gameover 21 / clear 5,616 / nextStage 5,293.
- localStorage 접근 0, 외부 progress write 0.
- capture `2026-10-04T09:04:21.042Z`, store 전후 SHA256 `ed960c16ea29f168b13bedc01ffa5ebdb7d005edb55e34cea89fa8d1977c7164`, Firebase 합성 fixture 전후 SHA256 `53b18c039ac0133282f7042a3711fb5e1262e881fe508c69b280861d12bd56ef` 동일.
- 예외·상태 규칙 실패 시 복원과 같은 seed 재현도 PASS. 무기 해금은 테스트 mock 경계에만 있고 실제 계정/게임 코드 변경이 아니다.
- HP/XP/phase/무기 숫자·상한/중복 mission·milestone key/gold/gameover·levelup 일관성 검사 PASS.

최종 판정: 저장 20,000 case와 실제 store 상태 20,000 시나리오의 격리 검증 통과. 전체 게임 렌더/물리/적 AI/실제 Firebase 로그인 검증 또는 라이브 수정 배포 완료로 보고하지 않는다. 커밋·푸시·배포 없음.
