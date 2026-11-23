/**
 * Whispering Garden — Botanical Renderer & Animation Engine
 * Procedurally renders roses, lilies, dandelions, and white blossoms
 * across layered depth planes with organic wind, bloom growth, parallax,
 * golden-hour lighting, and interactive particles.
 */

(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const inv = 1 - clamp(t, 0, 1);
    return 1 - inv * inv * inv;
  }

  function easeOutBack(t) {
    const x = clamp(t, 0, 1);
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Evaluate a point on a quadratic Bezier curve at parameter t in [0, 1].
   */
  function quadPoint(x0, y0, cx, cy, x1, y1, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    };
  }

  /**
   * Evaluate the tangent angle on a quadratic Bezier curve at parameter t.
   */
  function quadAngle(x0, y0, cx, cy, x1, y1, t) {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    return Math.atan2(dy, dx);
  }

  /* ========================================================================
     Color Palettes (matching soft pink, cream, natural green, muted rose, gold)
     ======================================================================== */

  const ROSE_PALETTES = {
    red: {
      core: '#6A1D2B',
      deep: '#963142',
      mid: '#BD5263',
      outer: '#DC8694',
      rim: '#F5CAD2',
    },
    pink: {
      core: '#A64D62',
      deep: '#CE7388',
      mid: '#E8A3B4',
      outer: '#F5CCD6',
      rim: '#FFF1F4',
    },
    pastel: {
      core: '#BA766E',
      deep: '#D99A90',
      mid: '#EEBFB6',
      outer: '#F9DDD6',
      rim: '#FFF8F4',
    },
  };

  const LILY_PALETTES = {
    white: {
      throat: '#8BA268',
      blush: '#ECCBD1',
      mid: '#FBF5EC',
      tip: '#FFFFFF',
      vein: 'rgba(205, 178, 168, 0.45)',
      speckle: 'rgba(176, 84, 98, 0.55)',
    },
    pink: {
      throat: '#889E68',
      blush: '#D67890',
      mid: '#F3C5D2',
      tip: '#FFF7F9',
      vein: 'rgba(186, 94, 118, 0.4)',
      speckle: 'rgba(154, 48, 72, 0.65)',
    },
  };

  const PETAL_COLORS = [
    { fill: '#E8A6B4', shade: '#C97589' },
    { fill: '#F4CDD6', shade: '#DC99A9' },
    { fill: '#C85C6D', shade: '#993446' },
    { fill: '#FCF7F0', shade: '#E9DCCB' },
    { fill: '#F7DFD8', shade: '#DEA89E' },
  ];

  /* ========================================================================
     GardenScene Class
     ======================================================================== */

  class GardenScene {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.reducedMotion = Boolean(options && options.reducedMotion);

      this.width = 0;
      this.height = 0;
      this.dpr = 1;

      this.state = 'intro'; // 'intro' | 'blooming' | 'garden'
      this.time = 0;
      this.bloomElapsed = 0;

      // Pointer & parallax state
      this.pointer = {
        x: -999,
        y: -999,
        vx: 0,
        vy: 0,
        active: false,
        normX: 0,
        normY: 0,
        smoothNormX: 0,
        smoothNormY: 0,
      };

      // Interactive wind gust state
      this.gust = {
        strength: 0,
        waveX: -200,
        active: false,
      };

      this.flowers = [];
      this.grassBlades = [];
      this.petals = [];
      this.seeds = [];
      this.motes = [];
      this.sunbeams = [
        { xRatio: 0.22, widthRatio: 0.18, angle: 0.26, phase: 0.0, alpha: 0.13 },
        { xRatio: 0.54, widthRatio: 0.22, angle: 0.22, phase: 2.1, alpha: 0.11 },
        { xRatio: 0.80, widthRatio: 0.15, angle: 0.18, phase: 4.2, alpha: 0.09 },
      ];

      this.resize();
      this.initAmbientParticles();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(320, rect.width || window.innerWidth);
      this.height = Math.max(320, rect.height || window.innerHeight);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      const wasStarted = this.state !== 'intro';
      this.buildGarden(wasStarted);
    }

    /**
     * Build a non-repetitive, naturally layered botanical arrangement.
     */
    buildGarden(alreadyBloomed) {
      const w = this.width;
      const h = this.height;
      const isMobile = w < 640;
      const isTablet = w >= 640 && w < 1024;
      const totalFlowers = isMobile ? 28 : isTablet ? 40 : 54;

      this.flowers = [];
      this.grassBlades = [];

      // Distribute flowers across 3 depth layers (0: back, 1: mid, 2: front)
      // using jittered stratified X slots to avoid awkward clumping or repetition.
      const layerSpecs = [
        { depth: 0, count: Math.round(totalFlowers * 0.34), heightMin: 0.42, heightMax: 0.72, scale: 0.76, alpha: 0.78, parallax: 0.35 },
        { depth: 1, count: Math.round(totalFlowers * 0.40), heightMin: 0.30, heightMax: 0.62, scale: 1.0,  alpha: 0.96, parallax: 0.75 },
        { depth: 2, count: Math.round(totalFlowers * 0.26), heightMin: 0.18, heightMax: 0.42, scale: 1.18, alpha: 1.0,  parallax: 1.20 },
      ];

      const speciesPoolByDepth = {
        0: ['lily', 'white', 'dandelion', 'rose', 'white', 'dandelion'],
        1: ['rose', 'lily', 'rose', 'dandelion', 'white', 'rose', 'lily'],
        2: ['rose', 'white', 'dandelion', 'rose', 'white', 'lily'],
      };

      const sizeFactor = isMobile ? 0.84 : isTablet ? 0.94 : 1.0;

      layerSpecs.forEach((layer) => {
        const step = (w + 60) / Math.max(1, layer.count);
        for (let i = 0; i < layer.count; i++) {
          const baseX = -30 + step * (i + 0.5) + rand(-step * 0.36, step * 0.36);
          const stemHeight = h * rand(layer.heightMin, layer.heightMax);
          const species = speciesPoolByDepth[layer.depth][
            (i + Math.floor(Math.random() * 2)) % speciesPoolByDepth[layer.depth].length
          ];

          const flower = this.createFlower(species, {
            x: baseX,
            y: h + 18,
            stemHeight,
            depth: layer.depth,
            scale: layer.scale * sizeFactor * rand(0.86, 1.16),
            alpha: layer.alpha,
            parallax: layer.parallax,
            alreadyBloomed,
          });
          this.flowers.push(flower);
        }
      });

      // Sort back-to-front so foreground naturally overlaps background
      this.flowers.sort((a, b) => a.depth - b.depth || b.stemHeight - a.stemHeight);

      // Build soft meadow grass blades along the bottom border
      const bladeCount = isMobile ? 48 : 88;
      for (let i = 0; i < bladeCount; i++) {
        this.grassBlades.push({
          x: rand(-20, w + 20),
          height: h * rand(0.06, 0.16),
          curve: rand(-26, 26),
          width: rand(2.2, 4.6),
          phase: rand(0, TAU),
          depth: i % 3,
          color: pick(['#6A8569', '#577358', '#7C9678', '#4B664E', '#8CA182']),
          alpha: rand(0.42, 0.78),
        });
      }
    }

    createFlower(species, cfg) {
      const baseDelay =
        cfg.depth === 0 ? rand(0.05, 1.05) :
        cfg.depth === 1 ? rand(0.35, 1.65) :
        rand(0.75, 2.2);

      const flower = {
        species,
        x: cfg.x,
        y: cfg.y,
        stemHeight: cfg.stemHeight,
        depth: cfg.depth,
        scale: cfg.scale,
        alpha: cfg.alpha,
        parallax: cfg.parallax,
        curveOffset: rand(-55, 55) * (cfg.depth === 2 ? 0.8 : 1.0),
        headTilt: rand(-0.34, 0.34),
        phase: rand(0, TAU),
        swayFreq: rand(0.55, 0.92),
        swayAmp: rand(12, 26) * (0.7 + cfg.stemHeight / Math.max(400, this.height) * 0.6),
        pushX: 0,
        pushVel: 0,
        bloomDelay: baseDelay,
        bloomDuration: rand(2.3, 3.2),
        bloomProgress: cfg.alreadyBloomed ? 1 : 0,
        stemColor: pick(['#4B6B4F', '#5A7B5B', '#3E5B43', '#668463']),
        leafColor: pick(['#567858', '#47664B', '#688766']),
        leaves: [],
        headX: cfg.x,
        headY: cfg.y - cfg.stemHeight,
      };

      // Generate leaves attached along the stem
      const leafCount = species === 'lily' ? 4 : species === 'rose' ? 3 : 2;
      for (let i = 0; i < leafCount; i++) {
        flower.leaves.push({
          t: lerp(0.24, 0.72, i / Math.max(1, leafCount - 1)) + rand(-0.05, 0.05),
          side: i % 2 === 0 ? -1 : 1,
          length: rand(22, 42) * cfg.scale * (species === 'lily' ? 1.35 : 1.0),
          width: rand(8, 15) * cfg.scale * (species === 'lily' ? 0.68 : 1.0),
          angleOffset: rand(0.38, 0.78),
        });
      }

      // Species-specific botanical details
      if (species === 'rose') {
        flower.variant = pick(['red', 'pink', 'pastel', 'pink', 'red']);
        flower.radius = rand(23, 32) * cfg.scale;
        flower.petalSpin = rand(0, TAU);
      } else if (species === 'lily') {
        flower.variant = pick(['white', 'pink', 'white']);
        flower.radius = rand(28, 38) * cfg.scale;
        flower.petalSpin = rand(-0.35, 0.35);
        flower.hasSideBud = Math.random() > 0.42;
        flower.budSide = Math.random() > 0.5 ? 1 : -1;
      } else if (species === 'dandelion') {
        flower.radius = rand(21, 29) * cfg.scale;
        flower.dandelionSeeds = [];
        const seedCount = 34;
        for (let i = 0; i < seedCount; i++) {
          const angle = (i / seedCount) * TAU + rand(-0.08, 0.08);
          flower.dandelionSeeds.push({
            angle,
            len: flower.radius * rand(0.84, 1.08),
            attached: true,
            regrowAt: 0,
          });
        }
      } else {
        // White blossom spray
        flower.radius = rand(8.5, 12.5) * cfg.scale;
        flower.sprayBlooms = [];
        const subCount = Math.floor(rand(4, 7));
        for (let i = 0; i < subCount; i++) {
          const angle = -Math.PI / 2 + rand(-1.05, 1.05);
          const dist = rand(18, 48) * cfg.scale;
          flower.sprayBlooms.push({
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            size: flower.radius * rand(0.72, 1.15),
            rot: rand(0, TAU),
            isBud: i === subCount - 1 && Math.random() > 0.4,
          });
        }
      }

      return flower;
    }

    initAmbientParticles() {
      const w = this.width;
      const h = this.height;
      this.petals = [];
      this.seeds = [];
      this.motes = [];

      const petalCount = w < 640 ? 12 : 22;
      for (let i = 0; i < petalCount; i++) {
        this.petals.push(this.createPetal(rand(0, w), rand(-h * 0.2, h)));
      }

      const seedCount = w < 640 ? 14 : 24;
      for (let i = 0; i < seedCount; i++) {
        this.seeds.push(this.createFloatingSeed(rand(0, w), rand(0, h * 0.85)));
      }

      const moteCount = w < 640 ? 22 : 38;
      for (let i = 0; i < moteCount; i++) {
        this.motes.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(1.1, 2.8),
          vx: rand(3, 10),
          vy: rand(-8, -2),
          phase: rand(0, TAU),
          alpha: rand(0.18, 0.52),
        });
      }
    }

    createPetal(x, y, burst) {
      const tone = pick(PETAL_COLORS);
      return {
        x,
        y,
        vx: burst ? rand(-48, 65) : rand(8, 28),
        vy: burst ? rand(-72, -12) : rand(14, 32),
        size: rand(6.5, 12.5),
        rot: rand(0, TAU),
        vRot: rand(-1.6, 1.6),
        flutterPhase: rand(0, TAU),
        flutterSpeed: rand(1.8, 3.4),
        fill: tone.fill,
        shade: tone.shade,
        alpha: rand(0.68, 0.94),
        life: burst ? 1 : 2,
      };
    }

    createFloatingSeed(x, y, boosted) {
      return {
        x,
        y,
        vx: boosted ? rand(26, 76) : rand(12, 34),
        vy: boosted ? rand(-36, -6) : rand(-14, 6),
        size: rand(8, 13),
        phase: rand(0, TAU),
        alpha: rand(0.6, 0.92),
        tilt: rand(-0.2, 0.3),
      };
    }

    /* ========================================================================
       Public Controls
       ======================================================================== */

    startBloom() {
      this.state = 'blooming';
      this.bloomElapsed = 0;
      this.flowers.forEach((f) => {
        f.bloomProgress = this.reducedMotion ? 1 : 0;
        if (f.dandelionSeeds) {
          f.dandelionSeeds.forEach((s) => {
            s.attached = true;
            s.regrowAt = 0;
          });
        }
      });
      if (this.reducedMotion) {
        this.state = 'garden';
      }
    }

    replayBloom() {
      this.startBloom();
    }

    triggerBreeze() {
      this.gust.active = true;
      this.gust.strength = 1.0;
      this.gust.waveX = -120;

      // Release a graceful scatter of petals from upper-left
      const count = this.width < 640 ? 6 : 10;
      for (let i = 0; i < count; i++) {
        this.petals.push(this.createPetal(rand(-40, this.width * 0.45), rand(20, this.height * 0.5), false));
      }
      if (this.petals.length > 52) {
        this.petals.splice(0, this.petals.length - 52);
      }
    }

    setPointer(x, y, active) {
      if (active && this.pointer.active) {
        this.pointer.vx = clamp(x - this.pointer.x, -45, 45);
        this.pointer.vy = clamp(y - this.pointer.y, -45, 45);
      } else {
        this.pointer.vx = 0;
        this.pointer.vy = 0;
      }
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = active;
      if (active) {
        this.pointer.normX = (x / this.width - 0.5) * 2;
        this.pointer.normY = (y / this.height - 0.5) * 2;
      } else {
        this.pointer.normX = 0;
        this.pointer.normY = 0;
      }
    }

    interactAt(x, y) {
      if (this.state === 'intro') return;

      // Scatter petals and a few dandelion seeds from tap/click location
      const petalBurst = this.width < 640 ? 6 : 9;
      for (let i = 0; i < petalBurst; i++) {
        this.petals.push(this.createPetal(x + rand(-14, 14), y + rand(-14, 14), true));
      }
      if (this.petals.length > 58) {
        this.petals.splice(0, this.petals.length - 58);
      }

      // Check nearby flowers to rustle stems and puff dandelion heads
      this.flowers.forEach((f) => {
        const dx = f.headX - x;
        const dy = f.headY - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          const dir = dx >= 0 ? 1 : -1;
          f.pushVel += dir * (1 - dist / 140) * 42;
          if (f.species === 'dandelion' && f.dandelionSeeds && f.bloomProgress > 0.75) {
            this.detachDandelionSeeds(f, 7);
          }
        }
      });
    }

    detachDandelionSeeds(flower, maxCount) {
      let released = 0;
      for (let i = 0; i < flower.dandelionSeeds.length && released < maxCount; i++) {
        const seed = flower.dandelionSeeds[i];
        if (seed.attached && Math.random() < 0.45) {
          seed.attached = false;
          seed.regrowAt = this.time + rand(14, 24);
          const sx = flower.headX + Math.cos(seed.angle) * seed.len;
          const sy = flower.headY + Math.sin(seed.angle) * seed.len;
          this.seeds.push(this.createFloatingSeed(sx, sy, true));
          released++;
        }
      }
      if (this.seeds.length > 55) {
        this.seeds.splice(0, this.seeds.length - 55);
      }
    }

    /* ========================================================================
       Update Loop
       ======================================================================== */

    update(dt) {
      const motionScale = this.reducedMotion ? 0.25 : 1.0;
      this.time += dt * motionScale;

      // Smooth pointer parallax
      this.pointer.smoothNormX = lerp(this.pointer.smoothNormX, this.pointer.normX, Math.min(1, dt * 3.2));
      this.pointer.smoothNormY = lerp(this.pointer.smoothNormY, this.pointer.normY, Math.min(1, dt * 3.2));
      this.pointer.vx *= Math.pow(0.08, dt);
      this.pointer.vy *= Math.pow(0.08, dt);

      // Update wind gust wave
      if (this.gust.active) {
        this.gust.waveX += dt * Math.max(420, this.width * 0.55);
        this.gust.strength = Math.max(0, this.gust.strength - dt * 0.38);
        if (this.gust.strength <= 0.01 && this.gust.waveX > this.width + 260) {
          this.gust.active = false;
        }
      }

      // Advance bloom animation
      if (this.state === 'blooming') {
        this.bloomElapsed += dt;
        let allDone = true;
        for (let i = 0; i < this.flowers.length; i++) {
          const f = this.flowers[i];
          const p = (this.bloomElapsed - f.bloomDelay) / f.bloomDuration;
          f.bloomProgress = clamp(p, 0, 1);
          if (f.bloomProgress < 1) allDone = false;
        }
        if (allDone) {
          this.state = 'garden';
        }
      }

      // Update flower spring physics and dandelion seed detachment
      for (let i = 0; i < this.flowers.length; i++) {
        const f = this.flowers[i];

        // Gentle cursor brush interaction
        if (this.pointer.active && this.state !== 'intro' && f.bloomProgress > 0.35) {
          const dx = f.headX - this.pointer.x;
          const dy = f.headY - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 105) {
            const influence = (1 - dist / 105) * 0.9;
            f.pushVel += this.pointer.vx * influence * 0.42;
            if (
              f.species === 'dandelion' &&
              f.bloomProgress > 0.85 &&
              Math.abs(this.pointer.vx) + Math.abs(this.pointer.vy) > 4 &&
              Math.random() < dt * 8
            ) {
              this.detachDandelionSeeds(f, 2);
            }
          }
        }

        // Gust wave passing a dandelion gently detaches seeds
        if (this.gust.active && f.species === 'dandelion' && f.bloomProgress > 0.85) {
          const waveDist = Math.abs(f.headX - this.gust.waveX);
          if (waveDist < 70 && Math.random() < dt * 7) {
            this.detachDandelionSeeds(f, 3);
          }
        }

        // Regrow detached dandelion seeds slowly so the garden stays alive
        if (f.dandelionSeeds) {
          for (let s = 0; s < f.dandelionSeeds.length; s++) {
            const seed = f.dandelionSeeds[s];
            if (!seed.attached && seed.regrowAt > 0 && this.time > seed.regrowAt) {
              seed.attached = true;
              seed.regrowAt = 0;
            }
          }
        }

        // Damped harmonic spring for cursor/tap sway
        const springForce = -f.pushX * 14.0;
        f.pushVel = (f.pushVel + springForce * dt) * Math.pow(0.12, dt);
        f.pushX = clamp(f.pushX + f.pushVel * dt, -65, 65);
      }

      this.updateParticles(dt * motionScale);
    }

    updateParticles(dt) {
      const w = this.width;
      const h = this.height;
      const gustBoost = this.gust.active ? this.gust.strength * 65 : 0;

      // Falling petals
      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        p.flutterPhase += p.flutterSpeed * dt;
        const sway = Math.sin(p.flutterPhase) * 24;

        p.vx = lerp(p.vx, 18 + gustBoost * 0.85, dt * 1.4);
        p.vy = lerp(p.vy, 22, dt * 1.1);

        // Gentle cursor swirl
        if (this.pointer.active) {
          const dx = p.x - this.pointer.x;
          const dy = p.y - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110 && dist > 1) {
            p.vx += (this.pointer.vx * 0.8 + (dx / dist) * 20) * dt * 2;
            p.vy += (this.pointer.vy * 0.8 + (dy / dist) * 20) * dt * 2;
          }
        }

        p.x += (p.vx + sway) * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;

        if (p.y > h + 30 || p.x > w + 50 || p.x < -60) {
          p.x = rand(-40, w * 0.85);
          p.y = rand(-40, -10);
          p.vx = rand(8, 26);
          p.vy = rand(14, 30);
        }
      }

      // Floating dandelion seeds
      for (let i = 0; i < this.seeds.length; i++) {
        const s = this.seeds[i];
        s.phase += dt * 1.7;
        const lift = Math.sin(s.phase) * 12;

        s.vx = lerp(s.vx, 22 + gustBoost, dt * 1.2);
        s.vy = lerp(s.vy, -5 + Math.cos(s.phase * 0.7) * 8, dt * 1.1);

        if (this.pointer.active) {
          const dx = s.x - this.pointer.x;
          const dy = s.y - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 1) {
            s.vx += (this.pointer.vx * 1.1 + (dx / dist) * 26) * dt * 2.2;
            s.vy += (this.pointer.vy * 1.1 - 12) * dt * 2.2;
          }
        }

        s.x += s.vx * dt;
        s.y += (s.vy + lift) * dt;
        s.tilt = clamp(s.vx * 0.008, -0.35, 0.55);

        if (s.x > w + 40 || s.y < -40 || s.y > h + 40) {
          s.x = rand(-30, w * 0.4);
          s.y = rand(h * 0.25, h * 0.9);
          s.vx = rand(12, 32);
          s.vy = rand(-12, 4);
        }
      }

      // Golden pollen motes
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        m.phase += dt * 1.4;
        m.x += (m.vx + Math.sin(m.phase) * 6 + gustBoost * 0.3) * dt;
        m.y += (m.vy + Math.cos(m.phase * 0.8) * 4) * dt;
        if (m.x > w + 10) m.x = -10;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = rand(0, w);
        }
      }
    }

    /* ========================================================================
       Render Pipeline
       ======================================================================== */

    render() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      this.drawBackdrop(ctx, w, h);
      this.drawSunbeams(ctx, w, h);
      this.drawMeadowHorizon(ctx, w, h);

      // Draw flowers by depth layer (0 -> 1 -> 2), interleaving grass blades
      for (let depth = 0; depth <= 2; depth++) {
        this.drawGrassLayer(ctx, depth);

        for (let i = 0; i < this.flowers.length; i++) {
          const f = this.flowers[i];
          if (f.depth === depth) {
            this.drawFlower(ctx, f);
          }
        }

        // Put half of the pollen motes between midground and foreground for depth
        if (depth === 1) {
          this.drawPollenMotes(ctx);
        }
      }

      this.drawFloatingSeeds(ctx);
      this.drawFallingPetals(ctx);
      this.drawCursorGlow(ctx);
    }

    drawBackdrop(ctx, w, h) {
      // Warm cream-to-blush-to-beige morning gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0.0, '#FCF8F2');
      sky.addColorStop(0.42, '#F7ECE6');
      sky.addColorStop(0.76, '#EFE5D6');
      sky.addColorStop(1.0, '#DFE0CC');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Soft warm golden-hour sun glow in upper-left sky
      const sunX = w * 0.24 - this.pointer.smoothNormX * 14;
      const sunY = h * 0.14 - this.pointer.smoothNormY * 10;
      const sunR = Math.max(w, h) * 0.55;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunR);
      sunGrad.addColorStop(0, 'rgba(255, 243, 212, 0.72)');
      sunGrad.addColorStop(0.35, 'rgba(248, 224, 210, 0.34)');
      sunGrad.addColorStop(1, 'rgba(252, 248, 242, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    }

    drawSunbeams(ctx, w, h) {
      ctx.save();
      for (let i = 0; i < this.sunbeams.length; i++) {
        const b = this.sunbeams[i];
        const pulse = 0.72 + 0.28 * Math.sin(this.time * 0.45 + b.phase);
        const x = w * b.xRatio + Math.sin(this.time * 0.22 + b.phase) * 26 - this.pointer.smoothNormX * 12;
        const beamW = w * b.widthRatio;

        ctx.save();
        ctx.translate(x, -40);
        ctx.rotate(b.angle);

        const grad = ctx.createLinearGradient(0, 0, 0, h * 1.2);
        grad.addColorStop(0, `rgba(255, 244, 214, ${(b.alpha * pulse).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(248, 232, 206, ${(b.alpha * 0.45 * pulse).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255, 244, 214, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(-beamW * 0.5, 0, beamW, h * 1.25);
        ctx.restore();
      }
      ctx.restore();
    }

    drawMeadowHorizon(ctx, w, h) {
      const px = -this.pointer.smoothNormX * 10;

      // Distant soft sage-beige hill
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.86);
      ctx.bezierCurveTo(w * 0.28 + px, h * 0.78, w * 0.65 + px, h * 0.90, w, h * 0.82);
      ctx.lineTo(w, h);
      ctx.closePath();

      const hillGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
      hillGrad.addColorStop(0, 'rgba(196, 205, 181, 0.42)');
      hillGrad.addColorStop(1, 'rgba(136, 158, 128, 0.52)');
      ctx.fillStyle = hillGrad;
      ctx.fill();

      // Closer warm meadow mist
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.91);
      ctx.bezierCurveTo(w * 0.35 + px * 1.6, h * 0.86, w * 0.72 + px * 1.6, h * 0.94, w, h * 0.89);
      ctx.lineTo(w, h);
      ctx.closePath();

      const nearGrad = ctx.createLinearGradient(0, h * 0.86, 0, h);
      nearGrad.addColorStop(0, 'rgba(132, 155, 124, 0.42)');
      nearGrad.addColorStop(1, 'rgba(78, 106, 78, 0.68)');
      ctx.fillStyle = nearGrad;
      ctx.fill();
      ctx.restore();
    }

    drawGrassLayer(ctx, depth) {
      const h = this.height;
      const px = -this.pointer.smoothNormX * (depth * 11 + 6);

      ctx.save();
      for (let i = 0; i < this.grassBlades.length; i++) {
        const g = this.grassBlades[i];
        if (g.depth !== depth) continue;

        const sway =
          Math.sin(this.time * 1.15 + g.phase + g.x * 0.004) * 10 +
          (this.gust.active ? Math.exp(-Math.pow((g.x - this.gust.waveX) / 170, 2)) * 28 * this.gust.strength : 0);

        const baseX = g.x + px;
        const baseY = h + 10;
        const tipX = baseX + g.curve + sway;
        const tipY = h - g.height;
        const ctrlX = baseX + (g.curve + sway) * 0.35;
        const ctrlY = h - g.height * 0.55;

        ctx.beginPath();
        ctx.moveTo(baseX - g.width * 0.5, baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX + g.width * 0.45, ctrlY, baseX + g.width * 0.5, baseY);
        ctx.closePath();

        ctx.globalAlpha = g.alpha;
        ctx.fillStyle = g.color;
        ctx.fill();
      }
      ctx.restore();
    }

    drawFlower(ctx, f) {
      // During intro, show a delicate resting preview (softly emerging buds)
      const growth = this.state === 'intro' ? 0.14 : f.bloomProgress;
      if (growth <= 0.005) return;

      const stemGrowth = easeOutCubic(clamp(growth / 0.52, 0, 1));
      const leafGrowth = easeOutCubic(clamp((growth - 0.22) / 0.42, 0, 1));
      const headGrowth = easeOutBack(clamp((growth - 0.38) / 0.62, 0, 1));

      // Compute organic wind sway
      const spatialWave = Math.sin(this.time * f.swayFreq + f.phase - f.x * 0.0026);
      const secondaryWave = Math.sin(this.time * (f.swayFreq * 0.47) + f.phase * 1.7) * 0.42;
      let gustPush = 0;
      if (this.gust.active) {
        const distToWave = Math.abs(f.x - this.gust.waveX);
        gustPush = Math.exp(-Math.pow(distToWave / 190, 2)) * 52 * this.gust.strength;
      }

      const parallaxX = -this.pointer.smoothNormX * 18 * f.parallax;
      const parallaxY = -this.pointer.smoothNormY * 7 * f.parallax;

      const baseX = f.x + parallaxX;
      const baseY = f.y + parallaxY;
      const curHeight = f.stemHeight * stemGrowth;
      const totalSway = ((spatialWave + secondaryWave) * f.swayAmp + gustPush + f.pushX) * stemGrowth;

      const headX = baseX + f.curveOffset * 0.45 * stemGrowth + totalSway;
      const headY = baseY - curHeight + Math.abs(totalSway) * 0.09;
      const ctrlX = baseX + f.curveOffset * stemGrowth + totalSway * 0.42;
      const ctrlY = baseY - curHeight * 0.52;

      f.headX = headX;
      f.headY = headY;

      ctx.save();
      ctx.globalAlpha = f.alpha;

      // 1. Draw tapered organic stem
      const stemThickness = (f.species === 'white' ? 1.8 : f.species === 'dandelion' ? 2.4 : 3.2) * f.scale;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY);
      ctx.strokeStyle = f.stemColor;
      ctx.lineWidth = stemThickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Subtle sunlit highlight edge on stem
      ctx.beginPath();
      ctx.moveTo(baseX - 0.6, baseY);
      ctx.quadraticCurveTo(ctrlX - 0.6, ctrlY, headX - 0.4, headY);
      ctx.strokeStyle = 'rgba(220, 232, 198, 0.25)';
      ctx.lineWidth = Math.max(0.8, stemThickness * 0.32);
      ctx.stroke();

      // 2. Draw leaves attached along the bent Bezier stem
      if (leafGrowth > 0.02) {
        for (let i = 0; i < f.leaves.length; i++) {
          const lf = f.leaves[i];
          if (lf.t > stemGrowth * 0.96) continue;
          const pt = quadPoint(baseX, baseY, ctrlX, ctrlY, headX, headY, lf.t);
          const stemAng = quadAngle(baseX, baseY, ctrlX, ctrlY, headX, headY, lf.t);
          this.drawLeaf(ctx, pt.x, pt.y, stemAng + lf.side * lf.angleOffset, lf.length * leafGrowth, lf.width * leafGrowth, f.leafColor, f.species === 'lily');
        }
      }

      // 3. Draw bloom head
      if (headGrowth > 0.02) {
        const neckAngle = quadAngle(baseX, baseY, ctrlX, ctrlY, headX, headY, 0.98) + Math.PI / 2;
        const headRot = neckAngle * 0.45 + f.headTilt + totalSway * 0.004;

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(headRot);

        if (f.species === 'rose') {
          this.drawRose(ctx, f, headGrowth);
        } else if (f.species === 'lily') {
          this.drawLily(ctx, f, headGrowth);
        } else if (f.species === 'dandelion') {
          this.drawDandelion(ctx, f, headGrowth);
        } else {
          this.drawWhiteSpray(ctx, f, headGrowth);
        }

        ctx.restore();
      }

      ctx.restore();
    }

    drawLeaf(ctx, x, y, angle, length, width, color, isSlender) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      if (isSlender) {
        ctx.bezierCurveTo(length * 0.3, -width * 0.75, length * 0.78, -width * 0.42, length, 0);
        ctx.bezierCurveTo(length * 0.72, width * 0.45, length * 0.26, width * 0.65, 0, 0);
      } else {
        ctx.bezierCurveTo(length * 0.28, -width, length * 0.72, -width * 0.85, length, 0);
        ctx.bezierCurveTo(length * 0.72, width * 0.85, length * 0.28, width, 0, 0);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, length, 0);
      grad.addColorStop(0, '#3C5940');
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, '#7D9B76');
      ctx.fillStyle = grad;
      ctx.fill();

      // Delicate central leaf vein
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(length * 0.84, 0);
      ctx.strokeStyle = 'rgba(235, 240, 222, 0.34)';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      ctx.restore();
    }

    /* ========================================================================
       Species Renderers
       ======================================================================== */

    drawRose(ctx, f, growth) {
      const pal = ROSE_PALETTES[f.variant];
      const open = clamp(growth, 0.05, 1.05);
      const r = f.radius * (0.35 + 0.65 * Math.min(open, 1));

      // Calyx / green sepals peeking behind outer petals
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + f.petalSpin;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.24, -r * 0.62, 0, -r * 1.12);
        ctx.quadraticCurveTo(-r * 0.24, -r * 0.62, 0, 0);
        ctx.fillStyle = '#4B6B4F';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Helper to draw one cupped rose petal ring
      const drawPetalRing = (count, radiusScale, widthScale, offsetAngle, innerColor, outerColor, rimColor, openFactor) => {
        const pr = r * radiusScale * openFactor;
        const pw = r * widthScale * openFactor;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + offsetAngle;
          ctx.save();
          ctx.rotate(a);
          ctx.translate(0, -pr * 0.34);

          ctx.beginPath();
          ctx.moveTo(0, pr * 0.25);
          ctx.bezierCurveTo(-pw * 0.95, pr * 0.05, -pw * 0.92, -pr * 0.86, 0, -pr * 0.94);
          ctx.bezierCurveTo(pw * 0.92, -pr * 0.86, pw * 0.95, pr * 0.05, 0, pr * 0.25);
          ctx.closePath();

          const grad = ctx.createRadialGradient(0, pr * 0.1, pr * 0.08, 0, -pr * 0.35, pr * 0.95);
          grad.addColorStop(0, innerColor);
          grad.addColorStop(0.68, outerColor);
          grad.addColorStop(1, rimColor);
          ctx.fillStyle = grad;
          ctx.fill();

          // Soft sunlit curled lip highlight
          ctx.strokeStyle = 'rgba(255, 250, 246, 0.34)';
          ctx.lineWidth = 0.85;
          ctx.stroke();

          ctx.restore();
        }
      };

      const outerOpen = clamp((open - 0.15) / 0.85, 0.25, 1.0);
      const midOpen = clamp((open - 0.05) / 0.9, 0.3, 1.0);

      // Outer guard petals
      drawPetalRing(6, 1.04, 0.64, f.petalSpin, pal.mid, pal.outer, pal.rim, outerOpen);
      // Middle cupped petals
      drawPetalRing(6, 0.78, 0.52, f.petalSpin + 0.52, pal.deep, pal.mid, pal.outer, midOpen);
      // Inner spiraled petals
      drawPetalRing(5, 0.52, 0.38, f.petalSpin + 1.08, pal.core, pal.deep, pal.mid, 0.92);

      // Velvety center bud heart
      const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.28);
      coreGrad.addColorStop(0, pal.core);
      coreGrad.addColorStop(0.7, pal.deep);
      coreGrad.addColorStop(1, pal.mid);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.26, 0, TAU);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Delicate spiral center strokes
      ctx.strokeStyle = pal.rim;
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      for (let t = 0; t < 2.2 * Math.PI; t += 0.22) {
        const sr = (t / (2.2 * Math.PI)) * r * 0.24;
        const sx = Math.cos(t + f.petalSpin) * sr;
        const sy = Math.sin(t + f.petalSpin) * sr;
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    drawLily(ctx, f, growth) {
      const pal = LILY_PALETTES[f.variant];
      const open = clamp(growth, 0.05, 1.02);
      const r = f.radius * (0.42 + 0.58 * Math.min(open, 1));

      // Optional unopened side bud branching near neck
      if (f.hasSideBud) {
        ctx.save();
        ctx.translate(f.budSide * r * 0.28, r * 0.55);
        ctx.rotate(f.budSide * 0.65);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(f.budSide * 4, -r * 0.35, 0, -r * 0.68);
        ctx.strokeStyle = f.stemColor;
        ctx.lineWidth = 1.6 * f.scale;
        ctx.stroke();

        ctx.translate(0, -r * 0.68);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-r * 0.16, -r * 0.18, -r * 0.12, -r * 0.48, 0, -r * 0.62);
        ctx.bezierCurveTo(r * 0.12, -r * 0.48, r * 0.16, -r * 0.18, 0, 4);
        const budGrad = ctx.createLinearGradient(0, 4, 0, -r * 0.62);
        budGrad.addColorStop(0, pal.throat);
        budGrad.addColorStop(0.45, pal.blush);
        budGrad.addColorStop(1, pal.tip);
        ctx.fillStyle = budGrad;
        ctx.fill();
        ctx.restore();
      }

      // Draw 6 elongated pointed lily tepals (3 outer, then 3 inner overlapping)
      const drawTepal = (angle, len, wid) => {
        ctx.save();
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wid * 0.95, -len * 0.28, -wid * 0.72, -len * 0.74, 0, -len);
        ctx.bezierCurveTo(wid * 0.72, -len * 0.74, wid * 0.95, -len * 0.28, 0, 0);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, -len);
        grad.addColorStop(0.0, pal.throat);
        grad.addColorStop(0.24, pal.blush);
        grad.addColorStop(0.68, pal.mid);
        grad.addColorStop(1.0, pal.tip);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(214, 192, 186, 0.45)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // Central midrib crease
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.08);
        ctx.lineTo(0, -len * 0.88);
        ctx.strokeStyle = pal.vein;
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // Botanical throat speckles
        ctx.fillStyle = pal.speckle;
        for (let s = 0; s < 5; s++) {
          const sy = -len * (0.2 + s * 0.075);
          const sx = (s % 2 === 0 ? -1 : 1) * wid * (0.14 + (s % 3) * 0.07);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.7, 1.05 * f.scale), 0, TAU);
          ctx.fill();
        }

        ctx.restore();
      };

      const spread = 0.48 + 0.52 * Math.min(open, 1);

      // 3 outer tepals
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + f.petalSpin;
        drawTepal(a, r * 1.08 * spread, r * 0.30 * spread);
      }

      // 3 inner slightly wider tepals
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + Math.PI / 3 + f.petalSpin;
        drawTepal(a, r * 1.02 * spread, r * 0.35 * spread);
      }

      // 6 arched stamens with golden-amber anthers
      if (open > 0.35) {
        const stScale = clamp((open - 0.35) / 0.65, 0, 1);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + 0.25 + f.petalSpin;
          const slen = r * 0.52 * stScale;
          ctx.save();
          ctx.rotate(a);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(r * 0.08, -slen * 0.55, 0, -slen);
          ctx.strokeStyle = '#ECE6D4';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          // Golden-amber pollen anther
          ctx.translate(0, -slen);
          ctx.rotate(0.42);
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.9 * f.scale, 1.35 * f.scale, 0, 0, TAU);
          ctx.fillStyle = '#C98A2E';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(-0.5, -0.3, 1.3 * f.scale, 0.55 * f.scale, 0, 0, TAU);
          ctx.fillStyle = '#F3D283';
          ctx.fill();

          ctx.restore();
        }

        // Central pale green stigma
        ctx.beginPath();
        ctx.arc(0, 0, 2.4 * f.scale, 0, TAU);
        ctx.fillStyle = '#89A46B';
        ctx.fill();
      }
    }

    drawDandelion(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * open;

      // Soft backlit translucent dandelion halo
      const halo = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.28);
      halo.addColorStop(0, 'rgba(255, 252, 246, 0.32)');
      halo.addColorStop(0.7, 'rgba(252, 248, 242, 0.24)');
      halo.addColorStop(1, 'rgba(252, 248, 242, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.28, 0, TAU);
      ctx.fillStyle = halo;
      ctx.fill();

      // Individual attached radial dandelion seeds
      if (f.dandelionSeeds) {
        for (let i = 0; i < f.dandelionSeeds.length; i++) {
          const s = f.dandelionSeeds[i];
          if (!s.attached) continue;
          const len = s.len * open;
          const ex = Math.cos(s.angle) * len;
          const ey = Math.sin(s.angle) * len;

          // Fine hair stalk
          ctx.beginPath();
          ctx.moveTo(Math.cos(s.angle) * 3.5, Math.sin(s.angle) * 3.5);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = 'rgba(248, 244, 236, 0.72)';
          ctx.lineWidth = 0.75;
          ctx.stroke();

          // Feathery star-like pappus tip
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(s.angle);
          ctx.strokeStyle = 'rgba(255, 253, 249, 0.92)';
          ctx.lineWidth = 0.72;
          const tuft = 4.2 * f.scale;
          for (let k = -2; k <= 2; k++) {
            const ta = k * 0.42;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ta) * tuft, Math.sin(ta) * tuft);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Soft warm olive-brown seed receptacle center
      const coreGrad = ctx.createRadialGradient(-1, -1, 0.8, 0, 0, 5.4 * f.scale);
      coreGrad.addColorStop(0, '#9A8868');
      coreGrad.addColorStop(0.65, '#6B5E49');
      coreGrad.addColorStop(1, '#4C5E44');
      ctx.beginPath();
      ctx.arc(0, 0, 5.2 * f.scale, 0, TAU);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    drawWhiteSpray(ctx, f, growth) {
      const open = clamp(growth, 0.05, 1.0);
      if (!f.sprayBlooms) return;

      for (let i = 0; i < f.sprayBlooms.length; i++) {
        const b = f.sprayBlooms[i];
        const bx = b.dx * open;
        const by = b.dy * open;

        // Delicate branching sub-stem
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.quadraticCurveTo(bx * 0.45, by * 0.35, bx, by);
        ctx.strokeStyle = f.stemColor;
        ctx.lineWidth = 1.05 * f.scale;
        ctx.stroke();

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.rot);

        if (b.isBud) {
          // Small creamy pearl bud
          ctx.beginPath();
          ctx.arc(0, 0, b.size * 0.34 * open, 0, TAU);
          ctx.fillStyle = '#FCF8F2';
          ctx.fill();
          ctx.strokeStyle = 'rgba(130, 148, 120, 0.45)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        } else {
          // Delicate 5-petal white blossom
          const pr = b.size * open;
          for (let p = 0; p < 5; p++) {
            ctx.save();
            ctx.rotate((p / 5) * TAU);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-pr * 0.42, -pr * 0.35, -pr * 0.38, -pr * 0.98, 0, -pr);
            ctx.bezierCurveTo(pr * 0.38, -pr * 0.98, pr * 0.42, -pr * 0.35, 0, 0);
            ctx.closePath();

            const grad = ctx.createRadialGradient(0, -pr * 0.1, 1, 0, -pr * 0.55, pr);
            grad.addColorStop(0, '#F1E6D6');
            grad.addColorStop(0.55, '#FCF8F2');
            grad.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
          }

          // Warm golden-ochre center
          ctx.beginPath();
          ctx.arc(0, 0, pr * 0.26, 0, TAU);
          ctx.fillStyle = '#D9B15E';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-pr * 0.06, -pr * 0.06, pr * 0.1, 0, TAU);
          ctx.fillStyle = '#F6DF9F';
          ctx.fill();
        }

        ctx.restore();
      }
    }

    /* ========================================================================
       Particles & Lighting Overlays
       ======================================================================== */

    drawPollenMotes(ctx) {
      ctx.save();
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.0 + m.phase);
        const grad = ctx.createRadialGradient(m.x, m.y, 0.2, m.x, m.y, m.r * 3.2);
        grad.addColorStop(0, `rgba(242, 212, 138, ${(m.alpha * twinkle).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(242, 212, 138, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 3.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawFloatingSeeds(ctx) {
      ctx.save();
      for (let i = 0; i < this.seeds.length; i++) {
        const s = this.seeds[i];
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.tilt + Math.sin(s.phase) * 0.12);
        ctx.globalAlpha = s.alpha;

        // Tiny achene seed at the bottom
        ctx.beginPath();
        ctx.ellipse(0, s.size * 0.55, 1.15, 2.5, 0, 0, TAU);
        ctx.fillStyle = '#7A644B';
        ctx.fill();

        // Slender vertical stalk
        ctx.beginPath();
        ctx.moveTo(0, s.size * 0.35);
        ctx.lineTo(0, -s.size * 0.35);
        ctx.strokeStyle = 'rgba(242, 236, 226, 0.85)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // Delicate feathery parachute umbrella
        ctx.translate(0, -s.size * 0.35);
        ctx.strokeStyle = 'rgba(255, 252, 248, 0.92)';
        ctx.lineWidth = 0.7;
        for (let k = -3; k <= 3; k++) {
          const ang = -Math.PI / 2 + k * 0.34;
          const flen = s.size * (0.58 - Math.abs(k) * 0.04);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * flen, Math.sin(ang) * flen);
          ctx.stroke();
        }

        ctx.restore();
      }
      ctx.restore();
    }

    drawFallingPetals(ctx) {
      ctx.save();
      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        const flutterScaleY = 0.45 + 0.55 * Math.abs(Math.cos(p.flutterPhase));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, flutterScaleY);
        ctx.globalAlpha = p.alpha;

        const r = p.size;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.5);
        ctx.bezierCurveTo(-r * 0.85, r * 0.1, -r * 0.72, -r * 0.75, 0, -r * 0.85);
        ctx.bezierCurveTo(r * 0.72, -r * 0.75, r * 0.85, r * 0.1, 0, r * 0.5);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, r * 0.5, 0, -r * 0.85);
        grad.addColorStop(0, p.shade);
        grad.addColorStop(1, p.fill);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
      }
      ctx.restore();
    }

    drawCursorGlow(ctx) {
      if (!this.pointer.active || this.state === 'intro') return;
      ctx.save();
      const grad = ctx.createRadialGradient(
        this.pointer.x,
        this.pointer.y,
        4,
        this.pointer.x,
        this.pointer.y,
        90
      );
      grad.addColorStop(0, 'rgba(255, 246, 224, 0.22)');
      grad.addColorStop(0.55, 'rgba(243, 198, 207, 0.08)');
      grad.addColorStop(1, 'rgba(255, 246, 224, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 90, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  global.GardenScene = GardenScene;
})(window);
