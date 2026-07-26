# LevelMini 30cm 자 시각 지속성 라우팅 기록 (2026-07-26)

## 게임플레이 기대 동작

- 플레이어가 자를 휘두르지 않을 때는 자와 공격 trail이 화면에 남지 않는다.
- 근접 적으로 swing이 시작된 실제 frame에만 자와 trail이 표시된다.
- swing이 끝나면 마지막 자세나 마지막 양수 trail opacity가 남지 않고 즉시 숨겨진다.
- 다음 cooldown 뒤 새 swing은 기존과 같은 판정·사거리·피해·SFX로 다시 표시된다.

## 범위와 결정

문제는 공격 기능이 아니라 mounted 시각 객체의 visibility 초기화 누락이다. 따라서 LevelMini 관점에서 난이도, cooldown, damage, range, pause 중 전투 시각 동결, 업그레이드 수치에는 변경이 필요 없다. 최초 hidden 및 idle/완료 hide로 visual persistence만 바로잡는다.

## 검증 근거

`SchoolBag.test.jsx`가 첫 렌더/idle/active/complete 상태를 회귀 계약으로 확인하며, WeaponHit SFX 및 weapon targeting/collision 테스트도 함께 통과한다.
