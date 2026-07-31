package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.exception.DuplicateResourceException;
import com.cts.pharmaTrack.common.exception.ForbiddenException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception.ResourceConflictException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.exception.ServiceUnavailableException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Exception handling scoped to the subjectEnrolment controllers.
 * Scoped via basePackages (and given highest precedence) so it does not
 * collide with the app-wide {@code common.exception.GlobalExceptionHandler}.
 * Named distinctly from that class so the two advices do not clash on the
 * default {@code globalExceptionHandler} bean name during component scanning.
 *
 * <p>Every error raised by a subjectEnrolment controller is returned as a
 * message-only JSON body ({@code {"message": "..."}}) with the appropriate
 * HTTP status. The {@code errorCode}, {@code path}, {@code status} and
 * {@code timestamp} fields produced by the shared {@code GlobalExceptionHandler}
 * are intentionally omitted for this module. The module's own exceptions
 * (Subject/AdverseEvent/Visit not-found, deletion-not-allowed, duplicate code,
 * invalid enrolment) extend the shared base types handled below.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = "com.cts.pharmaTrack.module.subjectEnrolment.controller")
public class SubjectEnrolmentExceptionHandler {

    // ── 404 NOT FOUND ─────────────────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(RuntimeException ex) {
        return message(HttpStatus.NOT_FOUND, ex);
    }

    // ── 409 CONFLICT ──────────────────────────────────────────────────────────

    @ExceptionHandler({
            DuplicateResourceException.class,
            ResourceConflictException.class,
            InvalidStatusTransitionException.class
    })
    public ResponseEntity<Map<String, String>> handleConflict(RuntimeException ex) {
        return message(HttpStatus.CONFLICT, ex);
    }

    // ── 400 BAD REQUEST ───────────────────────────────────────────────────────

    @ExceptionHandler({
            BadRequestException.class,
            IllegalArgumentException.class,
            IllegalStateException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
        return message(HttpStatus.BAD_REQUEST, ex);
    }

    /** Bean-validation failures (@Valid) rendered as a concise "field: message" list. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", msg));
    }

    // ── 403 FORBIDDEN ─────────────────────────────────────────────────────────

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(ForbiddenException ex) {
        return message(HttpStatus.FORBIDDEN, ex);
    }

    // ── 503 SERVICE UNAVAILABLE ───────────────────────────────────────────────

    @ExceptionHandler(ServiceUnavailableException.class)
    public ResponseEntity<Map<String, String>> handleServiceUnavailable(ServiceUnavailableException ex) {
        return message(HttpStatus.SERVICE_UNAVAILABLE, ex);
    }

    // ── 500 CATCH-ALL ─────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return message(HttpStatus.INTERNAL_SERVER_ERROR, ex);
    }

    /**
     * Builds a message-only response body. Falls back to a generic message when
     * the exception carries no message, so {@code Map.of} never sees a null value.
     */
    private ResponseEntity<Map<String, String>> message(HttpStatus status, Exception ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : status.getReasonPhrase();
        return ResponseEntity.status(status).body(Map.of("message", msg));
    }
}
