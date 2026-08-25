# Handoff — Mobile slowdown on v48

**For:** Hana (verification)
**From:** Claude (Orca session, 2026-08-25 → 2026-08-26)
**Written:** 2026-08-26 08:19 KST
**Repo state at writing:** `zombie_only` @ `a06ee33`, working tree clean, pushed to `origin/zombie_only`
**Scope of this document:** handoff only. No code was edited while writing it.

---

## 1. The symptom Terry reported

Verbatim: *"모바일에서 전보다 게임이 느리다. 의심부분 검사해줘, 스테이지 들어가면 일단 느려"*

Three things to hold onto, because they drove the whole diagnosis:

- **Mobile only.** No desktop complaint was made.
- **Regression, not a baseline problem.** "전보다" — it used to be faster.
- **On stage entry.** Not a slow build-up over a run; slow from the moment a stage loads.

No frame rate, device model, or build number accompanied the report.

---

## 2. What was requested, and what was implemented

Terry asked for an inspection, then chose a fix from three options presented:

1. **Bake the color zones into the floor** ← chosen
2. Reduce spotlights from 3 to 1
3. Disable the lighting on mobile only

Terry's instruction: *"1번으로 진행해. 색 구역을 바닥 텍스처/버텍스 컬러로 굽는 방식으로 구현하고, 테스트/빌드 후 커밋·푸시까지 해."*

**Implemented:** the three real-time `spotLight`s were deleted and their color zones re-created as a baked texture in the floor material's `lightMap` slot.

---

## 3. Commits

### The regression (what made it slow)

| Commit | Effect on spotlight count |
|---|---|
| `dae8986` | 0 → **3** per stage — `StageLighting.jsx` introduced |
| `20573e4` | 3 — positions finalized |
| `62dffc1` | 3 — colors separated |
| `6649819` | 3 — color zones strengthened |
| `2b77f50` | 3 — **intensity only** (92–105 → 168–190). Cost-neutral. |

Only stages 1, 2, 3 ever received a lighting profile. Stage 4 never had one.

### The fix

| Commit | Content |
|---|---|
| `1ed60ab` | **Bake stage lighting into classroom floor** — the fix |
| `f4073ea` | Record AAB v48 release build |
| `a06ee33` | Record how the stage color zones were baked (documentation only) |

**`1ed60ab` precedes `f4073ea`, so the fix is inside the v48 bundle.**
v48 = `versionCode 48` / `versionName "1.0.25"` — `Developer/r3f_prototype/android/app/build.gradle:16-17`

### Files changed by `1ed60ab`

| File | Change |
|---|---|
| `src/lib/stageFloorLightBake.js` | **new** — the bake (213 lines) |
| `src/lib/stageFloorLightBake.test.js` | **new** — 154 lines |
| `src/components/StageLighting.jsx` | **deleted** — the only place in `src/` that created a spotlight |
| `src/components/StageLighting.test.js` | **deleted** |
| `src/components/Game.jsx` | mount + import removed |
| `src/components/ClassroomFloor.jsx` | bake wired into the floor material |
| `src/components/Game.stageLighting.test.js` | rewritten as the zero-spotlight regression guard |
| `src/components/ClassroomFloor.test.jsx` | one assertion string |
| `android/app/build.gradle` | versionCode bump |

`src/lib/stageLightingProfile.js` and its test were **not** modified — the profile stays the single canonical source of positions and colors, and its test passes unchanged.

All paths are relative to `Developer/r3f_prototype/`.

---

## 4. Why this should help mobile performance

### The mechanism

Three.js compiles light counts into the shader as `#define NUM_SPOT_LIGHTS`. Going 0 → 3 means:

1. **Per-pixel cone math.** Every fragment gains three distance attenuations and three `smoothstep` cone falloffs.
2. **A dependent texture fetch per light.** The game shades with `MeshToonMaterial` + gradient map, so each light adds a gradient lookup — three more per fragment.
3. **The floor fills the viewport.** That makes items 1 and 2 a full-screen fill-rate cost, which is the weakest axis on mobile GPUs and the axis desktops barely notice.
4. **Shader recompilation on stage entry.** Changing the light count changes every material's program key, so all materials recompile when a stage loads. **This is the most direct explanation for "slow the moment you enter."**

`GameCanvas.jsx:20-24` sets `dpr={[1, 1.5]}`, so on a high-DPI phone every per-pixel cost above is paid over 2.25× the pixels of a dpr-1 render.

### Why the bake removes that cost

A `lightMap` is sampled once as indirect irradiance. It adds one texture read to the floor material and **zero** draw calls, and it leaves `NUM_SPOT_LIGHTS` at 0 — so the per-fragment lighting loop returns to what it was before the regression.

### Why the bake is faithful

The bake replicates three r164's actual SpotLight math on the floor plane rather than approximating it:

