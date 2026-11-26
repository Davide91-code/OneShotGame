# OneShotGame 🎲

## Descrizione del progetto

OneShotGame è un gioco fantasy a turni, sviluppato nell'ambito del progetto di gruppo del corso di formazione Java Full Stack.

Il giocatore affronta un percorso composto da diverse caselle, avanzando attraverso il lancio di un dado e interagendo con gli eventi incontrati durante il tragitto.

L'obiettivo è completare il percorso mantenendo i propri punti vita. Le scelte effettuate e gli eventi casuali influenzano l'andamento della partita, determinandone il successo o il fallimento.

## Funzionalità principali

- Creazione di una nuova partita.
- Generazione e gestione del percorso di gioco.
- Avanzamento tramite lancio del dado.
- Gestione degli eventi e delle relative interazioni.
- Monitoraggio dei punti vita del giocatore.
- Gestione delle condizioni di vittoria e sconfitta.
- Salvataggio dei dati della partita su database.

## Tecnologie utilizzate

**Backend**
- Java
- Spring Boot
- Spring Data JPA
- Hibernate
- REST API

**Frontend**
- HTML5
- CSS3
- JavaScript

**Database**
- MySQL

**Strumenti di sviluppo**
- IntelliJ IDEA
- Visual Studio Code
- MySQL Workbench
- Postman
- Git e GitHub

## Architettura e progettazione

Il progetto è stato sviluppato adottando un'architettura organizzata in livelli, separando la gestione delle richieste REST, la logica applicativa e l'accesso ai dati.

Durante lo sviluppo è stato applicato il **Factory Pattern**, utilizzato per centralizzare la creazione degli oggetti e organizzare la gestione delle diverse tipologie di elementi di gioco.

## Flusso di gioco

1. Creazione di una nuova partita.
2. Lancio del dado per determinare l'avanzamento.
3. Raggiungimento della casella successiva.
4. Interazione con eventuali eventi.
5. Aggiornamento dello stato del giocatore e della partita.
6. Verifica delle condizioni di vittoria o sconfitta.

## Autori

Progetto realizzato in gruppo nell'ambito del corso di formazione Academy Java / Spring / Spring AI.

- Davide Leonino
- Daniele Tommasini
- Laura Casota
- Carmine Vanacore

## Obiettivo formativo

Il progetto ha permesso di applicare concretamente le conoscenze acquisite durante il percorso formativo, con particolare attenzione allo sviluppo Java/Spring, alla progettazione di API REST, alla persistenza dei dati tramite JPA e all'utilizzo dei Design Pattern.
