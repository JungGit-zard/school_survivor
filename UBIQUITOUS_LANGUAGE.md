# Ubiquitous Language

## Gameplay spatial units

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Zombie Meter (zm)** | A fixed gameplay distance unit equal to 0.75 world units, rounded from the 2026-07-26 E01 ground collider footprint. | Live model meter, Studio meter, visual meter |
| **World Unit** | The Three.js gameplay-coordinate distance used by targeting and movement calculations. | Pixel, screen unit |
| **Pencil Firing Circle** | The inclusive player-center-to-enemy-center circle within which Pencil Throw may select a target. | Pencil diameter, pencil reach |
| **Base Range** | The canonical catalog radius before an explicit runtime modifier is applied. | Default diameter, visual size |
| **Range Buff** | An explicit runtime override or modifier that takes priority over Base Range without changing the Zombie Meter. | Unit conversion, model scale buff |

## Canonical measurements

| Measurement | Canonical value | Meaning |
| --- | --- | --- |
| **Zombie Meter** | 0.75 World Units | Fixed gameplay unit; it does not follow later E01 model or Studio scale changes. |
| **Pencil Firing Circle diameter** | 6zm | Full width of the base targeting circle. |
| **Pencil Firing Circle radius** | 3zm | Player-center-to-enemy-center Base Range. |
| **Pencil Base Range** | 2.25 World Units | `3zm × 0.75`; targets exactly at the boundary are eligible. |

## Relationships

- One **Zombie Meter** always equals 0.75 **World Units**.
- One **Pencil Firing Circle** has a diameter of 6zm and a radius of 3zm.
- A **Pencil Firing Circle** uses player-center-to-enemy-center distance and retains line-of-sight exclusion.
- A **Range Buff** overrides the runtime radius of one **Pencil Firing Circle** but does not alter its **Base Range** or the **Zombie Meter**.

## Example dialogue

> **Dev:** "Is a target at exactly 2.25 **World Units** eligible for the **Pencil Firing Circle**?"

> **Domain expert:** "Yes. The 3zm **Base Range** is inclusive, provided the target has line of sight."

> **Dev:** "If a later model change makes E01 look wider, does one **Zombie Meter** change?"

> **Domain expert:** "No. **Zombie Meter** is a fixed gameplay unit, not a live visual measurement."

> **Dev:** "Does a Chibiko **Range Buff** redefine the 6zm circle?"

> **Domain expert:** "No. It changes the runtime radius after **Base Range**; the canonical 6zm/3zm definition remains intact."

## Flagged ambiguities

- "Range" can mean a radius or a diameter. Canonical usage: **Pencil Base Range** is a radius; the **Pencil Firing Circle** diameter is explicitly 6zm.
- "Distance to an enemy" can mean center distance or collider-edge distance. Canonical usage: target eligibility uses player center to enemy center distance.
- "Base range" and "range buff" are distinct. **Base Range** comes from the catalog; an explicit **Range Buff** takes precedence at runtime.
- "Zombie meter" must not mean visual/model scale. **Zombie Meter** remains fixed after model or Graphics Studio changes.
