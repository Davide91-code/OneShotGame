/*
 * world.js — il mondo di gioco disegnato su <canvas> in stile sandbox 2D a blocchi:
 * caverna a tile 8x8, muri di sfondo, torce, illuminazione per tile, particelle,
 * eroe animato, eventi sulle caselle, dado e numeri di danno.
 *
 * Risoluzione interna 320x180, ingrandita a multipli interi (pixel netti).
 * Il mondo non conosce il backend: game.js gli dice cosa animare.
 */
(function () {
  'use strict';

  const SP = () => window.OSG.Sprites;

  const TILE = 8, VW = 320, VH = 180, ROWS = 23;
  const CELL_W = 48;   // distanza tra due caselle (6 tile)
  const START_X = 72;  // x della casella 0

  const AIR = 0, STONE = 1, DIRT = 2, MOSS = 3, GRASS = 4, COPPER = 5, GEM = 6;

  // ---------- numeri pseudo-casuali ----------
  function mulberry(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- texture dei blocchi ----------
  const TEX = {
    stone: { base: '#6c6a78', dark: '#575563', light: '#858394', edge: '#2f2d39' },
    dirt: { base: '#8a5a3b', dark: '#704630', light: '#a06b48', edge: '#3f2416' },
    wall: { base: '#25242e', dark: '#201f28', light: '#2b2a35', edge: '#16151c' },
    wallDirt: { base: '#2e241f', dark: '#281f1a', light: '#352a24', edge: '#1a1310' },
  };

  function makeTex(t, variant, ore) {
    const c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    const x = c.getContext('2d');
    x.fillStyle = t.base; x.fillRect(0, 0, TILE, TILE);
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const h = hash(px, py, variant * 31 + 7);
        if (h < 0.16) { x.fillStyle = t.dark; x.fillRect(px, py, 1, 1); }
        else if (h > 0.9) { x.fillStyle = t.light; x.fillRect(px, py, 1, 1); }
      }
    }
    if (ore) {
      const R = mulberry(variant * 97 + 3);
      for (let i = 0; i < 4; i++) {
        const ox = 1 + ((R() * 5) | 0), oy = 1 + ((R() * 5) | 0);
        x.fillStyle = ore[0]; x.fillRect(ox, oy, 2, 1);
        x.fillStyle = ore[1]; x.fillRect(ox, oy + 1, 1, 1);
      }
    }
    return c;
  }

  const ORE = { [COPPER]: ['#e39a55', '#a85a26'], [GEM]: ['#d08cff', '#8b47c9'] };

  class World {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      canvas.width = VW; canvas.height = VH;
      this.ctx.imageSmoothingEnabled = false;

      this.tex = {
        stone: [0, 1, 2, 3].map((v) => makeTex(TEX.stone, v)),
        dirt: [0, 1, 2, 3].map((v) => makeTex(TEX.dirt, v + 10)),
        wall: [0, 1, 2, 3].map((v) => makeTex(TEX.wall, v + 20)),
        wallDirt: [0, 1, 2, 3].map((v) => makeTex(TEX.wallDirt, v + 30)),
        [COPPER]: [0, 1].map((v) => makeTex(TEX.stone, v + 40, ORE[COPPER])),
        [GEM]: [0, 1].map((v) => makeTex(TEX.stone, v + 50, ORE[GEM])),
      };

      this.time = 0;
      this.camX = 0;
      this.shake = 0;
      this.particles = [];
      this.floaters = [];
      this.events = new Map();     // casella -> { type, state, born }
      this.diceAnim = null;
      this.hp = 0; this.maxHp = 0;
      this.position = 0;
      this.visited = new Set();
      this.showHud = false;
      this.attract = true;

      this.hero = { x: 0, y: 0, vy: 0, walking: false, frameT: 0, flash: 0, flashKind: null, dead: false, deadT: 0, cheer: false, offsetX: 0, visible: true };

      this._last = performance.now();
      requestAnimationFrame((t) => this._loop(t));
    }

    // ---------- costruzione del mondo ----------
    static cellX(i) { return START_X + i * CELL_W; }

    build(boardSize, seed) {
      const R = mulberry(seed || (Math.random() * 1e9) | 0);
      this.n = boardSize;
      this.seed = seed;
      this.mouthX = World.cellX(boardSize - 1) - 28;           // dove la caverna si apre all'esterno
      this.worldW = World.cellX(boardSize - 1) + 176;
      this.cols = Math.ceil(this.worldW / TILE);
      const cols = this.cols;
      this.mouthCol = Math.floor(this.mouthX / TILE);

      // altezza del pavimento per casella (piccoli gradini)
      const cellRows = [];
      let r = 16;
      for (let i = 0; i < boardSize; i++) {
        cellRows.push(r);
        r += [-1, 0, 0, 1][(R() * 4) | 0];
        r = Math.max(15, Math.min(17, r));
      }
      this.floorRow = new Array(cols);
      for (let c = 0; c < cols; c++) {
        const idx = Math.round((c * TILE + 4 - START_X) / CELL_W);
        this.floorRow[c] = cellRows[Math.max(0, Math.min(boardSize - 1, idx))];
      }

      // soffitto con rumore morbido; si apre verso il cielo all'uscita
      const knots = [];
      for (let i = 0; i < cols / 4 + 2; i++) knots.push(3 + R() * 4);
      this.ceilRow = new Array(cols);
      for (let c = 0; c < cols; c++) {
        const k = c / 4, i0 = Math.floor(k), f = k - i0;
        const s = f * f * (3 - 2 * f);
        let v = Math.round(knots[i0] * (1 - s) + knots[i0 + 1] * s);
        const open = c - (this.mouthCol - 6);
        if (open > 0) v -= open;
        this.ceilRow[c] = v;   // < 0 = niente soffitto
      }

      // tile
      this.tiles = [];
      this.walls = [];
      for (let row = 0; row < ROWS; row++) {
        const tr = new Uint8Array(cols), wr = new Uint8Array(cols);
        for (let c = 0; c < cols; c++) {
          const fr = this.floorRow[c], cr = this.ceilRow[c];
          const outside = c >= this.mouthCol;
          const h = hash(c, row, 11);
          if (row >= fr) {
            const depth = row - fr;
            let t = STONE;
            if (outside) t = depth < 3 ? DIRT : STONE;
            else if (depth < 2 && hash(c >> 1, row, 5) < 0.35) t = DIRT;
            if (t === STONE && h < 0.05) t = COPPER;
            else if (t === STONE && h > 0.975) t = GEM;
            if (depth === 0) t = outside ? GRASS : (t === DIRT ? DIRT : MOSS);
            tr[c] = t;
          } else if (row <= cr) {
            let t = hash(c >> 1, row >> 1, 9) < 0.25 ? DIRT : STONE;
            if (t === STONE && h < 0.05) t = COPPER;
            else if (t === STONE && h > 0.975) t = GEM;
            tr[c] = t;
          } else if (!outside) {
            // muro di sfondo con qualche buco
            const hole = hash(c >> 1, row >> 1, 21) > 0.9 && row < fr - 2 && row > cr + 2;
            wr[c] = hole ? 0 : (hash(c >> 1, row >> 1, 4) < 0.16 ? 2 : 1);
          }
        }
        this.tiles.push(tr); this.walls.push(wr);
      }

      // decorazioni e luci
      this.torches = [];
      for (let i = 1; i < boardSize - 1; i += 2) {
        const x = World.cellX(i) + 24, col = Math.floor(x / TILE);
        const y = this.floorRow[col] * TILE - 22;
        if (this.walls[Math.floor(y / TILE)] && this.walls[Math.floor(y / TILE)][col]) this.torches.push({ x, y, phase: R() * 10 });
      }
      this.mushrooms = [];
      for (let c = 2; c < this.mouthCol - 2; c++) {
        if (hash(c, 3, 77) < 0.07) {
          const x = c * TILE + 1;
          if (Math.abs(((x - START_X) % CELL_W + CELL_W) % CELL_W - 0) < 20) continue; // lascia libere le caselle
          this.mushrooms.push({ x, y: this.floorRow[c] * TILE });
        }
      }
      this.stalactites = [];
      for (let c = 1; c < this.mouthCol - 3; c++) {
        if (hash(c, 1, 55) < 0.12) this.stalactites.push({ x: c * TILE + 2, y: (this.ceilRow[c] + 1) * TILE, len: 3 + ((hash(c, 2, 55) * 6) | 0) });
      }

      this.events.clear();
      this.visited = new Set([0]);
      this.particles = [];
      this.floaters = [];
      this._prerender();

      this.position = 0;
      const h = this.hero;
      h.x = World.cellX(0) + 10; h.y = this.groundY(h.x); h.vy = 0;
      h.dead = false; h.cheer = false; h.walking = false; h.flash = 0; h.visible = true; h.offsetX = 0;
      this.camX = this.attract ? 0 : this._camTarget();
    }

    groundY(x) {
      const c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / TILE)));
      return this.floorRow[c] * TILE;
    }

    _solid(c, r) {
      if (c < 0 || c >= this.cols) return true;
      if (r < 0) return this.ceilRow[Math.max(0, Math.min(this.cols - 1, c))] >= 0;
      if (r >= ROWS) return true;
      return this.tiles[r][c] !== AIR;
    }

    _prerender() {
      const W = this.cols * TILE, H = ROWS * TILE;
      // muri
      const wc = document.createElement('canvas'); wc.width = W; wc.height = H;
      const wx = wc.getContext('2d');
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < this.cols; c++) {
        const w = this.walls[r][c];
        if (!w) continue;
        const set = w === 2 ? this.tex.wallDirt : this.tex.wall;
        wx.drawImage(set[(hash(c, r, 3) * 4) | 0], c * TILE, r * TILE);
        const has = (cc, rr) => rr >= 0 && rr < ROWS && cc >= 0 && cc < this.cols && (this.walls[rr][cc] || this.tiles[rr][cc]);
        wx.fillStyle = TEX.wall.edge;
        if (!has(c, r - 1)) wx.fillRect(c * TILE, r * TILE, TILE, 1);
        if (!has(c, r + 1)) wx.fillRect(c * TILE, r * TILE + 7, TILE, 1);
        if (!has(c - 1, r)) wx.fillRect(c * TILE, r * TILE, 1, TILE);
        if (!has(c + 1, r)) wx.fillRect(c * TILE + 7, r * TILE, 1, TILE);
      }
      this.wallCanvas = wc;

      // blocchi
      const tc = document.createElement('canvas'); tc.width = W; tc.height = H + 8;
      const tx = tc.getContext('2d');
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < this.cols; c++) {
        const t = this.tiles[r][c];
        if (!t) continue;
        const X = c * TILE, Y = r * TILE;
        let img, edge;
        if (t === DIRT || t === GRASS) { img = this.tex.dirt[(hash(c, r, 1) * 4) | 0]; edge = TEX.dirt.edge; }
        else if (t === COPPER || t === GEM) { img = this.tex[t][(hash(c, r, 2) * 2) | 0]; edge = TEX.stone.edge; }
        else { img = this.tex.stone[(hash(c, r, 1) * 4) | 0]; edge = TEX.stone.edge; }
        tx.drawImage(img, X, Y);

        const up = !this._solid(c, r - 1), dn = !this._solid(c, r + 1);
        const lf = !this._solid(c - 1, r), rt = !this._solid(c + 1, r);
        tx.fillStyle = edge;
        if (up) tx.fillRect(X, Y, TILE, 1);
        if (dn) tx.fillRect(X, Y + 7, TILE, 1);
        if (lf) tx.fillRect(X, Y, 1, TILE);
        if (rt) tx.fillRect(X + 7, Y, 1, TILE);
        if (up && lf) tx.clearRect(X, Y, 1, 1);
        if (up && rt) tx.clearRect(X + 7, Y, 1, 1);
        if (dn && lf) tx.clearRect(X, Y + 7, 1, 1);
        if (dn && rt) tx.clearRect(X + 7, Y + 7, 1, 1);

        // muschio / erba sul bordo superiore
        if (up && (t === MOSS || t === GRASS)) {
          const g1 = t === GRASS ? '#4fbf4a' : '#3f9b4a', g2 = t === GRASS ? '#2f8a35' : '#2b7339', g3 = t === GRASS ? '#7be06a' : '#5cc25f';
          tx.fillStyle = g1; tx.fillRect(X, Y, TILE, 2);
          tx.fillStyle = g3; tx.fillRect(X, Y, TILE, 1);
          for (let i = 0; i < TILE; i++) {
            const h = hash(X + i, Y, 13);
            if (h < 0.4) { tx.fillStyle = g2; tx.fillRect(X + i, Y + 2, 1, 1 + ((h * 5) | 0)); }
            if (h > 0.7) { tx.fillStyle = g1; tx.fillRect(X + i, Y - 1 - ((h * 3) | 0) % 2, 1, 1 + ((h * 3) | 0) % 2); }
          }
          if (lf) tx.clearRect(X, Y, 1, 1);
          if (rt) tx.clearRect(X + 7, Y, 1, 1);
        }
      }
      this.tileCanvas = tc;
    }

    // ---------- comandi da game.js ----------
    setHud(hp, maxHp) { this.hp = hp; this.maxHp = maxHp; }

    _camTarget() { return Math.max(0, Math.min(this.worldW - VW, this.hero.x - VW * 0.38)); }

    walkToX(targetX, speed) {
      speed = speed || 64;
      return new Promise((resolve) => { this._walk = { targetX, speed, resolve }; this.hero.walking = true; });
    }

    async walkToCell(pos) {
      // cammina casella per casella così le caselle si illuminano al passaggio
      for (let p = this.position + 1; p <= pos; p++) {
        await this.walkToX(World.cellX(p) - 8);
        this.visited.add(p);
        this.position = p;
      }
      this.hero.walking = false;
    }

    revealEvent(pos, type) {
      this.events.set(pos, { type, state: 'idle', born: this.time });
      const x = World.cellX(pos) + 8, y = this.groundY(x) - 8;
      this.burst(x, y, ['#ffffff', '#c9b8ff', '#9be7ff'], 18, 40);
    }

    resolveEvent(pos, good) {
      const e = this.events.get(pos);
      if (e) { e.state = good ? 'good' : 'bad'; e.resolvedAt = this.time; }
    }

    rollDice(result) {
      return new Promise((resolve) => {
        this.diceAnim = { t: 0, result, face: 1, resolve, done: false };
      });
    }

    hurt(amount) {
      const h = this.hero;
      h.flash = 0.45; h.flashKind = 'hurt';
      this.shake = 0.3;
      h.offsetX = -6;
      this.burst(h.x, h.y - 10, ['#ff4d4d', '#b3202a', '#ff9a8a'], 16, 50);
      this.floatText('-' + Math.abs(amount), '#ff5a4e');
    }

    heal(amount) {
      const h = this.hero;
      h.flash = 0.45; h.flashKind = 'heal';
      for (let i = 0; i < 18; i++) {
        this.particles.push({ x: h.x - 6 + Math.random() * 12, y: h.y - Math.random() * 20, vx: 0, vy: -12 - Math.random() * 18, life: 1 + Math.random() * 0.6, max: 1.6, color: Math.random() < 0.5 ? '#7dffb0' : '#d6ffe4', size: 1, grav: 0 });
      }
      this.floatText('+' + amount, '#7dffb0');
    }

    neutral() { this.floatText('0', '#d8d8e0'); }

    floatText(text, color) {
      this.floaters.push({ text, color, x: this.hero.x, y: this.hero.y - 26, t: 0 });
    }

    burst(x, y, colors, count, speed) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
        this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.5 + Math.random() * 0.5, max: 1, color: colors[(Math.random() * colors.length) | 0], size: Math.random() < 0.3 ? 2 : 1, grav: 90 });
      }
    }

    die() {
      this.hero.dead = true; this.hero.deadT = 0;
      this.shake = 0.4;
      return new Promise((r) => setTimeout(r, 1500));
    }

    async victory() {
      await this.walkToX(this.mouthX + 72, 56);
      this.hero.walking = false;
      this.hero.cheer = true;
      for (let k = 0; k < 4; k++) {
        setTimeout(() => this.burst(this.hero.x + (Math.random() * 60 - 30), this.hero.y - 40 - Math.random() * 20, ['#f2c94c', '#ff5a4e', '#7dffb0', '#9be7ff', '#ffffff'], 26, 60), k * 300);
      }
      await new Promise((r) => setTimeout(r, 1600));
    }

    // ---------- ciclo ----------
    _loop(now) {
      const dt = Math.max(0, Math.min(0.05, (now - this._last) / 1000));
      this._last = now;
      if (this.tiles) { this._update(dt); this._draw(); }
      requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
      this.time += dt;
      const h = this.hero;

      if (this._walk) {
        const w = this._walk, dir = Math.sign(w.targetX - h.x);
        h.x += dir * w.speed * dt;
        if ((dir >= 0 && h.x >= w.targetX) || (dir < 0 && h.x <= w.targetX)) {
          h.x = w.targetX; this._walk = null; w.resolve();
        }
        h.frameT += dt;
        if (Math.random() < dt * 6) this.particles.push({ x: h.x - 3, y: h.y - 1, vx: -8 - Math.random() * 8, vy: -6, life: 0.4, max: 0.4, color: '#8a8597', size: 1, grav: 30 });
      }

      // gravità/gradini: l'eroe sale e scende dai blocchi con un piccolo salto
      const gy = this.groundY(h.x);
      if (h.y > gy) { h.y = gy; h.vy = -40; }  // gradino in salita: salto
      h.vy += 300 * dt; h.y += h.vy * dt;
      if (h.y >= gy) { h.y = gy; h.vy = 0; }
      if (h.cheer && h.vy === 0 && Math.random() < dt * 2.5) h.vy = -70;

      h.offsetX *= Math.pow(0.0005, dt);
      h.flash = Math.max(0, h.flash - dt);
      if (h.dead) h.deadT += dt;
      this.shake = Math.max(0, this.shake - dt);

      if (this.attract) {
        const span = Math.max(1, this.worldW - VW);
        const p = (this.time * 14) % (span * 2);
        this.camX = p < span ? p : span * 2 - p;
      } else {
        this.camX += (this._camTarget() - this.camX) * Math.min(1, dt * 5);
      }

      for (const p of this.particles) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const f of this.floaters) f.t += dt;
      this.floaters = this.floaters.filter((f) => f.t < 1.4);

      // braci dalle torce
      for (const t of this.torches) if (Math.random() < dt * 1.5) this.particles.push({ x: t.x + 1, y: t.y, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 10, life: 0.8, max: 0.8, color: '#ffb43a', size: 1, grav: -4 });

      if (this.diceAnim) {
        const d = this.diceAnim;
        d.t += dt;
        if (d.t < 0.9) { if (Math.random() < dt * 18) d.face = 1 + ((Math.random() * 6) | 0); }
        else { d.face = d.result; if (!d.done) { d.done = true; this.burst(h.x, h.y - 38, ['#ffffff', '#f2c94c'], 10, 30); } }
        if (d.t > 1.5 && d.resolve) { d.resolve(); d.resolve = null; }
        if (d.t > 2.3) this.diceAnim = null;
      }
    }

    _lights() {
      const t = this.time, L = [];
      for (const tc of this.torches) L.push({ x: tc.x + 1, y: tc.y + 1, r: 62 + Math.sin(t * 9 + tc.phase) * 3 + Math.sin(t * 23 + tc.phase) * 2, i: 1, warm: true });
      L.push({ x: World.cellX(0) - 22, y: this.groundY(World.cellX(0) - 22) - 6, r: 96 + Math.sin(t * 7) * 4, i: 1.1, warm: true });
      for (const m of this.mushrooms) L.push({ x: m.x + 3, y: m.y - 3, r: 26, i: 0.55 });
      L.push({ x: this.mouthX + 30, y: this.groundY(this.mouthX) - 50, r: 170, i: 1.3 });
      for (const [pos, e] of this.events) {
        const x = World.cellX(pos) + 8, y = this.groundY(x) - 8;
        if (e.type === 'altar' || e.type === 'creature' || e.type === 'mystery') L.push({ x, y, r: 34, i: 0.8 });
        if (e.type === 'chest' && e.state === 'good') L.push({ x, y, r: 30, i: 0.8, warm: true });
      }
      const h = this.hero;
      if (!h.dead) L.push({ x: h.x, y: h.y - 10, r: 46, i: 0.85 });
      return L;
    }

    _draw() {
      const ctx = this.ctx, S = SP();
      let cam = Math.round(this.camX);
      const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
      cam += sh;
      const t = this.time;

      // sfondo lontano (caverna) + cielo all'uscita
      ctx.fillStyle = '#100f16'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#16151e';
      for (let i = -1; i < 8; i++) {
        const bx = Math.round(i * 60 - ((cam * 0.4) % 60));
        ctx.fillRect(bx, 40 + ((i * 37) % 30), 26, 90);
        ctx.fillRect(bx + 30, 70 + ((i * 53) % 25), 18, 70);
      }
      const skyX = Math.round(this.mouthX - 8 - cam);
      if (skyX < VW) {
        const g = ctx.createLinearGradient(0, 0, 0, VH);
        g.addColorStop(0, '#5aa7e8'); g.addColorStop(0.7, '#a9dcf7'); g.addColorStop(1, '#d9f1ff');
        ctx.fillStyle = g; ctx.fillRect(Math.max(0, skyX), 0, VW, VH);
        // gli elementi lontani scorrono più lentamente (parallasse)
        const far = (k) => Math.round(skyX * k);
        ctx.save();
        ctx.beginPath(); ctx.rect(Math.max(0, skyX), 0, VW, VH); ctx.clip();
        ctx.fillStyle = '#fff6c2'; ctx.fillRect(far(0.3) + 120, 22, 12, 12);
        ctx.fillStyle = '#fffbe0'; ctx.fillRect(far(0.3) + 122, 20, 8, 16); ctx.fillRect(far(0.3) + 118, 24, 16, 8);
        ctx.fillStyle = '#9fd1a4';
        for (let i = 0; i < 8; i++) { const hx = far(0.5) + i * 34 - 20; ctx.fillRect(hx, 104 - (i % 3) * 7, 30, 80); ctx.fillRect(hx + 6, 100 - (i % 3) * 7, 18, 6); }
        ctx.fillStyle = '#6cb575';
        for (let i = 0; i < 8; i++) { const hx = far(0.7) + i * 46 - 10; ctx.fillRect(hx, 116 - (i % 2) * 8, 40, 80); ctx.fillRect(hx + 8, 111 - (i % 2) * 8, 24, 6); }
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 4; i++) {
          const cx = far(0.2) + ((i * 83 + t * 4) % 300) - 20;
          ctx.fillRect(cx, 18 + i * 9, 24, 4); ctx.fillRect(cx + 5, 15 + i * 9, 13, 3);
        }
        ctx.restore();
      }

      // muri di sfondo
      ctx.drawImage(this.wallCanvas, cam, 0, VW, VH, 0, 0, VW, VH);

      // stalattiti
      ctx.fillStyle = '#4b4957';
      for (const s of this.stalactites) {
        const x = s.x - cam; if (x < -4 || x > VW) continue;
        for (let i = 0; i < s.len; i++) ctx.fillRect(x + Math.floor(i / 3), s.y + i, Math.max(1, 3 - Math.floor(i / 2)), 1);
      }

      // torce
      for (const tc of this.torches) {
        const x = tc.x - cam; if (x < -4 || x > VW + 4) continue;
        ctx.drawImage(S.torch[Math.floor(t * 8 + tc.phase) % 2], Math.round(x), tc.y);
      }

      // insegne con il numero di casella
      for (let i = 1; i < this.n - 1; i++) {
        const x = World.cellX(i) - 24 - cam;
        if (x < -12 || x > VW) continue;
        const gy = this.groundY(World.cellX(i) - 24);
        ctx.drawImage(S.sign, Math.round(x), gy - 11);
        const label = String(i);
        S.drawText(ctx, label, Math.round(x) + 6 - S.textWidth(label) / 2, gy - 9, this.visited.has(i) ? '#f2c94c' : '#2a1a10');
      }

      // falò di partenza e bandiera d'arrivo
      const fx = World.cellX(0) - 30 - cam;
      ctx.drawImage(S.campfire[Math.floor(t * 9) % 3], Math.round(fx), this.groundY(World.cellX(0) - 30) - 8);
      const flagX = World.cellX(this.n - 1) + 8;
      ctx.drawImage(S.flag[Math.floor(t * 4) % 2], Math.round(flagX - cam), this.groundY(flagX) - 16);

      // blocchi
      ctx.drawImage(this.tileCanvas, cam, 0, VW, VH, 0, 0, VW, VH);

      // funghi luminosi
      for (const m of this.mushrooms) { const x = m.x - cam; if (x > -8 && x < VW) ctx.drawImage(S.mushroom, Math.round(x), m.y - 5); }

      // eventi
      for (const [pos, e] of this.events) {
        const ex = World.cellX(pos) + 8;
        const x = ex - cam; if (x < -20 || x > VW + 20) continue;
        const img = this._eventSprite(e);
        if (!img) continue;
        let bob = 0;
        if (e.type === 'creature' || e.type === 'mystery') bob = Math.round(Math.sin(t * 3 + pos) * 1);
        if (e.type === 'chest' && e.state === 'bad') bob = Math.round(Math.abs(Math.sin(t * 10)) * -2);
        const age = t - e.born;
        ctx.globalAlpha = Math.min(1, age * 3);
        ctx.drawImage(img, Math.round(x - img.width / 2), this.groundY(ex) - img.height + bob);
        ctx.globalAlpha = 1;
      }

      this._drawHero(ctx, cam);

      // particelle
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - cam), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;

      this._drawLighting(ctx, cam);
      this._drawUi(ctx, cam);
    }

    _eventSprite(e) {
      const S = SP();
      switch (e.type) {
        case 'traveler': return S.traveler;
        case 'chest': return S.chest[e.state];
        case 'creature': return S.creature[e.state];
        case 'altar': return S.altar[e.state];
        case 'trap': return S.trap[e.state];
        case 'mystery': return S.mystery;
        default: return null;
      }
    }

    _drawHero(ctx, cam) {
      const S = SP(), h = this.hero;
      if (!h.visible) return;
      const x = Math.round(h.x + h.offsetX - cam), y = Math.round(h.y);
      if (h.dead) {
        if (h.deadT < 0.6) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.min(1, h.deadT / 0.4) * Math.PI / 2);
          ctx.globalAlpha = 1 - h.deadT / 0.6;
          ctx.drawImage(S.hero.hurt, -6, -20);
          ctx.restore();
          ctx.globalAlpha = 1;
          if (!h._boom) { h._boom = true; this.burst(h.x, h.y - 10, ['#ff4d4d', '#b3202a', '#e8e3d6'], 30, 60); }
        }
        if (h.deadT > 0.5) {
          const drop = Math.max(0, 1 - (h.deadT - 0.5) * 3);
          ctx.drawImage(S.tombstone, x - 5, y - 10 - Math.round(drop * 30));
        }
        return;
      }
      h._boom = false;
      let img = S.hero.idle;
      if (h.walking) img = S.hero.walk[Math.floor(h.frameT * 8) % 2];
      if (h.flash > 0 && Math.floor(h.flash * 20) % 2 === 0) img = h.flashKind === 'heal' ? S.hero.heal : S.hero.hurt;
      ctx.drawImage(img, x - 6, y - 20);
    }

    _drawLighting(ctx, cam) {
      const lights = this._lights().filter((l) => l.x + l.r > cam && l.x - l.r < cam + VW);
      const c0 = Math.floor(cam / TILE), c1 = Math.ceil((cam + VW) / TILE);
      const ambient = 0.07;
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || c >= this.cols) continue;
        const outside = c >= this.mouthCol;
        for (let r = 0; r < ROWS; r++) {
          const px = c * TILE + 4, py = r * TILE + 4;
          let L = ambient, warm = 0;
          if (outside && r < this.floorRow[c] + 2) L = 1;
          else {
            if (outside) L = Math.max(L, 1 - (r - this.floorRow[c] - 1) * 0.22);
            for (const l of lights) {
              const dx = px - l.x, dy = py - l.y;
              const d2 = dx * dx + dy * dy;
              if (d2 > l.r * l.r) continue;
              let v = l.i * (1 - Math.sqrt(d2) / l.r);
              if (v > L) L = v;
              if (l.warm && v > warm) warm = v;
            }
          }
          if (L >= 1) continue;
          const a = Math.round((1 - L) * 8) / 8;
          const x = c * TILE - cam, y = r * TILE;
          ctx.fillStyle = 'rgba(4,3,10,' + (a * 0.96).toFixed(3) + ')';
          ctx.fillRect(x, y, TILE, TILE);
          if (warm > 0.15) {
            ctx.fillStyle = 'rgba(255,150,50,' + (Math.min(0.12, warm * 0.12)).toFixed(3) + ')';
            ctx.fillRect(x, y, TILE, TILE);
          }
        }
      }
    }

    _drawUi(ctx, cam) {
      const S = SP(), h = this.hero;

      // numeri di danno / cura
      for (const f of this.floaters) {
        const y = f.y - f.t * 16;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, f.t - 0.8) / 0.6);
        S.drawText(ctx, f.text, f.x - cam - S.textWidth(f.text) / 2, y, f.color, '#1b1824');
      }
      ctx.globalAlpha = 1;

      // dado sopra la testa
      if (this.diceAnim) {
        const d = this.diceAnim;
        const hop = d.t < 0.9 ? Math.abs(Math.sin(d.t * 12)) * 6 : 0;
        const fade = d.t > 1.8 ? Math.max(0, 1 - (d.t - 1.8) / 0.5) : 1;
        ctx.globalAlpha = fade;
        ctx.drawImage(S.dice[d.face], Math.round(h.x - cam - 5), Math.round(h.y - 40 - hop));
        ctx.globalAlpha = 1;
      }

      if (!this.showHud) return;

      // cuori
      for (let i = 0; i < this.maxHp; i++) {
        ctx.drawImage(i < this.hp ? S.heart.full : S.heart.empty, 6 + i * 8, 6);
      }
      const hpText = this.hp + '/' + this.maxHp;
      S.drawText(ctx, hpText, 7, 15, '#ffffff', '#1b1824');

      // mini-mappa del percorso
      const n = this.n, w = Math.min(150, (n - 1) * 4), sx = VW - w - 10, sy = 9;
      const step = w / (n - 1);
      ctx.fillStyle = '#1b1824'; ctx.fillRect(sx - 2, sy - 2, w + 5, 5);
      ctx.fillStyle = '#3a3546'; ctx.fillRect(sx - 1, sy - 1, w + 3, 3);
      const px = Math.round(sx + this.position * step);
      ctx.fillStyle = '#7d6b52'; ctx.fillRect(sx, sy, px - sx, 1);
      for (const v of this.visited) { ctx.fillStyle = '#f2c94c'; ctx.fillRect(Math.round(sx + v * step), sy, 1, 1); }
      ctx.fillStyle = '#ff5a4e'; ctx.fillRect(sx + w - 1, sy - 3, 2, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 1, sy - 2, 3, 3);
      ctx.fillStyle = '#3b6fd1'; ctx.fillRect(px, sy - 1, 1, 1);
    }
  }

  World.VW = VW; World.VH = VH;
  window.OSG = window.OSG || {};
  window.OSG.World = World;
})();
