/* Sltera Coast Run - procedural audio (WebAudio only, no files, no CDN).
 * Public: window.SlteraAudio = { init, setEnabled, isEnabled, engine, crash, zombieHit,
 *   zombieDeath, checkpoint, gameOver, jump, land, pickup, skid, pause, resume }  (+ _render/_selftest for testing)
 * Usage: on the sound-toggle click -> SlteraAudio.init(); SlteraAudio.setEnabled(true);
 *        every frame -> SlteraAudio.engine(kmh, throttle01, braking)   (kmh < 0 or null = engine silent)
 * All synthesis: oscillators, one shared noise buffer, biquad filters, waveshapers, gain envelopes.
 */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  // ---------- tuning ----------
  var MASTER_VOL = 0.8, ENGINE_LEVEL = 0.3, SFX_LEVEL = 0.9;
  var GEAR_TOP = [0, 50, 92, 138, 185, 235, 295];   // km/h top of gear 1..6
  var RPM_IDLE = 800, RPM_MAX = 6800, RPM_LIMIT = 7100;
  var MAX_DEATH_VOICES = 4, MAX_HIT_VOICES = 6, MAX_CRASH_VOICES = 2;
  // formant tables (F1, F2, F3) Hz - generic vowel acoustics, not sampled from anything
  var V = { u: [300, 870, 2240], er: [490, 1350, 1690], e: [530, 1840, 2480], schwa: [500, 1500, 2500],
            o: [570, 840, 2410], a: [730, 1090, 2440] };
  var DEATHS = [
    { name: 'uurgh', f0: 175, f1: 100, dur: 0.55, v0: V.u, v1: V.er, gargle: 0.45, vib: 30 },
    { name: 'bleh',  f0: 235, f1: 150, dur: 0.32, v0: V.e, v1: V.schwa, gargle: 0, vib: 15 },
    { name: 'ohhh',  f0: 205, f1: 85,  dur: 0.62, v0: V.o, v1: V.u, gargle: 0, vib: 55 },
    { name: 'gwaa',  f0: 265, f1: 170, dur: 0.38, v0: V.u, v1: V.a, gargle: 0.3, vib: 25 }
  ];

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeCurve(n, fn) { var c = new Float32Array(n); for (var i = 0; i < n; i++) c[i] = fn(i * 2 / (n - 1) - 1); return c; }

  // ---------- one complete sound rig bound to a (live or offline) context ----------
  function createRig(ctx) {
    var sr = ctx.sampleRate;
    // final safety ceiling: linear to 0.6, soft above, hard max ~0.885 (-1.06 dBFS)
    var ceilCurve = makeCurve(2048, function (x) { var a = Math.abs(x); return a < 0.6 ? x : Math.sign(x) * (0.6 + 0.35 * Math.tanh((a - 0.6) / 0.35)); });
    var driveCurve = makeCurve(1024, function (x) { return Math.tanh(2.5 * x) / Math.tanh(2.5); });
    var crunchCurve = makeCurve(1024, function (x) { return Math.tanh(5 * x) / Math.tanh(5); });

    var master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
    var ceil = ctx.createWaveShaper(); ceil.curve = ceilCurve;
    master.connect(comp); comp.connect(ceil); ceil.connect(ctx.destination);
    var engBus = ctx.createGain(); engBus.gain.value = 0; engBus.connect(master);
    var sfxBus = ctx.createGain(); sfxBus.gain.value = SFX_LEVEL; sfxBus.connect(master);

    var noiseBuf = ctx.createBuffer(1, sr, sr);
    (function () { var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; })();

    // small helpers (event-time only, never per frame)
    function env(p, t, peak, atk, dec) {
      p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(peak, t + atk); p.exponentialRampToValueAtTime(0.0001, t + atk + dec);
    }
    function osc(type, f, t, end, dest) {
      var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end); return o;
    }
    function noise(t, dur, dest) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(dest);
      s.start(t, Math.random() * 0.5, dur); return s;
    }
    function gain(v, dest) { var g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
    function filt(type, f, q, dest) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (dest) b.connect(dest); return b; }
    function shaper(curve, dest) { var w = ctx.createWaveShaper(); w.curve = curve; w.connect(dest); return w; }

    // ---------- engine graph: heavy GT V8 (built once, params ramped per frame) ----------
    // body = sawtooth firing (f = rpm/15) tamed by a low low-pass; weight = sine f/2 + triangle f/4 (crank);
    // phone-speaker exciter = bass layer through an asymmetric shaper -> 2nd/3rd harmonics, high-passed;
    // lumpy idle = slow detune lope + AM burble that fades out as revs rise; a quiet sine 2f for a smooth top.
    var exciteCurve = makeCurve(1024, function (x) { return 0.75 * Math.tanh(1.6 * x) + 0.35 * x * x; });
    var E = {};
    E.shift = gain(1, engBus);                         // throttle-cut / rev-match (only touched by shift events)
    E.amp = gain(0.8, E.shift);                        // AM burble
    E.hp = filt('highpass', 38, 0.7, E.amp);           // drop sub-audible energy (wasted headroom)
    E.shelf = filt('lowshelf', 120, 0, E.hp); E.shelf.gain.value = 5;   // extra chest
    E.lpf = filt('lowpass', 450, 0.5, E.shelf);        // tames sawtooth fizz
    E.drive = shaper(driveCurve, E.lpf);
    E.mix = gain(0.5, E.drive);
    E.sawG = gain(0.22, E.mix); E.saw = osc('sawtooth', 50, 0, 1e9, E.sawG);
    E.bass = gain(1, E.mix);                           // bass bus (also feeds the exciter)
    E.sub = osc('sine', 25, 0, 1e9, gain(0.9, E.bass));
    E.crank = osc('triangle', 12.5, 0, 1e9, gain(0.4, E.bass));
    E.fund = osc('sine', 53, 0, 1e9, gain(0.5, E.bass));        // firing fundamental (idle body)
    E.smG = gain(0, E.mix); E.sm = osc('sine', 100, 0, 1e9, E.smG);
    E.exG = gain(0.3, E.lpf); E.exHp = filt('highpass', 95, 0.7, E.exG); E.ex = shaper(exciteCurve, E.exHp); E.bass.connect(E.ex);
    E.nG = gain(0.02, E.mix); E.nLp = filt('lowpass', 300, 0.7, E.nG);
    E.ns = ctx.createBufferSource(); E.ns.buffer = noiseBuf; E.ns.loop = true; E.ns.connect(E.nLp); E.ns.start(0);   // soft exhaust breath
    E.lfoG = gain(0.3, E.amp.gain); E.lfo = osc('triangle', 12, 0, 1e9, E.lfoG);
    E.lopeG = gain(25, E.saw.detune); E.lopeG.connect(E.sub.detune); E.lope = osc('sine', 1.3, 0, 1e9, E.lopeG);
    var es = { gear: 1, rpm: RPM_IDLE, lastT: -1, on: false, thr: 0, lastCrackle: -9 };

    // exhaust crackle/burble on lift-off and downshifts: short band-passed pops + low thuds
    function crackle(t, n, amt) {
      var bus = gain(0.5 * amt, sfxBus), hb = filt('bandpass', 1200, 0.9, shaper(crunchCurve, bus)), lb = filt('lowpass', 220, 0.8, shaper(crunchCurve, bus));
      for (var i = 0; i < n; i++) {
        var ct = t + 0.03 + Math.random() * 0.55 * (i + 1) / n, low = Math.random() < 0.45, g = ctx.createGain();
        g.connect(low ? lb : hb); env(g.gain, ct, low ? 0.9 : rnd(0.25, 0.6), 0.001, low ? rnd(0.04, 0.08) : rnd(0.008, 0.025));
        noise(ct, 0.09, g);
      }
    }
    function shiftEvent(t, up, thr, fOld) {
      var g = E.shift.gain; g.cancelScheduledValues(t);
      if (up) {
        g.setTargetAtTime(0.22, t, 0.03); g.setTargetAtTime(1, t + 0.17, 0.09);    // heavier, slower cut
        // "bwaap": throaty bark gliding from the old revs down to the new gear
        var bg = ctx.createGain(); bg.connect(shaper(driveCurve, gain(0.45 + 0.25 * thr, sfxBus)));
        bg.gain.setValueAtTime(0.0001, t + 0.05); bg.gain.exponentialRampToValueAtTime(0.8, t + 0.08); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        var lp = filt('lowpass', 900, 2, bg); lp.frequency.setValueAtTime(900, t + 0.05); lp.frequency.exponentialRampToValueAtTime(260, t + 0.32);
        var f0 = clamp(fOld * 0.5, 40, 260), b1 = osc('sawtooth', f0, t + 0.05, t + 0.36, lp), b2 = osc('square', f0 * 0.5, t + 0.05, t + 0.36, gain(0.6, lp));
        b1.frequency.exponentialRampToValueAtTime(f0 * 0.68, t + 0.3); b2.frequency.exponentialRampToValueAtTime(f0 * 0.34, t + 0.3);
        if (thr > 0.6 && Math.random() < 0.6) crackle(t + 0.04, 2, 0.6);
      } else {
        g.setTargetAtTime(1.35, t, 0.03); g.setTargetAtTime(1, t + 0.16, 0.08);    // rev-match blip
        if (t - es.lastCrackle > 0.5) { es.lastCrackle = t; crackle(t, 3 + Math.floor(Math.random() * 3), 0.8); }
      }
    }

    function engine(kmh, throttle, braking, when) {
      var t = when != null ? when : ctx.currentTime;
      if (kmh == null || kmh < 0 || !(kmh === kmh)) {
        if (es.on) { engBus.gain.setTargetAtTime(0, t, 0.08); es.on = false; }
        return;
      }
      var thr = clamp(+throttle || 0, 0, 1), v = kmh;
      var g = es.gear, shifted = 0, fOld = es.rpm / 15;
      if (g < 6 && v > GEAR_TOP[g]) { g++; shifted = 1; }
      else if (g > 1 && v < GEAR_TOP[g - 1] - 8) { g--; shifted = -1; }
      es.gear = g;
      if (shifted) shiftEvent(t, shifted > 0, thr, fOld);
      if (es.thr > 0.5 && thr < 0.2 && es.rpm > 2500 && t - es.lastCrackle > 0.8) {     // lift-off burble
        es.lastCrackle = t; crackle(t, 4 + Math.floor(Math.random() * 4), 0.6 + 0.4 * (es.rpm / RPM_LIMIT));
      }
      es.thr = thr;
      if (!shifted && t - es.lastT < 1 / 30 && es.on) return;   // throttle timeline writes to ~30 Hz
      es.lastT = t;
      var rpm = Math.max(RPM_IDLE + thr * (g === 1 ? 600 : 0), RPM_MAX * v / GEAR_TOP[g]);
      if (rpm > RPM_LIMIT) rpm = RPM_LIMIT - (Math.random() * 200);          // rev-limiter flutter
      es.rpm = rpm;
      var rn = (rpm - RPM_IDLE) / (RPM_LIMIT - RPM_IDLE), f = rpm / 15, il = (1 - rn) * (1 - rn);
      var tau = shifted ? 0.12 : 0.06, off = braking || thr < 0.2;
      E.saw.frequency.setTargetAtTime(f, t, tau);
      E.sub.frequency.setTargetAtTime(f * 0.5, t, tau);
      E.fund.frequency.setTargetAtTime(f, t, tau);
      E.crank.frequency.setTargetAtTime(f * 0.25, t, tau);
      E.sm.frequency.setTargetAtTime(f * 2, t, tau);
      E.lfo.frequency.setTargetAtTime(f * 0.25, t, tau);
      E.sawG.gain.setTargetAtTime(0.26 + thr * 0.08 + rn * 0.04, t, 0.08);
      E.smG.gain.setTargetAtTime(rn * rn * 0.07 * (0.5 + thr * 0.5), t, 0.1);
      E.exG.gain.setTargetAtTime(0.3 + thr * 0.15 + 0.9 * il * il, t, 0.1);   // more exciter at low revs so idle reads on phones
      E.nG.gain.setTargetAtTime(0.012 + thr * rn * 0.03, t, 0.1);
      E.nLp.frequency.setTargetAtTime(250 + rn * 450, t, 0.1);
      E.lfoG.gain.setTargetAtTime(0.06 + 0.32 * il, t, 0.1);
      E.lopeG.gain.setTargetAtTime(30 * il * il, t, 0.2);
      E.lpf.frequency.setTargetAtTime(clamp(380 + rn * 1100 + thr * 450 - (braking ? 150 : 0), 260, 2200), t, 0.08);
      var vol = (0.38 + rn * 0.26 + thr * 0.2) * (off ? 0.7 + 0.3 * il * il : 1);
      engBus.gain.setTargetAtTime(vol * ENGINE_LEVEL, t, es.on ? 0.07 : 0.2);
      es.on = true;
    }

    // ---------- voice caps ----------
    var live = { death: 0, hit: 0, crash: 0, skid: 0 };
    function track(kind, node) { live[kind]++; node.onended = function () { live[kind]--; }; }

    // ---------- crash: heavy double "kwang-kwang" crunch ----------
    function bang(t, amp, fHi, fLo, len) {
      var sh = shaper(crunchCurve, gain(0.55 * amp, sfxBus));
      var tg = ctx.createGain(); tg.connect(sh); env(tg.gain, t, 0.9, 0.004, len);
      var o = osc('sine', fHi, t, t + len + 0.05, tg); o.frequency.exponentialRampToValueAtTime(fLo, t + len * 0.8);
      var ng = ctx.createGain(); ng.connect(sh); env(ng.gain, t, 0.7, 0.002, len * 1.1);
      var lp = filt('lowpass', 3800, 0.7, ng); lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(260, t + len);
      noise(t, len * 1.2, lp);
      return o;
    }
    function crash(intensity, when) {
      var t = when != null ? when : ctx.currentTime;
      if (live.crash >= MAX_CRASH_VOICES) return;
      var i = clamp(intensity == null ? 1 : +intensity, 0, 1), amp = 0.5 + 0.5 * i;
      var o = bang(t, amp, 115, 36, 0.5);
      bang(t + 0.1 + rnd(0, 0.03), amp * 0.6, 95, 34, 0.35);
      // bent-metal clang: inharmonic square partials through a bandpass, quick decay
      var mg = ctx.createGain(); mg.connect(sfxBus); env(mg.gain, t, 0.10 * amp, 0.003, 0.35);
      var mb = filt('bandpass', 1300, 1.5, mg), k = rnd(0.9, 1.1);
      osc('square', 213 * k, t, t + 0.42, mb); osc('square', 347 * k, t, t + 0.42, mb); osc('square', 562 * k, t, t + 0.42, mb);
      // glass / debris tinkle grains
      var gb = filt('bandpass', 5200, 3, gain(0.16 * i + 0.04, sfxBus)), n = 3 + Math.round(i * 4);
      for (var j = 0; j < n; j++) {
        var gt = t + rnd(0.05, 0.4), gg = ctx.createGain(); gg.connect(gb); env(gg.gain, gt, 1, 0.001, rnd(0.02, 0.05));
        noise(gt, 0.06, gg);
      }
      track('crash', o);
    }

    // ---------- zombie run-over: punchy thud + comic bonk ----------
    function zombieHit(combo, when) {
      var t = when != null ? when : ctx.currentTime;
      if (live.hit >= MAX_HIT_VOICES) return;
      var p = 1 + Math.min(combo || 0, 12) * 0.05;
      var th = ctx.createGain(); th.connect(shaper(driveCurve, gain(0.8, sfxBus))); env(th.gain, t, 0.9, 0.002, 0.18);
      var o = osc('sine', 165 * p, t, t + 0.24, th); o.frequency.exponentialRampToValueAtTime(52, t + 0.13);
      var sg = ctx.createGain(); sg.connect(sfxBus); env(sg.gain, t, 0.45, 0.001, 0.035);
      noise(t, 0.05, filt('lowpass', 1900, 0.8, sg));                                 // smack transient
      var bg = ctx.createGain(); bg.connect(sfxBus); env(bg.gain, t + 0.008, 0.22, 0.004, 0.11);
      var b = osc('triangle', 520 * p, t + 0.008, t + 0.16, bg); b.frequency.exponentialRampToValueAtTime(255 * p, t + 0.1);
      track('hit', o);
    }

    // ---------- zombie death cry: formant pseudo-voice "uurgh" (4 variants) ----------
    var lastDeath = -1;
    function zombieDeath(variant, when) {
      var t = when != null ? when : ctx.currentTime;
      if (live.death >= MAX_DEATH_VOICES) return;
      var idx = variant != null ? variant % DEATHS.length : Math.floor(Math.random() * DEATHS.length);
      if (variant == null && idx === lastDeath) idx = (idx + 1 + Math.floor(Math.random() * (DEATHS.length - 1))) % DEATHS.length;
      lastDeath = idx;
      var d = DEATHS[idx], ps = variant != null ? 1 : rnd(0.85, 1.25), dur = d.dur * (variant != null ? 1 : rnd(0.9, 1.1)), end = t + dur;
      var out = ctx.createGain(); out.connect(sfxBus);
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.8, t + 0.035);
      out.gain.setValueAtTime(0.8, end - dur * 0.35); out.gain.exponentialRampToValueAtTime(0.0001, end);
      var garg = gain(1, out);
      if (d.gargle) {                                   // throaty gargle tail (amplitude flutter)
        var gl = gain(0, garg.gain), go = osc('square', rnd(24, 32), t, end, gl);
        gl.gain.setValueAtTime(0, t); gl.gain.setValueAtTime(0, end - dur * d.gargle); gl.gain.linearRampToValueAtTime(0.55, end - dur * d.gargle + 0.06);
      }
      var src = gain(1, null);
      for (var k = 0; k < 3; k++) {                       // three parallel formant band-passes
        var fg = gain([1, 0.6, 0.25][k], garg), bp = filt('bandpass', d.v0[k], [6, 9, 12][k], fg);
        bp.frequency.setValueAtTime(d.v0[k], t + 0.03); bp.frequency.linearRampToValueAtTime(d.v1[k], end - dur * 0.3);
        src.connect(bp);
      }
      var s = osc('sawtooth', d.f0 * ps, t, end + 0.02, src);
      s.frequency.exponentialRampToValueAtTime(d.f1 * ps, end);
      var vg = gain(d.vib, s.detune); osc('sine', rnd(5.5, 7.5), t, end, vg);    // wobbly vibrato
      var bg = gain(0.08, src); noise(t, dur, bg); // breath
      track('death', s);
    }

    // ---------- UI stings ----------
    function checkpoint(when) {
      var t = when != null ? when : ctx.currentTime, notes = [1046.5, 1318.5, 1568, 2093];
      for (var i = 0; i < notes.length; i++) {
        var nt = t + i * 0.07, g = ctx.createGain(); g.connect(sfxBus); env(g.gain, nt, 0.2, 0.004, 0.42);
        osc('sine', notes[i], nt, nt + 0.5, g);
        osc('sine', notes[i] * 2.76, nt, nt + 0.5, gain(0.18, g));   // bell partial
      }
    }
    function gameOver(when) {
      var t = when != null ? when : ctx.currentTime;
      engine(-1, 0, false, t);
      var lp = filt('lowpass', 1700, 0.7, sfxBus), notes = [392, 311.1, 261.6];
      for (var i = 0; i < notes.length; i++) {
        var nt = t + i * 0.17, g = ctx.createGain(); g.connect(lp); env(g.gain, nt, 0.2, 0.006, 0.17);
        osc('square', notes[i], nt, nt + 0.2, g);
      }
      var lt = t + 0.51, lg = ctx.createGain(); lg.connect(lp); env(lg.gain, lt, 0.24, 0.01, 0.75);
      var o = osc('square', 196, lt, lt + 0.8, lg); o.frequency.setValueAtTime(196, lt + 0.15); o.frequency.exponentialRampToValueAtTime(82, lt + 0.75);
      osc('square', 98, lt, lt + 0.8, gain(0.5, lg)).detune.value = -8;
    }

    // ---------- special: jump whoosh, heavy landing thump, fuel pickup bling ----------
    function jump(when) {
      var t = when != null ? when : ctx.currentTime;
      var wg = ctx.createGain(); wg.connect(sfxBus); env(wg.gain, t, 0.5, 0.06, 0.5);
      var bp = filt('bandpass', 400, 1.2, wg); bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
      noise(t, 0.6, bp);                                                              // rising air whoosh
      var sg = ctx.createGain(); sg.connect(sfxBus); env(sg.gain, t, 0.16, 0.02, 0.35);
      var o = osc('triangle', 180, t, t + 0.42, sg); o.frequency.exponentialRampToValueAtTime(560, t + 0.35);
    }
    function land(when) {
      var t = when != null ? when : ctx.currentTime;
      var th = ctx.createGain(); th.connect(shaper(driveCurve, gain(0.9, sfxBus))); env(th.gain, t, 0.95, 0.003, 0.32);
      var o = osc('sine', 95, t, t + 0.38, th); o.frequency.exponentialRampToValueAtTime(36, t + 0.3);   // body thump
      var ng = ctx.createGain(); ng.connect(sfxBus); env(ng.gain, t, 0.5, 0.002, 0.2);
      noise(t, 0.25, filt('lowpass', 700, 0.7, ng));                                  // tyre/suspension slam
    }
    function pickup(when) {
      var t = when != null ? when : ctx.currentTime, notes = [880, 1318.5];
      for (var i = 0; i < notes.length; i++) { var nt = t + i * 0.06, g = ctx.createGain(); g.connect(sfxBus); env(g.gain, nt, 0.14, 0.004, 0.16); osc('square', notes[i], nt, nt + 0.2, filt('lowpass', 3200, 0.7, g)); }
    }


    // ---------- skid: tyre screech + scrub (~0.8 s), for the drift-park finish ----------
    function skid(when) {
      var t = when != null ? when : ctx.currentTime, end = t + 0.8;
      if (live.skid >= 1) return;
      var out = ctx.createGain(); out.connect(sfxBus);
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.8, t + 0.04);
      out.gain.setValueAtTime(0.8, t + 0.45); out.gain.exponentialRampToValueAtTime(0.0001, end);
      var b1 = filt('bandpass', 1300, 14, out), b2 = filt('bandpass', 2550, 11, gain(0.6, out));
      b1.frequency.setValueAtTime(1300, t); b1.frequency.linearRampToValueAtTime(950, end);
      b2.frequency.setValueAtTime(2550, t); b2.frequency.linearRampToValueAtTime(1900, end);
      var wg = gain(90, b1.frequency); wg.connect(b2.frequency); osc('sine', rnd(8, 11), t, end, wg);   // squeal wobble (Hz)
      var src = noise(t, 0.82, gain(1.6, b1)); src.connect(b2);
      var tg = gain(0.07, out), to = osc('triangle', 1050, t, end, tg);   // tonal rubber squeal
      to.frequency.linearRampToValueAtTime(820, end);
      osc('sine', 23, t, end, gain(35, to.detune));
      var sg = ctx.createGain(); sg.connect(sfxBus); env(sg.gain, t, 0.35, 0.01, 0.5);    // low scrub rumble
      noise(t + 0.3, 0.6, filt('lowpass', 450, 0.7, sg)); noise(t, 0.3, filt('lowpass', 450, 0.7, sg));
      track('skid', to);
    }

    return { ctx: ctx, master: master, engBus: engBus, engine: engine, crash: crash, zombieHit: zombieHit,
             zombieDeath: zombieDeath, checkpoint: checkpoint, gameOver: gameOver, jump: jump, land: land, pickup: pickup, skid: skid, live: live, es: es };
  }

  // ---------- public live wrapper ----------
  var rig = null, enabled = false, suspendTimer = 0;
  function ready() { return rig && enabled && rig.ctx.state === 'running'; }

  var API = {
    init: function () {
      if (!AC) return false;
      if (!rig) { try { rig = createRig(new AC({ latencyHint: 'interactive' })); } catch (e) { try { rig = createRig(new AC()); } catch (e2) { return false; } } }
      if (enabled && rig.ctx.state !== 'running') rig.ctx.resume();
      return true;
    },
    setEnabled: function (on) {
      enabled = !!on;
      if (!rig) return;
      var c = rig.ctx, t = c.currentTime; clearTimeout(suspendTimer);
      if (enabled) { c.resume(); rig.master.gain.cancelScheduledValues(t); rig.master.gain.setTargetAtTime(MASTER_VOL, t, 0.05); }
      else {
        rig.master.gain.cancelScheduledValues(t); rig.master.gain.setTargetAtTime(0, t, 0.03);
        suspendTimer = setTimeout(function () { if (!enabled) c.suspend(); }, 200);   // save phone battery
      }
    },
    isEnabled: function () { return enabled; },
    engine: function (kmh, throttle01, braking) { if (ready()) rig.engine(kmh, throttle01, braking); },
    crash: function (intensity01) { if (ready()) rig.crash(intensity01); },
    zombieHit: function (combo) { if (ready()) rig.zombieHit(combo); },
    zombieDeath: function () { if (ready()) rig.zombieDeath(); },
    checkpoint: function () { if (ready()) rig.checkpoint(); },
    gameOver: function () { if (ready()) rig.gameOver(); },
    jump: function () { if (ready()) rig.jump(); },
    land: function () { if (ready()) rig.land(); },
    pickup: function () { if (ready()) rig.pickup(); },
    skid: function () { if (ready()) rig.skid(); },
    pause: function () { if (rig) rig.ctx.suspend(); },
    resume: function () { if (rig && enabled) rig.ctx.resume(); },

    // ---------- test helpers (offline render; not needed by the game) ----------
    _render: function (kind, arg) {
      if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
      var lens = { engineSweep: 12, engineIdle: 2, crash: 1.2, crashSoft: 1.2, zombieHit: 0.4, zombieHitCombo: 0.4,
                   zombieDeath: 1, checkpoint: 0.9, gameOver: 1.6, massKill: 1.5, everything: 3, skid: 1, engineLift: 4 };
      var len = lens[kind] || 1.5, sr = 44100, oc = new OAC(1, Math.ceil(sr * len), sr), r = createRig(oc), t0 = 0.02;
      r.master.gain.value = MASTER_VOL;
      if (kind === 'engineSweep') {          // full throttle 0 -> 295 km/h in 9 s, then brake to 120
        for (var t = 0; t < len; t += 1 / 60) {
          var v = t < 9 ? 295 * Math.pow(t / 9, 0.8) : 295 - (t - 9) * 58;
          r.engine(v, t < 9 ? 1 : 0, t >= 9, t);
        }
      } else if (kind === 'engineIdle') { for (var u = 0; u < len; u += 1 / 60) r.engine(0, 0, false, u); }
      else if (kind === 'crash') r.crash(1, t0);
      else if (kind === 'crashSoft') r.crash(0.2, t0);
      else if (kind === 'zombieHit') r.zombieHit(0, t0);
      else if (kind === 'zombieHitCombo') r.zombieHit(10, t0);
      else if (kind === 'zombieDeath') r.zombieDeath(arg || 0, t0);
      else if (kind === 'checkpoint') r.checkpoint(t0);
      else if (kind === 'gameOver') r.gameOver(t0);
      else if (kind === 'skid') r.skid(t0);
      else if (kind === 'engineLift') {     // 3rd gear full throttle, lift at 1.5 s, coast, back on at 3 s
        for (var lt = 0; lt < len; lt += 1 / 60) r.engine(lt < 1.5 ? 70 + lt * 30 : lt < 3 ? 115 - (lt - 1.5) * 12 : 97 + (lt - 3) * 25, lt < 1.5 || lt >= 3 ? 1 : 0, false, lt);
      }
      else if (kind === 'massKill') { for (var m = 0; m < 12; m++) { r.zombieHit(m, t0 + m * 0.02); r.zombieDeath(null, t0 + m * 0.02); } }
      else if (kind === 'everything') {      // worst case stack: engine at redline + crash + 12 kills + chime
        for (var w = 0; w < len; w += 1 / 60) r.engine(290, 1, false, w);
        r.crash(1, 0.5); for (var q = 0; q < 12; q++) { r.zombieHit(q, 0.5 + q * 0.01); r.zombieDeath(null, 0.5 + q * 0.01); }
        r.checkpoint(0.52);
      }
      return oc.startRendering();
    },
    _stats: function (buf) {
      var d = buf.getChannelData(0), peak = 0, sum = 0, nan = 0, act = 0, asum = 0;
      for (var i = 0; i < d.length; i++) {
        var x = d[i]; if (x !== x || !isFinite(x)) { nan++; continue; }
        var a = Math.abs(x); if (a > peak) peak = a; sum += x * x;
        if (a > 0.001) { act++; asum += x * x; }
      }
      function db(x) { return x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -Infinity; }
      return { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / d.length)), activeRmsDb: db(Math.sqrt(asum / Math.max(1, act))),
               nan: nan, seconds: Math.round(d.length / buf.sampleRate * 100) / 100 };
    },
    _selftest: function () {
      var jobs = [['engineIdle'], ['engineSweep'], ['crash'], ['crashSoft'], ['zombieHit'], ['zombieHitCombo'],
                  ['zombieDeath', 0], ['zombieDeath', 1], ['zombieDeath', 2], ['zombieDeath', 3],
                  ['checkpoint'], ['gameOver'], ['skid'], ['engineLift'], ['massKill'], ['everything']];
      var out = [];
      return jobs.reduce(function (p, j) {
        return p.then(function () { return API._render(j[0], j[1]).then(function (b) {
          var s = API._stats(b); s.sound = j[0] + (j[1] != null ? '#' + j[1] : '');
          s.ok = s.nan === 0 && s.peakDb < 0 && s.peakDb > -60; out.push(s);
        }); });
      }, Promise.resolve()).then(function () { API._lastSelftest = out; return out; });
    }
  };

  window.SlteraAudio = API;

  if (window.__SLTERA_AUDIO_SELFTEST) {
    API._selftest().then(function (r) { if (window.console && console.table) console.table(r); },
                         function (e) { if (window.console) console.warn('SlteraAudio selftest failed', e); });
  }
})();
