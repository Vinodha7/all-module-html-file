package com.cts.pharmaTrack.module.identityAccessManagement.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Exception handling scoped to the identityAccessManagement controllers.
 * Scoped via basePackages (and given highest precedence) so it does not
 * collide with the app-wide {@code common.exception.GlobalExceptionHandler}.
 * Named distinctly from that class so the two advices do not clash on the
 * default {@code globalExceptionHandler} bean name during component scanning.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = "com.cts.pharmaTrack.module.identityAccessManagement.controller")
public class IdentityAccessExceptionHandler {

    @ExceptionHandler(SignatureNotAuthorizedException.class)
    public ResponseEntity<?> handleSignatureNotAuthorized(
            SignatureNotAuthorizedException ex) {
        return ResponseEntity.status(403).body(Map.of(
                "status",  "error",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(
            RuntimeException ex) {

        int status = 400;
        String message = ex.getMessage();

        if (message.contains("not found"))      status = 404;
        if (message.contains("already exists")) status = 409;
        if (message.contains("locked"))         status = 403;
        if (message.contains("inactive"))       status = 403;
        if (message.contains("Invalid email"))  status = 401;

        return ResponseEntity.status(status).body(Map.of(
                "status",  "error",
                "message", message
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(
            MethodArgumentNotValidException ex) {

        String message = ex.getBindingResult()
                .getFieldErrors()
                .get(0)
                .getDefaultMessage();

        return ResponseEntity.status(400).body(Map.of(
                "status",  "error",
                "message", message
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralException(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity.status(500).body(Map.of(
                "status",  "error",
                "message", ex.getMessage()
        ));
    }
}
