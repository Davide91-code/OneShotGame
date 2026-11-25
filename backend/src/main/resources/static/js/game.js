/*
 * game.js — collega interfaccia, backend e mondo.
 *
 * Turno (come in "analisi strutturale"):
 *   1. POST /games               -> nuova partita: il percorso viene disegnato
 *   2. POST /games/{id}/roll     -> animazione del dado, l'eroe cammina fino alla casella
 *   3. evento sulla casella      -> il giocatore sceglie Accetta / Prosegui
 *   4. POST /games/{id}/interact -> esito e variazione HP, poi di nuovo il punto 2
 * Si vince raggiungendo l'ultima casella (finished nel roll), si perde a 0 HP (finished nell'interact).
 */
(function () {
  'use strict';

  const { World, HttpApi, Sprites, Audio } = window.RMD;
  const $ = (id) => document.getElementById(id);

  const state = {
    gameId: null, playerName: '', boardSize: 0, hp: 0, maxHp: 0, pos: 0,
    phase: 'start', // start | roll | busy | choice | over
    event: null,
    stats: { rolls: 0, accepted: 0, refused: 0, hpLost: 0, hpGained: 0 },
  };

  const world = new World($('game-canvas'));
  world.sfx = (n) => Audio.play(n);
  world.attract = true;
  world.build(40, (Math.random() * 1e9) | 0);
  window.RMD.world = world; // comodo per il debug da console

  // ---------------------------------------------------------- zoom a numeri interi
  function fit() {
    const maxW = window.innerWidth - 16;
    const maxH = window.innerHeight - 16;
    const scale = Math.max(1, Math.floor(Math.min(maxW / World.VW, maxH / World.VH)));
    $('frame').style.setProperty('--px', scale + 'px');
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------- testo, diario, avvisi
  let typeTimer = null;
  function say(title, text, opts) {
    opts = opts || {};
    $('dialog-title').textContent = title || '';
    $('dialog').classList.toggle('monster', !!opts.monster);
    const portrait = $('dialog-portrait');
    if (opts.sprite) {
      const img = Sprites.get(opts.sprite);
      portrait.width = Math.max(16, img.width + 4);
      portrait.height = Math.max(16, img.height + 4);
      const g = portrait.getContext('2d');
      g.clearRect(0, 0, portrait.width, portrait.height);
      g.drawImage(img, Math.floor((portrait.width - img.width) / 2), Math.floor((portrait.height - img.height) / 2));
      portrait.hidden = false;
    } else portrait.hidden = true;
    const body = $('dialog-text');
    body.className = 'dialog-text' + (opts.tone ? ' tone-' + opts.tone : '');
    clearInterval(typeTimer);
    body.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      i += 2;
      body.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 18);
  }

  function log(text, kind) {
    const li = document.createElement('li');
    li.className = kind || '';
    li.textContent = text;
    $('log-list').prepend(li);
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 5000);
  }

  function flash(kind) {
    const f = $('flash');
    f.className = '';
    void f.offsetWidth;
    f.className = kind;
  }

  world.onBiome = (name) => {
    const b = $('zone-banner');
    b.querySelector('span').textContent = name;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    log('— ' + name + ' —', 'info');
  };

  function setPhase(phase) {
    state.phase = phase;
    $('btn-roll').hidden = phase !== 'roll' && phase !== 'busy-roll';
    $('btn-yes').hidden = phase !== 'choice' && phase !== 'busy-choice';
    $('btn-no').hidden = phase !== 'choice' && phase !== 'busy-choice';
    const busy = phase.startsWith('busy');
    $('btn-roll').disabled = $('btn-yes').disabled = $('btn-no').disabled = busy;
    $('dialog').classList.toggle('waiting', busy);
  }

  function updateHud() {
    world.setHud(state.hp, state.maxHp);
  }

  // ---------------------------------------------------------- azioni di gioco
  async function startGame(e) {
    e.preventDefault();
    const name = $('input-name').value.trim();
    const diff = document.querySelector('input[name="difficulty"]:checked').value;
    if (!name) { $('input-name').focus(); return; }
    Audio.play('click');
    $('btn-start').disabled = true;
    try {
      const res = await HttpApi.createGame(name, diff);
      Object.assign(state, {
        gameId: res.gameId, playerName: res.playerName, boardSize: res.boardSize,
        hp: res.currentHp, maxHp: res.maxHp, pos: 0, event: null,
        stats: { rolls: 0, accepted: 0, refused: 0, hpLost: 0, hpGained: 0 },
      });
      $('frame').classList.remove('dead');
      world.attract = false;
      world.build(res.boardSize, (Math.random() * 1e9) | 0);
      world.showHud = true;
      updateHud();

      $('screen-start').hidden = true;
      $('screen-end').hidden = true;
      $('topbar').hidden = false;
      $('dialog').hidden = false;
      $('log-list').innerHTML = '';
      log('Partita #' + res.gameId + ' · ' + res.boardSize + ' caselle · ' + res.maxHp + ' HP', 'info');
      say(res.playerName,
        "Ti risvegli accanto a un falò, nelle profondità di RandoMyDungeon. L'uscita è a " + (res.boardSize - 1) + ' caselle da qui. Lancia il dado per avanzare.',
        { sprite: 'hero:idle' });
      setPhase('roll');
    } catch (err) {
      toast(err.message);
    } finally {
      $('btn-start').disabled = false;
    }
  }

  async function roll() {
    if (state.phase !== 'roll') return;
    setPhase('busy-roll');
    let res;
    try {
      res = await HttpApi.rollDice(state.gameId);
    } catch (err) {
      toast(err.message);
      setPhase('roll');
      return;
    }
    state.stats.rolls++;
    say('', 'Il dado rotola…');
    await world.rollDice(res.diceResult);
    log('🎲 ' + res.diceResult + ' → casella ' + res.currentPosition, 'roll');
    say('', 'Esce ' + res.diceResult + '! Avanzi verso la casella ' + res.currentPosition + '…');

    await world.walkToCell(res.currentPosition);
    state.pos = res.currentPosition;

    if (res.finished) {
      say('Uscita!', res.eventDescription, { tone: 'good' });
      log('🏁 ' + res.eventDescription, 'good');
      Audio.play('win');
      await world.victory();
      endGame(true, res.eventDescription);
      return;
    }

    const ev = Sprites.eventFor(res.eventDescription);
    state.event = ev;
    world.revealEvent(res.currentPosition, ev);
    log('Casella ' + res.currentPosition + ': ' + res.eventDescription, 'event');
    say(ev.title, res.eventDescription, {
      sprite: ev.sprite, monster: ev.monster,
    });
    setPhase('choice');
  }

  async function choose(accepted) {
    if (state.phase !== 'choice') return;
    Audio.play('click');
    setPhase('busy-choice');
    let res;
    try {
      res = await HttpApi.interact(state.gameId, accepted);
    } catch (err) {
      toast(err.message);
      setPhase('choice');
      return;
    }
    const delta = res.currentHp - state.hp;
    state.hp = res.currentHp;
    state.maxHp = res.maxHp;
    state.stats[accepted ? 'accepted' : 'refused']++;
    if (delta < 0) state.stats.hpLost -= delta; else state.stats.hpGained += delta;

    const tone = delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral';
    world.resolveEvent(state.pos, tone);
    if (delta < 0) { world.hurt(delta); flash('hurt'); Audio.play('hit'); }
    else if (delta > 0) { world.heal(delta); flash('heal'); Audio.play('heal'); }
    else { world.neutral(); Audio.play('neutral'); }
    updateHud();

    const deltaText = delta > 0 ? ' (+' + delta + ' HP)' : delta < 0 ? ' (' + delta + ' HP)' : '';
    say(accepted ? 'Hai accettato' : 'Hai proseguito', res.interactionOutcome + deltaText, {
      tone: tone === 'neutral' ? '' : tone, sprite: state.event && state.event.sprite,
    });
    log((accepted ? '✔ ' : '➜ ') + res.interactionOutcome + deltaText, tone === 'neutral' ? '' : tone);

    if (res.finished) {
      await new Promise((r) => setTimeout(r, 900));
      $('frame').classList.add('dead');
      Audio.play('lose');
      await world.die();
      endGame(false, res.message || 'Hai esaurito tutti i tuoi HP.');
      return;
    }
    setPhase('roll');
  }

  function endGame(won, message) {
    setPhase('over');
    $('dialog').hidden = true;
    $('topbar').hidden = true;
    $('end-title').textContent = won ? 'Vittoria!' : 'Sei caduto…';
    $('end-title').className = won ? 'win' : 'lose';
    $('end-text').textContent = message;
    const s = state.stats;
    const stats = [
      ['Casella', state.pos + '/' + (state.boardSize - 1)],
      ['HP', state.hp + '/' + state.maxHp],
      ['Tiri', s.rolls],
      ['Accettati', s.accepted + '/' + (s.accepted + s.refused)],
    ];
    $('end-stats').innerHTML = '';
    stats.forEach(([k, v]) => {
      const d = document.createElement('div');
      d.innerHTML = '<dt></dt><dd></dd>';
      d.querySelector('dt').textContent = k;
      d.querySelector('dd').textContent = v;
      $('end-stats').appendChild(d);
    });
    $('screen-end').hidden = false;
    $('btn-again').focus();
  }

  function backToMenu() {
    Audio.play('click');
    $('screen-end').hidden = true;
    $('frame').classList.remove('dead');
    world.showHud = false;
    world.attract = true;
    world.build(40, (Math.random() * 1e9) | 0);
    $('screen-start').hidden = false;
    $('log').classList.remove('open');
    setPhase('start');
    $('input-name').focus();
  }

  function toggleLog() { $('log').classList.toggle('open'); }
  function toggleSound() {
    const m = Audio.toggle();
    $('btn-sound').textContent = m ? '🔇' : '🔊';
  }
  $('btn-sound').textContent = Audio.muted ? '🔇' : '🔊';

  // ---------------------------------------------------------- input
  $('start-form').addEventListener('submit', startGame);
  $('btn-roll').addEventListener('click', roll);
  $('btn-yes').addEventListener('click', () => choose(true));
  $('btn-no').addEventListener('click', () => choose(false));
  $('btn-again').addEventListener('click', backToMenu);
  $('btn-log').addEventListener('click', toggleLog);
  $('btn-sound').addEventListener('click', toggleSound);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if ((e.code === 'Space' || e.code === 'Enter') && state.phase === 'roll') { e.preventDefault(); roll(); }
    else if (e.code === 'Enter' && state.phase === 'over') { e.preventDefault(); backToMenu(); }
    else if (e.key === '1' && state.phase === 'choice') choose(true);
    else if (e.key === '2' && state.phase === 'choice') choose(false);
    else if (k === 'l' && state.phase !== 'start') toggleLog();
    else if (k === 'm') toggleSound();
  });

  setPhase('start');
  $('input-name').focus();
})();
