# Player Weapon Arm Action Implementation - 2026-05-30

## 연결 파일

- 기획: `Planner/player_weapon_arm_action_rules_2026-05-30.md`
- 그래픽 방향: `Graphic_designer/player_weapon_arm_action_2026-05-30.md`
- 구현:
  - `Developer/r3f_prototype/src/lib/playerArmAction.js`
  - `Developer/r3f_prototype/src/lib/refs.js`
  - `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
  - `Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx`
  - `Developer/r3f_prototype/src/components/Weapons/Missile.jsx`
- 테스트: `Developer/r3f_prototype/src/lib/playerArmAction.test.js`

## 구현 내용

- `playerArmActionState`를 추가해 플레이어 팔 액션을 시간 제한 상태로 관리한다.
- `PlayerMesh`는 매 프레임 액션 만료 여부를 확인하고, 만료되면 양팔 회전을 기본값으로 돌린다.
- `BoxCutterWeapon`은 공격 시작 시 `boxCutter` 팔 액션을 등록한다.
- `GuidedMissile`은 미사일 생성 시 `guidedMissileThrow` 팔 액션을 등록한다.

## 의도

- 무기별 팔 연출을 추가하되, 한쪽 팔이 계속 올라간 상태로 남는 문제를 공통 만료 로직으로 막는다.
