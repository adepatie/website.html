/**
 * Space Jam Theme — Web Audio API approximation
 * Plays a simplified 8-bar hook of the "Quad City DJ's – Space Jam" theme
 * using oscillators + a basic drum pattern, entirely in the browser.
 */

(function () {
  'use strict';

  let audioCtx = null;
  let playing   = false;
  let stopFn    = null;

  // ── Note frequencies (Hz) ────────────────────────────
  const NOTE = {
    C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00,
    A4:440.00, Bb4:466.16, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
    Bb5:932.33, B5:987.77,
    G3:196.00, A3:220.00, Bb3:233.08, C3:130.81, D3:146.83, F3:174.61,
    _: 0  // rest
  };

  // ── Simplified melody (Space Jam hook approximation) ─
  // Each entry: [note, duration_beats]
  const BPM     = 108;
  const BEAT    = 60 / BPM;          // seconds per beat
  const MELODY  = [
    ['C5',0.5],['C5',0.5],['C5',0.5],['_',0.5],
    ['Bb4',0.5],['C5',0.5],['_',0.25],['C5',0.25],['Bb4',0.5],
    ['G4',1],['_',0.5],
    ['C5',0.5],['C5',0.5],['C5',0.5],['_',0.5],
    ['Bb4',0.5],['C5',0.5],['_',0.25],['D5',0.25],['C5',0.5],
    ['A4',1],['_',0.5],
    ['C5',0.5],['Bb4',0.5],['G4',0.5],['F4',0.5],
    ['E4',0.5],['G4',0.25],['A4',0.25],['C5',1],
  ];

  // ── Bass line ────────────────────────────────────────
  const BASS = [
    ['C3',1],['F3',1],['G3',1],['F3',1],
    ['C3',1],['F3',1],['Bb3',0.5],['C3',0.5],['G3',1],
  ];

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // ── Schedule a single note ───────────────────────────
  function scheduleNote(ctx, freq, startTime, dur, gainNode, type='square', detune=0) {
    if (freq === 0) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type       = type;
    osc.frequency.value = freq;
    osc.detune.value    = detune;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.9);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  // ── Schedule bass note ───────────────────────────────
  function scheduleBass(ctx, freq, startTime, dur, masterGain) {
    if (freq === 0) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.85);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  // ── Drum machine (kick + hi-hat + snare) ─────────────
  function scheduleDrum(ctx, type, time, masterGain) {
    const gain = ctx.createGain();
    gain.connect(masterGain);
    if (type === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.4);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.8, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(gain);
      osc.start(time); osc.stop(time + 0.4);
    } else if (type === 'snare') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.35, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      src.connect(gain);
      src.start(time); src.stop(time + 0.15);
    } else if (type === 'hat') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'highpass';
      biquad.frequency.value = 7000;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.18, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      src.connect(biquad);
      biquad.connect(gain);
      src.start(time); src.stop(time + 0.05);
    }
  }

  // ── Schedule one loop of music ───────────────────────
  function scheduleLoop(ctx, masterGain, startTime) {
    // Melody
    let t = startTime;
    for (const [n, dur] of MELODY) {
      const freq = NOTE[n] || 0;
      scheduleNote(ctx, freq, t, dur * BEAT * 0.92, masterGain, 'square', 0);
      // slight harmony
      if (freq) scheduleNote(ctx, freq * 1.5, t, dur * BEAT * 0.88, masterGain, 'sine', 5);
      t += dur * BEAT;
    }

    // Bass
    t = startTime;
    for (const [n, dur] of BASS) {
      scheduleBass(ctx, NOTE[n] || 0, t, dur * BEAT * 0.9, masterGain);
      t += dur * BEAT;
    }

    // 2-bar drum loop
    const barLen    = 4 * BEAT;
    const totalBars = 8;
    for (let b = 0; b < totalBars; b++) {
      const bt = startTime + b * barLen;
      // kick: beats 1 & 3
      scheduleDrum(ctx, 'kick',  bt,               masterGain);
      scheduleDrum(ctx, 'kick',  bt + 2 * BEAT,    masterGain);
      // snare: beats 2 & 4
      scheduleDrum(ctx, 'snare', bt + BEAT,         masterGain);
      scheduleDrum(ctx, 'snare', bt + 3 * BEAT,     masterGain);
      // hi-hat: every 8th note
      for (let h = 0; h < 8; h++) {
        scheduleDrum(ctx, 'hat', bt + h * BEAT * 0.5, masterGain);
      }
    }

    return t; // end time
  }

  // ── Public toggle function ───────────────────────────
  window.toggleMusic = function (btn) {
    if (playing) {
      if (stopFn) stopFn();
      playing = false;
      btn.textContent = '🔊 PLAY MUSIC';
      btn.classList.remove('playing');
      return;
    }

    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    playing = true;
    btn.textContent = '🔇 STOP MUSIC';
    btn.classList.add('playing');

    let loopStart = ctx.currentTime + 0.05;
    const loopDuration = MELODY.reduce((s,[,d]) => s + d, 0) * BEAT;

    // Schedule first loop immediately, then keep re-scheduling
    scheduleLoop(ctx, master, loopStart);
    let nextLoop = loopStart + loopDuration;

    const interval = setInterval(() => {
      if (!playing) { clearInterval(interval); return; }
      scheduleLoop(ctx, master, nextLoop);
      nextLoop += loopDuration;
    }, loopDuration * 1000 * 0.8);

    stopFn = () => {
      clearInterval(interval);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    };
  };
})();
