# Marketing activation evidence ? 2026-10-04

Profile: madangsue, authorized GPT-6 substitute Worker. Kanban t_dd167112, asset handoff t_b6c9322b.

## Changes

- Copied three corrected Japanese candidates into the D campaign image pool using `_recovery_20261004.png` version filenames; preserved old images. Changed only the three Japanese variant imagePath values in posting_config.json. en/vi/ko nine candidates already match D byte-for-byte.
- Copied 30 rebuilt store PNGs (ko/en/ja, ten each) into matching D store_20261003 directories, only when absent. No existing file overwritten. These are rebuilt outputs, not proven lost-original bytes.
- Source evidence: C:/Users/admin/school-survivor-marketing-recovery-20261004/Graphic_designer/recovery_20261004/marketing_recovery_result_20261004.md and x_corrected_asset_manifest.json.

## Verification

- Test-XPostingVariants.ps1: VARIANT_TEST_OK.
- Test-FacebookDailyZombieSchoolPosting.ps1: FACEBOOK_POSTING_TEST_OK.
- X wrapper ValidateOnly cycle 2026-10-04-1800: validated_only, UI untouched, supplies in all four languages, Japanese corrected path.
- Test-XDailyZombieSchoolPostingRecovery.ps1: FAIL at temporary failure retries to completion. Existing fixture uses 2026-09-09 clock while implementation compares current wall clock inside retry loop. No unrelated test/runner rewrite performed.
- An attempted Test-XDailyZombieSchoolPosting.ps1 invocation failed because that file does not exist; actual additional test is the Recovery-named script above.

## Schedule readback 18:06 KST

Windows native tasks already enabled and Ready; no duplicate created and no scheduler modified:
- EscapeZombieSchool-XPosting: 09:00,12:00,18:00 +09:00 daily; action powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File D campaign Invoke-XDailyZombieSchoolPostingRecovery.ps1; next 2026-10-05 09:00 KST; last 2026-10-04 18:00 KST, result 1.
- EscapeZombieSchool-FacebookPosting: 11:00,17:00 +09:00 daily; action analogous D Invoke-FacebookScheduledPosting.ps1; next 2026-10-05 11:00 KST; last 2026-10-04 17:00 KST, result 1.
- Host timezone Korea Standard Time. Legacy Orca social automation IDs ba19ceae-6259-4e2e-bcbc-2b63b8e6b5ef and 77946dab-90c6-430f-af5b-1c2de50a12a4 remain disabled.

## Live blockers

- Facebook wrapper DiscoverWindow: No visible Chrome window exposes a Facebook tab.
- X native Initialize-XWindow: Expected one existing Chrome X window, found 0. Select -WindowId.
- Account identity and visible timelines cannot be verified. Stopped with zero Post clicks. No credentials/auth material accessed. No successful receipt fabricated.
- Facebook 2026-10-04-1700 immutable existing receipt has Japanese state selected, remaining three null, no post evidence; existing frozen old image path preserved. Current time outside 30-minute grace; no older-slot backfill.
- Four original images post_jp.png/post_eng.png/post_viet.png/post_ko.png are absent. Original remains in rotation; a future selection can fail even though all twelve bell/supplies/escape images exist. Did not silently map different-theme art to original copy.

No game/Firebase/title edits, commit, push, deletion, or schedule registration in this Worker turn. Live posting and end-to-end campaign recovery remain blocked.

## Follow-up original activation

Copied four missing original images from C to exact configured D paths without overwriting. Full rotation now has all sixteen files. Source/destination bytes and hashes match:
- ja: 1294353 bytes, SHA256 3fa1824f7f342cc242ea2fc7c771692af1f73fd2bcbfb474f73ec8b094f73c9d
- en: 1219851 bytes, SHA256 bc29e7ed4b0163ff946c1e4d1b55800baa3b4e850653e3d788235031225a8650
- vi: 1336891 bytes, SHA256 a70979179d5cbb33aa5ef3fd09ce5fcadef6d7bb425516c5c36661b5a62b2b7b
- ko: 1225995 bytes, SHA256 4408549068a901f08b5a8fc08cb1f68361c152c73cea212b66f6b4475e37e80e

Recovery test fixture now uses current KST time and same-day final slot, whose next-slot boundary remains future. Report receipt filename uses the cycle variable. Production runner and assertions unchanged. RECOVERY_TEST_OK, VARIANT_TEST_OK, FACEBOOK_POSTING_TEST_OK.

Live verification remains blocked: Facebook wrapper finds no Facebook tab. Separate visible Chrome X window launch was rejected by automatic execution policy; no workaround attempted. Required user action: open X and Facebook profiles in Chrome, log into @jungsilx and Hyun Uk Jung, and leave tabs visible. No publish clicks; all schedules preserved. Advisor handles scoped commit/push after review.
