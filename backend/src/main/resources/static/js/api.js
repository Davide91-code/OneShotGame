/*
 * api.js — tutte le chiamate al backend Spring Boot in un unico posto.
 *
 * Endpoint usati (GameController):
 *   POST /games                    { nomeUtente, difficolta }  -> CreateNewGameResponse
 *   POST /games/{gameId}/roll                                  -> DiceRollResponse
 *   POST /games/{gameId}/interact  { accepted }                -> InteractionResponse
 */
(function () {
  'use strict';

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  async function post(path, body) {
    let response;
    try {
      response = await fetch(path, {
        method: 'POST',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Backend non raggiungibile. Controlla che sia avviato.', 0);
    }

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

    if (!response.ok) {
      // Spring restituisce di default { timestamp, status, error, path, message? }
      const detail = (data && (data.message || data.error)) || response.statusText;
      throw new ApiError('Errore ' + response.status + ': ' + detail, response.status);
    }
    return data;
  }

  const HttpApi = {
    /** difficolta: 'EASY' | 'MEDIUM' | 'HARD' */
    createGame(nomeUtente, difficolta) {
      return post('/games', { nomeUtente, difficolta });
    },

    rollDice(gameId) {
      return post('/games/' + encodeURIComponent(gameId) + '/roll');
    },

    interact(gameId, accepted) {
      return post('/games/' + encodeURIComponent(gameId) + '/interact', { accepted });
    },
  };

  window.OSG = window.OSG || {};
  window.OSG.HttpApi = HttpApi;
})();
