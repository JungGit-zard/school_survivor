# QA — 전기 스턴건 SFX 볼륨·피치 회귀 검증

Date: 2026-10-05
Kanban task: t_bf30ed61
Profile: soundmini

## 검증 대상

- `Developer/r3f_prototype/src/components/Weapons/StunGun.jsx`
- `Developer/r3f_prototype/src/components/Weapons/WeaponHitSfx.test.jsx`
- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/src/lib/sfxRegistry.test.js`

## 기대 동작

- 전기 스턴건 SFX만 현재 대비 볼륨 50%, 피치/rate 70%로 낮춘다.
- 다른 무기, 글로벌 오디오, 타이틀 BGM, 에셋, Firebase 동작은 변경하지 않는다.

## 실행 결과

```text
npm test -- src/components/Weapons/WeaponHitSfx.test.jsx --runInBand
=> FAIL: Vitest Unknown option `--runInBand`; 테스트 러너 옵션 오류로 재실행 필요

npm test -- src/components/Weapons/WeaponHitSfx.test.jsx
=> PASS
=> Test Files: 1 passed (1)
=> Tests: 7 passed (7)

npm test -- --run src/components/Weapons/WeaponHitSfx.test.jsx src/components/SfxLayer.test.jsx src/lib/sfxRegistry.test.js
=> PASS
=> Test Files: 3 passed (3)
=> Tests: 39 passed (39)

git diff --check -- Developer/r3f_prototype/src/components/Weapons/StunGun.jsx Developer/r3f_prototype/src/components/Weapons/WeaponHitSfx.test.jsx Developer/r3f_prototype/src/lib/sfxRegistry.js Developer/r3f_prototype/src/lib/sfxRegistry.test.js
=> PASS
```

## 판정

PASS. 스턴건 전용 SFX 계약 테스트가 새 값(`stunGunHit` volume `0.09625`, rate base `0.448`, `stunGunFire` volume `0.5`, rate `0.7`)을 확인했고, registry 테스트가 `0.448`을 `0.5`로 자동 보정하지 않고 실제 Howler 호출에 그대로 전달함을 확인했다. 다른 무기 SFX 계약 테스트도 함께 통과했다.

## 범위 밖 / 보존

- 실제 기기 청감 테스트는 수행하지 않음.
- 기존 dirty worktree는 보존함.
- 신규 외부 음원/라이선스 검토 대상 없음.
