package com.progettoOneShotGame.backend.exception;

import com.progettoOneShotGame.backend.dto.ErrorResponse;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

import jakarta.validation.ConstraintViolationException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 400 - Richiesta non valida
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(
            IllegalArgumentException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    // 400 - JSON non valido o incompleto
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJson(
            HttpMessageNotReadableException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Il formato della richiesta non è valido. Controlla i dati JSON inviati."
        );
    }

    // 400 - Tipo di parametro errato
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Uno dei parametri inseriti ha un formato non valido. Controlla i valori."
        );
    }

    // 400 - Parametro obbligatorio mancante
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Manca un parametro obbligatorio: " + exception.getParameterName()
        );
    }

    // 400 - Errore di validazione dei dati
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "I dati inseriti non sono validi. Controlla le informazioni richieste."
        );
    }

    // 400 - Violazione di un vincolo di validazione
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException exception) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "Uno o più valori non rispettano i requisiti richiesti."
        );
    }

    // 404 - Partita o risorsa non trovata
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            NoSuchElementException exception) {

        return buildResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
    }

    // 404 - Endpoint o risorsa non esistente
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            NoResourceFoundException exception) {

        return buildResponse(
                HttpStatus.NOT_FOUND,
                "La risorsa richiesta non esiste. Controlla l'indirizzo dell'endpoint."
        );
    }

    // 409 - Operazione non consentita nello stato attuale
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            IllegalStateException exception) {

        return buildResponse(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
    }

    // 409 - Violazione di un vincolo del database
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException exception) {

        return buildResponse(
                HttpStatus.CONFLICT,
                "L'operazione non può essere completata perché i dati entrano in conflitto con i vincoli del database."
        );
    }

    // 405 - Metodo HTTP non supportato
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException exception) {

        return buildResponse(
                HttpStatus.METHOD_NOT_ALLOWED,
                "Il metodo HTTP utilizzato non è supportato per questo endpoint."
        );
    }

    // 415 - Tipo di contenuto non supportato
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException exception) {

        return buildResponse(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Il formato dei dati inviati non è supportato. Utilizza application/json."
        );
    }

    // 503 - Database non disponibile
    @ExceptionHandler({
            DataAccessResourceFailureException.class,
            CannotCreateTransactionException.class
    })
    public ResponseEntity<ErrorResponse> handleDatabaseUnavailable(
            Exception exception) {

        return buildResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Il servizio non è momentaneamente disponibile. Riprova tra qualche istante."
        );
    }

    // 500 - Errore interno imprevisto
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleInternalError(
            Exception exception) {

        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Si è verificato un errore interno. Non è stato possibile completare l'operazione."
        );
    }

    // Metodo comune per costruire le risposte
    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status,
            String message) {

        ErrorResponse error = new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                message
        );

        return ResponseEntity.status(status).body(error);
    }
}