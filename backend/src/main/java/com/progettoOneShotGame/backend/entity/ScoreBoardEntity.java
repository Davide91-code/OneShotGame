package com.progettoOneShotGame.backend.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "score_boards")
public class ScoreBoardEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @OneToMany(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "score_board_id")
    @OrderColumn(name = "cell_position")
    private List<CellEntity> cells = new ArrayList<>();

    protected ScoreBoardEntity() {
    }

    public ScoreBoardEntity(List<CellEntity> cells) {
        this.cells = new ArrayList<>(cells);
    }

    public Long getId() {
        return id;
    }

    public List<CellEntity> getCells() {
        return List.copyOf(cells);
    }

    public int size() {
        return cells.size();
    }

    public CellEntity getCellAt(int position) {
        return cells.get(position);
    }
}

