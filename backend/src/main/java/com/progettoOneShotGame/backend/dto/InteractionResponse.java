package com.progettoOneShotGame.backend.dto;

public record InteractionResponse(Long gameId, boolean accepted, String interactionOutcome) {
    
}
