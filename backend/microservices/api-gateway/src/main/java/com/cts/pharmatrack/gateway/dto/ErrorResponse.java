package com.cts.pharmatrack.gateway.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

/**
 * Immutable error response payload returned by the API Gateway.
 *
 * This record is designed for consistent client-facing error information,
 * including the request path to help API consumers understand where the failure occurred.
 *
 * @param timestamp the time when the error occurred
 * @param status the HTTP status code
 * @param error a short error identifier
 * @param message a user-facing error message
 * @param path the request path that caused the error
 * @since 1.0
 */
public record ErrorResponse(
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {

    /**
     * Creates a new ErrorResponse using the current timestamp.
     *
     * @param status the HTTP status code
     * @param error a short error identifier
     * @param message a user-facing error message
     * @param path the request path that caused the error
     */
    public ErrorResponse(int status, String error, String message, String path) {
        this(LocalDateTime.now(), status, error, message, path);
    }
}
