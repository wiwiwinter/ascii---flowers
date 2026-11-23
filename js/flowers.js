/**
 * Whispering Garden — Botanical Renderer & Seasonal Animation Engine
 * Renders 12 distinct botanical flower varieties across four smoothly
 * transitioning seasonal environments (Spring, Summer, Autumn, Winter)
 * with organic wind physics, parallax depth, lighting, and particles.
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
    const c1 = 1.3;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function lerpColorArr(a, b, t) {
    return [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];
  }

  function rgbaStr(c, alpha) {
    return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha.toFixed(3)})`;
  }

  function rgbStr(c) {
    return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
  }

  function quadPoint(x0, y0, cx, cy, x1, y1, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    };
  }

  function quadAngle(x0, y0, cx, cy, x1, y1, t) {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    return Math.atan2(dy, dx);
  }

  /* ========================================================================
     Botanical Color Palettes
     ======================================================================== */

  const ROSE_PALETTES = {
    red:    { core: '#6A1D2B', deep: '#963142', mid: '#BD5263', outer: '#DC8694', rim: '#F5CAD2' },
    pink:   { core: '#A64D62', deep: '#CE7388', mid: '#E8A3B4', outer: '#F5CCD6', rim: '#FFF1F4' },
    pastel: { core: '#BA766E', deep: '#D99A90', mid: '#EEBFB6', outer: '#F9DDD6', rim: '#FFF8F4' },
    white:  { core: '#C8BFB2', deep: '#DDD5C9', mid: '#F2ECE2', outer: '#FAF6F0', rim: '#FFFFFF' },
    autumn: { core: '#7C2B1E', deep: '#B04A2E', mid: '#D67549', outer: '#EFA97E', rim: '#FBE0C8' },
  };

  const TULIP_PALETTES = {
    coral:  { base: '#B54252', mid: '#E37A88', tip: '#FAD0D6' },
    yellow: { base: '#C88D24', mid: '#F0C451', tip: '#FDF0B8' },
    blush:  { base: '#C77A8C', mid: '#EEB4C3', tip: '#FFF0F4' },
    crimson:{ base: '#7B1E30', mid: '#B4394E', tip: '#E37E8E' },
  };

  const LILY_PALETTES = {
    white:   { throat: '#8BA268', blush: '#ECCBD1', mid: '#FBF5EC', tip: '#FFFFFF', vein: 'rgba(205,178,168,0.45)', speckle: 'rgba(176,84,98,0.5)' },
    pink:    { throat: '#889E68', blush: '#D67890', mid: '#F3C5D2', tip: '#FFF7F9', vein: 'rgba(186,94,118,0.4)',  speckle: 'rgba(154,48,72,0.62)' },
    apricot: { throat: '#8C9652', blush: '#D98648', mid: '#F4C48E', tip: '#FFF4E2', vein: 'rgba(196,120,62,0.4)',  speckle: 'rgba(148,64,28,0.58)' },
  };

  const HYDRANGEA_PALETTES = {
    blue:     { deep: '#7596BE', mid: '#A3C0DE', light: '#D8E8F6', center: '#F2F6FA' },
    lavender: { deep: '#9281B8', mid: '#B9AADB', light: '#E3DBF2', center: '#F6F2FC' },
    pink:     { deep: '#C97C93', mid: '#E6A8BC', light: '#F8DCE6', center: '#FFF4F8' },
    winter:   { deep: '#B8C9D9', mid: '#DCE7F2', light: '#F3F8FC', center: '#FFFFFF' },
  };

  const CHRYSANTHEMUM_PALETTES = {
    orange:  { core: '#7C2D12', mid: '#D4622A', tip: '#F4A658' },
    amber:   { core: '#8A4E10', mid: '#DDA02C', tip: '#F9DC7E' },
    crimson: { core: '#631820', mid: '#A9323C', tip: '#E17872' },
  };

  /* ========================================================================
     Seasonal Environments Configuration
     ======================================================================== */

  const SEASONS = {
    spring: {
      sky: [[252, 248, 242], [248, 236, 234], [239, 230, 217], [220, 227, 206]],
      sunColor: [255, 242, 216],
      beamColor: [255, 244, 220],
      hillFar: [190, 206, 178],
      hillNear: [122, 152, 118],
      grassColors: ['#6F8F6B', '#5B7C59', '#84A37C', '#4E6E4E'],
      stemColors: ['#4F7352', '#5F8460', '#426346', '#6D8E6A'],
      leafColors: ['#5B825D', '#4B704E', '#70946E'],
      particleMode: 'petals',
      petalPalette: [
        { fill: '#F7D0DA', shade: '#DF99AC' },
        { fill: '#FCE5EB', shade: '#E8B5C4' },
        { fill: '#FCF7F0', shade: '#E8DCCB' },
        { fill: '#F5C6A8', shade: '#DF9576' },
      ],
      moteColor: [244, 216, 146],
      seedBoost: 1.0,
      speciesByDepth: {
        0: ['cherryBlossom', 'lavender', 'babysBreath', 'dandelion', 'tulip', 'lily'],
        1: ['tulip', 'rose', 'cherryBlossom', 'daisy', 'dandelion', 'tulip', 'lavender'],
        2: ['tulip', 'daisy', 'rose', 'babysBreath', 'dandelion', 'cherryBlossom'],
      },
    },

    summer: {
      sky: [[253, 250, 238], [248, 240, 216], [233, 235, 208], [198, 218, 184]],
      sunColor: [255, 240, 188],
      beamColor: [255, 242, 198],
      hillFar: [162, 192, 148],
      hillNear: [86, 126, 84],
      grassColors: ['#4E7A50', '#3F6A44', '#638E5F', '#375E3B'],
      stemColors: ['#3F6842', '#4D784E', '#355A38', '#598256'],
      leafColors: ['#48754B', '#3A633E', '#5E8A5C'],
      particleMode: 'petals',
      petalPalette: [
        { fill: '#E8A6B4', shade: '#C97589' },
        { fill: '#C85C6D', shade: '#993446' },
        { fill: '#FCF7F0', shade: '#E9DCCB' },
        { fill: '#F4D06F', shade: '#D4A135' },
      ],
      moteColor: [248, 214, 118],
      seedBoost: 0.9,
      speciesByDepth: {
        0: ['sunflower', 'lily', 'lavender', 'hydrangea', 'dandelion', 'babysBreath'],
        1: ['sunflower', 'rose', 'lily', 'hydrangea', 'rose', 'daisy', 'lavender'],
        2: ['rose', 'hydrangea', 'daisy', 'babysBreath', 'dandelion', 'lily'],
      },
    },

    autumn: {
      sky: [[252, 243, 226], [245, 220, 190], [231, 196, 156], [204, 174, 130]],
      sunColor: [255, 218, 152],
      beamColor: [255, 220, 156],
      hillFar: [194, 168, 122],
      hillNear: [142, 112, 74],
      grassColors: ['#8F7D52', '#7A6842', '#A68B56', '#695838'],
      stemColors: ['#5E6846', '#6D6E48', '#52593B', '#7B6F4A'],
      leafColors: ['#7E7D4E', '#9C7C46', '#6A6E47'],
      particleMode: 'leaves',
      leafPalette: [
        { fill: '#D46632', shade: '#963A18' },
        { fill: '#E2A138', shade: '#A66D18' },
        { fill: '#B53D36', shade: '#781E1E' },
        { fill: '#C47E3E', shade: '#874D1E' },
      ],
      moteColor: [244, 194, 108],
      seedBoost: 0.75,
      speciesByDepth: {
        0: ['sunflower', 'chrysanthemum', 'lily', 'dandelion', 'babysBreath', 'lavender'],
        1: ['chrysanthemum', 'rose', 'lily', 'chrysanthemum', 'sunflower', 'dandelion'],
        2: ['chrysanthemum', 'rose', 'babysBreath', 'daisy', 'dandelion', 'rose'],
      },
    },

    winter: {
      sky: [[242, 247, 252], [227, 236, 245], [212, 225, 238], [198, 214, 230]],
      sunColor: [242, 248, 255],
      beamColor: [236, 245, 255],
      hillFar: [224, 234, 244],
      hillNear: [244, 249, 254],
      grassColors: ['#9EB2B8', '#8FA4AC', '#B5C5CB', '#C9D6DC'],
      stemColors: ['#6E8484', '#7C9292', '#5F7576', '#8BA0A0'],
      leafColors: ['#7B9394', '#698182', '#95AAAA'],
      particleMode: 'snow',
      moteColor: [232, 244, 255],
      seedBoost: 0.35,
      speciesByDepth: {
        0: ['lily', 'hydrangea', 'babysBreath', 'dandelion', 'rose', 'snowdrop'],
        1: ['rose', 'hydrangea', 'lily', 'snowdrop', 'babysBreath', 'rose'],
        2: ['snowdrop', 'rose', 'babysBreath', 'hydrangea', 'dandelion', 'snowdrop'],
      },
    },
  };

  function cloneEnv(seasonKey) {
    const s = SEASONS[seasonKey];
    return {
      sky: s.sky.map((c) => c.slice()),
      sunColor: s.sunColor.slice(),
      beamColor: s.beamColor.slice(),
      hillFar: s.hillFar.slice(),
      hillNear: s.hillNear.slice(),
    };
  }

  /* ========================================================================
     GardenScene Class
     ======================================================================== */

  class GardenScene {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.reducedMotion = Boolean(options && options.reducedMotion);
      this.season = (options && options.season && SEASONS[options.season]) ? options.season : 'spring';

      this.width = 0;
      this.height = 0;
      this.dpr = 1;

      this.state = 'intro'; // 'intro' | 'blooming' | 'garden'
      this.time = 0;
      this.bloomElapsed = 0;

      // Smoothly interpolated seasonal environment colors
      this.currentEnv = cloneEnv(this.season);

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

      this.gust = {
        strength: 0,
        waveX: -200,
        active: false,
      };

      this.flowers = [];
      this.outgoingFlowers = [];
      this.outgoingAlpha = 0;
      this.grassBlades = [];
      this.petals = [];
      this.seeds = [];
      this.snowflakes = [];
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

    /* ========================================================================
       Season Switching & Composition
       ======================================================================== */

    setSeason(newSeason) {
      if (!SEASONS[newSeason] || newSeason === this.season) return;

      // Cross-fade outgoing garden smoothly
      if (this.state !== 'intro' && this.flowers.length > 0) {
        this.outgoingFlowers = this.flowers;
        this.outgoingAlpha = 1.0;
      }

      this.season = newSeason;
      this.buildGarden(false);

      if (this.state !== 'intro') {
        this.state = this.reducedMotion ? 'garden' : 'blooming';
        this.bloomElapsed = 0;
        if (this.reducedMotion) {
          this.flowers.forEach((f) => { f.bloomProgress = 1; });
        }
      }

      this.refreshSeasonalParticles();
    }

    buildGarden(alreadyBloomed) {
      const w = this.width;
      const h = this.height;
      const isMobile = w < 640;
      const isTablet = w >= 640 && w < 1024;
      const totalFlowers = isMobile ? 30 : isTablet ? 44 : 58;
      const seasonCfg = SEASONS[this.season];

      this.flowers = [];
      this.grassBlades = [];

      const layerSpecs = [
        { depth: 0, count: Math.round(totalFlowers * 0.34), heightMin: 0.44, heightMax: 0.74, scale: 0.76, alpha: 0.80, parallax: 0.35 },
        { depth: 1, count: Math.round(totalFlowers * 0.40), heightMin: 0.30, heightMax: 0.62, scale: 1.00, alpha: 0.96, parallax: 0.75 },
        { depth: 2, count: Math.round(totalFlowers * 0.26), heightMin: 0.17, heightMax: 0.41, scale: 1.16, alpha: 1.00, parallax: 1.20 },
      ];

      const sizeFactor = isMobile ? 0.84 : isTablet ? 0.94 : 1.0;

      layerSpecs.forEach((layer) => {
        const pool = seasonCfg.speciesByDepth[layer.depth];
        const step = (w + 60) / Math.max(1, layer.count);
        for (let i = 0; i < layer.count; i++) {
          const baseX = -30 + step * (i + 0.5) + rand(-step * 0.36, step * 0.36);
          const species = pool[(i + Math.floor(Math.random() * 2)) % pool.length];

          // Give tall botanicals (sunflowers, lavender, cherry blossoms) natural height variation
          let heightMult = 1.0;
          if (species === 'sunflower' || species === 'cherryBlossom') heightMult = 1.12;
          else if (species === 'lavender') heightMult = 1.05;
          else if (species === 'snowdrop' || species === 'daisy') heightMult = 0.86;

          const stemHeight = clamp(h * rand(layer.heightMin, layer.heightMax) * heightMult, h * 0.14, h * 0.80);

          this.flowers.push(
            this.createFlower(species, {
              x: baseX,
              y: h + 18,
              stemHeight,
              depth: layer.depth,
              scale: layer.scale * sizeFactor * rand(0.86, 1.15),
              alpha: layer.alpha,
              parallax: layer.parallax,
              alreadyBloomed,
            })
          );
        }
      });

      this.flowers.sort((a, b) => a.depth - b.depth || b.stemHeight - a.stemHeight);

      const bladeCount = isMobile ? 46 : 86;
      for (let i = 0; i < bladeCount; i++) {
        this.grassBlades.push({
          x: rand(-20, w + 20),
          height: h * rand(0.055, 0.155) * (this.season === 'winter' ? 0.65 : 1.0),
          curve: rand(-26, 26),
          width: rand(2.2, 4.5),
          phase: rand(0, TAU),
          depth: i % 3,
          color: pick(seasonCfg.grassColors),
          alpha: rand(0.4, 0.78),
        });
      }
    }

    createFlower(species, cfg) {
      const seasonCfg = SEASONS[this.season];
      const baseDelay =
        cfg.depth === 0 ? rand(0.04, 0.9) :
        cfg.depth === 1 ? rand(0.28, 1.4) :
        rand(0.58, 1.9);

      const flower = {
        species,
        season: this.season,
        x: cfg.x,
        y: cfg.y,
        stemHeight: cfg.stemHeight,
        depth: cfg.depth,
        scale: cfg.scale,
        alpha: cfg.alpha,
        parallax: cfg.parallax,
        curveOffset: rand(-52, 52) * (cfg.depth === 2 ? 0.8 : 1.0),
        headTilt: rand(-0.34, 0.34),
        phase: rand(0, TAU),
        swayFreq: rand(0.55, 0.92),
        swayAmp: rand(11, 24) * (0.7 + (cfg.stemHeight / Math.max(400, this.height)) * 0.55),
        pushX: 0,
        pushVel: 0,
        bloomDelay: baseDelay,
        bloomDuration: rand(2.0, 2.9),
        bloomProgress: cfg.alreadyBloomed ? 1 : 0,
        stemColor: species === 'cherryBlossom' ? '#6B4F4B' : pick(seasonCfg.stemColors),
        leafColor: pick(seasonCfg.leafColors),
        leaves: [],
        headX: cfg.x,
        headY: cfg.y - cfg.stemHeight,
      };

      // Attach species-appropriate leaves
      if (species !== 'cherryBlossom') {
        const leafCount = species === 'lily' || species === 'tulip' ? 3 : species === 'sunflower' || species === 'hydrangea' ? 3 : 2;
        for (let i = 0; i < leafCount; i++) {
          flower.leaves.push({
            t: lerp(0.22, 0.68, i / Math.max(1, leafCount - 1)) + rand(-0.05, 0.05),
            side: i % 2 === 0 ? -1 : 1,
            length: rand(22, 42) * cfg.scale * (species === 'lily' || species === 'tulip' ? 1.38 : species === 'sunflower' ? 1.25 : 1.0),
            width: rand(9, 16) * cfg.scale * (species === 'lily' ? 0.64 : species === 'hydrangea' || species === 'sunflower' ? 1.25 : 1.0),
            angleOffset: rand(0.36, 0.76),
          });
        }
      }

      // Species-specific botanical configuration
      if (species === 'rose') {
        const variants =
          this.season === 'winter' ? ['white'] :
          this.season === 'autumn' ? ['red', 'autumn', 'pastel'] :
          this.season === 'spring' ? ['pink', 'pastel', 'white', 'red'] :
          ['red', 'pink', 'pastel', 'white'];
        flower.variant = pick(variants);
        flower.radius = rand(22, 31) * cfg.scale;
        flower.petalSpin = rand(0, TAU);
      } else if (species === 'tulip') {
        flower.variant = pick(['coral', 'yellow', 'blush', 'crimson']);
        flower.radius = rand(21, 29) * cfg.scale;
      } else if (species === 'sunflower') {
        flower.radius = rand(32, 42) * cfg.scale;
        flower.petalSpin = rand(0, TAU);
      } else if (species === 'lily') {
        const variants =
          this.season === 'winter' ? ['white'] :
          this.season === 'autumn' ? ['apricot', 'white'] :
          ['white', 'pink', 'apricot'];
        flower.variant = pick(variants);
        flower.radius = rand(26, 36) * cfg.scale;
        flower.petalSpin = rand(-0.35, 0.35);
        flower.hasSideBud = Math.random() > 0.44;
        flower.budSide = Math.random() > 0.5 ? 1 : -1;
      } else if (species === 'dandelion') {
        flower.radius = rand(20, 28) * cfg.scale;
        flower.dandelionSeeds = [];
        const seedCount = 32;
        for (let i = 0; i < seedCount; i++) {
          flower.dandelionSeeds.push({
            angle: (i / seedCount) * TAU + rand(-0.08, 0.08),
            len: flower.radius * rand(0.84, 1.08),
            attached: true,
            regrowAt: 0,
          });
        }
      } else if (species === 'cherryBlossom') {
        flower.radius = rand(11, 15) * cfg.scale;
        flower.sakuraCluster = [];
        const count = Math.floor(rand(6, 9));
        for (let i = 0; i < count; i++) {
          const frac = i / Math.max(1, count - 1);
          flower.sakuraCluster.push({
            dx: lerp(-26, 32, frac) * cfg.scale + rand(-10, 10) * cfg.scale,
            dy: lerp(24, -30, frac) * cfg.scale + rand(-10, 10) * cfg.scale,
            size: flower.radius * rand(0.75, 1.15),
            rot: rand(0, TAU),
            tint: Math.random() > 0.4 ? '#FAD6E0' : '#FFF1F5',
          });
        }
      } else if (species === 'daisy') {
        flower.radius = rand(19, 27) * cfg.scale;
        flower.petalCount = Math.floor(rand(13, 17));
        flower.petalSpin = rand(0, TAU);
        flower.blushTip = Math.random() > 0.65;
      } else if (species === 'lavender') {
        flower.radius = rand(18, 24) * cfg.scale;
        flower.tiers = Math.floor(rand(6, 9));
      } else if (species === 'hydrangea') {
        const variants =
          this.season === 'winter' ? ['winter'] : ['blue', 'lavender', 'pink'];
        flower.variant = pick(variants);
        flower.radius = rand(26, 36) * cfg.scale;
        flower.florets = [];
        const count = 16;
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * TAU + rand(-0.25, 0.25);
          const dist = (i < 4 ? rand(0.08, 0.34) : rand(0.36, 0.78)) * flower.radius;
          flower.florets.push({
            dx: Math.cos(ang) * dist,
            dy: Math.sin(ang) * dist * 0.88,
            size: flower.radius * rand(0.24, 0.34),
            rot: rand(0, TAU),
            shadePick: i % 3,
          });
        }
      } else if (species === 'chrysanthemum') {
        flower.variant = pick(['orange', 'amber', 'crimson']);
        flower.radius = rand(24, 33) * cfg.scale;
        flower.petalSpin = rand(0, TAU);
      } else if (species === 'snowdrop') {
        flower.radius = rand(16, 22) * cfg.scale;
        flower.droopDir = Math.random() > 0.5 ? 1 : -1;
      } else {
        // Baby's breath & small white blossoms
        flower.radius = rand(7.5, 11) * cfg.scale;
        flower.sprayBlooms = [];
        const subCount = Math.floor(rand(5, 8));
        for (let i = 0; i < subCount; i++) {
          const angle = -Math.PI / 2 + rand(-1.12, 1.12);
          const dist = rand(16, 48) * cfg.scale;
          flower.sprayBlooms.push({
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            size: flower.radius * rand(0.7, 1.15),
            rot: rand(0, TAU),
            isBud: i >= subCount - 2 && Math.random() > 0.35,
          });
        }
      }

      return flower;
    }

    /* ========================================================================
       Ambient & Seasonal Particles
       ======================================================================== */

    initAmbientParticles() {
      const w = this.width;
      const h = this.height;
      this.petals = [];
      this.seeds = [];
      this.snowflakes = [];
      this.motes = [];

      this.refreshSeasonalParticles();

      const moteCount = w < 640 ? 22 : 36;
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

    refreshSeasonalParticles() {
      const w = this.width;
      const h = this.height;
      const cfg = SEASONS[this.season];
      const isMobile = w < 640;

      // Update falling petals / autumn leaves
      this.petals = [];
      if (cfg.particleMode === 'petals' || cfg.particleMode === 'leaves') {
        const count = isMobile ? 14 : 24;
        for (let i = 0; i < count; i++) {
          this.petals.push(this.createFallingElement(rand(0, w), rand(-h * 0.2, h), false));
        }
      }

      // Update snowflakes for winter
      this.snowflakes = [];
      if (cfg.particleMode === 'snow') {
        const count = isMobile ? 38 : 68;
        for (let i = 0; i < count; i++) {
          this.snowflakes.push(this.createSnowflake(rand(0, w), rand(-40, h)));
        }
      }

      // Update floating dandelion seeds
      const seedCount = Math.round((isMobile ? 14 : 22) * cfg.seedBoost);
      this.seeds = [];
      for (let i = 0; i < seedCount; i++) {
        this.seeds.push(this.createFloatingSeed(rand(0, w), rand(0, h * 0.85), false));
      }
    }

    createFallingElement(x, y, burst) {
      const cfg = SEASONS[this.season];
      const isLeaf = cfg.particleMode === 'leaves';
      const palette = isLeaf ? cfg.leafPalette : (cfg.petalPalette || SEASONS.spring.petalPalette);
      const tone = pick(palette);

      return {
        kind: isLeaf ? 'leaf' : 'petal',
        x,
        y,
        vx: burst ? rand(-50, 68) : rand(8, 28),
        vy: burst ? rand(-72, -12) : isLeaf ? rand(22, 44) : rand(14, 30),
        size: isLeaf ? rand(9, 15.5) : rand(6.5, 12.5),
        rot: rand(0, TAU),
        vRot: rand(-1.7, 1.7),
        flutterPhase: rand(0, TAU),
        flutterSpeed: rand(1.6, 3.2),
        fill: tone.fill,
        shade: tone.shade,
        alpha: rand(0.7, 0.95),
      };
    }

    createSnowflake(x, y) {
      const isCrystal = Math.random() > 0.65;
      return {
        x,
        y,
        vx: rand(-10, 18),
        vy: rand(16, 42),
        r: isCrystal ? rand(3.5, 6.2) : rand(1.8, 4.4),
        isCrystal,
        rot: rand(0, TAU),
        vRot: rand(-0.8, 0.8),
        phase: rand(0, TAU),
        alpha: rand(0.45, 0.9),
      };
    }

    createFloatingSeed(x, y, boosted) {
      return {
        x,
        y,
        vx: boosted ? rand(26, 76) : rand(12, 32),
        vy: boosted ? rand(-36, -6) : rand(-14, 6),
        size: rand(8, 12.5),
        phase: rand(0, TAU),
        alpha: rand(0.58, 0.9),
        tilt: rand(-0.2, 0.3),
      };
    }

    /* ========================================================================
       Public Controls
       ======================================================================== */

    startBloom() {
      this.state = 'blooming';
      this.bloomElapsed = 0;
      this.outgoingFlowers = [];
      this.outgoingAlpha = 0;
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

      const cfg = SEASONS[this.season];
      if (cfg.particleMode === 'snow') {
        for (let i = 0; i < 12; i++) {
          this.snowflakes.push(this.createSnowflake(rand(-30, this.width * 0.5), rand(-20, this.height * 0.4)));
        }
        if (this.snowflakes.length > 96) this.snowflakes.splice(0, this.snowflakes.length - 96);
      } else {
        const count = this.width < 640 ? 6 : 10;
        for (let i = 0; i < count; i++) {
          this.petals.push(this.createFallingElement(rand(-40, this.width * 0.45), rand(20, this.height * 0.5), false));
        }
        if (this.petals.length > 54) this.petals.splice(0, this.petals.length - 54);
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

      const cfg = SEASONS[this.season];
      if (cfg.particleMode === 'snow') {
        for (let i = 0; i < 10; i++) {
          const sf = this.createSnowflake(x + rand(-18, 18), y + rand(-18, 18));
          sf.vx = rand(-42, 42);
          sf.vy = rand(-38, 14);
          this.snowflakes.push(sf);
        }
        if (this.snowflakes.length > 96) this.snowflakes.splice(0, this.snowflakes.length - 96);
      } else {
        const burst = this.width < 640 ? 6 : 9;
        for (let i = 0; i < burst; i++) {
          this.petals.push(this.createFallingElement(x + rand(-14, 14), y + rand(-14, 14), true));
        }
        if (this.petals.length > 58) this.petals.splice(0, this.petals.length - 58);
      }

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

      // Smoothly interpolate seasonal atmosphere colors
      const targetEnv = SEASONS[this.season];
      const envT = Math.min(1, dt * 2.4);
      for (let i = 0; i < 4; i++) {
        this.currentEnv.sky[i] = lerpColorArr(this.currentEnv.sky[i], targetEnv.sky[i], envT);
      }
      this.currentEnv.sunColor = lerpColorArr(this.currentEnv.sunColor, targetEnv.sunColor, envT);
      this.currentEnv.beamColor = lerpColorArr(this.currentEnv.beamColor, targetEnv.beamColor, envT);
      this.currentEnv.hillFar = lerpColorArr(this.currentEnv.hillFar, targetEnv.hillFar, envT);
      this.currentEnv.hillNear = lerpColorArr(this.currentEnv.hillNear, targetEnv.hillNear, envT);

      // Smoothly fade out previous season's flowers
      if (this.outgoingAlpha > 0) {
        this.outgoingAlpha = Math.max(0, this.outgoingAlpha - dt * 1.25);
        if (this.outgoingAlpha <= 0) {
          this.outgoingFlowers = [];
        }
      }

      // Smooth pointer parallax
      this.pointer.smoothNormX = lerp(this.pointer.smoothNormX, this.pointer.normX, Math.min(1, dt * 3.2));
      this.pointer.smoothNormY = lerp(this.pointer.smoothNormY, this.pointer.normY, Math.min(1, dt * 3.2));
      this.pointer.vx *= Math.pow(0.08, dt);
      this.pointer.vy *= Math.pow(0.08, dt);

      if (this.gust.active) {
        this.gust.waveX += dt * Math.max(420, this.width * 0.55);
        this.gust.strength = Math.max(0, this.gust.strength - dt * 0.38);
        if (this.gust.strength <= 0.01 && this.gust.waveX > this.width + 260) {
          this.gust.active = false;
        }
      }

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

      for (let i = 0; i < this.flowers.length; i++) {
        const f = this.flowers[i];

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

        if (this.gust.active && f.species === 'dandelion' && f.bloomProgress > 0.85) {
          if (Math.abs(f.headX - this.gust.waveX) < 70 && Math.random() < dt * 7) {
            this.detachDandelionSeeds(f, 3);
          }
        }

        if (f.dandelionSeeds) {
          for (let s = 0; s < f.dandelionSeeds.length; s++) {
            const seed = f.dandelionSeeds[s];
            if (!seed.attached && seed.regrowAt > 0 && this.time > seed.regrowAt) {
              seed.attached = true;
              seed.regrowAt = 0;
            }
          }
        }

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

      // Falling petals / autumn leaves
      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        p.flutterPhase += p.flutterSpeed * dt;
        const sway = Math.sin(p.flutterPhase) * (p.kind === 'leaf' ? 32 : 24);

        p.vx = lerp(p.vx, (p.kind === 'leaf' ? 24 : 18) + gustBoost * 0.85, dt * 1.4);
        p.vy = lerp(p.vy, p.kind === 'leaf' ? 34 : 22, dt * 1.1);

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
          p.vy = p.kind === 'leaf' ? rand(20, 42) : rand(14, 30);
        }
      }

      // Winter snowfall
      for (let i = 0; i < this.snowflakes.length; i++) {
        const sf = this.snowflakes[i];
        sf.phase += dt * 1.4;
        const drift = Math.sin(sf.phase) * 16;

        sf.vx = lerp(sf.vx, 8 + gustBoost * 0.75, dt * 1.2);
        sf.vy = lerp(sf.vy, rand(20, 34), dt * 0.4);

        if (this.pointer.active) {
          const dx = sf.x - this.pointer.x;
          const dy = sf.y - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 100 && dist > 1) {
            sf.vx += (this.pointer.vx * 0.65 + (dx / dist) * 14) * dt * 2;
            sf.vy += (this.pointer.vy * 0.45) * dt * 2;
          }
        }

        sf.x += (sf.vx + drift) * dt;
        sf.y += sf.vy * dt;
        sf.rot += sf.vRot * dt;

        if (sf.y > h + 16 || sf.x > w + 24 || sf.x < -24) {
          sf.x = rand(-20, w + 20);
          sf.y = rand(-24, -6);
          sf.vx = rand(-8, 16);
          sf.vy = rand(18, 40);
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

      // Ambient light / pollen motes
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

      // Fade out outgoing season's flora smoothly during transition
      if (this.outgoingAlpha > 0.01 && this.outgoingFlowers.length > 0) {
        ctx.save();
        ctx.globalAlpha = this.outgoingAlpha;
        for (let i = 0; i < this.outgoingFlowers.length; i++) {
          this.drawFlower(ctx, this.outgoingFlowers[i], true);
        }
        ctx.restore();
      }

      // Render active season's flora back-to-front with interleaved grass
      for (let depth = 0; depth <= 2; depth++) {
        this.drawGrassLayer(ctx, depth);

        for (let i = 0; i < this.flowers.length; i++) {
          if (this.flowers[i].depth === depth) {
            this.drawFlower(ctx, this.flowers[i], false);
          }
        }

        if (depth === 1) {
          this.drawPollenMotes(ctx);
        }
      }

      this.drawFloatingSeeds(ctx);
      this.drawFallingElements(ctx);
      this.drawSnowfall(ctx);
      this.drawCursorGlow(ctx);
    }

    drawBackdrop(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0.0, rgbStr(this.currentEnv.sky[0]));
      sky.addColorStop(0.42, rgbStr(this.currentEnv.sky[1]));
      sky.addColorStop(0.76, rgbStr(this.currentEnv.sky[2]));
      sky.addColorStop(1.0, rgbStr(this.currentEnv.sky[3]));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const sunX = w * 0.24 - this.pointer.smoothNormX * 14;
      const sunY = h * 0.14 - this.pointer.smoothNormY * 10;
      const sunR = Math.max(w, h) * 0.55;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunR);
      sunGrad.addColorStop(0, rgbaStr(this.currentEnv.sunColor, 0.72));
      sunGrad.addColorStop(0.38, rgbaStr(this.currentEnv.sunColor, 0.28));
      sunGrad.addColorStop(1, rgbaStr(this.currentEnv.sunColor, 0));
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
        grad.addColorStop(0, rgbaStr(this.currentEnv.beamColor, b.alpha * pulse));
        grad.addColorStop(0.6, rgbaStr(this.currentEnv.beamColor, b.alpha * 0.42 * pulse));
        grad.addColorStop(1, rgbaStr(this.currentEnv.beamColor, 0));

        ctx.fillStyle = grad;
        ctx.fillRect(-beamW * 0.5, 0, beamW, h * 1.25);
        ctx.restore();
      }
      ctx.restore();
    }

    drawMeadowHorizon(ctx, w, h) {
      const px = -this.pointer.smoothNormX * 10;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.86);
      ctx.bezierCurveTo(w * 0.28 + px, h * 0.78, w * 0.65 + px, h * 0.90, w, h * 0.82);
      ctx.lineTo(w, h);
      ctx.closePath();

      const hillGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
      hillGrad.addColorStop(0, rgbaStr(this.currentEnv.hillFar, 0.52));
      hillGrad.addColorStop(1, rgbaStr(this.currentEnv.hillNear, 0.58));
      ctx.fillStyle = hillGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.91);
      ctx.bezierCurveTo(w * 0.35 + px * 1.6, h * 0.85, w * 0.72 + px * 1.6, h * 0.94, w, h * 0.89);
      ctx.lineTo(w, h);
      ctx.closePath();

      const nearGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
      nearGrad.addColorStop(0, rgbaStr(this.currentEnv.hillNear, 0.58));
      nearGrad.addColorStop(1, rgbaStr(this.currentEnv.hillNear, 0.85));
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

    drawFlower(ctx, f, isOutgoing) {
      const growth = this.state === 'intro' ? 0.14 : f.bloomProgress;
      if (growth <= 0.005) return;

      const stemGrowth = easeOutCubic(clamp(growth / 0.52, 0, 1));
      const leafGrowth = easeOutCubic(clamp((growth - 0.22) / 0.42, 0, 1));
      const headGrowth = easeOutBack(clamp((growth - 0.38) / 0.62, 0, 1));

      const spatialWave = Math.sin(this.time * f.swayFreq + f.phase - f.x * 0.0026);
      const secondaryWave = Math.sin(this.time * (f.swayFreq * 0.47) + f.phase * 1.7) * 0.42;
      let gustPush = 0;
      if (this.gust.active && !isOutgoing) {
        gustPush = Math.exp(-Math.pow((f.x - this.gust.waveX) / 190, 2)) * 52 * this.gust.strength;
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

      if (!isOutgoing) {
        f.headX = headX;
        f.headY = headY;
      }

      ctx.save();
      ctx.globalAlpha *= f.alpha;

      // 1. Stem
      const stemThickness =
        (f.species === 'babysBreath' || f.species === 'snowdrop' ? 1.8 :
         f.species === 'sunflower' || f.species === 'cherryBlossom' ? 3.8 :
         f.species === 'dandelion' || f.species === 'lavender' ? 2.3 : 3.0) * f.scale;

      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY);
      ctx.strokeStyle = f.stemColor;
      ctx.lineWidth = stemThickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Sunlit/frosted edge on stem
      ctx.beginPath();
      ctx.moveTo(baseX - 0.6, baseY);
      ctx.quadraticCurveTo(ctrlX - 0.6, ctrlY, headX - 0.4, headY);
      ctx.strokeStyle = f.season === 'winter' ? 'rgba(240, 248, 255, 0.42)' : 'rgba(220, 232, 198, 0.24)';
      ctx.lineWidth = Math.max(0.8, stemThickness * 0.32);
      ctx.stroke();

      // 2. Leaves
      if (leafGrowth > 0.02) {
        for (let i = 0; i < f.leaves.length; i++) {
          const lf = f.leaves[i];
          if (lf.t > stemGrowth * 0.96) continue;
          const pt = quadPoint(baseX, baseY, ctrlX, ctrlY, headX, headY, lf.t);
          const stemAng = quadAngle(baseX, baseY, ctrlX, ctrlY, headX, headY, lf.t);
          this.drawLeaf(
            ctx,
            pt.x,
            pt.y,
            stemAng + lf.side * lf.angleOffset,
            lf.length * leafGrowth,
            lf.width * leafGrowth,
            f.leafColor,
            f.species === 'lily' || f.species === 'tulip',
            f.season === 'winter'
          );
        }
      }

      // 3. Bloom Head
      if (headGrowth > 0.02) {
        const neckAngle = quadAngle(baseX, baseY, ctrlX, ctrlY, headX, headY, 0.98) + Math.PI / 2;
        const headRot = neckAngle * 0.45 + f.headTilt + totalSway * 0.004;

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(headRot);

        switch (f.species) {
          case 'rose':          this.drawRose(ctx, f, headGrowth); break;
          case 'tulip':         this.drawTulip(ctx, f, headGrowth); break;
          case 'sunflower':     this.drawSunflower(ctx, f, headGrowth); break;
          case 'lily':          this.drawLily(ctx, f, headGrowth); break;
          case 'dandelion':     this.drawDandelion(ctx, f, headGrowth); break;
          case 'cherryBlossom': this.drawCherryBlossom(ctx, f, headGrowth); break;
          case 'daisy':         this.drawDaisy(ctx, f, headGrowth); break;
          case 'lavender':      this.drawLavender(ctx, f, headGrowth); break;
          case 'hydrangea':     this.drawHydrangea(ctx, f, headGrowth); break;
          case 'chrysanthemum': this.drawChrysanthemum(ctx, f, headGrowth); break;
          case 'snowdrop':      this.drawSnowdrop(ctx, f, headGrowth); break;
          default:              this.drawBabysBreath(ctx, f, headGrowth); break;
        }

        ctx.restore();
      }

      ctx.restore();
    }

    drawLeaf(ctx, x, y, angle, length, width, color, isSlender, isFrosted) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      if (isSlender) {
        ctx.bezierCurveTo(length * 0.3, -width * 0.72, length * 0.78, -width * 0.42, length, 0);
        ctx.bezierCurveTo(length * 0.72, width * 0.45, length * 0.26, width * 0.65, 0, 0);
      } else {
        ctx.bezierCurveTo(length * 0.28, -width, length * 0.72, -width * 0.85, length, 0);
        ctx.bezierCurveTo(length * 0.72, width * 0.85, length * 0.28, width, 0, 0);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, length, 0);
      grad.addColorStop(0, isFrosted ? '#586E70' : '#3C5940');
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, isFrosted ? '#D4E4EA' : '#85A17D');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(length * 0.84, 0);
      ctx.strokeStyle = isFrosted ? 'rgba(240, 248, 255, 0.5)' : 'rgba(235, 240, 222, 0.34)';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      ctx.restore();
    }

    /* ========================================================================
       12 Botanical Species Renderers
       ======================================================================== */

    drawRose(ctx, f, growth) {
      const pal = ROSE_PALETTES[f.variant] || ROSE_PALETTES.pink;
      const open = clamp(growth, 0.05, 1.05);
      const r = f.radius * (0.35 + 0.65 * Math.min(open, 1));

      // Sepals
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i / 5) * TAU + f.petalSpin);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.24, -r * 0.62, 0, -r * 1.12);
        ctx.quadraticCurveTo(-r * 0.24, -r * 0.62, 0, 0);
        ctx.fillStyle = f.season === 'winter' ? '#6F8687' : '#4B6B4F';
        ctx.fill();
        ctx.restore();
      }

      const drawRing = (count, rScale, wScale, offset, cIn, cOut, cRim, factor) => {
        const pr = r * rScale * factor;
        const pw = r * wScale * factor;
        for (let i = 0; i < count; i++) {
          ctx.save();
          ctx.rotate((i / count) * TAU + offset);
          ctx.translate(0, -pr * 0.34);
          ctx.beginPath();
          ctx.moveTo(0, pr * 0.25);
          ctx.bezierCurveTo(-pw * 0.95, pr * 0.05, -pw * 0.92, -pr * 0.86, 0, -pr * 0.94);
          ctx.bezierCurveTo(pw * 0.92, -pr * 0.86, pw * 0.95, pr * 0.05, 0, pr * 0.25);
          ctx.closePath();

          const grad = ctx.createRadialGradient(0, pr * 0.1, pr * 0.08, 0, -pr * 0.35, pr * 0.95);
          grad.addColorStop(0, cIn);
          grad.addColorStop(0.68, cOut);
          grad.addColorStop(1, cRim);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 250, 246, 0.34)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
      };

      drawRing(6, 1.04, 0.64, f.petalSpin, pal.mid, pal.outer, pal.rim, clamp((open - 0.15) / 0.85, 0.25, 1));
      drawRing(6, 0.78, 0.52, f.petalSpin + 0.52, pal.deep, pal.mid, pal.outer, clamp((open - 0.05) / 0.9, 0.3, 1));
      drawRing(5, 0.52, 0.38, f.petalSpin + 1.08, pal.core, pal.deep, pal.mid, 0.92);

      const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.28);
      coreGrad.addColorStop(0, pal.core);
      coreGrad.addColorStop(0.7, pal.deep);
      coreGrad.addColorStop(1, pal.mid);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.26, 0, TAU);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    drawTulip(ctx, f, growth) {
      const pal = TULIP_PALETTES[f.variant] || TULIP_PALETTES.coral;
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * (0.45 + 0.55 * open);
      const spread = 0.22 + 0.28 * open;

      // Back 2 petals
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.rotate(side * spread * 1.15);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.25);
        ctx.bezierCurveTo(-r * 0.45, -r * 0.2, -r * 0.4, -r * 1.1, 0, -r * 1.38);
        ctx.bezierCurveTo(r * 0.4, -r * 1.1, r * 0.45, -r * 0.2, 0, r * 0.25);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, r * 0.2, 0, -r * 1.38);
        grad.addColorStop(0, pal.base);
        grad.addColorStop(0.55, pal.mid);
        grad.addColorStop(1, pal.tip);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Side cupped petals
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.rotate(side * spread * 0.65);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.28);
        ctx.bezierCurveTo(-r * 0.55, -r * 0.15, -r * 0.48, -r * 1.05, 0, -r * 1.3);
        ctx.bezierCurveTo(r * 0.48, -r * 1.05, r * 0.55, -r * 0.15, 0, r * 0.28);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, r * 0.25, 0, -r * 1.3);
        grad.addColorStop(0, pal.base);
        grad.addColorStop(0.6, pal.mid);
        grad.addColorStop(1, pal.tip);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 250, 245, 0.28)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      });

      // Center front cupped petal
      ctx.beginPath();
      ctx.moveTo(0, r * 0.3);
      ctx.bezierCurveTo(-r * 0.56, -r * 0.12, -r * 0.44, -r * 0.98, 0, -r * 1.26);
      ctx.bezierCurveTo(r * 0.44, -r * 0.98, r * 0.56, -r * 0.12, 0, r * 0.3);
      ctx.closePath();
      const frontGrad = ctx.createLinearGradient(0, r * 0.3, 0, -r * 1.26);
      frontGrad.addColorStop(0, pal.base);
      frontGrad.addColorStop(0.52, pal.mid);
      frontGrad.addColorStop(1, pal.tip);
      ctx.fillStyle = frontGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 252, 248, 0.38)';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }

    drawSunflower(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * (0.4 + 0.6 * open);

      // Back golden-amber ray petals (18)
      const count = 18;
      for (let i = 0; i < count; i++) {
        ctx.save();
        ctx.rotate((i / count) * TAU + f.petalSpin + 0.17);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.3);
        ctx.bezierCurveTo(-r * 0.16, -r * 0.65, -r * 0.12, -r * 0.95, 0, -r * 1.12);
        ctx.bezierCurveTo(r * 0.12, -r * 0.95, r * 0.16, -r * 0.65, 0, -r * 0.3);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.12);
        grad.addColorStop(0, '#C8781C');
        grad.addColorStop(0.6, '#E8A92B');
        grad.addColorStop(1, '#F8D456');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Front bright sunlit ray petals (18)
      for (let i = 0; i < count; i++) {
        ctx.save();
        ctx.rotate((i / count) * TAU + f.petalSpin);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.32);
        ctx.bezierCurveTo(-r * 0.15, -r * 0.62, -r * 0.11, -r * 0.92, 0, -r * 1.05);
        ctx.bezierCurveTo(r * 0.11, -r * 0.92, r * 0.15, -r * 0.62, 0, -r * 0.32);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, -r * 0.32, 0, -r * 1.05);
        grad.addColorStop(0, '#D48A1E');
        grad.addColorStop(0.55, '#F4C438');
        grad.addColorStop(1, '#FDE578');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Rich textured dark-umber seed disc
      const discR = r * 0.44;
      const discGrad = ctx.createRadialGradient(-discR * 0.15, -discR * 0.15, 1, 0, 0, discR);
      discGrad.addColorStop(0, '#3D2314');
      discGrad.addColorStop(0.68, '#58341C');
      discGrad.addColorStop(0.88, '#8B5A23');
      discGrad.addColorStop(1, '#C78A28');
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, TAU);
      ctx.fillStyle = discGrad;
      ctx.fill();

      // Golden-brown seed dots in phyllotaxis spiral
      ctx.fillStyle = 'rgba(235, 185, 92, 0.52)';
      for (let k = 1; k <= 24; k++) {
        const a = k * 2.39996;
        const d = Math.sqrt(k / 25) * discR * 0.84;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.75, 1.15 * f.scale), 0, TAU);
        ctx.fill();
      }
    }

    drawLily(ctx, f, growth) {
      const pal = LILY_PALETTES[f.variant] || LILY_PALETTES.white;
      const open = clamp(growth, 0.05, 1.02);
      const r = f.radius * (0.42 + 0.58 * Math.min(open, 1));

      if (f.hasSideBud) {
        ctx.save();
        ctx.translate(f.budSide * r * 0.28, r * 0.55);
        ctx.rotate(f.budSide * 0.65);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(f.budSide * 4, -r * 0.35, 0, -r * 0.66);
        ctx.strokeStyle = f.stemColor;
        ctx.lineWidth = 1.6 * f.scale;
        ctx.stroke();

        ctx.translate(0, -r * 0.66);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-r * 0.16, -r * 0.18, -r * 0.12, -r * 0.48, 0, -r * 0.6);
        ctx.bezierCurveTo(r * 0.12, -r * 0.48, r * 0.16, -r * 0.18, 0, 4);
        const budGrad = ctx.createLinearGradient(0, 4, 0, -r * 0.6);
        budGrad.addColorStop(0, pal.throat);
        budGrad.addColorStop(0.45, pal.blush);
        budGrad.addColorStop(1, pal.tip);
        ctx.fillStyle = budGrad;
        ctx.fill();
        ctx.restore();
      }

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

        ctx.beginPath();
        ctx.moveTo(0, -len * 0.08);
        ctx.lineTo(0, -len * 0.88);
        ctx.strokeStyle = pal.vein;
        ctx.lineWidth = 0.85;
        ctx.stroke();

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
      for (let i = 0; i < 3; i++) drawTepal((i / 3) * TAU + f.petalSpin, r * 1.08 * spread, r * 0.30 * spread);
      for (let i = 0; i < 3; i++) drawTepal((i / 3) * TAU + Math.PI / 3 + f.petalSpin, r * 1.02 * spread, r * 0.35 * spread);

      if (open > 0.35) {
        const stScale = clamp((open - 0.35) / 0.65, 0, 1);
        for (let i = 0; i < 6; i++) {
          const slen = r * 0.52 * stScale;
          ctx.save();
          ctx.rotate((i / 6) * TAU + 0.25 + f.petalSpin);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(r * 0.08, -slen * 0.55, 0, -slen);
          ctx.strokeStyle = '#ECE6D4';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          ctx.translate(0, -slen);
          ctx.rotate(0.42);
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.8 * f.scale, 1.3 * f.scale, 0, 0, TAU);
          ctx.fillStyle = '#C98A2E';
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 2.3 * f.scale, 0, TAU);
        ctx.fillStyle = '#89A46B';
        ctx.fill();
      }
    }

    drawDandelion(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * open;

      const halo = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.28);
      halo.addColorStop(0, 'rgba(255, 252, 246, 0.34)');
      halo.addColorStop(0.7, 'rgba(252, 248, 242, 0.22)');
      halo.addColorStop(1, 'rgba(252, 248, 242, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.28, 0, TAU);
      ctx.fillStyle = halo;
      ctx.fill();

      if (f.dandelionSeeds) {
        for (let i = 0; i < f.dandelionSeeds.length; i++) {
          const s = f.dandelionSeeds[i];
          if (!s.attached) continue;
          const len = s.len * open;
          const ex = Math.cos(s.angle) * len;
          const ey = Math.sin(s.angle) * len;

          ctx.beginPath();
          ctx.moveTo(Math.cos(s.angle) * 3.5, Math.sin(s.angle) * 3.5);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = f.season === 'winter' ? 'rgba(232, 244, 255, 0.78)' : 'rgba(248, 244, 236, 0.72)';
          ctx.lineWidth = 0.75;
          ctx.stroke();

          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(s.angle);
          ctx.strokeStyle = 'rgba(255, 253, 250, 0.92)';
          ctx.lineWidth = 0.72;
          const tuft = 4.1 * f.scale;
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

      const coreGrad = ctx.createRadialGradient(-1, -1, 0.8, 0, 0, 5.2 * f.scale);
      coreGrad.addColorStop(0, '#9A8868');
      coreGrad.addColorStop(0.65, '#6B5E49');
      coreGrad.addColorStop(1, '#4C5E44');
      ctx.beginPath();
      ctx.arc(0, 0, 5.0 * f.scale, 0, TAU);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    drawCherryBlossom(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      if (!f.sakuraCluster) return;

      // Delicate wooden twig fork
      ctx.beginPath();
      ctx.moveTo(-22 * f.scale * open, 22 * f.scale * open);
      ctx.quadraticCurveTo(0, 0, 28 * f.scale * open, -28 * f.scale * open);
      ctx.strokeStyle = '#6B4F4B';
      ctx.lineWidth = 2.0 * f.scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      for (let i = 0; i < f.sakuraCluster.length; i++) {
        const b = f.sakuraCluster[i];
        const bx = b.dx * open;
        const by = b.dy * open;
        const pr = b.size * open;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.rot);

        // 5 notched sakura petals
        for (let p = 0; p < 5; p++) {
          ctx.save();
          ctx.rotate((p / 5) * TAU);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-pr * 0.48, -pr * 0.35, -pr * 0.42, -pr * 0.92, -pr * 0.1, -pr);
          ctx.lineTo(0, -pr * 0.86); // signature sakura notch
          ctx.lineTo(pr * 0.1, -pr);
          ctx.bezierCurveTo(pr * 0.42, -pr * 0.92, pr * 0.48, -pr * 0.35, 0, 0);
          ctx.closePath();

          const grad = ctx.createRadialGradient(0, -pr * 0.1, 1, 0, -pr * 0.55, pr);
          grad.addColorStop(0, '#E397AB');
          grad.addColorStop(0.35, b.tint);
          grad.addColorStop(1, '#FFF9FB');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        // Rosy heart & tiny golden stamens
        ctx.beginPath();
        ctx.arc(0, 0, pr * 0.18, 0, TAU);
        ctx.fillStyle = '#C65D78';
        ctx.fill();
        ctx.fillStyle = '#E8BD62';
        for (let s = 0; s < 5; s++) {
          const sa = (s / 5) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * pr * 0.26, Math.sin(sa) * pr * 0.26, 0.95 * f.scale, 0, TAU);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    drawDaisy(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * (0.4 + 0.6 * open);
      const count = f.petalCount || 14;

      for (let i = 0; i < count; i++) {
        ctx.save();
        ctx.rotate((i / count) * TAU + f.petalSpin);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2);
        ctx.bezierCurveTo(-r * 0.14, -r * 0.55, -r * 0.12, -r * 0.96, 0, -r);
        ctx.bezierCurveTo(r * 0.12, -r * 0.96, r * 0.14, -r * 0.55, 0, -r * 0.2);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -r * 0.2, 0, -r);
        grad.addColorStop(0, '#F0E6D6');
        grad.addColorStop(0.55, '#FCF9F4');
        grad.addColorStop(1, f.blushTip ? '#FADAE2' : '#FFFFFF');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      const discR = r * 0.28;
      const discGrad = ctx.createRadialGradient(-discR * 0.2, -discR * 0.2, 1, 0, 0, discR);
      discGrad.addColorStop(0, '#F6DA72');
      discGrad.addColorStop(0.65, '#DFA838');
      discGrad.addColorStop(1, '#B88022');
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, TAU);
      ctx.fillStyle = discGrad;
      ctx.fill();
    }

    drawLavender(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const tiers = f.tiers || 7;
      const spikeH = f.radius * 2.4 * open;

      // Central upper spike stem
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -spikeH);
      ctx.strokeStyle = f.stemColor;
      ctx.lineWidth = 1.4 * f.scale;
      ctx.stroke();

      for (let t = 0; t < tiers; t++) {
        const frac = t / Math.max(1, tiers - 1);
        const y = lerp(4, -spikeH, frac);
        const budSize = (4.8 - frac * 2.1) * f.scale * open;

        [-1, 0, 1].forEach((side) => {
          const bx = side * (budSize * 0.95);
          const by = y + Math.abs(side) * 2.0;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(side * 0.35);
          ctx.beginPath();
          ctx.ellipse(0, 0, budSize * 0.56, budSize, 0, 0, TAU);
          const grad = ctx.createLinearGradient(0, budSize, 0, -budSize);
          grad.addColorStop(0, '#5F4B8B');
          grad.addColorStop(0.55, '#8A73B8');
          grad.addColorStop(1, '#C5B4E3');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        });
      }
    }

    drawHydrangea(ctx, f, growth) {
      const pal = HYDRANGEA_PALETTES[f.variant] || HYDRANGEA_PALETTES.blue;
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * open;

      // Soft botanical shadow backing behind cluster
      const backGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.95);
      backGrad.addColorStop(0, pal.deep);
      backGrad.addColorStop(0.8, pal.mid);
      backGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, TAU);
      ctx.fillStyle = backGrad;
      ctx.fill();

      if (!f.florets) return;

      for (let i = 0; i < f.florets.length; i++) {
        const fl = f.florets[i];
        const fx = fl.dx * open;
        const fy = fl.dy * open;
        const fs = fl.size * open;
        const fill = fl.shadePick === 0 ? pal.light : fl.shadePick === 1 ? pal.mid : pal.deep;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fl.rot);

        // 4 rounded hydrangea petals per floret
        for (let p = 0; p < 4; p++) {
          ctx.save();
          ctx.rotate((p / 4) * TAU);
          ctx.beginPath();
          ctx.ellipse(0, -fs * 0.55, fs * 0.44, fs * 0.54, 0, 0, TAU);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 0.65;
          ctx.stroke();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(0, 0, fs * 0.18, 0, TAU);
        ctx.fillStyle = pal.center;
        ctx.fill();
        ctx.restore();
      }
    }

    drawChrysanthemum(ctx, f, growth) {
      const pal = CHRYSANTHEMUM_PALETTES[f.variant] || CHRYSANTHEMUM_PALETTES.orange;
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * (0.4 + 0.6 * open);

      const rings = [
        { count: 16, rScale: 1.0,  wScale: 0.19, c1: pal.mid,  c2: pal.tip, rot: 0 },
        { count: 14, rScale: 0.74, wScale: 0.17, c1: pal.core, c2: pal.mid, rot: 0.22 },
        { count: 10, rScale: 0.48, wScale: 0.15, c1: pal.core, c2: pal.tip, rot: 0.44 },
      ];

      rings.forEach((ring) => {
        const pr = r * ring.rScale;
        const pw = r * ring.wScale;
        for (let i = 0; i < ring.count; i++) {
          ctx.save();
          ctx.rotate((i / ring.count) * TAU + f.petalSpin + ring.rot);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-pw, -pr * 0.35, -pw * 0.8, -pr * 0.9, 0, -pr);
          ctx.bezierCurveTo(pw * 0.8, -pr * 0.9, pw, -pr * 0.35, 0, 0);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, 0, 0, -pr);
          grad.addColorStop(0, ring.c1);
          grad.addColorStop(1, ring.c2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }
      });

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, TAU);
      ctx.fillStyle = '#F2C14E';
      ctx.fill();
    }

    drawSnowdrop(ctx, f, growth) {
      const open = clamp(growth, 0.08, 1.0);
      const r = f.radius * open;
      const dir = f.droopDir || 1;

      // Graceful arching pedicel neck
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(dir * r * 0.42, -r * 0.55, dir * r * 0.65, r * 0.08);
      ctx.strokeStyle = f.stemColor;
      ctx.lineWidth = 1.4 * f.scale;
      ctx.stroke();

      ctx.save();
      ctx.translate(dir * r * 0.65, r * 0.08);
      ctx.rotate(dir * 0.22);

      // Green ovary cap
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.5 * f.scale, 3.6 * f.scale, 0, 0, TAU);
      ctx.fillStyle = '#6F8B7C';
      ctx.fill();

      // 3 nodding ivory-white bell petals
      [-0.42, 0, 0.42].forEach((ang, idx) => {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.bezierCurveTo(-r * 0.28, r * 0.36, -r * 0.24, r * 0.92, 0, r * (idx === 1 ? 1.05 : 0.96));
        ctx.bezierCurveTo(r * 0.24, r * 0.92, r * 0.28, r * 0.36, 0, 2);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 2, 0, r);
        grad.addColorStop(0, '#E4EEF2');
        grad.addColorStop(0.55, '#FAFDFE');
        grad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(174, 198, 212, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      });

      // Signature pale-green tip marking on inner cup
      ctx.beginPath();
      ctx.arc(0, r * 0.68, 2.1 * f.scale, 0, TAU);
      ctx.fillStyle = 'rgba(122, 162, 134, 0.68)';
      ctx.fill();

      ctx.restore();
    }

    drawBabysBreath(ctx, f, growth) {
      const open = clamp(growth, 0.05, 1.0);
      if (!f.sprayBlooms) return;

      for (let i = 0; i < f.sprayBlooms.length; i++) {
        const b = f.sprayBlooms[i];
        const bx = b.dx * open;
        const by = b.dy * open;

        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.quadraticCurveTo(bx * 0.45, by * 0.35, bx, by);
        ctx.strokeStyle = f.stemColor;
        ctx.lineWidth = 1.0 * f.scale;
        ctx.stroke();

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.rot);

        if (b.isBud) {
          ctx.beginPath();
          ctx.arc(0, 0, b.size * 0.34 * open, 0, TAU);
          ctx.fillStyle = '#FCF8F2';
          ctx.fill();
        } else {
          const pr = b.size * open;
          for (let p = 0; p < 5; p++) {
            ctx.save();
            ctx.rotate((p / 5) * TAU);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-pr * 0.42, -pr * 0.35, -pr * 0.38, -pr * 0.98, 0, -pr);
            ctx.bezierCurveTo(pr * 0.38, -pr * 0.98, pr * 0.42, -pr * 0.35, 0, 0);
            ctx.closePath();
            ctx.fillStyle = f.season === 'winter' ? '#F6FBFF' : '#FCF9F4';
            ctx.fill();
            ctx.restore();
          }
          ctx.beginPath();
          ctx.arc(0, 0, pr * 0.24, 0, TAU);
          ctx.fillStyle = f.season === 'winter' ? '#C5D8E8' : '#D9B15E';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* ========================================================================
       Particles & Lighting Overlays
       ======================================================================== */

    drawPollenMotes(ctx) {
      const mc = SEASONS[this.season].moteColor;
      ctx.save();
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.0 + m.phase);
        const grad = ctx.createRadialGradient(m.x, m.y, 0.2, m.x, m.y, m.r * 3.2);
        grad.addColorStop(0, rgbaStr(mc, m.alpha * twinkle));
        grad.addColorStop(1, rgbaStr(mc, 0));
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

        ctx.beginPath();
        ctx.ellipse(0, s.size * 0.55, 1.15, 2.5, 0, 0, TAU);
        ctx.fillStyle = '#7A644B';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, s.size * 0.35);
        ctx.lineTo(0, -s.size * 0.35);
        ctx.strokeStyle = 'rgba(242, 236, 226, 0.85)';
        ctx.lineWidth = 0.75;
        ctx.stroke();

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

    drawFallingElements(ctx) {
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
        if (p.kind === 'leaf') {
          // Pointed autumn leaf with midrib vein
          ctx.beginPath();
          ctx.moveTo(0, r * 0.7);
          ctx.bezierCurveTo(-r * 0.85, r * 0.25, -r * 0.68, -r * 0.48, 0, -r * 0.92);
          ctx.bezierCurveTo(r * 0.68, -r * 0.48, r * 0.85, r * 0.25, 0, r * 0.7);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, r * 0.7, 0, -r * 0.92);
          grad.addColorStop(0, p.shade);
          grad.addColorStop(1, p.fill);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, r * 0.65);
          ctx.lineTo(0, -r * 0.75);
          ctx.strokeStyle = 'rgba(255, 240, 210, 0.38)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          // Curved flower petal
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
        }
        ctx.restore();
      }
      ctx.restore();
    }

    drawSnowfall(ctx) {
      if (this.snowflakes.length === 0) return;
      ctx.save();
      for (let i = 0; i < this.snowflakes.length; i++) {
        const sf = this.snowflakes[i];
        ctx.save();
        ctx.translate(sf.x, sf.y);
        ctx.globalAlpha = sf.alpha;

        if (sf.isCrystal) {
          ctx.rotate(sf.rot);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.lineWidth = 0.9;
          for (let k = 0; k < 3; k++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(-sf.r, 0);
            ctx.lineTo(sf.r, 0);
            ctx.stroke();
          }
        } else {
          const grad = ctx.createRadialGradient(0, 0, 0.3, 0, 0, sf.r * 1.4);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, sf.r * 1.4, 0, TAU);
          ctx.fill();
        }
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
      grad.addColorStop(0, rgbaStr(this.currentEnv.sunColor, 0.24));
      grad.addColorStop(0.55, rgbaStr(this.currentEnv.beamColor, 0.08));
      grad.addColorStop(1, rgbaStr(this.currentEnv.sunColor, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 90, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  global.GardenScene = GardenScene;
})(window);
