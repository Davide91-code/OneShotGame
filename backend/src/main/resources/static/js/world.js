/*
 * world.js — il mondo di gioco disegnato su <canvas> in pixel art.
 *
 * Risoluzione virtuale 384x216, scalata a numeri interi dal CSS (pixel nitidi).
 * Il percorso del backend (N caselle) diventa un sentiero che attraversa quattro zone:
 *   Giardini Muschiosi -> Mercato delle Lanterne -> Cripta al Neon -> Profondità di Brace
 *
 * API usata da game.js:
 *   build(n, seed) · setHud(hp, max) · rollDice(v) · walkToCell(i) · revealEvent(i, ev)
 *   resolveEvent(i, tone) · hurt(d) · heal(d) · neutral() · victory() · die()
 */
(function () {
  'use strict';

  const { Sprites } = window.RMD;
  const K = Sprites.OUTLINE;
  const T = 16;
  const VW = 384;
  const VH = 216;
  const MAP_H = 24;

  // ------------------------------------------------------------------ utilità
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(x, y, s) {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);

  // piccolo "pennello" per creare sprite procedurali
  function paint(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    const p = {
      g,
      px(x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, ww | 0, hh | 0); },
      disc(cx, cy, r, col) {
        g.fillStyle = col;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) {
          for (let x = Math.floor(cx - r); x <= cx + r; x++) {
            if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1);
          }
        }
      },
    };
    fn(p);
    return c;
  }

  // ------------------------------------------------------------------ zone (biomi)
  const BIOMES = [
    {
      name: 'Giardini Muschiosi', ambient: '#aaa2cc',
      floor: ['#5e9a44', '#6ca94e', '#4f8a3c'], path: ['#dcbc82', '#cba66c', '#9c7c50'],
      top: ['#1d3a3a', '#2a5446', '#3f7646', '#6a9c44'], face: ['#5f6f60', '#52604f', '#3c463c'],
      tree: ['#163040', '#24504a', '#3f7d3c', '#8cc24a', '#b8dc5a'],
    },
    {
      name: 'Mercato delle Lanterne', ambient: '#a98a9c',
      floor: ['#d48d42', '#c98039', '#e29d50'], path: ['#ead6aa', '#d8c090', '#a8906a'],
      top: ['#3e3550', '#52466a', '#6a5c86', '#2a2236'], face: ['#9a6448', '#7e4e38', '#5a3428'],
      tree: ['#163a3a', '#1f5a52', '#2f8a6e', '#5ab88a', '#8fdcaa'],
    },
    {
      name: 'Cripta al Neon', ambient: '#6f66aa',
      floor: ['#8a84c6', '#a29de0', '#6c66a6'], path: ['#c6c1f2', '#b2ace6', '#8a84c0'],
      top: ['#1c1834', '#262046', '#3a3266', '#5af0ff'], face: ['#4c4180', '#3e346a', '#2a2350'],
      tree: ['#1c1834', '#3a2f6a', '#6a4fb0', '#b07ad8', '#f0b0ff'],
    },
    {
      name: 'Profondità di Brace', ambient: '#7c5466',
      floor: ['#4e3c4a', '#5a4654', '#423240'], path: ['#ae8c7c', '#9c7a6a', '#6e5248'],
      top: ['#1e1418', '#2e1e24', '#44282c', '#ff7a30'], face: ['#6c3c38', '#5a302e', '#3e2022'],
      tree: ['#2a1418', '#5a2028', '#a03a30', '#ff7a30', '#ffd070'],
    },
  ];
  BIOMES.forEach((b) => {
    ['floor', 'path', 'top', 'face', 'tree'].forEach((k) => { b[k + 'C'] = b[k].map(rgb); });
    b.ambientC = rgb(b.ambient);
  });

  // ------------------------------------------------------------------ sprite procedurali degli oggetti
  const objCache = new Map();
  function obj(kind, b, v) {
    const key = kind + b + ':' + (v || 0);
    if (objCache.has(key)) return objCache.get(key);
    const P = BIOMES[b].tree;
    let c;
    switch (kind) {
      case 'tree':
        c = paint(36, 44, (p) => {
          const blobs = [[18, 14, 11], [9, 20, 8], [27, 20, 8], [13, 9, 7], [24, 9, 7], [18, 23, 8]];
          p.rect(15, 26, 6, 16, K); p.rect(16, 26, 4, 17, '#5a3a2a'); p.rect(16, 26, 1, 17, '#7a5038');
          p.rect(13, 41, 10, 2, K);
          blobs.forEach(([x, y, r]) => p.disc(x, y, r + 1, K));
          blobs.forEach(([x, y, r]) => p.disc(x, y, r, P[1]));
          blobs.forEach(([x, y, r]) => p.disc(x - 1, y - 2, r - 2, P[2]));
          blobs.forEach(([x, y, r]) => p.disc(x - 2, y - 4, r - 5, P[3]));
          for (let i = 0; i < 26; i++) {
            const x = 4 + ((hash(i, v, 7) * 28) | 0), y = 2 + ((hash(i, v, 9) * 26) | 0);
            const d = p.g.getImageData(x, y, 1, 1).data;
            if (d[3] && !(d[0] === 27 && d[1] === 22)) p.px(x, y, hash(i, v, 3) < 0.5 ? P[4] : P[0]);
          }
          blobs.forEach(([x, y, r]) => { for (let a = 0.6; a < 2.5; a += 0.35) p.px(x + Math.cos(a) * r, y + Math.sin(a) * r, P[0]); });
        });
        break;
      case 'pine':
        c = paint(20, 34, (p) => {
          p.rect(8, 26, 4, 7, K); p.rect(9, 26, 2, 8, '#5a3a2a');
          const tiers = [[10, 2, 4], [10, 7, 6], [10, 13, 8], [10, 19, 9]];
          tiers.forEach(([cx, y, r]) => { for (let i = 0; i < 9; i++) { const w = Math.round((r * (i + 1)) / 9); p.rect(cx - w - 1, y + i, w * 2 + 2, 1, K); } });
          tiers.forEach(([cx, y, r]) => {
            for (let i = 0; i < 8; i++) {
              const w = Math.round((r * (i + 1)) / 9);
              p.rect(cx - w, y + i, w * 2, 1, P[2]);
              p.rect(cx - w, y + i, Math.max(1, w - 1), 1, P[3]);
              p.rect(cx + w - 1, y + i, 1, 1, P[1]);
            }
          });
          p.px(10, 1, P[4]);
        });
        break;
      case 'bush':
        c = paint(18, 13, (p) => {
          const bl = [[6, 7, 5], [12, 7, 5], [9, 5, 5]];
          bl.forEach(([x, y, r]) => p.disc(x, y, r + 1, K));
          bl.forEach(([x, y, r]) => p.disc(x, y, r, P[1]));
          bl.forEach(([x, y, r]) => p.disc(x - 1, y - 1, r - 2, P[2]));
          p.px(7, 3, P[4]); p.px(12, 4, P[3]); p.px(5, 6, P[3]);
          if (v % 2 === 0) { p.px(4, 8, '#f07aa0'); p.px(12, 9, '#f07aa0'); p.px(9, 4, '#ffe070'); }
        });
        break;
      case 'rock':
        c = paint(14, 9, (p) => {
          p.disc(7, 5, 6, K); p.disc(7, 5, 5, '#8a8496'); p.disc(6, 4, 3, '#aaa4b6'); p.px(5, 3, '#cfc9da');
          p.rect(1, 7, 12, 2, '#5a5468');
        });
        break;
      case 'barrel':
        c = paint(12, 14, (p) => {
          p.rect(1, 0, 10, 14, K); p.rect(0, 2, 12, 10, K);
          p.rect(2, 1, 8, 12, '#a0643a'); p.rect(1, 3, 10, 8, '#a0643a');
          p.rect(2, 1, 2, 12, '#c07a48'); p.rect(8, 1, 2, 12, '#7a4a2a');
          p.rect(1, 3, 10, 1, '#4a3a3a'); p.rect(1, 10, 10, 1, '#4a3a3a');
          p.rect(3, 1, 6, 1, '#d89a5a');
        });
        break;
      case 'pot':
        c = paint(10, 11, (p) => {
          p.disc(5, 6, 5, K); p.rect(2, 0, 6, 3, K);
          p.disc(5, 6, 4, '#c0603a'); p.rect(3, 1, 4, 2, '#c0603a'); p.disc(4, 5, 2, '#e08a5a'); p.rect(3, 9, 5, 1, '#8a3a2a');
        });
        break;
      case 'lamp':
        c = paint(8, 30, (p) => {
          p.rect(3, 6, 3, 24, K); p.rect(4, 7, 1, 22, '#4a4058');
          p.rect(1, 0, 7, 8, K); p.rect(2, 1, 5, 6, '#ffd070'); p.rect(3, 2, 2, 3, '#fff3b0');
          p.rect(0, 28, 9, 2, K);
        });
        break;
      case 'neon':
        c = paint(8, 30, (p) => {
          const col = v % 2 ? '#ff5ad0' : '#5af0ff';
          p.rect(3, 4, 3, 26, K); p.rect(4, 5, 1, 24, '#3a3460');
          p.rect(1, 0, 7, 12, K); p.rect(2, 1, 5, 10, col); p.rect(3, 2, 2, 8, '#ffffff');
          p.rect(0, 28, 9, 2, K);
        });
        break;
      case 'pillar':
        c = paint(12, 26, (p) => {
          p.rect(0, 0, 12, 26, K); p.rect(1, 1, 10, 24, '#4c4180'); p.rect(1, 1, 3, 24, '#5f54a0'); p.rect(9, 1, 2, 24, '#332a5c');
          p.rect(0, 0, 12, 3, K); p.rect(1, 1, 10, 1, '#7a70c0');
          const col = v % 2 ? '#ff5ad0' : '#5af0ff';
          p.rect(5, 6, 2, 1, col); p.rect(4, 8, 4, 1, col); p.rect(5, 10, 2, 4, col); p.rect(3, 15, 6, 1, col); p.rect(5, 17, 2, 3, col);
        });
        break;
      case 'crystal':
        c = paint(12, 16, (p) => {
          const col = v % 2 ? ['#ff9ad8', '#d84aa0'] : ['#8ff0ff', '#3ab0d8'];
          [[2, 6, 3, 10], [5, 1, 3, 15], [8, 5, 3, 11]].forEach(([x, y, w, h]) => {
            p.rect(x - 1, y, w + 2, h, K); p.rect(x, y - 1, w, 1, K);
            p.rect(x, y, w, h - 1, col[1]); p.rect(x, y, 1, h - 1, col[0]); p.px(x, y, '#ffffff');
          });
          p.rect(0, 15, 12, 1, K);
        });
        break;
      case 'brazier':
        c = paint(12, 12, (p) => {
          p.rect(0, 0, 12, 5, K); p.rect(1, 1, 10, 3, '#5a4a52'); p.rect(1, 1, 10, 1, '#ff7a30');
          p.rect(2, 5, 2, 7, K); p.rect(8, 5, 2, 7, K); p.rect(4, 8, 4, 1, K);
        });
        break;
      case 'campfire':
        c = paint(16, 8, (p) => {
          p.rect(1, 3, 14, 4, K); p.rect(2, 4, 12, 2, '#7a4a2a'); p.rect(2, 4, 12, 1, '#a0643a');
          for (let i = 0; i < 8; i++) p.disc(2 + i * 1.8, 7, 1.4, i % 2 ? '#8a8496' : '#6a6478');
        });
        break;
      case 'gate':
        c = paint(52, 60, (p) => {
          p.rect(0, 10, 52, 50, K);
          p.rect(1, 11, 50, 48, '#6a6488'); p.rect(1, 11, 50, 2, '#9a94b8');
          for (let y = 14; y < 58; y += 5) for (let x = 2 + ((y / 5) % 2) * 4; x < 50; x += 8) p.rect(x, y, 1, 4, '#4a4466');
          for (let y = 14; y < 58; y += 5) p.rect(1, y, 50, 1, '#4a4466');
          p.disc(26, 30, 17, K); p.rect(9, 30, 34, 29, K);
          p.disc(26, 30, 16, '#140f22'); p.rect(10, 30, 32, 29, '#140f22');
          p.rect(20, 0, 12, 12, K); p.rect(21, 1, 10, 10, '#f2c14e'); p.rect(23, 3, 6, 6, '#fff3b0');
          p.rect(0, 56, 52, 4, K); p.rect(1, 57, 50, 2, '#4a4466');
        });
        break;
      default:
        c = paint(1, 1, () => {});
    }
    objCache.set(key, c);
    return c;
  }

  // ------------------------------------------------------------------ dado isometrico
  const PIPS = {
    1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
  };
  function drawDie(g, cx, cy, top, left, right) {
    const a = 6, h = 13;
    cx = Math.round(cx); cy = Math.round(cy);
    const shape = (ox, oy, colTop, colL, colR) => {
      for (let y = 0; y < 2 * a; y++) {
        const hw = y < a ? (y + 1) * 2 : (2 * a - y) * 2;
        g.fillStyle = colTop; g.fillRect(cx - hw + ox, cy + y + oy, hw * 2, 1);
      }
      for (let i = 0; i < 2 * a; i++) {
        g.fillStyle = colL; g.fillRect(cx - 2 * a + i + ox, cy + a + Math.floor(i / 2) + oy, 1, h);
        g.fillStyle = colR; g.fillRect(cx + i + ox, cy + 2 * a - Math.floor(i / 2) - 1 + oy, 1, h);
      }
    };
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) shape(ox, oy, K, K, K);
    shape(0, 0, '#f6f2ea', '#d2ccc2', '#aaa39a');
    g.fillStyle = '#ffffff'; g.fillRect(cx - 2, cy + 1, 4, 1);
    g.fillStyle = '#2a2238';
    const face = (val, ox, oy, ux, uy, vx, vy, w, hh) => {
      PIPS[val].forEach(([u, v]) => g.fillRect(Math.round(ox + u * ux + v * vx - w / 2), Math.round(oy + u * uy + v * vy - hh / 2), w, hh));
    };
    face(top, cx - 2 * a, cy + a, 2 * a, -a, 2 * a, a, 2, 1);
    face(left, cx - 2 * a, cy + a, 2 * a, a, 0, h, 2, 2);
    face(right, cx, cy + 2 * a, 2 * a, -a, 0, h, 2, 2);
  }
  function sideFaces(v) {
    const others = [1, 2, 3, 4, 5, 6].filter((x) => x !== v && x !== 7 - v);
    const l = others[(Math.random() * others.length) | 0];
    const r = others.filter((x) => x !== l && x !== 7 - l)[0];
    return [l, r];
  }

  // ------------------------------------------------------------------ World
  class World {
    constructor(canvas) {
      this.canvas = canvas;
      canvas.width = VW; canvas.height = VH;
      this.g = canvas.getContext('2d');
      this.g.imageSmoothingEnabled = false;
      this.light = document.createElement('canvas');
      this.light.width = VW; this.light.height = VH;
      this.lg = this.light.getContext('2d');
      this.time = 0;
      this.attract = false;
      this.showHud = false;
      this.hp = 10; this.maxHp = 10;
      this.onBiome = null;
      this._last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - this._last) / 1000);
        this._last = now;
        if (this.ground) { this.update(dt); this.render(); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // ---------------------------------------------------------------- generazione mappa
    build(nCells, seed) {
      const rng = mulberry32(seed);
      this.seed = seed;
      const S = 3;
      const coarse = [{ x: 0, y: 0 }];
      const occ = new Set(['0,0']);
      let last = 'R', run = 0;
      while (coarse.length < nCells) {
        const cur = coarse[coarse.length - 1];
        const opts = [['R', run > 0 ? 3 : 2]];
        const free = (x, y) => !occ.has(x + ',' + y) && !occ.has(x - 1 + ',' + y);
        if (run < 2 && last !== 'D' && cur.y > -2 && free(cur.x, cur.y - 1)) opts.push(['U', 1.2]);
        if (run < 2 && last !== 'U' && cur.y < 2 && free(cur.x, cur.y + 1)) opts.push(['D', 1.2]);
        let tot = opts.reduce((s, o) => s + o[1], 0), r = rng() * tot, dir = 'R';
        for (const [d, w] of opts) { if ((r -= w) <= 0) { dir = d; break; } }
        const nx = cur.x + (dir === 'R' ? 1 : 0), ny = cur.y + (dir === 'U' ? -1 : dir === 'D' ? 1 : 0);
        run = dir === 'R' ? 0 : run + 1;
        last = dir;
        coarse.push({ x: nx, y: ny });
        occ.add(nx + ',' + ny);
      }
      const cells = coarse.map((c) => ({ tx: 6 + c.x * S, ty: 12 + c.y * S }));
      const W = cells[cells.length - 1].tx + 9, H = MAP_H;
      this.W = W; this.H = H;

      // sentiero tile per tile
      const path = [];
      const cellTile = [0];
      for (let i = 0; i < cells.length; i++) {
        if (i === 0) { path.push({ x: cells[0].tx, y: cells[0].ty }); continue; }
        let { tx: x, ty: y } = cells[i - 1];
        const { tx: ex, ty: ey } = cells[i];
        while (x !== ex || y !== ey) {
          x += Math.sign(ex - x); y += Math.sign(ey - y);
          path.push({ x, y });
        }
        cellTile.push(path.length - 1);
      }
      this.cells = cells; this.path = path; this.cellTile = cellTile;

      // pavimento scavato attorno al sentiero
      const floor = new Uint8Array(W * H);
      const isPath = new Uint8Array(W * H);
      path.forEach((p) => { isPath[p.y * W + p.x] = 1; });
      const carve = (cx, cy, r) => {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          if (x < 1 || y < 3 || x >= W - 1 || y >= H - 2) continue;
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) floor[y * W + x] = 1;
        }
      };
      path.forEach((p) => carve(p.x, p.y, 1.6 + rng() * 1.3));
      cells.forEach((c) => carve(c.tx, c.ty, 2.2 + rng() * 0.8));
      for (let i = 0; i < W / 3; i++) {
        const p = path[(rng() * path.length) | 0];
        carve(p.x + (rng() * 8 - 4) | 0, p.y + (rng() * 8 - 4) | 0, 1.5 + rng() * 2);
      }
      carve(cells[0].tx - 1, cells[0].ty, 3.2);
      const end = cells[cells.length - 1];
      carve(end.tx, end.ty - 1, 3.6);
      // niente muri spessi un solo tile (con la vista 3/4 sembrerebbero strani)
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 3; y < H - 3; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!floor[i] && floor[i - W] && (floor[i + W] || floor[i + 2 * W])) floor[i] = 1;
          if (!floor[i] && floor[i - 1] && floor[i + 1]) floor[i] = 1;
        }
      }
      this.floor = floor; this.isPath = isPath;

      // zona di ogni colonna (con un po' di "sfumatura" ai confini)
      const x0 = cells[0].tx, x1 = end.tx;
      this.biomeAt = (x, y) => clamp(Math.floor(((x - x0) / (x1 - x0 + 1)) * 4 + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.3), 0, 3);
      this.cellBiome = cells.map((c) => clamp(Math.floor(((c.tx - x0) / (x1 - x0 + 1)) * 4), 0, 3));

      this.lights = [];
      this.torches = [];
      this.objects = [];
      this.paintGround(rng);
      this.placeObjects(rng);
      this.buildMinimap();

      // stato dinamico
      this.cellState = cells.map(() => 'new');
      this.entities = new Map();
      this.particles = [];
      this.floaters = [];
      this.heroTile = 0;
      const p0 = this.tileFeet(0);
      this.hero = { x: p0.x, y: p0.y, dir: 1, walk: 0, moving: false, flash: 0, flashCol: '#ffffff', dead: 0, hidden: false, scale: 1 };
      this.wisp = { x: p0.x - 14, y: p0.y - 20 };
      this.cam = { x: clamp(p0.x - VW / 2, 0, W * T - VW), y: clamp(p0.y - VH * 0.45, 0, H * T - VH) };
      this.shake = 0;
      this.dice = null;
      this.fade = { v: 0, col: '#ffffff' };
      this.walkTask = null;
      this.currentBiome = -1;
      this.gatePulse = 0;
    }

    tileFeet(pathIdx) {
      const p = this.path[pathIdx];
      return { x: p.x * T + 8, y: p.y * T + 12 };
    }

    // ---------------------------------------------------------------- terreno (cotto una volta in un canvas)
    paintGround(rng) {
      const { W, H, floor, isPath, seed } = this;
      const PW = W * T, PH = H * T;
      const ground = document.createElement('canvas');
      ground.width = PW; ground.height = PH;
      const gg = ground.getContext('2d');
      const img = gg.createImageData(PW, PH);
      const buf = new Uint32Array(img.data.buffer);
      const isF = (x, y) => x >= 0 && y >= 0 && x < W && y < H && floor[y * W + x] === 1;
      const isP = (x, y) => x >= 0 && y >= 0 && x < W && y < H && isPath[y * W + x] === 1;
      const set = (x, y, c) => { buf[y * PW + x] = 0xff000000 | (clamp(c[2] | 0, 0, 255) << 16) | (clamp(c[1] | 0, 0, 255) << 8) | clamp(c[0] | 0, 0, 255); };
      const KC = rgb(K);

      const floorPx = (b, gx, gy) => {
        const B = BIOMES[b];
        const h = hash(gx, gy, seed);
        if (b === 0) {
          const n = vnoise(gx / 7, gy / 7, seed);
          let c = n < 0.35 ? B.floorC[2] : n < 0.7 ? B.floorC[0] : B.floorC[1];
          if (h < 0.035) c = rgb('#8cc25a'); else if (h < 0.06) c = mul(c, 0.82);
          return c;
        }
        if (b === 1) {
          const n = vnoise(gx / 9, gy / 9, seed + 3);
          let c = n < 0.4 ? B.floorC[1] : n < 0.75 ? B.floorC[0] : B.floorC[2];
          if (h < 0.05) c = mul(c, 0.8); else if (h < 0.07) c = rgb('#f0b870');
          return c;
        }
        if (b === 2) {
          const lx = gx & 15, ly = gy & 15;
          let c = (((lx >> 3) + (ly >> 3)) & 1) ? B.floorC[0] : B.floorC[1];
          if ((lx & 7) === 0 || (ly & 7) === 0) c = B.floorC[2];
          else if ((lx & 7) === 1 || (ly & 7) === 1) c = mix(c, [255, 255, 255], 0.12);
          const st = vnoise(gx / 11, gy / 11, seed + 9);
          if (st > 0.72) c = mul(c, 0.86);
          return c;
        }
        const n = vnoise(gx / 6, gy / 6, seed + 5);
        let c = n < 0.4 ? B.floorC[2] : n < 0.75 ? B.floorC[0] : B.floorC[1];
        const cr = Math.abs(vnoise(gx / 14, gy / 14, seed + 11) - 0.5);
        if (cr < 0.007) c = rgb('#ff8a3a'); else if (cr < 0.016) c = mul(c, 0.65);
        if (h < 0.04) c = mul(c, 1.2);
        return c;
      };
      const pathPx = (b, gx, gy) => {
        const B = BIOMES[b];
        const lx = gx & 15, ly = gy & 15;
        const ox = (gy >> 3) & 1 ? 4 : 0;
        const sx = (gx + ox) >> 3, sy = gy >> 3;
        if (((gx + ox) & 7) === 0 || (ly & 7) === 0) return B.pathC[2];
        let c = hash(sx, sy, seed + 1) < 0.5 ? B.pathC[0] : B.pathC[1];
        if (((gx + ox) & 7) === 1 || (ly & 7) === 1) c = mix(c, [255, 255, 255], 0.15);
        if (((gx + ox) & 7) === 7 || (ly & 7) === 7) c = mul(c, 0.9);
        if (hash(gx, gy, seed + 2) < 0.03) c = mul(c, 0.85);
        void lx;
        return c;
      };
      const topPx = (b, gx, gy) => {
        const B = BIOMES[b];
        const h = hash(gx, gy, seed + 4);
        if (b === 0) {
          const n = vnoise(gx / 4, gy / 4, seed + 6) * 0.85 + h * 0.15;
          return n < 0.35 ? B.topC[0] : n < 0.58 ? B.topC[1] : n < 0.8 ? B.topC[2] : B.topC[3];
        }
        if (b === 1) {
          const row = gy >> 2, off = row & 1 ? 4 : 0;
          if ((gy & 3) === 3 || ((gx + off) & 7) === 0) return B.topC[3];
          return (gy & 3) === 0 ? B.topC[2] : B.topC[1];
        }
        if (b === 2) {
          if (h < 0.006) return B.topC[3];
          if ((gx & 7) === 0 || (gy & 7) === 0) return B.topC[1];
          return B.topC[0];
        }
        const v = Math.abs(vnoise(gx / 12, gy / 12, seed + 12) - 0.5);
        if (v < 0.008) return mix(B.topC[3], B.topC[2], 0.4);
        return h < 0.5 ? B.topC[0] : B.topC[1];
      };
      const facePx = (b, gx, fy) => {
        const B = BIOMES[b];
        const h = hash(gx, fy, seed + 8);
        let c;
        if (b === 0) {
          const row = (fy / 5) | 0, off = row & 1 ? 5 : 0;
          if (fy % 5 === 4 || (gx + off) % 10 === 0) c = B.faceC[2];
          else c = hash(((gx + off) / 10) | 0, row, seed) < 0.5 ? B.faceC[0] : B.faceC[1];
          if (fy < 2 + ((hash(gx, 0, seed + 13) * 6) | 0)) c = hash(gx, fy, 1) < 0.5 ? rgb('#3f7646') : rgb('#4f8a3c');
        } else if (b === 1) {
          if (fy < 3) c = rgb('#4a2e26');
          else if (fy > 27) c = (gx & 7) === 0 ? B.faceC[2] : rgb('#8a7a72');
          else c = ((gx / 5) | 0) % 2 ? B.faceC[0] : B.faceC[1];
          if (fy >= 3 && fy <= 27 && gx % 5 === 0) c = B.faceC[2];
        } else if (b === 2) {
          const lx = gx & 15, ly = fy & 15;
          c = B.faceC[1];
          if (lx === 0 || ly === 0) c = mix(B.faceC[0], [255, 255, 255], 0.25);
          else if (lx === 15 || ly === 15) c = B.faceC[2];
          if (fy === 22) c = rgb('#7a6ad8');
        } else {
          const n = vnoise(gx / 12, fy / 3, seed + 14);
          c = n < 0.4 ? B.faceC[0] : n < 0.7 ? B.faceC[1] : B.faceC[2];
          if (Math.abs(vnoise(gx / 7, fy / 7, seed + 15) - 0.5) < 0.02) c = rgb('#ff7a30');
        }
        if (fy === 0) c = mix(c, [255, 255, 255], 0.2);
        if (fy >= 30) c = mul(c, 0.55);
        if (h < 0.04) c = mul(c, 0.9);
        return c;
      };

      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        const b = this.biomeAt(tx, ty);
        const f = isF(tx, ty), pth = isP(tx, ty);
        const faceLow = !f && isF(tx, ty + 1);
        const faceUp = !f && !isF(tx, ty + 1) && isF(tx, ty + 2);
        const rockAbove = !isF(tx, ty - 1), rockL = !isF(tx - 1, ty), rockR = !isF(tx + 1, ty);
        for (let ly = 0; ly < T; ly++) for (let lx = 0; lx < T; lx++) {
          const gx = tx * T + lx, gy = ty * T + ly;
          let c;
          if (f) {
            if (pth) {
              c = pathPx(b, gx, gy);
              const hh = hash(gx, gy, seed + 21);
              const edge = (!isP(tx, ty - 1) && ly < 2) || (!isP(tx, ty + 1) && ly > 13) || (!isP(tx - 1, ty) && lx < 2) || (!isP(tx + 1, ty) && lx > 13);
              if (edge && hh < 0.55) c = floorPx(b, gx, gy);
            } else c = floorPx(b, gx, gy);
            let ao = 1;
            if (rockAbove) ao *= ly < 6 ? 0.52 + ly * 0.08 : 1;
            if (rockL && lx < 2) ao *= 0.78;
            if (rockR && lx > 13) ao *= 0.78;
            c = mul(c, ao);
          } else if (faceLow || faceUp) {
            c = facePx(b, gx, faceUp ? ly : ly + 16);
          } else {
            c = topPx(b, gx, gy);
            const fu = isF(tx, ty - 1), fl = isF(tx - 1, ty), fr = isF(tx + 1, ty);
            if (fu && ly === 0) c = KC; else if (fu && ly === 1) c = mix(c, [255, 255, 255], 0.2);
            if (fl && lx === 0) c = KC; else if (fl && lx === 1) c = mix(c, [255, 255, 255], 0.15);
            if (fr && lx === 15) c = KC; else if (fr && lx === 14) c = mul(c, 0.8);
            const faceBelow = !isF(tx, ty + 1) && isF(tx, ty + 3) && !isF(tx, ty + 2);
            if (faceBelow && ly >= 14) c = ly === 15 ? KC : mix(c, [255, 255, 255], 0.25);
          }
          set(gx, gy, c);
        }
        // contorno verticale scuro ai lati dei muri (facciate)
        if (faceLow || faceUp) {
          for (let ly = 0; ly < T; ly++) {
            if (isF(tx - 1, ty + (faceUp ? 2 : 1)) && isF(tx - 1, ty)) set(tx * T, ty * T + ly, KC);
            if (isF(tx + 1, ty + (faceUp ? 2 : 1)) && isF(tx + 1, ty)) set(tx * T + 15, ty * T + ly, KC);
          }
        }
      }
      // linea scura sopra le facciate
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        if (!isF(tx, ty) && !isF(tx, ty + 1) && isF(tx, ty + 2) && !isF(tx, ty - 1)) {
          for (let lx = 0; lx < T; lx++) set(tx * T + lx, ty * T, KC);
        }
      }
      gg.putImageData(img, 0, 0);

      // ---- decorazioni piatte e sulle facciate
      const P = (x, y, col, w, h) => { gg.fillStyle = col; gg.fillRect(x, y, w || 1, h || 1); };
      // facciate: cerca i tratti continui di muro (tile basso con pavimento sotto)
      for (let ty = 2; ty < H - 1; ty++) {
        let tx = 0;
        while (tx < W) {
          if (!isF(tx, ty) && isF(tx, ty + 1) && !isF(tx, ty - 1)) {
            let ex = tx;
            while (ex < W && !isF(ex, ty) && isF(ex, ty + 1) && !isF(ex, ty - 1)) ex++;
            for (let x = tx + 1 + ((rng() * 2) | 0); x < ex - 1; x += 3 + ((rng() * 4) | 0)) {
              const b = this.biomeAt(x, ty);
              const px = x * T, py = (ty - 1) * T; // y della parte alta della facciata
              const r = rng();
              if (b === 0) {
                if (r < 0.45) this.addTorch(gg, px + 7, py + 12);
                else {
                  for (let i = 0; i < 4; i++) {
                    const vx = px + 2 + ((rng() * 12) | 0), len = 6 + ((rng() * 16) | 0);
                    for (let j = 0; j < len; j++) P(vx + (j % 5 === 4 ? 1 : 0), py + 2 + j, j % 3 ? '#3f7646' : '#6a9c44');
                    P(vx - 1, py + 2 + len, '#f07aa0');
                  }
                }
              } else if (b === 1) {
                if (r < 0.5 && x + 1 < ex - 1) {
                  // vetrina illuminata
                  P(px + 3, py + 8, K, 22, 14); P(px + 4, py + 9, '#ffcf6a', 20, 12); P(px + 4, py + 9, '#fff0b0', 20, 4);
                  P(px + 13, py + 9, '#7a4a2a', 2, 12); P(px + 4, py + 14, '#7a4a2a', 20, 1);
                  P(px + 2, py + 6, '#c0392b', 24, 3); for (let i = 0; i < 24; i += 4) P(px + 2 + i, py + 6, '#f2d36b', 2, 3);
                  this.lights.push({ x: px + 14, y: py + 22, r: 46, col: '#ffb040', f: 0.05 });
                  x++;
                } else if (r < 0.75) {
                  // stendardo
                  const col = rng() < 0.5 ? ['#c0392b', '#e05a48'] : ['#2f6b9a', '#4a8ac0'];
                  P(px + 4, py + 2, K, 9, 22); P(px + 5, py + 3, col[0], 7, 19); P(px + 5, py + 3, col[1], 2, 19);
                  P(px + 7, py + 8, '#f2d36b', 3, 3); P(px + 5, py + 22, K, 2, 2); P(px + 10, py + 22, K, 2, 2);
                } else {
                  this.addLantern(gg, px + 8, py + 4);
                }
              } else if (b === 2) {
                if (r < 0.55 && x + 1 < ex - 1) {
                  // insegna al neon
                  const col = rng() < 0.5 ? '#ff5ad0' : '#5af0ff';
                  P(px + 2, py + 5, K, 26, 12); P(px + 3, py + 6, '#151028', 24, 10);
                  gg.fillStyle = col;
                  gg.fillRect(px + 3, py + 6, 24, 1); gg.fillRect(px + 3, py + 15, 24, 1); gg.fillRect(px + 3, py + 6, 1, 10); gg.fillRect(px + 26, py + 6, 1, 10);
                  for (let i = 0; i < 5; i++) {
                    const gx2 = px + 6 + i * 4, hgt = 2 + ((rng() * 4) | 0);
                    gg.fillRect(gx2, py + 9, 2, 1); gg.fillRect(gx2 + ((rng() * 2) | 0), py + 9, 1, hgt);
                  }
                  this.lights.push({ x: px + 15, y: py + 20, r: 44, col, f: 0.25, neon: true });
                  x++;
                } else if (r < 0.8) {
                  // tubo
                  P(px + 6, py, K, 5, 32); P(px + 7, py, '#6a6488', 3, 32); P(px + 7, py, '#8a84a8', 1, 32);
                  P(px + 5, py + 10, K, 7, 3); P(px + 5, py + 24, K, 7, 3);
                } else {
                  P(px + 3, py + 8, K, 10, 8); P(px + 4, py + 9, '#2a6aa0', 8, 6); P(px + 5, py + 10, '#8ff0ff', 3, 1); P(px + 5, py + 12, '#8ff0ff', 5, 1);
                  this.lights.push({ x: px + 8, y: py + 16, r: 22, col: '#5ab0ff', f: 0.1 });
                }
              } else {
                if (r < 0.6) this.addTorch(gg, px + 7, py + 12);
                else {
                  P(px + 5, py + 4, '#ff7a30', 1, 20); P(px + 6, py + 10, '#ffd070', 1, 6); P(px + 4, py + 16, '#ff7a30', 1, 6);
                  this.lights.push({ x: px + 5, y: py + 18, r: 26, col: '#ff6a2a', f: 0.15 });
                }
              }
            }
            tx = ex;
          } else tx++;
        }
      }
      // pavimento: erba, fiori, foglie, pozzanghere, lava, ossa
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        if (!isF(tx, ty) || isP(tx, ty)) continue;
        const b = this.biomeAt(tx, ty);
        const px = tx * T, py = ty * T;
        const r = rng();
        if (b === 0) {
          for (let i = 0; i < 3; i++) if (rng() < 0.55) {
            const x = px + ((rng() * 13) | 0), y = py + 3 + ((rng() * 12) | 0);
            P(x, y, '#3f7646'); P(x + 2, y, '#3f7646'); P(x + 1, y - 1, '#8cc25a'); P(x, y - 1, '#4f8a3c'); P(x + 2, y - 2, '#4f8a3c');
          }
          if (r < 0.18) {
            const x = px + 3 + ((rng() * 9) | 0), y = py + 4 + ((rng() * 8) | 0);
            const col = ['#f07aa0', '#ffe070', '#ffffff', '#8fb0ff'][(rng() * 4) | 0];
            P(x, y - 1, col); P(x - 1, y, col); P(x + 1, y, col); P(x, y + 1, col); P(x, y, '#ffd040');
          }
        } else if (b === 1) {
          if (r < 0.35) for (let i = 0; i < 3; i++) {
            const x = px + ((rng() * 14) | 0), y = py + ((rng() * 14) | 0);
            const col = ['#e05a28', '#f2a03a', '#c0392b'][(rng() * 3) | 0];
            P(x, y, col, 2, 1); P(x + 1, y + 1, col);
          }
        } else if (b === 2) {
          if (r < 0.09) {
            const x = px + 2, y = py + 6;
            gg.fillStyle = '#5c5698'; gg.fillRect(x + 2, y, 9, 1); gg.fillRect(x, y + 1, 13, 3); gg.fillRect(x + 2, y + 4, 9, 1);
            gg.fillStyle = '#c6c1f2'; gg.fillRect(x + 3, y + 1, 4, 1); gg.fillStyle = '#ff9ad8'; gg.fillRect(x + 8, y + 3, 2, 1);
          }
        } else {
          if (r < 0.05) {
            const x = px + 2, y = py + 5;
            gg.fillStyle = K; gg.fillRect(x + 3, y - 2, 7, 9); gg.fillRect(x + 1, y - 1, 11, 7); gg.fillRect(x, y + 1, 13, 3);
            gg.fillStyle = '#ff5a1a'; gg.fillRect(x + 3, y - 1, 7, 7); gg.fillRect(x + 1, y + 1, 11, 3); gg.fillRect(x + 2, y, 9, 5);
            gg.fillStyle = '#ffb040'; gg.fillRect(x + 4, y + 1, 5, 3); gg.fillStyle = '#fff0a0'; gg.fillRect(x + 5, y + 2, 2, 1);
            this.lights.push({ x: x + 6, y: y + 3, r: 34, col: '#ff6a2a', f: 0.2 });
          } else if (r < 0.1) {
            const x = px + 3 + ((rng() * 8) | 0), y = py + 6 + ((rng() * 6) | 0);
            P(x, y, '#ece6d6', 5, 1); P(x - 1, y - 1, '#ece6d6'); P(x - 1, y + 1, '#ece6d6'); P(x + 5, y - 1, '#ece6d6'); P(x + 5, y + 1, '#ece6d6');
          }
        }
      }
      this.ground = ground;
    }

    addTorch(gg, x, y) {
      gg.fillStyle = K; gg.fillRect(x - 2, y, 5, 3); gg.fillRect(x - 1, y + 3, 3, 4);
      gg.fillStyle = '#7a5a3a'; gg.fillRect(x - 1, y + 1, 3, 1); gg.fillRect(x, y + 3, 1, 3);
      this.torches.push({ x, y: y - 1 });
      this.lights.push({ x, y: y - 2, r: 42, col: '#ff9a3a', f: 0.35 });
    }

    addLantern(gg, x, y) {
      gg.fillStyle = K; gg.fillRect(x, y, 1, 4); gg.fillRect(x - 3, y + 4, 7, 8);
      gg.fillStyle = '#ff6a3a'; gg.fillRect(x - 2, y + 5, 5, 6); gg.fillStyle = '#ffd070'; gg.fillRect(x - 1, y + 6, 3, 4);
      this.lights.push({ x, y: y + 8, r: 32, col: '#ff8a4a', f: 0.12 });
    }

    // ---------------------------------------------------------------- oggetti (ordinati per profondità)
    placeObjects(rng) {
      const { W, H, floor, isPath, cells } = this;
      const busy = new Uint8Array(W * H);
      const near = (x, y, d) => {
        for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) {
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && isPath[yy * W + xx]) return true;
        }
        return false;
      };
      const ok = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && floor[y * W + x] && !busy[y * W + x];
      const end = cells[cells.length - 1];
      const start = cells[0];
      const add = (img, x, y, extra) => { const o = Object.assign({ img, x, y }, extra || {}); this.objects.push(o); return o; };

      for (let ty = 2; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
        if (!ok(tx, ty) || isPath[ty * W + tx]) continue;
        if (Math.abs(tx - end.tx) < 4 && Math.abs(ty - end.ty) < 4) continue;
        if (Math.abs(tx - start.tx) < 3 && Math.abs(ty - start.ty) < 3) continue;
        const b = this.biomeAt(tx, ty);
        const d1 = near(tx, ty, 1), d2 = near(tx, ty, 2);
        const r = rng();
        const fx = tx * T + 8, fy = ty * T + 14;
        const v = (rng() * 1000) | 0;
        let placed = false;
        if (b === 0) {
          if (!d2 && r < 0.22 && floor[(ty - 1) * W + tx]) { add(obj('tree', b, v % 5), fx, fy); placed = true; }
          else if (!d1 && r < 0.32) { add(obj('bush', b, v % 4), fx, fy); placed = true; }
          else if (!d1 && r < 0.36) { add(obj('rock', b), fx, fy - 2); placed = true; }
        } else if (b === 1) {
          if (!d2 && r < 0.14) { add(obj('pine', b, 0), fx, fy); placed = true; }
          else if (!d1 && r < 0.21) { add(obj('barrel', b), fx, fy); placed = true; }
          else if (!d1 && r < 0.26) { add(Sprites.get('crate'), fx, fy); placed = true; }
          else if (!d1 && r < 0.31) { add(obj('pot', b), fx, fy); placed = true; }
          else if (!d1 && r < 0.34) {
            add(obj('lamp', b), fx, fy); this.lights.push({ x: fx, y: fy - 26, r: 48, col: '#ffb040', f: 0.06 }); placed = true;
          }
        } else if (b === 2) {
          if (!d1 && r < 0.05) {
            const o = add(obj('neon', b, v), fx, fy);
            this.lights.push({ x: fx, y: fy - 24, r: 46, col: v % 2 ? '#ff5ad0' : '#5af0ff', f: 0.3, neon: true });
            void o; placed = true;
          } else if (!d1 && r < 0.1) {
            add(obj('pillar', b, v), fx, fy); this.lights.push({ x: fx, y: fy - 12, r: 26, col: v % 2 ? '#ff5ad0' : '#5af0ff', f: 0.1 }); placed = true;
          } else if (!d1 && r < 0.16) { add(Sprites.get('crate'), fx, fy); placed = true; }
          else if (!d2 && r < 0.22) { add(obj('tree', b, v % 5), fx, fy); placed = true; }
        } else {
          if (!d1 && r < 0.06) {
            add(obj('crystal', b, v), fx, fy); this.lights.push({ x: fx, y: fy - 8, r: 30, col: v % 2 ? '#ff6ad0' : '#5ae0ff', f: 0.1 }); placed = true;
          } else if (!d1 && r < 0.1) {
            add(obj('brazier', b), fx, fy, { flame: { dx: 0, dy: -12 } });
            this.lights.push({ x: fx, y: fy - 14, r: 52, col: '#ff8a3a', f: 0.35 }); placed = true;
          } else if (!d1 && r < 0.16) { add(obj('rock', b), fx, fy - 2); placed = true; }
        }
        if (placed) busy[ty * W + tx] = 1;
      }

      // fuoco del campo base e cancello d'uscita
      const s0 = { x: start.tx * T + 8 - 22, y: start.ty * T + 12 };
      add(obj('campfire', 0), s0.x, s0.y + 2, { flame: { dx: 0, dy: -4 }, big: true });
      this.lights.push({ x: s0.x, y: s0.y - 4, r: 70, col: '#ff9a3a', f: 0.4 });
      this.gate = add(obj('gate', 3), end.tx * T + 8, end.ty * T + 4, { gate: true });
      this.lights.push({ x: end.tx * T + 8, y: end.ty * T - 20, r: 90, col: '#ffe9a0', f: 0.05, gate: true });
      // luce tenue sulle caselle non ancora visitate
      cells.forEach((c, i) => { if (i > 0 && i < cells.length - 1) this.lights.push({ x: c.tx * T + 8, y: c.ty * T + 10, r: 16, col: '#9a7aff', f: 0, cell: i }); });
    }

    buildMinimap() {
      const { W, H, floor, isPath } = this;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const cols = ['#4f8a3c', '#c98039', '#6c66a6', '#6e3c3a'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.fillStyle = isPath[y * W + x] ? '#ead6aa' : floor[y * W + x] ? cols[this.biomeAt(x, y)] : '#1a1428';
        g.fillRect(x, y, 1, 1);
      }
      this.minimap = c;
    }

    // ---------------------------------------------------------------- API per game.js
    setHud(hp, max) { this.hp = hp; this.maxHp = max; }

    rollDice(value) {
      return new Promise((resolve) => {
        const [l, r] = sideFaces(value);
        this.dice = { t: 0, value, l, r, faces: [1, 2, 3], nextFace: 0, resolve, landed: false };
      });
    }

    walkToCell(cellIndex) {
      const target = this.cellTile[cellIndex];
      return new Promise((resolve) => {
        this.walkTask = { target, resolve };
        this.hero.moving = true;
      });
    }

    revealEvent(cellIndex, ev) {
      const c = this.cells[cellIndex];
      const img = Sprites.get(ev.sprite) || Sprites.get('creature');
      this.entities.set(cellIndex, {
        img, name: ev.sprite, x: c.tx * T + 8 + 15, y: c.ty * T + 14, born: this.time, alpha: 1, state: 'show', monster: ev.monster, lunge: 0,
      });
      this.cellState[cellIndex] = 'current';
      this.burst(c.tx * T + 23, c.ty * T + 4, ev.monster ? '#ff6a6a' : '#b8fff6', 12);
      this.sfx && this.sfx('reveal');
    }

    resolveEvent(cellIndex, tone) {
      this.cellState[cellIndex] = tone; // good | bad | neutral
      const e = this.entities.get(cellIndex);
      if (e) {
        if (tone === 'bad' && e.monster) e.lunge = 1;
        e.state = 'leaving';
        e.leaveAt = this.time + 1.4;
      }
      const L = this.lights.find((l) => l.cell === cellIndex);
      if (L) L.col = tone === 'good' ? '#5aff8a' : tone === 'bad' ? '#ff5a5a' : '#9a94b8';
    }

    hurt(delta) {
      this.hero.flash = 0.6; this.hero.flashCol = '#ff4a4a';
      this.shake = 0.35;
      this.floaters.push({ x: this.hero.x, y: this.hero.y - 22, text: String(delta), col: '#ff5a5a', t: 0 });
      this.burst(this.hero.x, this.hero.y - 8, '#ff4a4a', 14);
    }

    heal(delta) {
      this.hero.flash = 0.5; this.hero.flashCol = '#9cffb0';
      this.floaters.push({ x: this.hero.x, y: this.hero.y - 22, text: '+' + delta, col: '#7cff9a', t: 0, icon: 'potion' });
      for (let i = 0; i < 16; i++) {
        this.particles.push({ x: this.hero.x + (Math.random() * 16 - 8), y: this.hero.y - Math.random() * 14, vx: 0, vy: -20 - Math.random() * 20, life: 1 + Math.random() * 0.6, col: i % 2 ? '#7cff9a' : '#e8fff0', size: 1, glow: true });
      }
    }

    neutral() {
      this.floaters.push({ x: this.hero.x, y: this.hero.y - 22, text: '0', col: '#c8c0e0', t: 0 });
    }

    victory() {
      return new Promise((resolve) => {
        this.gatePulse = 0.01;
        let t = 0;
        const step = () => {
          t += 0.016;
          this.burst(this.gate.x + (Math.random() * 30 - 15), this.gate.y - 26 + (Math.random() * 20 - 10), Math.random() < 0.5 ? '#fff3b0' : '#f2c14e', 2);
          this.fade.col = '#fff6d8';
          this.fade.v = clamp((t - 0.8) / 1.2, 0, 1);
          this.hero.scale = clamp(1 - (t - 0.5) / 1.2, 0, 1);
          if (t < 2.2) setTimeout(step, 16); else resolve();
        };
        step();
      });
    }

    die() {
      return new Promise((resolve) => {
        this.hero.dead = 0.01;
        this.burst(this.hero.x, this.hero.y - 8, '#9a94b8', 20);
        setTimeout(resolve, 1300);
      });
    }

    burst(x, y, col, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 90, life: 0.5 + Math.random() * 0.5, col, size: Math.random() < 0.3 ? 2 : 1, glow: true });
      }
    }

    // ---------------------------------------------------------------- aggiornamento
    update(dt) {
      this.time += dt;
      const h = this.hero;
      // camminata lungo il sentiero
      if (this.walkTask) {
        const tgt = this.walkTask.target;
        if (this.heroTile === tgt) {
          h.moving = false;
          const r = this.walkTask.resolve; this.walkTask = null; r();
        } else {
          const next = this.heroTile + 1;
          const p = this.tileFeet(next);
          const dx = p.x - h.x, dy = p.y - h.y;
          const dist = Math.hypot(dx, dy);
          const sp = 78 * dt;
          if (Math.abs(dx) > 0.5) h.dir = Math.sign(dx);
          if (dist <= sp) {
            h.x = p.x; h.y = p.y; this.heroTile = next;
            if (this.cellTile.includes(next)) this.sfx && this.sfx('step');
          } else { h.x += (dx / dist) * sp; h.y += (dy / dist) * sp; }
          h.walk += dt;
          if (Math.random() < dt * 8) this.particles.push({ x: h.x - h.dir * 3, y: h.y, vx: -h.dir * 8, vy: -6, life: 0.35, col: 'rgba(230,220,200,0.7)', size: 1 });
        }
      }
      if (h.flash > 0) h.flash -= dt;
      if (h.dead > 0) h.dead = Math.min(1, h.dead + dt * 3);
      if (this.shake > 0) this.shake -= dt;

      // il fuoco fatuo segue l'eroe
      const wx = h.x - h.dir * 13, wy = h.y - 22 + Math.sin(this.time * 2.4) * 3;
      this.wisp.x = lerp(this.wisp.x, wx, 1 - Math.pow(0.02, dt));
      this.wisp.y = lerp(this.wisp.y, wy, 1 - Math.pow(0.02, dt));

      // telecamera
      let tx, ty;
      if (this.attract) {
        const span = this.W * T - VW;
        tx = (Math.sin(this.time * 0.045 - 1.4) * 0.5 + 0.5) * span;
        ty = this.cells[0].ty * T - VH * 0.5 + Math.sin(this.time * 0.11) * 30;
      } else {
        tx = h.x - VW / 2;
        ty = h.y - VH * 0.36;
      }
      tx = clamp(tx, 0, this.W * T - VW); ty = clamp(ty, 0, this.H * T - VH);
      const k = this.attract ? 1 - Math.pow(0.3, dt) : 1 - Math.pow(0.004, dt);
      this.cam.x = lerp(this.cam.x, tx, k); this.cam.y = lerp(this.cam.y, ty, k);

      // zona attuale
      const pt = this.path[this.heroTile];
      const b = this.attract ? -1 : clamp(Math.floor(((pt.x - this.cells[0].tx) / (this.cells[this.cells.length - 1].tx - this.cells[0].tx + 1)) * 4), 0, 3);
      if (b !== this.currentBiome) { this.currentBiome = b; if (b >= 0 && this.onBiome) this.onBiome(BIOMES[b].name, b); }

      // particelle ambientali
      const cb = clamp(Math.floor(((this.cam.x + VW / 2) / T - this.cells[0].tx) / (this.cells[this.cells.length - 1].tx - this.cells[0].tx + 1) * 4), 0, 3);
      this.camBiome = cb;
      if (Math.random() < dt * 6) {
        const x = this.cam.x + Math.random() * VW, y = this.cam.y + Math.random() * VH;
        if (cb === 0) this.particles.push({ x, y, vx: 4, vy: -3, life: 3, col: '#e8ff8a', size: 1, glow: true, fly: true });
        else if (cb === 1) this.particles.push({ x, y: this.cam.y - 4, vx: 10, vy: 14, life: 5, col: Math.random() < 0.5 ? '#e05a28' : '#f2a03a', size: 2, leaf: true });
        else if (cb === 2) this.particles.push({ x, y, vx: 0, vy: -4, life: 3, col: Math.random() < 0.5 ? '#5af0ff' : '#ff9ad8', size: 1, glow: true, fly: true });
        else this.particles.push({ x, y: this.cam.y + VH + 2, vx: 3, vy: -22, life: 5, col: Math.random() < 0.6 ? '#ff8a3a' : '#ffd070', size: 1, glow: true });
      }
      for (const p of this.particles) {
        p.life -= dt;
        if (p.fly) { p.vx += (Math.random() - 0.5) * 30 * dt; p.vy += (Math.random() - 0.5) * 30 * dt; }
        if (p.leaf) p.vx = 10 + Math.sin(this.time * 3 + p.y * 0.1) * 14;
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
      for (const f of this.floaters) f.t += dt;
      this.floaters = this.floaters.filter((f) => f.t < 1.6);

      // entità
      for (const [i, e] of this.entities) {
        if (e.lunge > 0) e.lunge = Math.max(0, e.lunge - dt * 2.5);
        if (e.state === 'leaving' && this.time > e.leaveAt) { e.alpha -= dt * 1.5; if (e.alpha <= 0) this.entities.delete(i); }
      }

      // dado
      const d = this.dice;
      if (d) {
        d.t += dt;
        if (d.t < 1.0) {
          d.nextFace -= dt;
          if (d.nextFace <= 0) {
            d.nextFace = 0.07;
            const t = 1 + ((Math.random() * 6) | 0);
            const [l, r] = sideFaces(t);
            d.faces = [t, l, r];
            this.sfx && this.sfx('tick');
          }
        } else if (!d.landed) {
          d.landed = true; d.faces = [d.value, d.l, d.r];
          this.sfx && this.sfx('land');
          this.burst(VW / 2 + this.cam.x, VH * 0.36 + this.cam.y + 16, '#fff3b0', 10);
        }
        if (d.t > 1.75 && d.resolve) { const r = d.resolve; d.resolve = null; r(); }
        if (d.t > 2.1) this.dice = null;
      }
    }

    // ---------------------------------------------------------------- disegno
    render() {
      const g = this.g;
      const t = this.time;
      let cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      if (this.shake > 0) { cx += Math.round((Math.random() - 0.5) * 6); cy += Math.round((Math.random() - 0.5) * 6); }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = '#120e1e';
      g.fillRect(0, 0, VW, VH);
      g.drawImage(this.ground, cx, cy, VW, VH, 0, 0, VW, VH);
      const inView = (x, y, m) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m * 2;

      // piastre delle caselle
      this.cells.forEach((c, i) => {
        if (i === this.cells.length - 1) return;
        const x = c.tx * T + 8 - cx, y = c.ty * T + 9 - cy;
        if (x < -20 || x > VW + 20 || y < -20 || y > VH + 20) return;
        const st = this.cellState[i];
        const base = i === 0 ? '#6a5a48' : st === 'good' ? '#2f6a40' : st === 'bad' ? '#7a2f38' : st === 'neutral' ? '#55506a' : '#3a3260';
        const rune = st === 'good' ? '#9cf0a0' : st === 'bad' ? '#ff9a8a' : st === 'neutral' ? '#b8b0d0' : '#a99aff';
        g.fillStyle = K; g.fillRect(x - 7, y - 3, 14, 8); g.fillRect(x - 6, y - 4, 12, 10);
        g.fillStyle = base; g.fillRect(x - 6, y - 3, 12, 8);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 6, y - 3, 12, 1);
        if (i === 0) { Sprites.drawText(g, 'x', x - 1, y - 1, '#f2c14e'); return; }
        g.fillStyle = rune;
        if (st === 'bad') { g.fillRect(x - 3, y - 1, 1, 1); g.fillRect(x - 2, y, 1, 1); g.fillRect(x - 1, y + 1, 2, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x + 2, y - 1, 1, 1); g.fillRect(x - 2, y + 2, 1, 1); g.fillRect(x + 2, y + 2, 1, 1); }
        else if (st === 'good') { g.fillRect(x - 3, y, 1, 1); g.fillRect(x - 2, y + 1, 1, 1); g.fillRect(x - 1, y + 2, 1, 1); g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x + 2, y - 1, 1, 1); }
        else { g.fillRect(x - 1, y - 2, 2, 1); g.fillRect(x - 3, y, 6, 1); g.fillRect(x - 1, y + 2, 2, 1); g.fillRect(x - 1, y - 1, 2, 4); }
        if (st === 'current') {
          const a = 0.5 + Math.sin(t * 6) * 0.5;
          g.fillStyle = `rgba(242,193,78,${0.5 + a * 0.5})`;
          g.fillRect(x - 8, y - 4, 16, 1); g.fillRect(x - 8, y + 6, 16, 1); g.fillRect(x - 8, y - 4, 1, 11); g.fillRect(x + 7, y - 4, 1, 11);
        }
      });

      // fiamme delle torce sui muri
      for (const tc of this.torches) {
        if (!inView(tc.x, tc.y, 10)) continue;
        this.drawFlame(g, tc.x - cx, tc.y - cy, 1, tc.x);
      }

      // oggetti, entità ed eroe ordinati per y
      const list = [];
      for (const o of this.objects) if (inView(o.x, o.y, 40)) list.push(o);
      for (const [, e] of this.entities) list.push({ ent: e, y: e.y });
      list.push({ hero: true, y: this.hero.y });
      list.sort((a, b) => a.y - b.y);
      for (const o of list) {
        if (o.hero) this.drawHero(g, cx, cy);
        else if (o.ent) this.drawEntity(g, o.ent, cx, cy);
        else {
          const x = Math.round(o.x - o.img.width / 2 - cx), y = Math.round(o.y - o.img.height - cy);
          if (!o.gate) { g.fillStyle = 'rgba(20,12,30,0.35)'; g.fillRect(x + 2, Math.round(o.y - cy) - 2, o.img.width - 4, 3); }
          g.drawImage(o.img, x, y);
          if (o.gate) this.drawPortal(g, Math.round(o.x - cx), Math.round(o.y - cy));
          if (o.flame) this.drawFlame(g, Math.round(o.x - cx + o.flame.dx), Math.round(o.y - cy + o.flame.dy), o.big ? 2 : 1.4, o.x);
        }
      }

      // particelle non luminose
      for (const p of this.particles) {
        if (p.glow) continue;
        g.globalAlpha = clamp(p.life * 2, 0, 1);
        g.fillStyle = p.col; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.leaf ? 1 : p.size);
      }
      g.globalAlpha = 1;

      this.drawLighting(cx, cy);

      // particelle luminose (dopo la luce, così brillano)
      g.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        if (!p.glow) continue;
        const a = clamp(p.life * 1.5, 0, 1) * (p.fly ? 0.5 + 0.5 * Math.sin(t * 5 + p.x) : 1);
        g.globalAlpha = a;
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.size);
        if (p.fly || p.size > 1) { g.globalAlpha = a * 0.25; g.fillRect(Math.round(p.x - cx) - 1, Math.round(p.y - cy) - 1, p.size + 2, p.size + 2); }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // raggi di luce nei giardini (come i boschi di Eastward)
      if (this.camBiome === 0) {
        g.globalCompositeOperation = 'screen';
        for (let i = 0; i < 4; i++) {
          const wx = Math.floor(cx / 140) * 140 + i * 140 + 40 - cx;
          const a = 0.05 + 0.03 * Math.sin(t * 0.7 + i);
          g.fillStyle = `rgba(255,240,180,${a})`;
          g.beginPath(); g.moveTo(wx, -10); g.lineTo(wx + 30, -10); g.lineTo(wx + 110, VH + 10); g.lineTo(wx + 70, VH + 10); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }

      // punti interrogativi sulle prossime caselle
      if (!this.attract) {
        const hc = this.cellTile.findIndex((ti) => ti >= this.heroTile);
        for (let i = Math.max(1, hc); i < Math.min(this.cells.length - 1, hc + 7); i++) {
          if (this.cellState[i] !== 'new') continue;
          const c = this.cells[i];
          const x = c.tx * T + 8 - cx - 1, y = c.ty * T - 6 - cy + Math.round(Math.sin(t * 3 + i) * 2);
          Sprites.drawText(g, '?', x, y, '#d8ccff', 1, '#2a2050');
        }
      }

      // numeri fluttuanti
      for (const f of this.floaters) {
        const k = f.t / 1.6;
        const x = Math.round(f.x - cx), y = Math.round(f.y - cy - ease(Math.min(1, k * 1.5)) * 18);
        g.globalAlpha = clamp((1 - k) * 2.5, 0, 1);
        const w = Sprites.textWidth(f.text, 2);
        let ox = x - w / 2;
        if (f.icon) { const ic = Sprites.get(f.icon); g.drawImage(ic, Math.round(ox - ic.width / 2 - 2), y - 2); ox += ic.width / 2 + 2; }
        Sprites.drawText(g, f.text, Math.round(ox), y, f.col, 2, K);
      }
      g.globalAlpha = 1;

      if (this.dice) this.drawDice(g);
      if (this.showHud) this.drawHud(g);

      if (this.fade.v > 0) { g.globalAlpha = this.fade.v; g.fillStyle = this.fade.col; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    }

    drawFlame(g, x, y, s, seed) {
      const t = this.time * 10 + seed;
      const h = Math.round((4 + Math.sin(t) * 1.2 + Math.sin(t * 2.7) * 0.8) * s);
      const w = Math.max(2, Math.round(2 * s));
      g.fillStyle = '#ff5a2a'; g.fillRect(x - w, y - h + 2, w * 2 + 1, h - 1);
      g.fillStyle = '#ffb040'; g.fillRect(x - w + 1, y - h + 1, w * 2 - 1, h - 2);
      g.fillStyle = '#fff3b0'; g.fillRect(x, y - Math.round(h * 0.6), 1, Math.round(h * 0.5));
      if (Math.sin(t * 1.7) > 0.3) { g.fillStyle = '#ffb040'; g.fillRect(x + (Math.sin(t) > 0 ? 1 : -1), y - h - 1, 1, 1); }
    }

    drawPortal(g, x, y) {
      const t = this.time;
      const pulse = this.gatePulse > 0 ? 1 : 0.6 + 0.2 * Math.sin(t * 2);
      for (let r = 14; r > 0; r -= 2) {
        const k = r / 14;
        g.fillStyle = `rgba(${Math.round(255 - 40 * k)},${Math.round(240 - 60 * k)},${Math.round(180 - 80 * k)},${(1 - k * 0.7) * pulse})`;
        const yy = y - 24;
        for (let a = 0; a < 24; a++) {
          const ang = a / 24 * Math.PI * 2 + t * (1.5 - k);
          g.fillRect(Math.round(x + Math.cos(ang) * r * 0.9), Math.round(yy + Math.sin(ang) * r * 1.1), 2, 2);
        }
      }
    }

    drawHero(g, cx, cy) {
      const h = this.hero;
      if (h.hidden || h.scale <= 0) return;
      const x = Math.round(h.x - cx), y = Math.round(h.y - cy);
      g.fillStyle = 'rgba(20,12,30,0.45)';
      g.fillRect(x - 5, y - 1, 10, 3); g.fillRect(x - 4, y - 2, 8, 5);
      // fuoco fatuo compagno
      const wx = Math.round(this.wisp.x - cx), wy = Math.round(this.wisp.y - cy);
      g.fillStyle = '#9ae8ff'; g.fillRect(wx - 1, wy - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(wx, wy, 1, 1);
      g.fillStyle = 'rgba(154,232,255,0.5)'; g.fillRect(wx - Math.round((this.wisp.x - h.x) / 10) - 1, wy + 2, 2, 2);

      const step = h.moving && Math.floor(h.walk * 9) % 2 === 1;
      let img = Sprites.get(step ? 'hero:step' : 'hero:idle');
      if (h.flash > 0 && Math.floor(h.flash * 16) % 2 === 0) img = Sprites.tinted(step ? 'hero:step' : 'hero:idle', h.flashCol);
      const bob = !h.moving && !h.dead ? Math.round(Math.sin(this.time * 3) * 0.5 + 0.5) : step ? -1 : 0;
      g.save();
      g.translate(x, y);
      if (h.dead > 0) { g.rotate((-Math.PI / 2) * ease(h.dead) * h.dir); g.globalAlpha = 1; }
      if (h.scale < 1) g.scale(h.scale, h.scale);
      g.scale(h.dir, 1);
      g.drawImage(img, -8, -15 + bob);
      g.restore();
    }

    drawEntity(g, e, cx, cy) {
      const age = this.time - e.born;
      const pop = age < 0.35 ? ease(age / 0.35) : 1;
      const x = Math.round(e.x - cx - e.lunge * 8), y = Math.round(e.y - cy);
      const w = e.img.width, h = e.img.height;
      g.globalAlpha = clamp(e.alpha, 0, 1);
      g.fillStyle = 'rgba(20,12,30,0.45)'; g.fillRect(x - w / 2 + 1, y - 1, w - 2, 3);
      const sy = pop * (1 + (age < 0.5 ? Math.sin(age * 20) * 0.15 * (1 - age * 2) : 0));
      const hover = /ghost|banshee|bat/.test(e.name) ? Math.round(Math.sin(this.time * 3) * 2) - 6 : 0;
      g.save();
      g.translate(x, y + hover);
      g.scale(-1, Math.max(0.01, sy));
      g.drawImage(e.img, -Math.floor(w / 2), -h);
      g.restore();
      if (e.state === 'show' && age > 0.3) {
        const bx = x - 2, by = y - h - 10 + hover + Math.round(Math.sin(this.time * 4));
        g.fillStyle = K; g.fillRect(bx - 1, by - 1, 7, 9);
        g.fillStyle = e.monster ? '#ff5a5a' : '#f2c14e'; g.fillRect(bx, by, 5, 7);
        Sprites.drawText(g, '!', bx + 1, by + 1, K);
      }
      g.globalAlpha = 1;
    }

    drawLighting(cx, cy) {
      const lg = this.lg, t = this.time;
      // ambiente: mescola i colori delle zone in base alla posizione della telecamera
      const x0 = this.cells[0].tx, x1 = this.cells[this.cells.length - 1].tx;
      const pos = clamp(((cx + VW / 2) / T - x0) / (x1 - x0 + 1) * 4 - 0.5, 0, 3);
      const i0 = Math.floor(pos), i1 = Math.min(3, i0 + 1);
      const amb = mix(BIOMES[i0].ambientC, BIOMES[i1].ambientC, pos - i0);
      lg.globalCompositeOperation = 'source-over';
      lg.fillStyle = toHex(amb);
      lg.fillRect(0, 0, VW, VH);
      lg.globalCompositeOperation = 'lighter';
      const glows = [];
      const drawL = (x, y, r, col, a) => {
        const gr = lg.createRadialGradient(x, y, 0, x, y, r);
        const c = rgb(col);
        gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
        gr.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.35})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        lg.fillStyle = gr;
        lg.fillRect(x - r, y - r, r * 2, r * 2);
      };
      for (const L of this.lights) {
        const x = L.x - cx, y = L.y - cy;
        if (x < -L.r || x > VW + L.r || y < -L.r || y > VH + L.r) continue;
        if (L.cell !== undefined && this.cellState[L.cell] === 'current') continue;
        let f = 1 - L.f * (0.5 + 0.5 * Math.sin(t * 9 + L.x) * Math.sin(t * 5.3 + L.y));
        if (L.neon && Math.sin(t * 13 + L.x) > 0.97) f *= 0.3;
        let r = L.r;
        if (L.gate) r *= this.gatePulse > 0 ? 2.2 : 1 + 0.08 * Math.sin(t * 2);
        drawL(x, y, r * (0.95 + 0.05 * f), L.col, 0.85 * f);
        if (L.r > 24) glows.push([x, y, L.col, f]);
      }
      // luce dell'eroe e del fuoco fatuo
      drawL(this.hero.x - cx, this.hero.y - cy - 8, 56, '#ffe0b0', 0.55);
      drawL(this.wisp.x - cx, this.wisp.y - cy, 34, '#9ae8ff', 0.7);
      lg.globalCompositeOperation = 'source-over';

      const g = this.g;
      g.globalCompositeOperation = 'multiply';
      g.drawImage(this.light, 0, 0);
      // leggero bagliore additivo attorno alle fonti
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, col, f] of glows) {
        const c = rgb(col);
        const gr = g.createRadialGradient(x, y, 0, x, y, 18);
        gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.22 * f})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - 18, y - 18, 36, 36);
      }
      g.globalCompositeOperation = 'source-over';
    }

    drawDice(g) {
      const d = this.dice;
      const k = clamp(d.t / 1.0, 0, 1);
      const x = lerp(VW * 0.18, VW * 0.5, ease(k));
      const bounce = Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * 46;
      const y = VH * 0.36 - bounce;
      const fadeA = d.t > 1.75 ? clamp(1 - (d.t - 1.75) / 0.35, 0, 1) : 1;
      g.globalAlpha = fadeA;
      g.fillStyle = 'rgba(10,6,20,0.45)';
      const sw = Math.round(20 - bounce * 0.2);
      g.fillRect(Math.round(x - sw / 2), Math.round(VH * 0.36 + 30), sw, 3);
      drawDie(g, x, y, d.faces[0], d.faces[1], d.faces[2]);
      if (d.landed) {
        const s = clamp((d.t - 1.0) / 0.2, 0, 1);
        const txt = String(d.value);
        const sc = s < 1 ? 4 : 3;
        Sprites.drawText(g, txt, Math.round(x - Sprites.textWidth(txt, sc) / 2), Math.round(VH * 0.36 + 38), '#fff3b0', sc, K);
      }
      g.globalAlpha = 1;
    }

    drawHud(g) {
      // pannello in alto a sinistra: ritratto, cuori, avanzamento
      const px = 4, py = 4;
      g.fillStyle = K; g.fillRect(px, py, 122, 32);
      g.fillStyle = '#2a2148'; g.fillRect(px + 1, py + 1, 120, 30);
      g.fillStyle = '#6a5ab0'; g.fillRect(px + 1, py + 1, 120, 1);
      g.fillStyle = K; g.fillRect(px + 3, py + 3, 26, 26);
      g.fillStyle = '#4a3f80'; g.fillRect(px + 4, py + 4, 24, 24);
      g.fillStyle = '#5f54a0'; g.fillRect(px + 4, py + 4, 24, 8);
      const hero = Sprites.get('hero:idle');
      g.drawImage(hero, 0, 0, 16, 12, px + 8, py + 9, 16, 12);
      g.drawImage(hero, 2, 12, 12, 7, px + 10, py + 21, 12, 7);
      // cuori: 1 cuore = 2 HP
      const hearts = Math.ceil(this.maxHp / 2);
      for (let i = 0; i < hearts; i++) {
        const v = this.hp - i * 2;
        const img = Sprites.get(v >= 2 ? 'heart' : v === 1 ? 'heart:half' : 'heart:empty');
        const low = this.hp <= 3 && v > 0 ? Math.round(Math.sin(this.time * 10) * 0.6) : 0;
        g.drawImage(img, px + 33 + i * 10, py + 4 + low);
      }
      Sprites.drawText(g, this.hp + '/' + this.maxHp, px + 86, py + 6, '#ffd0d6', 1, K);
      // barra percorso
      const cur = Math.max(0, this.cellTile.findIndex((ti) => ti >= this.heroTile));
      const tot = this.cells.length - 1;
      g.drawImage(Sprites.get('flag'), px + 33, py + 18);
      g.fillStyle = K; g.fillRect(px + 42, py + 20, 56, 6);
      g.fillStyle = '#3a3060'; g.fillRect(px + 43, py + 21, 54, 4);
      const w = Math.round((54 * cur) / tot);
      g.fillStyle = '#f2a03a'; g.fillRect(px + 43, py + 21, w, 4);
      g.fillStyle = '#ffd070'; g.fillRect(px + 43, py + 21, w, 1);
      Sprites.drawText(g, cur + '/' + tot, px + 101, py + 20, '#fff3b0', 1, K);

      // minimappa in alto a destra
      const mw = 96, mh = 34, mx = VW - mw - 4, my = 4;
      g.fillStyle = K; g.fillRect(mx, my, mw, mh);
      g.fillStyle = '#2a2148'; g.fillRect(mx + 1, my + 1, mw - 2, mh - 2);
      g.fillStyle = '#6a5ab0'; g.fillRect(mx + 1, my + 1, mw - 2, 1);
      const s = Math.min((mw - 6) / this.W, (mh - 6) / (this.H - 4));
      const ox = mx + 3 + Math.round((mw - 6 - this.W * s) / 2), oy = my + 3 - 2 * s;
      g.globalAlpha = 0.9;
      g.drawImage(this.minimap, 0, 2, this.W, this.H - 4, ox, oy + 2 * s, this.W * s, (this.H - 4) * s);
      g.globalAlpha = 1;
      this.cells.forEach((c, i) => {
        const st = this.cellState[i];
        if (st === 'new' || i === 0) return;
        g.fillStyle = st === 'good' ? '#5aff8a' : st === 'bad' ? '#ff5a5a' : st === 'current' ? '#f2c14e' : '#c8c0e0';
        g.fillRect(Math.round(ox + c.tx * s), Math.round(oy + c.ty * s), 1, 1);
      });
      const e = this.cells[this.cells.length - 1];
      g.fillStyle = '#fff3b0'; g.fillRect(Math.round(ox + e.tx * s) - 1, Math.round(oy + e.ty * s) - 1, 3, 3);
      if (Math.floor(this.time * 3) % 2 === 0) {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(ox + (this.hero.x / T) * s) - 1, Math.round(oy + (this.hero.y / T) * s) - 1, 3, 3);
      }
      // riquadro della vista
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
      g.strokeRect(Math.round(ox + (this.cam.x / T) * s) + 0.5, Math.round(oy + (this.cam.y / T) * s) + 0.5, Math.round((VW / T) * s), Math.round((VH / T) * s));
    }
  }

  World.VW = VW;
  World.VH = VH;
  World.BIOMES = BIOMES;
  window.RMD.World = World;
})();
