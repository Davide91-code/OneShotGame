/*
 * sprites.js — tutta la pixel art, disegnata da codice (nessuna immagine esterna).
 * Ogni sprite è un array di stringhe: ogni carattere è un pixel, il colore viene da PAL.
 * '.' = trasparente. Per modificare un personaggio basta cambiare le lettere.
 */
(function () {
  'use strict';

  const PAL = {
    k: '#1b1824', // contorno
    s: '#f0bf94', S: '#c98f69', // pelle
    h: '#7a4a2a', H: '#5a341c', // capelli
    e: '#1b1824', // occhio
    c: '#3b6fd1', C: '#2a4f9b', // tunica
    b: '#7a5230', B: '#5c3b20', // cuoio / legno
    y: '#f2c94c', Y: '#ffe680', // oro
    p: '#6b4f35', P: '#523b27', // pantaloni
    o: '#3d2b1f', // stivali
    w: '#ebe6da', W: '#9aa1b0', // bianco / metallo
    r: '#c4323a', R: '#ff5a4e', // rosso
    m: '#7d5a3c', M: '#5e4029', // mantello marrone
    v: '#6a3fa0', V: '#4b2a78', // viola
    G: '#a8a6b5', g: '#858396', // pietra chiara
    Q: '#9be7ff', q: '#4fb6e0', // cristallo
    f: '#ffb43a', F: '#ffe98a', // fiamma
    n: '#2fbf71', N: '#1f8a52', // verde
  };

  function build(rows, overrides) {
    const pal = overrides ? Object.assign({}, PAL, overrides) : PAL;
    const w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        const col = pal[row[i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, y, 1, 1);
      }
    });
    return c;
  }

  // Copia dello sprite riempita di un colore (lampeggio quando si subisce danno)
  function tint(sprite, color) {
    const c = document.createElement('canvas');
    c.width = sprite.width; c.height = sprite.height;
    const x = c.getContext('2d');
    x.drawImage(sprite, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------- EROE (12x20) ----------
  const HERO_TOP = [
    '....kkkkk...',
    '...khhhhhk..',
    '..khhhhhhhk.',
    '..khhhhsssk.',
    '..khhssssssk',
    '..khsssssesk',
    '..khsssssssk',
    '...khSsssSk.',
    '....kksssk..',
    '...kccccccck',
    '..kcccccccck',
    '..kcCccccCck',
    '..kcCccccsk.',
    '..kbbbbybbk.',
  ];
  const LEGS_IDLE = [
    '...kpppppk..',
    '...kpPkPpk..',
    '...kpPkPpk..',
    '...kpPkPpk..',
    '...kook.kook',
    '...kkk..kkk.',
  ];
  const LEGS_STRIDE = [
    '...kpppppk..',
    '..kpPk.kPpk.',
    '.kpPk...kPpk',
    '.kook....kook',
    '.kkk.....kkk',
    '............',
  ];
  const LEGS_PASS = [
    '...kpppppk..',
    '....kpPpk...',
    '....kpPpk...',
    '....kpPpk...',
    '....koook...',
    '....kkkkk...',
  ];

  const hero = {
    idle: build(HERO_TOP.concat(LEGS_IDLE)),
    walk: [build(HERO_TOP.concat(LEGS_STRIDE)), build(HERO_TOP.concat(LEGS_PASS))],
  };
  hero.hurt = tint(hero.idle, 'rgba(255,70,70,0.75)');
  hero.heal = tint(hero.idle, 'rgba(120,255,140,0.6)');

  // ---------- EVENTI ----------
  const traveler = build([
    '....kkkk....',
    '...kwwwwk...',
    '..kwrwwwwk..',
    '..kssssssk..',
    '..ksessssk..',
    '...kSsssk...',
    '..kmmmmmmk..',
    '.kmMmmmmMmk.',
    '.kmMmmmsmMk.',
    'kmMmmmmmmmMk',
    'kmmmmmmmmmmk',
    'kMmmmmmmmmMk',
    '.kkkkkkkkkk.',
  ]);

  const creatureRows = [
    '.....kk.....',
    '....kvvk....',
    '...kvvvvk...',
    '..kvvvvvvk..',
    '..kvkkkkvk..',
    '.kvkYkkYkvk.',
    '.kvkkkkkkvk.',
    '.kvvkkkkvvk.',
    '.kvVvvvvVvk.',
    'kvVvvQQvvVvk',
    'kvVvvQQvvVvk',
    'kvvvvvvvvvvk',
    'kvVvvvvvvVvk',
    'kkkkkkkkkkkk',
  ];
  const creature = {
    idle: build(creatureRows),
    good: build(creatureRows, { Y: '#7dffb0', Q: '#7dffb0' }),
    bad: build(creatureRows, { Y: '#ff3b3b', Q: '#ff3b3b' }),
  };

  const altarRows = [
    '.......kk.......',
    '......kQQk......',
    '.....kQqQqk.....',
    '.....kqQqQk.....',
    '......kqqk......',
    '..kkkkkkkkkkkk..',
    '..kGGGGGGGGGGk..',
    '..kggggggggggk..',
    '...kgGggggGgk...',
    '...kgGggggGgk...',
    '..kggggggggggk..',
    '..kkkkkkkkkkkk..',
  ];
  const altar = {
    idle: build(altarRows),
    good: build(altarRows, { Q: '#fff3a0', q: '#f2c94c' }),
    bad: build(altarRows, { Q: '#ff8a80', q: '#b3202a' }),
  };

  const chest = {
    idle: build([
      '..kkkkkkkkkk..',
      '.kbbbbbbbbbbk.',
      'kbWbbbbbbbbWbk',
      'kbWbbbbbbbbWbk',
      'kkkkkkyykkkkkk',
      'kBWBBByyBBBWBk',
      'kbWbbbbbbbbWbk',
      'kbWbbbbbbbbWbk',
      'kBWBBBBBBBBWBk',
      'kkkkkkkkkkkkkk',
    ]),
    good: build([
      '..kkkkkkkkkk..',
      '.kbbbbbbbbbbk.',
      'kbWbbbbbbbbWbk',
      'kkkkkkkkkkkkkk',
      'kYyYyrYyYyQyYk',
      'kkkkkkkkkkkkkk',
      'kBWBBByyBBBWBk',
      'kbWbbbbbbbbWbk',
      'kbWbbbbbbbbWbk',
      'kBWBBBBBBBBWBk',
      'kkkkkkkkkkkkkk',
    ]),
    bad: build([
      '..kkkkkkkkkk..',
      '.kbbRbbbbRbbk.',
      'kbWbbbbbbbbWbk',
      'kwkwkwkwkwkwkk',
      'krrrrrrrrrrrrk',
      'kkwkwkwkwkwkwk',
      'kBWBBBBBBBBWBk',
      'kbWbbbbbbbbWbk',
      'kBWBBBBBBBBWBk',
      'kkkkkkkkkkkkkk',
    ]),
  };

  const trap = {
    idle: build([
      '............',
      '............',
      '............',
      '............',
      '.kkkkkkkkkk.',
      'kWWWWWWWWWWk',
    ]),
    good: build([
      '............',
      '............',
      '............',
      '............',
      '.kkkkkkkkkk.',
      'kWWWWWWWWWWk',
    ]),
    bad: build([
      '.w..w..w..w.',
      'kWk.kWk.kWk.',
      'kWkkkWkkkWk.',
      'kWWkWWWkWWk.',
      '.kkkkkkkkkk.',
      'kWWWWWWWWWWk',
    ]),
  };

  const mystery = build([
    '...kkkk...',
    '..kggggk..',
    '.kgQQQQgk.',
    '.kgggqQgk.',
    '.kggqQggk.',
    '.kggQqggk.',
    '.kgggggk..',
    '.kggQqggk.',
    '.kggggggk.',
    'kggggggggk',
    'kGGGGGGGGk',
    'kkkkkkkkkk',
  ]);

  // ---------- DECORAZIONI ----------
  const torch = [
    build(['.F.', 'fFf', 'fFf', '.f.', '.b.', '.b.', '.B.', '.B.']),
    build(['F..', 'fF.', 'fFf', '.f.', '.b.', '.b.', '.B.', '.B.']),
  ];

  const campfire = [
    build(['.....F........', '....fF.f......', '...fFFfFf.....', '...ffFFFff....', '..fFFYYFFf....', '.kbbbbbbbbbbk.', 'kBbbBbbbBbbBk.', '.kkkkkkkkkkk..']),
    build(['......F.......', '..f..FFf......', '...fFFFff.....', '..ffFFYFf.....', '..fFFYYFFf....', '.kbbbbbbbbbbk.', 'kBbbBbbbBbbBk.', '.kkkkkkkkkkk..']),
    build(['....F...f.....', '....fF.Ff.....', '...fFFfFf.....', '...ffFYFff....', '..fFYYYFFf....', '.kbbbbbbbbbbk.', 'kBbbBbbbBbbBk.', '.kkkkkkkkkkk..']),
  ];

  const sign = build([
    'kkkkkkkkkkk',
    'kbbbbbbbbbk',
    'kbbbbbbbbbk',
    'kbbbbbbbbbk',
    'kbbbbbbbbbk',
    'kbbbbbbbbbk',
    'kBBBBBBBBBk',
    'kkkkkbkkkkk',
    '....kbk....',
    '....kBk....',
    '....kBk....',
  ]);

  const flag = [
    build(['kk........', 'krrrrrk...', 'krRRrrrk..', 'krrrrrrrk.', 'krRrrrrk..', 'krrrrk....', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........']),
    build(['kk........', 'krrrrk....', 'krRrrrrk..', 'krrrrrrrrk', 'krRrrrrk..', 'krrrk.....', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........', 'kk........']),
  ];

  const tombstone = build([
    '...kkkk...',
    '..kGGGGk..',
    '.kGGkGGgk.',
    '.kGkkkGgk.',
    '.kGGkGGgk.',
    '.kGGkGGgk.',
    '.kGGGGGgk.',
    '.kGGGGGgk.',
    '.kggggggk.',
    'kkkkkkkkkk',
  ]);

  const mushroom = build(['.kQQk.', 'kQqQQk', 'kkkkkk', '..kwk.', '..kwk.']);

  const heart = {
    full: build(['.kk.kk.', 'kRrkrrk', 'krrrrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...']),
    empty: build(['.kk.kk.', 'k..k..k', 'k.....k', 'k.....k', '.k...k.', '..k.k..', '...k...'], {}),
  };
  // riempie l'interno del cuore vuoto di grigio scuro
  (function () {
    const x = heart.empty.getContext('2d');
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = '#3a3546';
    x.fillRect(1, 1, 5, 3); x.fillRect(2, 4, 3, 1); x.fillRect(3, 5, 1, 1);
  })();

  // ---------- DADO (11x11, disegnato a pip) ----------
  const PIPS = {
    1: [[5, 5]],
    2: [[3, 3], [7, 7]],
    3: [[3, 3], [5, 5], [7, 7]],
    4: [[3, 3], [7, 3], [3, 7], [7, 7]],
    5: [[3, 3], [7, 3], [5, 5], [3, 7], [7, 7]],
    6: [[3, 3], [7, 3], [3, 5], [7, 5], [3, 7], [7, 7]],
  };
  const dice = {};
  for (let n = 1; n <= 6; n++) {
    const c = document.createElement('canvas');
    c.width = 11; c.height = 11;
    const x = c.getContext('2d');
    x.fillStyle = PAL.k; x.fillRect(1, 0, 9, 11); x.fillRect(0, 1, 11, 9);
    x.fillStyle = '#f4efe4'; x.fillRect(1, 1, 9, 9);
    x.fillStyle = '#cfc8b8'; x.fillRect(1, 9, 9, 1); x.fillRect(9, 1, 1, 9);
    x.fillStyle = n === 1 ? PAL.r : PAL.k;
    PIPS[n].forEach(([px, py]) => x.fillRect(px, py, 1, 1));
    dice[n] = c;
  }

  // ---------- FONT PIXEL 3x5 ----------
  const GLYPHS = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
    '/': '001001010100100', '?': '111001011000010', ' ': '000000000000000',
  };

  function textWidth(str) { return str.length * 4 - 1; }

  function drawText(ctx, str, x, y, color, outline) {
    x = Math.round(x); y = Math.round(y);
    const pass = (col, ox, oy) => {
      ctx.fillStyle = col;
      for (let i = 0; i < str.length; i++) {
        const g = GLYPHS[str[i]];
        if (!g) continue;
        for (let p = 0; p < 15; p++) if (g[p] === '1') ctx.fillRect(x + i * 4 + (p % 3) + ox, y + ((p / 3) | 0) + oy, 1, 1);
      }
    };
    if (outline) { pass(outline, -1, 0); pass(outline, 1, 0); pass(outline, 0, -1); pass(outline, 0, 1); }
    pass(color, 0, 0);
  }

  window.OSG = window.OSG || {};
  window.OSG.Sprites = {
    PAL, build, tint, hero, traveler, creature, altar, chest, trap, mystery,
    torch, campfire, sign, flag, tombstone, mushroom, heart, dice, drawText, textWidth,
  };
})();
