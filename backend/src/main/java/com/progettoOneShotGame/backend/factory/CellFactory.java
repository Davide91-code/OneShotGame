package com.progettoOneShotGame.backend.factory;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import com.progettoOneShotGame.backend.entity.CellEntity;

import org.springframework.stereotype.Component;

@Component
public class CellFactory {

    private static final String FINISH_MESSAGE =
            "Congratulazioni, sei uscito vivo dal dungeon ed hai conseguito l'attestato del corso!";

    private static final List<EventTemplate> EVENTS = List.of(
            new EventTemplate(
                    "Un viandante ferito chiede aiuto.",
                    "Lo aiuti e ti ricompensa con una pozione.",
                    "Prosegui senza fermarti.",
                    3,
                    2),
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
                    -4),
            new EventTemplate(
                    "Scopri un antico altare.",
                    "Preghi e ricevi una benedizione proseguendo di due passi.",
                    "Disturbi l'altare e ne subisci la maledizione.",
                    2,
                    -5),
                 new EventTemplate(
                    "Calpesti una trappola.",
                    "Provi a disinesscarla.",
                    "Vieni avvelenato e perdi degli HP.",
                    0,
                         -2),
                 new EventTemplate(
                         "Un alchimista stanco ti mostra una fiala.",
                         "Bevi la pozione e recuperi diversi HP.",
                         "La fiala era instabile e subisci dei danni.",
                         5,
                         -6),
                 new EventTemplate(
                         "Incontri un mercante che vende mappe.",
                         "Compra la mappa e scopri un passaggio sicuro.",
                         "La mappa è falsa e cammini in una zona pericolosa.",
                         0,
                         -1),
                 new EventTemplate(
                         "Un goblin blocca il corridoio.",
                         "Lo distrai con del cibo e ti lascia passare.",
                         "Attacca e riesci a fuggire perdendo degli HP.",
                         2,
                         -5),
                 new EventTemplate(
                         "Trovi una donna col marito che imbraccia un ferro da stiro.",
                         "Chiedi di farti stirare tutto...",
                         "la ignori e vai avanti",
                         1,
                         -0),
                 new EventTemplate(
                         "Uno scheletro custodisce una porta.",
                         "Rispondi correttamente alla sua domanda e prosegui.",
                         "La risposta è sbagliata e lo scheletro ti colpisce.",
                         3,
                         -6),
                 new EventTemplate(
                         "Una cassa caduta giace sul pavimento.",
                         "La spingi con cautela e trovi una pozione.",
                         "La cassa cade e ti ferisce una mano.",
                         5,
                         -3),
                 new EventTemplate(
                         "Senti un lupo ringhiare nell'ombra.",
                         "Gli lanci della carne e lo lasci passare.",
                         "Ti mette all'angolo e perdi degli HP.",
                         2,
                         -7),
                 new EventTemplate(
                         "Un fabbro offre di riparare il tuo equipaggiamento.",
                         "Accetti e riparti protetto meglio.",
                         "Il lavoro è imperfetto e ti ferisci mentre lo indossi.",
                         4,
                         -2),
                 new EventTemplate(
                         "Ti imbatti in un campo di funghi luminescenti.",
                         "Mangiare quelli sani ti restituisce energia.",
                         "Uno è velenoso e ti provoca danni.",
                         6,
                         -5),
                 new EventTemplate(
                         "Un fantasma apparizione ti pone una scelta.",
                         "Condividi con lui un ricordo felice.",
                         "Ignori il suo dolore e subisci la sua rabbia.",
                         5,
                         -4),
                 new EventTemplate(
                         "Un passaggio sembra crollare.",
                         "Usi rapidamente una corda per attraversarlo.",
                         "Cadi tra le macerie e perdi degli HP.",
                         3,
                         -6),
                 new EventTemplate(
                         "Un druido ti chiede protezione.",
                         "Lo difendi e ricevi una ricompensa curativa.",
                         "Lo abbandoni e vieni colpito da una bestia.",
                         8,
                         -5),
                 new EventTemplate(
                         "Trovi una statua con una mano incavo.",
                         "Metti una moneta e ricevi una benedizione.",
                         "Svuoti l'incavo di nascosto e la statua si anima.",
                         7,
                         -6),
                 new EventTemplate(
                         "Un gruppo di pipistrelli esce dal soffitto.",
                         "Ti copri con il mantello e li eviti.",
                         "Uno ti graffia mentre tenti di scappare.",
                         2,
                         -3),
                 new EventTemplate(
                         "Un chierico ferito si trascina a terra.",
                         "Lo curi e usa la magia per guarire anche te.",
                         "Continui senza aiutarlo e una maledizione ti colpisce.",
                         9,
                         -4),
                 new EventTemplate(
                         "Scendi in una stanza piena di ragni.",
                         "Bruci una torcia e allontani i ragni.",
                         "Vieni morso mentre cerchi un'uscita.",
                         3,
                         -7),
                 new EventTemplate(
                         "Un ragno gigante tende una ragnatela.",
                         "Tagli i fili dall'alto e superi l'ostacolo.",
                         "Rimani intrappolato e subisci un morso.",
                         4,
                         -6),
                 new EventTemplate(
                         "Trovi una lampada coperta dalla polvere.",
                         "La strofinia e un genio concede una guarigione.",
                         "Il genio si arrabbia e ti lancia una maledizione.",
                         8,
                         -5),
                 new EventTemplate(
                         "Una sala contiene una serie di leve.",
                         "Scegli quella giusta e si apre una stanza sicura.",
                         "Tiri quella sbagliata e cadono dardi velenosi.",
                         5,
                         -7),
                 new EventTemplate(
                         "Un ladro ti tende un agguato.",
                         "Lo convinci a desistere con una promessa.",
                         "Combatte e riesci a scappare ferito.",
                         2,
                         -6),
                 new EventTemplate(
                         "Incontri una miniera abbandonata.",
                         "Cerchi con cautela e recuperi una pozione.",
                         "Attivi un sistema instabile e vieni investito.",
                         6,
                         -8),
                 new EventTemplate(
                         "Un mago propone un duello di enigmi.",
                         "Vinci l'enigma e ottieni una protezione.",
                         "Perdi il duello e subisci un incantesimo.",
                         5,
                         -5),
                 new EventTemplate(
                         "Un ponte di corda attraversa un burrone.",
                         "Attraversi lentamente senza perdere l'equilibrio.",
                         "Una corda si spezza e sbatti contro la parete.",
                         3,
                         -7),
                 new EventTemplate(
                         "Una banshee appare nella nebbia.",
                         "Coprirti le orecchie neutralizza il suo grido.",
                         "Il grido ti paralizza e perdi degli HP.",
                         4,
                         -8),
                 new EventTemplate(
                         "Trovi un covone con resti di avventurieri.",
                         "Recuperi una borsa con una pozione intatta.",
                         "Delle frecce nascoste ti colpiscono.",
                         7,
                         -5));
                

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
