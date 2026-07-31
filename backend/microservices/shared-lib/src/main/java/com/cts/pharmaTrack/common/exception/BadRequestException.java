package com.cts.pharmaTrack.common.exception;

/**
 * 400 - thrown when a request is missing mandatory fields or carries invalid values.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
