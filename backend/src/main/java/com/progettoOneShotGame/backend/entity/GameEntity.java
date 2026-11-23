package com.progettoOneShotGame.backend.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "game")
public class GameEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @OneToOne
    @JoinColumn(name = "scoreboard_id")
    private ScoreBoardEntity scoreBoard;

    @OneToMany(mappedBy = "game")
    private List<ProgressEntity> progresses;

    @ManyToOne
    @JoinColumn(name = "player_id")
    private PlayerEntity player;

    public GameEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ScoreBoardEntity getScoreBoard() {
        return scoreBoard;
    }

    public void setScoreBoard(ScoreBoardEntity scoreBoard) {
        this.scoreBoard = scoreBoard;
    }

    public List<ProgressEntity> getProgresses() {
        return progresses;
    }

    public void setProgresses(List<ProgressEntity> progresses) {
        this.progresses = progresses;
    }

    public PlayerEntity getPlayer() {
        return player;
    }

    public void setPlayer(PlayerEntity player) {
        this.player = player;
    }
}
