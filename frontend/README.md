# RandoMyDungeon — frontend

Frontend in pixel art del gioco a turni OneShotGame. È fatto solo di HTML, CSS e JavaScript, quindi non serve nessun build.

## Avvio

1. Avvia il backend Spring Boot (porta 8080) con MySQL attivo.
2. Apri `frontend/index.html`, con un doppio clic oppure con Live Server di VS Code.
3. Scegli **Server**, inserisci il nome dell'eroe e la difficoltà, poi premi **Entra nel dungeon**.

Se il backend è spento puoi giocare in **Demo offline**. In questa modalità la partita gira nel browser con le stesse regole di `GameService`: 10 HP, 75% di successo quando accetti un evento e gli stessi eventi di `CellFactory`.

Il frontend gira su un'origine diversa dal backend (file:// o la porta di Live Server). Per questo nel backend serve `CorsConfig.java`, che si trova nel package principale.

Opzioni da aggiungere all'URL:
- `?api=http://localhost:9090` usa un altro indirizzo per il backend
- `?demo=1` apre direttamente la modalità demo

## Comandi

| Tasto | Azione |
|---|---|
| Spazio / Invio | Lancia il dado |
| 1 | Accetta l'evento |
| 2 | Prosegui (ignora) |
| L | Diario |
| M | Audio on/off |

## Struttura

| File | Contenuto |
|---|---|
| `js/api.js` | Chiamate a `POST /games`, `/games/{id}/roll`, `/games/{id}/interact` e modalità demo |
| `js/sprites.js` | Pixel art di eroe, PNG e mostri; riconoscimento dell'evento dalla descrizione del backend |
| `js/world.js` | Generazione del dungeon (4 zone), luci, dado isometrico, HUD e minimappa |
| `js/game.js` | Flusso del turno: crea partita → lancia → evento → scelta |
| `js/audio.js` | Effetti sonori chiptune generati con WebAudio |

Se aggiungete un nuovo evento in `CellFactory`, aggiungete anche una riga in `EVENTS` dentro `sprites.js` per assegnargli uno sprite. Altrimenti l'evento compare come "Evento misterioso". Per la modalità demo copiate l'evento anche in `api.js`.
