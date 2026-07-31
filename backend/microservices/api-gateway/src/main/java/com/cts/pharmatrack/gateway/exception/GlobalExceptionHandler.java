package com.cts.pharmatrack.gateway.exception;

import com.cts.pharmaTrack.common.exception.ServiceUnavailableException;
import com.cts.pharmatrack.gateway.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for the API Gateway.
 *
 * This class centralizes exception handling for the gateway and returns
 * consistent, user-facing error responses for known failure conditions.
 *
 * @since 1.0
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles CircuitBreakerOpenException and returns HTTP 503 Service Unavailable.
     *
     * @param ex the CircuitBreakerOpenException
     * @param request the servlet request
     * @return a ResponseEntity containing the error response with HTTP 503 status
     */
    @ExceptionHandler(CircuitBreakerOpenException.class)
    public ResponseEntity<ErrorResponse> handleCircuitBreakerOpenException(
            CircuitBreakerOpenException ex,
            ServerHttpRequest request) {

        logger.warn("Service unavailable for request {}: {}", request.getPath().value(), ex.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "SERVICE_TEMPORARILY_UNAVAILABLE",
                ex.getMessage(),
                request.getPath().value()
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
    }

    /**
     * Handles ServiceUnavailableException (thrown by circuit-breaker fallbacks)
     * and returns HTTP 503 Service Unavailable with the fallback's own error code
     * and message, so clients get a meaningful response instead of a generic 500.
     *
     * @param ex the ServiceUnavailableException
     * @param request the reactive request
     * @return a ResponseEntity containing the error response with HTTP 503 status
     */
    @ExceptionHandler(ServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleServiceUnavailableException(
            ServiceUnavailableException ex,
            ServerHttpRequest request) {

        logger.warn("Service unavailable for request {}: {}", request.getPath().value(), ex.getMessage());

        String errorCode = ex.getErrorCode() != null ? ex.getErrorCode() : "SERVICE_UNAVAILABLE";

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                errorCode,
                ex.getMessage(),
                request.getPath().value()
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
    }

    /**
     * Handles RateLimitExceededException and returns HTTP 429 Too Many Requests.
     *
     * @param ex the RateLimitExceededException
     * @param request the servlet request
     * @return a ResponseEntity containing the error response with HTTP 429 status
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceededException(
            RateLimitExceededException ex,
            ServerHttpRequest request) {

        logger.warn("Rate limit exceeded for request {}: {}", request.getPath().value(), ex.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "TOO_MANY_REQUESTS",
                ex.getMessage(),
                request.getPath().value()
        );

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(errorResponse);
    }

    /**
     * Handles all uncaught exceptions and returns HTTP 500 Internal Server Error.
     *
     * @param ex the exception
     * @param request the servlet request
     * @return a ResponseEntity containing the error response with HTTP 500 status
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex,
            ServerHttpRequest request) {

        logger.error("Unexpected error for request {}", request.getPath().value(), ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred while processing your request. Please try again later.",
                request.getPath().value()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
