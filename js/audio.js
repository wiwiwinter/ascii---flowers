/**
 * Whispering Garden — Procedural Seasonal Ambient Music
 * Synthesizes a soft, dreamy romantic soundscape using the Web Audio API
 * with tailored harmonic palettes for Spring, Summer, Autumn, and Winter.
 * Initializes strictly after a user gesture.
 */

(function (global) {
  'use strict';

  const SEASON_HARMONIES = {
    spring: {
      chords: [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [146.83, 220.00, 261.63, 329.63], // Dm9
        [116.54, 174.61, 220.00, 293.66], // Bbmaj7
        [130.81, 196.00, 261.63, 329.63], // Cmaj
      ],
      melody: [349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46, 783.99],
      filterHz: 560,
    },
    summer: {
      chords: [
        [196.00, 246.94, 293.66, 369.99], // Gmaj7
        [164.81, 246.94, 293.66, 369.99], // Em9
        [130.81, 196.00, 246.94, 329.63], // Cmaj7
        [146.83, 220.00, 293.66, 369.99], // Dmaj
      ],
      melody: [392.00, 440.00, 493.88, 587.33, 659.25, 739.99, 783.99, 880.00],
      filterHz: 640,
    },
    autumn: {
      chords: [
        [146.83, 220.00, 261.63, 329.63], // Dm9
        [116.54, 174.61, 220.00, 261.63], // Bbmaj9
        [130.81, 196.00, 246.94, 293.66], // C6/9
        [110.00, 164.81, 196.00, 261.63], // Am7
      ],
      melody: [293.66, 329.63, 349.23, 440.00, 523.25, 587.33, 659.25],
      filterHz: 460,
    },
    winter: {
      chords: [
        [130.81, 196.00, 246.94, 329.63], // Cmaj7
        [164.81, 246.94, 293.66, 392.00], // Em7
        [174.61, 261.63, 329.63, 392.00], // Fmaj9
        [146.83, 220.00, 261.63, 392.00], // Dm11
      ],
      melody: [523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50],
      filterHz: 720,
    },
  };

  class GardenAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.delayNode = null;
      this.isPlaying = false;
      this.season = 'spring';
      this.chordIndex = 0;
      this.chordTimer = null;
      this.noteTimer = null;
      this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
    }

    setSeason(season) {
      if (SEASON_HARMONIES[season]) {
        this.season = season;
      }
    }

    initContext() {
      if (this.ctx || !this.supported) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

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

      const harmony = SEASON_HARMONIES[this.season] || SEASON_HARMONIES.spring;
      const chord = harmony.chords[this.chordIndex % harmony.chords.length];
      this.chordIndex++;

      const now = this.ctx.currentTime;
      const duration = 6.2;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(harmony.filterHz, now);
      filter.connect(this.masterGain);

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((idx - 1.5) * 3.5, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.052, now + 1.8);
        gain.gain.linearRampToValueAtTime(0.038, now + duration - 1.6);
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

      const harmony = SEASON_HARMONIES[this.season] || SEASON_HARMONIES.spring;
      const notes = harmony.melody;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      this.playHarpNote(freq, 0.085);

      if (Math.random() < 0.32) {
        const secondFreq = notes[Math.floor(Math.random() * notes.length)];
        setTimeout(() => {
          if (this.isPlaying) this.playHarpNote(secondFreq, 0.05);
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

    playSoftChime() {
      if (!this.isPlaying || !this.ctx) return;
      const harmony = SEASON_HARMONIES[this.season] || SEASON_HARMONIES.spring;
      const notes = harmony.melody;
      const freq = notes[Math.min(notes.length - 1, 2 + Math.floor(Math.random() * 4))];
      this.playHarpNote(freq, 0.068);
    }
  }

  global.GardenAudio = GardenAudio;
})(window);
