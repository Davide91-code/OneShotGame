package com.progettoOneShotGame.backend.controller;

import com.progettoOneShotGame.backend.dto.DiceRollResponse;
import com.progettoOneShotGame.backend.dto.InteractionRequest;
import com.progettoOneShotGame.backend.dto.InteractionResponse;
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


    @PostMapping
    public CreateNewGameResponse createGame(
            @RequestBody CreateNewGameRequest request) {

        return gameService.createGame(request);
    }


    @PostMapping("/{gameId}/roll")
    public DiceRollResponse rollDice(
            @PathVariable Long gameId) {

        return gameService.rollDice(gameId);
    }

    @PostMapping("/{gameId}/interact")
    public InteractionResponse interact(
            @PathVariable Long gameId,
            @RequestBody InteractionRequest request) {

        return gameService.interact(gameId, request.accepted());
    }
}