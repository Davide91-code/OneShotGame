package com.progettoOneShotGame.backend.dto;

/**
 * CreateNewGameRequest
 */
public record CreateNewGameRequest(String nomeUtente, DifficultyEnum difficolta) {
}