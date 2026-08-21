# Current Game Rules

> 현행 시간·보스 정본: Stage 1은 240초(4분) 생존이며 B01은 192초, 탈출 포탈은 240초에 활성화된다. 세부 값은 `Developer/r3f_prototype/src/lib/stageConfig.js`와 `Developer/r3f_prototype/src/lib/burstEvents.js`를 따른다.

Last updated: 2026-07-30

## 1. 게임 정체성

Escape! zombie school는 학교 콘셉트의 4분 생존형 미니게임이다.

현재 목표는 장식적인 구조보다 플레이 가능한 1스테이지 루프를 안정화하는 것이다.

## 2. 현재 Stage 1 기준

- 플레이 시간: 4분(240초)
- 240초에 탈출 포탈이 활성화되고, 포탈 진입 시 클리어
- HP 0 도달 시 게임오버
- 현재 초기 상태는 별도 `start` 없이 바로 `playing`
- 일시정지는 키보드 `p` 기준으로 동작
- 모바일 pause/resume UI는 HUD 버튼으로 제공한다.

## 3. 적 구성

현재 Stage 1 스폰 기준:
- E01
- E02
- E03
- E05
- E06
- B01

현재 Stage 1 제외 기준:
- E04는 웨이브/버스트 테이블에서 제외
- 단, 코드에는 E04 원거리/투사체 실행 경로가 남아 있으므로 회귀 방지 필요

## 4. 보스 기준

- B01은 192초에 1회 등장하며, 경고 기준 시각은 186초다.
- 현재 B01은 추격/돌진 중심이다.
- Stage 1에서는 B01 부채꼴 투사체 패턴을 쓰지 않는 방향이다.
- B01 기본 `xp`는 0이지만 보너스 교과서는 별도 XP 값을 사용한다.
- 보스 처치는 별도 보너스 성취다. 보스 생존 여부와 무관하게 240초 포탈 진입이 Stage 1 클리어를 결정한다.

## 5. 성장과 보상

- XP는 교과서 형태로 드랍된다.
- 일반 적 교과서 드랍 확률은 30% 기준이다.
- 골드는 시간 기반 코인과 엘리트/보스 처치 보상으로 획득한다.
- 계정 진행과 골드 누적 정본은 Firebase progress이며, 브라우저 `localStorage`에는 저장하지 않는다.

현재 위험:
- 시간 기반 골드 코인의 분포는 4분 런 기준으로 QA한다.

## 6. 무기 기준

- 한 런에서 보유 가능한 무기 슬롯은 8개다.
- 현행 무기 카탈로그·레벨 카드·해금 조건의 정본은 `Developer/r3f_prototype/src/lib/weaponCatalog.js`, `Developer/r3f_prototype/src/lib/upgrades.js`, `Developer/r3f_prototype/src/lib/weaponUnlocks.js`다.
- 계정 누적 해금과 진행 기록은 Firebase progress를 통해 유지한다. 제거되었거나 복원이 필요한 무기를 전제로 하지 않는다.

## 7. 다음 규칙 판단 시 주의

- 새 기획은 반드시 `Planner/`에 먼저 기록한다.
- 4분 생존 루프를 바꾸는 변경은 QA 기준을 먼저 만든다.
- 모바일 조작이 빠진 기능은 완료로 보지 않는다.
- 검증하지 않은 기능을 검증 완료로 기록하지 않는다.
