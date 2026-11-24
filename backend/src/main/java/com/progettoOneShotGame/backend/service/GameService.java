package com.progettoOneShotGame.backend.service;

import com.progettoOneShotGame.backend.Dice;
import com.progettoOneShotGame.backend.dto.CreateNewGameRequest;
import com.progettoOneShotGame.backend.dto.CreateNewGameResponse;
import com.progettoOneShotGame.backend.dto.DiceRollResponse;
import com.progettoOneShotGame.backend.dto.InteractionResponse;
import com.progettoOneShotGame.backend.entity.ActionType;
import com.progettoOneShotGame.backend.entity.CellEntity;
import com.progettoOneShotGame.backend.entity.GameEntity;
import com.progettoOneShotGame.backend.entity.PlayerEntity;
import com.progettoOneShotGame.backend.entity.ProgressEntity;
import com.progettoOneShotGame.backend.entity.ScoreBoardEntity;
import com.progettoOneShotGame.backend.repository.GameRepository;
import com.progettoOneShotGame.backend.repository.PlayerRepository;
import com.progettoOneShotGame.backend.repository.ProgressRepository;
import com.progettoOneShotGame.backend.repository.ScoreBoardRepository;
import java.util.ArrayList;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GameService {

    private static final int DEFAULT_MAX_HP = 10;

    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;
    private final ScoreBoardRepository scoreBoardRepository;
    private final ScoreBoardService scoreBoardService;

    private final ProgressRepository progressRepository;
    private final Dice dice = new Dice();

    public GameService(
            GameRepository gameRepository,
            PlayerRepository playerRepository,
            ScoreBoardRepository scoreBoardRepository,
            ScoreBoardService scoreBoardService,
            ProgressRepository progressRepository) {

        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.scoreBoardRepository = scoreBoardRepository;
        this.scoreBoardService = scoreBoardService;
        this.progressRepository = progressRepository;
    }

    @Transactional
    public CreateNewGameResponse createGame(CreateNewGameRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Game request is required");
        }

        String playerName = request.nomeUtente();
        if (playerName == null || playerName.isBlank()) {
            throw new IllegalArgumentException("Player name is required");
        }
        if (request.difficolta() == null) {
            throw new IllegalArgumentException("Difficulty is required");
        }

        int boardSize = request.difficolta().getValore();
        ScoreBoardEntity scoreBoard = scoreBoardRepository.save(
                scoreBoardService.generate(boardSize));

        PlayerEntity player = new PlayerEntity();
        player.setNome(playerName.trim());
        player.setMaxHp(DEFAULT_MAX_HP);
        PlayerEntity savedPlayer = playerRepository.save(player);

        GameEntity game = new GameEntity();
        game.setScoreBoard(scoreBoard);
        game.setPlayer(savedPlayer);
        game.setProgresses(new ArrayList<>());

        GameEntity savedGame = gameRepository.save(game);
        return new CreateNewGameResponse(
                savedGame.getId(),
                savedGame.getPlayer().getNome(),
                savedGame.getScoreBoard().size(),
                savedGame.getPlayer().getMaxHp());
    }

    //Lancia il dado e regsitra il risultato nello storico.
    @Transactional
    public DiceRollResponse rollDice(Long gameId) {

        //blocchiamo la partita durante il turno per gestrirare una richiesta
        //alla volta.
        GameEntity game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new NoSuchElementException("Game not found: " + gameId));

        ScoreBoardEntity scoreBoard = game.getScoreBoard();
        int lastPosition = scoreBoard.size() - 1;

        long stepsTaken = progressRepository.sumDiceResults(gameId, ActionType.DICE_ROLL);
        if (stepsTaken >= lastPosition) {
            throw new IllegalStateException("The game is already finished");
        }

        int diceResult = dice.throwDice();
        int newPosition = (int) Math.min(stepsTaken + diceResult, lastPosition);
        CellEntity reachedCell = scoreBoard.getCellAt(newPosition);

        ProgressEntity progress = new ProgressEntity();
        progress.setGame(game);
        progress.setCell(reachedCell);
        progress.setActionType(ActionType.DICE_ROLL);
        progress.setDiceResult(diceResult);
        progressRepository.save(progress);

        boolean finished = newPosition == lastPosition;
        return new DiceRollResponse(
                gameId,
                diceResult,
                newPosition,
                finished ? null : reachedCell.getEventDescription(),
                finished);
        }

    //Registra la scelta del giocatore  per l'evento della casella raggiunnta.
    //per ora gestisci il rifiuto, salva la scelta nello storico senza modifica gli hp
    @Transactional
    //Prima di cercare l'ultimo tiro,
    //l'evento è ancora in attesa di una scelta solo se l'ultima azione è un tiro
    public InteractionResponse interact(Long gameId, boolean accepted) {
        if (accepted) {
            throw new IllegalArgumentException("Accepting events is not implemented yet");
        }

        GameEntity game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new NoSuchElementException("Game not found: " + gameId));

        long stepsTaken = progressRepository.sumDiceResults(gameId, ActionType.DICE_ROLL);
        if (stepsTaken >= game.getScoreBoard().size() - 1) {
            throw new IllegalStateException("The game is already finished");
        }

        ProgressEntity lastRoll = progressRepository.findFirstByGame_IdOrderByIdDesc(gameId)
                .filter(progress -> progress.getActionType() == ActionType.DICE_ROLL)
                .orElseThrow(() -> new IllegalStateException("There is no event awaiting a choice"));

        ProgressEntity interaction = new ProgressEntity();
        interaction.setGame(game);
        interaction.setCell(lastRoll.getCell());
        interaction.setActionType(ActionType.EVENT_INTERACTION);
        interaction.setInteractionAccepted(false);
        progressRepository.save(interaction);

        return new InteractionResponse(gameId, false, null);

        //La scelta riguarda la stessa casella raggiunta con l'ultimo tiro e poi
        //salviamo la scelta come azione seprata per chiudere 
        //l'evento e continuare il prossimo tiro.
    }
}
