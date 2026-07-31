package com.cts.pharmaTrack.common.exception;

/**
 * 409 - thrown when a unique field (e.g. a subject code) already exists.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
