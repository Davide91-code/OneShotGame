/*
 * api.js — comunicazione con il backend Spring Boot (GameController).
 *
 *   POST /games                    { nomeUtente, difficolta }  -> CreateNewGameResponse
 *   POST /games/{gameId}/roll                                  -> DiceRollResponse
 *   POST /games/{gameId}/interact  { accepted }                -> InteractionResponse
 *
 * Contiene anche una modalità DEMO che replica in locale le regole di GameService,
 * utile per provare la grafica senza avviare backend e MySQL.
 *
 * Indirizzo del backend:
 *   - pagina servita da Spring (porta 8080)      -> stesso host
 *   - altrimenti (file://, Live Server, ...)      -> http://localhost:8080
 *   - si può forzare con ?api=http://host:porta
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const API_BASE = (params.get('api') || (location.port === '8080' ? '' : 'http://localhost:8080')).replace(/\/$/, '');

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status; // 0 = backend non raggiungibile
    }
  }

  // ------------------------------------------------------------ backend vero
  async function post(path, body) {
    let response;
    try {
      response = await fetch(API_BASE + path, {
        method: 'POST',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError('Backend non raggiungibile su ' + (API_BASE || location.origin) + '. Avvialo oppure gioca in modalità demo.', 0);
    }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!response.ok) {
      // GlobalExceptionHandler -> ErrorResponse { timestamp, status, error, message }
      const detail = (data && (data.message || data.error)) || response.statusText;
      throw new ApiError(detail, response.status);
    }
    return data;
  }

  const HttpApi = {
    label: 'Server ' + (API_BASE || location.origin).replace(/^https?:\/\//, ''),
    createGame: (nomeUtente, difficolta) => post('/games', { nomeUtente, difficolta }),
    rollDice: (gameId) => post('/games/' + encodeURIComponent(gameId) + '/roll'),
    interact: (gameId, accepted) => post('/games/' + encodeURIComponent(gameId) + '/interact', { accepted }),
  };

  // ------------------------------------------------------------ modalità demo
  // Stesse regole di GameService / CellFactory / DifficultyEnum.
  const DIFFICULTY = { EASY: 20, MEDIUM: 30, HARD: 40 };
  const DEFAULT_MAX_HP = 10;
  const SUCCESS_CHANCE = 75;
  const FINISH_MESSAGE = "Congratulazioni, sei uscito vivo dal dungeon ed hai conseguito l'attestato del corso!";
  const DEFEAT_MESSAGE = 'Purtroppo hai perso: hai esaurito tutti i tuoi HP.';
  const E = (d, p, n, hp, hn) => ({ d, p, n, hp, hn });
  const EVENTS = [
    E('Un viandante ferito chiede aiuto.', 'Lo aiuti e ti ricompensa con una pozione.', 'Prosegui senza fermarti.', 3, 2),
    E('Trovi un forziere malandato.', 'Apri il forziere e trovi una pozione di cura .', 'Mentre lo apri scopri che è un Mimic e perdi qualche HP.', 8, -4),
    E('Una creatura ti offre uno scambio misterioso.', 'Accetti lo scambio e recuperi qualche HP.', 'Rifiuti lo scambio e la creatura ti ferisce.', 3, -4),
    E("Scopri un antico altare.", 'Preghi e ricevi una benedizione proseguendo di due passi.', "Disturbi l'altare e ne subisci la maledizione.", 2, -5),
    E('Calpesti una trappola.', 'Provi a disinesscarla.', 'Vieni avvelenato e perdi degli HP.', 0, -2),
    E('Un alchimista stanco ti mostra una fiala.', 'Bevi la pozione e recuperi diversi HP.', 'La fiala era instabile e subisci dei danni.', 5, -6),
    E('Incontri un mercante che vende mappe.', 'Compra la mappa e scopri un passaggio sicuro.', 'La mappa è falsa e cammini in una zona pericolosa.', 0, -1),
    E('Un goblin blocca il corridoio.', 'Lo distrai con del cibo e ti lascia passare.', 'Attacca e riesci a fuggire perdendo degli HP.', 2, -5),
    E('Trovi una donna col marito che imbraccia un ferro da stiro.', 'Chiedi di farti stirare tutto...', 'la ignori e vai avanti', 1, 0),
    E('Uno scheletro custodisce una porta.', 'Rispondi correttamente alla sua domanda e prosegui.', 'La risposta è sbagliata e lo scheletro ti colpisce.', 3, -6),
    E('Una cassa caduta giace sul pavimento.', 'La spingi con cautela e trovi una pozione.', 'La cassa cade e ti ferisce una mano.', 5, -3),
    E("Senti un lupo ringhiare nell'ombra.", 'Gli lanci della carne e lo lasci passare.', "Ti mette all'angolo e perdi degli HP.", 2, -7),
    E('Un fabbro offre di riparare il tuo equipaggiamento.', 'Accetti e riparti protetto meglio.', 'Il lavoro è imperfetto e ti ferisci mentre lo indossi.', 4, -2),
    E('Ti imbatti in un campo di funghi luminescenti.', 'Mangiare quelli sani ti restituisce energia.', 'Uno è velenoso e ti provoca danni.', 6, -5),
    E('Un fantasma apparizione ti pone una scelta.', 'Condividi con lui un ricordo felice.', 'Ignori il suo dolore e subisci la sua rabbia.', 5, -4),
    E('Un passaggio sembra crollare.', 'Usi rapidamente una corda per attraversarlo.', 'Cadi tra le macerie e perdi degli HP.', 3, -6),
    E('Un druido ti chiede protezione.', 'Lo difendi e ricevi una ricompensa curativa.', 'Lo abbandoni e vieni colpito da una bestia.', 8, -5),
    E('Trovi una statua con una mano incavo.', 'Metti una moneta e ricevi una benedizione.', "Svuoti l'incavo di nascosto e la statua si anima.", 7, -6),
    E('Un gruppo di pipistrelli esce dal soffitto.', 'Ti copri con il mantello e li eviti.', 'Uno ti graffia mentre tenti di scappare.', 2, -3),
    E('Un chierico ferito si trascina a terra.', 'Lo curi e usa la magia per guarire anche te.', 'Continui senza aiutarlo e una maledizione ti colpisce.', 9, -4),
    E('Scendi in una stanza piena di ragni.', 'Bruci una torcia e allontani i ragni.', "Vieni morso mentre cerchi un'uscita.", 3, -7),
    E('Un ragno gigante tende una ragnatela.', "Tagli i fili dall'alto e superi l'ostacolo.", 'Rimani intrappolato e subisci un morso.', 4, -6),
    E('Trovi una lampada coperta dalla polvere.', 'La strofinia e un genio concede una guarigione.', 'Il genio si arrabbia e ti lancia una maledizione.', 8, -5),
    E('Una sala contiene una serie di leve.', 'Scegli quella giusta e si apre una stanza sicura.', 'Tiri quella sbagliata e cadono dardi velenosi.', 5, -7),
    E('Un ladro ti tende un agguato.', 'Lo convinci a desistere con una promessa.', 'Combatte e riesci a scappare ferito.', 2, -6),
    E('Incontri una miniera abbandonata.', 'Cerchi con cautela e recuperi una pozione.', 'Attivi un sistema instabile e vieni investito.', 6, -8),
    E("Un mago propone un duello di enigmi.", "Vinci l'enigma e ottieni una protezione.", 'Perdi il duello e subisci un incantesimo.', 5, -5),
    E('Un ponte di corda attraversa un burrone.', "Attraversi lentamente senza perdere l'equilibrio.", 'Una corda si spezza e sbatti contro la parete.', 3, -7),
    E('Una banshee appare nella nebbia.', 'Coprirti le orecchie neutralizza il suo grido.', 'Il grido ti paralizza e perdi degli HP.', 4, -8),
    E('Trovi un covone con resti di avventurieri.', 'Recuperi una borsa con una pozione intatta.', 'Delle frecce nascoste ti colpiscono.', 7, -5),
  ];

  const rnd = (n) => Math.floor(Math.random() * n);
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120 + rnd(120)));
  const games = new Map();
  let nextId = 1;

  const DemoApi = {
    label: 'Demo offline',
    async createGame(nomeUtente, difficolta) {
      if (!nomeUtente || !nomeUtente.trim()) throw new ApiError('Player name is missing. Enter a valid name to start the game.', 400);
      const size = DIFFICULTY[difficolta];
      if (!size) throw new ApiError('Difficulty is missing. Select a difficulty to start the game.', 400);
      const cells = [];
      for (let i = 0; i < size - 1; i++) cells.push(EVENTS[rnd(EVENTS.length)]);
      cells.push({ d: FINISH_MESSAGE });
      const g = { id: nextId++, name: nomeUtente.trim(), cells, hp: DEFAULT_MAX_HP, steps: 0, pending: null };
      games.set(g.id, g);
      return delay({ gameId: g.id, playerName: g.name, boardSize: size, maxHp: DEFAULT_MAX_HP, currentHp: g.hp });
    },
    async rollDice(gameId) {
      const g = games.get(Number(gameId));
      if (!g) throw new ApiError('Game ' + gameId + ' was not found. Check the game ID.', 404);
      if (g.hp <= 0) throw new ApiError('Your HP are exhausted. You have lost the game and cannot roll again.', 409);
      const last = g.cells.length - 1;
      if (g.steps >= last) throw new ApiError('You have reached the final cell. The game is finished.', 409);
      if (g.pending) throw new ApiError('You have a pending event. Accept or refuse the event before rolling the dice again.', 409);
      const dice = 1 + rnd(6);
      g.steps += dice;
      const pos = Math.min(g.steps, last);
      g.pending = g.cells[pos];
      return delay({ gameId: g.id, diceResult: dice, currentPosition: pos, eventDescription: g.cells[pos].d, finished: pos === last });
    },
    async interact(gameId, accepted) {
      const g = games.get(Number(gameId));
      if (!g) throw new ApiError('Game ' + gameId + ' was not found. Check the game ID.', 404);
      if (g.hp <= 0) throw new ApiError('Your HP are exhausted. You have lost the game and cannot interact.', 409);
      if (g.steps >= g.cells.length - 1) throw new ApiError('You have reached the final cell. The game is finished.', 409);
      if (!g.pending) throw new ApiError('There is no pending event. Roll the dice first to reach a cell.', 409);
      const cell = g.pending;
      g.pending = null;
      const ok = accepted && rnd(100) < SUCCESS_CHANCE;
      g.hp = Math.max(0, Math.min(DEFAULT_MAX_HP, g.hp + (ok ? cell.hp : cell.hn)));
      const finished = g.hp === 0;
      return delay({
        gameId: g.id, accepted, interactionOutcome: ok ? cell.p : cell.n, currentHp: g.hp, maxHp: DEFAULT_MAX_HP,
        finished, message: finished ? DEFEAT_MESSAGE : null,
      });
    },
  };

  window.RMD = window.RMD || {};
  window.RMD.Api = {
    HttpApi,
    DemoApi,
    ApiError,
    SUCCESS_CHANCE,
    defaultMode: params.get('demo') === '1' ? 'demo' : params.get('demo') === '0' || isLocal ? 'server' : 'demo',
  };
})();
