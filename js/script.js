/**
 * Whispering Garden — Main Application Controller
 * Connects the seasonal botanical canvas scene, Web Audio ambient synthesizer,
 * season selector, introductory screen, responsive resizing, and interactions.
 */

(function () {
  'use strict';

  const stage = document.querySelector('.stage');
  const canvas = document.getElementById('garden-canvas');
  const introScreen = document.getElementById('intro-screen');
  const startBtn = document.getElementById('start-btn');
  const introMusicToggle = document.getElementById('intro-music-toggle');
  const gardenHud = document.getElementById('garden-hud');
  const seasonButtons = Array.from(document.querySelectorAll('.season-btn'));
  const breezeBtn = document.getElementById('breeze-btn');
  const replayBtn = document.getElementById('replay-btn');
  const musicBtn = document.getElementById('music-btn');
  const musicBtnLabel = document.getElementById('music-btn-label');
  const interactionHint = document.getElementById('interaction-hint');

  if (!canvas || !window.GardenScene || !window.GardenAudio) {
    return;
  }

  const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new window.GardenScene(canvas, {
    reducedMotion: reducedMotionQuery.matches,
    season: 'spring',
  });
  const audio = new window.GardenAudio();

  let hasStarted = false;
  let currentSeason = 'spring';
  let hintTimer = null;
  let resizeTimer = null;
  let lastFrameTime = performance.now();

  /* ========================================================================
     UI State Helpers
     ======================================================================== */

  function updateMusicButton(isPlaying) {
    musicBtn.setAttribute('aria-pressed', String(isPlaying));
    musicBtn.setAttribute('aria-label', isPlaying ? 'Mute background music' : 'Unmute background music');
    if (musicBtnLabel) {
      musicBtnLabel.textContent = isPlaying ? 'Sound On' : 'Sound Off';
    }
  }

  function selectSeason(season) {
    if (!SEASON_ORDER.includes(season) || season === currentSeason) return;
    currentSeason = season;

    document.documentElement.setAttribute('data-season', season);
    seasonButtons.forEach((btn) => {
      const active = btn.dataset.season === season;
      btn.setAttribute('aria-pressed', String(active));
    });

    scene.setSeason(season);
    audio.setSeason(season);
    audio.playSoftChime();
    hideInteractionHint();
  }

  function showInteractionHint() {
    if (!interactionHint) return;
    interactionHint.classList.add('is-visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      interactionHint.classList.remove('is-visible');
    }, 6400);
  }

  function hideInteractionHint() {
    if (!interactionHint) return;
    clearTimeout(hintTimer);
    interactionHint.classList.remove('is-visible');
  }

  function enterGarden() {
    if (hasStarted) return;
    hasStarted = true;

    introScreen.classList.add('is-hidden');
    introScreen.setAttribute('aria-hidden', 'true');
    gardenHud.classList.add('is-visible');
    gardenHud.setAttribute('aria-hidden', 'false');
    stage.classList.add('is-active');

    scene.startBloom();

    if (introMusicToggle && introMusicToggle.checked) {
      const started = audio.start();
      updateMusicButton(started);
    } else {
      updateMusicButton(false);
    }

    setTimeout(showInteractionHint, 1800);
  }

  /* ========================================================================
     Event Listeners
     ======================================================================== */

  startBtn.addEventListener('click', enterGarden);

  seasonButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectSeason(btn.dataset.season);
    });
  });

  breezeBtn.addEventListener('click', () => {
    scene.triggerBreeze();
    audio.playSoftChime();
  });

  replayBtn.addEventListener('click', () => {
    scene.replayBloom();
    audio.playSoftChime();
  });

  musicBtn.addEventListener('click', () => {
    const playing = audio.toggle();
    updateMusicButton(playing);
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    scene.setPointer(e.clientX - rect.left, e.clientY - rect.top, true);
  });

  canvas.addEventListener('pointerleave', () => {
    scene.setPointer(-999, -999, false);
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (!hasStarted) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scene.setPointer(x, y, true);
    scene.interactAt(x, y);
    audio.playSoftChime();
    hideInteractionHint();
  });

  // Keyboard shortcuts when inside the garden
  window.addEventListener('keydown', (e) => {
    if (!hasStarted) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space' && tag !== 'BUTTON') {
      e.preventDefault();
      scene.triggerBreeze();
      audio.playSoftChime();
    } else if (e.key === 'r' || e.key === 'R') {
      scene.replayBloom();
      audio.playSoftChime();
    } else if (e.key === 'm' || e.key === 'M') {
      const playing = audio.toggle();
      updateMusicButton(playing);
    } else if (e.key === '1') {
      selectSeason('spring');
    } else if (e.key === '2') {
      selectSeason('summer');
    } else if (e.key === '3') {
      selectSeason('autumn');
    } else if (e.key === '4') {
      selectSeason('winter');
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      scene.resize();
    }, 120);
  });

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', (e) => {
      scene.reducedMotion = e.matches;
    });
  }

  /* ========================================================================
     Animation Loop
     ======================================================================== */

  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    scene.update(dt);
    scene.render();

    window.requestAnimationFrame(tick);
  }

  updateMusicButton(false);
  window.requestAnimationFrame(tick);
})();