- `angle` → `coneCos`
- `penumbra` → `smoothstep(coneCos, cos(angle*(1-penumbra)), angleCos)`
- `distance` → `1/max(d²,0.01) × (1-(d/cutoff)⁴)²`

In r164 the direct term is `irradiance * BRDF_Lambert(diffuseColor)`, and `lights_fragment_maps` feeds lightMap irradiance into the same `RE_IndirectDiffuse_Lambert` expression — so the same value produces the same picture.

Resolution is 256×256, baked once per stage. An 8-bit canvas only carries 0–1 but the peaks exceed it (3.407 / 3.735 / 2.855), so the canvas is peak-normalized and the peak is handed back as `lightMapIntensity`.

`emissiveMap` was rejected because it adds instead of multiplying albedo — the color would float above the tile pattern. An overlay quad was rejected because it reopens the render-order bug class this repo already hit on the stage 3 court lines. Vertex colors were rejected because stages 2 and 3 draw a 200×200-unit floor plane while the color pools are 6–8 units across; a smooth gradient would have needed roughly 160k quads.

---

## 5. Confirmed / Assumed / Unverified

### Confirmed — read from the repo, or a command was run

- `StageLighting.jsx` is deleted. `Game.jsx:176-181` holds only the pre-regression rig.
- **Scene light inventory:**

  | Light | Before regression | During regression | v48 |
  |---|---|---|---|
  | ambientLight | 1 | 1 | 1 |
  | directionalLight | 2 | 2 | 2 |
  | **spotLight** | **0** | **3** | **0** |

- `grep -rn "spotLight\|SpotLight" src/ --include=*.js --include=*.jsx | grep -v "\.test\."` returns exactly one hit: a **comment** at `ClassroomFloor.jsx:242`.
- One `<pointLight>` remains at `EscapePortal.jsx:158`. It predates the regression and only mounts while the escape portal is on screen, so it is not part of stage-entry cost.
- **Regression guard:** `Game.stageLighting.test.js:29` walks all of `src/` (excluding test files) and fails if any file constructs a spotlight, by `<spotLight` tag or `new THREE.SpotLight`. **This is the single pass/fail line for the whole fix.**
- A test asserts none of the profile's color strings appear in the bake file, so the values cannot be duplicated back in.
- `2b77f50` changed brightness only. Shader cost is set by light *count*, so that commit moved performance in neither direction.
- Line endings clean: `git show --numstat 1ed60ab` and `git show --numstat --ignore-cr-at-eol 1ed60ab` are byte-identical; `git ls-files --eol` reports `i/lf w/lf` on all touched files.

### Assumed — mechanism reasoning, never timed

- **That those three spotlights are what Terry felt.** Section 4 is an argument from how Three.js compiles and shades. It is consistent with "mobile only" and with "on stage entry," but no measurement links them.
- **The magnitude is unknown.** Whether this cost 5 FPS or 30 was never established.
- **Other candidates were ruled out by reasoning, not profiling:**

  | Candidate | Why set aside |
  |---|---|
  | Stage 3 reinforcement waves | Starts at 150 s, stage 3 only; symptom is immediate and on every stage |
  | Chef ingredient projectiles | Stage 4 only; stage 4 has no lighting profile |
  | Faceted low-poly graphics | Rolled back in `28f276f` before v48 |
  | `lightingQaHarness.jsx` | Not imported anywhere, so it never enters the bundle |

  If the phone is still slow on v48, all four go back on the table.

### Unverified — nobody looked

- **No physical device was used at any point.** No FPS, frame time, GPU trace, draw-call count, or program count was captured on hardware.
- **The in-game view was never seen.** Reaching a stage requires Google sign-in, and the assistant does not sign in on Terry's behalf. The baked canvases were rendered to PNG and inspected directly — all three stages show back/center/front pools at the profile's target positions, in the profile's colors, with soft edges, inside the arena bounds — but that is a texture inspection, not the game.
- **How any of it reads in motion is unknown.**

---

## 6. Remaining visual differences

These are certainties, not guesses. A lightMap only affects the surface it is mapped to.

1. **The color now lands on the floor only.** The old spotlights tinted whatever stood in them — zombies, the player, props, the stage 3 arena walls. **A character walking into the blue zone no longer turns blue.** This is the largest visual change.
2. **No vertical gradient.** The wash that crept up the stage 3 wall bases is gone.
3. Stage 2's rear magenta pool has a slightly hard far edge because `distance: 16` clips it before the cone does. **The original spotlight did the same** — faithful reproduction, not a new defect.
4. Texel interpolation puts pool edges within 2–5% of the analytic value at sampled centers, from texel-center offset rather than 8-bit quantization.

---

## 7. Commands run

All from `Developer/r3f_prototype/`.

