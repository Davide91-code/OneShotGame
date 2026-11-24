package com.progettoOneShotGame.backend.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/games")
public class ControllerGame {

    private final GameService gameService;

    public ControllerGame(GameService gameService) {
        this.gameService = gameService;
    }


}
