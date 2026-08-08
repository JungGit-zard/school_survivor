# Dialogue ID raw-store fallback record

- Kanban card: `t_ff456a7e` (Hermes API fallback used after repeated `401 token_expired`).
- Runtime boundary: narrative text lives only in UTF-8 `src/dialogues/<locale>/*.txt`; gameplay/store carries `dialogueId`.
- Resolver: `getDialogueText`, `getPoolIds`, and `pickDialogueId` in `src/dialogues/dialogueStore.js` parse raw TSV without code evaluation.
- Failure behavior: missing IDs/locales return a visible nonempty ID fallback; React renders text nodes only.
- Preserved routes: Stage 1 generic students use `student.stage1.*`; Stage 2–4 fixed students use `investigation.student.stageN.*`; quest starts/completions, Matilda, and stage intro use stable IDs.
- Content gate: `scripts/assert-dialogue-store.mjs` always validates raw syntax, duplicates, and stable required IDs. `npm run verify:dialogue-targets` additionally requires 300 IDs for Stage 1 students and each of the 24 object pools; it remains intentionally failing until Spark bulk content work completes.
