package com.cts.pharmaTrack.common.exception;

/**
 * 409 - thrown when an operation conflicts with the current state of the data,
 * e.g. deleting a record that still has dependent child records.
 */
public class ResourceConflictException extends RuntimeException {

    public ResourceConflictException(String message) {
        super(message);
    }
}
