/*
 * audio.js — effetti sonori "chiptune" generati con WebAudio (nessun file audio necessario).
 */
(function () {
  'use strict';

  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('rmd-muted') === '1'; } catch (e) { /* storage non disponibile */ }

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slide, when) {
    const a = ac();
    if (!a || muted) return;
    const t0 = a.currentTime + (when || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol || 0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const SFX = {
    tick: () => tone(700 + Math.random() * 300, 0.03, 'square', 0.025),
    land: () => { tone(180, 0.12, 'triangle', 0.12, 0.5); tone(880, 0.08, 'square', 0.04, 1, 0.05); },
    step: () => tone(220, 0.04, 'triangle', 0.05),
    reveal: () => { tone(520, 0.08, 'square', 0.04); tone(780, 0.1, 'square', 0.04, 1, 0.07); },
    hit: () => { tone(160, 0.25, 'sawtooth', 0.09, 0.3); tone(90, 0.2, 'square', 0.06, 0.5, 0.03); },
    heal: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 1, i * 0.07)),
    neutral: () => tone(440, 0.1, 'triangle', 0.05),
    click: () => tone(600, 0.03, 'square', 0.03),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.18, 'square', 0.05, 1, i * 0.12)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, 0.9, i * 0.22)),
  };

  window.RMD = window.RMD || {};
  window.RMD.Audio = {
    play(name) { if (SFX[name]) SFX[name](); },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('rmd-muted', muted ? '1' : '0'); } catch (e) { /* ignora */ }
      return muted;
    },
    get muted() { return muted; },
  };
})();
