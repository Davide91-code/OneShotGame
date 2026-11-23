package com.progettoOneShotGame.backend.entity;

public class CellEntity {
    private Long id;
    private String eventDescription;
    private String positiveOutcomeDescription;
    private String negativeOutcomeDescription;

    private int positiveOutcomeHpChange;
    private int negativeOutcomeHpChange;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEventDescription() {
        return eventDescription;
    }

    public void setEventDescription(String eventDescription) {
        this.eventDescription = eventDescription;
    }

    public String getPositiveOutcomeDescription() {
        return positiveOutcomeDescription;
    }

    public void setPositiveOutcomeDescription(String positiveOutcomeDescription) {
        this.positiveOutcomeDescription = positiveOutcomeDescription;
    }

    public String getNegativeOutcomeDescription() {
        return negativeOutcomeDescription;
    }

    public void setNegativeOutcomeDescription(String negativeOutcomeDescription) {
        this.negativeOutcomeDescription = negativeOutcomeDescription;
    }

    public int getPositiveOutcomeHpChange() {
        return positiveOutcomeHpChange;
    }

    public void setPositiveOutcomeHpChange(int positiveOutcomeHpChange) {
        this.positiveOutcomeHpChange = positiveOutcomeHpChange;
    }

    public int getNegativeOutcomeHpChange() {
        return negativeOutcomeHpChange;
    }

    public void setNegativeOutcomeHpChange(int negativeOutcomeHpChange) {
        this.negativeOutcomeHpChange = negativeOutcomeHpChange;
    }
}
