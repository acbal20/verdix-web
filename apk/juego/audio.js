/* ============================================================
   BEN 10 · OMNITRIX BATTLE 3D
   Motor de audio 100% sintetizado (WebAudio, sin archivos)
   ============================================================ */

const AudioEngine = (function () {
  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let noiseBuf = null;
  let muted = SAVE.muted;
  let musicTimer = null;
  let musicPlaying = false;
  let step = 0;
  let nextTime = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16;
    musicBus.connect(master);

    // ruido blanco reutilizable
    const len = Math.floor(ctx.sampleRate * 1.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return true;
  }

  function setMuted(m) {
    muted = !!m;
    SAVE.muted = muted;
    saveGame();
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.03);
    }
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() { return muted; }

  /* ---------------- primitivas ---------------- */

  function tone(opts) {
    if (!ctx) return;
    const {
      freq = 440, freq2 = null, dur = 0.15, type = 'sine',
      gain = 0.2, delay = 0, attack = 0.005, release = null,
      dest = sfxBus, detune = 0
    } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (freq2 != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    }
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    const rel = release == null ? Math.max(0.02, dur * 0.55) : release;
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, dur));
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + rel + 0.02);
  }

  function noise(opts) {
    if (!ctx || !noiseBuf) return;
    const {
      dur = 0.15, gain = 0.2, delay = 0, freq = 1200, freq2 = null,
      q = 1, type = 'bandpass', dest = sfxBus, attack = 0.004
    } = opts;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (freq2 != null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t0 + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  function chord(freqs, dur, gain, type, delay) {
    freqs.forEach((f, i) => tone({
      freq: f, dur, type, gain: gain / Math.max(1, freqs.length * 0.7),
      delay: (delay || 0) + i * 0.012
    }));
  }

  /* ---------------- efectos ---------------- */

  const sfxMap = {
    click()    { tone({ freq: 920, freq2: 680, dur: 0.055, type: 'square', gain: 0.09 }); },
    hover()    { tone({ freq: 1500, freq2: 1750, dur: 0.035, type: 'sine', gain: 0.025 }); },
    punch()    { noise({ dur: 0.12, gain: 0.22, freq: 420, freq2: 120, q: 0.7 }); tone({ freq: 120, freq2: 55, dur: 0.13, type: 'sine', gain: 0.28 }); },
    heavy()    { noise({ dur: 0.22, gain: 0.3, freq: 300, freq2: 80, q: 0.6 }); tone({ freq: 85, freq2: 40, dur: 0.25, type: 'sine', gain: 0.4 }); },
    swing()    { noise({ dur: 0.13, gain: 0.1, freq: 1800, freq2: 500, q: 1.2, type: 'bandpass' }); },
    fire()     { noise({ dur: 0.28, gain: 0.2, freq: 1100, freq2: 300, q: 0.8 }); tone({ freq: 220, freq2: 90, dur: 0.22, type: 'sawtooth', gain: 0.1 }); },
    ice()      { tone({ freq: 1500, freq2: 2500, dur: 0.18, type: 'triangle', gain: 0.12 }); tone({ freq: 2200, freq2: 1700, dur: 0.22, type: 'sine', gain: 0.06, delay: 0.03 }); },
    laser()    { tone({ freq: 1900, freq2: 260, dur: 0.16, type: 'sawtooth', gain: 0.13 }); tone({ freq: 1200, freq2: 300, dur: 0.14, type: 'square', gain: 0.05 }); },
    hit()      { tone({ freq: 240, freq2: 120, dur: 0.08, type: 'square', gain: 0.12 }); noise({ dur: 0.07, gain: 0.12, freq: 1000 }); },
    kill()     { tone({ freq: 340, freq2: 60, dur: 0.3, type: 'sawtooth', gain: 0.16 }); noise({ dur: 0.28, gain: 0.16, freq: 900, freq2: 150 }); },
    coin()     { tone({ freq: 1320, dur: 0.06, type: 'square', gain: 0.07 }); tone({ freq: 1760, dur: 0.09, type: 'square', gain: 0.06, delay: 0.05 }); },
    crit()     { tone({ freq: 660, dur: 0.1, type: 'square', gain: 0.1 }); tone({ freq: 1320, dur: 0.15, type: 'square', gain: 0.12, delay: 0.03 }); tone({ freq: 1980, dur: 0.2, type: 'sine', gain: 0.08, delay: 0.06 }); },
    gem()      { [880, 1174, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sine', gain: 0.085, delay: i * 0.055 })); },
    heal()     { tone({ freq: 560, freq2: 980, dur: 0.28, type: 'sine', gain: 0.13 }); tone({ freq: 840, freq2: 1260, dur: 0.3, type: 'triangle', gain: 0.07, delay: 0.06 }); },
    power()    { [440, 660, 880, 1320].forEach((f, i) => tone({ freq: f, dur: 0.13, type: 'square', gain: 0.07, delay: i * 0.05 })); },
    transform(){ tone({ freq: 180, freq2: 1400, dur: 0.35, type: 'sawtooth', gain: 0.14 }); noise({ dur: 0.4, gain: 0.1, freq: 400, freq2: 2400 }); [660, 990, 1320].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'sine', gain: 0.08, delay: 0.18 + i * 0.04 })); },
    revert()   { tone({ freq: 1200, freq2: 200, dur: 0.3, type: 'sawtooth', gain: 0.1 }); tone({ freq: 600, freq2: 300, dur: 0.2, type: 'sine', gain: 0.08 }); },
    wave()     { chord([220, 330, 440], 0.6, 0.16, 'sawtooth'); tone({ freq: 110, dur: 0.7, type: 'sine', gain: 0.2 }); },
    boss()     { tone({ freq: 70, freq2: 42, dur: 1.1, type: 'sawtooth', gain: 0.3 }); noise({ dur: 1.0, gain: 0.2, freq: 180, freq2: 60, type: 'lowpass' }); [110, 138, 165].forEach(f => tone({ freq: f, dur: 0.9, type: 'square', gain: 0.05, delay: 0.15 })); },
    hurt()     { tone({ freq: 180, freq2: 70, dur: 0.2, type: 'sawtooth', gain: 0.2 }); noise({ dur: 0.18, gain: 0.16, freq: 700, freq2: 200 }); },
    shield()   { tone({ freq: 320, freq2: 760, dur: 0.35, type: 'sine', gain: 0.16 }); tone({ freq: 640, freq2: 1120, dur: 0.3, type: 'triangle', gain: 0.08, delay: 0.04 }); },
    dash()     { noise({ dur: 0.2, gain: 0.14, freq: 400, freq2: 2200, q: 0.9 }); tone({ freq: 200, freq2: 500, dur: 0.15, type: 'sine', gain: 0.05 }); },
    buy()      { [1046, 1318, 1568].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'square', gain: 0.06, delay: i * 0.06 })); },
    error()    { tone({ freq: 150, dur: 0.16, type: 'square', gain: 0.12 }); tone({ freq: 110, dur: 0.2, type: 'square', gain: 0.1, delay: 0.09 }); },
    over()     { [330, 262, 196, 165].forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'triangle', gain: 0.14, delay: i * 0.16 })); noise({ dur: 0.8, gain: 0.06, freq: 300, freq2: 80 }); },
    win()      { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.12, delay: i * 0.1 })); },
    revive()   { [392, 523, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'sine', gain: 0.12, delay: i * 0.1 })); noise({ dur: 0.6, gain: 0.08, freq: 500, freq2: 1800 }); },
    splash()   { noise({ dur: 0.35, gain: 0.12, freq: 1600, freq2: 400, q: 0.8 }); },
    pickup()   { tone({ freq: 700, freq2: 1100, dur: 0.09, type: 'triangle', gain: 0.08 }); },
    step()     { noise({ dur: 0.05, gain: 0.02, freq: 260, type: 'lowpass' }); }
  };

  function sfx(name) {
    if (muted) return;
    if (!ensure()) return;
    const fn = sfxMap[name];
    if (fn) {
      try { fn(); } catch (e) {}
    }
  }

  /* ---------------- música ---------------- */
  // Arpegio ambiental en La menor, sin archivos.
  const NS = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
  const BASS = [110.00, 98.00, 87.31, 98.00];
  const PAD = [
    [220.00, 261.63, 329.63],
    [196.00, 246.94, 293.66],
    [174.61, 220.00, 261.63],
    [196.00, 246.94, 293.66]
  ];

  function scheduleStep(t) {
    if (!ctx) return;
    const bar = Math.floor(step / 16) % 4;
    const idx = step % 16;
    const d = Math.max(0, t - ctx.currentTime);
    // bajo cada 4 pasos
    if (idx % 4 === 0) {
      tone({ freq: BASS[bar], dur: 0.42, type: 'triangle', gain: 0.18, dest: musicBus, attack: 0.01, delay: d });
    }
    // arpegio
    if (idx % 2 === 0 || idx % 8 === 3) {
      const n = NS[(idx * 3 + bar * 2) % NS.length];
      tone({ freq: n, dur: 0.24, type: 'sine', gain: 0.1, dest: musicBus, delay: d });
      tone({ freq: n * 2, dur: 0.16, type: 'triangle', gain: 0.035, dest: musicBus, delay: d });
    }
    // pad al inicio del compás
    if (idx === 0) {
      PAD[bar].forEach(f => tone({ freq: f, dur: 1.6, type: 'sine', gain: 0.045, dest: musicBus, attack: 0.15, delay: d }));
    }
    // pulso suave
    if (idx % 8 === 0) noise({ dur: 0.07, gain: 0.02, freq: 5000, type: 'highpass', dest: musicBus, delay: d });
    step++;
  }

  function startMusic() {
    if (musicPlaying) return;
    if (!ensure()) return;
    musicPlaying = true;
    step = 0;
    nextTime = ctx.currentTime + 0.08;
    const tick = () => {
      if (!musicPlaying || !ctx) return;
      while (nextTime < ctx.currentTime + 0.35) {
        scheduleStep(nextTime);
        nextTime += 0.22;
      }
    };
    tick();
    musicTimer = setInterval(tick, 120);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  /* Los navegadores exigen un gesto del usuario para arrancar audio. */
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  return {
    unlock, sfx, startMusic, stopMusic,
    setMuted, toggleMuted, isMuted,
    get enabled() { return !!ctx; }
  };
})();
