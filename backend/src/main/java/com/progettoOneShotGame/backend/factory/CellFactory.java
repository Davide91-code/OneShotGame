package com.progettoOneShotGame.backend.factory;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import com.progettoOneShotGame.backend.entity.CellEntity;

import org.springframework.stereotype.Component;

@Component
public class CellFactory {

    private static final String FINISH_MESSAGE =
            "Congratulazioni, sei uscito vivo dal dungeon!";

    private static final List<EventTemplate> EVENTS = List.of(
            new EventTemplate(
                    "Un viandante ferito chiede aiuto.",
                    "Lo aiuti e ti ricompensa con una pozione.",
                    "Prosegui senza fermarti.",
                    5,
                    0),
            new EventTemplate(
                    "Trovi un forziere malandato.",
                    "Apri il forziere e trovi una pozione di cura .",
                    "Mentre lo apri scopri che è un Mimic e perdi qualche HP.",
                    8,
                    -4),
            new EventTemplate(
                    "Una creatura ti offre uno scambio misterioso.",
                    "Accetti lo scambio e recuperi qualche HP.",
                    "Rifiuti lo scambio e la creatura ti ferisce.",
                    3,
                    -3),
            new EventTemplate(
                    "Scopri un antico altare.",
                    "Preghi e ricevi una benedizione.",
                    "Disturbi l'altare e ne subisci la maledizione.",
                    6,
                    -5),
                 new EventTemplate(
                    "Calpesti una trappola.",
                    "Provi a fuggire.",
                    "Vieni avvelenato e perdi degli HP",
                    0,
                    -2));
                

    public CellEntity createRandomCell() {
        EventTemplate event = EVENTS.get(
                ThreadLocalRandom.current().nextInt(EVENTS.size()));

        CellEntity cell = new CellEntity();
        cell.setEventDescription(event.eventDescription());
        cell.setPositiveOutcomeDescription(event.positiveOutcomeDescription());
        cell.setNegativeOutcomeDescription(event.negativeOutcomeDescription());
        cell.setPositiveOutcomeHpChange(event.positiveOutcomeHpChange());
        cell.setNegativeOutcomeHpChange(event.negativeOutcomeHpChange());
        return cell;
    }

    public CellEntity createFinishCell() {
        CellEntity cell = new CellEntity();
        cell.setEventDescription(FINISH_MESSAGE);
        return cell;
    }

    private record EventTemplate(
            String eventDescription,
            String positiveOutcomeDescription,
            String negativeOutcomeDescription,
            int positiveOutcomeHpChange,
            int negativeOutcomeHpChange) {
    }
}
