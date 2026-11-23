/**
 * Whispering Garden — Procedural Ambient Garden Music
 * Uses the Web Audio API to synthesize a soft, dreamy romantic soundscape
 * (warm sustained chords + delicate harp/celesta notes) with zero external
 * audio file dependencies. Initializes strictly after a user gesture.
 */

(function (global) {
  'use strict';

  // F Major / D Minor dreamy progression (frequencies in Hz)
  const CHORDS = [
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [146.83, 220.00, 261.63, 329.63], // Dm9 (no 3rd)
    [116.54, 174.61, 220.00, 293.66], // Bbmaj7
    [130.81, 196.00, 261.63, 329.63], // Cmaj
  ];

  // Upper harp melody notes in F major pentatonic
  const MELODY_NOTES = [
    349.23, // F4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    698.46, // F5
    783.99, // G5
  ];

  class GardenAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.delayNode = null;
      this.isPlaying = false;
      this.chordIndex = 0;
      this.chordTimer = null;
      this.noteTimer = null;
      this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
    }

    initContext() {
      if (this.ctx || !this.supported) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Gentle low-pass warm delay network for dreamy spaciousness
      this.delayNode = this.ctx.createDelay(1.2);
      this.delayNode.delayTime.value = 0.42;

      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.28;

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1400;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(feedback);
      feedback.connect(this.delayNode);
      delayFilter.connect(this.masterGain);
    }

    start() {
      if (!this.supported) return false;
      this.initContext();
      if (!this.ctx) return false;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (this.isPlaying) return true;
      this.isPlaying = true;

      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.24, now + 1.4);

      this.playPadChord();
      this.scheduleNextNote();
      return true;
    }

    stop() {
      if (!this.isPlaying || !this.ctx) return;
      this.isPlaying = false;

      if (this.chordTimer) {
        clearTimeout(this.chordTimer);
        this.chordTimer = null;
      }
      if (this.noteTimer) {
        clearTimeout(this.noteTimer);
        this.noteTimer = null;
      }

      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    }

    toggle() {
      if (this.isPlaying) {
        this.stop();
        return false;
      }
      return this.start();
    }

    playPadChord() {
      if (!this.isPlaying || !this.ctx) return;

      const chord = CHORDS[this.chordIndex % CHORDS.length];
      this.chordIndex++;

      const now = this.ctx.currentTime;
      const duration = 6.2;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.connect(this.masterGain);

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((idx - 1.5) * 3.5, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.055, now + 1.8);
        gain.gain.linearRampToValueAtTime(0.04, now + duration - 1.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(filter);

        osc.start(now);
        osc.stop(now + duration + 0.08);
      });

      this.chordTimer = setTimeout(() => this.playPadChord(), 5200);
    }

    scheduleNextNote() {
      if (!this.isPlaying || !this.ctx) return;

      const freq = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
      this.playHarpNote(freq, 0.09);

      // Occasionally add a soft harmonic fifth or octave shimmer
      if (Math.random() < 0.32) {
        const secondFreq = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
        setTimeout(() => {
          if (this.isPlaying) this.playHarpNote(secondFreq, 0.055);
        }, 320);
      }

      const nextDelay = 1200 + Math.random() * 1900;
      this.noteTimer = setTimeout(() => this.scheduleNextNote(), nextDelay);
    }

    playHarpNote(freq, peakGain) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.delayNode);

      osc.start(now);
      osc.stop(now + 2.5);
    }

    /**
     * Play a soft delicate chime when the user sends a breeze or taps a bloom.
     */
    playSoftChime() {
      if (!this.isPlaying || !this.ctx) return;
      const freq = MELODY_NOTES[3 + Math.floor(Math.random() * 4)];
      this.playHarpNote(freq, 0.07);
    }
  }

  global.GardenAudio = GardenAudio;
})(window);
