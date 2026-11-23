package com.progettoOneShotGame.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "game_cell")
public class CellEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "event_description")
    private String eventDescription;

    @Column(name = "positive_outcome_description")
    private String positiveOutcomeDescription;

    @Column(name = "negative_outcome_description")
    private String negativeOutcomeDescription;

    @Column(name = "positive_outcome_hp_change")
    private int positiveOutcomeHpChange;

    @Column(name = "negative_outcome_hp_change")
    private int negativeOutcomeHpChange;

    public CellEntity() {
    }

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
