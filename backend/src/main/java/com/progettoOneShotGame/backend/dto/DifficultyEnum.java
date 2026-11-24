package com.progettoOneShotGame.backend.dto;

public enum DifficultyEnum {
    
    EASY(20),
    MEDIUM(30),
    HARD(40);

    private final int valore;

    DifficultyEnum(int valore){

        this.valore = valore;
    }

    public int getValore(){

        return valore;
    }
}
