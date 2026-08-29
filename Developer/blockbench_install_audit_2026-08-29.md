# Blockbench Windows installation audit

- Date: 2026-08-29 (Asia/Seoul)
- Kanban card: `t_5a2d9429` (`escape-zombie-school`, assignee `threemini`)
- Scope: install and verify Blockbench only. No project source, Firebase, browser, or Blender settings were changed.

## Pre-install state

- `blockbench` / `Blockbench` command: not found.
- Uninstall registry entries matching Blockbench: none.
- Candidate executable paths: absent.
- Start Menu shortcuts matching Blockbench: none.

## Official source and package verification

- Official release metadata: [Blockbench GitHub release v5.1.6](https://github.com/JannisX11/blockbench/releases/tag/v5.1.6), published 2026-07-25T12:33:41Z, not a draft or prerelease.
- Official x64 Windows installer URL: `https://github.com/JannisX11/blockbench/releases/download/v5.1.6/Blockbench_x64_5.1.6.exe`
- Asset size: `104,793,200` bytes.
- SHA-256 measured locally: `FB209EBF7BE3A2B077EE0D2A817A31E2CA8E837E4F42C714FC7659C414ECE5ED`.
- Official updater manifest: `https://github.com/JannisX11/blockbench/releases/download/v5.1.6/latest.yml`
- Official manifest SHA-512 (Base64): `9Y12caHORYkh6usRFIpUJZBZgLg/9eSFau0eeC43N6BSgehRpQAEi0dzuY412vmCVIJOzS/vvSMnc+6rbsZuOA==`.
- Measured SHA-512 matched the official manifest exactly.
- Authenticode verification: `Valid`.
- Signer: `CN=Jannis Tobias Petersen, O=Jannis Tobias Petersen, S=Schleswig-Holstein, C=DE`.
- Signer thumbprint: `C58B108F74F9778617E7419693180E2C5E8CCBCD`.

## Installation and post-install verification

- Installation mode: official installer, silent current-user installation (`/S`).
- Installer exit code: `0` at `2026-08-29T17:06:38.7380426+09:00`.
- Installed executable: `C:\Users\admin\AppData\Local\Programs\Blockbench\Blockbench.exe`.
- File version: `5.1.6`; product version: `5.1.6.0`.
- Installed executable Authenticode status: `Valid` (same Jannis Tobias Petersen signer).
- Uninstall registry entry: `Blockbench 5.1.6`, publisher `JannisX11`, current-user uninstall command present.
- Start Menu shortcut: `C:\Users\admin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Blockbench.lnk`, targeting the installed executable.

## Notes

- A separate incomplete generic-installer download existed only under the task-specific temporary directory. It was not executed or used. The verified x64 installer above was the only installer executed.
- No commit or push was performed.

## 2026-08-29 Blockbench GUI export smoke follow-up

- A GUI-only Generic Model creation was confirmed in Blockbench: the project was named `blockbench_ui_smoke` and the confirmed document title was `● blockbench_ui_smoke - Blockbench`.
- The Orca Windows GUI provider subsequently made the Blockbench window off-screen while handling the menu surface. Its accessibility tree did not expose the required File Export menu action, so a trustworthy `File > Export > glTF 2.0` operation could not be completed.
- No `.bbmodel`, source `.glb`, pipeline final `.glb`, or validator result is claimed for this follow-up. Blockbench was closed. The temporary smoke directory contains no accepted product asset.
