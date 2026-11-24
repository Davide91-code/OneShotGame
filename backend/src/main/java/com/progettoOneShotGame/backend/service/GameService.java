package com.progettoOneShotGame.backend.service;

import com.progettoOneShotGame.backend.entity.GameEntity;
import com.progettoOneShotGame.backend.entity.PlayerEntity;
import com.progettoOneShotGame.backend.entity.ScoreBoardEntity;
import com.progettoOneShotGame.backend.repository.GameRepository;
import com.progettoOneShotGame.backend.repository.PlayerRepository;
import com.progettoOneShotGame.backend.repository.ScoreBoardRepository;
import java.util.ArrayList;
import org.springframework.stereotype.Service;

@Service
public class GameService {

    private static final int DEFAULT_MAX_HP = 10;

    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;
    private final ScoreBoardRepository scoreBoardRepository;
    private final ScoreBoardService scoreBoardService;

    public GameService(
            GameRepository gameRepository,
            PlayerRepository playerRepository,
            ScoreBoardRepository scoreBoardRepository,
            ScoreBoardService scoreBoardService) {

        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.scoreBoardRepository = scoreBoardRepository;
        this.scoreBoardService = scoreBoardService;
    }
//prepara le caselle e salva il tabellone
    public GameEntity createGame(String playerName, int boardSize) {
        if (playerName == null || playerName.isBlank()) {
            throw new IllegalArgumentException("Player name is required");
        }
        if (boardSize < 1) {
            throw new IllegalArgumentException("Board size must be positive");
        }

        ScoreBoardEntity scoreBoard = scoreBoardRepository.save(
                scoreBoardService.generate(boardSize));

                //crea il giocatore dandogli un nome e 10 hp e salva il gioco
        PlayerEntity player = new PlayerEntity();
        player.setNome(playerName.trim());
        player.setMaxHp(DEFAULT_MAX_HP);
        PlayerEntity savedPlayer = playerRepository.save(player);

        //gli assegni il tabellone e il giocatore appena 
        //salva gli da uno storico vuoto
        GameEntity game = new GameEntity();
        game.setScoreBoard(scoreBoard);
        game.setPlayer(savedPlayer);
        game.setProgresses(new ArrayList<>());

        return gameRepository.save(game);
    }
}
