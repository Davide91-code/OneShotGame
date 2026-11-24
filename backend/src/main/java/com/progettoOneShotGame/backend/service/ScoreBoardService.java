package com.progettoOneShotGame.backend.service;

import com.progettoOneShotGame.backend.entity.CellEntity;
import com.progettoOneShotGame.backend.entity.ScoreBoardEntity;
import com.progettoOneShotGame.backend.factory.CellFactory;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScoreBoardService {

    private final CellFactory cellFactory;

    public ScoreBoardService(CellFactory cellFactory) {
        this.cellFactory = cellFactory;
    }

    //il ciclo gira dieci voltw 
    //ad ogni giro la factory crea una nuova cellEntity
    //il service aggiunge in fondo alla lista
    public ScoreBoardEntity generate(int boardSize) {
        if (boardSize < 1) {
            throw new IllegalArgumentException("Board size must be positive");
        }

        List<CellEntity> cells = new ArrayList<>(boardSize);
        for (int position = 0; position < boardSize; position++) {
            if (position == boardSize - 1) {
                cells.add(cellFactory.createFinishCell());
            } else {
                cells.add(cellFactory.createRandomCell());
            }
        }

        //riceve il percorso completo
        return new ScoreBoardEntity(cells);
    }
}
