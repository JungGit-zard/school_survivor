# Current Implemented Weapon List

Date: 2026-05-24
Scope: current runtime implementation

This list is based on the weapons currently registered in runtime code:

- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/components/Weapons/`

Graphics workflow note:

Before creating or revising 3D weapon assets, first prepare or confirm a 2D concept image. Do not create 3D weapon output directly from planning text alone.

## Implemented Weapons

| No. | Weapon key | Korean name | Runtime role |
| ---: | --- | --- | --- |
| 1 | `pencilThrow` | 연필 던지기 | Basic ranged projectile |
| 2 | `schoolBag` | 30cm 자 / 가방 휘두르기 계열 | Close-range cone swing |
| 3 | `tumbler` | 텀블러 | Orbiting defensive weapon around the player |
| 4 | `scienceFlask` | 과학 플라스크 | Splash explosion at target point |
| 5 | `bell` | 종 충격파 | 8-direction shockwave |
| 6 | `stunGun` | 스턴건 | Chain electric attack |
| 7 | `onigiri` | 오니기리 | Bouncing projectile between enemies |
| 8 | `guidedMissile` | 보조배터리 미사일 | Guided explosive projectile |
| 9 | `starlink` | 고장난 스타링크 | Random lightning strikes near the player |
| 10 | `compassBlade` | 컴퍼스 칼날 | Orbiting blade weapon |
| 11 | `umbrellaGuard` | 우산 방어막 | Defensive knockback weapon |
| 12 | `eraserBomb` | 지우개 폭탄 | Thrown splash bomb |

| 13 | `chibiko` | 치비코 | Companion follower that throws pencils |
| 14 | `sharkMissile` | 상어미사일 | Slow smart homing missile for dense zombie groups |

## Runtime Component Map

| Weapon key | Component |
| --- | --- |
| `pencilThrow` | `PencilThrow` |
| `schoolBag` | `SchoolBagSwing` |
| `tumbler` | `TumblerOrbit` |
| `scienceFlask` | `ScienceFlaskSplash` |
| `bell` | `BellShockwave` |
| `stunGun` | `StunGunWeapon` |
| `onigiri` | `OnigiiriWeapon` |
| `guidedMissile` | `GuidedMissile` |
| `starlink` | `StarlinkWeapon` |
| `compassBlade` | `CompassBladeWeapon` |
| `umbrellaGuard` | `UmbrellaGuardWeapon` |
| `eraserBomb` | `EraserBombWeapon` |
| `chibiko` | `ChibikoWeapon` |
| `sharkMissile` | `SharkMissileWeapon` |
