# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Graphics Studio visual state

### Applied Studio Snapshot

The exact reviewed set of root, part, and group visual tuning values accepted for a Studio item, including opaque keys that have not yet been migrated to stable semantic identifiers.

An Apply action is not by itself proof of remote durability; durability requires a versioned canonical store and an auditable publication result.

### Forbidden Local Studio Seed

Any source-controlled snapshot, `sourceRevision`, browser `localStorage` payload, bundled default, temporary JSON, or other local fallback used to initialize, recover, repair, migrate, or replace Graphics Studio input values.

This entire methodology is a fatal bug. It must never be used as a release input, recovery boundary, migration source, or substitute for Firebase.

### Visual Canonical State

The Firebase-held visual snapshot whose revision and integrity are verified by Studio, title, and gameplay consumers before use.

If Firebase cannot provide a valid current snapshot, consumers fail closed. They never reconstruct or replace it from local data.

### Release Parity Gate

The release check that records browser rendering, source revision, packaged-code inclusion, and Android WebView/device rendering as separate evidence gates for the selected visual state.

Browser rendering and AAB-internal code inclusion do not by themselves prove Android WebView or physical-device render parity.

## Relationships

- A Forbidden Local Studio Seed must never contain or replace the active Applied Studio Snapshot.
- A Visual Canonical State contains the Firebase-held Applied Studio Snapshot and cannot be created from local data.
- A Release Parity Gate remains incomplete for Android visual parity until emulator or physical-device WebView execution evidence exists, even when browser rendering and packaged-code inclusion have passed.
