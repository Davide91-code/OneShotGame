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
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GameService {

    private static final int DEFAULT_MAX_HP = 10;
    private static final int ACCEPTED_OUTCOME_SUCCESS_CHANCE = 70;
    private static final String DEFEAT_MESSAGE =
            "Purtroppo hai perso: hai esaurito tutti i tuoi HP.";

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
            throw new IllegalArgumentException("Game request is missing. Provide the player name and difficulty.");
        }

        String playerName = request.nomeUtente();
        if (playerName == null || playerName.isBlank()) {
            throw new IllegalArgumentException("Player name is missing. Enter a valid name to start the game.");
        }
        if (request.difficolta() == null) {
            throw new IllegalArgumentException("Difficulty is missing. Select a difficulty to start the game.");
        }

        int boardSize = request.difficolta().getValore();
        ScoreBoardEntity scoreBoard = scoreBoardRepository.save(
                scoreBoardService.generate(boardSize));

        PlayerEntity player = new PlayerEntity();
        player.setNome(playerName.trim());
        player.setMaxHp(DEFAULT_MAX_HP);
        player.setCurrentHp(DEFAULT_MAX_HP);
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
                savedGame.getPlayer().getMaxHp(),
                getCurrentHp(savedGame.getPlayer()));
    }

    // Lancia il dado e regsitra il risultato nello storico.
    @Transactional
    public DiceRollResponse rollDice(Long gameId) {

        // blocchiamo la partita durante il turno per gestrirare una richiesta
        // alla volta.
        GameEntity game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Game " + gameId + " was not found. Check the game ID."
                ));

        if (getCurrentHp(game.getPlayer()) <= 0) {
            throw new IllegalStateException("Your HP are exhausted. You have lost the game and cannot roll again.");
        }

        ScoreBoardEntity scoreBoard = game.getScoreBoard();
        int lastPosition = scoreBoard.size() - 1;

        long stepsTaken = progressRepository.sumDiceResults(gameId, ActionType.DICE_ROLL);
        if (stepsTaken >= lastPosition) {
            throw new IllegalStateException("You have reached the final cell. The game is finished.");
        }

        boolean hasPendingInteraction = progressRepository.findFirstByGame_IdOrderByIdDesc(gameId)
                .filter(progress -> progress.getActionType() == ActionType.DICE_ROLL)
                .isPresent();

        if (hasPendingInteraction) {
            throw new IllegalStateException("You have a pending event. Accept or refuse the event before rolling the dice again.");
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
                reachedCell.getEventDescription(),
                finished);
    }

    // Registra la scelta del giocatore e applica la variazione HP dell'esito.
    @Transactional
    public InteractionResponse interact(Long gameId, boolean accepted) {
        GameEntity game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Game " + gameId + " was not found. Check the game ID."
                ));

        PlayerEntity player = game.getPlayer();
        int currentHp = getCurrentHp(player);
        if (currentHp <= 0) {
            throw new IllegalStateException("Your HP are exhausted. You have lost the game and cannot interact.");
        }

        long stepsTaken = progressRepository.sumDiceResults(gameId, ActionType.DICE_ROLL);
        if (stepsTaken >= game.getScoreBoard().size() - 1) {
            throw new IllegalStateException("You have reached the final cell. The game is finished.");
        }

        // La scelta è ancora in sospeso quando l'ultima azione è il tiro.
        ProgressEntity lastRoll = progressRepository.findFirstByGame_IdOrderByIdDesc(gameId)
                .filter(progress -> progress.getActionType() == ActionType.DICE_ROLL)
                .orElseThrow(() -> new IllegalStateException("There is no pending event. Roll the dice first to reach a cell."));

        CellEntity cell = lastRoll.getCell();
        boolean successfulOutcome = accepted
                && ThreadLocalRandom.current().nextInt(100) < ACCEPTED_OUTCOME_SUCCESS_CHANCE;
        String responseText = successfulOutcome
                ? cell.getPositiveOutcomeDescription()
                : cell.getNegativeOutcomeDescription();
        int hpChange = successfulOutcome
                ? cell.getPositiveOutcomeHpChange()
                : cell.getNegativeOutcomeHpChange();
        long updatedHp = (long) currentHp + hpChange;
        currentHp = (int) Math.max(0L, Math.min((long) player.getMaxHp(), updatedHp));
        player.setCurrentHp(currentHp);
        playerRepository.save(player);

        ProgressEntity interaction = new ProgressEntity();
        interaction.setGame(game);
        interaction.setCell(cell);
        interaction.setActionType(ActionType.EVENT_INTERACTION);
        interaction.setInteractionAccepted(accepted);

        interaction.setInteractionOutcome(responseText);

        progressRepository.save(interaction);

        boolean finished = currentHp == 0;
        return new InteractionResponse(
                gameId,
                accepted,
                responseText,
                currentHp,
                player.getMaxHp(),
                finished,
                finished ? DEFEAT_MESSAGE : null);
    }

    private int getCurrentHp(PlayerEntity player) {
        if (player.getCurrentHp() == null) {
            player.setCurrentHp(player.getMaxHp());
        }
        return player.getCurrentHp();
    }
}
