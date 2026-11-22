// Stage 3 escape → Nikuo's Sltera racer bonus (Terry 2026-11-22).
// After a Stage 3 escape the run's ranking write waits for the Nikuo choice:
//   「타지 않습니다」 → bonus 0, 「탑니다」 → racer kills × 1 point added to the Stage 3 run score.
// Kills count even when the racer did not reach the cafeteria.
//
// The kill count comes from the racer iframe (client-side), so it is clamped to the most zombies the
// 'gym-to-cafeteria' course can ever spawn. Derived from the racer (sltera_racer_20261122/index.html,
// STAGES[3]): finish 4000 m, groups spawn while nextZ <= finish - 40 (3960 m) starting at nextZ 160,
// gap = 0.6 × max(28, 75 - d/120) with d <= finish + 48 → smallest gap 24.76 m → at most 154 groups;
// group size = 1 + floor(rnd × min(6, 2 + d/900)) <= 6. 154 × 6 = 924.
// If the course length or spawn rule changes, re-derive this number.
export const SLTERA_RACER_STAGE_ID = 'stage3'
export const SLTERA_RACER_MAX_KILLS = 924
export const SLTERA_RACER_POINTS_PER_KILL = 1

// Non-integer, negative, NaN or missing → 0; anything above the course maximum → the maximum.
export function clampSlteraRacerKills(value) {
  const kills = Number(value)
  if (!Number.isFinite(kills) || kills <= 0) return 0
  return Math.min(SLTERA_RACER_MAX_KILLS, Math.floor(kills))
}

export function getSlteraRacerBonus(racerKills) {
  return clampSlteraRacerKills(racerKills) * SLTERA_RACER_POINTS_PER_KILL
}
