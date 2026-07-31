package com.cts.pharmatrack.gateway.exception;

/**
 * Exception thrown when a client exceeds the allowed request rate.
 *
 * This exception is intended to signal that the client should reduce request frequency
 * and retry later when the request rate is below the configured limit.
 *
 * @since 1.0
 */
public class RateLimitExceededException extends RuntimeException {

    private static final String DEFAULT_MESSAGE =
            "Too many requests have been received in a short period. " +
            "Please wait before trying again.";

    /**
     * Constructs a new RateLimitExceededException with the default, user-friendly message.
     */
    public RateLimitExceededException() {
        super(DEFAULT_MESSAGE);
    }

    /**
     * Constructs a new RateLimitExceededException with a custom message.
     *
     * @param message the detail message
     */
    public RateLimitExceededException(String message) {
        super(message);
    }

    /**
     * Constructs a new RateLimitExceededException with a custom message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public RateLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a new RateLimitExceededException with a cause.
     *
     * @param cause the cause of the exception
     */
    public RateLimitExceededException(Throwable cause) {
        super(DEFAULT_MESSAGE, cause);
    }
}
