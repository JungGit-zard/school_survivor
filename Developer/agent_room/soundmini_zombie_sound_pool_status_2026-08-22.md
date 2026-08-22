# Sound_Mini — Zombie sound pool status / Terry correction

Date: 2026-08-22 KST
Project: Escape! zombie school
Scope: Zombie SFX / death pseudo-voice / action-point random sound pools
Status: handoff note before further implementation

## 1. Current generated zombie death voices

Generated source assets currently exist under:

`Developer/r3f_prototype/public/sfx/enemies/`

Five zombie death voice IDs were generated, each with `.ogg` and `.mp3` fallback:

1. `zombieDeathGrunt`
2. `zombieDeathHeavy`
3. `zombieDeathShriek`
4. `zombieDeathGurgle`
5. `zombieDeathBellow`

Files:

- `zombieDeathGrunt.ogg`
- `zombieDeathGrunt.mp3`
- `zombieDeathHeavy.ogg`
- `zombieDeathHeavy.mp3`
- `zombieDeathShriek.ogg`
- `zombieDeathShriek.mp3`
- `zombieDeathGurgle.ogg`
- `zombieDeathGurgle.mp3`
- `zombieDeathBellow.ogg`
- `zombieDeathBellow.mp3`

Verified earlier:

- `public/sfx/enemies`: 5 unique death IDs / 10 files
- `dist/sfx/enemies`: 5 unique death IDs / 10 files
- `android/app/src/main/assets/public/sfx/enemies`: not yet synced to the new 5-ID set; old `zombieDeath.ogg/mp3` was still present at last check

## 2. Current implementation state before correction

The implementation currently has a type-based dispatch file:

`Developer/r3f_prototype/src/lib/enemyDeathSfx.js`

It maps enemy types to specific death sounds, e.g. ordinary zombies to `zombieDeathGrunt`, heavy zombies to `zombieDeathHeavy`, runners to `zombieDeathShriek`, etc.

Call sites observed earlier:

- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`

Registry observed earlier:

- `Developer/r3f_prototype/src/lib/sfxRegistry.js`

## 3. Terry correction — required design change

Terry explicitly corrected the design:

Do **not** assign zombie death sounds by zombie species/type.

Required behavior:

- For the death action point, every zombie type uses the same death sound pool.
- When any zombie dies, choose randomly from all death voices in that pool.
- Purpose: when many zombies die in a group, multiple death voices mix randomly instead of repeating one type-bound sound.

Correct model:

```text
zombie death event
→ choose random sound from zombie death pool
→ play it
```

Incorrect model:

```text
E01 → zombieDeathGrunt
E02 → zombieDeathHeavy
E03 → zombieDeathShriek
...
```

## 4. Generalized rule for other zombie action points

This is not only for death.

For every zombie action/situation point, sounds should be grouped by action point, not by zombie species, unless Terry explicitly asks for a special-case identity cue.

Examples:

```text
zombie death point
→ random from all death-point zombie sounds

zombie spawn point
→ random from all spawn-point zombie sounds

zombie attack/roar point
→ random from all attack/roar-point zombie sounds

zombie hit/reaction point
→ random from all hit/reaction-point zombie sounds
```

Action-point pools are canonical. Type-specific mapping is not canonical for normal zombie SFX variation.

## 5. Next implementation target

Replace the current type-bound death dispatch with a random pool selector.

Likely code direction:

- Keep the 5 generated death sound IDs in `SOUND_MAP`.
- Replace or refactor `enemyDeathSfx.js` so it exposes a death pool selector rather than type mapping.
- Update `Enemy.jsx` and `Enemies.jsx` to emit a random death sound from the shared pool.
- Keep Matilda/boss special sounds only if they are intentional non-normal-zombie exceptions; confirm or treat them as separate boss/Matilda action pools.
- Add/adjust tests so they assert:
  - all normal zombie deaths draw from the same 5-ID pool,
  - no normal zombie type has a fixed death sound,
  - both death call sites use the shared selector,
  - generated assets exist in `.ogg` and `.mp3`,
  - Android assets are synced before AAB release.

## 6. Android sync reminder

Before any Android/AAB claim, run build/sync and verify that the new 5 death IDs exist under:

`Developer/r3f_prototype/android/app/src/main/assets/public/sfx/enemies/`

Do not claim Android/AAB readiness while only `public`/`dist` have the new sounds.
