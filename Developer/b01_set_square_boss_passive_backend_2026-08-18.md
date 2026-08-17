# B01 삼각자 보스 패시브 백엔드 기록

## 구현 범위

- Firebase 계정 진행도 `progress.bossPassiveUnlocks`에 B01 보상 플래그를 보존한다.
- B01 보상 `b01SetSquare`(삼각자)의 순수 카탈로그와 공격력 계산 함수를 제공한다.
- UI, HUD, 적 사망 처리, `useGameStore`, 인증 경로는 이 작업에서 수정하지 않는다.

## 정본 데이터

- 보스: `B01`
- ID: `b01SetSquare`
- 이름: `삼각자`
- 설명: `커터칼·30cm 자·바이키티 공격력 +5%`
- 대상 무기 ID: `boxCutter`, `schoolBag`, `bikittyCutter`
- 배수: `1.05`
- 보스 패시브 UI 슬롯 수: `8`

## 저장·적용 계약

- `bossPassiveUnlocks`는 Firebase progress의 빈값 생성, 원격 hydrate 정규화, 읽기·업데이트 스냅샷, 클론에 포함된다.
- 현재는 B01 플래그만 유효하다. B02~B04 보상 데이터나 효과는 만들지 않는다.
- `applyBossPassiveDamageToBaseWeapon`은 카탈로그의 원본 `base` 무기에 한 번 적용한다. 반환값에는 적용 배수가 표시되어 동일 객체를 재적용해도 5%가 중복 곱해지지 않는다.
- 브라우저 `localStorage`에는 저장하거나 읽지 않는다. 해당 키를 쓰려는 시도는 기존 Firebase 전용 저장소 가드가 차단한다.

## Rules 리뷰 보완

- `database.rules.json`의 `progress.bossPassiveUnlocks`에 `b01SetSquare: true`만 허용하는 명시 규칙을 추가했다.
- 알 수 없는 보스 패시브 키는 `$other: false`로 거부한다.
- 이 맵은 새 계정에서 비어 있을 수 있으므로 `progress` 필수 자식 목록에는 넣지 않았다.
- 실제 Firebase Rules 배포는 수행하지 않았다.
