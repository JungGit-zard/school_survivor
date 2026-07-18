# 치비코 무기 구현 기록

## 변경 요약

- `weaponCatalog`에 `chibiko` 무기를 추가했다.
- `UPGRADE_EFFECTS`에 `acquireChibiko`를 추가했다.
- HUD 카드와 무기 아이콘 매핑에 치비코를 연결했다.
- `ChibikoWeapon` R3F 컴포넌트를 추가해 주인공 추종과 레벨1 연필 투척을 구현했다.

## 주요 코드

- `src/lib/chibiko.js`: 추종 위치와 레벨1 연필 공격 설정 헬퍼.
- `src/components/Weapons/Chibiko.jsx`: 치비코 모델, 추종 애니메이션, 연필 투사체.
- `src/components/Game.jsx`: 실제 게임 렌더 트리에 치비코 무기 연결.
- `src/assets/weapon_icon/14_wea_chibiko.svg`: HUD 카드용 치비코 아이콘.

## 구현 메모

- 치비코는 주인공 뒤 중앙을 막지 않도록 뒤 대각선 위치를 따라간다.
- 투사체는 기존 연필 무기와 같은 단일 대상 추적형 물리 센서 충돌 방식을 따른다.
- 이번 버전에서는 치비코 전용 강화 카드를 추가하지 않아 레벨1 기능만 수행한다.
