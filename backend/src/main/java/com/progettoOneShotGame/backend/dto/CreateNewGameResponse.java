package com.progettoOneShotGame.backend.dto;

public record CreateNewGameResponse(
        Long gameId,
        String playerName,
        int boardSize,
        int maxHp,
        int currentHp) {
}
