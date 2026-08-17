# B01 삼각자 보스 패시브 런타임 연결

## 경로

`Enemy.jsx`의 실제 보스 사망 경로가 `recordBossKill(type)`으로 보스 타입을 전달한다. Store는 B01일 때만 `bossPassiveItems.js`의 `unlockBossPassiveItem`을 사용한다.

해금 후에는 다음 두 경로가 같은 helper를 사용한다.

1. 현재 런: `applyBossPassiveDamageToRuntimeWeapons`가 현재 weapons의 대상 세 damage만 즉시 1.05배 한다.
2. 새 런·reload: `buildInitialWeapons`가 카탈로그 base와 영구 업그레이드를 조합한 뒤 `applyBossPassiveDamageToBaseWeapon`을 적용한다.

## Firebase 경계

- hydrate 상태면 `updateFirebasePlayerProgress`로 `bossPassiveUnlocks`를 갱신하고 `requestCloudProgressSave`를 요청한다.
- 미hydrate 상태면 저장 호출 없이 Zustand 메모리 상태만 갱신한다. 보스 사망, 게임 리셋, 무기 생성은 계속 실행한다.
- HUD와 인증 경로는 수정하지 않는다.

## 회귀 검증

- B01만 해금, B02~B04는 미해금.
- 세 대상의 damage만 정확히 1.05배, 다른 무기는 불변.
- 같은 B01 이벤트를 다시 호출해도 중첩 없음.
- Firebase reload와 새 런, 미hydrate resetGame 모두 해금 상태를 올바르게 처리.
