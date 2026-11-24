package com.progettoOneShotGame.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "progress")
public class ProgressEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "game_id")
    private GameEntity game;

    @ManyToOne
    @JoinColumn(name = "cell_id")
    private CellEntity cell;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type")
    private ActionType actionType;

    @Column(name = "dice_result")
    private Integer diceResult;

    @Column(name = "interaction_accepted")
    private Boolean interactionAccepted;

    @Column(name = "interaction_outcome")
    private String interactionOutcome;

    public ProgressEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public GameEntity getGame() {
        return game;
    }

    public void setGame(GameEntity game) {
        this.game = game;
    }

    public CellEntity getCell() {
        return cell;
    }

    public void setCell(CellEntity cell) {
        this.cell = cell;
    }

    public ActionType getActionType() {
        return actionType;
    }

    public void setActionType(ActionType actionType) {
        this.actionType = actionType;
    }

    public Integer getDiceResult() {
        return diceResult;
    }

    public void setDiceResult(Integer diceResult) {
        this.diceResult = diceResult;
    }

    public Boolean getInteractionAccepted() {
        return interactionAccepted;
    }

    public void setInteractionAccepted(Boolean interactionAccepted) {
        this.interactionAccepted = interactionAccepted;
    }

    public String getInteractionOutcome() {
        return interactionOutcome;
    }

    public void setInteractionOutcome(String interactionOutcome) {
        this.interactionOutcome = interactionOutcome;
    }
}


// ho pensato di inserire anche cellEntity: la relazione serve ad identificare a quale evento/casella si riferisce l interazione