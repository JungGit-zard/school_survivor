# 무기 해금 Firebase 마이그레이션 기록 (2026-08-22)

## 적용 범위

- `firebaseProgress.js`는 순수 모듈 `weaponUnlockMigration.js`만 직접 사용한다. `weaponUnlocks.js`를 경유하지 않아 순환 의존을 만들지 않는다.
- 새 계정의 진행도는 `weaponUnlockSchemaVersion: 2`로 생성한다.
- 기존 Firebase 진행도의 버전이 2 미만일 때만 과거 기본 지급 권리 6종(`scienceFlask`, `bell`, `stunGun`, `onigiri`, `chibiko`, `inucon`)을 기존 `weaponUnlocks`와 합집합으로 병합하고 버전을 2로 저장한다.
- 기본 4종과 런타임 조합 3종은 계정 해금 플래그 및 이전 대상이 아니다.
- 마이그레이션 저장이 실패해도 현재 세션의 해금 권리와 플레이는 유지한다. 다음 정상 저장에서 재시도한다.
- `acknowledgeNewWeaponUnlocks()`는 도감 확인 뒤 `newlyUnlockedWeaponIds` 알림만 비우며 Firebase 쓰기를 하지 않는다.
- 저장 실패 경고는 Firebase 모듈의 메모리 전용 pending 상태이며, store의 `progressSaveWarning: 'save-failed'`로만 UI에 전달한다. `dismissProgressSaveWarning()`은 이 UI 경고만 닫는다.
- `saveRuntimeProgress()`는 Firebase 저장 결과가 `false`면 경고를 남기고, 로그인 뒤 `reloadPersistentProgress()`는 pending 경고를 소비한다. Firebase·localStorage에 경고 필드는 저장하지 않는다.
- pending 경고와 store 경고 반영은 요청 시점 UID가 현재 hydrate된 UID와 같을 때만 허용한다. 계정 전환·로그아웃은 pending 경고를 비우므로 이전 계정의 저장 실패가 새 계정에 표시되지 않는다.

## 보류와 경계

- `recentRunIds`/run-end transaction ledger 및 Firebase Rules 확장은 이번 승인 범위가 아니므로 추가하지 않았다. 런 종료의 기존 저장 경계만 유지한다.
- 타이틀의 전체 해금 치트 UI·동작은 타이틀 정본 잠금에 따라 수정하지 않았다. 출시 치트가 영구 `weaponUnlocks` 권리를 오염시키지 않는지는 별도 후속 점검 대상이다.
- 실제 Firebase, 브라우저, localStorage에는 접근하거나 데이터를 변경하지 않았다.

## 검증

`npm.cmd exec -- vitest run src/lib/firebaseProgress.test.js src/lib/weaponUnlockMigration.test.js src/lib/weaponUnlocks.test.js src/lib/databaseRules.test.js src/store/useGameStore.unlocks.test.js src/store/useGameStore.cloudProgress.test.js --maxWorkers=1 --no-file-parallelism`

- 6개 파일, 93개 테스트 통과.
- 기존 계정 1회 병합, v2 계정 비병합, 마이그레이션 저장 실패 비차단, 저장 실패 경고 전달/닫기, A→B 계정 전환 누출 방지, 새 해금 알림 확인 처리를 검증했다.
