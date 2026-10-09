// live/audio.js — procedural sound (WebAudio, zero asset bytes) driven by the sim event bus S.ev.
// index.html calls AUDIO.tick(state) once per frame in play mode; the context starts on the first user gesture
// (autoplay policy) and AUDIO.mute(bool) is wired to ad-network viewability / audio-volume callbacks.
(function () {
  let ac = null, out = null, rum = null, flame = null, last = -1, muted = false, lastT = {};
  const start = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); out = ac.createGain(); out.gain.value = muted ? 0 : 0.55; out.connect(ac.destination);
    // cart rumble: two detuned saws through a low-pass (volume follows speed); flame roar: filtered noise, on while the flamethrowers fire
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = ac.createGain(); g.gain.value = 0;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 38; o2.frequency.value = 39.3;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(out); o1.start(); o2.start(); rum = { g, f };
    const s = ac.createBufferSource(); s.buffer = noise(); s.loop = true; const ff = ac.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 700; ff.Q.value = 0.6; const fg = ac.createGain(); fg.gain.value = 0;
    s.connect(ff); ff.connect(fg); fg.connect(out); s.start(); flame = { g: fg };
  };
  addEventListener('pointerdown', start, { capture: true }); addEventListener('keydown', start, { capture: true });
  let nbuf = null;
  const noise = () => { if (nbuf) return nbuf; nbuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate); const d = nbuf.getChannelData(0);
    let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return nbuf; };
  const env = (node, t0, a, peak, dur) => { const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); node.connect(g); g.connect(out); return g; };
  const tone = (freq, t0, dur, type = 'sine', peak = 0.2, slide = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur); env(o, t0, 0.005, peak, dur); o.start(t0); o.stop(t0 + dur + 0.05); };
  const burst = (t0, dur, f0, f1, peak, q = 1.2, type = 'bandpass') => { const s = ac.createBufferSource(); s.buffer = noise(); const f = ac.createBiquadFilter();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); s.connect(f); env(f, t0, 0.004, peak, dur); s.start(t0); s.stop(t0 + dur + 0.05); };
  const SFX = {
    buy: (t0) => { burst(t0, 0.12, 3000, 800, 0.25, 3); tone(180, t0, 0.18, 'square', 0.14, 0.5); tone(1320, t0 + 0.08, 0.1, 'square', 0.05); },   // saw bolted on: clank
    go: (t0) => [392, 523, 659].forEach((f, i) => tone(f, t0 + i * 0.06, 0.18, 'triangle', 0.12)),
    bolt: (t0) => { tone(220, t0, 0.07, 'triangle', 0.1, 2.2); burst(t0, 0.05, 3500, 1800, 0.06, 2); },                                           // crossbow twang
    kill: (t0) => { burst(t0, 0.07, 1800, 700, 0.12, 4); tone(1320, t0 + 0.02, 0.06, 'square', 0.03); tone(1980, t0 + 0.07, 0.08, 'square', 0.03); },   // bones + coin
    sawhit: (t0) => burst(t0, 0.1, 5000, 2500, 0.1, 5),
    throw: (t0) => tone(300, t0, 0.35, 'sine', 0.08, 2.4),
    boom: (t0) => { burst(t0, 0.7, 1500, 60, 0.55, 0.7, 'lowpass'); tone(65, t0, 0.5, 'sine', 0.5, 0.4); },
    sawt: (t0) => { burst(t0, 0.5, 1200, 3200, 0.14, 3); tone(140, t0, 0.5, 'sawtooth', 0.06, 1.6); },
    sawimpact: (t0) => { burst(t0, 0.3, 4000, 600, 0.3, 2); tone(90, t0, 0.3, 'square', 0.15, 0.5); },
    fire: (t0) => { burst(t0, 0.25, 600, 200, 0.3, 0.8, 'lowpass'); tone(110, t0, 0.3, 'sawtooth', 0.08, 0.6); },
    towerdown: (t0) => { burst(t0, 1.4, 1400, 40, 0.7, 0.6, 'lowpass'); tone(55, t0, 0.9, 'sine', 0.6, 0.35); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t0 + 0.45 + i * 0.08, 0.25, 'square', 0.06)); },
    upgrade: (t0) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t0 + i * 0.07, 0.24, 'square', 0.07)),
    hurt: (t0) => { tone(90, t0, 0.2, 'sine', 0.3, 0.5); burst(t0, 0.1, 900, 250, 0.15); },
    nope: (t0) => tone(150, t0, 0.18, 'sawtooth', 0.1, 0.7),
    locked: (t0) => tone(150, t0, 0.18, 'sawtooth', 0.1, 0.7),
    wreck: (t0) => { burst(t0, 0.8, 1200, 60, 0.5, 0.7, 'lowpass'); tone(70, t0, 0.5, 'sine', 0.4, 0.4); },
    end: (t0) => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t0 + i * 0.09, 0.3, 'triangle', 0.12)),
  };
  const GAP = { bolt: 0.12, kill: 0.06, sawhit: 0.12, hurt: 0.3 };                  // throttle chatty events
  window.AUDIO = {
    mute: (m) => { muted = m; if (out) out.gain.value = m ? 0 : 0.55; },
    tick: (S) => {
      if (!ac || !S) return; const now = ac.currentTime;
      if (S.t < last) { last = -1; lastT = {}; }                                                                  // restart / replay
      for (const e of S.ev) { if (e.t <= last || !SFX[e.k]) continue; if (GAP[e.k] && now - (lastT[e.k] || -9) < GAP[e.k]) continue; lastT[e.k] = now; SFX[e.k](now); }
      last = S.t;
      const rolling = S.end < 0 && S.phase === 'battle' ? Math.min(1, S.p.v / 250) : 0, firing = S.end < 0 && S.fireUntil > S.t ? 1 : 0;
      rum.g.gain.setTargetAtTime(0.05 * rolling, now, 0.1); rum.f.frequency.setTargetAtTime(220 + 260 * rolling, now, 0.1); flame.g.gain.setTargetAtTime(0.22 * firing, now, 0.06);
    },
  };
})();
