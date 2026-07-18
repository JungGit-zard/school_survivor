# Casual Minigame Market Research - 2026-04-27

## Executive Direction

Escape! zombie school should be directed as a lightweight hybrid-casual mobile minigame:

- It should be instantly understandable, short-session, and easy to replay.
- It should have a simple survivor-like core loop with upgrades, pickups, and visible growth.
- It should create natural rewarded-ad moments, especially revive, double reward, extra upgrade choice, bonus chest, and post-run multiplier.
- It should avoid heavy asset loads, expensive rendering, large downloads, and long startup times.
- It should not depend on forced ads for basic enjoyment. Rewarded ads should feel like optional boosts.

## Market Findings

### 1. Hypercasual is not enough by itself

Current market commentary and reports point to a shift away from pure hypercasual toward hybrid-casual. The useful lesson is not to make the game complicated, but to add enough progression and retention hooks that players stay longer than one disposable session.

Implication for Escape! zombie school:
- Keep controls simple: movement plus auto attack.
- Add light progression: weapon unlocks, upgrade choices, collection, missions, school-themed goals.
- Keep each run immediately playable.

### 2. Hybrid-casual monetization is increasingly important

Sensor Tower's State of Mobile Gaming 2025 highlights rising hybrid-casual monetization, combining in-app purchases and ad monetization as an optimized strategy. Appodeal's 2025 casual benchmarks also emphasize that engagement and longevity are needed for ad-based monetization to work.

Implication for Escape! zombie school:
- Build the game around replay loops and upgrade choices before adding aggressive monetization.
- Rewarded ads should be designed around player desire, not random interruption.
- Future IAP can remain optional, but the first version can focus on rewarded-ad hooks.

### 3. Rewarded ads should be opt-in value exchanges

Google AdMob describes rewarded ads as a pull strategy: the user chooses to watch in exchange for a reward. This fits casual mobile games better than sudden interruption because it can preserve user trust and session flow.

Rewarded-ad opportunities for this project:
- Continue once after death.
- Double end-of-run coins or school supplies.
- Reroll or add one level-up upgrade choice.
- Open an optional bonus lunchbox/chest.
- Temporary magnet, heal, shield, or damage boost before a wave.

Guardrails:
- Never make the first clear impossible without ads.
- Avoid showing ads during active combat.
- Place ad prompts after failure, level-up pause, end-of-run reward, or between runs.
- Cap frequency so the game does not feel like an ad wrapper.

### 4. Lightweight mobile performance is a product requirement

Google Play warns users when compressed app download size is above 200 MB on mobile data. For a casual minigame, the product bar should be much stricter than the platform limit because download hesitation damages installs.

Implication for Escape! zombie school:
- Prefer simple 3D toon geometry, low texture count, and reusable materials.
- Avoid large imported models until the core loop proves retention.
- Keep startup fast and first play immediate.
- Watch bundle size, memory use, enemy count, draw calls, shader cost, and particle overdraw.

## CEO Review Checklist

When reviewing a feature, the CEO agent should ask:

- Is this instantly understandable to a casual minigame player?
- Does it improve the one-more-run loop?
- Does it create a fair reason to watch a rewarded ad?
- Does it avoid blocking progress behind ads?
- Does it keep sessions short, punchy, and replayable?
- Does it preserve the zombie-infected school identity?
- Does it keep mobile performance and download size light?
- Can a solo beginner project actually finish and tune it?

## Direction For Escape! zombie school

The game should move toward:

- 3-5 minute runs with fast restarts.
- Clear school survival fantasy.
- Strong hit feedback and readable upgrades.
- Rewarded-ad moments tied to player intention.
- Light meta-progression after each run.
- Small asset footprint and responsive mobile play.

The game should avoid:

- Large cinematic content before the core loop is proven.
- Heavy 3D assets that hurt mobile loading or FPS.
- Complex RPG systems before retention is validated.
- Forced ads that interrupt active combat.
- Monetization that makes non-ad players feel punished.

## Sources Checked

- Sensor Tower, State of Mobile Gaming 2025: https://sensortower.com/state-of-gaming-2025
- Sensor Tower, State of Mobile Gaming 2025 blog: https://sensortower.com/blog/state-of-mobile-gaming-2025
- Appodeal 2025 Mobile Casual Benchmarks coverage: https://gamingamericas.com/press-releases/2025/04/24/111395/appodeals-2025-mobile-casual-benchmarks-report-shows-hybrid-casual-games-significantly-outperforming-hypercasual-when-it-comes-to-ad-based-monetization/
- Google AdMob Rewarded Ads Playbook: https://admob.google.com/home/resources/rewarded-ads-playbook/
- Google AdMob rewarded ads for apps: https://developers.google.com/admob/android/rewarded
- Google Play app size guidance: https://support.google.com/googleplay/android-developer/answer/9859372
- Unity video ad best practices: https://docs.unity.com/acquire/en-us/manual/video-ads-best-practices
- AppsFlyer monetization coverage via GamesBeat: https://gamesbeat.com/mobile-games-see-high-returns-on-hybrid-monetization-models-appsflyer
