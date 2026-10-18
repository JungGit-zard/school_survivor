# Ranking restoration and actual play time worker

- Board: `escape-zombie-school`; card: `t_0467d8a4`.
- Reuse decision: `backendmini` for ranking persistence/recovery, `uimini` for list presentation. Existing Advisor-assigned Codex worker `ranking_restore_ui` executes the disjoint scope; blocked mirror card prevents a duplicate daemon worker.
- Mandatory backendmini/uimini checkers and required documents read; gstack installation exists. No child worker or browser started. Commands run through hidden/pipe execution; no visible command window launched.
- Shared release: `C:/Users/admin/AppData/Local/Temp/stage-progress-p0-release-20261018`. Other worker source edits preserved. No commit/push/Hosting/Rules promotion by this worker.
- Exact source ownership: `src/lib/firebaseRanking.js`, `src/lib/userRanking.js`, `src/components/StageRanking.jsx`, `src/components/UserRanking.jsx`; focused corresponding tests and ranking locale keys. Additional Advisor-approved narrow scope: WeaponModal missing-record display, one Lobby WeaponModal prop hunk; persistence save warning locale keys supplied for core worker.
- Core worker owns `firebaseProgress.js`, `useAuthStore.js`, `useGameStore.js`, `database.rules.json`, actual game-event hooks, and `retryCloudProgress`. Required optional ranking `lastPlayedAt` rules were coordinated directly.
- User authorized restorative ranking writes; Advisor reviewed the exact 18-operation plan and separately authorized CAS/ETag application. Source values are existing ranking receipts or explicit gameplay activity; no guessed scores/counts/timestamps and no account metadata-only players.
- Evidence/report: `Quaility_Assurance/20261018_ranking_restore/README.md`. Private full snapshots/UID coverage stay outside Git. Actual restoration complete, follow-up plan zero operations. Existing period records and unrelated ranking data have identical hashes.