```bash
npx vitest run \
  src/lib/stageFloorLightBake.test.js \
  src/lib/stageLightingProfile.test.js \
  src/components/Game.stageLighting.test.js \
  src/components/ClassroomFloor.test.jsx
# 2026-08-25 result: Test Files 4 passed (4) | Tests 35 passed (35)
```

```bash
npm run build
# ✓ built
# Legacy B02 artifact gate passed (dist).
# Hosting JavaScript asset verification passed (59 assets checked).
```

```bash
# Zero-spotlight evidence
grep -rn "spotLight\|SpotLight" src/ --include=*.js --include=*.jsx | grep -v "\.test\."
# → one hit, a comment at ClassroomFloor.jsx:242
```

### Pre-existing failures — do not misread these as fallout

A **full** suite run fails **21 tests across 14 files**. These were proved to predate this work: clean `HEAD` was exported read-only with `git archive HEAD` into a temp directory and the same 14 files were re-run there — **identical 14 files, identical 21 failures, identical line numbers**.

They cluster on Firebase fail-closed, title `playerVisualReady`, prop placement, and weapon upgrades. **None reference `Game.jsx`, `Floor`, `ClassroomFloor`, or the bake.**

---

## 8. Phone checks still outstanding

Run in order. The first two decide whether the case is closed.

1. **Compare v47 against v48 on the same handset.** Same device, same stage, same battery and thermal state — a warm phone throttles and will fake a regression. Enter stage 1 and hold still for 30 s in each build.
   *Expect: v48 matches or beats v47. If v48 is still worse, the spotlights were not the whole story.*

2. **Separate the entry hitch from the sustained rate.** Different causes, different fixes. Time the freeze at the transition into a stage, then measure steady-state FPS once play has settled.
   *Expect: the entry hitch improves most, since shader recompilation is what caused it.*

3. **Walk stages 1, 2, 3 — and stage 4 as a control.** Stage 4 never had a lighting profile, so it should be unchanged between builds. **If stage 4 also got slower, the cause is something else entirely.**

4. **Sit in stage 3 past the 150-second mark.** The boss-phase reinforcement adds 195 zombies over 15 waves from 150 s to 300 s. Separate, later load; nothing to do with lighting; never measured on a phone.

5. **Capture numbers, not impressions.** If the build is a WebView, attach Chrome DevTools over USB (`chrome://inspect`) and read the Performance panel plus `renderer.info`.
   The two counters that settle this report: **programs** (should stop spiking at stage entry) and **draw calls** (should be unchanged — the fix removed lights, not geometry).

---

## 9. Remaining risks

Roughly ordered by potential cost. The first is larger than the bug this handoff is about, and it is not new.

- **Shadow mapping is on, with real casters.** `shadows` is enabled on the canvas (`GameCanvas.jsx:22`) and at least three things cast: walls at `ClassroomFloor.jsx:325`, `DogeMesh.jsx:28`, `TreasureChest.jsx:46`. A shadow map renders every frame — an extra depth pass plus a per-pixel lookup. **Predates the regression, so not the cause of what Terry felt.** Likely the single largest remaining mobile cost, and never measured.

- **Enemy cap silently drops spawns.** `Enemies.jsx:1511` stops a batch with `break`, not `continue`, when the 150-enemy ceiling is hit — the rest of that batch is discarded with no retry and no log. Static projection puts stage 3 at 154 enemies by 200 s with zero kills, so the ceiling is reachable in normal play. **A correctness question as much as a performance one:** the reinforcement waves may not be delivering what the design specifies.

- **Unrelated but outstanding: the stage 3 boss ultimate is broken.** Reported from real play, not a performance issue. The shuttle-run ultimate teleports the boss to the arena edge on its first active frame, draws its warning line at the player's Z while the boss runs along its own Z, and plays a frozen pose. Causes are identified; **no fix has been written.**

- **Build artifact:** the AAB build path leaves a 0-byte `NUL` file in the repo root on Windows. It was removed; the tree is clean. Worth knowing so it is not mistaken for a tracked file.

---

## 10. Where things are

| Item | Path / URL |
|---|---|
| **This handoff** | `Developer/agent_room/handoff_mobile_slowdown_v48_2026-08-26_0819.md` |
| Published audit page | https://claude.ai/code/artifact/be2e56eb-de5c-4488-a7f3-ccffc99bd553 |
| Bake implementation record | `Developer/agent_room/threemini_stage_lighting_bake_2026-08-25.md` |
| v48 build record | `Developer/.../aab_build_v48_2026-08-25.md` |
| The bake | `Developer/r3f_prototype/src/lib/stageFloorLightBake.js` |
| Color-zone canon | `Developer/r3f_prototype/src/lib/stageLightingProfile.js` |
| Regression guard | `Developer/r3f_prototype/src/components/Game.stageLighting.test.js` |
