package com.cts.pharmatrack.gateway.exception;

/**
 * Exception thrown when a downstream service is temporarily unavailable.
 *
 * This exception is intended for transient downstream failures where requests
 * cannot be completed at the moment. It is safe to retry after a short delay.
 *
 * @since 1.0
 */
public class CircuitBreakerOpenException extends RuntimeException {

    private static final String DEFAULT_MESSAGE =
            "The request could not be completed because the service is temporarily unavailable. " +
            "Please try again later.";

    /**
     * Constructs a new CircuitBreakerOpenException with the default, user-friendly message.
     */
    public CircuitBreakerOpenException() {
        super(DEFAULT_MESSAGE);
    }

    /**
     * Constructs a new CircuitBreakerOpenException with a custom message.
     *
     * @param message the detail message
     */
    public CircuitBreakerOpenException(String message) {
        super(message);
    }

    /**
     * Constructs a new CircuitBreakerOpenException with a custom message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public CircuitBreakerOpenException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a new CircuitBreakerOpenException with a cause.
     *
     * @param cause the cause of the exception
     */
    public CircuitBreakerOpenException(Throwable cause) {
        super(DEFAULT_MESSAGE, cause);
    }
}
