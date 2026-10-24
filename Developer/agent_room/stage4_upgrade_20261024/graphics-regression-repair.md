# Stage4 graphics regression repair — t_c4cc2f7d

Result: PASS for the requested focused regression file. Existing card continued; no duplicate card or worker created.

Reuse decision: existing threemini implementation owner repairs its stale graphics regression; independent QA remains root / Balance_QA. UI_Mini and other concurrent owners' files were not edited.

## Scope and root cause

Exact candidate: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024

Only source edit: Developer/r3f_prototype/src/components/EnemyVisual.test.js. Added the existing exported B04SoupBlastVisual import and replaced only the obsolete `circle.radius + 0.18` source-string assertion inside the existing B04 test. All other assertions/tests preserved.

Actual Enemy.jsx renders eight separated arcs with outer radius equal to circle.radius, not an expanded outline cylinder. The accepted 1.1-unit (0.275-block) damage boundary and supplied centers remain unchanged. No genuine product defect found or product edit made.

Replacement exercises the actual pure JSX-producing component in both telegraph and explode phases:
- Three supplied circles remain three marker groups at the supplied X/Z centers.
- Each marker has eight arcs, correct angular starts and positive sweeps smaller than the inter-segment angle (visible gaps).
- Outer radius equals the supplied radius; inner rim and inset fill stay inside it.
- Phase-specific outline/fill colors and fill opacity are preserved.
- Bowl plus three steam strokes remain; steam height distinguishes explosion from warning.
- Idle and empty-circle input render no marker.

This is a component-element/geometry contract, not browser/GPU visual acceptance, generated-circle gameplay count verification, or a new damage/timing test.

## Mandatory preflight

Read START_HERE, SOURCE_MANIFEST and all 15 listed content files completely. Mandatory checker ran with `-Profile threemini -Domain auto -TaskSummary 'graphics regression repair'`, exit 0; resolved common/graphics/qa. Read its additional required lounge-routing and faceted-geometry rollback documents. gstack gate: GSTACK_OK. Read Three_Mini TOML paths/learning, configured knowledge base and latest relevant Stage4 iteration. Loaded systematic-debugging and test-driven-development skills.

## Executed evidence

Working directory for both test runs: candidate/Developer/r3f_prototype.

Command: `npm test -- src/components/EnemyVisual.test.js`

Before repair: normal pretest gates passed; exit 1; 1 failed / 33 passed (34). Exact failure: expected Enemy.jsx source to contain `circle.radius + 0.18`, EnemyVisual.test.js:142.

After repair: normal pretest gates passed; exit 0; 1 file / 34 tests passed. Vitest duration 3.64 s. Normal lifecycle included branch guard, legacy B02 source gate, dialogue store gate (456 Korean IDs), and Studio-game sync source contract. No bypassed lifecycle or direct Vitest invocation.

Verified raw SHA256 after repair:
- EnemyVisual.test.js: 2ec342e0f7a15ad2a3c44b150d52796e1682acf5009a81855ae625ced3d4b053
- Enemy.jsx: dfcbfa657f8c5d5a8f5e229bfe9158bfa89525191406d962c075b8c400227576 — matches prior accepted implementation report.

No browser, explicit Git command, deploy, build, Firebase access, dependency installation, or product edit. The required npm pretest branch guard performed its normal read-only repository check. No other agent's work was reverted or overwritten.

Root-reported stageConfig/bossOnlyUnlock 12 failures identical to clean base were neither modified nor rerun; they are outside this repair. No full-suite PASS claim.

## Review and verified lesson

Reviewer: Three_Mini technical self-review; independent root / Balance_QA acceptance pending. Negative lesson: source strings naming superseded geometry are brittle; do not restore expanded geometry or weaken the test to mere string absence just to pass. Check the actual component's preserved gameplay-space radius/count/phase and new shape semantics.

Redaction: PASS, self-reviewed. Only source paths/hashes and aggregate test evidence recorded; no credentials, environment contents, account data or raw sensitive logs copied. A separate verified redacted learning iteration records this lesson under the configured Three_Mini knowledge directory.
