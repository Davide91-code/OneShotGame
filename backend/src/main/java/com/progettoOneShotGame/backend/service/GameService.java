package com.progettoOneShotGame.backend.service;

import com.progettoOneShotGame.backend.dto.CreateNewGameRequest;
import com.progettoOneShotGame.backend.dto.CreateNewGameResponse;
import com.progettoOneShotGame.backend.entity.GameEntity;
import com.progettoOneShotGame.backend.entity.PlayerEntity;
import com.progettoOneShotGame.backend.entity.ScoreBoardEntity;
import com.progettoOneShotGame.backend.repository.GameRepository;
import com.progettoOneShotGame.backend.repository.PlayerRepository;
import com.progettoOneShotGame.backend.repository.ScoreBoardRepository;
import java.util.ArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
