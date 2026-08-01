# Model Execution Tier Policy — 2026-08-01

## Agent Room routing evidence

- Board: `escape-zombie-school`
- Trigger: project-wide Sol / Terra / GPT-5.3 Codex Spark execution-tier policy update.
- Specialist: `madangsue` (Agent Room operations and policy hygiene).
- Artifact: this document records the required routing evidence for the policy update.

## Execution tiers

1. Sol is the Advisor: classify every user instruction first, design the work, and directly approve the final diff and test result.
2. Terra is the main implementation Worker: implement code and write tests.
3. GPT-5.3 Codex Spark is the lightweight executor: perform simple searches, mechanical repetition, and lightweight command execution.

If Spark is unavailable in the active tool list or its invocation fails, it must not be represented as available and no other model may be disguised as Spark. The user must be told: `Spark 미지원 → Terra 대행`.

Hermes/Kanban profiles such as `threemini`, `uimini`, and `madangsue` remain domain-specialist routing roles; they are separate from the execution-model tier.

## Verification

- gstack gate: `GSTACK_OK`.
- No implementation, Firebase, graphics, title, or audio scope was changed.
