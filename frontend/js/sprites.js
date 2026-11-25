/*
 * sprites.js — pixel art del gioco, disegnata a mano come griglie di caratteri.
 * Ogni carattere è un colore della palette dello sprite; '.' è trasparente.
 * Gli sprite vengono convertiti in <canvas> una sola volta (cache).
 */
(function () {
  'use strict';

  const K = '#1b1626'; // contorno scuro comune a tutti gli sprite

  // ---------------------------------------------------------------- EROE
  const HERO_TOP = [
    '................',
    '......kkkkk.....',
    '.....khhhhhk....',
    '....khhhhhhhk...',
    '....khhhhsssk...',
    '...kbkhhssksk...',
    '..kbbkhsssssk...',
    '..kbbkkSssSk....',
    '..kbbkcccccck...',
    '..kBbkttcttTk...',
    '..kBBkttttTsk...',
    '...kkkttttTk....',
    '....kTttttTk....',
  ];
  const LEGS_IDLE = ['....kppkkppk....', '....kook.kook...', '....kkk..kkk....'];
  const LEGS_STEP = ['...kppk..kppk...', '..kook....kook..', '..kkk......kkk..'];
  const HERO_PAL = {
    k: K, h: '#6b3e2e', s: '#f2c29b', S: '#d89a74', c: '#d8423e', t: '#2f8f83', T: '#1f6159',
    b: '#a0643a', B: '#6e4128', p: '#3a3a5a', o: '#5a3424',
  };

  // ---------------------------------------------------------------- PNG (personaggi)
  const NPC_BODY = [
    '....kskssksk....',
    '....kssssssk....',
    '.....kSSSSk.....',
    '....kaaaaaak....',
    '...krraaaarrk...',
    '...ksrrrrrRsk...',
    '...kkrrrrrRkk...',
    '....krrrrrRk....',
    '....kRRkkRRk....',
    '....kbbk.kbbk...',
  ];
  const NPC_HAIR = ['......kkkk......', '.....khhhhk.....', '....khhhhhhk....', '....khsssshk....'];
  const NPC_HOOD = ['......kkkk......', '.....krrrrk.....', '....krrrrrrk....', '....krssssrk....'];
  const NPC_HAT = [
    '.......kk.......',
    '......kaak......',
    '.....krrrrk.....',
    '....krrrrrrk....',
    '..kkrrrrrrrrkk..',
    '.krrrrrrrrrrrrk.',
    '....khsssshk....',
  ];
  const NPC_LONG = ['......kkkk......', '.....khhhhk.....', '....khhhhhhk....', '...khhsssshhk...'];
  const npcBody = (top) => top.concat(NPC_BODY);

  const NPC_PALS = {
    traveler: { h: '#5a3a26', r: '#7a5a3a', R: '#56402a', a: '#c9a15a', b: '#3e2a1e' },
    alchemist: { h: '#d9d2c5', r: '#6b4fa0', R: '#4a3577', a: '#5ad1c9', b: '#2e2448' },
    merchant: { h: '#3b2a20', r: '#d0812f', R: '#9c5a1d', a: '#f2d36b', b: '#4a2f1c' },
    woman: { h: '#c94f7c', r: '#e07fa0', R: '#b0587a', a: '#f5e0a0', b: '#5a2a3a' },
    smith: { h: '#2b211c', r: '#6d6f7a', R: '#4a4b55', a: '#3b3b44', b: '#2a2a30' },
    druid: { h: '#4a8a3e', r: '#4a8a3e', R: '#2f5e28', a: '#a7d36b', b: '#3a2a1e' },
    cleric: { h: '#e9e4d6', r: '#e9e4d6', R: '#b9b2a0', a: '#e0b53c', b: '#6b5a3a' },
    thief: { h: '#3a3550', r: '#3a3550', R: '#26223a', a: '#7b2d3a', b: '#1e1a2a' },
    wizard: { h: '#d9d2c5', r: '#3d5bb0', R: '#283e80', a: '#f2d36b', b: '#22284a' },
  };
  const NPC_SHAPE = {
    traveler: NPC_HAIR, alchemist: NPC_HAIR, merchant: NPC_HAIR, woman: NPC_LONG, smith: NPC_HAIR,
    druid: NPC_HOOD, cleric: NPC_HOOD, thief: NPC_HOOD, wizard: NPC_HAT,
  };

  // ---------------------------------------------------------------- OGGETTI E MOSTRI
  const DEFS = {
    chest: {
      rows: [
        '...kkkkkkkkkk...',
        '..kwwwwwwwwwwk..',
        '..kwWwwwwwwWwk..',
        '..kggggkkggggk..',
        '..kWWWkyykWWWk..',
        '..kwwwkyykwwwk..',
        '..kwWwwkkwwWwk..',
        '..kwwwwwwwwwwk..',
        '..kWWWWWWWWWWk..',
        '...kkkkkkkkkk...',
      ],
      pal: { w: '#b8743a', W: '#7d4a24', g: '#f2c14e', y: '#fff3b0' },
    },
    crate: {
      rows: [
        'kkkkkkkkkkkk',
        'kwwwwwwwwwwk',
        'kwWwwwwwwWwk',
        'kwwWwwwwWwwk',
        'kwwwWwwWwwwk',
        'kwwwwWWwwwwk',
        'kwwwwWWwwwwk',
        'kwwwWwwWwwwk',
        'kwwWwwwwWwwk',
        'kwWwwwwwwWwk',
        'kWWWWWWWWWWk',
        'kkkkkkkkkkkk',
      ],
      pal: { w: '#c98d4a', W: '#87562a' },
    },
    altar: {
      rows: [
        '.....kk.....',
        '....kggk....',
        '....kgGk....',
        '.....kk.....',
        '..kkkkkkkk..',
        '.kssssssssk.',
        '.kSSSSSSSSk.',
        '..ksSssSsk..',
        '..kssrrssk..',
        '..ksrssrsk..',
        '..kssrrssk..',
        '.kssssssssk.',
        'kSSSSSSSSSSk',
        'kkkkkkkkkkkk',
      ],
      pal: { s: '#b9b3c9', S: '#7f7895', r: '#5ad1c9', g: '#b8fff6', G: '#5ad1c9' },
    },
    statue: {
      rows: [
        '...kkkk...',
        '..kssssk..',
        '..kskksk..',
        '..kssssk..',
        '...kSSk...',
        '.kksssskk.',
        'kssssssssk',
        'kskssssksk',
        'kskssssksk',
        'kkksyyskkk',
        '.kssssssk.',
        '.ksSssSsk.',
        '.kssssssk.',
        'kkkkkkkkkk',
        'kSSSSSSSSk',
        'kkkkkkkkkk',
      ],
      pal: { s: '#a9b4a0', S: '#6f7a68', y: '#f2c14e' },
    },
    lamp: {
      rows: [
        '....kkk.......',
        '...kgyk.......',
        '..kkkkkk......',
        '.kggggggk..kkk',
        'kgyggggggkkggk',
        'kggggggggggk..',
        '.kGGGGGGGk....',
        '..kkkkkkk.....',
      ],
      pal: { g: '#e0b53c', G: '#9c7420', y: '#fff3b0' },
    },
    levers: {
      rows: [
        '.kk....kk....kk.',
        'krrk..kggk..kbbk',
        '.kk....kk....kk.',
        '..k....k.....k..',
        '..k.....k...k...',
        '..k.....k..k....',
        'kkkkkkkkkkkkkkkk',
        'kmmmmmmmmmmmmmmk',
        'kmkkmmmkkmmmkkmk',
        'kmmmmmmmmmmmmmmk',
        'kMMMMMMMMMMMMMMk',
        'kkkkkkkkkkkkkkkk',
      ],
      pal: { r: '#e04848', g: '#5ccf6a', b: '#4f8ae0', m: '#8a8fa3', M: '#5a5e70' },
    },
    mushrooms: {
      rows: [
        '...kkk........',
        '..kmmmk...kkk.',
        '.kmwmmmk.kmmmk',
        '.kmmmwmk.kmwmk',
        '..kkkkk...kkk.',
        '...ksk.....ksk',
        '...ksk.kk..ksk',
        '...ksk.kmk.ksk',
        '..kkkkkkkkkkkk',
      ],
      pal: { m: '#5af0d0', w: '#e8fff9', s: '#d8d0e8' },
    },
    rubble: {
      rows: [
        '......kkk.......',
        '.....kssSk......',
        '..kkkssssSk.kk..',
        '.kssSkSSSkkkssk.',
        'kssssSkkkssssSSk',
        'kSssSSSkssSsSSSk',
        'kkSSSkkSSSSSSkkk',
        '.kkkkkkkkkkkkkk.',
      ],
      pal: { s: '#a39a8f', S: '#6e665e' },
    },
    spikes: {
      rows: [
        '..k...k...k...k.',
        '.kwk.kwk.kwk.kwk',
        '.kwk.kwk.kwk.kwk',
        'kwSwkwSwkwSwkwSk',
        'kkkkkkkkkkkkkkkk',
        'kmmmmmmmmmmmmmmk',
        'kMMMMMMMMMMMMMMk',
        'kkkkkkkkkkkkkkkk',
      ],
      pal: { w: '#e6e6f0', S: '#9a9ab0', m: '#6e5a4a', M: '#4a3a30' },
    },
    minecart: {
      rows: [
        '...kkk...kkk....',
        '..kyyyk.kooOk...',
        '.kkkkkkkkkkkkkk.',
        '.kmmmmmmmmmmmmk.',
        '.kmMmmmmmmmmMmk.',
        '.kmmmmmmmmmmmmk.',
        '..kMMMMMMMMMMk..',
        '..kkkkkkkkkkkk..',
        '...kwk....kwk...',
        '...kkk....kkk...',
      ],
      pal: { y: '#f2c14e', o: '#8fd3ff', O: '#4f8ae0', m: '#8a6a4a', M: '#5a4030', w: '#9a9ab0' },
    },
    bones: {
      rows: [
        '..kkkk..........',
        '.kwwwwk...kkkk..',
        '.kwkwkk..kbbbbk.',
        '.kwwwwk..kbyybk.',
        '..kwwwk..kbbbbk.',
        'kk.kkk...kkkkk..',
        'kwkkkkkkkwk.....',
        'kk.......kk.....',
      ],
      pal: { w: '#ece6d6', b: '#8a6a4a', y: '#f2c14e' },
    },
    bridge: {
      rows: [
        'k..............k',
        'kk............kk',
        'k.kk........kk.k',
        'k...kkkkkkkk...k',
        'kwwkwwkwwkwwkwwk',
        'kWWkWWkWWkWWkWWk',
        'kkkkkkkkkkkkkkkk',
        '.k.k..k..k..k.k.',
      ],
      pal: { w: '#c98d4a', W: '#87562a' },
    },
    goblin: {
      rows: [
        '....kkkkkk....',
        'kk.kggggggk.kk',
        'kgkggrggrggkgk',
        '..kgkwkwkgk...',
        '...kGGGGGk....',
        '..kgbbbbbgk...',
        '.kgkbbbbbkgk..',
        '.kgkbbbbbkgk..',
        '..kkBBBBBkk...',
        '...kgk.kgk....',
        '..kggk.kggk...',
        '..kkkk.kkkk...',
      ],
      pal: { g: '#7cbf4a', G: '#4f8a2e', r: '#ff4a4a', w: '#f4f1ea', b: '#8a5a32', B: '#5a3a20' },
    },
    skeleton: {
      rows: [
        '...kkkkk....',
        '..kwwwwwk...',
        '..kkkwkkk...',
        '..kwwkwwk...',
        '...kwkwk....',
        '....kkk.....',
        '..kkkwkkk...',
        '.kwkwwwkwk..',
        '.kwkkwkkwk..',
        '.kwkwwwkwk..',
        '..k.kwk.k...',
        '....kwk.....',
        '...kwkwk....',
        '...kwkwk....',
        '..kkk.kkk...',
      ],
      pal: { w: '#ece6d6' },
    },
    wolf: {
      rows: [
        '..k.k...........',
        '.kgkgk..........',
        '.kggggk.....kk..',
        'kgrgggkkkkkkkgk.',
        'kggggggggggggk..',
        '.kwkkggggggGGgk.',
        '..kkgggggggGGgk.',
        '...kgGk...kgGk..',
        '...kgk....kgk...',
        '...kkk....kkk...',
      ],
      pal: { g: '#8d8aa0', G: '#5f5c72', r: '#ff4a4a', w: '#f4f1ea' },
    },
    spider: {
      rows: [
        '.k....kkkk....k.',
        'k.k..kppppk..k.k',
        '...kkppppppkk...',
        '..k.kppppppk.k..',
        '.k..kprpprpk..k.',
        'k..kkppppppkk..k',
        '..k.kkppppkk.k..',
        '.k..k.kkkk.k..k.',
        'k..k........k..k',
      ],
      pal: { p: '#4a3a6a', r: '#ff4a4a' },
    },
    bat: {
      rows: [
        'k............k',
        'kk...k..k...kk',
        'kpk..kkkk..kpk',
        'kppkkppppkkppk',
        'kpppkprrpkpppk',
        '.kpkkppppkkpk.',
        '..k..kkkk..k..',
        '......kk......',
      ],
      pal: { p: '#5a4a7a', r: '#ff5a5a' },
    },
    ghost: {
      rows: [
        '...kkkkkk...',
        '..kwwwwwwk..',
        '.kwwwwwwwwk.',
        '.kwkkwwkkwk.',
        '.kwkkwwkkwk.',
        '.kwwwwwwwwk.',
        'kwwwwkkwwwwk',
        'kWwwwkkwwwWk',
        'kwwwwwwwwwwk',
        'kWwwwwwwwwWk',
        'kwwWwwwwWwwk',
        'kwkwwkkwwkwk',
        'kk.kk..kk.kk',
      ],
      pal: { w: '#d8f4ff', W: '#8fc4e0' },
    },
    banshee: {
      base: 'ghost',
      pal: { w: '#f0d0ff', W: '#b07ad8' },
    },
    creature: {
      rows: [
        '.....kkkk.....',
        '...kkppppkk...',
        '..kpwkpppppk..',
        '.kppkkpppwkpk.',
        '.kpppppppkkppk',
        'kppwkppppppppk',
        'kpppkkpppPPppk',
        'kPpppppPPPPPPk',
        '.kPPkPPPkPPPk.',
        '..kk.kkk.kkk..',
      ],
      pal: { p: '#b05ad8', P: '#7a3aa0', w: '#fff3b0' },
    },
    potion: {
      rows: [
        '...kkk...',
        '...kck...',
        '...kkk...',
        '..kgggk..',
        '.kgrrrgk.',
        'kgrrwrrgk',
        'kgrrrrrgk',
        'kgRrrrRgk',
        '.kgRRRgk.',
        '..kkkkk..',
      ],
      pal: { c: '#b8743a', g: '#d8f4ff', r: '#e04848', R: '#a02a3a', w: '#ffffff' },
    },
    heart: {
      rows: [
        '.kk...kk.',
        'krrk.krrk',
        'krwrkrrrk',
        'krrrrrrrk',
        '.krrrrrk.',
        '..krrrk..',
        '...krk...',
        '....k....',
      ],
      pal: { r: '#e8414f', w: '#ffd0d6' },
    },
    flag: {
      rows: ['kkkkk..', 'kyyyyk.', 'kyyyyyk', 'kyyyyk.', 'kkkkk..', 'k......', 'k......', 'k......'],
      pal: { y: '#f2c14e' },
    },
  };

  // ---------------------------------------------------------------- render su canvas
  const cache = new Map();

  function toCanvas(rows, pal) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const col = ch === 'k' ? K : pal[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function get(name) {
    if (cache.has(name)) return cache.get(name);
    let c;
    if (name.startsWith('npc:')) {
      const kind = name.slice(4);
      const pal = Object.assign({ s: '#f2c29b', S: '#d89a74' }, NPC_PALS[kind] || NPC_PALS.traveler);
      c = toCanvas(npcBody(NPC_SHAPE[kind] || NPC_HAIR), pal);
    } else if (name.startsWith('hero:')) {
      const frame = name.slice(5); // idle | step
      c = toCanvas(HERO_TOP.concat(frame === 'step' ? LEGS_STEP : LEGS_IDLE), HERO_PAL);
    } else if (name === 'heart:half' || name === 'heart:empty') {
      const d = DEFS.heart;
      const full = toCanvas(d.rows, d.pal);
      const empty = toCanvas(d.rows, { r: '#3a2f4f', w: '#4f4468' });
      c = document.createElement('canvas');
      c.width = full.width;
      c.height = full.height;
      const g = c.getContext('2d');
      g.drawImage(empty, 0, 0);
      if (name === 'heart:half') g.drawImage(full, 0, 0, 5, full.height, 0, 0, 5, full.height);
    } else {
      let d = DEFS[name];
      if (!d) return null;
      if (d.base) d = { rows: DEFS[d.base].rows, pal: d.pal };
      c = toCanvas(d.rows, d.pal);
    }
    cache.set(name, c);
    return c;
  }

  // Sprite bianco pieno (per i lampi di danno) generato da uno sprite esistente.
  function tinted(name, color) {
    const key = name + '#' + color;
    if (cache.has(key)) return cache.get(key);
    const src = get(name);
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    cache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------- font pixel 3x5
  const GLYPHS = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
    4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001111', '/': '001001010100100', '+': '000010111010000',
    '-': '000000111000000', H: '101101111101101', P: '110101110100100', ' ': '000000000000000',
    x: '000101010101000', '?': '111001011000010', '!': '010010010000010',
  };

  function drawText(g, text, x, y, color, scale, outline) {
    scale = scale || 1;
    const str = String(text);
    const paint = (ox, oy, col) => {
      g.fillStyle = col;
      for (let i = 0; i < str.length; i++) {
        const gl = GLYPHS[str[i]];
        if (!gl) continue;
        for (let p = 0; p < 15; p++) {
          if (gl[p] === '1') g.fillRect(x + ox + (i * 4 + (p % 3)) * scale, y + oy + Math.floor(p / 3) * scale, scale, scale);
        }
      }
    };
    if (outline) {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) paint(ox * scale, oy * scale, outline);
    }
    paint(0, 0, color);
  }
  const textWidth = (text, scale) => (String(text).length * 4 - 1) * (scale || 1);

  // ---------------------------------------------------------------- eventi del backend
  // Il backend restituisce solo la descrizione testuale: riconosciamo l'evento da parole chiave
  // (corrispondono ai testi di CellFactory).
  const EVENTS = [
    { re: /viandante/i, sprite: 'npc:traveler', title: 'Viandante ferito' },
    { re: /forziere/i, sprite: 'chest', title: 'Forziere malandato' },
    { re: /creatura/i, sprite: 'creature', title: 'Creatura misteriosa' },
    { re: /altare/i, sprite: 'altar', title: 'Antico altare' },
    { re: /trappola/i, sprite: 'spikes', title: 'Trappola!' },
    { re: /alchimista/i, sprite: 'npc:alchemist', title: 'Alchimista' },
    { re: /mercante/i, sprite: 'npc:merchant', title: 'Mercante di mappe' },
    { re: /goblin/i, sprite: 'goblin', title: 'Goblin' },
    { re: /ferro da stiro/i, sprite: 'npc:woman', title: 'Strana coppia' },
    { re: /scheletro/i, sprite: 'skeleton', title: 'Scheletro guardiano' },
    { re: /cassa/i, sprite: 'crate', title: 'Cassa caduta' },
    { re: /lupo/i, sprite: 'wolf', title: "Lupo nell'ombra" },
    { re: /fabbro/i, sprite: 'npc:smith', title: 'Fabbro' },
    { re: /funghi/i, sprite: 'mushrooms', title: 'Funghi luminescenti' },
    { re: /fantasma/i, sprite: 'ghost', title: 'Fantasma' },
    { re: /crollare|crollo/i, sprite: 'rubble', title: 'Passaggio instabile' },
    { re: /druido/i, sprite: 'npc:druid', title: 'Druido' },
    { re: /statua/i, sprite: 'statue', title: 'Statua antica' },
    { re: /pipistrell/i, sprite: 'bat', title: 'Pipistrelli' },
    { re: /chierico/i, sprite: 'npc:cleric', title: 'Chierico ferito' },
    { re: /ragn/i, sprite: 'spider', title: 'Ragni!' },
    { re: /lampada/i, sprite: 'lamp', title: 'Lampada polverosa' },
    { re: /\bleve\b/i, sprite: 'levers', title: 'Sala delle leve' },
    { re: /ladro/i, sprite: 'npc:thief', title: 'Agguato!' },
    { re: /miniera/i, sprite: 'minecart', title: 'Miniera abbandonata' },
    { re: /\bmago\b/i, sprite: 'npc:wizard', title: 'Duello di enigmi' },
    { re: /ponte/i, sprite: 'bridge', title: 'Ponte di corda' },
    { re: /banshee/i, sprite: 'banshee', title: 'Banshee' },
    { re: /avventurieri|covone/i, sprite: 'bones', title: 'Resti di avventurieri' },
  ];
  const MONSTERS = new Set(['goblin', 'skeleton', 'wolf', 'spider', 'bat', 'ghost', 'banshee', 'creature', 'npc:thief']);

  function eventFor(description) {
    const d = description || '';
    const ev = EVENTS.find((e) => e.re.test(d)) || { sprite: 'creature', title: 'Evento misterioso' };
    return Object.assign({ monster: MONSTERS.has(ev.sprite) }, ev);
  }

  window.RMD = window.RMD || {};
  window.RMD.Sprites = { get, tinted, drawText, textWidth, eventFor, OUTLINE: K };
})();
