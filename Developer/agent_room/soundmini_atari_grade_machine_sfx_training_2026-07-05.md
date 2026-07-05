# Sound_Mini Training — Atari-grade machine SFX expansion

Date: 2026-07-05 11:35 KST  
Project: Escape! zombie school  
Agent: `soundmini` / Sound_Mini / 사운드미니  
Scope: current implemented sound inspection + ultra-low-spec mechanical/procedural SFX research transfer

## 1. Current implementation inspected

Files inspected:

- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/src/lib/sfxRegistry.test.js`
- `Developer/r3f_prototype/public/sfx/**`

Current implementation summary:

- Runtime: Howler-based lazy `Howl` creation.
- Source strategy: OGG first, MP3 fallback by replacing `.ogg` with `.mp3`.
- Failure behavior: load error adds the ID to `_failed` and future calls silently skip; this is good for “sound must never block gameplay/login.”
- Auth/login guard: only `buttonClick` is allowed while `authOverlayActive` is true.
- Anti-spam: per-SFX cooldown exists for `zombieDeath`, `zombieHeavyDeath`, `playerHit`, `coinCollect`.
- Asset inventory observed: 124 files under `public/sfx` = 62 OGG + 62 MP3.
- Total observed SFX footprint: 763,782 bytes; OGG 496,995 bytes, MP3 266,787 bytes.
- Categories: weapons, enemies, player, UI, events.

## 2. Core training focus Terry requested

Sound_Mini must study and evaluate sound design by this yardstick:

> Starting from the almost Atari-grade basic machine sounds usually produced by Claude Code or OpenAI Codex agents, how far can we push expressive variety under the same extreme-low-spec constraints?

This means Sound_Mini should not simply ask for richer recordings. The default solution should be “use tiny primitive sounds better.”

## 3. Same-spec expression techniques

### A. Parameter variation before new files

For one tiny source or procedural patch, create families by varying:

- pitch/rate: ±3–12% for repeated hits, 0.6–1.4x for semantic variants,
- envelope: shorter attack for click/impact, longer decay for warning/portal,
- waveform: pulse/square for UI/mechanical, triangle/sine for soft reward, noise for zombie/hit/explosion,
- filter: low-pass for heavy/underwater/muffled, band-pass for voice/growl, high-pass for tiny UI ticks,
- layering: 2 voices max for important events, 1 voice for spam events,
- timing offset: 10–40ms secondary click/noise layer for impact depth.

### B. Semantic mapping for Escape! zombie school

- Pencil/ruler/basic school weapons: short pulse + tiny click; rate variation expresses material and force.
- Bell: pitch-stepped metallic ring, not long samples; use two decaying tones or existing `bellFire`/`bellHit` variants.
- Flask: noise burst + upward/downward pitch sweep; tiny bubbly/chemical identity without a recording.
- Stun gun: square pulse tremolo + noise crackle; short cooldown and low polyphony.
- Starlink fall/explosion: fall = descending sweep; explosion = noise burst + short low thump. Keep as special event, not spam.
- Zombie death/groan: noise + band-pass + low pitch; randomize pitch slightly to avoid clone repetition.
- Boss warning: distinctive interval or tick pattern, high priority, never hidden behind decorative SFX.
- UI click/coin/level-up: very short, clear, low CPU, auth-safe only for click.

### C. “Atari급 기계음” quality rubric

A sound is acceptable if it is:

1. readable: player understands the event without looking away,
2. tiny: no large decode/load budget for spam events,
3. stable: does not overlap into noise during mob swarms,
4. non-blocking: audio failure never breaks gameplay/login,
5. varied: repeated events get micro-variation instead of exact clones,
6. licensed: self-generated or license-safe.

## 4. Implementation checklist for future Sound_Mini work

- Keep `SOUND_MAP` IDs stable; add tests when adding critical SFX.
- For spam events, define cooldown and max overlap before asset polish.
- Prefer procedural runtime patches for UI, pickup, basic weapon, warning ticks, pseudo voice, and temporary prototype sounds.
- Keep file fallback only where exported assets are needed; consider generating small `.ogg/.mp3` pairs from the same procedural preset for release consistency.
- Add a parameter sheet before adding lots of files: ID, purpose, primitive recipe, pitch/rate range, cooldown, priority, fallback asset path, QA note.
- Maintain “auth overlay: no gameplay sound except tiny click acknowledgement.”

## 5. Useful verified source anchors

- ZzFX source says it is a tiny synth engine with 20 controllable parameters, playable via code, with a micro version under 1 KB: https://github.com/KilledByAPixel/ZzFX
- MDN Web Audio API best practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- sfxr: https://www.drpetter.se/project_sfxr.html
- Current project SFX registry: `Developer/r3f_prototype/src/lib/sfxRegistry.js`

## 6. Next concrete training tasks

1. Build `soundmini_sfx_parameter_sheet_2026-07-05.md` for at least 20 current SFX IDs.
2. Propose a procedural fallback module for prototype-only sounds without changing release behavior yet.
3. Ask `balanceqa` to verify readability/noise-fatigue after the parameter sheet exists.
4. If Terry requests implementation, route code changes through `soundmini` + relevant implementation profile and finish with `balanceqa`.
