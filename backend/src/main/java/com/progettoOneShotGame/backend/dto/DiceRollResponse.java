package com.progettoOneShotGame.backend.dto;

public record DiceRollResponse(
        Long gameId,
        int diceResult,
        int currentPosition,
        String eventDescription,
        boolean finished) {
}
