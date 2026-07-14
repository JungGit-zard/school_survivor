# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Graphics Studio visual state

### Applied Studio Snapshot

The exact reviewed set of root, part, and group visual tuning values accepted for a Studio item, including opaque keys that have not yet been migrated to stable semantic identifiers.

An Apply action is not by itself proof of remote durability; durability requires a versioned canonical store and an auditable publication result.

### Source-Controlled Player Seed

An Applied Studio Snapshot for the player that is stored with application source so a fresh or older local Studio store can be initialized or migrated deterministically.

It is a release input and local recovery boundary, not a remote approval record; it does not provide server acknowledgement, administrator approval, cross-device synchronization, audit history, or server rollback.

### Source Revision

The monotonic migration level of a Source-Controlled Player Seed used to decide whether local player tuning data requires promotion or repair.

It is distinct from a Git commit identifier, a Firebase revision, and a release version.

### Visual Canonical State

The future server-held, administrator-approved visual snapshot whose revision and integrity are verified by Studio, title, and gameplay consumers before use.

Until that remote boundary exists, a Source-Controlled Player Seed plus release evidence can establish reproducibility for a build but does not constitute a Visual Canonical State.

### Release Parity Gate

The release check that records browser rendering, source revision, packaged-code inclusion, and Android WebView/device rendering as separate evidence gates for the selected visual state.

Browser rendering and AAB-internal code inclusion do not by themselves prove Android WebView or physical-device render parity.

## Relationships

- A Source-Controlled Player Seed contains one Applied Studio Snapshot and advances through Source Revisions.
- A Visual Canonical State contains an approved Applied Studio Snapshot but is not created merely by committing a Source-Controlled Player Seed.
- A Release Parity Gate remains incomplete for Android visual parity until emulator or physical-device WebView execution evidence exists, even when browser rendering and packaged-code inclusion have passed.
