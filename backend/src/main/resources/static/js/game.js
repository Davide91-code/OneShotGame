/*
 * game.js — collega interfaccia, backend e mondo.
 *
 * Flusso di un turno (come in "analisi strutturale"):
 *   1. POST /games              -> nuova partita, costruisce il percorso
 *   2. POST /games/{id}/roll    -> animazione dado, l'eroe cammina fino alla casella
 *   3. evento sulla casella     -> il giocatore sceglie Interagisci / Ignora
 *   4. POST /games/{id}/interact-> esito, variazione HP, si torna al punto 2
 * Si vince arrivando all'ultima casella (finished nel roll), si perde a 0 HP.
 */
(function () {
  'use strict';

  const { World, HttpApi } = window.OSG;
  const $ = (id) => document.getElementById(id);

  // Riconoscimento del tipo di evento dalla descrizione del backend.
  // Se in futuro il backend aggiunge un campo "eventType" nel DiceRollResponse, viene usato quello.
  const EVENT_TYPES = [
    { type: 'traveler', title: 'Viandante ferito', match: /viandante/i },
    { type: 'chest', title: 'Forziere', match: /forziere/i },
    { type: 'creature', title: 'Creatura misteriosa', match: /creatura/i },
    { type: 'altar', title: 'Antico altare', match: /altare/i },
    { type: 'trap', title: 'Trappola!', match: /trappola/i },
  ];
  const BACKEND_TYPE_MAP = { TRAVELER: 'traveler', CHEST: 'chest', CREATURE: 'creature', ALTAR: 'altar', TRAP: 'trap' };

  function detectEvent(roll) {
    if (roll.eventType && BACKEND_TYPE_MAP[roll.eventType]) {
      const t = BACKEND_TYPE_MAP[roll.eventType];
      return EVENT_TYPES.find((e) => e.type === t);
    }
    const desc = roll.eventDescription || '';
    return EVENT_TYPES.find((e) => e.match.test(desc)) || { type: 'mystery', title: 'Evento sconosciuto' };
  }

  const state = {
    gameId: null,
    playerName: '',
    boardSize: 0,
    hp: 0,
    maxHp: 0,
    pos: 0,
    phase: 'start', // start | roll | busy | choice | over
  };

  const world = new World($('game-canvas'));
  world.attract = true;
  world.build(30, 12345);
  window.OSG.world = world; // utile per il debug dalla console

  // ---------- scala intera del canvas ----------
  function fit() {
    const frame = $('frame');
    const maxW = Math.min(window.innerWidth - 24, 1600);
    const maxH = window.innerHeight - 40;
    const scale = Math.max(1, Math.floor(Math.min(maxW / World.VW, maxH / World.VH)));
    frame.style.width = World.VW * scale + 'px';
    frame.style.height = World.VH * scale + 'px';
    frame.style.setProperty('--px', scale + 'px');
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------- testo con effetto macchina da scrivere ----------
  let typeTimer = null;
  function say(title, text, tone) {
    $('dialog-title').textContent = title || '';
    const body = $('dialog-text');
    body.className = 'dialog-text' + (tone ? ' tone-' + tone : '');
    clearInterval(typeTimer);
    body.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      i += 2;
      body.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 16);
  }

  function log(text, kind) {
    const li = document.createElement('li');
    li.className = kind || '';
    li.textContent = text;
    const list = $('log-list');
    list.prepend(li);
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 5000);
  }

  function setPhase(phase) {
    state.phase = phase;
    $('btn-roll').hidden = phase !== 'roll';
    $('btn-yes').hidden = phase !== 'choice';
    $('btn-no').hidden = phase !== 'choice';
    $('btn-roll').disabled = $('btn-yes').disabled = $('btn-no').disabled = phase === 'busy';
    $('dialog').classList.toggle('waiting', phase === 'busy');
  }

  function updateHud() {
    world.setHud(state.hp, state.maxHp);
    $('hud-name').textContent = state.playerName;
    $('hud-pos').textContent = 'Casella ' + state.pos + ' / ' + (state.boardSize - 1);
  }

  // ---------- azioni ----------
  async function startGame(e) {
    e.preventDefault();
    const name = $('input-name').value.trim();
    const diff = document.querySelector('input[name="difficulty"]:checked').value;
    if (!name) { $('input-name').focus(); return; }

    $('btn-start').disabled = true;
    try {
      const res = await HttpApi.createGame(name, diff);
      state.gameId = res.gameId;
      state.playerName = res.playerName;
      state.boardSize = res.boardSize;
      state.hp = res.currentHp;
      state.maxHp = res.maxHp;
      state.pos = 0;

      world.attract = false;
      world.build(res.boardSize, (Math.random() * 1e9) | 0);
      world.showHud = true;
      updateHud();

      $('screen-start').hidden = true;
      $('screen-end').hidden = true;
      $('hud').hidden = false;
      $('dialog').hidden = false;
      $('log-list').innerHTML = '';
      log('Partita #' + res.gameId + ' iniziata: ' + res.boardSize + ' caselle, ' + res.maxHp + ' HP.', 'info');
      say(res.playerName, 'Ti risvegli accanto a un falò, in fondo a un dungeon. L\'uscita è a ' + (res.boardSize - 1) + ' caselle da qui. Lancia il dado per avanzare.');
      setPhase('roll');
    } catch (err) {
      toast(err.message);
    } finally {
      $('btn-start').disabled = false;
    }
  }

  async function roll() {
    if (state.phase !== 'roll') return;
    setPhase('busy');
    let res;
    try {
      res = await HttpApi.rollDice(state.gameId);
    } catch (err) {
      toast(err.message);
      setPhase('roll');
      return;
    }

    say('', 'Il dado rotola…');
    await world.rollDice(res.diceResult);
    log('🎲 Esce ' + res.diceResult + ' → casella ' + res.currentPosition, 'roll');

    await world.walkToCell(res.currentPosition);
    state.pos = res.currentPosition;
    updateHud();

    if (res.finished) {
      say('Uscita!', res.eventDescription, 'good');
      log('🏁 ' + res.eventDescription, 'good');
      await world.victory();
      endGame(true, res.eventDescription);
      return;
    }

    const ev = detectEvent(res);
    world.revealEvent(res.currentPosition, ev.type);
    log('Casella ' + res.currentPosition + ': ' + res.eventDescription, 'event');
    say(ev.title, res.eventDescription);
    setPhase('choice');
  }

  async function choose(accepted) {
    if (state.phase !== 'choice') return;
    setPhase('busy');
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
    world.resolveEvent(state.pos, accepted);

    if (delta < 0) world.hurt(delta);
    else if (delta > 0) world.heal(delta);
    else world.neutral();
    updateHud();

    const deltaText = delta > 0 ? ' (+' + delta + ' HP)' : delta < 0 ? ' (' + delta + ' HP)' : '';
    say(accepted ? 'Hai interagito' : 'Hai ignorato', res.interactionOutcome + deltaText, delta > 0 ? 'good' : delta < 0 ? 'bad' : '');
    log((accepted ? '✔ ' : '✖ ') + res.interactionOutcome + deltaText, delta > 0 ? 'good' : delta < 0 ? 'bad' : '');

    if (res.finished) {
      await new Promise((r) => setTimeout(r, 700));
      await world.die();
      endGame(false, res.message || 'Hai esaurito tutti i tuoi HP.');
      return;
    }
    setPhase('roll');
  }

  function endGame(won, message) {
    setPhase('over');
    $('dialog').hidden = true;
    $('end-title').textContent = won ? 'Vittoria!' : 'Sei caduto…';
    $('end-title').className = won ? 'win' : 'lose';
    $('end-text').textContent = message;
    $('end-stats').textContent = 'Casella ' + state.pos + ' / ' + (state.boardSize - 1) + '  ·  HP ' + state.hp + ' / ' + state.maxHp;
    $('screen-end').hidden = false;
  }

  function backToMenu() {
    $('screen-end').hidden = true;
    $('hud').hidden = true;
    world.showHud = false;
    world.attract = true;
    world.build(30, (Math.random() * 1e9) | 0);
    $('screen-start').hidden = false;
    setPhase('start');
  }

  // ---------- eventi UI ----------
  $('start-form').addEventListener('submit', startGame);
  $('btn-roll').addEventListener('click', roll);
  $('btn-yes').addEventListener('click', () => choose(true));
  $('btn-no').addEventListener('click', () => choose(false));
  $('btn-again').addEventListener('click', backToMenu);
  $('btn-log').addEventListener('click', () => $('log').classList.toggle('open'));

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if ((e.code === 'Space' || e.code === 'Enter') && state.phase === 'roll') { e.preventDefault(); roll(); }
    else if (e.key === '1' && state.phase === 'choice') choose(true);
    else if (e.key === '2' && state.phase === 'choice') choose(false);
    else if (e.key.toLowerCase() === 'l') $('log').classList.toggle('open');
  });

  setPhase('start');
})();
