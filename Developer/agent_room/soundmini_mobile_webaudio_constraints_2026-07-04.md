# Sound_Mini — Mobile WebAudio Constraints

Date: 2026-07-04 10:57 KST  
Project: Escape! zombie school  
Scope: Low-spec mobile browser audio policy and implementation constraints. No game code modified.

## Source-backed rules

- Mobile/browser audio must assume autoplay restrictions. Unlock/resume audio only from a user gesture such as Start, first tap, or first click.
- Use one shared `AudioContext`; do not create one context per sound.
- `AudioContext.resume()` returns a Promise and should be called when the context is `suspended`.
- Some implementations may begin in `suspended`; code must handle `suspended`, `running`, and `closed` states.
- Audible autoplay is restricted in Chrome; iOS/WebKit policies are designed around user control, bandwidth, and battery. Do not rely on automatic BGM playback.

## Recommended MVP design

### Audio unlock

```js
let audioCtx = null;

export async function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  return audioCtx.state === 'running';
}
```

Bind this to the title/start button and first gameplay tap. BGM and SFX may be initialized after this succeeds.

### SFX manager policy

- Max simultaneous SFX voices: 6–8 for first low-spec target.
- Max identical overlap: 1–2.
- Cooldown for repeated events: 40–100 ms.
- Priority: `boss_warning/player_hit/low_hp` > `level_up/result` > `pickup/enemy_die` > decorative UI.
- Voice stealing: remove oldest low-priority voice first.

### Procedural-first SFX

Use WebAudio/ZzFX-style synthesis for first playable:

- `ui_click`: 20–60 ms square/triangle tick, fast decay.
- `pickup_xp`: short rising pitch blip, 80–160 ms.
- `player_hit`: downward pitch/noise burst, 120–240 ms.
- `enemy_die`: noise + down-sweep, 180–350 ms.
- `level_up`: 3-note arpeggio, 400–900 ms.
- `boss_warning`: low pulse or two-tone alarm, clear but short.

### Pseudo-voice

- Prefer abstract gibberish/blip synthesis over real-person voice imitation.
- 2–5 syllable envelopes, 60–180 ms each.
- Square/triangle oscillator, bandpass/lowpass, small random pitch variation.
- No cloned, celebrity, actor, or real-person imitation.

## QA checklist

- First tap unlock works on desktop Chrome/Edge.
- First tap unlock works on Android Chrome.
- First tap unlock works on iOS Safari/WebKit device if available.
- Mute before/after unlock prevents both BGM and SFX.
- Rapid player-hit spam does not exceed voice limit or distort.
- Background/foreground tab transition does not leave audio stuck.
- BGM never starts before user intent.

## Sources

- MDN Web Audio API best practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- MDN AudioContext.resume(): https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume
- Chrome autoplay policy: https://developer.chrome.com/blog/autoplay/
- WebKit iOS media policy: https://webkit.org/blog/6784/new-video-policies-for-ios/
- Web Audio API spec AudioContext: https://webaudio.github.io/web-audio-api/#AudioContext
