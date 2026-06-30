# Far Death Fragment Fade Plan - 2026-06-30

## Goal

Make the farthest zombie death fragments disappear before they reach the screen edge.

## Decision

- Keep the existing scatter patterns and lifetimes.
- Only far-spread scatter fragments fade early.
- Normal fragments keep the shared collapse fade timing.

