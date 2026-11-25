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
                    "Prosegui senza fermarti. In questo dungeon non esiste la sanità gratuita e chiamare l'ambulanza costa troppo.",
                    3,
                    2),
            new EventTemplate(
                    "Trovi un forziere malandato.",
                    "Apri il forziere e trovi una pozione di cura.",
                    "Mentre lo apri scopri che è un Mimic. Si prende un morso e tu perdi qualche HP.",
                    8,
                    -4),
            new EventTemplate(
                    "Uno spettro ti chiede di risolvere un merge conflict tra due pergamene. Lo aiuti?",
                    "Salvi entrambe le versioni. Per ringraziarti, lo spettro fa il commit della tua guarigione.",
                    "Lo lasci fare da solo. Lo spettro fa push su main e, per qualche motivo, perdi degli HP.",
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
                         "Era una tisana alla cannabis. Ti siedi cinque minuti a fissare una torcia e recuperi 5 HP.",
                         "Era vodka liscia. L'alchimista si riprende la fiala: «Ah, ecco dov'era finita la mia pausa pranzo». Perdi degli HP.",
                         5,
                         -6),
                 new EventTemplate(
                         "Incontri un mendicante che vende mappe: Uè Brad Pitt, comm' si bell!",
                         "Compra la mappa e scopri un passaggio sicuro.",
                         "La mappa è falsa e cammini in una zona pericolosa: i quartieri spagnoli",
                         0,
                         -1),
                 new EventTemplate(
                         "Un goblin blocca il corridoio.",
                         "Giancarlo Magalli, is that you? Lo distrai con del cibo e ti lascia passare.",
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
                         "Uno scheletro custodisce una porta. «Domanda a sorpresa: cos'è la dependency injection?» Rispondi?",
                         "Dici «dipende». Lo scheletro apprezza la precisione tecnica, ti dà 3 HP e apre la porta.",
                         "Provi a spiegarglielo con un esempio. Ti interrompe al terzo costruttore: «Va bene, ci rivediamo a settembre». Perdi degli HP.",
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
                         "Il lavoro è imperfetto e ti ferisci mentre lo indossi: Boja fàuss! ",
                         4,
                         -2),
                 new EventTemplate(
                         "Ti imbatti in un campo di funghi luminescenti. ",
                         "Mangiare quelli sani ti restituisce energia.",
                         "Uno è velenoso. E vai di coliche",
                         6,
                         -5),
                 new EventTemplate(
                         "Un fantasma apparizione ti pone una scelta.",
                         "Condividi con lui un ricordo felice: l'ultimo concerto dei Jalisse nel 2008",
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
                         "Aspetta ti sei sbagliato! E' un gruppo di HR selvaggi: Complimenti il tuo colloquio con Accenture è andato bene: Tiè l'indeterminato!",
                         "Aspetta ti sei sbagliato! E' un gruppo di HR selvaggi: Purtoppo hai la telecamera spenta. Non accettano le tue scuse e vieni balzato fuori e perdi degli HP.",
                         2,
                         -3),
                 new EventTemplate(
                         "Un chierichetto ferito si trascina a terra.",
                         "Lo aiuti a sfuggire dalle grinfie di un prete.",
                         "Non hai tempo per aiutarlo, ma per fortuna c'è un prete proprio lì accanto che lo trascina nelle sue stanze.",
                         9,
                         -4),
                 new EventTemplate(
                         "Scendi in una stanza piena di ragni.",
                         "Bruci una torcia e allontani i ragni.",
                         "Vieni morso mentre cerchi un'uscita.",
                         3,
                         -7),
                 new EventTemplate(
                         "Una figura congelata ti sbarra la strada.",
                         "Si tratta di una principessa che ha subito una maledizione. Ripensi a cosa avrebbe fatto tuo nonno Vincenzo DeLuca: Usi un lanciafiamme per liberarla e ti ringrazia con talismano. ",
                         "Il ghiaccio comincia a spaccarsi, è una litania colma di spirito natalizio e promesse capitalistiche invade le tue orecchie!",
                         4,
                         -6),
                 new EventTemplate(
                         "Trovi una lampada coperta dalla polvere.",
                         "La strofini e un genio ti concede 3 colloqui di lavoro.",
                         "Il genio è in realtà Carlo Conti: Sei costretto a spendere due mesi con lui a tale quale Show, facendo imitazione di Malgioglio",
                         8,
                         -5),
                 new EventTemplate(
                         "Una sala contiene una serie di leve.",
                         "Scegli quella giusta: ti è concesso di giocare a GTA VI tutta la notte.",
                         "Una di queste attiva la gestione dell'autenticazione. Ma purtroppo tu non la conosci ancora. Perchè hai passato tutta la notte a giocare a GTA VI.",
                         5,
                         -7),
                 new EventTemplate(
                         "Una figura oscura ti blocca il cammino.",
                         "Il cavaliere Silvio ti invita ad una delle sue feste ad Arcore. E chi se lo perde?!",
                         "Si tratta di un parcheggiatore abusivo: Dottò ca cà passa o’ vigile, lassate fa’ a mme!",
                         4,
                         -2),
                 new EventTemplate(
                         "Ti imbatti in una miniera abbandonata.",
                         "Cerchi con cautela e recuperi una RedBull.",
                         "Attivi un sistema instabile e vieni schiacciato. Proprio quest'anno che avevi deciso di non rinnovare l'assicurazione!",
                         3,
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
                         "Una figura femminile appare nella nebbia.",
                         "Coprirti le orecchie neutralizza il suo grido.",
                         "Io sono Giorgia! Sono una donna. Sono una madre. Sono cristiana. NON ME LO TOGLIERETE!",
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
