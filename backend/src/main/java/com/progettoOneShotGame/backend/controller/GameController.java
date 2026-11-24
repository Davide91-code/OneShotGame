package com.progettoOneShotGame.backend.controller;

import org.springframework.web.bind.annotation.*;

import com.progettoOneShotGame.backend.dto.CreateNewGameRequest;
import com.progettoOneShotGame.backend.dto.CreateNewGameResponse;
import com.progettoOneShotGame.backend.service.GameService;

@RestController
@RequestMapping("/games")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    // Creazione nuova partita
    @PostMapping
    public CreateNewGameResponse createGame(
            @RequestBody CreateNewGameRequest request) {

        return gameService.createGame(request);
    }
}